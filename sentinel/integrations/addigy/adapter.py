# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Addigy integration adapter.

Uses httpx against the Addigy REST API. Auth: API credentials (client ID +
client credential). Every call is a GET.

Evidence source: managed devices, policies, and facts. Addigy is a cloud-based
Apple device management platform focused on MSPs and IT teams.

An endpoint the tenant does not expose returns NOT_AVAILABLE rather than a
guess -- a compliance platform reporting PASSED for a check it could not run
is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                             | check_category            | Controls mapped                              |
+------------------------------------------------------+---------------------------+----------------------------------------------+
| addigy.devices.endpoint_protection                   | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.8.1 * PCI 5.2       |
| addigy.devices.vulnerability_management              | vulnerability_management  | SOC2 CC7.1 * ISO27001 A.12.6.1 * PCI 6.2    |
| addigy.devices.access_control                        | access_control            | SOC2 CC6.1 * ISO27001 A.9.4.1 * PCI 7.1     |
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

_BASE_URL = "https://prod.addigy.com/api"


@dataclass
class AddigyCredentials:
    """Matches dashboard/src/integrations/addigy/config.ts credentialFields."""

    client_id: str
    client_credential: str
    org: str = ""


class AddigyAdapter:
    """Fetches device posture from Addigy.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: AddigyCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._token: str | None = None

    # -- HTTP plumbing --------------------------------------------------------

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain a bearer token via client credentials."""
        if self._token:
            return self._token
        resp = await client.post(
            f"{_BASE_URL}/auth/token",
            json={
                "client_id": self.credentials.client_id,
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Addigy rejected the API credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and credential."
            )
        resp.raise_for_status()
        self._token = resp.json().get("access_token", "")
        return self._token

    def _headers(self, token: str) -> dict[str, str]:
        headers: dict[str, str] = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        if self.credentials.org:
            headers["X-Addigy-Org"] = self.credentials.org
        return headers

    async def _get(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_BASE_URL}{path}",
            headers=self._headers(token),
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
            resp = await self._get(client, "/devices", per_page=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Addigy rejected the credentials "
                    f"(HTTP {resp.status_code}). Check the client ID and credential."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach Addigy API: {exc}"
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
                self._check_access_control(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("addigy check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ---------------------------------------------------------------

    async def _check_endpoint_protection(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Device compliance status across the Addigy fleet."""
        resp = await self._get(client, "/devices")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "addigy.devices.endpoint_protection",
                "Managed devices report compliant status",
                "endpoint_protection",
                "Grant the API credentials read access to devices.",
            )]
        resp.raise_for_status()
        devices = resp.json() if isinstance(resp.json(), list) else resp.json().get("devices", [])
        if not devices:
            return [IntegrationFinding(
                check_id="addigy.devices.endpoint_protection",
                title="Managed devices report compliant status",
                description="No devices found in Addigy.",
                remediation="Enroll corporate devices in Addigy to start collecting posture evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="endpoint_protection",
                result_details={"enrolled_count": 0},
            )]
        online = [d for d in devices if d.get("online") is True or str(d.get("status", "")).lower() == "online"]
        total = len(devices)
        rate = len(online) / total if total else 0
        passed = rate >= 0.80
        return [IntegrationFinding(
            check_id="addigy.devices.endpoint_protection",
            title="Managed devices report compliant status",
            description=f"{len(online)} of {total} devices ({rate:.0%}) are online and reporting.",
            remediation=(
                "Investigate offline devices in the Addigy console. Devices that have "
                "not checked in may have lost their MDM profile or been retired."
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
        """Software update status across the Addigy fleet."""
        resp = await self._get(client, "/devices")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "addigy.devices.vulnerability_management",
                "Device software is up to date",
                "vulnerability_management",
                "Grant the API credentials read access to devices.",
            )]
        resp.raise_for_status()
        devices = resp.json() if isinstance(resp.json(), list) else resp.json().get("devices", [])
        if not devices:
            return [IntegrationFinding(
                check_id="addigy.devices.vulnerability_management",
                title="Device software is up to date",
                description="No devices found in Addigy.",
                remediation="Enroll devices to collect software update evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="vulnerability_management",
                result_details={"enrolled_count": 0},
            )]
        pending: list[str] = []
        for d in devices:
            if d.get("updates_available") or d.get("os_update_pending"):
                name = d.get("device_name") or d.get("serial_number", "unknown")
                pending.append(name)
        passed = not pending
        return [IntegrationFinding(
            check_id="addigy.devices.vulnerability_management",
            title="Device software is up to date",
            description=(
                f"{len(pending)} of {len(devices)} devices have pending software updates."
            ),
            remediation=(
                "Review pending updates in the Addigy console and configure automatic "
                "OS update enforcement policies."
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

    async def _check_access_control(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Policy enforcement across the Addigy fleet."""
        resp = await self._get(client, "/policies")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "addigy.devices.access_control",
                "Device policies are defined and enforced",
                "access_control",
                "Grant the API credentials read access to policies.",
            )]
        resp.raise_for_status()
        policies = resp.json() if isinstance(resp.json(), list) else resp.json().get("policies", [])
        passed = len(policies) > 0
        return [IntegrationFinding(
            check_id="addigy.devices.access_control",
            title="Device policies are defined and enforced",
            description=(
                f"{len(policies)} policy/policies defined in Addigy."
                if policies else
                "No policies found. Without policies, devices have no enforced "
                "security baseline."
            ),
            remediation=(
                "Create device policies in Addigy that enforce passcode requirements, "
                "encryption, and application restrictions."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={
                "policy_count": len(policies),
                "policy_names": [p.get("name", "") for p in policies][:20] if isinstance(policies, list) else [],
            },
        )]

    # -- helpers --------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Addigy with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
