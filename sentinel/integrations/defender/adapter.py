# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Microsoft Defender for Endpoint integration adapter.

Built on the shared Graph client. One adapter class serves both
``microsoft_defender_for_endpoint`` and
``microsoft_defender_for_endpoint_gcc_high`` — the sovereign cloud is selected
by the credentials, not hardcoded.

Application permissions required (read-only, admin consent):
  Machine.Read.All                  device inventory + exposure score
  SecurityEvents.Read.All           active alerts
  Vulnerability.Read.All            vulnerability inventory
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.msgraph import GraphClient, GraphCredentials

logger = logging.getLogger(__name__)

_HIGH_EXPOSURE_THRESHOLD = "high"
_CRITICAL_ALERT_SEVERITIES = frozenset({"high", "critical"})


@dataclass
class DefenderCredentials(GraphCredentials):
    """Matches dashboard/src/integrations/defender/config.ts credentialFields."""


@dataclass
class DefenderGccHighCredentials(GraphCredentials):
    """GCC High / DoD tenants — sovereign endpoints selected by default."""

    cloud: str = "usgov"


class DefenderAdapter:
    """Fetches endpoint protection posture from Defender for Endpoint."""

    def __init__(self, credentials: GraphCredentials, client=None) -> None:
        self.credentials = credentials
        self.graph = client if isinstance(client, GraphClient) else GraphClient(credentials, client)

    async def validate(self) -> bool:
        try:
            resp = await self.graph.get("/v1.0/security/alerts_v2", **{"$top": "1"})
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Graph refused /security/alerts_v2 (HTTP {resp.status_code}). "
                    "Grant SecurityEvents.Read.All (application) and complete admin consent."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Microsoft Graph: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_active_alerts(),
            self._check_machine_inventory(),
            self._check_exposure_score(),
            self._check_vulnerable_machines(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("defender check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_active_alerts(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/security/alerts_v2",
            **{"$filter": "status ne 'resolved'", "$top": "999"},
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "defender.alerts.active_count",
                "Active security alerts are reviewed",
                "incident_response",
                "Grant SecurityEvents.Read.All (application) and complete admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "defender.alerts.active_count",
                "Active security alerts are reviewed",
                "incident_response",
                "The security alerts endpoint returned an error.",
            )]
        alerts = resp.json().get("value", [])
        critical = [a for a in alerts if (a.get("severity") or "").lower() in _CRITICAL_ALERT_SEVERITIES]
        return [IntegrationFinding(
            check_id="defender.alerts.active_count",
            title="Active security alerts are reviewed",
            description=(
                f"{len(alerts)} unresolved alert(s), {len(critical)} at high/critical severity."
            ),
            remediation=(
                "Triage unresolved alerts in the Microsoft 365 Defender portal. "
                "High and critical alerts need investigation within SLA."
            ),
            status="PASSED" if not critical else "WARNING",
            severity="HIGH" if critical else "INFO",
            check_category="incident_response",
            result_details={
                "active_count": len(alerts),
                "critical_high_count": len(critical),
                "sample": [a.get("title", "") for a in critical][:20],
            },
        )]

    async def _check_machine_inventory(self) -> list[IntegrationFinding]:
        items, truncated = await self.graph.get_paged(
            "/v1.0/security/microsoft/windowsProtectionState/machines"
        )
        if not items:
            resp = await self.graph.get("/v1.0/security/alerts_v2", **{"$top": "1"})
            if resp.status_code == 403:
                return [self._unavailable(
                    "defender.devices.machine_count",
                    "Managed machines are inventoried",
                    "endpoint_protection",
                    "Grant Machine.Read.All (application) and complete admin consent.",
                )]
            return [IntegrationFinding(
                check_id="defender.devices.machine_count",
                title="Managed machines are inventoried",
                description="No machines returned from the Defender endpoint.",
                remediation="Onboard devices to Defender for Endpoint to collect posture evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="endpoint_protection",
                result_details={"machine_count": 0},
            )]
        return [IntegrationFinding(
            check_id="defender.devices.machine_count",
            title="Managed machines are inventoried",
            description=f"{len(items)} machine(s) onboarded to Defender for Endpoint.",
            remediation="No action required — this is an inventory check.",
            status="PASSED",
            severity="INFO",
            check_category="endpoint_protection",
            result_details={
                "machine_count": len(items),
                "truncated": truncated,
            },
        )]

    async def _check_exposure_score(self) -> list[IntegrationFinding]:
        resp = await self.graph.get("/v1.0/security/secureScores", **{"$top": "1"})
        if resp.status_code == 403:
            return [self._unavailable(
                "defender.posture.exposure_score",
                "Tenant exposure score is acceptable",
                "vulnerability_management",
                "Grant SecurityEvents.Read.All (application) and complete admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "defender.posture.exposure_score",
                "Tenant exposure score is acceptable",
                "vulnerability_management",
                "The secure scores endpoint returned an error.",
            )]
        scores = resp.json().get("value", [])
        if not scores:
            return [self._unavailable(
                "defender.posture.exposure_score",
                "Tenant exposure score is acceptable",
                "vulnerability_management",
                "No secure score data available yet.",
            )]
        latest = scores[0]
        current = latest.get("currentScore", 0)
        max_score = latest.get("maxScore", 1)
        pct = current / max_score if max_score else 0
        return [IntegrationFinding(
            check_id="defender.posture.exposure_score",
            title="Tenant exposure score is acceptable",
            description=f"Secure Score: {current}/{max_score} ({pct:.0%}).",
            remediation=(
                "Review recommended actions in the Microsoft 365 Defender portal "
                "to improve the Secure Score."
            ),
            status="PASSED" if pct >= 0.5 else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "current_score": current,
                "max_score": max_score,
                "percentage": round(pct, 4),
            },
        )]

    async def _check_vulnerable_machines(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/security/alerts_v2",
            **{"$filter": "category eq 'Vulnerability'", "$top": "999"},
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "defender.vulnerabilities.open_count",
                "Vulnerability alerts are tracked",
                "vulnerability_management",
                "Grant SecurityEvents.Read.All (application) and complete admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "defender.vulnerabilities.open_count",
                "Vulnerability alerts are tracked",
                "vulnerability_management",
                "The vulnerability alerts endpoint returned an error.",
            )]
        vulns = resp.json().get("value", [])
        unresolved = [v for v in vulns if v.get("status") != "resolved"]
        return [IntegrationFinding(
            check_id="defender.vulnerabilities.open_count",
            title="Vulnerability alerts are tracked",
            description=f"{len(unresolved)} unresolved vulnerability-category alert(s).",
            remediation=(
                "Patch or mitigate vulnerabilities flagged by Defender. "
                "Prioritise by CVSS score and exploitability."
            ),
            status="PASSED" if not unresolved else "WARNING",
            severity="MEDIUM" if unresolved else "INFO",
            check_category="vulnerability_management",
            result_details={
                "unresolved_count": len(unresolved),
                "total_count": len(vulns),
            },
        )]

    @staticmethod
    def _unavailable(check_id, title, category, remediation) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Microsoft Graph with the permissions granted.",
            remediation=remediation, status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
