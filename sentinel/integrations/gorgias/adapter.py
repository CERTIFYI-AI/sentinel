# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Gorgias integration adapter.

Reads the agent roster and connected-app posture from the Gorgias
helpdesk API for access-review and data-location evidence: dormant admin
accounts, SSO/MFA enforcement (where exposed), and over-broad connected
integration scopes.

Auth: HTTP Basic using the account's Gorgias domain, a user email, and an
API key issued for that user (Gorgias Settings > REST API).
"""

from __future__ import annotations

import asyncio
import base64
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class GorgiasCredentials:
    """Matches dashboard/src/integrations/gorgias/config.ts credentialFields."""

    domain: str
    user_email: str
    api_key: str

    def base_url(self) -> str:
        domain = self.domain.strip().removeprefix("https://").removeprefix("http://").rstrip("/")
        if not domain.endswith(".gorgias.com"):
            domain = f"{domain}.gorgias.com"
        return f"https://{domain}/api"

    def basic_auth_header(self) -> str:
        pair = f"{self.user_email}:{self.api_key}".encode()
        return "Basic " + base64.b64encode(pair).decode()


class GorgiasAdapter:
    """Fetches agent roster and access posture from Gorgias."""

    def __init__(self, credentials: GorgiasCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            f"{self.credentials.base_url()}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/account")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Gorgias rejected the credentials. Verify the domain, "
                    "user email, and API key are correct and the key is "
                    "still active."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Gorgias: {exc}") from exc
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
                self._check_integration_scopes(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("gorgias check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "gorgias.users.dormant_admins",
                "Dormant administrator accounts",
                "least_privilege",
                "Grant the API key read access to the Users resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data.get("data", data if isinstance(data, list) else [])
        admins = [u for u in users if str(u.get("role", {}).get("name", u.get("role", ""))).lower() in ("admin", "owner")]
        dormant_admins = [u for u in admins if u.get("disabled") or u.get("deactivated_datetime")]
        return [IntegrationFinding(
            check_id="gorgias.users.dormant_admins",
            title="Administrator accounts are active-only",
            description=(
                f"{len(admins)} of {len(users)} agent(s) hold admin/owner rights; "
                f"{len(dormant_admins)} of those are disabled or deactivated."
            ),
            remediation="Remove admin/owner rights from disabled agent accounts instead of leaving them dormant.",
            status="PASSED" if not dormant_admins else "FAILED",
            severity="HIGH" if dormant_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "total_users": len(users),
                "admin_count": len(admins),
                "dormant_admin_count": len(dormant_admins),
            },
        )]

    async def _check_sso_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/account")
        if resp.status_code >= 400:
            return [self._unavailable(
                "gorgias.security.sso_enforcement",
                "SSO/MFA enforcement",
                "mfa_enforcement",
                "Gorgias did not return account security settings for this key.",
            )]
        data = resp.json()
        if "sso_enabled" not in data and "two_factor_enabled" not in data:
            return [self._unavailable(
                "gorgias.security.sso_enforcement",
                "SSO/MFA enforcement",
                "mfa_enforcement",
                "Gorgias's API does not expose organization-wide SSO/MFA "
                "enforcement status. Verify manually in Settings > Security.",
            )]
        enabled = bool(data.get("sso_enabled") or data.get("two_factor_enabled"))
        return [IntegrationFinding(
            check_id="gorgias.security.sso_enforcement",
            title="SSO/MFA is enforced for the helpdesk account",
            description="SSO/two-factor enforcement flag reported by Gorgias for this account.",
            remediation="Enable and enforce SSO or two-factor authentication for all Gorgias agents.",
            status="PASSED" if enabled else "FAILED",
            severity="INFO" if enabled else "HIGH",
            check_category="mfa_enforcement",
            result_details={"reported_enabled": enabled},
        )]

    async def _check_integration_scopes(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/integrations", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "gorgias.integrations.broad_scopes",
                "Connected integration scope review",
                "access_control",
                "Grant the API key read access to the Integrations resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        integrations = data.get("data", data if isinstance(data, list) else [])
        broad = [
            i for i in integrations
            if any(str(s).lower() in ("write", "admin", "full_access") for s in i.get("scopes", []))
        ]
        return [IntegrationFinding(
            check_id="gorgias.integrations.broad_scopes",
            title="Connected integrations do not hold unnecessary write/admin scope",
            description=(
                f"{len(broad)} of {len(integrations)} connected integration(s) hold "
                "write, admin, or full-access scope over helpdesk data."
            ),
            remediation="Review connected apps and downgrade scopes to the minimum needed for each integration.",
            status="PASSED" if not broad else "WARNING",
            severity="MEDIUM" if broad else "INFO",
            check_category="access_control",
            result_details={
                "integration_count": len(integrations),
                "broad_scope_integration_count": len(broad),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Gorgias with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
