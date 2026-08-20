# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""TruffleHog integration adapter.

Reads credential-scanning posture from TruffleHog Enterprise API:
detected finding count, scan coverage, and remediation status for
management and vulnerability management evidence.

Auth: a Bearer API key for TruffleHog Enterprise.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.trufflehog.org/v1"


@dataclass
class TrufflehogCredentials:
    """Matches dashboard/src/integrations/trufflehog/config.ts credentialFields."""

    api_key: str


class TrufflehogAdapter:
    """Fetches credential-scanning posture from TruffleHog Enterprise."""

    def __init__(self, credentials: TrufflehogCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/health")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "TruffleHog rejected the API key "
                    f"(HTTP {resp.status_code}). Verify the key is valid."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach TruffleHog: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_detected_findings(client),
                self._check_scan_coverage(client),
                self._check_remediation_status(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("trufflehog check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_detected_findings(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/findings", status="active", limit="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "trufflehog.findings.detected_credentials",
                "Detected credential findings",
                "secret_management",
                "The API key cannot read findings. Verify key permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("findings", [])
        total = len(items)
        verified = [f for f in items if f.get("verified", False)]
        return [IntegrationFinding(
            check_id="trufflehog.findings.detected_credentials",
            title="Detected credential findings reviewed",
            description=(
                f"{total} active finding(s); {len(verified)} verified as live."
            ),
            remediation=(
                "Rotate all verified live credentials immediately. Review "
                "unverified findings and remediate or mark as false positives."
            ),
            status="PASSED" if not verified else "FAILED",
            severity="CRITICAL" if verified else ("HIGH" if total > 0 else "INFO"),
            check_category="secret_management",
            result_details={
                "total_findings": total,
                "verified_count": len(verified),
            },
        )]

    async def _check_scan_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/scans", limit="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "trufflehog.scans.coverage",
                "Scan coverage",
                "vulnerability_management",
                "The API key cannot read scan history. Verify key permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        scans = data.get("scans", [])
        total = len(scans)
        completed = [s for s in scans if s.get("status") == "completed"]
        failed = [s for s in scans if s.get("status") in ("failed", "error")]
        return [IntegrationFinding(
            check_id="trufflehog.scans.coverage",
            title="Scan coverage reviewed",
            description=(
                f"{total} scan(s) configured; {len(completed)} completed, "
                f"{len(failed)} failed."
            ),
            remediation=(
                "Investigate failed scans and ensure all repositories "
                "and sources are covered."
            ),
            status="PASSED" if completed and not failed else "WARNING",
            severity="MEDIUM" if failed else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_scans": total,
                "completed_scans": len(completed),
                "failed_scans": len(failed),
            },
        )]

    async def _check_remediation_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/findings", status="resolved", limit="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "trufflehog.findings.remediation_status",
                "Remediation status",
                "secret_management",
                "The API key cannot read resolved findings. Verify key "
                "permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        resolved = data.get("findings", [])

        active_resp = await self._get(client, "/findings", status="active", limit="1")
        active_total = 0
        if active_resp.status_code == 200:
            active_total = active_resp.json().get("total", len(active_resp.json().get("findings", [])))

        resolved_total = len(resolved)
        return [IntegrationFinding(
            check_id="trufflehog.findings.remediation_status",
            title="Remediation status reviewed",
            description=(
                f"{resolved_total} finding(s) resolved; {active_total} still active."
            ),
            remediation=(
                "Continue remediating active findings. Ensure resolved "
                "findings have had their credentials rotated."
            ),
            status="PASSED" if active_total == 0 else "WARNING",
            severity="HIGH" if active_total > 0 else "INFO",
            check_category="secret_management",
            result_details={
                "resolved_findings": resolved_total,
                "active_findings": active_total,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from TruffleHog with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
