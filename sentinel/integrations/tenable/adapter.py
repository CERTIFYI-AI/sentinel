# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Tenable.io integration adapter.

Reads vulnerability management posture from the Tenable.io API:
vulnerability count by severity, asset scan coverage, and compliance
audit results for vulnerability management and network security
evidence.

Auth: X-ApiKeys header carrying access_key and client_credential.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://cloud.tenable.com"


@dataclass
class TenableCredentials:
    """Matches dashboard/src/integrations/tenable/config.ts credentialFields."""

    access_key: str
    client_credential: str


class TenableAdapter:
    """Fetches vulnerability management posture from Tenable.io."""

    def __init__(self, credentials: TenableCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "X-ApiKeys": (
                f"accessKey={self.credentials.access_key};"
                f"secretKey={self.credentials.client_credential}"
            ),
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
            resp = await self._get(client, "/server/status")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Tenable.io rejected the supplied credentials "
                    f"(HTTP {resp.status_code}). Verify the access key "
                    "and credential."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Tenable.io: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_vuln_counts(client),
                self._check_scan_coverage(client),
                self._check_compliance_audits(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("tenable check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_vuln_counts(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/workbenches/vulnerabilities", date_range="30")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "tenable.vulns.by_severity",
                "Vulnerability count by severity",
                "vulnerability_management",
                "The credentials cannot read vulnerabilities. Verify "
                "the access key has the appropriate permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        vulns = data.get("vulnerabilities", [])
        critical = [v for v in vulns if v.get("severity") == 4]
        high = [v for v in vulns if v.get("severity") == 3]
        medium = [v for v in vulns if v.get("severity") == 2]
        return [IntegrationFinding(
            check_id="tenable.vulns.by_severity",
            title="Vulnerability count by severity reviewed",
            description=(
                f"{len(vulns)} vulnerability plugin(s): {len(critical)} critical, "
                f"{len(high)} high, {len(medium)} medium."
            ),
            remediation=(
                "Prioritise remediation of critical and high severity "
                "vulnerabilities. Review medium findings for risk acceptance."
            ),
            status="PASSED" if not critical else "FAILED",
            severity="CRITICAL" if critical else ("HIGH" if high else "INFO"),
            check_category="vulnerability_management",
            result_details={
                "total_vulns": len(vulns),
                "critical_count": len(critical),
                "high_count": len(high),
                "medium_count": len(medium),
            },
        )]

    async def _check_scan_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/assets", chunk_size="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "tenable.assets.scan_coverage",
                "Asset scan coverage",
                "network_security",
                "The credentials cannot list assets. Verify permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        assets = data.get("assets", [])
        total = len(assets)
        never_scanned = [
            a for a in assets
            if not a.get("last_scan_target")
        ]
        return [IntegrationFinding(
            check_id="tenable.assets.scan_coverage",
            title="Asset scan coverage reviewed",
            description=(
                f"{total} asset(s) tracked; {len(never_scanned)} have never "
                "been scanned."
            ),
            remediation=(
                "Ensure all tracked assets are included in scan schedules "
                "for complete vulnerability coverage."
            ),
            status="PASSED" if not never_scanned else "WARNING",
            severity="MEDIUM" if never_scanned else "INFO",
            check_category="network_security",
            result_details={
                "total_assets": total,
                "never_scanned": len(never_scanned),
            },
        )]

    async def _check_compliance_audits(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/scans")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "tenable.compliance.audit_results",
                "Compliance audit results",
                "vulnerability_management",
                "The credentials cannot list scans. Verify permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        scans = data.get("scans", [])
        total = len(scans)
        compliance = [s for s in scans if "compliance" in s.get("type", "").lower()]
        completed = [s for s in compliance if s.get("status") == "completed"]
        return [IntegrationFinding(
            check_id="tenable.compliance.audit_results",
            title="Compliance audit results reviewed",
            description=(
                f"{total} scan(s) total; {len(compliance)} are compliance "
                f"audits, {len(completed)} completed successfully."
            ),
            remediation=(
                "Run compliance audits regularly and address failed "
                "checks to maintain regulatory alignment."
            ),
            status="PASSED" if completed else "WARNING",
            severity="MEDIUM" if not completed and compliance else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_scans": total,
                "compliance_scans": len(compliance),
                "completed_compliance": len(completed),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Tenable.io with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
