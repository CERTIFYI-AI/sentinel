# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""GitLab CI/CD integration adapter.

Auth: a Personal Access Token with ``read_api`` scope.  Admin-level tokens are
needed for the ``/runners/all`` and ``/admin/ci/variables`` endpoints; when the
token lacks admin access those checks degrade to NOT_AVAILABLE.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+----------------------------------------------+-----------------------+----------------------------------------------+
| check_id                                     | check_category        | Controls mapped                              |
+----------------------------------------------+-----------------------+----------------------------------------------+
| gitlab_cicd.runners.inventory                | change_management     | SOC2 CC8.1 . ISO27001 A.12.1.2               |
| gitlab_cicd.runners.untagged                 | change_management     | SOC2 CC8.1 . ISO27001 A.12.1.2 . PCI 6.4     |
| gitlab_cicd.variables.masked                 | secret_management     | SOC2 CC6.1 . ISO27001 A.9.2.4 . PCI 8.2      |
+----------------------------------------------+-----------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.gitlab import GitLabClient, GitLabCredentials

logger = logging.getLogger(__name__)


@dataclass
class GitLabCiCdCredentials(GitLabCredentials):
    """Matches dashboard/src/integrations/gitlab_cicd/config.ts credentialFields."""


class GitLabCiCdAdapter:
    """Fetches CI/CD runner and variable posture from GitLab.

    No database access; the worker persists returned findings.
    """

    def __init__(
        self,
        credentials: GitLabCiCdCredentials,
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
            self._check_runners_inventory(),
            self._check_runners_untagged(),
            self._check_variables_masked(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("gitlab_cicd check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_runners_inventory(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/runners/all", per_page="100")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_cicd.runners.inventory",
                "Runner inventory collected",
                "change_management",
                "Grant the token admin-level access to list all runners "
                "(GET /runners/all requires admin scope).",
            )]
        resp.raise_for_status()
        runners = resp.json()
        count = len(runners) if isinstance(runners, list) else 0
        online = sum(
            1 for r in (runners if isinstance(runners, list) else [])
            if r.get("status") == "online"
        )
        return [IntegrationFinding(
            check_id="gitlab_cicd.runners.inventory",
            title=f"{count} runner(s) registered ({online} online)",
            description=(
                f"The instance has {count} registered runner(s), of which "
                f"{online} are currently online."
            ),
            remediation="No action required; this is an inventory check.",
            status="PASSED",
            severity="LOW",
            check_category="change_management",
            result_details={
                "runner_count": count,
                "online_count": online,
            },
        )]

    async def _check_runners_untagged(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/runners/all", per_page="100")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_cicd.runners.untagged",
                "No untagged runners accepting arbitrary jobs",
                "change_management",
                "Grant the token admin-level access to list all runners.",
            )]
        resp.raise_for_status()
        runners = resp.json()
        if not isinstance(runners, list):
            runners = []

        untagged: list[str] = []
        for runner in runners:
            tags = runner.get("tag_list", [])
            if not tags and runner.get("run_untagged", True):
                untagged.append(runner.get("description", str(runner.get("id", ""))))

        passed = not untagged
        return [IntegrationFinding(
            check_id="gitlab_cicd.runners.untagged",
            title=(
                "No untagged runners accepting arbitrary jobs"
                if passed
                else f"{len(untagged)} runner(s) accept untagged jobs"
            ),
            description=(
                "All runners are tagged and constrained to specific job types."
                if passed
                else f"{len(untagged)} runner(s) have no tags and accept untagged "
                "jobs, meaning any project job without tags can execute on them. "
                "Runners: " + ", ".join(untagged[:20])
            ),
            remediation=(
                "Assign tags to each runner and disable 'Run untagged jobs' so "
                "runners only execute jobs explicitly targeting them."
            ),
            status="PASSED" if passed else "FAILED",
            severity="INFO" if passed else "MEDIUM",
            check_category="change_management",
            result_details={
                "total_runners": len(runners),
                "untagged_runners": untagged,
            },
        )]

    async def _check_variables_masked(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/admin/ci/variables")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_cicd.variables.masked",
                "Instance-level CI/CD variables are masked",
                "secret_management",
                "Grant the token admin-level access to read instance CI/CD "
                "variables (GET /admin/ci/variables requires admin scope).",
            )]
        resp.raise_for_status()
        variables = resp.json()
        if not isinstance(variables, list):
            variables = []

        unmasked: list[str] = []
        for var in variables:
            if not var.get("masked", False):
                unmasked.append(var.get("key", ""))

        passed = not unmasked
        return [IntegrationFinding(
            check_id="gitlab_cicd.variables.masked",
            title=(
                "All instance-level CI/CD variables are masked"
                if passed
                else f"{len(unmasked)} instance variable(s) are not masked"
            ),
            description=(
                "Every instance-level CI/CD variable is masked, preventing "
                "accidental exposure in job logs."
                if passed
                else f"{len(unmasked)} variable(s) are not masked and could be "
                "printed in job logs: " + ", ".join(unmasked[:20])
            ),
            remediation=(
                "Admin Area > Settings > CI/CD > Variables: edit each "
                "unmasked variable and enable the 'Mask variable' option. "
                "If the value does not meet masking requirements, rotate "
                "the secret to a compliant value."
            ),
            status="PASSED" if passed else "FAILED",
            severity="INFO" if passed else "HIGH",
            check_category="secret_management",
            result_details={
                "total_variables": len(variables),
                "unmasked_variables": unmasked,
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
