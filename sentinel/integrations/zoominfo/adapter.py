# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""ZoomInfo integration adapter.

Reads access-review and data-location evidence from the ZoomInfo API:
dormant admin users, SSO/MFA enforcement on the org, and unrestricted
contact/lead export access (ZoomInfo stores enriched contact PII).

Auth: OAuth2 client_id + client_credential (client-credentials grant).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://api.zoominfo.com/authenticate"
_BASE = "https://api.zoominfo.com"


@dataclass
class ZoominfoCredentials:
    """Matches dashboard/src/integrations/zoominfo/config.ts credentialFields."""

    client_id: str
    client_credential: str


class ZoominfoAdapter:
    """Fetches access-review and data-location posture from ZoomInfo."""

    def __init__(self, credentials: ZoominfoCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via the client-credentials grant."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _AUTH_URL,
            json={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "ZoomInfo rejected the OAuth2 client credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("jwt", resp.json().get("access_token", ""))
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_BASE}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach ZoomInfo: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admins(client),
                self._check_sso_mfa_enforcement(client),
                self._check_export_access_scope(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("zoominfo check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/admin/users", limit=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "zoominfo.users.dormant_admin",
                "Dormant admin user review",
                "least_privilege",
                "Grant the client credentials the admin.users read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data.get("users", data.get("data", []))
        admins = [u for u in users if str(u.get("role", "")).lower() in ("admin", "administrator")]
        dormant = [u for u in admins if not u.get("lastLoginDate") and not u.get("last_login_date")]
        return [IntegrationFinding(
            check_id="zoominfo.users.dormant_admin",
            title="No dormant admin users",
            description=(
                f"{len(admins)} admin user(s), {len(dormant)} with no "
                "recorded login."
            ),
            remediation=(
                "Remove or downgrade admin users who have never logged in "
                "or have been inactive for an extended period."
            ),
            status="PASSED" if not dormant else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "dormant_admin_count": len(dormant),
            },
        )]

    async def _check_sso_mfa_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/admin/securitySettings")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "zoominfo.account.sso_mfa_enforcement",
                "SSO/MFA enforcement",
                "mfa_enforcement",
                "Grant the client credentials the admin.security read "
                "scope, or confirm the plan exposes security settings.",
            )]
        resp.raise_for_status()
        data = resp.json()
        sso_enforced = bool(data.get("ssoEnforced", data.get("sso_enforced", False)))
        mfa_enforced = bool(data.get("mfaEnforced", data.get("mfa_enforced", False)))
        passed = sso_enforced or mfa_enforced
        return [IntegrationFinding(
            check_id="zoominfo.account.sso_mfa_enforcement",
            title="SSO or MFA is enforced org-wide",
            description=(
                f"SSO enforced: {sso_enforced}. MFA enforced: {mfa_enforced}."
            ),
            remediation=(
                "Enforce SSO or MFA for all ZoomInfo users under Admin > "
                "Security Settings to prevent credential-stuffing access "
                "to enriched contact data."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "INFO",
            check_category="mfa_enforcement",
            result_details={
                "sso_enforced": sso_enforced,
                "mfa_enforced": mfa_enforced,
            },
        )]

    async def _check_export_access_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/admin/exportHistory", limit=100)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "zoominfo.exports.access_scope",
                "Contact/lead export access scope",
                "data_classification",
                "Grant the client credentials the admin.exportHistory read "
                "scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        exports = data.get("exports", data.get("data", []))
        distinct_exporters = {e.get("userId", e.get("user_id")) for e in exports if e.get("userId") or e.get("user_id")}
        broad = len(distinct_exporters) > 10
        return [IntegrationFinding(
            check_id="zoominfo.exports.access_scope",
            title="Contact/lead export access is not overly broad",
            description=(
                f"{len(exports)} recent export event(s) across "
                f"{len(distinct_exporters)} distinct user(s)."
            ),
            remediation=(
                "Restrict contact/lead export permission to a small set of "
                "roles that need it; broad export access increases the "
                "blast radius of PII leaving the platform."
            ),
            status="PASSED" if not broad else "WARNING",
            severity="MEDIUM" if broad else "INFO",
            check_category="data_classification",
            result_details={
                "export_event_count": len(exports),
                "distinct_exporter_count": len(distinct_exporters),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from ZoomInfo with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
