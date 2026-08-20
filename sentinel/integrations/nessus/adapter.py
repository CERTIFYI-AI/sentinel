# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Nessus integration adapter.

Reads vulnerability-scan results from a Tenable Nessus instance: critical
vulnerability findings, scan schedule compliance, and policy configuration.
Auth: server_url + access_key_id + api_credential (X-ApiKeys header).
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
class NessusCredentials:
    """Matches dashboard/src/integrations/nessus/config.ts credentialFields."""

    server_url: str
    access_key_id: str
    api_credential: str

    def base_url(self) -> str:
        return self.server_url.rstrip("/")


class NessusAdapter:
    """Fetches vulnerability-scan results from Nessus."""

    def __init__(self, credentials: NessusCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "X-ApiKeys": (
                f"accessKey={self.credentials.access_key_id};"
                f"secretKey={self.credentials.api_credential}"
            ),
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/server/status")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Nessus rejected the API keys. Verify the access key and "
                    "credential are correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not reach Nessus at {self.credentials.server_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_critical_findings(client),
                self._check_scan_schedule(client),
                self._check_policy_config(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("nessus check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_critical_findings(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/scans")
        if resp.status_code == 403:
            return [self._unavailable(
                "nessus.scans.critical_vulns",
                "Critical vulnerability findings",
                "vulnerability_management",
                "Grant the API keys read access to scan results.",
            )]
        resp.raise_for_status()
        data = resp.json()
        scans = data.get("scans") or []
        completed = [s for s in scans if s.get("status") == "completed"]
        if not completed:
            return [IntegrationFinding(
                check_id="nessus.scans.critical_vulns",
                title="No completed scans to evaluate",
                description="No completed scans found. Run a vulnerability scan first.",
                remediation="Schedule and execute a vulnerability scan.",
                status="NOT_AVAILABLE", severity="INFO",
                check_category="vulnerability_management",
                result_details={},
            )]
        completed.sort(key=lambda s: s.get("last_modification_date", 0), reverse=True)
        scan_id = completed[0].get("id")
        detail_resp = await self._get(client, f"/scans/{scan_id}")
        if detail_resp.status_code in (403, 404):
            return [self._unavailable(
                "nessus.scans.critical_vulns",
                "Critical vulnerability findings",
                "vulnerability_management",
                "Grant the API keys read access to individual scan results.",
            )]
        detail_resp.raise_for_status()
        detail = detail_resp.json()
        info = detail.get("info", {})
        host_count = info.get("hostcount", 0)
        severity_counts = detail.get("severitycount", {}).get("item", [])
        critical = 0
        for item in severity_counts:
            if item.get("severitylevel") == 4:  # 4 = Critical in Nessus
                critical = item.get("count", 0)
        passed = critical == 0
        return [IntegrationFinding(
            check_id="nessus.scans.critical_vulns",
            title="No critical vulnerabilities in latest scan",
            description=(
                f"Latest scan covered {host_count} host(s): "
                f"{critical} critical vulnerability/vulnerabilities found."
            ),
            remediation=(
                "Remediate critical vulnerabilities through patching. "
                "Re-scan to confirm remediation."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="vulnerability_management",
            result_details={
                "scan_id": scan_id,
                "host_count": host_count,
                "critical_count": critical,
            },
        )]

    async def _check_scan_schedule(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/scans")
        if resp.status_code == 403:
            return [self._unavailable(
                "nessus.scans.schedule_compliance",
                "Scan schedule compliance",
                "vulnerability_management",
                "Grant the API keys read access to scan schedules.",
            )]
        resp.raise_for_status()
        data = resp.json()
        scans = data.get("scans") or []
        scheduled = [s for s in scans if s.get("rrules") or s.get("schedule_uuid")]
        unscheduled = len(scans) - len(scheduled)
        passed = unscheduled == 0 and scans
        return [IntegrationFinding(
            check_id="nessus.scans.schedule_compliance",
            title="All scans are on a recurring schedule",
            description=(
                f"{len(scheduled)} of {len(scans)} scan(s) are scheduled to "
                "run on a recurring basis."
            ),
            remediation=(
                "Configure recurring schedules for all scans to ensure "
                "continuous vulnerability assessment."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "total_scans": len(scans),
                "scheduled_scans": len(scheduled),
            },
        )]

    async def _check_policy_config(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/policies")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "nessus.policies.configuration",
                "Scan policy configuration",
                "vulnerability_management",
                "Grant the API keys read access to scan policies.",
            )]
        resp.raise_for_status()
        data = resp.json()
        policies = data.get("policies", [])
        return [IntegrationFinding(
            check_id="nessus.policies.configuration",
            title="Scan policies are configured",
            description=f"{len(policies)} scan policy/policies configured in Nessus.",
            remediation=(
                "Ensure at least one policy is configured covering common "
                "vulnerability checks for your environment."
            ),
            status="PASSED" if policies else "WARNING",
            severity="MEDIUM" if not policies else "INFO",
            check_category="vulnerability_management",
            result_details={"policy_count": len(policies)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Nessus with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
