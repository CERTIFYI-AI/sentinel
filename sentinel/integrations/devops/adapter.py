# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Azure DevOps integration adapter.

Azure DevOps uses its own REST API (dev.azure.com) rather than Microsoft Graph.
Credentials are a PAT (Personal Access Token) scoped to the organisation.

Required PAT scopes (read-only):
  Project & Team   (read)   project inventory
  Build            (read)   pipeline definitions
  Code             (read)   branch-policy inspection
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_DEVOPS_BASE = "https://dev.azure.com"


@dataclass
class AzureDevOpsCredentials:
    """PAT-based authentication for Azure DevOps."""

    organization: str = ""
    personal_access_token: str = ""


class AzureDevOpsAdapter:
    """Checks Azure DevOps project and pipeline governance."""

    def __init__(self, credentials: AzureDevOpsCredentials, client=None) -> None:
        self.credentials = credentials
        self.org = credentials.organization
        self._client = client

    def _http(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(
            base_url=f"{_DEVOPS_BASE}/{self.org}",
            auth=("", self.credentials.personal_access_token),
            timeout=30,
        )

    async def _get(self, path: str, **params) -> httpx.Response:
        params.setdefault("api-version", "7.1")
        client = self._http()
        try:
            return await client.get(path, params=params)
        finally:
            if self._client is None:
                await client.aclose()

    async def validate(self) -> bool:
        try:
            resp = await self._get("/_apis/projects", **{"$top": "1"})
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Azure DevOps refused /_apis/projects (HTTP {resp.status_code}). "
                    "Check the PAT has 'Project & Team (read)' scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Azure DevOps: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_project_inventory(),
            self._check_pipeline_inventory(),
            self._check_branch_policies(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("devops check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_project_inventory(self) -> list[IntegrationFinding]:
        resp = await self._get("/_apis/projects")
        if resp.status_code == 403:
            return [self._unavailable(
                "devops.inventory.project_count",
                "Azure DevOps projects are inventoried",
                "change_management",
                "Grant the PAT 'Project & Team (read)' scope.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "devops.inventory.project_count",
                "Azure DevOps projects are inventoried",
                "change_management",
                "The projects endpoint returned an error.",
            )]
        projects = resp.json().get("value", [])
        return [IntegrationFinding(
            check_id="devops.inventory.project_count",
            title="Azure DevOps projects are inventoried",
            description=f"{len(projects)} project(s) in the organisation.",
            remediation="No action required — this is an inventory check.",
            status="PASSED",
            severity="INFO",
            check_category="change_management",
            result_details={
                "project_count": len(projects),
                "sample": [p.get("name", "") for p in projects][:20],
            },
        )]

    async def _check_pipeline_inventory(self) -> list[IntegrationFinding]:
        resp = await self._get("/_apis/projects")
        if resp.status_code == 403:
            return [self._unavailable(
                "devops.pipelines.pipeline_count",
                "Build pipelines are inventoried",
                "change_management",
                "Grant the PAT 'Build (read)' scope.",
            )]
        projects = resp.json().get("value", [])
        total_pipelines = 0
        for proj in projects[:50]:
            pid = proj.get("id", "")
            pr = await self._get(f"/{pid}/_apis/build/definitions")
            if pr.status_code == 200:
                total_pipelines += pr.json().get("count", 0)
        return [IntegrationFinding(
            check_id="devops.pipelines.pipeline_count",
            title="Build pipelines are inventoried",
            description=(
                f"{total_pipelines} build pipeline(s) across "
                f"{len(projects)} project(s)."
            ),
            remediation="No action required — this is an inventory check.",
            status="PASSED",
            severity="INFO",
            check_category="change_management",
            result_details={
                "pipeline_count": total_pipelines,
                "project_count": len(projects),
            },
        )]

    async def _check_branch_policies(self) -> list[IntegrationFinding]:
        resp = await self._get("/_apis/projects")
        if resp.status_code == 403:
            return [self._unavailable(
                "devops.repos.branch_policies",
                "Default branches have protection policies",
                "change_management",
                "Grant the PAT 'Code (read)' scope.",
            )]
        projects = resp.json().get("value", [])
        projects_with_policy = 0
        projects_checked = 0
        for proj in projects[:50]:
            pid = proj.get("id", "")
            pr = await self._get(f"/{pid}/_apis/policy/configurations")
            if pr.status_code == 200:
                projects_checked += 1
                configs = pr.json().get("value", [])
                if configs:
                    projects_with_policy += 1
        unprotected = projects_checked - projects_with_policy
        return [IntegrationFinding(
            check_id="devops.repos.branch_policies",
            title="Default branches have protection policies",
            description=(
                f"{projects_with_policy} of {projects_checked} project(s) "
                f"have at least one branch policy configured."
            ),
            remediation=(
                "Configure branch policies (minimum reviewers, build validation, "
                "comment resolution) on the default branch of each repository."
            ),
            status="PASSED" if not unprotected else "WARNING",
            severity="MEDIUM" if unprotected else "INFO",
            check_category="change_management",
            result_details={
                "projects_with_policy": projects_with_policy,
                "projects_checked": projects_checked,
                "unprotected_count": unprotected,
            },
        )]

    @staticmethod
    def _unavailable(check_id, title, category, remediation) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Azure DevOps with the credentials provided.",
            remediation=remediation, status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
