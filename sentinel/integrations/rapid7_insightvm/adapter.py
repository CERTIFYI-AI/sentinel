# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Rapid7 InsightVM integration adapter.

Reads vulnerability-management posture from Rapid7 InsightVM: critical
vulnerability counts, asset scan coverage, and scan engine health.
Auth: server_url + api_token (platform API key from Rapid7 Insight
Platform > API Keys).
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
class Rapid7InsightVmCredentials:
    """Matches dashboard/src/integrations/rapid7_insightvm/config.ts credentialFields."""

    server_url: str
    api_token: str

    def base_url(self) -> str:
        return self.server_url.rstrip("/")


class Rapid7InsightVmAdapter:
    """Fetches vulnerability-management data from Rapid7 InsightVM."""

    def __init__(self, credentials: Rapid7InsightVmCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "X-Api-Key": self.credentials.api_token,
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api/3{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/administration/info")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Rapid7 InsightVM rejected the API token. Verify the token "
                    "is active and the server URL is correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not reach InsightVM at {self.credentials.server_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_critical_vulnerabilities(client),
                self._check_asset_coverage(client),
                self._check_scan_engine_health(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("rapid7_insightvm check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_critical_vulnerabilities(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/vulnerabilities",
            page=0, size=1, sort="severity,DESC",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "rapid7.vulns.critical_count",
                "Critical vulnerability count",
                "vulnerability_management",
                "Grant the API token read access to vulnerabilities.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("page", {}).get("totalResources", 0)
        # Get critical-only count via severity filter
        resp_crit = await self._get(
            client, "/vulnerabilities",
            page=0, size=1, sort="severity,DESC",
            filter="vulnerability.severity IN ['Critical']",
        )
        critical_count = 0
        if resp_crit.status_code == 200:
            crit_data = resp_crit.json()
            critical_count = crit_data.get("page", {}).get("totalResources", 0)
        passed = critical_count == 0
        return [IntegrationFinding(
            check_id="rapid7.vulns.critical_count",
            title="No critical vulnerabilities across assets",
            description=(
                f"{total} total vulnerability/vulnerabilities tracked, "
                f"{critical_count} critical."
            ),
            remediation=(
                "Remediate critical vulnerabilities. Use InsightVM's Real Risk "
                "Score to prioritise by exploitability and asset importance."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="vulnerability_management",
            result_details={
                "total_vulnerabilities": total,
                "critical_count": critical_count,
            },
        )]

    async def _check_asset_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/assets", page=0, size=1)
        if resp.status_code == 403:
            return [self._unavailable(
                "rapid7.assets.coverage",
                "Asset inventory coverage",
                "endpoint_protection",
                "Grant the API token read access to assets.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("page", {}).get("totalResources", 0)
        return [IntegrationFinding(
            check_id="rapid7.assets.coverage",
            title="Assets under InsightVM management",
            description=f"{total} asset(s) in the InsightVM inventory.",
            remediation=(
                "Ensure all in-scope assets are discovered and scanned. "
                "Add missing network segments to scan targets."
            ),
            status="PASSED" if total > 0 else "WARNING",
            severity="MEDIUM" if total == 0 else "INFO",
            check_category="endpoint_protection",
            result_details={"total_assets": total},
        )]

    async def _check_scan_engine_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/scan_engines")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "rapid7.engines.health",
                "Scan engine health",
                "vulnerability_management",
                "Grant the API token read access to scan engines.",
            )]
        resp.raise_for_status()
        data = resp.json()
        engines = data.get("resources", [])
        offline = [e for e in engines if e.get("status", "").lower() != "active"]
        passed = len(offline) == 0 and len(engines) > 0
        return [IntegrationFinding(
            check_id="rapid7.engines.health",
            title="All scan engines are active",
            description=(
                f"{len(engines)} scan engine(s) registered, {len(offline)} offline."
                if engines else "No scan engines registered."
            ),
            remediation=(
                "Investigate offline scan engines. Ensure all engines are "
                "running and can reach their assigned scan targets."
            ),
            status="PASSED" if passed else ("WARNING" if engines else "FAILED"),
            severity="HIGH" if not engines else "MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "total_engines": len(engines),
                "offline_count": len(offline),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Rapid7 InsightVM with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
