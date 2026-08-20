# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""SonarQube integration adapter.

Reads code quality and security posture from the SonarQube Web API:
quality gate status, security hotspots, and code coverage compliance
for vulnerability management and change management evidence.

Auth: a user token or global analysis token with Browse permission.
The instance URL may be a self-hosted server or SonarCloud.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class SonarQubeCredentials:
    """Matches dashboard/src/integrations/sonarqube/config.ts credentialFields."""

    instance_url: str
    api_token: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")


class SonarQubeAdapter:
    """Fetches code quality posture from SonarQube."""

    def __init__(self, credentials: SonarQubeCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        import base64
        encoded = base64.b64encode(
            f"{self.credentials.api_token}:".encode()
        ).decode()
        return {
            "Authorization": f"Basic {encoded}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/system/status")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "SonarQube rejected the token for "
                    f"{self.credentials.instance_url!r} "
                    f"(HTTP {resp.status_code}). Verify the token is valid."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach SonarQube: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_quality_gate(client),
                self._check_security_hotspots(client),
                self._check_code_coverage(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("sonarqube check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_quality_gate(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/projects/search", ps="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sonarqube.projects.quality_gate",
                "Quality gate status",
                "change_management",
                "The token cannot browse projects. Grant Browse permission.",
            )]
        resp.raise_for_status()
        data = resp.json()
        projects = data.get("components", [])
        total = len(projects)

        failing: list[str] = []
        for proj in projects:
            key = proj.get("key", "")
            gate_resp = await self._get(
                client, "/qualitygates/project_status", projectKey=key,
            )
            if gate_resp.status_code == 200:
                status = (
                    gate_resp.json()
                    .get("projectStatus", {})
                    .get("status", "")
                )
                if status == "ERROR":
                    failing.append(key)

        return [IntegrationFinding(
            check_id="sonarqube.projects.quality_gate",
            title="Quality gates are passing",
            description=(
                f"{len(failing)} of {total} project(s) have a failing quality gate."
            ),
            remediation=(
                "Fix issues in failing projects so the quality gate passes "
                "before code is merged."
            ),
            status="PASSED" if not failing else "WARNING",
            severity="HIGH" if failing else "INFO",
            check_category="change_management",
            result_details={
                "total_projects": total,
                "failing_projects": len(failing),
                "failing_sample": failing[:20],
            },
        )]

    async def _check_security_hotspots(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client,
            "/hotspots/search",
            status="TO_REVIEW",
            ps="1",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sonarqube.issues.security_hotspots",
                "Security hotspots",
                "vulnerability_management",
                "The token cannot search hotspots. Grant Browse permission.",
            )]
        resp.raise_for_status()
        data = resp.json()
        hotspots = data.get("paging", {}).get("total", 0)

        vuln_resp = await self._get(
            client,
            "/issues/search",
            types="VULNERABILITY",
            statuses="OPEN,CONFIRMED,REOPENED",
            ps="1",
        )
        vulns = 0
        if vuln_resp.status_code == 200:
            vulns = vuln_resp.json().get("total", 0)

        return [IntegrationFinding(
            check_id="sonarqube.issues.security_hotspots",
            title="Security hotspots and vulnerabilities",
            description=(
                f"{hotspots} security hotspot(s) awaiting review and "
                f"{vulns} open vulnerability issue(s)."
            ),
            remediation=(
                "Review security hotspots and triage open vulnerabilities. "
                "Mark reviewed hotspots as safe or fix them."
            ),
            status="PASSED" if hotspots == 0 and vulns == 0 else "WARNING",
            severity="HIGH" if vulns > 0 else ("MEDIUM" if hotspots > 0 else "INFO"),
            check_category="vulnerability_management",
            result_details={
                "hotspots_to_review": hotspots,
                "open_vulnerabilities": vulns,
            },
        )]

    async def _check_code_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/projects/search", ps="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sonarqube.projects.code_coverage",
                "Code coverage compliance",
                "change_management",
                "The token cannot browse projects. Grant Browse permission.",
            )]
        resp.raise_for_status()
        data = resp.json()
        projects = data.get("components", [])
        total = len(projects)

        below_threshold: list[str] = []
        no_coverage: list[str] = []
        for proj in projects:
            key = proj.get("key", "")
            measure_resp = await self._get(
                client, "/measures/component",
                component=key, metricKeys="coverage",
            )
            if measure_resp.status_code == 200:
                measures = (
                    measure_resp.json()
                    .get("component", {})
                    .get("measures", [])
                )
                if not measures:
                    no_coverage.append(key)
                else:
                    value = float(measures[0].get("value", "0"))
                    if value < 80.0:
                        below_threshold.append(key)

        return [IntegrationFinding(
            check_id="sonarqube.projects.code_coverage",
            title="Code coverage compliance reviewed",
            description=(
                f"{total} project(s) checked: {len(below_threshold)} below "
                f"80% coverage, {len(no_coverage)} with no coverage data."
            ),
            remediation=(
                "Increase test coverage to at least 80% on all projects "
                "and configure coverage reporting for projects missing data."
            ),
            status="PASSED" if not below_threshold and not no_coverage else "WARNING",
            severity="MEDIUM" if below_threshold or no_coverage else "INFO",
            check_category="change_management",
            result_details={
                "total_projects": total,
                "below_threshold": len(below_threshold),
                "no_coverage_data": len(no_coverage),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from SonarQube with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
