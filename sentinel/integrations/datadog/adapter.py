# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Datadog integration adapter.

Reads observability and security posture from Datadog: audit-trail
availability, security monitoring signals, and vulnerability findings
from Datadog Cloud Security Management.
Auth: api_key + application_key (both from Datadog > Organization Settings >
API Keys / Application Keys).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.datadoghq.com/api"


@dataclass
class DatadogCredentials:
    """Matches dashboard/src/integrations/datadog/config.ts credentialFields."""

    api_key: str
    application_key: str


class DatadogAdapter:
    """Fetches observability and security data from Datadog."""

    def __init__(self, credentials: DatadogCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "DD-API-KEY": self.credentials.api_key,
            "DD-APPLICATION-KEY": self.credentials.application_key,
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
            resp = await self._get(client, "/v1/validate")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Datadog rejected the credentials. Verify the API key and "
                    "application key are active."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Datadog: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_audit_trail(client),
                self._check_security_signals(client),
                self._check_csm_vulnerabilities(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("datadog check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v2/audit/events", page_limit=1)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "datadog.audit.trail_available",
                "Audit trail accessible",
                "audit_logging",
                "Enable Audit Trail in Datadog and grant the application key "
                "audit_trail_read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("data", [])
        return [IntegrationFinding(
            check_id="datadog.audit.trail_available",
            title="Datadog audit trail is accessible",
            description=(
                "The audit events API responded successfully. Audit evidence "
                "can be collected for compliance."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"sample_event_count": len(events)},
        )]

    async def _check_security_signals(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/v1/security_analytics/signals",
            filter_status="open", page_limit=1,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "datadog.security.open_signals",
                "Open security signals",
                "vulnerability_management",
                "Enable Cloud Security Management and grant the application key "
                "security_monitoring_signals_read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        meta = data.get("meta", {})
        total = meta.get("page", {}).get("total_count", len(data.get("data", [])))
        passed = total == 0
        return [IntegrationFinding(
            check_id="datadog.security.open_signals",
            title="No open security signals",
            description=f"{total} open security signal(s) in Datadog.",
            remediation=(
                "Investigate and triage open security signals. Close resolved "
                "signals to maintain an accurate posture view."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if total > 0 else "INFO",
            check_category="incident_response",
            result_details={"open_signal_count": total},
        )]

    async def _check_csm_vulnerabilities(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/v2/security/vulnerabilities",
            page_limit=1,
            filter_severity="critical",
            filter_status="open",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "datadog.csm.critical_vulns",
                "CSM critical vulnerabilities",
                "vulnerability_management",
                "Enable Cloud Security Management Vulnerabilities and grant "
                "the application key the required scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("meta", {}).get("total", len(data.get("data", [])))
        passed = total == 0
        return [IntegrationFinding(
            check_id="datadog.csm.critical_vulns",
            title="No open critical CSM vulnerabilities",
            description=f"{total} open critical vulnerability/vulnerabilities in CSM.",
            remediation=(
                "Remediate critical vulnerabilities identified by Cloud Security "
                "Management through patching or compensating controls."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="vulnerability_management",
            result_details={"open_critical_count": total},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Datadog with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
