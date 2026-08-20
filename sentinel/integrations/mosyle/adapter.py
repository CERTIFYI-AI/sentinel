# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Mosyle integration adapter.

Uses httpx against the Mosyle REST API. Auth: an API token with read-only
access. Every call is a GET or POST (Mosyle uses POST for some list endpoints).

Evidence source: managed devices, profiles, and installed apps. Mosyle is a
popular MDM for K-12 and enterprise Apple environments.

An endpoint the tenant does not expose returns NOT_AVAILABLE rather than a
guess -- a compliance platform reporting PASSED for a check it could not run
is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                             | check_category            | Controls mapped                              |
+------------------------------------------------------+---------------------------+----------------------------------------------+
| mosyle.devices.endpoint_protection                   | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.8.1 * PCI 5.2       |
| mosyle.devices.encryption_at_rest                    | encryption_at_rest        | SOC2 CC6.1 * ISO27001 A.10.1.1 * PCI 3.4    |
| mosyle.devices.vulnerability_management              | vulnerability_management  | SOC2 CC7.1 * ISO27001 A.12.6.1 * PCI 6.2    |
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

_BASE_URL = "https://managerapi.mosyle.com/v2"

_ENCRYPTION_RATE_THRESHOLD = 0.95


@dataclass
class MosyleCredentials:
    """Matches dashboard/src/integrations/mosyle/config.ts credentialFields."""

    api_token: str
    account: str = ""


class MosyleAdapter:
    """Fetches device posture from Mosyle.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: MosyleCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # -- HTTP plumbing --------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {
            "Authorization": f"Bearer {self.credentials.api_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.credentials.account:
            headers["X-Mosyle-Account"] = self.credentials.account
        return headers

    async def _post(self, client: httpx.AsyncClient, path: str, body: dict | None = None) -> httpx.Response:
        """Mosyle uses POST for most list endpoints."""
        return await client.post(
            f"{_BASE_URL}{path}",
            headers=self._headers(),
            json=body or {},
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
            resp = await self._post(client, "/listdevices", {"os": "mac", "page": 0, "specific_columns": "device_name"})
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Mosyle rejected the API token "
                    f"(HTTP {resp.status_code}). Check the token is active and has "
                    "read-only access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach Mosyle API: {exc}"
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
                logger.warning("mosyle check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ---------------------------------------------------------------

    async def _check_endpoint_protection(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Device compliance status across the Mosyle fleet."""
        resp = await self._post(client, "/listdevices", {"os": "mac", "page": 0})
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "mosyle.devices.endpoint_protection",
                "Managed devices report compliant status",
                "endpoint_protection",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload.get("devices", []) if isinstance(payload, dict) else []
        if not devices:
            return [IntegrationFinding(
                check_id="mosyle.devices.endpoint_protection",
                title="Managed devices report compliant status",
                description="No devices found in Mosyle.",
                remediation="Enroll corporate devices in Mosyle to start collecting posture evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="endpoint_protection",
                result_details={"enrolled_count": 0},
            )]
        compliant = [d for d in devices if str(d.get("compliance_status", "")).lower() == "compliant"]
        total = len(devices)
        rate = len(compliant) / total if total else 0
        passed = rate >= 0.90
        return [IntegrationFinding(
            check_id="mosyle.devices.endpoint_protection",
            title="Managed devices report compliant status",
            description=f"{len(compliant)} of {total} devices ({rate:.0%}) are compliant.",
            remediation=(
                "Investigate non-compliant devices in the Mosyle console. Address "
                "profile installation failures and policy violations."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "compliant_count": len(compliant),
                "total_count": total,
                "rate": round(rate, 4),
            },
        )]

    async def _check_encryption_at_rest(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Encryption status across the Mosyle fleet."""
        resp = await self._post(client, "/listdevices", {"os": "mac", "page": 0})
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "mosyle.devices.encryption_at_rest",
                "Managed devices have encryption enabled",
                "encryption_at_rest",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload.get("devices", []) if isinstance(payload, dict) else []
        if not devices:
            return [IntegrationFinding(
                check_id="mosyle.devices.encryption_at_rest",
                title="Managed devices have encryption enabled",
                description="No devices found in Mosyle.",
                remediation="Enroll devices to collect encryption evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="encryption_at_rest",
                result_details={"enrolled_count": 0},
            )]
        encrypted = [d for d in devices if d.get("encryption_enabled") is True or str(d.get("filevault_status", "")).lower() == "enabled"]
        total = len(devices)
        rate = len(encrypted) / total if total else 0
        passed = rate >= _ENCRYPTION_RATE_THRESHOLD
        return [IntegrationFinding(
            check_id="mosyle.devices.encryption_at_rest",
            title="Managed devices have encryption enabled",
            description=(
                f"{len(encrypted)} of {total} devices ({rate:.0%}) report encryption enabled."
            ),
            remediation=(
                "Enable FileVault via a Mosyle profile and enforce it as a compliance "
                "requirement. Devices without encryption are a data-at-rest gap."
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
        """App update status across the Mosyle fleet."""
        resp = await self._post(client, "/listdevices", {"os": "mac", "page": 0})
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "mosyle.devices.vulnerability_management",
                "Device apps are up to date",
                "vulnerability_management",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload.get("devices", []) if isinstance(payload, dict) else []
        if not devices:
            return [IntegrationFinding(
                check_id="mosyle.devices.vulnerability_management",
                title="Device apps are up to date",
                description="No devices found in Mosyle.",
                remediation="Enroll devices to collect app update evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="vulnerability_management",
                result_details={"enrolled_count": 0},
            )]
        pending: list[str] = []
        for d in devices:
            if d.get("pending_apps_update") or d.get("os_update_available"):
                name = d.get("device_name") or d.get("serial_number", "unknown")
                pending.append(name)
        passed = not pending
        return [IntegrationFinding(
            check_id="mosyle.devices.vulnerability_management",
            title="Device apps are up to date",
            description=(
                f"{len(pending)} of {len(devices)} devices have pending app or OS updates."
            ),
            remediation=(
                "Review pending updates in the Mosyle console and configure automatic "
                "app and OS update enforcement policies."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "pending_count": len(pending),
                "total_count": len(devices),
                "sample": pending[:20],
            },
        )]

    # -- helpers --------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Mosyle with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
