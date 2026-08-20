# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Grafana integration adapter.

Reads observability posture from a Grafana instance: alert rules, alert
state, and dashboard audit for compliance evidence.
Auth: server_url + api_token (service account token from Grafana >
Administration > Service Accounts).
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
class GrafanaCredentials:
    """Matches dashboard/src/integrations/grafana/config.ts credentialFields."""

    server_url: str
    api_token: str

    def base_url(self) -> str:
        return self.server_url.rstrip("/")


class GrafanaAdapter:
    """Fetches observability posture from Grafana."""

    def __init__(self, credentials: GrafanaCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            f"{self.credentials.base_url()}/api{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/org")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Grafana rejected the API token. Verify the service account "
                    "token is active and has Viewer role or above."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not reach Grafana at {self.credentials.server_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_alert_rules(client),
                self._check_firing_alerts(client),
                self._check_dashboard_audit(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("grafana check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_alert_rules(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v1/provisioning/alert-rules")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "grafana.alerts.rule_count",
                "Alert rule configuration",
                "audit_logging",
                "Grant the service account read access to alert rules "
                "(Viewer role on the Alerting resources).",
            )]
        resp.raise_for_status()
        data = resp.json()
        rules = data if isinstance(data, list) else data.get("rules", [])
        return [IntegrationFinding(
            check_id="grafana.alerts.rule_count",
            title="Alert rules are configured",
            description=f"{len(rules)} alert rule(s) configured in Grafana.",
            remediation=(
                "Ensure alert rules cover critical infrastructure metrics "
                "so anomalies are detected in time."
            ),
            status="PASSED" if rules else "WARNING",
            severity="MEDIUM" if not rules else "INFO",
            check_category="audit_logging",
            result_details={"rule_count": len(rules)},
        )]

    async def _check_firing_alerts(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/alertmanager/grafana/api/v2/alerts", active="true")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "grafana.alerts.firing_count",
                "Currently firing alerts",
                "vulnerability_management",
                "Grant the service account read access to Alertmanager.",
            )]
        resp.raise_for_status()
        data = resp.json()
        alerts = data if isinstance(data, list) else []
        firing = [a for a in alerts if a.get("status", {}).get("state") == "active"]
        passed = len(firing) == 0
        return [IntegrationFinding(
            check_id="grafana.alerts.firing_count",
            title="No actively firing alerts",
            description=f"{len(firing)} alert(s) currently firing.",
            remediation=(
                "Investigate and resolve firing alerts. Persistent alerts may "
                "indicate infrastructure or application issues."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if firing else "INFO",
            check_category="vulnerability_management",
            result_details={"firing_alert_count": len(firing)},
        )]

    async def _check_dashboard_audit(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/search", type="dash-db", limit=100)
        if resp.status_code == 403:
            return [self._unavailable(
                "grafana.dashboards.audit",
                "Dashboard inventory",
                "audit_logging",
                "Grant the service account Viewer access to dashboards.",
            )]
        resp.raise_for_status()
        data = resp.json()
        dashboards = data if isinstance(data, list) else []
        return [IntegrationFinding(
            check_id="grafana.dashboards.audit",
            title="Dashboard inventory accessible for audit",
            description=(
                f"{len(dashboards)} dashboard(s) enumerable for compliance audit."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"dashboard_count": len(dashboards)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Grafana with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
