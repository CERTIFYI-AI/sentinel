# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Aikido integration adapter.

Reads application-security posture from the Aikido platform: open
vulnerabilities, SLA compliance, and change-management audit logs.
Auth: a single API key issued from Aikido Settings > Integrations.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://app.aikido.dev/api/v1"


@dataclass
class AikidoCredentials:
    """Matches dashboard/src/integrations/aikido/config.ts credentialFields."""

    api_key: str


class AikidoAdapter:
    """Fetches AppSec findings from Aikido."""

    def __init__(self, credentials: AikidoCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/issues", per_page=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Aikido rejected the API key. Verify the key is active "
                    "and has read permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Aikido: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_open_vulnerabilities(client),
                self._check_sla_compliance(client),
                self._check_recent_changes(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("aikido check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_open_vulnerabilities(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/issues", status="open", per_page=100)
        if resp.status_code == 403:
            return [self._unavailable(
                "aikido.issues.open_vulnerabilities",
                "Open vulnerability count",
                "vulnerability_management",
                "Grant the API key read access to issues.",
            )]
        resp.raise_for_status()
        data = resp.json()
        issues = data if isinstance(data, list) else data.get("issues", data.get("data", []))
        critical = [i for i in issues if i.get("severity", "").upper() in ("CRITICAL", "HIGH")]
        passed = len(critical) == 0
        return [IntegrationFinding(
            check_id="aikido.issues.open_vulnerabilities",
            title="No critical/high open vulnerabilities",
            description=(
                f"{len(issues)} open issue(s), {len(critical)} rated critical or high."
            ),
            remediation=(
                "Triage and remediate critical/high findings. Aikido provides "
                "auto-fix suggestions for many dependency and code issues."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={
                "total_open": len(issues),
                "critical_high": len(critical),
            },
        )]

    async def _check_sla_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/issues", status="open", sla_breached="true", per_page=100)
        if resp.status_code in (400, 403):
            return [self._unavailable(
                "aikido.issues.sla_compliance",
                "Vulnerability SLA compliance",
                "vulnerability_management",
                "Verify the API key can read SLA data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        breached = data if isinstance(data, list) else data.get("issues", data.get("data", []))
        passed = len(breached) == 0
        return [IntegrationFinding(
            check_id="aikido.issues.sla_compliance",
            title="All open issues within SLA",
            description=(
                f"{len(breached)} issue(s) have breached their remediation SLA."
            ),
            remediation="Remediate SLA-breached issues immediately or adjust SLA targets.",
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={"sla_breached_count": len(breached)},
        )]

    async def _check_recent_changes(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit-log", per_page=10)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "aikido.audit.recent_changes",
                "Audit log accessible",
                "change_management",
                "Grant the API key read access to the audit log.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data if isinstance(data, list) else data.get("events", data.get("data", []))
        return [IntegrationFinding(
            check_id="aikido.audit.recent_changes",
            title="Audit log is accessible for change tracking",
            description=(
                f"Retrieved {len(events)} recent audit event(s). Change management "
                "evidence can be collected."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="change_management",
            result_details={"recent_event_count": len(events)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Aikido with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
