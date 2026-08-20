# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Jira Cloud integration adapter.

Built on the shared Atlassian client (``sentinel/integrations/atlassian``).
Auth: HTTP Basic with email + API token.  The token needs the following scopes
(classic scopes or OAuth 2.0 granular):

  read:jira-work          project search, workflow schemes
  read:jira-user          group membership (admin count)

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                 | check_category            | Controls mapped                              |
+------------------------------------------+---------------------------+----------------------------------------------+
| jira.projects.inventory                  | change_management         | SOC2 CC8.1 * ISO27001 A.12.1.2 * PCI 6.4    |
| jira.permissions.global_admins           | least_privilege           | SOC2 CC6.3 * ISO27001 A.9.2.3 * PCI 7.1     |
| jira.workflows.default_scheme            | change_management         | SOC2 CC8.1 * ISO27001 A.12.1.2 * PCI 6.4    |
+------------------------------------------+---------------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.atlassian import AtlassianClient, AtlassianCredentials
from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_ADMIN_THRESHOLD = 10


@dataclass
class JiraCredentials(AtlassianCredentials):
    """Matches dashboard/src/integrations/jira/config.ts credentialFields."""


class JiraAdapter:
    """Fetches project and governance posture from Jira Cloud.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: JiraCredentials, client=None) -> None:
        self.credentials = credentials
        self.atl = client if isinstance(client, AtlassianClient) else AtlassianClient(credentials, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.atl.get("/rest/api/3/myself")
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Jira rejected the credentials (HTTP {resp.status_code}). "
                    "Check the email, API token and site URL."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Jira: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_projects_inventory(),
            self._check_global_admins(),
            self._check_workflow_schemes(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("jira check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_projects_inventory(self) -> list[IntegrationFinding]:
        resp = await self.atl.get("/rest/api/3/project/search")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "jira.projects.inventory",
                "Jira project inventory",
                "change_management",
                "Grant read:jira-work scope to the API token.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        projects = payload.get("values", [])
        total = payload.get("total", len(projects))
        return [IntegrationFinding(
            check_id="jira.projects.inventory",
            title=f"{total} Jira projects discovered",
            description=f"The Jira site has {total} project(s) under management.",
            remediation="Review projects periodically to archive stale ones and "
                        "ensure each has a defined workflow and permission scheme.",
            status="PASSED",
            severity="LOW",
            check_category="change_management",
            result_details={
                "project_count": total,
                "sample": [p.get("key") for p in projects[:20]],
            },
        )]

    async def _check_global_admins(self) -> list[IntegrationFinding]:
        resp = await self.atl.get(
            "/rest/api/3/group/member",
            groupname="jira-administrators",
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "jira.permissions.global_admins",
                "Jira global administrator count",
                "least_privilege",
                "Grant read:jira-user scope to the API token.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        members = payload.get("values", [])
        total = payload.get("total", len(members))
        excessive = total > _ADMIN_THRESHOLD
        return [IntegrationFinding(
            check_id="jira.permissions.global_admins",
            title=f"{total} members in jira-administrators group",
            description=(
                f"The jira-administrators group has {total} member(s). "
                + (f"This exceeds the recommended maximum of {_ADMIN_THRESHOLD}."
                   if excessive
                   else "This is within the recommended limit.")
            ),
            remediation="Remove users who do not need site-wide administrative "
                        "access; use project-level roles instead.",
            status="WARNING" if excessive else "PASSED",
            severity="HIGH" if excessive else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": total,
                "threshold": _ADMIN_THRESHOLD,
                "sample": [m.get("displayName", "") for m in members[:20]],
            },
        )]

    async def _check_workflow_schemes(self) -> list[IntegrationFinding]:
        resp = await self.atl.get("/rest/api/3/workflowscheme")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "jira.workflows.default_scheme",
                "Workflow schemes are defined",
                "change_management",
                "Grant read:jira-work scope to the API token.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        schemes = payload.get("values", payload) if isinstance(payload, dict) else payload
        if not isinstance(schemes, list):
            schemes = []
        has_schemes = len(schemes) > 0
        return [IntegrationFinding(
            check_id="jira.workflows.default_scheme",
            title=(f"{len(schemes)} workflow scheme(s) defined"
                   if has_schemes
                   else "No workflow schemes found"),
            description=(
                f"{len(schemes)} workflow scheme(s) govern issue transitions, "
                "providing evidence of structured change management."
                if has_schemes else
                "No workflow schemes were found. Without defined workflows, "
                "issue transitions are ungoverned."
            ),
            remediation="Define at least one workflow scheme with approval gates "
                        "for production changes (e.g. review, QA, deploy).",
            status="PASSED" if has_schemes else "FAILED",
            severity="MEDIUM",
            check_category="change_management",
            result_details={
                "scheme_count": len(schemes),
                "sample": [s.get("name", "") for s in schemes[:20]] if isinstance(schemes, list) else [],
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Jira with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
