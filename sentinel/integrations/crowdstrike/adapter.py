# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""CrowdStrike integration adapter.

Reads endpoint-protection posture from the CrowdStrike Falcon API:
host sensor coverage, spotlight vulnerabilities, and incident queue.
Auth: OAuth2 client credentials (client_id + client_credential) exchanged
for a short-lived bearer token via /oauth2/token.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.crowdstrike.com"


@dataclass
class CrowdStrikeCredentials:
    """Matches dashboard/src/integrations/crowdstrike/config.ts credentialFields."""

    client_id: str
    client_credential: str


class CrowdStrikeAdapter:
    """Fetches EDR posture from CrowdStrike Falcon."""

    def __init__(self, credentials: CrowdStrikeCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Exchange client credentials for a bearer token."""
        if self._token:
            return self._token
        resp = await client.post(
            f"{_BASE}/oauth2/token",
            data={
                "client_id": self.credentials.client_id,
                "client_secret": self.credentials.client_credential,
            },
            headers={"Accept": "application/json"},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "CrowdStrike rejected the client credentials. Verify the "
                "client ID and credential are correct and the API client is enabled."
            )
        resp.raise_for_status()
        self._token = resp.json().get("access_token", "")
        return self._token

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_BASE}{path}",
            headers=self._headers(token),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach CrowdStrike: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_sensor_coverage(client),
                self._check_spotlight_vulnerabilities(client),
                self._check_open_incidents(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("crowdstrike check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_sensor_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/devices/queries/devices-scroll/v1", limit=1)
        if resp.status_code == 403:
            return [self._unavailable(
                "crowdstrike.devices.sensor_coverage",
                "Falcon sensor coverage",
                "endpoint_protection",
                "Grant the API client Hosts:Read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        resources = data.get("resources", [])
        total = data.get("meta", {}).get("pagination", {}).get("total", len(resources))
        # Also check for hosts with reduced functionality
        resp_rfm = await self._get(
            client, "/devices/queries/devices-scroll/v1",
            filter="reduced_functionality_mode:'yes'", limit=1,
        )
        rfm_total = 0
        if resp_rfm.status_code == 200:
            rfm_data = resp_rfm.json()
            rfm_total = rfm_data.get("meta", {}).get("pagination", {}).get("total", 0)
        passed = rfm_total == 0 and total > 0
        return [IntegrationFinding(
            check_id="crowdstrike.devices.sensor_coverage",
            title="All Falcon sensors operating normally",
            description=(
                f"{total} host(s) with Falcon sensor; {rfm_total} in reduced "
                "functionality mode."
            ),
            remediation=(
                "Investigate hosts in reduced functionality mode. Ensure the "
                "sensor is up to date and the host meets system requirements."
            ),
            status="PASSED" if passed else ("WARNING" if total > 0 else "FAILED"),
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "total_hosts": total,
                "rfm_hosts": rfm_total,
            },
        )]

    async def _check_spotlight_vulnerabilities(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/spotlight/queries/vulnerabilities/v1",
            filter="status:'open'+cve.severity:'CRITICAL'", limit=1,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "crowdstrike.spotlight.critical_vulns",
                "Spotlight critical vulnerabilities",
                "vulnerability_management",
                "Grant the API client Spotlight:Read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("meta", {}).get("pagination", {}).get("total", 0)
        passed = total == 0
        return [IntegrationFinding(
            check_id="crowdstrike.spotlight.critical_vulns",
            title="No open critical Spotlight vulnerabilities",
            description=f"{total} open critical vulnerability/vulnerabilities detected by Spotlight.",
            remediation=(
                "Remediate critical vulnerabilities through patching or "
                "compensating controls. Use Falcon Spotlight for prioritisation."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="vulnerability_management",
            result_details={"open_critical_count": total},
        )]

    async def _check_open_incidents(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/incidents/queries/incidents/v1",
            filter="status:'20'", limit=1,  # status 20 = open
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "crowdstrike.incidents.open_count",
                "Open incident count",
                "incident_response",
                "Grant the API client Incidents:Read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("meta", {}).get("pagination", {}).get("total", 0)
        passed = total == 0
        return [IntegrationFinding(
            check_id="crowdstrike.incidents.open_count",
            title="No open incidents in Falcon",
            description=f"{total} open incident(s) requiring investigation.",
            remediation=(
                "Investigate and close open incidents. Escalate any that indicate "
                "an active compromise to the incident response team."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if total > 0 else "INFO",
            check_category="incident_response",
            result_details={"open_incident_count": total},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from CrowdStrike with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
