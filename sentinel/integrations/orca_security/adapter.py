# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Orca Security integration adapter.

Reads cloud-security posture from Orca Security (CNAPP): critical cloud
alerts, asset vulnerability counts, and asset coverage.
Auth: a single API key (Bearer token) from Orca Security > Settings > API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.orcasecurity.io/api"


@dataclass
class OrcaSecurityCredentials:
    """Matches dashboard/src/integrations/orca_security/config.ts credentialFields."""

    api_key: str


class OrcaSecurityAdapter:
    """Fetches cloud-security posture from Orca Security."""

    def __init__(self, credentials: OrcaSecurityCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/user/session")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Orca Security rejected the API key. Verify the key is "
                    "active and has read permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Orca Security: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_critical_alerts(client),
                self._check_vulnerability_count(client),
                self._check_asset_coverage(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("orca_security check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_critical_alerts(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/alerts",
            status="open", severity="critical", limit=1,
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "orca_security.alerts.critical_open",
                "Critical open cloud alerts",
                "vulnerability_management",
                "Grant the API key read access to alerts.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("total_count", data.get("total", len(data.get("data", []))))
        passed = total == 0
        return [IntegrationFinding(
            check_id="orca_security.alerts.critical_open",
            title="No critical open cloud alerts",
            description=f"{total} critical open alert(s) across cloud assets.",
            remediation=(
                "Investigate and remediate critical alerts. Orca provides "
                "contextual risk scoring to help prioritise remediation."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="vulnerability_management",
            result_details={"critical_open_count": total},
        )]

    async def _check_vulnerability_count(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/vulnerabilities",
            severity="critical", status="open", limit=1,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "orca_security.vulns.critical_count",
                "Critical vulnerability count",
                "encryption_at_rest",
                "Grant the API key read access to vulnerability data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("total_count", data.get("total", 0))
        passed = total == 0
        return [IntegrationFinding(
            check_id="orca_security.vulns.critical_count",
            title="No critical cloud vulnerabilities",
            description=f"{total} critical open vulnerability/vulnerabilities detected.",
            remediation=(
                "Patch or mitigate critical vulnerabilities. Focus on "
                "workloads with sensitive data or public exposure."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="encryption_at_rest",
            result_details={"critical_vuln_count": total},
        )]

    async def _check_asset_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/assets", limit=1)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "orca_security.assets.coverage",
                "Cloud asset coverage",
                "access_control",
                "Grant the API key read access to cloud assets.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("total_count", data.get("total", 0))
        return [IntegrationFinding(
            check_id="orca_security.assets.coverage",
            title="Cloud assets under Orca protection",
            description=f"{total} cloud asset(s) monitored by Orca Security.",
            remediation=(
                "Ensure all cloud accounts are connected to Orca for "
                "complete asset visibility and protection."
            ),
            status="PASSED" if total > 0 else "WARNING",
            severity="MEDIUM" if total == 0 else "INFO",
            check_category="access_control",
            result_details={"monitored_asset_count": total},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Orca Security with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
