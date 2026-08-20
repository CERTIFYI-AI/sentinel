# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""LogRhythm integration adapter.

Reads SIEM posture from the LogRhythm Admin API v2: log source
health, alarm count, and case management status for audit logging
and incident response evidence.

Auth: a Bearer API key against a user-provided LogRhythm instance URL.
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
class LogRhythmCredentials:
    """Matches dashboard/src/integrations/logrhythm/config.ts credentialFields."""

    instance_url: str
    api_key: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")


class LogRhythmAdapter:
    """Fetches SIEM posture from LogRhythm."""

    def __init__(self, credentials: LogRhythmCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            f"{self.credentials.base_url()}/lr-admin-api/api/v2{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/logsources", count="1")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "LogRhythm rejected the API key for "
                    f"{self.credentials.instance_url!r} "
                    f"(HTTP {resp.status_code}). Verify the key is valid."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach LogRhythm: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_log_source_health(client),
                self._check_alarm_count(client),
                self._check_case_management(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("logrhythm check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_log_source_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/logsources", count="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "logrhythm.log_sources.health", "Log source health",
                "audit_logging",
                "The API key cannot list log sources. Verify the key "
                "has the LogSourceManager role.",
            )]
        resp.raise_for_status()
        sources = resp.json()
        if not isinstance(sources, list):
            sources = sources.get("logSources", [])
        total = len(sources)
        inactive = [
            s for s in sources
            if s.get("status", {}).get("name", "").lower() not in ("active", "enabled")
            and s.get("recordStatus", "").lower() != "active"
        ]
        return [IntegrationFinding(
            check_id="logrhythm.log_sources.health",
            title="Log source health reviewed",
            description=(
                f"{total} log source(s) found; {len(inactive)} inactive."
            ),
            remediation=(
                "Investigate inactive log sources to restore log "
                "collection from all expected endpoints."
            ),
            status="PASSED" if not inactive else "WARNING",
            severity="MEDIUM" if inactive else "INFO",
            check_category="audit_logging",
            result_details={
                "total_log_sources": total,
                "inactive_sources": len(inactive),
            },
        )]

    async def _check_alarm_count(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/alarms", count="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "logrhythm.alarms.count", "Alarm count",
                "incident_response",
                "The API key cannot list alarms. Verify the key "
                "has the AlarmManager role.",
            )]
        resp.raise_for_status()
        alarms = resp.json()
        if not isinstance(alarms, list):
            alarms = alarms.get("alarms", [])
        total = len(alarms)
        new_alarms = [
            a for a in alarms
            if a.get("alarmStatus", {}).get("name", "").lower() == "new"
            or a.get("status", "").lower() == "new"
        ]
        return [IntegrationFinding(
            check_id="logrhythm.alarms.count",
            title="Alarm count reviewed",
            description=(
                f"{total} alarm(s) found; {len(new_alarms)} in 'new' status."
            ),
            remediation=(
                "Triage new alarms promptly. Ensure all alarms are "
                "acknowledged and investigated within SLA."
            ),
            status="PASSED" if not new_alarms else "WARNING",
            severity="HIGH" if new_alarms else "INFO",
            check_category="incident_response",
            result_details={
                "total_alarms": total,
                "new_alarms": len(new_alarms),
            },
        )]

    async def _check_case_management(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/cases", count="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "logrhythm.cases.management", "Case management status",
                "incident_response",
                "The API key cannot list cases. Verify the key "
                "has the CaseManager role.",
            )]
        resp.raise_for_status()
        cases = resp.json()
        if not isinstance(cases, list):
            cases = cases.get("cases", [])
        total = len(cases)
        open_cases = [
            c for c in cases
            if c.get("status", {}).get("name", "").lower() in ("created", "open", "incident")
            or c.get("statusName", "").lower() in ("created", "open", "incident")
        ]
        return [IntegrationFinding(
            check_id="logrhythm.cases.management",
            title="Case management status reviewed",
            description=(
                f"{total} case(s) found; {len(open_cases)} open or in-progress."
            ),
            remediation=(
                "Review open cases and ensure they are being actively "
                "investigated and resolved."
            ),
            status="PASSED" if total >= 0 else "WARNING",
            severity="INFO",
            check_category="incident_response",
            result_details={
                "total_cases": total,
                "open_cases": len(open_cases),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from LogRhythm with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
