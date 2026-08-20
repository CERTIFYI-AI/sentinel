# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Render integration adapter.

Reads platform security posture from the Render REST API: workspace
member role concentration, Postgres IP allow-listing, and Postgres
high-availability as a backup/recovery signal.

Auth: a single api_key (Bearer token, scoped to a workspace, from Render
Account Settings > API Keys).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.render.com/v1"

_ANY_IPV4 = "0.0.0.0/0"


@dataclass
class RenderCredentials:
    """Matches dashboard/src/integrations/render/config.ts credentialFields."""

    api_key: str


class RenderAdapter:
    """Reads workspace and Postgres security posture from Render."""

    def __init__(self, credentials: RenderCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/owners", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Render rejected the API key. Verify the key is active "
                    "and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Render: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_role_concentration(client),
                self._check_postgres_ip_allow_list(client),
                self._check_postgres_high_availability(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("render check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_role_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/members", limit=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "render.workspace.admin_role_concentration",
                "Workspace admin role concentration",
                "access_control",
                "Grant the API key owner or admin access so workspace "
                "members are visible.",
            )]
        resp.raise_for_status()
        data = resp.json()
        members = data if isinstance(data, list) else data.get("members", data.get("results", []))
        admins = [
            m.get("user", m).get("email", m.get("user", m).get("id", "unknown"))
            for m in members
            if str(m.get("role", "")).lower() in ("admin", "owner")
        ]
        total = len(members)
        ratio = (len(admins) / total) if total else 0.0
        status = "PASSED" if len(admins) <= 2 or ratio <= 0.34 else "WARNING"
        return [IntegrationFinding(
            check_id="render.workspace.admin_role_concentration",
            title=f"{len(admins)} of {total} workspace members hold admin or owner role",
            description=("Admin/owner members: " + ", ".join(sorted(str(a) for a in admins)[:20])
                         if admins else "No workspace member holds admin or owner role."),
            remediation="Render Dashboard → Team → reduce membership with the "
                        "admin/owner role to the minimum needed and assign the "
                        "collaborator role for day-to-day access.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"total_members": total, "admin_or_owner": len(admins)},
        )]

    async def _check_postgres_ip_allow_list(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/postgres", limit=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "render.postgres.ip_allow_list",
                "Postgres IP allow-listing",
                "network_security",
                "Grant the API key access to Postgres resources.",
            )]
        resp.raise_for_status()
        data = resp.json()
        databases = data if isinstance(data, list) else data.get("postgres", data.get("results", []))
        open_to_world: list[str] = []
        for entry in databases:
            db = entry.get("postgres", entry)
            name = db.get("name", db.get("id", "unknown"))
            allow_list = db.get("ipAllowList", [])
            if not allow_list or any(rule.get("cidrBlock") == _ANY_IPV4 for rule in allow_list):
                open_to_world.append(str(name))
        status = "PASSED" if databases and not open_to_world else ("WARNING" if databases else "NOT_AVAILABLE")
        return [IntegrationFinding(
            check_id="render.postgres.ip_allow_list",
            title=(f"{len(open_to_world)} of {len(databases)} Postgres databases allow connections "
                   "from any IP" if open_to_world else
                   f"All {len(databases)} Postgres databases restrict connections by IP"
                   if databases else "No Render Postgres databases visible to this credential"),
            description=("Without a restrictive allow-list: " + ", ".join(open_to_world[:20])
                         if open_to_world else
                         ("Every database has a non-empty IP allow-list that excludes 0.0.0.0/0."
                          if databases else
                          "These credentials cannot see any Postgres databases, or none exist.")),
            remediation="Render Dashboard → Postgres → database → Access Control → add "
                        "specific CIDR ranges and remove any 0.0.0.0/0 entry.",
            status=status,
            severity="INFO" if status in ("PASSED", "NOT_AVAILABLE") else "HIGH",
            check_category="network_security",
            result_details={"databases": len(databases), "open_to_world": open_to_world},
        )]

    async def _check_postgres_high_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/postgres", limit=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "render.postgres.high_availability",
                "Postgres high-availability / backup posture",
                "backup_recovery",
                "Grant the API key access to Postgres resources.",
            )]
        resp.raise_for_status()
        data = resp.json()
        databases = data if isinstance(data, list) else data.get("postgres", data.get("results", []))
        no_ha: list[str] = []
        for entry in databases:
            db = entry.get("postgres", entry)
            name = db.get("name", db.get("id", "unknown"))
            if not db.get("highAvailabilityEnabled", False):
                no_ha.append(str(name))
        status = "PASSED" if databases and not no_ha else ("WARNING" if databases else "NOT_AVAILABLE")
        return [IntegrationFinding(
            check_id="render.postgres.high_availability",
            title=(f"{len(no_ha)} of {len(databases)} Postgres databases have no standby / "
                   "high-availability replica" if no_ha else
                   f"All {len(databases)} Postgres databases have high availability enabled"
                   if databases else "No Render Postgres databases visible to this credential"),
            description=("Without a standby replica: " + ", ".join(no_ha[:20])
                         if no_ha else
                         ("Every database runs with a standby replica for automatic failover."
                          if databases else
                          "These credentials cannot see any Postgres databases, or none exist.")),
            remediation="Render Dashboard → Postgres → database → enable High Availability "
                        "so a standby replica can fail over automatically, and confirm "
                        "point-in-time recovery is enabled for the plan.",
            status=status,
            severity="INFO" if status in ("PASSED", "NOT_AVAILABLE") else "MEDIUM",
            check_category="backup_recovery",
            result_details={"databases": len(databases), "without_ha": no_ha},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Render with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
