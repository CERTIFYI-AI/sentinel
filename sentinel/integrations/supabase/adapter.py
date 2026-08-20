# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Supabase integration adapter.

Reads managed-Postgres platform security posture from the Supabase
Management API: Owner-role concentration across organization members,
projects whose direct database connection is not restricted by an allow
list, and projects without a configured backup / point-in-time-recovery
policy.

Auth: a single api_key (Supabase Management API Personal Access Token,
Bearer).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.supabase.com/v1"

_ANY_IPV4 = "0.0.0.0/0"


@dataclass
class SupabaseCredentials:
    """Matches dashboard/src/integrations/supabase/config.ts credentialFields."""

    api_key: str


class SupabaseAdapter:
    """Fetches managed-Postgres platform security posture from Supabase."""

    def __init__(self, credentials: SupabaseCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/projects")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Supabase rejected the Management API access token. "
                    "Verify the token is active and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Supabase: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_owner_role_concentration(client),
                self._check_unrestricted_db_access(client),
                self._check_backups_configured(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("supabase check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_owner_role_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        orgs_resp = await self._get(client, "/organizations")
        if orgs_resp.status_code in (403, 404):
            return [self._unavailable(
                "supabase.iam.owner_role_concentration",
                "Organization Owner role is not over-assigned",
                "least_privilege",
                "Grant this token read access to organization members.",
            )]
        orgs_resp.raise_for_status()
        orgs = orgs_resp.json()

        owners: list[str] = []
        total_members = 0
        unreadable = 0
        for org in orgs:
            org_id = org.get("id", "")
            members_resp = await self._get(client, f"/organizations/{org_id}/members")
            if members_resp.status_code in (403, 404):
                unreadable += 1
                continue
            members_resp.raise_for_status()
            for member in members_resp.json():
                total_members += 1
                if member.get("role_name", "").lower() == "owner":
                    owners.append(f"{org.get('name', org_id)}:{member.get('user_name', member.get('user_id', ''))}")

        if orgs and unreadable == len(orgs):
            status: str = "NOT_AVAILABLE"
        else:
            ratio = (len(owners) / total_members) if total_members else 0.0
            status = "PASSED" if len(owners) <= 2 or ratio <= 0.15 else (
                "WARNING" if ratio <= 0.34 else "FAILED")
        return [IntegrationFinding(
            check_id="supabase.iam.owner_role_concentration",
            title={
                "NOT_AVAILABLE": "Organization membership not readable by this token",
            }.get(status, f"{len(owners)} of {total_members} organization members hold the Owner role"),
            description=(
                "This token cannot read organization membership."
                if status == "NOT_AVAILABLE" else
                ("Owners: " + ", ".join(owners[:20]) if owners else
                 "No organization member holds the Owner role beyond a "
                 "reasonable minimum.")
            ),
            remediation=(
                "Organization → Team → downgrade members who do not need "
                "billing/organization-management control from Owner to "
                "Developer."
            ),
            status=status,  # type: ignore[arg-type]
            severity="INFO" if status in ("PASSED", "NOT_AVAILABLE") else (
                "MEDIUM" if status == "WARNING" else "HIGH"),
            check_category="least_privilege",
            result_details={
                "owner_count": len(owners),
                "member_count": total_members,
                "owners": owners,
                "unreadable_organizations": unreadable,
            },
        )]

    async def _check_unrestricted_db_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        projects_resp = await self._get(client, "/projects")
        if projects_resp.status_code in (403, 404):
            return [self._unavailable(
                "supabase.projects.unrestricted_db_access",
                "Direct database access is restricted by an IP allow list",
                "network_security",
                "Grant this token read access to projects and network "
                "restrictions.",
            )]
        projects_resp.raise_for_status()
        projects = projects_resp.json()

        unrestricted: list[str] = []
        unreadable = 0
        for project in projects:
            ref = project.get("id", "")
            nr_resp = await self._get(client, f"/projects/{ref}/network-restrictions")
            if nr_resp.status_code in (403, 404):
                unreadable += 1
                continue
            nr_resp.raise_for_status()
            cidrs = nr_resp.json().get("config", {}).get("dbAllowedCidrs", [])
            if not cidrs or _ANY_IPV4 in cidrs:
                unrestricted.append(project.get("name", ref))

        if projects and unreadable == len(projects):
            status: str = "NOT_AVAILABLE"
        else:
            status = "PASSED" if not unrestricted else "FAILED"
        return [IntegrationFinding(
            check_id="supabase.projects.unrestricted_db_access",
            title={
                "NOT_AVAILABLE": "Network restrictions not readable by this token",
                "PASSED": f"All {len(projects)} projects restrict direct database access",
                "FAILED": f"{len(unrestricted)} of {len(projects)} projects allow database access from anywhere",
            }[status],
            description=(
                "This token cannot read project network restrictions."
                if status == "NOT_AVAILABLE" else
                ("Unrestricted: " + ", ".join(unrestricted[:20]) if unrestricted else
                 "Every project's direct Postgres connection is limited to an "
                 "explicit CIDR allow list.")
            ),
            remediation=(
                "Project → Settings → Database → Network Restrictions → add "
                "the specific CIDR ranges that need direct database access "
                "instead of leaving it open to 0.0.0.0/0."
            ),
            status=status,  # type: ignore[arg-type]
            severity="INFO" if status == "PASSED" else ("LOW" if status == "NOT_AVAILABLE" else "HIGH"),
            check_category="network_security",
            result_details={
                "project_count": len(projects),
                "unrestricted_projects": unrestricted,
                "unreadable_projects": unreadable,
            },
        )]

    async def _check_backups_configured(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        projects_resp = await self._get(client, "/projects")
        if projects_resp.status_code in (403, 404):
            return [self._unavailable(
                "supabase.projects.backups_configured",
                "Projects have a backup policy configured",
                "backup_recovery",
                "Grant this token read access to projects and database "
                "backups.",
            )]
        projects_resp.raise_for_status()
        projects = projects_resp.json()

        without_backups: list[str] = []
        unreadable = 0
        for project in projects:
            ref = project.get("id", "")
            backups_resp = await self._get(client, f"/projects/{ref}/database/backups")
            if backups_resp.status_code in (403, 404):
                unreadable += 1
                continue
            backups_resp.raise_for_status()
            data = backups_resp.json()
            pitr_enabled = bool(data.get("pitr_enabled"))
            backups = data.get("backups", [])
            if not pitr_enabled and not backups:
                without_backups.append(project.get("name", ref))

        if projects and unreadable == len(projects):
            status: str = "NOT_AVAILABLE"
        else:
            status = "PASSED" if not without_backups else "WARNING"
        return [IntegrationFinding(
            check_id="supabase.projects.backups_configured",
            title={
                "NOT_AVAILABLE": "Backup configuration not readable by this token",
                "PASSED": f"All {len(projects)} projects have backups or PITR configured",
                "WARNING": f"{len(without_backups)} of {len(projects)} projects have no backup or PITR",
            }[status],
            description=(
                "This token cannot read project backup configuration."
                if status == "NOT_AVAILABLE" else
                ("No backups or PITR: " + ", ".join(without_backups[:20])
                 if without_backups else
                 "Every project has scheduled backups or point-in-time "
                 "recovery enabled.")
            ),
            remediation=(
                "Project → Settings → Database → Backups → enable daily "
                "backups, or upgrade to a plan that supports point-in-time "
                "recovery for production projects."
            ),
            status=status,  # type: ignore[arg-type]
            severity="INFO" if status == "PASSED" else ("LOW" if status == "NOT_AVAILABLE" else "MEDIUM"),
            check_category="backup_recovery",
            result_details={
                "project_count": len(projects),
                "projects_without_backups": without_backups,
                "unreadable_projects": unreadable,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Supabase with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
