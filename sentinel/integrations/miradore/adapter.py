# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Miradore integration adapter.

Uses httpx against the Miradore REST API.
Auth: API key (read-only) scoped to a site subdomain.

Evidence source: devices, profiles, compliance status. Miradore is a cloud-based
MDM providing device compliance, encryption status and OS update tracking.

An endpoint the org's plan does not expose returns NOT_AVAILABLE rather than a
guess.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+--------------------------------------------+---------------------------+--------------------------------------------+
| check_id                                   | check_category            | Controls mapped                            |
+--------------------------------------------+---------------------------+--------------------------------------------+
| miradore.devices.compliance_status         | endpoint_protection       | SOC2 CC6.8 . ISO27001 A.8.1               |
| miradore.devices.encryption_status         | encryption_at_rest        | SOC2 CC6.1 . ISO27001 A.10.1.1 . PCI 3.4  |
| miradore.devices.os_update_status          | vulnerability_management  | SOC2 CC7.1 . ISO27001 A.12.6.1 . PCI 6.2  |
+--------------------------------------------+---------------------------+--------------------------------------------+
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
class MiradoreCredentials:
    """Matches dashboard/src/integrations/miradore/config.ts credentialFields."""

    site: str
    api_token: str

    def base_url(self) -> str:
        return f"https://{self.site}.online.miradore.com"


class MiradoreAdapter:
    """Fetches device posture from Miradore.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: MiradoreCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # -- HTTP plumbing -------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient()

    # -- contract ------------------------------------------------------------

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/devices", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Miradore rejected the API token for site {self.credentials.site!r} "
                    f"(HTTP {resp.status_code}). Check the token is active and has "
                    "read access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach Miradore at {self.credentials.base_url()!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_compliance(client),
                self._check_encryption(client),
                self._check_os_updates(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("miradore check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks --------------------------------------------------------------

    async def _check_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/devices")
        if resp.status_code == 403:
            return [self._unavailable(
                "miradore.devices.compliance_status", "Device compliance status",
                "endpoint_protection",
                "The API token cannot read devices. Grant read access to the "
                "device inventory.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload if isinstance(payload, list) else payload.get("Content", payload.get("results", []))
        total = len(devices)
        non_compliant = [d for d in devices if str(d.get("ComplianceStatus", d.get("complianceStatus", ""))).upper() != "COMPLIANT"]
        passed = len(non_compliant) == 0
        return [IntegrationFinding(
            check_id="miradore.devices.compliance_status",
            title="Managed devices are compliant",
            description=(
                f"All {total} managed device(s) report compliant status."
                if passed else
                f"{len(non_compliant)} of {total} managed device(s) are non-compliant."
            ),
            remediation=(
                "Review non-compliant devices in Miradore. Ensure compliance profiles "
                "are assigned and devices meet policy requirements."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "total_devices": total,
                "non_compliant_count": len(non_compliant),
                "non_compliant_sample": [d.get("Name", d.get("name", d.get("id"))) for d in non_compliant][:20],
            },
        )]

    async def _check_encryption(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/devices")
        if resp.status_code == 403:
            return [self._unavailable(
                "miradore.devices.encryption_status", "Device encryption status",
                "encryption_at_rest",
                "The API token cannot read device encryption data. Grant read access "
                "to the device inventory.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload if isinstance(payload, list) else payload.get("Content", payload.get("results", []))
        total = len(devices)
        unencrypted = [d for d in devices if not d.get("IsEncrypted", d.get("isEncrypted", True))]
        passed = len(unencrypted) == 0
        return [IntegrationFinding(
            check_id="miradore.devices.encryption_status",
            title="Managed devices have disk encryption enabled",
            description=(
                f"All {total} managed device(s) report disk encryption enabled."
                if passed else
                f"{len(unencrypted)} of {total} managed device(s) do not have disk "
                "encryption enabled."
            ),
            remediation=(
                "Enable disk encryption on unencrypted devices. Deploy a configuration "
                "profile enforcing BitLocker (Windows) or FileVault (macOS) through "
                "Miradore."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="encryption_at_rest",
            result_details={
                "total_devices": total,
                "unencrypted_count": len(unencrypted),
                "unencrypted_sample": [d.get("Name", d.get("name", d.get("id"))) for d in unencrypted][:20],
            },
        )]

    async def _check_os_updates(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/devices")
        if resp.status_code == 403:
            return [self._unavailable(
                "miradore.devices.os_update_status", "OS update status",
                "vulnerability_management",
                "The API token cannot read device data. Grant read access to the "
                "device inventory.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload if isinstance(payload, list) else payload.get("Content", payload.get("results", []))
        total = len(devices)
        outdated = [d for d in devices if d.get("IsOsUpdateAvailable", d.get("isOsUpdateAvailable", False))]
        passed = len(outdated) == 0
        return [IntegrationFinding(
            check_id="miradore.devices.os_update_status",
            title="Managed devices are running current OS versions",
            description=(
                f"All {total} managed device(s) are running current OS versions."
                if passed else
                f"{len(outdated)} of {total} managed device(s) have OS updates available."
            ),
            remediation=(
                "Deploy pending OS updates through Miradore. Prioritise security "
                "updates to reduce the vulnerability window."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={
                "total_devices": total,
                "outdated_count": len(outdated),
                "outdated_sample": [d.get("Name", d.get("name", d.get("id"))) for d in outdated][:20],
            },
        )]

    # -- helpers -------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Miradore with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
