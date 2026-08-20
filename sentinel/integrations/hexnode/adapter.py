# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Hexnode UEM integration adapter.

Uses httpx against the Hexnode UEM REST API. Auth: an API access token.
Every call is a GET.

Evidence source: managed devices, policies, and device groups. Hexnode is a
unified endpoint management platform supporting Apple, Android, Windows and
Fire OS devices.

An endpoint the tenant does not expose returns NOT_AVAILABLE rather than a
guess -- a compliance platform reporting PASSED for a check it could not run
is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                             | check_category            | Controls mapped                              |
+------------------------------------------------------+---------------------------+----------------------------------------------+
| hexnode.devices.endpoint_protection                  | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.8.1 * PCI 5.2       |
| hexnode.devices.encryption_at_rest                   | encryption_at_rest        | SOC2 CC6.1 * ISO27001 A.10.1.1 * PCI 3.4    |
| hexnode.devices.vulnerability_management             | vulnerability_management  | SOC2 CC7.1 * ISO27001 A.12.6.1 * PCI 6.2    |
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
class HexnodeCredentials:
    """Matches dashboard/src/integrations/hexnode/config.ts credentialFields."""

    subdomain: str
    api_token: str

    def base_url(self) -> str:
        clean = self.subdomain.strip().rstrip("/")
        if clean.startswith("http"):
            return clean
        return f"https://{clean}.hexnodemdm.com"


class HexnodeAdapter:
    """Fetches device posture from Hexnode UEM.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: HexnodeCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # -- HTTP plumbing --------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": self.credentials.api_token,
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api/v1{path}",
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
            resp = await self._get(client, "/devices/", per_page=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Hexnode rejected the API token for {self.credentials.base_url()!r} "
                    f"(HTTP {resp.status_code}). Check the token is active."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach Hexnode at {self.credentials.base_url()!r}: {exc}"
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
                logger.warning("hexnode check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ---------------------------------------------------------------

    async def _check_endpoint_protection(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Device compliance status across the Hexnode fleet."""
        resp = await self._get(client, "/devices/", per_page=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "hexnode.devices.endpoint_protection",
                "Managed devices report compliant status",
                "endpoint_protection",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload.get("results", []) if isinstance(payload, dict) else payload
        if not devices:
            return [IntegrationFinding(
                check_id="hexnode.devices.endpoint_protection",
                title="Managed devices report compliant status",
                description="No devices found in Hexnode.",
                remediation="Enroll corporate devices in Hexnode to start collecting posture evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="endpoint_protection",
                result_details={"enrolled_count": 0},
            )]
        compliant = [d for d in devices if str(d.get("compliance_status", "")).lower() in ("compliant", "true") or d.get("is_compliant") is True]
        total = len(devices)
        rate = len(compliant) / total if total else 0
        passed = rate >= 0.90
        return [IntegrationFinding(
            check_id="hexnode.devices.endpoint_protection",
            title="Managed devices report compliant status",
            description=f"{len(compliant)} of {total} devices ({rate:.0%}) are compliant.",
            remediation=(
                "Investigate non-compliant devices in the Hexnode console. Address "
                "policy violations and enforce security baselines."
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
        """Encryption policy status across the Hexnode fleet."""
        resp = await self._get(client, "/devices/", per_page=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "hexnode.devices.encryption_at_rest",
                "Managed devices have encryption enabled",
                "encryption_at_rest",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload.get("results", []) if isinstance(payload, dict) else payload
        if not devices:
            return [IntegrationFinding(
                check_id="hexnode.devices.encryption_at_rest",
                title="Managed devices have encryption enabled",
                description="No devices found in Hexnode.",
                remediation="Enroll devices to collect encryption evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="encryption_at_rest",
                result_details={"enrolled_count": 0},
            )]
        encrypted = [d for d in devices if d.get("is_encrypted") is True or d.get("encryption_status") is True]
        total = len(devices)
        rate = len(encrypted) / total if total else 0
        passed = rate >= _ENCRYPTION_RATE_THRESHOLD
        return [IntegrationFinding(
            check_id="hexnode.devices.encryption_at_rest",
            title="Managed devices have encryption enabled",
            description=(
                f"{len(encrypted)} of {total} devices ({rate:.0%}) report encryption enabled."
            ),
            remediation=(
                "Enforce disk encryption via a Hexnode policy for all platforms. "
                "Devices without encryption are a data-at-rest compliance gap."
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
        """OS version currency across the Hexnode fleet."""
        resp = await self._get(client, "/devices/", per_page=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "hexnode.devices.vulnerability_management",
                "Device OS versions are current",
                "vulnerability_management",
                "Grant the API token read access to devices.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload.get("results", []) if isinstance(payload, dict) else payload
        if not devices:
            return [IntegrationFinding(
                check_id="hexnode.devices.vulnerability_management",
                title="Device OS versions are current",
                description="No devices found in Hexnode.",
                remediation="Enroll devices to collect OS version evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="vulnerability_management",
                result_details={"enrolled_count": 0},
            )]
        outdated: list[str] = []
        for d in devices:
            if d.get("os_update_available") is True or d.get("os_update_pending") is True:
                name = d.get("device_name") or d.get("serial_number", "unknown")
                outdated.append(name)
        passed = not outdated
        return [IntegrationFinding(
            check_id="hexnode.devices.vulnerability_management",
            title="Device OS versions are current",
            description=(
                f"{len(outdated)} of {len(devices)} devices have pending OS updates."
            ),
            remediation=(
                "Enforce OS update policies in Hexnode to ensure devices run supported "
                "and patched operating system versions."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "outdated_count": len(outdated),
                "total_count": len(devices),
                "sample": outdated[:20],
            },
        )]

    # -- helpers --------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Hexnode with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
