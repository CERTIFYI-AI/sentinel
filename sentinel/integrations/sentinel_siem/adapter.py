# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Microsoft Sentinel (SIEM) integration adapter.

Built on the shared Graph client. Queries the Security API surface to check
incident volume, automation rules, and data-connector health.

Application permissions required (read-only, admin consent):
  SecurityEvents.Read.All       incidents and alerts
  SecurityActions.Read.All      automation rules (if available)
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.msgraph import GraphClient, GraphCredentials

logger = logging.getLogger(__name__)


@dataclass
class SentinelSiemCredentials(GraphCredentials):
    """Matches dashboard/src/integrations/sentinel_siem/config.ts."""


class SentinelSiemAdapter:
    """Fetches SIEM posture from Microsoft Sentinel via the Security API."""

    def __init__(self, credentials: GraphCredentials, client=None) -> None:
        self.credentials = credentials
        self.graph = client if isinstance(client, GraphClient) else GraphClient(credentials, client)

    async def validate(self) -> bool:
        try:
            resp = await self.graph.get("/v1.0/security/incidents", **{"$top": "1"})
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Graph refused /security/incidents (HTTP {resp.status_code}). "
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
            self._check_incident_volume(),
            self._check_active_incidents(),
            self._check_alert_sources(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("sentinel_siem check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_incident_volume(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/security/incidents",
            **{"$top": "999"},
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "sentinel.incidents.volume",
                "Incident volume is tracked",
                "incident_response",
                "Grant SecurityEvents.Read.All (application) and complete admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "sentinel.incidents.volume",
                "Incident volume is tracked",
                "incident_response",
                "The incidents endpoint returned an error.",
            )]
        incidents = resp.json().get("value", [])
        return [IntegrationFinding(
            check_id="sentinel.incidents.volume",
            title="Incident volume is tracked",
            description=f"{len(incidents)} incident(s) visible in Microsoft Sentinel.",
            remediation="No action required — this is an inventory check.",
            status="PASSED",
            severity="INFO",
            check_category="incident_response",
            result_details={"incident_count": len(incidents)},
        )]

    async def _check_active_incidents(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/security/incidents",
            **{"$filter": "status eq 'active'", "$top": "999"},
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "sentinel.incidents.active_count",
                "Active incidents are being triaged",
                "incident_response",
                "Grant SecurityEvents.Read.All (application) and complete admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "sentinel.incidents.active_count",
                "Active incidents are being triaged",
                "incident_response",
                "The incidents endpoint returned an error.",
            )]
        incidents = resp.json().get("value", [])
        high_sev = [
            i for i in incidents
            if (i.get("severity") or "").lower() in ("high", "critical")
        ]
        return [IntegrationFinding(
            check_id="sentinel.incidents.active_count",
            title="Active incidents are being triaged",
            description=(
                f"{len(incidents)} active incident(s), "
                f"{len(high_sev)} at high/critical severity."
            ),
            remediation=(
                "Triage active incidents in the Microsoft Sentinel portal. "
                "High and critical incidents need investigation within SLA."
            ),
            status="PASSED" if not high_sev else "WARNING",
            severity="HIGH" if high_sev else "INFO",
            check_category="incident_response",
            result_details={
                "active_count": len(incidents),
                "high_critical_count": len(high_sev),
                "sample": [i.get("displayName", "") for i in high_sev][:20],
            },
        )]

    async def _check_alert_sources(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/security/alerts_v2",
            **{"$top": "100"},
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "sentinel.alerts.source_diversity",
                "Alert sources are diverse",
                "audit_logging",
                "Grant SecurityEvents.Read.All (application) and complete admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "sentinel.alerts.source_diversity",
                "Alert sources are diverse",
                "audit_logging",
                "The alerts endpoint returned an error.",
            )]
        alerts = resp.json().get("value", [])
        sources = set()
        for a in alerts:
            provider = a.get("detectionSource") or a.get("serviceSource") or "unknown"
            sources.add(provider)
        return [IntegrationFinding(
            check_id="sentinel.alerts.source_diversity",
            title="Alert sources are diverse",
            description=(
                f"{len(sources)} distinct alert source(s) detected across "
                f"{len(alerts)} recent alert(s)."
            ),
            remediation=(
                "Connect additional data connectors in Microsoft Sentinel to "
                "broaden detection coverage (identity, endpoint, network, cloud)."
            ),
            status="PASSED" if len(sources) >= 2 else "WARNING",
            severity="MEDIUM" if len(sources) < 2 else "INFO",
            check_category="audit_logging",
            result_details={
                "source_count": len(sources),
                "sources": sorted(sources),
                "alert_sample_size": len(alerts),
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
