# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""ClickUp integration adapter.

Reads access-review and data-location evidence from the ClickUp API v2:
owner/admin account hygiene, two-factor-authentication enforcement, and
tasks/lists/folders shared outside the workspace via the Shared
Hierarchy.

Auth: a single api_key (ClickUp API token, sent as a raw ``Authorization``
header — not Bearer-prefixed).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.clickup.com/api/v2"

#: ClickUp member role codes: 1=owner, 2=admin, 3=member, 4=guest.
_PRIVILEGED_ROLES = (1, 2)


@dataclass
class ClickupCredentials:
    """Matches dashboard/src/integrations/clickup/config.ts credentialFields."""

    api_key: str


class ClickupAdapter:
    """Fetches access-review and data-location posture from ClickUp."""

    def __init__(self, credentials: ClickupCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._team_id: str | None = None

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": self.credentials.api_key,
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

    async def _team(self, client: httpx.AsyncClient) -> dict | None:
        resp = await self._get(client, "/team")
        if resp.status_code in (401, 403):
            return None
        resp.raise_for_status()
        teams = resp.json().get("teams", [])
        if not teams:
            return None
        self._team_id = teams[0].get("id")
        return teams[0]

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/team")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "ClickUp rejected the API token. Verify the token is "
                    "active and has workspace read access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach ClickUp: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_two_factor_enforcement(client),
                self._check_external_sharing(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("clickup check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        team = await self._team(client)
        if team is None:
            return [self._unavailable(
                "clickup.team.admin_hygiene",
                "Owner/admin account hygiene",
                "least_privilege",
                "Grant the API token workspace read access.",
            )]
        members = team.get("members", [])
        privileged = [m for m in members if m.get("user", {}).get("role") in _PRIVILEGED_ROLES]
        total = len(members)
        excessive = total > 0 and (len(privileged) / total) > 0.3
        return [IntegrationFinding(
            check_id="clickup.team.admin_hygiene",
            title="Owner/admin count is proportionate to workspace size",
            description=(
                f"{len(privileged)} of {total} workspace member(s) hold the "
                "owner or admin role."
            ),
            remediation=(
                "Review the owner/admin roster and reduce standing "
                "privileged access to the smallest set that requires it."
            ),
            status="PASSED" if not excessive else "WARNING",
            severity="MEDIUM" if excessive else "INFO",
            check_category="least_privilege",
            result_details={"member_count": total, "privileged_count": len(privileged)},
        )]

    async def _check_two_factor_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        team = await self._team(client)
        if team is None:
            return [self._unavailable(
                "clickup.team.two_factor_enforcement",
                "Two-factor authentication enforced workspace-wide",
                "mfa_enforcement",
                "Grant the API token workspace read access.",
            )]
        # ClickUp's public API does not expose an org-wide MFA-enforcement
        # flag; only report a result if the field is actually present.
        if "two_factor_required" not in team:
            return [self._unavailable(
                "clickup.team.two_factor_enforcement",
                "Two-factor authentication enforced workspace-wide",
                "mfa_enforcement",
                "ClickUp does not expose workspace-wide 2FA enforcement via "
                "the public API for this plan; verify manually in "
                "Workspace Settings > Security.",
            )]
        enforced = bool(team.get("two_factor_required"))
        return [IntegrationFinding(
            check_id="clickup.team.two_factor_enforcement",
            title="Two-factor authentication is enforced workspace-wide",
            description=f"Workspace reports 2FA as {'required' if enforced else 'not required'}.",
            remediation="Require two-factor authentication for all members under Workspace Settings > Security.",
            status="PASSED" if enforced else "FAILED",
            severity="HIGH" if not enforced else "INFO",
            check_category="mfa_enforcement",
            result_details={"two_factor_required": enforced},
        )]

    async def _check_external_sharing(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        team = await self._team(client)
        if team is None or self._team_id is None:
            return [self._unavailable(
                "clickup.workspace.external_sharing",
                "Items shared outside the workspace",
                "data_classification",
                "Grant the API token workspace read access.",
            )]
        resp = await self._get(client, f"/team/{self._team_id}/shared")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "clickup.workspace.external_sharing",
                "Items shared outside the workspace",
                "data_classification",
                "Grant the API token read access to the shared hierarchy.",
            )]
        resp.raise_for_status()
        shared = resp.json().get("shared", {})
        shared_count = sum(len(shared.get(k, [])) for k in ("tasks", "lists", "folders"))
        passed = shared_count == 0
        return [IntegrationFinding(
            check_id="clickup.workspace.external_sharing",
            title="No tasks, lists, or folders are shared outside the workspace",
            description=f"{shared_count} item(s) shared via the shared hierarchy (guests/external links).",
            remediation="Review shared hierarchy items and revoke sharing for those no longer needed by guests.",
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if shared_count else "INFO",
            check_category="data_classification",
            result_details={"shared_item_count": shared_count},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from ClickUp with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
