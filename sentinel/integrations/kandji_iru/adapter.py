# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Kandji integration adapter.

Uses httpx against the Kandji REST API. Auth: a read-only API token.
Every call is a GET.

Evidence source: managed devices, blueprints, and library items. Kandji is the
device-management system of record for Apple-focused orgs choosing a modern MDM.

An endpoint the tenant does not expose returns NOT_AVAILABLE rather than a
guess -- a compliance platform reporting PASSED for a check it could not run
is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                             | check_category            | Controls mapped                              |
+------------------------------------------------------+---------------------------+----------------------------------------------+
| kandji_iru.devices.endpoint_protection               | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.8.1 * PCI 5.2       |
| kandji_iru.devices.encryption_at_rest                | encryption_at_rest        | SOC2 CC6.1 * ISO27001 A.10.1.1 * PCI 3.4    |
| kandji_iru.devices.vulnerability_management          | vulnerability_management  | SOC2 CC7.1 * ISO27001 A.12.6.1 * PCI 6.2    |
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
class KandjiIruCredentials:
    """Matches dashboard/src/integrations/kandji_iru/config.ts credentialFields."""

    subdomain_url: str
    api_token: str

    def base_url(self) -> str:
        return self.subdomain_url.rstrip("/")


class KandjiIruAdapter:
    """Fetches device posture from Kandji.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: KandjiIruCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            f"{self.credentials.base_url()}{path}",
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
            resp = await self._get(client, "/api/v1/devices", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Kandji rejected the API token for {self.credentials.subdomain_url!r} "
                    f"(HTTP {resp.status_code}). Check the token is active and has "
                    "read-only access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach Kandji at {self.credentials.subdomain_url!r}: {exc}"
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
                self._check_encryption_at_rest(client),
                self._check_vulnerability_management(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("kandji_iru check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ---------------------------------------------------------------

    async def _check_endpoint_protection(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Device status across the Kandji fleet."""
        resp = await self._get(client, "/api/v1/devices", limit=300)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "kandji_iru.devices.endpoint_protection",
                "Managed devices report healthy status",
                "endpoint_protection",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        devices = resp.json() if isinstance(resp.json(), list) else resp.json().get("results", [])
        if not devices:
            return [IntegrationFinding(
                check_id="kandji_iru.devices.endpoint_protection",
                title="Managed devices report healthy status",
                description="No devices found in Kandji.",
                remediation="Enroll corporate devices in Kandji to start collecting posture evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="endpoint_protection",
                result_details={"enrolled_count": 0},
            )]
        # Kandji reports a device-level status: PASS, REMEDIATION, ERROR, etc.
        healthy = [d for d in devices if str(d.get("status", "")).upper() == "PASS"]
        total = len(devices)
        rate = len(healthy) / total if total else 0
        passed = rate >= 0.90
        return [IntegrationFinding(
            check_id="kandji_iru.devices.endpoint_protection",
            title="Managed devices report healthy status",
            description=f"{len(healthy)} of {total} devices ({rate:.0%}) report a passing status.",
            remediation=(
                "Investigate devices with REMEDIATION or ERROR status in the Kandji "
                "console. Common causes include missing profiles, failed installs, "
                "or unenforced blueprints."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "healthy_count": len(healthy),
                "total_count": total,
                "rate": round(rate, 4),
            },
        )]

    async def _check_encryption_at_rest(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """FileVault status across the Kandji fleet."""
        resp = await self._get(client, "/api/v1/devices", limit=300)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "kandji_iru.devices.encryption_at_rest",
                "Managed devices have FileVault enabled",
                "encryption_at_rest",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        devices = resp.json() if isinstance(resp.json(), list) else resp.json().get("results", [])
        if not devices:
            return [IntegrationFinding(
                check_id="kandji_iru.devices.encryption_at_rest",
                title="Managed devices have FileVault enabled",
                description="No devices found in Kandji.",
                remediation="Enroll devices to collect FileVault evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="encryption_at_rest",
                result_details={"enrolled_count": 0},
            )]
        encrypted = [d for d in devices if d.get("filevault_enabled") is True]
        total = len(devices)
        rate = len(encrypted) / total if total else 0
        passed = rate >= _ENCRYPTION_RATE_THRESHOLD
        return [IntegrationFinding(
            check_id="kandji_iru.devices.encryption_at_rest",
            title="Managed devices have FileVault enabled",
            description=(
                f"{len(encrypted)} of {total} devices ({rate:.0%}) report FileVault enabled."
            ),
            remediation=(
                "Enable FileVault via a Kandji blueprint library item. Devices without "
                "encryption are a data-at-rest compliance gap."
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

    async def _check_vulnerability_management(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """App and OS update status across the Kandji fleet."""
        resp = await self._get(client, "/api/v1/devices", limit=300)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "kandji_iru.devices.vulnerability_management",
                "Device OS and apps are up to date",
                "vulnerability_management",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        devices = resp.json() if isinstance(resp.json(), list) else resp.json().get("results", [])
        if not devices:
            return [IntegrationFinding(
                check_id="kandji_iru.devices.vulnerability_management",
                title="Device OS and apps are up to date",
                description="No devices found in Kandji.",
                remediation="Enroll devices to collect OS version evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="vulnerability_management",
                result_details={"enrolled_count": 0},
            )]
        pending_updates: list[str] = []
        for d in devices:
            if d.get("pending_software_updates") or d.get("os_version_pending"):
                name = d.get("device_name") or d.get("serial_number", "unknown")
                pending_updates.append(name)
        passed = not pending_updates
        return [IntegrationFinding(
            check_id="kandji_iru.devices.vulnerability_management",
            title="Device OS and apps are up to date",
            description=(
                f"{len(pending_updates)} of {len(devices)} devices have pending "
                "software or OS updates."
            ),
            remediation=(
                "Review pending updates in the Kandji console and enforce automatic "
                "OS and app updates via blueprint configurations."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "pending_update_count": len(pending_updates),
                "total_count": len(devices),
                "sample": pending_updates[:20],
            },
        )]

    # -- helpers --------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Kandji with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
