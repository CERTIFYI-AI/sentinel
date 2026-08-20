# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Prisma Cloud integration adapter.

Reads cloud-security posture from Palo Alto Prisma Cloud (CSPM): policy
violations, vulnerability findings across hosts/images, and network
security alerts.
Auth: api_url + access_key_id + client_credential (generated from Prisma
Cloud > Settings > Access Keys).
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
class PrismaCloudCredentials:
    """Matches dashboard/src/integrations/prisma_cloud/config.ts credentialFields."""

    api_url: str
    access_key_id: str
    client_credential: str

    def base_url(self) -> str:
        return self.api_url.rstrip("/")


class PrismaCloudAdapter:
    """Fetches cloud-security posture from Prisma Cloud."""

    def __init__(self, credentials: PrismaCloudCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Exchange access key for a JWT token."""
        if self._token:
            return self._token
        resp = await client.post(
            f"{self.credentials.base_url()}/login",
            json={
                "username": self.credentials.access_key_id,
                "password": self.credentials.client_credential,
            },
            headers={"Content-Type": "application/json"},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Prisma Cloud rejected the access key. Verify the API URL, "
                "access key ID, and credential are correct."
            )
        resp.raise_for_status()
        self._token = resp.json().get("token", "")
        return self._token

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "x-redlock-auth": token,
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{self.credentials.base_url()}{path}",
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
            raise ValueError(f"Could not reach Prisma Cloud: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_policy_violations(client),
                self._check_host_vulnerabilities(client),
                self._check_network_alerts(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("prisma_cloud check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_policy_violations(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/v2/alert",
            alert_status="open",
            policy_severity="critical",
            limit=1,
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "prisma_cloud.alerts.critical_violations",
                "Critical policy violations",
                "vulnerability_management",
                "Grant the access key read access to alerts.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("totalRows", len(data.get("items", []))) if isinstance(data, dict) else 0
        passed = total == 0
        return [IntegrationFinding(
            check_id="prisma_cloud.alerts.critical_violations",
            title="No critical open policy violations",
            description=f"{total} critical open policy violation(s) in Prisma Cloud.",
            remediation=(
                "Remediate critical policy violations. Use Prisma Cloud's "
                "auto-remediation features where available."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="vulnerability_management",
            result_details={"critical_violation_count": total},
        )]

    async def _check_host_vulnerabilities(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/api/v1/vulnerabilities/hosts",
            severity="critical",
            limit=1,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "prisma_cloud.vulns.host_critical",
                "Critical host vulnerabilities",
                "access_control",
                "Grant the access key read access to Compute vulnerability data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            total = len(data)
        else:
            total = data.get("totalCount", len(data.get("data", [])))
        passed = total == 0
        return [IntegrationFinding(
            check_id="prisma_cloud.vulns.host_critical",
            title="No critical host vulnerabilities",
            description=f"{total} host(s) with critical vulnerabilities.",
            remediation=(
                "Patch hosts with critical vulnerabilities. Use Prisma Cloud "
                "Compute for workload-level vulnerability management."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="access_control",
            result_details={"hosts_with_critical_vulns": total},
        )]

    async def _check_network_alerts(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/v2/alert",
            alert_status="open",
            policy_type="network",
            limit=1,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "prisma_cloud.network.open_alerts",
                "Open network policy alerts",
                "network_security",
                "Grant the access key read access to network alerts.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("totalRows", 0) if isinstance(data, dict) else 0
        passed = total == 0
        return [IntegrationFinding(
            check_id="prisma_cloud.network.open_alerts",
            title="No open network policy alerts",
            description=f"{total} open network policy alert(s).",
            remediation=(
                "Investigate network policy violations. Review security group "
                "and firewall rules for overly permissive configurations."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if total > 0 else "INFO",
            check_category="network_security",
            result_details={"open_network_alert_count": total},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Prisma Cloud with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
