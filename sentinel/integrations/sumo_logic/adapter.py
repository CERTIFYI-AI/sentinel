# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Sumo Logic integration adapter.

Reads SIEM posture from the Sumo Logic API v1: collector health,
log ingest volume, and scheduled search count for audit logging
and incident response evidence.

Auth: access ID + access key via HTTP Basic authentication.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.sumologic.com/api/v1"


@dataclass
class SumoLogicCredentials:
    """Matches dashboard/src/integrations/sumo_logic/config.ts credentialFields."""

    access_id: str
    access_key: str


class SumoLogicAdapter:
    """Fetches SIEM posture from Sumo Logic."""

    def __init__(self, credentials: SumoLogicCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(
            username=self.credentials.access_id,
            password=self.credentials.access_key,
        )

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/collectors", limit="1")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Sumo Logic rejected the supplied credentials "
                    f"(HTTP {resp.status_code}). Verify the access ID "
                    "and access key."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Sumo Logic: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_collector_health(client),
                self._check_ingest_volume(client),
                self._check_scheduled_searches(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("sumo_logic check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_collector_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/collectors", limit="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sumo_logic.collectors.health", "Collector health",
                "audit_logging",
                "The credentials cannot list collectors. Verify the "
                "access key has the Collector Management role.",
            )]
        resp.raise_for_status()
        data = resp.json()
        collectors = data.get("collectors", [])
        total = len(collectors)
        offline = [c for c in collectors if not c.get("alive", True)]
        return [IntegrationFinding(
            check_id="sumo_logic.collectors.health",
            title="Collector health reviewed",
            description=(
                f"{total} collector(s) found; {len(offline)} offline."
            ),
            remediation=(
                "Investigate offline collectors to restore log ingestion "
                "from all expected sources."
            ),
            status="PASSED" if not offline else "WARNING",
            severity="MEDIUM" if offline else "INFO",
            check_category="audit_logging",
            result_details={
                "total_collectors": total,
                "offline_collectors": len(offline),
            },
        )]

    async def _check_ingest_volume(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/account/status")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sumo_logic.ingest.volume", "Log ingest volume",
                "audit_logging",
                "The credentials cannot read account status. Verify "
                "the access key has the Administrator role.",
            )]
        resp.raise_for_status()
        data = resp.json()
        daily_ingest_gb = data.get("dailyIngestGb", 0)
        plan_limit_gb = data.get("planLimitGb", 0)
        utilisation = (daily_ingest_gb / plan_limit_gb * 100) if plan_limit_gb else 0
        return [IntegrationFinding(
            check_id="sumo_logic.ingest.volume",
            title="Log ingest volume reviewed",
            description=(
                f"Daily ingest: {daily_ingest_gb:.1f} GB of "
                f"{plan_limit_gb:.1f} GB plan limit "
                f"({utilisation:.0f}% utilisation)."
            ),
            remediation=(
                "Monitor ingest volume to avoid hitting plan limits. "
                "Consider upgrading or trimming noisy sources."
            ),
            status="PASSED" if utilisation < 90 else "WARNING",
            severity="HIGH" if utilisation >= 90 else "INFO",
            check_category="audit_logging",
            result_details={
                "daily_ingest_gb": daily_ingest_gb,
                "plan_limit_gb": plan_limit_gb,
                "utilisation_pct": round(utilisation, 1),
            },
        )]

    async def _check_scheduled_searches(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/scheduledViews", limit="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sumo_logic.searches.scheduled", "Scheduled search count",
                "incident_response",
                "The credentials cannot list scheduled views. Verify "
                "the access key has the appropriate role.",
            )]
        resp.raise_for_status()
        data = resp.json()
        views = data.get("scheduledViews", [])
        total = len(views)
        disabled = [v for v in views if v.get("status", "").lower() == "disabled"]
        return [IntegrationFinding(
            check_id="sumo_logic.searches.scheduled",
            title="Scheduled searches reviewed",
            description=(
                f"{total} scheduled search(es) found; {len(disabled)} disabled."
            ),
            remediation=(
                "Enable disabled scheduled searches or remove stale ones. "
                "Ensure critical log queries run on schedule."
            ),
            status="PASSED" if total > 0 and not disabled else "WARNING",
            severity="MEDIUM" if disabled else "INFO",
            check_category="incident_response",
            result_details={
                "total_scheduled": total,
                "disabled_count": len(disabled),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Sumo Logic with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
