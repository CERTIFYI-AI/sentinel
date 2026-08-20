# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Checkmarx integration adapter.

Reads SAST/DAST findings from Checkmarx One: scan results, vulnerability
counts, and project configuration for change-management evidence.
Auth: a single API key (bearer token) from Checkmarx One Settings.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://ast.checkmarx.net/api"


@dataclass
class CheckmarxCredentials:
    """Matches dashboard/src/integrations/checkmarx/config.ts credentialFields."""

    api_key: str


class CheckmarxAdapter:
    """Fetches SAST/DAST findings from Checkmarx One."""

    def __init__(self, credentials: CheckmarxCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/projects", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Checkmarx rejected the API key. Verify the key is active "
                    "and has read permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Checkmarx: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_high_severity_results(client),
                self._check_scan_coverage(client),
                self._check_recent_scans(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("checkmarx check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_high_severity_results(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/results", severity="HIGH,CRITICAL", limit=100, state="TO_VERIFY,CONFIRMED")
        if resp.status_code == 403:
            return [self._unavailable(
                "checkmarx.results.high_severity",
                "High/critical SAST/DAST findings",
                "vulnerability_management",
                "Grant the API key read access to scan results.",
            )]
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", data) if isinstance(data, dict) else data
        if not isinstance(results, list):
            results = []
        total_count = data.get("totalCount", len(results)) if isinstance(data, dict) else len(results)
        passed = total_count == 0
        return [IntegrationFinding(
            check_id="checkmarx.results.high_severity",
            title="No unresolved high/critical SAST/DAST findings",
            description=(
                f"{total_count} high or critical finding(s) in TO_VERIFY or CONFIRMED state."
            ),
            remediation=(
                "Triage and remediate high/critical findings. Mark false "
                "positives as NOT_EXPLOITABLE after review."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={"high_critical_count": total_count},
        )]

    async def _check_scan_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/projects", limit=100)
        if resp.status_code == 403:
            return [self._unavailable(
                "checkmarx.projects.scan_coverage",
                "Project scan coverage",
                "vulnerability_management",
                "Grant the API key read access to projects.",
            )]
        resp.raise_for_status()
        data = resp.json()
        projects = data.get("projects", data) if isinstance(data, dict) else data
        if not isinstance(projects, list):
            projects = []
        unscanned = [p for p in projects if not p.get("lastScanId")]
        passed = len(unscanned) == 0 and len(projects) > 0
        return [IntegrationFinding(
            check_id="checkmarx.projects.scan_coverage",
            title="All projects have been scanned",
            description=(
                f"{len(unscanned)} of {len(projects)} project(s) have never been scanned."
            ),
            remediation=(
                "Configure CI/CD pipelines to trigger Checkmarx scans on every "
                "commit or pull request."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "total_projects": len(projects),
                "unscanned_projects": len(unscanned),
            },
        )]

    async def _check_recent_scans(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/scans", limit=10, sort="-created_at")
        if resp.status_code == 403:
            return [self._unavailable(
                "checkmarx.scans.recent_activity",
                "Recent scan activity",
                "change_management",
                "Grant the API key read access to scans.",
            )]
        resp.raise_for_status()
        data = resp.json()
        scans = data.get("scans", data) if isinstance(data, dict) else data
        if not isinstance(scans, list):
            scans = []
        return [IntegrationFinding(
            check_id="checkmarx.scans.recent_activity",
            title="Scan activity is being recorded",
            description=(
                f"Retrieved {len(scans)} recent scan(s). Change management "
                "evidence is available."
            ),
            remediation="No action required.",
            status="PASSED" if scans else "WARNING",
            severity="INFO",
            check_category="change_management",
            result_details={"recent_scan_count": len(scans)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Checkmarx with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
