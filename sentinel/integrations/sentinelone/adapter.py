# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""SentinelOne integration adapter.

Reads endpoint detection and response posture from the SentinelOne
Management Console API v2.1: agent health for endpoint protection,
active threat summary for incident response, and application
vulnerability data for vulnerability management evidence.

Auth: an API token issued to a service user with Viewer role.
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
class SentinelOneCredentials:
    """Matches dashboard/src/integrations/sentinelone/config.ts credentialFields."""

    server_url: str
    api_token: str

    def base_url(self) -> str:
        return self.server_url.rstrip("/")


class SentinelOneAdapter:
    """Fetches EDR/XDR posture from SentinelOne."""

    def __init__(self, credentials: SentinelOneCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"ApiToken {self.credentials.api_token}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/web/api/v2.1{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/system/info")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "SentinelOne rejected the API token for "
                    f"{self.credentials.server_url!r} "
                    f"(HTTP {resp.status_code}). Verify the token and "
                    "that the service user has Viewer role."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach SentinelOne: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_agent_health(client),
                self._check_active_threats(client),
                self._check_application_vulns(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("sentinelone check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_agent_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/agents", countOnly="true")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sentinelone.agents.health", "Agent deployment health",
                "endpoint_protection",
                "The API token cannot list agents. Grant Viewer access.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("pagination", {}).get("totalItems", 0)

        resp_infected = await self._get(client, "/agents", countOnly="true", infected="true")
        infected = 0
        if resp_infected.status_code == 200:
            infected = resp_infected.json().get("pagination", {}).get("totalItems", 0)

        passed = infected == 0
        return [IntegrationFinding(
            check_id="sentinelone.agents.health",
            title="Endpoint agents are healthy",
            description=(
                f"{total} agent(s) deployed, {infected} currently flagged as infected."
            ),
            remediation=(
                "Investigate infected endpoints in the SentinelOne console "
                "and remediate or isolate them."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL" if infected else "INFO",
            check_category="endpoint_protection",
            result_details={"total_agents": total, "infected_agents": infected},
        )]

    async def _check_active_threats(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/threats",
            resolved="false",
            limit="1",
            countOnly="true",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sentinelone.threats.active", "Active threats",
                "incident_response",
                "The API token cannot read threats. Grant Viewer access to threats.",
            )]
        resp.raise_for_status()
        data = resp.json()
        count = data.get("pagination", {}).get("totalItems", 0)
        passed = count == 0
        return [IntegrationFinding(
            check_id="sentinelone.threats.active",
            title="No unresolved threats",
            description=f"{count} unresolved threat(s) across all sites.",
            remediation=(
                "Review and mitigate active threats in the SentinelOne "
                "Incidents dashboard. Ensure automated response policies "
                "are configured."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL" if count else "INFO",
            check_category="incident_response",
            result_details={"unresolved_threats": count},
        )]

    async def _check_application_vulns(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/installed-applications", countOnly="true", riskLevel="high")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sentinelone.apps.vulnerabilities",
                "High-risk application vulnerabilities",
                "vulnerability_management",
                "The API token cannot read installed applications. Grant Viewer access.",
            )]
        resp.raise_for_status()
        data = resp.json()
        high_risk = data.get("pagination", {}).get("totalItems", 0)
        passed = high_risk == 0
        return [IntegrationFinding(
            check_id="sentinelone.apps.vulnerabilities",
            title="High-risk application vulnerabilities",
            description=(
                f"{high_risk} installed application(s) flagged as high risk."
            ),
            remediation=(
                "Patch or remove high-risk applications identified by "
                "SentinelOne's application risk assessment."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if high_risk else "INFO",
            check_category="vulnerability_management",
            result_details={"high_risk_apps": high_risk},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from SentinelOne with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
