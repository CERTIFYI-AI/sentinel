# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""LaunchDarkly integration adapter.

Reads feature-flag governance posture from LaunchDarkly: stale flags,
flag approval workflows, and audit-log access for change-management
evidence.
Auth: a single API access token from LaunchDarkly > Account Settings >
Authorization.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://app.launchdarkly.com/api/v2"


@dataclass
class LaunchDarklyCredentials:
    """Matches dashboard/src/integrations/launchdarkly/config.ts credentialFields."""

    api_key: str


class LaunchDarklyAdapter:
    """Fetches feature-flag governance data from LaunchDarkly."""

    def __init__(self, credentials: LaunchDarklyCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

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

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/projects", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "LaunchDarkly rejected the access token. Verify the token "
                    "is active and has Reader role."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach LaunchDarkly: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_flags(client),
                self._check_approval_settings(client),
                self._check_audit_log(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("launchdarkly check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_stale_flags(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # List projects first, then check flags in the default project
        projects_resp = await self._get(client, "/projects", limit=1)
        if projects_resp.status_code == 403:
            return [self._unavailable(
                "launchdarkly.flags.stale_count",
                "Stale feature flags",
                "change_management",
                "Grant the access token Reader role on projects.",
            )]
        projects_resp.raise_for_status()
        projects_data = projects_resp.json()
        items = projects_data.get("items", [])
        if not items:
            return [self._unavailable(
                "launchdarkly.flags.stale_count",
                "Stale feature flags",
                "change_management",
                "No projects found. Create a project in LaunchDarkly.",
            )]
        project_key = items[0].get("key", "default")
        resp = await self._get(
            client, f"/flags/{project_key}",
            filter="status:inactive", limit=100,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "launchdarkly.flags.stale_count",
                "Stale feature flags",
                "change_management",
                "Grant the access token read access to feature flags.",
            )]
        resp.raise_for_status()
        data = resp.json()
        flags = data.get("items", [])
        total_count = data.get("totalCount", len(flags))
        passed = total_count == 0
        return [IntegrationFinding(
            check_id="launchdarkly.flags.stale_count",
            title="No stale (inactive) feature flags",
            description=f"{total_count} inactive/stale flag(s) in project '{project_key}'.",
            remediation=(
                "Archive or remove stale flags. Accumulated dead flags increase "
                "technical debt and complicate change reviews."
            ),
            status="PASSED" if passed else "WARNING",
            severity="LOW",
            check_category="change_management",
            result_details={
                "stale_flag_count": total_count,
                "project_key": project_key,
            },
        )]

    async def _check_approval_settings(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        projects_resp = await self._get(client, "/projects", limit=10)
        if projects_resp.status_code == 403:
            return [self._unavailable(
                "launchdarkly.governance.approvals",
                "Flag change approval workflow",
                "change_management",
                "Grant the access token Reader role on projects.",
            )]
        projects_resp.raise_for_status()
        projects = projects_resp.json().get("items", [])
        projects_with_approvals = 0
        for project in projects:
            # Check if the project has approval settings enabled
            envs = project.get("environments", {})
            if isinstance(envs, dict):
                for env in envs.values():
                    if isinstance(env, dict) and env.get("approvalSettings", {}).get("required"):
                        projects_with_approvals += 1
                        break
        passed = projects_with_approvals == len(projects) and projects
        return [IntegrationFinding(
            check_id="launchdarkly.governance.approvals",
            title="Flag change approvals are required",
            description=(
                f"{projects_with_approvals} of {len(projects)} project(s) "
                "require approval for flag changes."
            ),
            remediation=(
                "Enable approval workflows for production environments in "
                "LaunchDarkly > Project Settings > Approvals."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="change_management",
            result_details={
                "total_projects": len(projects),
                "projects_with_approvals": projects_with_approvals,
            },
        )]

    async def _check_audit_log(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/auditlog", limit=5)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "launchdarkly.audit.log_available",
                "Audit log accessible",
                "access_control",
                "Grant the access token read access to the audit log.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("items", [])
        return [IntegrationFinding(
            check_id="launchdarkly.audit.log_available",
            title="Audit log is accessible for compliance evidence",
            description=(
                f"Retrieved {len(entries)} recent audit log entry/entries. "
                "Change-management evidence can be collected."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="access_control",
            result_details={"recent_entry_count": len(entries)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from LaunchDarkly with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
