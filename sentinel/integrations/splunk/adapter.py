# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Splunk Cloud integration adapter.

Reads SIEM posture from the Splunk REST API: search job history,
index health, and saved search count for audit logging and incident
response evidence.

Auth: a Bearer token (JWT or Splunk session) against the Splunk Cloud
search head.
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
class SplunkCredentials:
    """Matches dashboard/src/integrations/splunk/config.ts credentialFields."""

    instance_url: str
    api_token: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")


class SplunkAdapter:
    """Fetches SIEM posture from Splunk Cloud."""

    def __init__(self, credentials: SplunkCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_token}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/services{path}",
            headers=self._headers(),
            params={"output_mode": "json", **(params or {})},
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/server/info")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Splunk Cloud rejected the token for "
                    f"{self.credentials.instance_url!r} "
                    f"(HTTP {resp.status_code}). Verify the token is valid "
                    "and the user has the appropriate role."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Splunk Cloud: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_search_job_history(client),
                self._check_index_health(client),
                self._check_saved_search_count(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("splunk check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_search_job_history(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/search/jobs", count="10")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "splunk.jobs.search_history", "Search job history",
                "audit_logging",
                "The token cannot list search jobs. Grant the user "
                "the search capability.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("entry", [])
        failed = [
            e for e in entries
            if e.get("content", {}).get("isFailed") == "1"
        ]
        return [IntegrationFinding(
            check_id="splunk.jobs.search_history",
            title="Search job history reviewed",
            description=(
                f"{len(entries)} recent search job(s), {len(failed)} failed."
            ),
            remediation=(
                "Investigate failed search jobs to ensure log queries "
                "are completing successfully for audit evidence."
            ),
            status="PASSED" if not failed else "WARNING",
            severity="MEDIUM" if failed else "INFO",
            check_category="audit_logging",
            result_details={
                "total_jobs": len(entries),
                "failed_jobs": len(failed),
            },
        )]

    async def _check_index_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/data/indexes", count="0")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "splunk.indexes.health", "Index health",
                "audit_logging",
                "The token cannot list indexes. Grant the user "
                "indexes_list capability.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("entry", [])
        disabled = [
            e for e in entries
            if e.get("content", {}).get("disabled") == "1"
        ]
        return [IntegrationFinding(
            check_id="splunk.indexes.health",
            title="Indexes are healthy and enabled",
            description=(
                f"{len(entries)} index(es) found, {len(disabled)} disabled."
            ),
            remediation=(
                "Review disabled indexes and re-enable any that should be "
                "receiving log data for audit evidence."
            ),
            status="PASSED" if not disabled else "WARNING",
            severity="MEDIUM" if disabled else "INFO",
            check_category="audit_logging",
            result_details={
                "total_indexes": len(entries),
                "disabled_indexes": len(disabled),
            },
        )]

    async def _check_saved_search_count(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/saved/searches", count="0")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "splunk.searches.saved_count", "Saved search count",
                "incident_response",
                "The token cannot list saved searches. Grant the user "
                "the list_search role capability.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("entry", [])
        alerts = [
            e for e in entries
            if e.get("content", {}).get("alert_type")
            or e.get("content", {}).get("is_scheduled") == "1"
        ]
        return [IntegrationFinding(
            check_id="splunk.searches.saved_count",
            title="Saved searches and alert rules configured",
            description=(
                f"{len(entries)} saved search(es), {len(alerts)} configured "
                "as scheduled or alert rules."
            ),
            remediation=(
                "Ensure critical log sources have corresponding saved "
                "searches or alerts so security events generate notifications."
            ),
            status="PASSED" if alerts else "WARNING",
            severity="MEDIUM" if not alerts else "INFO",
            check_category="incident_response",
            result_details={
                "total_saved_searches": len(entries),
                "alert_count": len(alerts),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Splunk Cloud with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
