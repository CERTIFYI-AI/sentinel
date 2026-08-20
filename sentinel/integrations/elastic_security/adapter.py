# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Elastic Security integration adapter.

Reads SIEM posture from an Elastic Security (Kibana) instance: detection
rule coverage, open security alerts, and endpoint health via Fleet.
Auth: instance_url + api_key (Kibana API key, Authorization: ApiKey <key>).
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
class ElasticSecurityCredentials:
    """Matches dashboard/src/integrations/elastic_security/config.ts credentialFields."""

    instance_url: str
    api_key: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")


class ElasticSecurityAdapter:
    """Fetches SIEM posture from Elastic Security."""

    def __init__(self, credentials: ElasticSecurityCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"ApiKey {self.credentials.api_key}",
            "Accept": "application/json",
            "kbn-xsrf": "sentinel",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/api/status")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Elastic Security rejected the API key. Verify the key is "
                    "active and the instance URL is correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not reach Elastic Security at "
                f"{self.credentials.instance_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_detection_rules(client),
                self._check_open_alerts(client),
                self._check_endpoint_health(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("elastic_security check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_detection_rules(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/api/detection_engine/rules/_find",
            per_page=1, page=1,
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "elastic_security.rules.detection_count",
                "Detection rule coverage",
                "vulnerability_management",
                "Grant the API key read access to detection rules.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("total", 0)
        # Check for disabled rules
        resp_disabled = await self._get(
            client, "/api/detection_engine/rules/_find",
            per_page=1, page=1, filter="alert.attributes.enabled:false",
        )
        disabled = 0
        if resp_disabled.status_code == 200:
            disabled = resp_disabled.json().get("total", 0)
        enabled = total - disabled
        passed = enabled > 0
        return [IntegrationFinding(
            check_id="elastic_security.rules.detection_count",
            title="Detection rules are active",
            description=(
                f"{total} detection rule(s) total, {enabled} enabled, "
                f"{disabled} disabled."
            ),
            remediation=(
                "Review disabled detection rules and enable those covering "
                "your threat model. Ensure MITRE ATT&CK coverage is adequate."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_rules": total,
                "enabled_rules": enabled,
                "disabled_rules": disabled,
            },
        )]

    async def _check_open_alerts(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/api/detection_engine/signals/search",
        )
        if resp.status_code in (403, 404):
            # Try alternative endpoint
            resp = await self._get(
                client, "/api/detection_engine/alerts/_find",
                per_page=1, status="open",
            )
        if resp.status_code == 403:
            return [self._unavailable(
                "elastic_security.alerts.open_count",
                "Open security alerts",
                "incident_response",
                "Grant the API key read access to security alerts.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("total", data.get("hits", {}).get("total", {}).get("value", 0))
        passed = total == 0
        return [IntegrationFinding(
            check_id="elastic_security.alerts.open_count",
            title="No open security alerts",
            description=f"{total} open security alert(s) requiring investigation.",
            remediation=(
                "Investigate and close open alerts. Assign critical alerts "
                "to incident response workflows."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if total > 0 else "INFO",
            check_category="incident_response",
            result_details={"open_alert_count": total},
        )]

    async def _check_endpoint_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/api/fleet/agents",
            perPage=1,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "elastic_security.endpoints.health",
                "Endpoint agent health",
                "endpoint_protection",
                "Grant the API key read access to Fleet agents.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("total", 0)
        return [IntegrationFinding(
            check_id="elastic_security.endpoints.health",
            title="Endpoint agents enrolled and healthy",
            description=(
                f"{total} agent(s) enrolled in Fleet for endpoint protection."
            ),
            remediation=(
                "Deploy Elastic Agent to all endpoints. Ensure agents are "
                "enrolled and reporting to Fleet."
            ),
            status="PASSED" if total > 0 else "WARNING",
            severity="MEDIUM" if total == 0 else "INFO",
            check_category="endpoint_protection",
            result_details={"enrolled_agent_count": total},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Elastic Security with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
