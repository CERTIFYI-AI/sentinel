# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Splunk Enterprise (on-prem) integration adapter.

Reads SIEM posture from a self-hosted Splunk Enterprise REST API:
forwarder status, index data volume, and license usage for audit
logging and incident response evidence.

Auth: a Bearer token against the management port of the Splunk
Enterprise search head.
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
class SplunkEnterpriseCredentials:
    """Matches dashboard/src/integrations/splunk_enterprise/config.ts credentialFields."""

    instance_url: str
    api_token: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")


class SplunkEnterpriseAdapter:
    """Fetches SIEM posture from Splunk Enterprise (on-prem)."""

    def __init__(self, credentials: SplunkEnterpriseCredentials, client: httpx.AsyncClient | None = None) -> None:
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
                    "Splunk Enterprise rejected the token for "
                    f"{self.credentials.instance_url!r} "
                    f"(HTTP {resp.status_code}). Verify the token and "
                    "that the user has the appropriate role."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Splunk Enterprise: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_forwarder_status(client),
                self._check_index_data_volume(client),
                self._check_license_usage(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("splunk_enterprise check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_forwarder_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/deployment/server/clients", count="0")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "splunk_enterprise.forwarders.status",
                "Forwarder status",
                "audit_logging",
                "The token cannot list deployment clients. Grant the user "
                "the admin_all_objects or list_deployment_client capability.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("entry", [])
        inactive = [
            e for e in entries
            if e.get("content", {}).get("utsMode") == "disabled"
        ]
        return [IntegrationFinding(
            check_id="splunk_enterprise.forwarders.status",
            title="Forwarder connectivity reviewed",
            description=(
                f"{len(entries)} forwarder(s) registered, {len(inactive)} inactive."
            ),
            remediation=(
                "Investigate inactive forwarders to restore log collection "
                "from all expected sources."
            ),
            status="PASSED" if not inactive else "WARNING",
            severity="MEDIUM" if inactive else "INFO",
            check_category="audit_logging",
            result_details={
                "total_forwarders": len(entries),
                "inactive_forwarders": len(inactive),
            },
        )]

    async def _check_index_data_volume(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/data/indexes", count="0")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "splunk_enterprise.indexes.data_volume",
                "Index data volume",
                "audit_logging",
                "The token cannot list indexes. Grant the user "
                "indexes_list capability.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("entry", [])
        empty = [
            e for e in entries
            if e.get("content", {}).get("totalEventCount", "0") == "0"
            and not e.get("content", {}).get("disabled")
        ]
        return [IntegrationFinding(
            check_id="splunk_enterprise.indexes.data_volume",
            title="Index data volume reviewed",
            description=(
                f"{len(entries)} index(es) found, {len(empty)} enabled but "
                "contain no events."
            ),
            remediation=(
                "Review empty indexes: verify that the expected data "
                "sources are forwarding events."
            ),
            status="PASSED" if not empty else "WARNING",
            severity="MEDIUM" if empty else "INFO",
            check_category="audit_logging",
            result_details={
                "total_indexes": len(entries),
                "empty_indexes": len(empty),
            },
        )]

    async def _check_license_usage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/licenser/pools")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "splunk_enterprise.license.usage",
                "License usage",
                "incident_response",
                "The token cannot read license information. Grant the "
                "user the list_licenser_pools capability.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("entry", [])
        over_limit = []
        for pool in entries:
            content = pool.get("content", {})
            used = int(content.get("used_bytes", 0))
            quota = int(content.get("effective_quota", 1))
            if quota > 0 and used / quota > 0.9:
                over_limit.append(pool.get("name", "unknown"))
        return [IntegrationFinding(
            check_id="splunk_enterprise.license.usage",
            title="License usage reviewed",
            description=(
                f"{len(entries)} license pool(s) checked; {len(over_limit)} "
                "above 90% usage."
            ),
            remediation=(
                "Review license pools approaching their quota. Consider "
                "reducing ingestion volume or upgrading the license."
            ),
            status="PASSED" if not over_limit else "WARNING",
            severity="HIGH" if over_limit else "INFO",
            check_category="incident_response",
            result_details={
                "total_pools": len(entries),
                "pools_over_90_pct": len(over_limit),
                "pool_names": over_limit[:10],
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Splunk Enterprise with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
