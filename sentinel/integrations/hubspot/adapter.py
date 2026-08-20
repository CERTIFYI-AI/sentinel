# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""HubSpot integration adapter.

Reads access-review and data-location evidence from the HubSpot REST API:
super-admin account concentration, retrievability of the account's security
audit log, and over-broad OAuth scopes granted to the connected
private-app token.

Auth: a HubSpot Private App access token, sent as a Bearer token.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.hubapi.com"

#: Scopes that reach well beyond read-only CRM access; a token granted any
#: of these can modify or delete records, not just evidence them.
_BROAD_SCOPES = {
    "crm.objects.contacts.write",
    "crm.objects.companies.write",
    "crm.objects.deals.write",
    "crm.objects.owners.write",
    "account-info.security.write",
    "settings.users.write",
    "crm.import",
}


@dataclass
class HubspotCredentials:
    """Matches dashboard/src/integrations/hubspot/config.ts credentialFields."""

    api_key: str


class HubspotAdapter:
    """Fetches access-review and data-exposure posture from HubSpot."""

    def __init__(self, credentials: HubspotCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/account-info/v3/details")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "HubSpot rejected the private app access token. Verify "
                    "the token is active and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach HubSpot: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_super_admin_concentration(client),
                self._check_security_audit_log(client),
                self._check_broad_oauth_scopes(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("hubspot check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_super_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/settings/v3/users", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "hubspot.users.super_admin_concentration",
                "Super admin account concentration",
                "least_privilege",
                "Grant the private app the crm.objects.owners.read and "
                "settings.users.read scopes.",
            )]
        resp.raise_for_status()
        users = resp.json().get("results", [])
        total = len(users)
        super_admins = [u for u in users if u.get("superAdmin")]
        ratio = (len(super_admins) / total) if total else 0
        passed = total > 0 and ratio <= 0.2
        return [IntegrationFinding(
            check_id="hubspot.users.super_admin_concentration",
            title="Super admin access is not over-concentrated",
            description=(
                f"{len(super_admins)} of {total} user(s) hold the super "
                "admin permission."
                if total else
                "No users were returned for this account."
            ),
            remediation=(
                "Limit the super admin permission to the smallest set of "
                "people who genuinely need account-wide control; assign "
                "narrower permission sets to everyone else."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed and total else "INFO",
            check_category="least_privilege",
            result_details={
                "total_user_count": total,
                "super_admin_count": len(super_admins),
            },
        )]

    async def _check_security_audit_log(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit-logs/v1/events", limit=10)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "hubspot.audit_logs.retrievable",
                "Security audit log retrievable",
                "audit_logging",
                "Security audit logs require a HubSpot Enterprise plan and "
                "are not available on this account or token.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data if isinstance(data, list) else data.get("results", [])
        passed = len(events) > 0
        return [IntegrationFinding(
            check_id="hubspot.audit_logs.retrievable",
            title="Security audit log is retrievable and populated",
            description=(
                f"{len(events)} recent audit log event(s) retrieved."
                if passed else
                "The audit log endpoint returned no events."
            ),
            remediation=(
                "Confirm security audit logging is enabled for this account "
                "so login and permission changes remain traceable."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="audit_logging",
            result_details={"recent_event_count": len(events)},
        )]

    async def _check_broad_oauth_scopes(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, f"/oauth/v1/access-tokens/{self.credentials.api_key}")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "hubspot.oauth.broad_scopes",
                "Connected app OAuth scopes reviewed",
                "access_control",
                "Token introspection is only available for tokens issued "
                "through the standard HubSpot OAuth flow.",
            )]
        resp.raise_for_status()
        data = resp.json()
        scopes = set(data.get("scopes", []))
        broad = sorted(scopes & _BROAD_SCOPES)
        passed = len(broad) == 0
        return [IntegrationFinding(
            check_id="hubspot.oauth.broad_scopes",
            title="No connected app scope grants unnecessary write access",
            description=(
                f"{len(broad)} write/administrative scope(s) are granted to "
                "this token: " + ", ".join(broad) + "."
                if broad else
                f"All {len(scopes)} granted scope(s) are read-only or "
                "otherwise narrowly scoped."
            ),
            remediation=(
                "Re-issue the private app token with only the read scopes "
                "Sentinel needs; grant write scopes solely to integrations "
                "that must modify CRM records."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if broad else "INFO",
            check_category="access_control",
            result_details={
                "granted_scope_count": len(scopes),
                "broad_scope_count": len(broad),
                "broad_scopes": broad,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from HubSpot with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
