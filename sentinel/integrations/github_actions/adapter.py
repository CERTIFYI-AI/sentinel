# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""GitHub Actions integration adapter.

Reads CI/CD security posture from the GitHub REST API, scoped to
Actions specifically: how broadly organization Actions secrets are
shared, self-hosted runner exposure, and whether workflow changes on
default branches require review before merge.

This is a distinct catalogue entry from the generic ``github`` source
code adapter — it targets Actions surface area with its own credential
set, even though both reuse a GitHub PAT shape.

Auth: an organization-scoped GitHub Personal Access Token (Bearer),
with Actions read and repo-admin read scopes.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.github.com"


@dataclass
class GithubActionsCredentials:
    """Matches dashboard/src/integrations/github_actions/config.ts credentialFields."""

    org: str
    api_key: str


class GithubActionsAdapter:
    """Fetches CI/CD security posture from GitHub Actions."""

    def __init__(self, credentials: GithubActionsCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
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
            resp = await self._get(client, f"/orgs/{self.credentials.org}")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "GitHub rejected the personal access token. Verify it is "
                    "active and has read access to the organization."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach GitHub: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_secret_scope(client),
                self._check_self_hosted_runner_exposure(client),
                self._check_branch_protection(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("github_actions check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_secret_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, f"/orgs/{self.credentials.org}/actions/secrets", per_page=100)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "github_actions.secrets.scope",
                "Organization Actions secret scope",
                "secret_management",
                "Grant the token the 'admin:org' or organization Actions "
                "secrets read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        secrets = data.get("secrets", [])
        broad_secrets = [s for s in secrets if s.get("visibility") == "all"]
        passed = len(broad_secrets) == 0
        return [IntegrationFinding(
            check_id="github_actions.secrets.scope",
            title="Organization Actions secrets are not shared with every repository",
            description=(
                f"{len(broad_secrets)} of {len(secrets)} org-level Actions "
                "secret(s) are visible to all repositories."
            ),
            remediation=(
                "Scope organization secrets to selected repositories, or move "
                "them to environment-level secrets with required reviewers, "
                "instead of granting 'all repositories' visibility."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if broad_secrets else "INFO",
            check_category="secret_management",
            result_details={
                "org_secret_count": len(secrets),
                "broadly_visible_secret_names": [s.get("name") for s in broad_secrets][:25],
            },
        )]

    async def _check_self_hosted_runner_exposure(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, f"/orgs/{self.credentials.org}/actions/runners", per_page=100)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "github_actions.runners.self_hosted_exposure",
                "Self-hosted runner exposure",
                "network_security",
                "Grant the token the 'manage_runners:org' or Actions runners "
                "read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        runners = data.get("runners", [])
        default_group_runners = [r for r in runners if r.get("runner_group_id") in (1, None)]
        passed = len(default_group_runners) == 0
        return [IntegrationFinding(
            check_id="github_actions.runners.self_hosted_exposure",
            title="Self-hosted runners are not left in the unrestricted default group",
            description=(
                f"{len(default_group_runners)} of {len(runners)} self-hosted "
                "runner(s) are in the default runner group, reachable by any "
                "repository in the org."
            ),
            remediation=(
                "Move self-hosted runners into dedicated runner groups scoped "
                "to specific repositories, and restrict which workflows may "
                "target them via `runs-on` labels."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if default_group_runners else "INFO",
            check_category="network_security",
            result_details={
                "self_hosted_runner_count": len(runners),
                "runners_in_default_group": len(default_group_runners),
            },
        )]

    async def _check_branch_protection(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        repos_resp = await self._get(client, f"/orgs/{self.credentials.org}/repos", per_page=100, type="sources")
        if repos_resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "github_actions.workflows.branch_protection",
                "Required reviewers on workflow changes",
                "change_management",
                "Grant the token read access to organization repositories.",
            )]
        repos_resp.raise_for_status()
        repos = repos_resp.json()
        if not isinstance(repos, list) or not repos:
            return [self._unavailable(
                "github_actions.workflows.branch_protection",
                "Required reviewers on workflow changes",
                "change_management",
                "No repositories were found in the organization to check.",
            )]

        sample = repos[:20]
        unprotected: list[str] = []
        checked = 0
        for repo in sample:
            owner = repo.get("owner", {}).get("login", self.credentials.org)
            name = repo.get("name")
            default_branch = repo.get("default_branch", "main")
            protection_resp = await self._get(
                client, f"/repos/{owner}/{name}/branches/{default_branch}/protection"
            )
            if protection_resp.status_code == 404:
                unprotected.append(name)
                checked += 1
                continue
            if protection_resp.status_code in (401, 403):
                continue
            protection_resp.raise_for_status()
            checked += 1
            protection = protection_resp.json()
            reviews = protection.get("required_pull_request_reviews")
            if not reviews or not reviews.get("required_approving_review_count"):
                unprotected.append(name)

        if checked == 0:
            return [self._unavailable(
                "github_actions.workflows.branch_protection",
                "Required reviewers on workflow changes",
                "change_management",
                "Grant the token read access to branch protection settings.",
            )]

        passed = len(unprotected) == 0
        return [IntegrationFinding(
            check_id="github_actions.workflows.branch_protection",
            title="Default branches require review before merge",
            description=(
                f"{len(unprotected)} of {checked} sampled repository/repositories "
                "lack a required-approving-reviewer rule on their default branch, "
                "meaning workflow file changes can merge unreviewed."
            ),
            remediation=(
                "Enable branch protection with required pull request reviews "
                "on the default branch of every repository, especially where "
                "`.github/workflows/` is writable, to prevent unreviewed CI "
                "changes."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if unprotected else "INFO",
            check_category="change_management",
            result_details={
                "repositories_checked": checked,
                "repositories_without_required_review": unprotected,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from GitHub Actions with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
