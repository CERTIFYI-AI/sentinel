# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Smartsheet integration adapter.

Reads access-review and data-location evidence from the Smartsheet API
v2: dormant admin (system admin) account hygiene, SSO enforcement
posture, and sheets published for anyone-with-the-link access.

Auth: a single api_key (Smartsheet API access token, Bearer).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.smartsheet.com/2.0"


@dataclass
class SmartsheetCredentials:
    """Matches dashboard/src/integrations/smartsheet/config.ts credentialFields."""

    api_key: str


class SmartsheetAdapter:
    """Fetches access-review and data-location posture from Smartsheet."""

    def __init__(self, credentials: SmartsheetCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
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
            resp = await self._get(client, "/users/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Smartsheet rejected the API access token. Verify the "
                    "token is active and has not expired."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Smartsheet: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_sso_enforcement(client),
                self._check_public_publish(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("smartsheet check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", includeAll="true")
        if resp.status_code == 403:
            return [self._unavailable(
                "smartsheet.users.admin_hygiene",
                "System admin account hygiene",
                "least_privilege",
                "Grant the token system admin read access to /users.",
            )]
        resp.raise_for_status()
        users = resp.json().get("data", [])
        admins = [u for u in users if u.get("admin")]
        inactive_admins = [a for a in admins if str(a.get("status", "ACTIVE")).upper() != "ACTIVE"]
        passed = len(inactive_admins) == 0
        return [IntegrationFinding(
            check_id="smartsheet.users.admin_hygiene",
            title="No inactive accounts retain system admin rights",
            description=(
                f"{len(admins)} system admin account(s) found, "
                f"{len(inactive_admins)} not active."
            ),
            remediation="Revoke system admin rights from inactive/declined accounts during offboarding.",
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if inactive_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "inactive_admin_count": len(inactive_admins),
            },
        )]

    async def _check_sso_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users/me")
        if resp.status_code == 403:
            return [self._unavailable(
                "smartsheet.account.sso_enforcement",
                "Single sign-on enforced for the account",
                "mfa_enforcement",
                "Grant the token access to /users/me.",
            )]
        resp.raise_for_status()
        me = resp.json()
        # Smartsheet does not expose an org-wide SSO-enforcement flag on
        # this endpoint; only report a result if it is actually present.
        if "ssoRequired" not in me:
            return [self._unavailable(
                "smartsheet.account.sso_enforcement",
                "Single sign-on enforced for the account",
                "mfa_enforcement",
                "Smartsheet does not expose SSO enforcement via this API "
                "for this plan; verify manually in Admin Center > Security.",
            )]
        enforced = bool(me.get("ssoRequired"))
        return [IntegrationFinding(
            check_id="smartsheet.account.sso_enforcement",
            title="Single sign-on is enforced for the account",
            description=f"Account reports SSO as {'required' if enforced else 'not required'}.",
            remediation="Require SSO for all members under Admin Center > Security > SSO.",
            status="PASSED" if enforced else "FAILED",
            severity="HIGH" if not enforced else "INFO",
            check_category="mfa_enforcement",
            result_details={"sso_required": enforced},
        )]

    async def _check_public_publish(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/sheets", includeAll="true")
        if resp.status_code == 403:
            return [self._unavailable(
                "smartsheet.sheets.public_publish",
                "Sheets published for anyone-with-the-link access",
                "data_classification",
                "Grant the token read access to /sheets.",
            )]
        resp.raise_for_status()
        sheets = resp.json().get("data", [])
        sample = sheets[:25]
        published: list[dict] = []
        for sheet in sample:
            pub_resp = await self._get(client, f"/sheets/{sheet['id']}/publish")
            if pub_resp.status_code != 200:
                continue
            status = pub_resp.json()
            if status.get("readOnlyFullEnabled") or status.get("readOnlyLiteEnabled"):
                published.append({"id": sheet.get("id"), "name": sheet.get("name")})
        passed = len(published) == 0
        return [IntegrationFinding(
            check_id="smartsheet.sheets.public_publish",
            title="No sheets are published for anyone-with-the-link access",
            description=(
                f"{len(published)} of {len(sample)} sheet(s) checked are "
                "published with a publicly accessible read-only link."
            ),
            remediation="Unpublish sheets containing sensitive data, or restrict publish access to authenticated users only.",
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if published else "INFO",
            check_category="data_classification",
            result_details={
                "sheets_checked": len(sample),
                "total_sheet_count": len(sheets),
                "published_count": len(published),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Smartsheet with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
