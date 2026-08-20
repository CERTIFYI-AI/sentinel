# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Close integration adapter.

Reads access-review and data-location evidence from the Close CRM REST API:
admin-role account concentration within the organization, retrievability of
the organization's activity/event log, and the absence of role-based
restrictions that would keep every user from seeing every lead by default.

Auth: an API key, sent as HTTP Basic with the key as the username and a
blank password (Close's API-key auth scheme).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.close.com/api/v1"

#: Close's built-in roles that intentionally grant unrestricted lead
#: visibility; anything else is treated as a custom, presumably scoped, role.
_UNRESTRICTED_ROLE_NAMES = {"admin", "user", "member"}


@dataclass
class CloseCredentials:
    """Matches dashboard/src/integrations/close/config.ts credentialFields."""

    api_key: str


class CloseAdapter:
    """Fetches access-review and data-exposure posture from Close."""

    def __init__(self, credentials: CloseCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(self.credentials.api_key, "")

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/me/")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Close rejected the API key. Verify the key is active."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Close: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_concentration(client),
                self._check_event_log_retrievable(client),
                self._check_unrestricted_lead_visibility(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("close check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _organization_id(self, client: httpx.AsyncClient) -> str | None:
        resp = await self._get(client, "/me/")
        if resp.status_code != 200:
            return None
        orgs = resp.json().get("organizations", [])
        return orgs[0].get("id") if orgs else None

    async def _check_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_id = await self._organization_id(client)
        if not org_id:
            return [self._unavailable(
                "close.organization.admin_concentration",
                "Admin-role account concentration",
                "least_privilege",
                "Grant the API key read access to /me/ and /organization/.",
            )]
        resp = await self._get(client, f"/organization/{org_id}/")
        if resp.status_code == 403:
            return [self._unavailable(
                "close.organization.admin_concentration",
                "Admin-role account concentration",
                "least_privilege",
                "Grant the API key read access to /organization/{id}/.",
            )]
        resp.raise_for_status()
        memberships = resp.json().get("memberships", [])
        total = len(memberships)
        admins = [m for m in memberships if str(m.get("role", "")).lower() == "admin"]
        ratio = (len(admins) / total) if total else 0
        passed = total > 0 and ratio <= 0.3
        return [IntegrationFinding(
            check_id="close.organization.admin_concentration",
            title="Admin-role access is not over-concentrated",
            description=(
                f"{len(admins)} of {total} organization member(s) hold the "
                "admin role."
                if total else
                "No organization members were returned."
            ),
            remediation=(
                "Limit the admin role to the smallest set of people who "
                "genuinely need account-wide control over the organization."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed and total else "INFO",
            check_category="least_privilege",
            result_details={
                "total_member_count": total,
                "admin_count": len(admins),
            },
        )]

    async def _check_event_log_retrievable(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/event/", _limit=10)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "close.events.retrievable",
                "Organization event log retrievable",
                "audit_logging",
                "Grant the API key read access to /event/.",
            )]
        resp.raise_for_status()
        events = resp.json().get("data", [])
        passed = len(events) > 0
        return [IntegrationFinding(
            check_id="close.events.retrievable",
            title="Organization event log is retrievable and populated",
            description=(
                f"{len(events)} recent event(s) retrieved from the "
                "organization's activity log."
                if passed else
                "The event log endpoint returned no events."
            ),
            remediation=(
                "Confirm user and lead activity is being recorded to the "
                "event log so changes remain traceable."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="audit_logging",
            result_details={"recent_event_count": len(events)},
        )]

    async def _check_unrestricted_lead_visibility(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/role/")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "close.roles.unrestricted_lead_visibility",
                "Role-based restriction of lead visibility",
                "access_control",
                "Custom roles require a Close plan that includes "
                "Roles & Permissions, and read access to /role/.",
            )]
        resp.raise_for_status()
        roles = resp.json().get("data", [])
        custom_roles = [r for r in roles if str(r.get("name", "")).lower() not in _UNRESTRICTED_ROLE_NAMES]
        # No custom, scoped role exists — every user is left on a built-in
        # role that sees every lead in the organization by default.
        passed = len(custom_roles) > 0
        return [IntegrationFinding(
            check_id="close.roles.unrestricted_lead_visibility",
            title="A scoped role restricts lead visibility beyond the default",
            description=(
                f"{len(custom_roles)} custom role(s) configured."
                if passed else
                f"Only built-in role(s) ({', '.join(sorted({r.get('name', '') for r in roles})) or 'none'}) "
                "are configured, so every user can see every lead in the "
                "organization by default."
            ),
            remediation=(
                "Configure Territories or custom Roles & Permissions so "
                "lead visibility can be restricted by team instead of "
                "defaulting to organization-wide access for every user."
            ),
            status="PASSED" if passed else "WARNING",
            severity="LOW" if not passed else "INFO",
            check_category="access_control",
            result_details={
                "role_count": len(roles),
                "custom_role_count": len(custom_roles),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Close with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
