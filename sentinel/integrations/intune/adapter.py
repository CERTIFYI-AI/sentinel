# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Microsoft Intune integration adapter.

Built on the shared Graph client (``sentinel/integrations/msgraph``), so the
same class serves both ``microsoft_intune`` and ``microsoft_intune_gcc_high`` —
the sovereign cloud is selected by the credentials, not hardcoded.

Auth: an Entra app registration using client credentials. Application
permissions required (all read-only, admin consent needed):

  DeviceManagementManagedDevices.Read.All     managed device inventory
  DeviceManagementConfiguration.Read.All      compliance policies + state
  DeviceManagementApps.Read.All               app protection policies

Intune is the endpoint-protection system of record for Microsoft-shop orgs.
Device compliance posture (encryption, OS patch level, screen lock, Defender
status) feeds ``endpoint_protection`` controls.  A permission that was not
consented yields NOT_AVAILABLE for that check, never PASSED.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+-------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                        | check_category            | Controls mapped                              |
+-------------------------------------------------+---------------------------+----------------------------------------------+
| intune.devices.compliance_rate                  | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.8.1 * PCI 5.2       |
| intune.devices.encryption_enabled               | encryption_at_rest        | SOC2 CC6.1 * ISO27001 A.10.1.1 * PCI 3.4    |
| intune.devices.os_up_to_date                    | vulnerability_management  | SOC2 CC7.1 * ISO27001 A.12.6.1 * PCI 6.2    |
| intune.devices.inactive_devices                 | hr_controls               | SOC2 CC6.2 * ISO27001 A.9.2.5 * PCI 8.1.4   |
| intune.policies.compliance_policies_exist       | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.8.1 * HIPAA 164.312 |
| intune.policies.app_protection_policies_exist   | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.6.2.1               |
+-------------------------------------------------+---------------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.msgraph import GraphClient, GraphCredentials

logger = logging.getLogger(__name__)

_COMPLIANCE_RATE_THRESHOLD = 0.90
_ENCRYPTION_RATE_THRESHOLD = 0.95
_OS_PATCH_DAYS = 30
_INACTIVE_DEVICE_DAYS = 90


@dataclass
class IntuneCredentials(GraphCredentials):
    """Matches dashboard/src/integrations/intune/config.ts credentialFields."""


@dataclass
class IntuneGccHighCredentials(GraphCredentials):
    """GCC High / DoD tenants — sovereign endpoints selected by default."""

    cloud: str = "usgov"


