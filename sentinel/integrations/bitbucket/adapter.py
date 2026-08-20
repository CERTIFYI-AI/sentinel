# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Bitbucket Cloud integration adapter.

Standalone adapter (does NOT use the shared Atlassian client) because Bitbucket
Cloud uses its own API host (``api.bitbucket.org``) and workspace-scoped app
passwords rather than site-scoped API tokens.

Auth: HTTP Basic with username + app password.  The app password needs:

  Repositories:Read         repository listing, pipeline config
  Repositories:Admin        branch restriction listing

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                             | check_category            | Controls mapped                              |
+------------------------------------------------------+---------------------------+----------------------------------------------+
| bitbucket.repos.inventory                            | change_management         | SOC2 CC8.1 * ISO27001 A.12.1.2 * PCI 6.4    |
| bitbucket.pipelines.enabled                          | change_management         | SOC2 CC8.1 * ISO27001 A.12.1.4 * PCI 6.4    |
| bitbucket.branch_restrictions.main_protection        | change_management         | SOC2 CC8.1 * ISO27001 A.12.1.2 * PCI 6.4    |
+------------------------------------------------------+---------------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_API_BASE = "https://api.bitbucket.org"
_MAX_PAGES = 20


@dataclass
class BitbucketCredentials:
    """Bitbucket Cloud app password credentials.

    Standalone -- not an AtlassianCredentials subclass because Bitbucket uses
    a different API host and auth scheme (username + app password).
    """

    username: str = ""
    app_password: str = ""
    workspace: str = ""


