# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Omnissa Workspace ONE UEM integration adapter.

Uses httpx against the Workspace ONE UEM REST API.
Auth: API key (aw-tenant-code) plus admin credentials (read-only).

Evidence source: devices, profiles, compliance policies. Workspace ONE UEM
(formerly VMware, now Omnissa) provides device compliance, encryption policy
enforcement and profile assignment tracking.

An endpoint the org's plan does not expose returns NOT_AVAILABLE rather than a
guess.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------------------+---------------------------+--------------------------------------------+
| check_id                                             | check_category            | Controls mapped                            |
+------------------------------------------------------+---------------------------+--------------------------------------------+
| omnissa_workspace_one.devices.compliance_status      | endpoint_protection       | SOC2 CC6.8 . ISO27001 A.8.1               |
| omnissa_workspace_one.devices.encryption_policy      | encryption_at_rest        | SOC2 CC6.1 . ISO27001 A.10.1.1 . PCI 3.4  |
| omnissa_workspace_one.profiles.assignment_status     | access_control            | SOC2 CC6.1 . ISO27001 A.12.5.1            |
+------------------------------------------------------+---------------------------+--------------------------------------------+
"""

from __future__ import annotations

import asyncio
import base64
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class OmnissaWorkspaceOneCredentials:
    """Matches dashboard/src/integrations/omnissa_workspace_one/config.ts credentialFields."""

    api_url: str
    api_token: str
    username: str
    credential: str

    def base_url(self) -> str:
        return self.api_url.rstrip("/")


class OmnissaWorkspaceOneAdapter:
    """Fetches device posture from Omnissa Workspace ONE UEM.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: OmnissaWorkspaceOneCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # -- HTTP plumbing -------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        basic = base64.b64encode(
            f"{self.credentials.username}:{self.credentials.credential}".encode()
        ).decode()
        return {
            "Authorization": f"Basic {basic}",
            "aw-tenant-code": self.credentials.api_token,
            "Accept": "application/json",
            "Content-Type": "application/json",
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
            resp = await self._get(client, "/mdm/devices/search", pagesize=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Workspace ONE rejected the credentials for {self.credentials.api_url!r} "
                    f"(HTTP {resp.status_code}). Check the API key, username and "
                    "credential are correct and have read-only access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach Workspace ONE at {self.credentials.api_url!r}: {exc}"
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
                self._check_profile_assignment(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("omnissa_workspace_one check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks --------------------------------------------------------------

    async def _check_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/mdm/devices/search", pagesize=500)
        if resp.status_code == 403:
            return [self._unavailable(
                "omnissa_workspace_one.devices.compliance_status",
                "Device compliance status",
                "endpoint_protection",
                "The credentials cannot read devices. Verify the API key and admin "
                "account have read access to device data.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload.get("Devices", payload.get("devices", []))
        total = len(devices)
        non_compliant = [
            d for d in devices
            if str(d.get("ComplianceStatus", d.get("complianceStatus", ""))).upper() != "COMPLIANT"
        ]
        passed = len(non_compliant) == 0
        return [IntegrationFinding(
            check_id="omnissa_workspace_one.devices.compliance_status",
            title="Managed devices are compliant with UEM policies",
            description=(
                f"All {total} managed device(s) report compliant status."
                if passed else
                f"{len(non_compliant)} of {total} managed device(s) are non-compliant "
                "with assigned policies."
            ),
            remediation=(
                "Review non-compliant devices in the Workspace ONE UEM console. "
                "Check compliance policy assignments and remediate violations."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "total_devices": total,
                "non_compliant_count": len(non_compliant),
                "non_compliant_sample": [
                    d.get("DeviceFriendlyName", d.get("deviceFriendlyName", d.get("Id", {}).get("Value")))
                    for d in non_compliant
                ][:20],
            },
        )]

    async def _check_encryption(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/mdm/devices/search", pagesize=500)
        if resp.status_code == 403:
            return [self._unavailable(
                "omnissa_workspace_one.devices.encryption_policy",
                "Device encryption policy enforcement",
                "encryption_at_rest",
                "The credentials cannot read device data. Verify the API key and "
                "admin account have read access.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        devices = payload.get("Devices", payload.get("devices", []))
        total = len(devices)
        unencrypted = [
            d for d in devices
            if not d.get("IsDataEncrypted", d.get("isDataEncrypted", True))
        ]
        passed = len(unencrypted) == 0
        return [IntegrationFinding(
            check_id="omnissa_workspace_one.devices.encryption_policy",
            title="Managed devices enforce disk encryption",
            description=(
                f"All {total} managed device(s) have data encryption enabled."
                if passed else
                f"{len(unencrypted)} of {total} managed device(s) do not have data "
                "encryption enabled."
            ),
            remediation=(
                "Deploy an encryption compliance policy through Workspace ONE UEM "
                "to enforce BitLocker (Windows) or FileVault (macOS) on all devices."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="encryption_at_rest",
            result_details={
                "total_devices": total,
                "unencrypted_count": len(unencrypted),
                "unencrypted_sample": [
                    d.get("DeviceFriendlyName", d.get("deviceFriendlyName", d.get("Id", {}).get("Value")))
                    for d in unencrypted
                ][:20],
            },
        )]

    async def _check_profile_assignment(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/mdm/profiles/search", pagesize=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "omnissa_workspace_one.profiles.assignment_status",
                "Profile assignment status",
                "access_control",
                "The credentials cannot read profiles. Verify the API key and admin "
                "account have read access to profile data.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        profiles = payload.get("Profiles", payload.get("profiles", []))
        total = len(profiles)
        unassigned = [
            p for p in profiles
            if p.get("AssignedDeviceCount", p.get("assignedDeviceCount", 1)) == 0
        ]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="omnissa_workspace_one.profiles.assignment_status",
            title="UEM profiles are assigned to devices",
            description=(
                f"All {total} profile(s) are assigned to at least one device."
                if passed else
                f"{len(unassigned)} of {total} profile(s) are not assigned to any device."
            ),
            remediation=(
                "Review unassigned profiles in Workspace ONE UEM. Either assign them "
                "to the appropriate smart groups or remove unused profiles."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={
                "total_profiles": total,
                "unassigned_count": len(unassigned),
                "unassigned_sample": [
                    p.get("ProfileName", p.get("profileName", p.get("ProfileId")))
                    for p in unassigned
                ][:20],
            },
        )]

    # -- helpers -------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Workspace ONE with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
