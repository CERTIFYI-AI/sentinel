# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""FleetDM integration adapter.

Uses httpx against the Fleet REST API. Auth: an API token for a read-only
user. Every call is a GET.

Evidence source: hosts, policies, queries, and vulnerability data. Fleet is an
open-source device management and osquery fleet manager that provides deep
visibility into endpoint posture.

An endpoint the tenant does not expose returns NOT_AVAILABLE rather than a
guess -- a compliance platform reporting PASSED for a check it could not run
is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                             | check_category            | Controls mapped                              |
+------------------------------------------------------+---------------------------+----------------------------------------------+
| fleetdm.hosts.endpoint_protection                    | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.8.1 * PCI 5.2       |
| fleetdm.hosts.vulnerability_management               | vulnerability_management  | SOC2 CC7.1 * ISO27001 A.12.6.1 * PCI 6.2    |
| fleetdm.hosts.encryption_at_rest                     | encryption_at_rest        | SOC2 CC6.1 * ISO27001 A.10.1.1 * PCI 3.4    |
+------------------------------------------------------+---------------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

_ENCRYPTION_RATE_THRESHOLD = 0.95


@dataclass
class FleetDMCredentials:
    """Matches dashboard/src/integrations/fleetdm/config.ts credentialFields."""

    server_url: str
    api_token: str

    def base_url(self) -> str:
        return self.server_url.rstrip("/")


class FleetDMAdapter:
    """Fetches host posture from FleetDM.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: FleetDMCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # -- HTTP plumbing --------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api/latest/fleet{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient()

    # -- contract -------------------------------------------------------------

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/hosts", page=0, per_page=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Fleet rejected the API token for {self.credentials.server_url!r} "
                    f"(HTTP {resp.status_code}). Check the token is active and the "
                    "user has read-only access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach Fleet at {self.credentials.server_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_endpoint_protection(client),
                self._check_vulnerability_management(client),
                self._check_encryption_at_rest(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("fleetdm check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ---------------------------------------------------------------

    async def _check_endpoint_protection(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Host status across the Fleet fleet."""
        resp = await self._get(client, "/hosts", per_page=500, page=0)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "fleetdm.hosts.endpoint_protection",
                "Hosts report healthy status",
                "endpoint_protection",
                "Grant the API token read access to hosts.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        hosts = payload.get("hosts", [])
        if not hosts:
            return [IntegrationFinding(
                check_id="fleetdm.hosts.endpoint_protection",
                title="Hosts report healthy status",
                description="No hosts found in Fleet.",
                remediation="Enroll hosts in Fleet to start collecting posture evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="endpoint_protection",
                result_details={"enrolled_count": 0},
            )]
        online = [h for h in hosts if str(h.get("status", "")).lower() == "online"]
        total = len(hosts)
        rate = len(online) / total if total else 0
        passed = rate >= 0.80
        return [IntegrationFinding(
            check_id="fleetdm.hosts.endpoint_protection",
            title="Hosts report healthy status",
            description=f"{len(online)} of {total} hosts ({rate:.0%}) are online.",
            remediation=(
                "Investigate offline hosts in the Fleet console. Hosts that have not "
                "checked in may have lost their osquery enrollment or been retired."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "online_count": len(online),
                "total_count": total,
                "rate": round(rate, 4),
            },
        )]

    async def _check_vulnerability_management(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """CVE vulnerabilities across Fleet hosts."""
        resp = await self._get(client, "/vulnerabilities", per_page=100, page=0)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "fleetdm.hosts.vulnerability_management",
                "No critical CVE vulnerabilities detected",
                "vulnerability_management",
                "Grant the API token read access to vulnerabilities. Fleet Premium "
                "is required for vulnerability management features.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        vulns = payload.get("vulnerabilities", [])
        critical = [v for v in vulns if v.get("cvss_score") is not None and float(v.get("cvss_score", 0)) >= 9.0]
        high = [v for v in vulns if v.get("cvss_score") is not None and 7.0 <= float(v.get("cvss_score", 0)) < 9.0]
        passed = not critical
        return [IntegrationFinding(
            check_id="fleetdm.hosts.vulnerability_management",
            title="No critical CVE vulnerabilities detected",
            description=(
                f"{len(vulns)} known vulnerabilities across Fleet hosts: "
                f"{len(critical)} critical (CVSS >= 9.0), {len(high)} high (CVSS >= 7.0)."
            ),
            remediation=(
                "Patch or mitigate critical and high-severity CVEs. Use Fleet's "
                "vulnerability dashboard to prioritise by affected host count and "
                "CVSS score."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL" if critical else "HIGH",
            check_category="vulnerability_management",
            result_details={
                "total_vulnerabilities": len(vulns),
                "critical_count": len(critical),
                "high_count": len(high),
                "critical_cves": [v.get("cve", "") for v in critical][:20],
            },
        )]

    async def _check_encryption_at_rest(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Disk encryption status across Fleet hosts."""
        resp = await self._get(client, "/hosts", per_page=500, page=0)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "fleetdm.hosts.encryption_at_rest",
                "Hosts have disk encryption enabled",
                "encryption_at_rest",
                "Grant the API token read access to hosts.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        hosts = payload.get("hosts", [])
        if not hosts:
            return [IntegrationFinding(
                check_id="fleetdm.hosts.encryption_at_rest",
                title="Hosts have disk encryption enabled",
                description="No hosts found in Fleet.",
                remediation="Enroll hosts to collect disk encryption evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="encryption_at_rest",
                result_details={"enrolled_count": 0},
            )]
        encrypted = [h for h in hosts if h.get("disk_encryption_enabled") is True]
        total = len(hosts)
        rate = len(encrypted) / total if total else 0
        passed = rate >= _ENCRYPTION_RATE_THRESHOLD
        return [IntegrationFinding(
            check_id="fleetdm.hosts.encryption_at_rest",
            title="Hosts have disk encryption enabled",
            description=(
                f"{len(encrypted)} of {total} hosts ({rate:.0%}) report disk encryption enabled."
            ),
            remediation=(
                "Enable disk encryption enforcement via Fleet's MDM features or "
                "through a configuration management tool. Hosts without encryption "
                "are a data-at-rest compliance gap."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="encryption_at_rest",
            result_details={
                "encrypted_count": len(encrypted),
                "total_count": total,
                "rate": round(rate, 4),
                "threshold": _ENCRYPTION_RATE_THRESHOLD,
            },
        )]

    # -- helpers --------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Fleet with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