class BitbucketAdapter:
    """Fetches repository and pipeline posture from Bitbucket Cloud.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: BitbucketCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        return self._client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(self.credentials.username, self.credentials.app_password)

    async def _get(self, path: str, **params) -> httpx.Response:
        url = path if path.startswith("http") else f"{_API_BASE}{path}"
        return await self._http().get(
            url,
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _get_paged(self, path: str, **params) -> tuple[list[dict], bool]:
        """Follow Bitbucket's ``next`` link paging.

        Returns (items, truncated).
        """
        items: list[dict] = []
        url: str | None = path
        query: dict | None = params or None
        for _ in range(_MAX_PAGES):
            resp = await self._get(url, **(query or {}))
            resp.raise_for_status()
            payload = resp.json()
            items.extend(payload.get("values", []))
            url = payload.get("next")
            query = None
            if not url:
                return items, False
        return items, True

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self._get("/2.0/user")
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Bitbucket rejected the credentials (HTTP {resp.status_code}). "
                    "Check the username and app password."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Bitbucket: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_repos_inventory(),
            self._check_pipelines_enabled(),
            self._check_branch_restrictions(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("bitbucket check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _get_repos(self) -> list[dict] | None:
        resp = await self._get(
            f"/2.0/repositories/{self.credentials.workspace}",
        )
        if resp.status_code in (401, 403):
            return None
        resp.raise_for_status()
        payload = resp.json()
        repos = payload.get("values", [])
        next_url = payload.get("next")
        if next_url:
            more, _ = await self._get_paged(next_url)
            repos.extend(more)
        return repos

    async def _check_repos_inventory(self) -> list[IntegrationFinding]:
        repos = await self._get_repos()
        if repos is None:
            return [self._unavailable(
                "bitbucket.repos.inventory",
                "Bitbucket repository inventory",
                "change_management",
                "Grant Repositories:Read permission to the app password.",
            )]
        count = len(repos)
        return [IntegrationFinding(
            check_id="bitbucket.repos.inventory",
            title=f"{count} Bitbucket repository/repositories discovered",
            description=(
                f"The workspace {self.credentials.workspace!r} has "
                f"{count} repository/repositories."
            ),
            remediation="Review repositories periodically to archive stale ones "
                        "and ensure each has pipeline and branch protection "
                        "configured.",
            status="PASSED",
            severity="LOW",
            check_category="change_management",
            result_details={
                "repo_count": count,
                "workspace": self.credentials.workspace,
                "sample": [r.get("full_name", "") for r in repos[:20]],
            },
        )]

    async def _check_pipelines_enabled(self) -> list[IntegrationFinding]:
        repos = await self._get_repos()
        if repos is None:
            return [self._unavailable(
                "bitbucket.pipelines.enabled",
                "Bitbucket Pipelines are enabled",
                "change_management",
                "Grant Repositories:Read permission to the app password.",
            )]
        if not repos:
            return [IntegrationFinding(
                check_id="bitbucket.pipelines.enabled",
                title="Bitbucket Pipelines are enabled",
                description="No repositories found in the workspace.",
                remediation="Create repositories and enable Bitbucket Pipelines "
                            "for CI/CD.",
                status="NOT_AVAILABLE",
                severity="HIGH",
                check_category="change_management",
                result_details={"repo_count": 0},
            )]
        enabled_repos: list[str] = []
        disabled_repos: list[str] = []
        for repo in repos:
            slug = repo.get("slug", "")
            full_name = repo.get("full_name", slug)
            resp = await self._get(
                f"/2.0/repositories/{self.credentials.workspace}/{slug}/pipelines_config",
            )
            if resp.status_code in (401, 403):
                continue
            if resp.status_code == 404:
                disabled_repos.append(full_name)
                continue
            if resp.status_code >= 400:
                continue
            config = resp.json()
            if config.get("enabled", False):
                enabled_repos.append(full_name)
            else:
                disabled_repos.append(full_name)
        all_enabled = len(disabled_repos) == 0 and len(enabled_repos) > 0
        return [IntegrationFinding(
            check_id="bitbucket.pipelines.enabled",
            title=(f"Pipelines enabled on {len(enabled_repos)} of {len(repos)} "
                   "repositories"),
            description=(
                f"{len(enabled_repos)} of {len(repos)} repository/repositories "
                "have Bitbucket Pipelines enabled for CI/CD."
                + (f" {len(disabled_repos)} repository/repositories do not have "
                   "pipelines enabled."
                   if disabled_repos else "")
            ),
            remediation="Enable Bitbucket Pipelines on each repository and "
                        "configure a bitbucket-pipelines.yml with build, test "
                        "and deployment steps.",
            status="PASSED" if all_enabled else "FAILED",
            severity="HIGH",
            check_category="change_management",
            result_details={
                "enabled_repos": enabled_repos[:20],
                "disabled_repos": disabled_repos[:20],
                "total_repos": len(repos),
            },
        )]

    async def _check_branch_restrictions(self) -> list[IntegrationFinding]:
        repos = await self._get_repos()
        if repos is None:
            return [self._unavailable(
                "bitbucket.branch_restrictions.main_protection",
                "Main branch is protected",
                "change_management",
                "Grant Repositories:Admin permission to the app password.",
            )]
        if not repos:
            return [IntegrationFinding(
                check_id="bitbucket.branch_restrictions.main_protection",
                title="Main branch is protected",
                description="No repositories found in the workspace.",
                remediation="Create repositories and configure branch restrictions.",
                status="NOT_AVAILABLE",
                severity="HIGH",
                check_category="change_management",
                result_details={"repo_count": 0},
            )]
        protected: list[str] = []
        unprotected: list[str] = []
        for repo in repos:
            slug = repo.get("slug", "")
            full_name = repo.get("full_name", slug)
            main_branch = repo.get("mainbranch", {}).get("name", "main")
            resp = await self._get(
                f"/2.0/repositories/{self.credentials.workspace}/{slug}/branch-restrictions",
            )
            if resp.status_code in (401, 403):
                continue
            if resp.status_code >= 400:
                unprotected.append(full_name)
                continue
            restrictions = resp.json().get("values", [])
            has_main_restriction = any(
                r.get("branch_match_kind") == "branching_model"
                or main_branch in (r.get("pattern", ""), r.get("branch", ""))
                or r.get("branch_type", "") == "main"
                for r in restrictions
            )
            if has_main_restriction or len(restrictions) > 0:
                protected.append(full_name)
            else:
                unprotected.append(full_name)
        all_protected = len(unprotected) == 0 and len(protected) > 0
        return [IntegrationFinding(
            check_id="bitbucket.branch_restrictions.main_protection",
            title=(f"{len(unprotected)} repository/repositories without main "
                   "branch protection"
                   if unprotected
                   else "All repositories have branch restrictions"),
            description=(
                f"{len(protected)} of {len(repos)} repository/repositories have "
                "branch restrictions configured."
                + (f" {len(unprotected)} repository/repositories have no branch "
                   "restrictions on the main branch."
                   if unprotected else "")
            ),
            remediation="Add branch restrictions to the main branch: require "
                        "pull requests, minimum reviewers, and passing builds "
                        "before merging.",
            status="PASSED" if all_protected else "FAILED",
            severity="HIGH",
            check_category="change_management",
            result_details={
                "protected_repos": protected[:20],
                "unprotected_repos": unprotected[:20],
                "total_repos": len(repos),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Bitbucket with the "
                        "permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
