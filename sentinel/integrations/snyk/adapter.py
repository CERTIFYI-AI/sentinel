# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Snyk integration adapter.

Reads developer security posture from the Snyk REST API: open
vulnerability count, license compliance, and project monitoring
status for vulnerability management and change management evidence.

Auth: an API token (Authorization: token <key>) scoped to an
organization ID.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.snyk.io/rest"


@dataclass
class SnykCredentials:
    """Matches dashboard/src/integrations/snyk/config.ts credentialFields."""

    api_token: str
    org_id: str


class SnykAdapter:
    """Fetches developer security posture from Snyk."""

    def __init__(self, credentials: SnykCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"token {self.credentials.api_token}",
            "Accept": "application/vnd.api+json",
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
            resp = await self._get(
                client,
                f"/orgs/{self.credentials.org_id}/projects",
                version="2024-06-21",
                limit="1",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Snyk rejected the API token for org "
                    f"{self.credentials.org_id!r} "
                    f"(HTTP {resp.status_code}). Verify the token and "
                    "organization ID."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Snyk: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_open_vulns(client),
                self._check_license_compliance(client),
                self._check_project_monitoring(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("snyk check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_open_vulns(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_id = self.credentials.org_id
        resp = await self._get(
            client,
            f"/orgs/{org_id}/issues",
            version="2024-06-21",
            type="package_vulnerability",
            limit="100",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "snyk.issues.open_vulns", "Open vulnerability count",
                "vulnerability_management",
                "The API token cannot read issues. Verify token permissions "
                "and organization ID.",
            )]
        resp.raise_for_status()
        data = resp.json()
        issues = data.get("data", [])
        critical = [
            i for i in issues
            if i.get("attributes", {}).get("effective_severity_level") == "critical"
        ]
        high = [
            i for i in issues
            if i.get("attributes", {}).get("effective_severity_level") == "high"
        ]
        return [IntegrationFinding(
            check_id="snyk.issues.open_vulns",
            title="Open vulnerability count reviewed",
            description=(
                f"{len(issues)} open vulnerability issue(s): "
                f"{len(critical)} critical, {len(high)} high."
            ),
            remediation=(
                "Prioritise critical and high vulnerabilities. Use Snyk Fix "
                "PRs or upgrade to patched versions."
            ),
            status="PASSED" if not critical else "FAILED",
            severity="CRITICAL" if critical else ("HIGH" if high else "INFO"),
            check_category="vulnerability_management",
            result_details={
                "total_issues": len(issues),
                "critical_count": len(critical),
                "high_count": len(high),
            },
        )]

    async def _check_license_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_id = self.credentials.org_id
        resp = await self._get(
            client,
            f"/orgs/{org_id}/issues",
            version="2024-06-21",
            type="license",
            limit="100",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "snyk.issues.license_compliance", "License compliance",
                "change_management",
                "The API token cannot read license issues. Verify token "
                "permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        issues = data.get("data", [])
        high_severity = [
            i for i in issues
            if i.get("attributes", {}).get("effective_severity_level") in ("critical", "high")
        ]
        return [IntegrationFinding(
            check_id="snyk.issues.license_compliance",
            title="License compliance reviewed",
            description=(
                f"{len(issues)} license issue(s) found; "
                f"{len(high_severity)} at high or critical severity."
            ),
            remediation=(
                "Review license issues and replace dependencies with "
                "incompatible licenses."
            ),
            status="PASSED" if not high_severity else "WARNING",
            severity="HIGH" if high_severity else "INFO",
            check_category="change_management",
            result_details={
                "total_license_issues": len(issues),
                "high_severity_count": len(high_severity),
            },
        )]

    async def _check_project_monitoring(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_id = self.credentials.org_id
        resp = await self._get(
            client,
            f"/orgs/{org_id}/projects",
            version="2024-06-21",
            limit="100",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "snyk.projects.monitoring", "Project monitoring status",
                "change_management",
                "The API token cannot read projects. Verify token permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        projects = data.get("data", [])
        total = len(projects)
        active = [
            p for p in projects
            if p.get("attributes", {}).get("status") == "active"
        ]
        return [IntegrationFinding(
            check_id="snyk.projects.monitoring",
            title="Project monitoring status reviewed",
            description=(
                f"{len(active)} of {total} project(s) are actively monitored."
            ),
            remediation=(
                "Enable monitoring on all projects so dependency "
                "vulnerabilities are detected continuously."
            ),
            status="PASSED" if len(active) == total and total > 0 else "WARNING",
            severity="MEDIUM" if len(active) < total else "INFO",
            check_category="change_management",
            result_details={
                "total_projects": total,
                "active_projects": len(active),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Snyk with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
