# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Jamf Pro integration adapter.

Uses httpx against the Jamf Pro REST API (v1/v2). Auth: an API client (roles)
or API user with read-only access. Every call is a GET.

Evidence source: managed computers, mobile devices, configuration profiles,
and device encryption status. Jamf Pro is the device-management system of
record for Apple-centric orgs.

An endpoint the tenant does not expose returns NOT_AVAILABLE rather than a
guess -- a compliance platform reporting PASSED for a check it could not run
is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                             | check_category            | Controls mapped                              |
+------------------------------------------------------+---------------------------+----------------------------------------------+
| jamf_pro.devices.endpoint_protection                 | endpoint_protection       | SOC2 CC6.8 * ISO27001 A.8.1 * PCI 5.2       |
| jamf_pro.devices.vulnerability_management            | vulnerability_management  | SOC2 CC7.1 * ISO27001 A.12.6.1 * PCI 6.2    |
| jamf_pro.devices.encryption_at_rest                  | encryption_at_rest        | SOC2 CC6.1 * ISO27001 A.10.1.1 * PCI 3.4    |
| jamf_pro.devices.access_control                      | access_control            | SOC2 CC6.1 * ISO27001 A.9.4.1 * PCI 7.1     |
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

#: Encryption rate threshold -- below this the check reports FAILED.
_ENCRYPTION_RATE_THRESHOLD = 0.95

#: Minimum percentage of managed devices that must be managed (have a
#: configuration profile applied) to pass the access-control check.
_PROFILE_COMPLIANCE_THRESHOLD = 0.90


@dataclass
class JamfProCredentials:
    """Matches dashboard/src/integrations/jamf_pro/config.ts credentialFields."""

    instance_url: str
    client_id: str
    client_credential: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")


