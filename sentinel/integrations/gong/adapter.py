# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Gong integration adapter.

Reads the user roster and call-recording posture from the Gong API for
access-review and data-location evidence: dormant admin accounts, SSO/MFA
enforcement (where exposed), and call-recording access from unexpected
email domains.

Auth: an access_key_id / access_key_credential pair, sent as HTTP Basic
credentials (Gong's "API key" is a key/secret pair, not a bearer token).
"""

from __future__ import annotations

import asyncio
import base64
import logging
from collections import Counter
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.gong.io/v2"


@dataclass
class GongCredentials:
    """Matches dashboard/src/integrations/gong/config.ts credentialFields."""

    access_key_id: str
    access_key_credential: str

    def basic_auth_header(self) -> str:
        pair = f"{self.access_key_id}:{self.access_key_credential}".encode()
        return "Basic " + base64.b64encode(pair).decode()


class GongAdapter:
    """Fetches user roster and access posture from Gong."""

    def __init__(self, credentials: GongCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": self.credentials.basic_auth_header(),
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/users", cursor="")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Gong rejected the access key pair. Verify the access "
                    "key ID and credential are active in Company Settings > "
                    "API."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Gong: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admins(client),
                self._check_sso_enforcement(client),
                self._check_external_domain_access(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("gong check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _list_users(self, client: httpx.AsyncClient) -> list[dict] | None:
        users: list[dict] = []
        cursor = None
        for _ in range(20):
            resp = await self._get(client, "/users", **({"cursor": cursor} if cursor else {}))
            if resp.status_code in (403, 404):
                return None
            resp.raise_for_status()
            data = resp.json()
            users.extend(data.get("users", []))
            cursor = data.get("records", {}).get("cursor")
            if not cursor:
                break
        return users

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        users = await self._list_users(client)
        if users is None:
            return [self._unavailable(
                "gong.users.dormant_admins",
                "Dormant administrator accounts",
                "least_privilege",
                "Grant the access key read access to the Users API.",
            )]
        admins = [u for u in users if str(u.get("role", "")).upper() in ("ADMIN", "ADMINISTRATOR", "MANAGER")]
        inactive_admins = [u for u in admins if u.get("active") is False]
        return [IntegrationFinding(
            check_id="gong.users.dormant_admins",
            title="Administrator accounts are active-only",
            description=(
                f"{len(admins)} of {len(users)} user(s) hold admin/manager roles; "
                f"{len(inactive_admins)} of those are inactive (dormant)."
            ),
            remediation="Deactivate or downgrade dormant administrator accounts to reduce standing privilege.",
            status="PASSED" if not inactive_admins else "FAILED",
            severity="HIGH" if inactive_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "total_users": len(users),
                "admin_count": len(admins),
                "dormant_admin_count": len(inactive_admins),
            },
        )]

    async def _check_sso_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # Gong's public API does not expose an org-wide SSO/MFA enforcement
        # setting — that is a workspace admin console setting only.
        return [self._unavailable(
            "gong.security.sso_enforcement",
            "SSO/MFA enforcement",
            "mfa_enforcement",
            "Gong's API does not expose SSO/MFA enforcement status. Verify "
            "manually in Company Settings > Security.",
        )]

    async def _check_external_domain_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        users = await self._list_users(client)
        if users is None:
            return [self._unavailable(
                "gong.users.external_domain_access",
                "Call recording access from unexpected email domains",
                "data_classification",
                "Grant the access key read access to the Users API.",
            )]
        active = [u for u in users if u.get("active") is not False and u.get("emailAddress")]
        domains = Counter(u["emailAddress"].split("@")[-1].lower() for u in active)
        primary_domain, primary_count = (domains.most_common(1) or [(None, 0)])[0]
        outliers = [
            u["emailAddress"] for u in active
            if u["emailAddress"].split("@")[-1].lower() != primary_domain
        ] if primary_domain else []
        return [IntegrationFinding(
            check_id="gong.users.external_domain_access",
            title="Call recording access is limited to the primary email domain",
            description=(
                f"{len(outliers)} active user(s) with access to call recordings use an "
                f"email domain other than the primary domain ({primary_domain or 'unknown'})."
            ),
            remediation=(
                "Review users whose email domain does not match the organization's "
                "primary domain — they may be external guests with recording access."
            ),
            status="PASSED" if not outliers else "WARNING",
            severity="MEDIUM" if outliers else "INFO",
            check_category="data_classification",
            result_details={
                "active_user_count": len(active),
                "primary_domain": primary_domain,
                "outlier_domain_user_count": len(outliers),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Gong with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