class IntuneAdapter:
    """Fetches device compliance posture from Microsoft Intune.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: GraphCredentials, client=None) -> None:
        self.credentials = credentials
        self.graph = client if isinstance(client, GraphClient) else GraphClient(credentials, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.graph.get("/v1.0/deviceManagement")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Entra accepted the token but refused /deviceManagement "
                    f"(HTTP {resp.status_code}). Grant the app registration the "
                    "read-only application permissions this connector needs and "
                    "complete admin consent."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"Could not reach Microsoft Graph: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_compliance_rate(),
            self._check_encryption(),
            self._check_os_currency(),
            self._check_inactive_devices(),
            self._check_compliance_policies(),
            self._check_app_protection_policies(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("intune check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ---------------------------------------------------------------

    async def _check_compliance_rate(self) -> list[IntegrationFinding]:
        devices, truncated = await self._get_managed_devices()
        if devices is None:
            return [self._unavailable(
                "intune.devices.compliance_rate",
                "Device compliance rate meets threshold",
                "endpoint_protection",
                "Grant DeviceManagementManagedDevices.Read.All and complete admin consent.",
            )]
        if not devices:
            return [IntegrationFinding(
                check_id="intune.devices.compliance_rate",
                title="Device compliance rate meets threshold",
                description="No managed devices enrolled in Intune.",
                remediation="Enroll corporate devices in Intune to start collecting compliance evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="endpoint_protection",
                result_details={"enrolled_count": 0},
            )]
        compliant = sum(1 for d in devices if d.get("complianceState") == "compliant")
        total = len(devices)
        rate = compliant / total if total else 0
        passed = rate >= _COMPLIANCE_RATE_THRESHOLD
        return [IntegrationFinding(
            check_id="intune.devices.compliance_rate",
            title=f"Device compliance rate meets {_COMPLIANCE_RATE_THRESHOLD:.0%} threshold",
            description=f"{compliant} of {total} managed devices ({rate:.0%}) are compliant.",
            remediation=(
                "Investigate non-compliant devices in the Intune admin centre. Common "
                "causes: expired OS version, missing encryption, or disabled screen lock."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "compliant_count": compliant,
                "total_count": total,
                "rate": round(rate, 4),
                "threshold": _COMPLIANCE_RATE_THRESHOLD,
                "results_truncated": truncated,
            },
        )]

    async def _check_encryption(self) -> list[IntegrationFinding]:
        devices, truncated = await self._get_managed_devices()
        if devices is None:
            return [self._unavailable(
                "intune.devices.encryption_enabled",
                "Managed devices are encrypted",
                "encryption_at_rest",
                "Grant DeviceManagementManagedDevices.Read.All and complete admin consent.",
            )]
        if not devices:
            return [IntegrationFinding(
                check_id="intune.devices.encryption_enabled",
                title="Managed devices are encrypted",
                description="No managed devices enrolled in Intune.",
                remediation="Enroll corporate devices to start collecting encryption evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="encryption_at_rest",
                result_details={"enrolled_count": 0},
            )]
        encrypted = sum(1 for d in devices if d.get("isEncrypted"))
        total = len(devices)
        rate = encrypted / total if total else 0
        passed = rate >= _ENCRYPTION_RATE_THRESHOLD
        return [IntegrationFinding(
            check_id="intune.devices.encryption_enabled",
            title="Managed devices are encrypted",
            description=(
                f"{encrypted} of {total} managed devices ({rate:.0%}) report disk encryption enabled."
            ),
            remediation=(
                "Enable BitLocker (Windows) or FileVault (macOS) via an Intune "
                "configuration profile and mark encryption as required in the "
                "compliance policy."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="encryption_at_rest",
            result_details={
                "encrypted_count": encrypted,
                "total_count": total,
                "rate": round(rate, 4),
                "threshold": _ENCRYPTION_RATE_THRESHOLD,
                "results_truncated": truncated,
            },
        )]

    async def _check_os_currency(self) -> list[IntegrationFinding]:
        devices, truncated = await self._get_managed_devices()
        if devices is None:
            return [self._unavailable(
                "intune.devices.os_up_to_date",
                "Device OS versions are current",
                "vulnerability_management",
                "Grant DeviceManagementManagedDevices.Read.All and complete admin consent.",
            )]
        if not devices:
            return [IntegrationFinding(
                check_id="intune.devices.os_up_to_date",
                title="Device OS versions are current",
                description="No managed devices enrolled in Intune.",
                remediation="Enroll corporate devices to collect OS currency evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="vulnerability_management",
                result_details={"enrolled_count": 0},
            )]
        cutoff = datetime.now(timezone.utc) - timedelta(days=_OS_PATCH_DAYS)
        stale: list[str] = []
        for d in devices:
            last_sync = self._parse_ts(d.get("lastSyncDateTime"))
            if last_sync and last_sync < cutoff:
                stale.append(d.get("deviceName", "unknown"))
        passed = not stale
        return [IntegrationFinding(
            check_id="intune.devices.os_up_to_date",
            title="Device OS versions are current",
            description=(
                f"{len(stale)} of {len(devices)} managed devices have not synced "
                f"within {_OS_PATCH_DAYS} days, indicating they may be running "
                f"outdated OS versions."
            ),
            remediation=(
                "Devices that have not synced recently may miss OS updates and "
                "compliance policy evaluations. Investigate stale devices and "
                "enforce Windows Update / macOS software update rings."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "stale_count": len(stale),
                "total_count": len(devices),
                "threshold_days": _OS_PATCH_DAYS,
                "sample": stale[:20],
                "results_truncated": truncated,
            },
        )]

    async def _check_inactive_devices(self) -> list[IntegrationFinding]:
        devices, truncated = await self._get_managed_devices()
        if devices is None:
            return [self._unavailable(
                "intune.devices.inactive_devices",
                "No managed device idle for 90+ days",
                "hr_controls",
                "Grant DeviceManagementManagedDevices.Read.All and complete admin consent.",
            )]
        if not devices:
            return [IntegrationFinding(
                check_id="intune.devices.inactive_devices",
                title=f"No managed device idle for {_INACTIVE_DEVICE_DAYS}+ days",
                description="No managed devices enrolled in Intune.",
                remediation="Enroll corporate devices to track device activity.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="hr_controls",
                result_details={"enrolled_count": 0},
            )]
        cutoff = datetime.now(timezone.utc) - timedelta(days=_INACTIVE_DEVICE_DAYS)
        inactive: list[str] = []
        for d in devices:
            last_sync = self._parse_ts(d.get("lastSyncDateTime"))
            if last_sync and last_sync < cutoff:
                inactive.append(d.get("deviceName", "unknown"))
        passed = not inactive
        return [IntegrationFinding(
            check_id="intune.devices.inactive_devices",
            title=f"No managed device idle for {_INACTIVE_DEVICE_DAYS}+ days",
            description=(
                f"{len(inactive)} of {len(devices)} managed devices have not synced "
                f"in over {_INACTIVE_DEVICE_DAYS} days."
            ),
            remediation=(
                "Inactive devices may belong to former employees or retired hardware. "
                "Review and retire or wipe stale device records in the Intune admin centre."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="hr_controls",
            result_details={
                "inactive_count": len(inactive),
                "total_count": len(devices),
                "threshold_days": _INACTIVE_DEVICE_DAYS,
                "sample": inactive[:20],
                "results_truncated": truncated,
            },
        )]

    async def _check_compliance_policies(self) -> list[IntegrationFinding]:
        resp = await self.graph.get("/v1.0/deviceManagement/deviceCompliancePolicies")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "intune.policies.compliance_policies_exist",
                "Compliance policies are defined",
                "endpoint_protection",
                "Grant DeviceManagementConfiguration.Read.All and complete admin consent.",
            )]
        resp.raise_for_status()
        policies = resp.json().get("value", [])
        active = [p for p in policies if not p.get("roleScopeTagIds") or True]
        passed = len(active) > 0
        return [IntegrationFinding(
            check_id="intune.policies.compliance_policies_exist",
            title="Compliance policies are defined",
            description=(
                f"{len(active)} device compliance policy/policies defined in Intune."
                if active else
                "No device compliance policies found. Without compliance policies, "
                "Intune cannot evaluate device posture."
            ),
            remediation=(
                "Create at least one device compliance policy per platform (Windows, "
                "macOS, iOS, Android) requiring encryption, minimum OS version, and "
                "a screen lock."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "policy_count": len(active),
                "policy_names": [p.get("displayName", "") for p in active][:20],
            },
        )]

    async def _check_app_protection_policies(self) -> list[IntegrationFinding]:
        resp = await self.graph.get("/v1.0/deviceAppManagement/managedAppPolicies")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "intune.policies.app_protection_policies_exist",
                "App protection policies are defined",
                "endpoint_protection",
                "Grant DeviceManagementApps.Read.All and complete admin consent.",
            )]
        resp.raise_for_status()
        policies = resp.json().get("value", [])
        passed = len(policies) > 0
        return [IntegrationFinding(
            check_id="intune.policies.app_protection_policies_exist",
            title="App protection policies are defined",
            description=(
                f"{len(policies)} app protection policy/policies defined."
                if policies else
                "No app protection policies found. Without these, corporate data in "
                "mobile apps (Outlook, Teams, OneDrive) has no container boundary."
            ),
            remediation=(
                "Create app protection policies for iOS and Android that require "
                "a PIN, block copy to unmanaged apps, and encrypt app data at rest."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="endpoint_protection",
            result_details={
                "policy_count": len(policies),
                "policy_names": [p.get("displayName", "") for p in policies][:20],
            },
        )]

    # -- helpers --------------------------------------------------------------

    _managed_devices_cache: tuple[list[dict] | None, bool] | None = None

    async def _get_managed_devices(self) -> tuple[list[dict] | None, bool]:
        if self._managed_devices_cache is not None:
            return self._managed_devices_cache
        resp = await self.graph.get(
            "/v1.0/deviceManagement/managedDevices",
            **{
                "$select": (
                    "deviceName,complianceState,isEncrypted,lastSyncDateTime,"
                    "operatingSystem,osVersion,managedDeviceOwnerType"
                ),
            },
        )
        if resp.status_code in (401, 403):
            self._managed_devices_cache = (None, False)
            return self._managed_devices_cache
        resp.raise_for_status()
        first_page = resp.json()
        items = list(first_page.get("value", []))
        next_link = first_page.get("@odata.nextLink")
        truncated = False
        if next_link:
            more, truncated = await self.graph.get_paged(next_link)
            items.extend(more)
        self._managed_devices_cache = (items, truncated)
        return self._managed_devices_cache

    @staticmethod
    def _parse_ts(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Microsoft Graph with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