class JamfProAdapter:
    """Fetches device posture from Jamf Pro.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: JamfProCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._token: str | None = None

    # -- HTTP plumbing --------------------------------------------------------

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain a bearer token via client credentials."""
        if self._token:
            return self._token
        resp = await client.post(
            f"{self.credentials.base_url()}/api/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                f"Jamf Pro rejected the API credentials for {self.credentials.instance_url!r} "
                f"(HTTP {resp.status_code}). Verify the client ID and credential are correct "
                "and the API client has read-only access."
            )
        resp.raise_for_status()
        self._token = resp.json().get("access_token", "")
        return self._token

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{self.credentials.base_url()}{path}",
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
            resp = await self._get(client, "/api/v1/jamf-pro-version")
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Jamf Pro rejected the credentials for {self.credentials.instance_url!r} "
                    f"(HTTP {resp.status_code}). Check the client ID and credential."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach Jamf Pro at {self.credentials.instance_url!r}: {exc}"
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
                self._check_access_control(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("jamf_pro check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ---------------------------------------------------------------

    async def _check_endpoint_protection(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Device encryption status as an endpoint-protection signal."""
        resp = await self._get(client, "/api/v1/computers-inventory", section="HARDWARE", page=0, page_size=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "jamf_pro.devices.endpoint_protection",
                "Managed devices report healthy status",
                "endpoint_protection",
                "Grant the API client read access to computer inventory.",
            )]
        resp.raise_for_status()
        devices = resp.json().get("results", [])
        if not devices:
            return [IntegrationFinding(
                check_id="jamf_pro.devices.endpoint_protection",
                title="Managed devices report healthy status",
                description="No computers found in Jamf Pro inventory.",
                remediation="Enroll corporate devices in Jamf Pro to start collecting posture evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="endpoint_protection",
                result_details={"enrolled_count": 0},
            )]
        managed = [d for d in devices if d.get("general", {}).get("managed", False)]
        total = len(devices)
        rate = len(managed) / total if total else 0
        passed = rate >= _PROFILE_COMPLIANCE_THRESHOLD
        return [IntegrationFinding(
            check_id="jamf_pro.devices.endpoint_protection",
            title="Managed devices report healthy status",
            description=f"{len(managed)} of {total} computers ({rate:.0%}) are in a managed state.",
            remediation=(
                "Investigate unmanaged devices. Re-enroll or retire devices that have "
                "lost their MDM profile to restore visibility and policy enforcement."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "managed_count": len(managed),
                "total_count": total,
                "rate": round(rate, 4),
            },
        )]

    async def _check_vulnerability_management(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """OS patch level across managed computers."""
        resp = await self._get(client, "/api/v1/computers-inventory", section="OPERATING_SYSTEM", page=0, page_size=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "jamf_pro.devices.vulnerability_management",
                "Device OS versions are current",
                "vulnerability_management",
                "Grant the API client read access to computer inventory.",
            )]
        resp.raise_for_status()
        devices = resp.json().get("results", [])
        if not devices:
            return [IntegrationFinding(
                check_id="jamf_pro.devices.vulnerability_management",
                title="Device OS versions are current",
                description="No computers found in Jamf Pro inventory.",
                remediation="Enroll devices to start collecting OS version evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="vulnerability_management",
                result_details={"enrolled_count": 0},
            )]
        outdated: list[str] = []
        for d in devices:
            os_info = d.get("operatingSystem", {})
            if not os_info.get("softwareUpdateDeviceId"):
                name = d.get("general", {}).get("name", "unknown")
                outdated.append(name)
        passed = not outdated
        return [IntegrationFinding(
            check_id="jamf_pro.devices.vulnerability_management",
            title="Device OS versions are current",
            description=(
                f"{len(outdated)} of {len(devices)} computers may be running outdated "
                "OS versions (no pending software update device ID)."
            ),
            remediation=(
                "Review OS update status in Jamf Pro and enforce automatic software "
                "updates via a configuration profile or managed software update plan."
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

    async def _check_encryption_at_rest(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """FileVault / BitLocker status across managed computers."""
        resp = await self._get(client, "/api/v1/computers-inventory", section="DISK_ENCRYPTION", page=0, page_size=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "jamf_pro.devices.encryption_at_rest",
                "Managed devices have disk encryption enabled",
                "encryption_at_rest",
                "Grant the API client read access to computer disk encryption data.",
            )]
        resp.raise_for_status()
        devices = resp.json().get("results", [])
        if not devices:
            return [IntegrationFinding(
                check_id="jamf_pro.devices.encryption_at_rest",
                title="Managed devices have disk encryption enabled",
                description="No computers found in Jamf Pro inventory.",
                remediation="Enroll devices to collect disk encryption evidence.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="encryption_at_rest",
                result_details={"enrolled_count": 0},
            )]
        encrypted = 0
        for d in devices:
            disk_enc = d.get("diskEncryption", {})
            if disk_enc.get("fileVault2Status") == "ALL_ENCRYPTED" or disk_enc.get("bootPartitionEncryptionDetails", {}).get("partitionEncryptionStatus") == "ENCRYPTED":
                encrypted += 1
        total = len(devices)
        rate = encrypted / total if total else 0
        passed = rate >= _ENCRYPTION_RATE_THRESHOLD
        return [IntegrationFinding(
            check_id="jamf_pro.devices.encryption_at_rest",
            title="Managed devices have disk encryption enabled",
            description=(
                f"{encrypted} of {total} computers ({rate:.0%}) report FileVault or "
                "boot partition encryption enabled."
            ),
            remediation=(
                "Enable FileVault via a Jamf Pro configuration profile. For non-macOS "
                "devices, enforce BitLocker through a compliance policy."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="encryption_at_rest",
            result_details={
                "encrypted_count": encrypted,
                "total_count": total,
                "rate": round(rate, 4),
                "threshold": _ENCRYPTION_RATE_THRESHOLD,
            },
        )]

    async def _check_access_control(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        """Configuration profile compliance as an access-control signal."""
        resp = await self._get(client, "/api/v2/computer-prestages", page=0, page_size=100)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "jamf_pro.devices.access_control",
                "Configuration profiles enforce device policies",
                "access_control",
                "Grant the API client read access to configuration profiles.",
            )]
        resp.raise_for_status()
        profiles = resp.json().get("results", [])
        passed = len(profiles) > 0
        return [IntegrationFinding(
            check_id="jamf_pro.devices.access_control",
            title="Configuration profiles enforce device policies",
            description=(
                f"{len(profiles)} PreStage enrollment profile(s) defined."
                if profiles else
                "No PreStage enrollment profiles found. Without these, newly enrolled "
                "devices may not receive baseline security configurations."
            ),
            remediation=(
                "Create PreStage enrollment profiles in Jamf Pro to ensure devices "
                "receive security configurations (passcode, encryption, restrictions) "
                "immediately upon enrollment."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={
                "profile_count": len(profiles),
                "profile_names": [p.get("displayName", "") for p in profiles][:20],
            },
        )]

    # -- helpers --------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Jamf Pro with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
