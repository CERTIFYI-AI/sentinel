# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""NinjaOne integration adapter.

Uses httpx against the NinjaOne REST API v2.
Auth: OAuth client credentials (client id + client credential) with read scopes.

Evidence source: devices, organizations, policies and activity logs. NinjaOne is
the device management / RMM platform of record for many orgs, providing endpoint
health, OS patch status, antivirus state and activity audit trails.

An endpoint the org's plan does not expose returns NOT_AVAILABLE rather than a
guess.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+-----------------------------------------+---------------------------+--------------------------------------------+
| check_id                                | check_category            | Controls mapped                            |
+-----------------------------------------+---------------------------+--------------------------------------------+
| ninjaone.devices.endpoint_health        | endpoint_protection       | SOC2 CC6.8 . ISO27001 A.8.1               |
| ninjaone.patches.os_patch_status        | vulnerability_management  | SOC2 CC7.1 . ISO27001 A.12.6.1 . PCI 6.2  |
| ninjaone.logs.activity_log_available    | audit_logging             | SOC2 CC7.2 . ISO27001 A.12.4.1 . PCI 10.1 |
+-----------------------------------------+---------------------------+--------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: NinjaOne region-to-base-URL map.
_REGION_URLS: dict[str, str] = {
    "app": "https://app.ninjarmm.com",
    "eu": "https://eu.ninjarmm.com",
    "oc": "https://oc.ninjarmm.com",
    "ca": "https://ca.ninjarmm.com",
}

_TOKEN_URLS: dict[str, str] = {
    "app": "https://app.ninjarmm.com/oauth/token",
    "eu": "https://eu.ninjarmm.com/oauth/token",
    "oc": "https://oc.ninjarmm.com/oauth/token",
    "ca": "https://ca.ninjarmm.com/oauth/token",
}


@dataclass
class NinjaOneCredentials:
    """Matches dashboard/src/integrations/ninjaone/config.ts credentialFields."""

    region: str
    client_id: str
    client_credential: str

    def base_url(self) -> str:
        return _REGION_URLS.get(self.region, _REGION_URLS["app"])

    def token_url(self) -> str:
        return _TOKEN_URLS.get(self.region, _TOKEN_URLS["app"])


class NinjaOneAdapter:
    """Fetches device posture from NinjaOne.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: NinjaOneCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    # -- auth ----------------------------------------------------------------

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via client_credentials grant."""
        resp = await client.post(
            self.credentials.token_url(),
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                "client_secret": self.credentials.client_credential,
                "scope": "monitoring management",
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (400, 401, 403):
            raise ValueError(
                f"NinjaOne OAuth token request failed (HTTP {resp.status_code}). "
                "Check that the client id and credential are correct and the app "
                "has the monitoring/management scopes."
            )
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            raise ValueError("NinjaOne OAuth response did not include an access_token.")
        return token

    # -- HTTP plumbing -------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api/v2{path}",
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
            self._access_token = await self._authenticate(client)
            resp = await self._get(client, "/devices", pageSize=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "NinjaOne rejected the access token. Check the client credentials "
                    "and confirm the app has read scopes."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach NinjaOne ({self.credentials.region}): {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            self._access_token = await self._authenticate(client)
            results = await asyncio.gather(
                self._check_endpoint_health(client),
                self._check_os_patches(client),
                self._check_activity_log(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("ninjaone check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks --------------------------------------------------------------

    async def _check_endpoint_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/devices-detailed", pageSize=500)
        if resp.status_code == 403:
            return [self._unavailable(
                "ninjaone.devices.endpoint_health", "Device endpoint health",
                "endpoint_protection",
                "The API credentials cannot read devices. Verify the app has "
                "monitoring scope enabled.",
            )]
        resp.raise_for_status()
        devices = resp.json() if isinstance(resp.json(), list) else resp.json().get("results", [])
        total = len(devices)
        unhealthy = [d for d in devices if d.get("offline", False) or d.get("status", {}).get("name") not in ("HEALTHY", "UP")]
        passed = len(unhealthy) == 0
        return [IntegrationFinding(
            check_id="ninjaone.devices.endpoint_health",
            title="Managed devices report healthy status",
            description=(
                f"All {total} managed device(s) are healthy."
                if passed else
                f"{len(unhealthy)} of {total} managed device(s) report an unhealthy "
                "or offline status."
            ),
            remediation=(
                "Investigate unhealthy devices in the NinjaOne dashboard. Common causes "
                "include agent connectivity loss, disabled antivirus, or pending reboots."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "total_devices": total,
                "unhealthy_count": len(unhealthy),
                "unhealthy_sample": [d.get("systemName", d.get("id")) for d in unhealthy][:20],
            },
        )]

    async def _check_os_patches(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/queries/os-patches", status="MANUAL")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ninjaone.patches.os_patch_status", "OS patch compliance",
                "vulnerability_management",
                "The API credentials cannot read patch data. Ensure the app has "
                "monitoring scope and patch management is enabled.",
            )]
        resp.raise_for_status()
        patches = resp.json() if isinstance(resp.json(), list) else resp.json().get("results", [])
        pending = len(patches)
        passed = pending == 0
        return [IntegrationFinding(
            check_id="ninjaone.patches.os_patch_status",
            title="OS patches are current across managed devices",
            description=(
                "No pending OS patches found across managed devices."
                if passed else
                f"{pending} OS patch(es) are pending installation across the fleet."
            ),
            remediation=(
                "Review pending patches in NinjaOne and approve or schedule deployment. "
                "Prioritise critical and security updates."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={"pending_patch_count": pending},
        )]

    async def _check_activity_log(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/activities", pageSize=1, type="ACTIONSET")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ninjaone.logs.activity_log_available", "Activity log is retrievable",
                "audit_logging",
                "The API credentials cannot read activity logs. Grant the app read "
                "access to activity data.",
            )]
        resp.raise_for_status()
        return [IntegrationFinding(
            check_id="ninjaone.logs.activity_log_available",
            title="Activity log is retrievable for audit evidence",
            description=(
                "The NinjaOne Activities API responded, so device management events "
                "can be collected as audit evidence."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={},
        )]

    # -- helpers -------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from NinjaOne with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
