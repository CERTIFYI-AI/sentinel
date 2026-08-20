# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""GitLab Cloud (gitlab.com) integration adapter.

Auth: a Personal Access Token with ``read_api`` scope. The token must belong to
a user who is a member of the groups and projects that the checks inspect.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+----------------------------------------------+-----------------------+----------------------------------------------+
| check_id                                     | check_category        | Controls mapped                              |
+----------------------------------------------+-----------------------+----------------------------------------------+
| gitlab_cloud.projects.inventory              | change_management     | SOC2 CC8.1 . ISO27001 A.12.1.2               |
| gitlab_cloud.projects.branch_protection      | change_management     | SOC2 CC8.1 . ISO27001 A.12.1.2 . PCI 6.4     |
| gitlab_cloud.groups.two_factor               | mfa_enforcement       | SOC2 CC6.1/CC6.6 . ISO27001 A.9.4.2 . PCI 8.3|
+----------------------------------------------+-----------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.gitlab import GitLabClient, GitLabCredentials

logger = logging.getLogger(__name__)

_SAMPLE_SIZE = 25


@dataclass
class GitLabCloudCredentials(GitLabCredentials):
    """Matches dashboard/src/integrations/gitlab_cloud/config.ts credentialFields."""

    base_url: str = "https://gitlab.com"


class GitLabCloudAdapter:
    """Fetches project and group security posture from GitLab Cloud.

    No database access; the worker persists returned findings.
    """

    def __init__(
        self,
        credentials: GitLabCloudCredentials,
        client: GitLabClient | None = None,
    ) -> None:
        self.credentials = credentials
        self.gl = client if isinstance(client, GitLabClient) else GitLabClient(credentials, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.gl.get("/user")
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"GitLab rejected the token (HTTP {resp.status_code}). "
                    "Check that the Personal Access Token is valid and has "
                    "the read_api scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach GitLab: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_projects_inventory(),
            self._check_branch_protection(),
            self._check_groups_two_factor(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("gitlab_cloud check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_projects_inventory(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/projects", membership="true", per_page="100")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_cloud.projects.inventory",
                "Project inventory collected",
                "change_management",
                "Grant the token read_api scope.",
            )]
        resp.raise_for_status()
        projects = resp.json()
        count = len(projects) if isinstance(projects, list) else 0
        return [IntegrationFinding(
            check_id="gitlab_cloud.projects.inventory",
            title=f"{count} project(s) visible to the connected token",
            description=(
                f"The token has membership access to {count} project(s) on "
                "GitLab Cloud."
            ),
            remediation="No action required; this is an inventory check.",
            status="PASSED",
            severity="LOW",
            check_category="change_management",
            result_details={"project_count": count},
        )]

    async def _check_branch_protection(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/projects", membership="true", per_page="100")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_cloud.projects.branch_protection",
                "Default branches are protected",
                "change_management",
                "Grant the token read_api scope.",
            )]
        resp.raise_for_status()
        projects = resp.json()
        if not isinstance(projects, list):
            projects = []

        sample = projects[:_SAMPLE_SIZE]
        unprotected: list[str] = []
        for project in sample:
            pid = project.get("id")
            default_branch = project.get("default_branch")
            if not default_branch:
                continue
            bp_resp = await self.gl.get(f"/projects/{pid}/protected_branches")
            if bp_resp.status_code in (401, 403):
                continue
            if bp_resp.status_code != 200:
                continue
            protected = bp_resp.json()
            if not isinstance(protected, list):
                continue
            names = [b.get("name") for b in protected]
            if default_branch not in names:
                unprotected.append(project.get("path_with_namespace", str(pid)))

        passed = not unprotected
        return [IntegrationFinding(
            check_id="gitlab_cloud.projects.branch_protection",
            title=(
                "All sampled default branches are protected"
                if passed
                else f"{len(unprotected)} project(s) have unprotected default branch"
            ),
            description=(
                f"Checked {len(sample)} project(s); "
                + (
                    "all default branches are protected."
                    if passed
                    else f"{len(unprotected)} have an unprotected default branch: "
                    + ", ".join(unprotected[:20])
                )
            ),
            remediation=(
                "Settings > Repository > Protected Branches: protect the "
                "default branch with at minimum no force-push and required "
                "merge request approvals."
            ),
            status="PASSED" if passed else "FAILED",
            severity="INFO" if passed else "HIGH",
            check_category="change_management",
            result_details={
                "projects_sampled": len(sample),
                "unprotected_projects": unprotected,
            },
        )]

    async def _check_groups_two_factor(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/groups", per_page="100")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_cloud.groups.two_factor",
                "Groups require two-factor authentication",
                "mfa_enforcement",
                "Grant the token read_api scope.",
            )]
        resp.raise_for_status()
        groups = resp.json()
        if not isinstance(groups, list):
            groups = []

        no_2fa: list[str] = []
        for group in groups:
            if not group.get("require_two_factor_authentication", False):
                no_2fa.append(group.get("full_path", str(group.get("id", ""))))

        passed = not no_2fa
        return [IntegrationFinding(
            check_id="gitlab_cloud.groups.two_factor",
            title=(
                "All groups require two-factor authentication"
                if passed
                else f"{len(no_2fa)} group(s) do not require 2FA"
            ),
            description=(
                f"Checked {len(groups)} group(s); "
                + (
                    "all require two-factor authentication."
                    if passed
                    else f"{len(no_2fa)} do not require 2FA: "
                    + ", ".join(no_2fa[:20])
                )
            ),
            remediation=(
                "Group Settings > General > Permissions and group features > "
                "Require all users in this group to set up two-factor authentication."
            ),
            status="PASSED" if passed else "FAILED",
            severity="INFO" if passed else "HIGH",
            check_category="mfa_enforcement",
            result_details={
                "groups_checked": len(groups),
                "groups_without_2fa": no_2fa,
            },
        )]

    @staticmethod
    def _unavailable(
        check_id: str, title: str, category: str, remediation: str,
    ) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from GitLab with the token provided.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
