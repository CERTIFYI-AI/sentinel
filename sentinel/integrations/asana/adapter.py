# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Asana integration adapter.

Reads access-review and data-location evidence from the Asana REST API:
workspace admin account hygiene, audit log event retrievability
(Asana Enterprise), and guest (external collaborator) access to the
workspace.

Auth: a single api_key (Asana Personal Access Token, Bearer).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://app.asana.com/api/1.0"


@dataclass
class AsanaCredentials:
    """Matches dashboard/src/integrations/asana/config.ts credentialFields."""

    api_key: str


class AsanaAdapter:
    """Fetches access-review and data-location posture from Asana."""

    def __init__(self, credentials: AsanaCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._workspace_gid: str | None = None

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

    async def _workspace_gid_for(self, client: httpx.AsyncClient) -> str | None:
        if self._workspace_gid is not None:
            return self._workspace_gid
        resp = await self._get(client, "/workspaces", limit=1)
        if resp.status_code in (401, 403):
            return None
        resp.raise_for_status()
        workspaces = resp.json().get("data", [])
        if not workspaces:
            return None
        self._workspace_gid = workspaces[0].get("gid")
        return self._workspace_gid

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/users/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Asana rejected the personal access token. Verify the "
                    "token is active and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Asana: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_audit_log_retrievability(client),
                self._check_guest_access(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("asana check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        workspace_gid = await self._workspace_gid_for(client)
        if workspace_gid is None:
            return [self._unavailable(
                "asana.workspace.admin_hygiene",
                "Admin account hygiene",
                "least_privilege",
                "Grant the token read access to workspace memberships.",
            )]
        resp = await self._get(
            client, f"/workspaces/{workspace_gid}/workspace_memberships",
            opt_fields="is_admin,user.name", limit=100,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "asana.workspace.admin_hygiene",
                "Admin account hygiene",
                "least_privilege",
                "Grant the token read access to workspace memberships.",
            )]
        resp.raise_for_status()
        memberships = resp.json().get("data", [])
        total = len(memberships)
        admins = [m for m in memberships if m.get("is_admin")]
        excessive = total > 0 and (len(admins) / total) > 0.3
        return [IntegrationFinding(
            check_id="asana.workspace.admin_hygiene",
            title="Admin count is proportionate to workspace size",
            description=(
                f"{len(admins)} of {total} workspace member(s) hold the "
                "admin role."
            ),
            remediation=(
                "Review the admin roster and reduce standing admin access "
                "to the smallest set that requires it."
            ),
            status="PASSED" if not excessive else "WARNING",
            severity="MEDIUM" if excessive else "INFO",
            check_category="least_privilege",
            result_details={"member_count": total, "admin_count": len(admins)},
        )]

    async def _check_audit_log_retrievability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        workspace_gid = await self._workspace_gid_for(client)
        if workspace_gid is None:
            return [self._unavailable(
                "asana.workspace.audit_log_retrievability",
                "Audit log retrievability",
                "audit_logging",
                "Grant the token audit log read access (Asana Enterprise).",
            )]
        resp = await self._get(
            client, f"/workspaces/{workspace_gid}/audit_log_events", limit=1,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "asana.workspace.audit_log_retrievability",
                "Audit log retrievability",
                "audit_logging",
                "Asana audit logs require an Enterprise plan and the "
                "audit:read scope. Verify both are available.",
            )]
        resp.raise_for_status()
        events = resp.json().get("data", [])
        retrievable = isinstance(events, list)
        return [IntegrationFinding(
            check_id="asana.workspace.audit_log_retrievability",
            title="Audit logs are retrievable",
            description=(
                "Audit log API responded with retrievable events."
                if retrievable else
                "Audit log API responded but returned an unexpected shape."
            ),
            remediation="Ensure Asana Enterprise audit log export remains enabled.",
            status="PASSED" if retrievable else "WARNING",
            severity="INFO" if retrievable else "MEDIUM",
            check_category="audit_logging",
            result_details={"sample_event_count": len(events) if isinstance(events, list) else 0},
        )]

    async def _check_guest_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        workspace_gid = await self._workspace_gid_for(client)
        if workspace_gid is None:
            return [self._unavailable(
                "asana.workspace.guest_access",
                "External guest access to the workspace",
                "access_control",
                "Grant the token read access to workspace memberships.",
            )]
        resp = await self._get(
            client, f"/workspaces/{workspace_gid}/workspace_memberships",
            opt_fields="is_guest,user.name", limit=100,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "asana.workspace.guest_access",
                "External guest access to the workspace",
                "access_control",
                "Grant the token read access to workspace memberships.",
            )]
        resp.raise_for_status()
        memberships = resp.json().get("data", [])
        guests = [m for m in memberships if m.get("is_guest")]
        passed = len(guests) == 0
        return [IntegrationFinding(
            check_id="asana.workspace.guest_access",
            title="No external guests hold workspace access",
            description=(
                f"{len(guests)} of {len(memberships)} workspace member(s) "
                "are external guests."
            ),
            remediation=(
                "Review guest accounts periodically and remove access once "
                "the collaboration engagement ends."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if guests else "INFO",
            check_category="access_control",
            result_details={
                "member_count": len(memberships),
                "guest_count": len(guests),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Asana with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
