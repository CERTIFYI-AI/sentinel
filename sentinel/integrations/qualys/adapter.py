# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Qualys integration adapter.

Reads vulnerability-management posture from the Qualys Cloud Platform:
host detection summaries, vulnerability counts by severity, and scan
activity.
Auth: api_url + username + credential (HTTP basic auth against the
Qualys API).
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
class QualysCredentials:
    """Matches dashboard/src/integrations/qualys/config.ts credentialFields."""

    api_url: str
    username: str
    credential: str

    def base_url(self) -> str:
        return self.api_url.rstrip("/")


class QualysAdapter:
    """Fetches vulnerability-management data from Qualys."""

    def __init__(self, credentials: QualysCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(
            username=self.credentials.username,
            password=self.credentials.credential,
        )

    def _headers(self) -> dict[str, str]:
        return {
            "X-Requested-With": "Sentinel",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            auth=self._auth(),
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _post(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.post(
            f"{self.credentials.base_url()}{path}",
            auth=self._auth(),
            headers=self._headers(),
            data=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(
                client, "/api/2.0/fo/activity_log/",
                action="list", truncation_limit="1",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Qualys rejected the credentials. Verify the API URL, "
                    "username, and credential are correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not reach Qualys at {self.credentials.api_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_host_detections(client),
                self._check_scan_activity(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("qualys check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_host_detections(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(
            client, "/api/2.0/fo/asset/host/vm/detection/",
            action="list",
            severities="4,5",  # 4=High, 5=Urgent in Qualys
            truncation_limit="1",
            output_format="JSON",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "qualys.detections.critical_high",
                "Critical/high host detections",
                "vulnerability_management",
                "Grant the user Manager or Reader role for the VM module.",
            )]
        resp.raise_for_status()
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        host_list = data.get("HOST_LIST_VM_DETECTION_OUTPUT", {}).get("RESPONSE", {})
        total = host_list.get("HOST_LIST", {}).get("@count", 0) if isinstance(host_list, dict) else 0
        total = int(total) if total else 0
        passed = total == 0
        return [IntegrationFinding(
            check_id="qualys.detections.critical_high",
            title="No critical/high host vulnerability detections",
            description=f"{total} host(s) with severity 4-5 (high/urgent) detections.",
            remediation=(
                "Remediate urgent and high-severity detections. Use Qualys "
                "TruRisk scoring to prioritise by business impact."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={"hosts_with_critical_high": total},
        )]

    async def _check_scan_activity(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/api/2.0/fo/scan/",
            action="list",
            state="Finished",
            truncation_limit="10",
            output_format="JSON",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "qualys.scans.recent_activity",
                "Recent scan activity",
                "vulnerability_management",
                "Grant the user read access to scan data.",
            )]
        resp.raise_for_status()
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        scan_list = data.get("SCAN_LIST_OUTPUT", {}).get("RESPONSE", {}).get("SCAN_LIST", {})
        scans = scan_list.get("SCAN", []) if isinstance(scan_list, dict) else []
        if not isinstance(scans, list):
            scans = [scans] if scans else []
        return [IntegrationFinding(
            check_id="qualys.scans.recent_activity",
            title="Vulnerability scans are running",
            description=f"{len(scans)} recently finished scan(s).",
            remediation=(
                "Ensure scans run on a regular schedule covering all "
                "asset groups and network segments."
            ),
            status="PASSED" if scans else "WARNING",
            severity="MEDIUM" if not scans else "INFO",
            check_category="vulnerability_management",
            result_details={"recent_scan_count": len(scans)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Qualys with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
