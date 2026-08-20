# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""JumpCloud MDM integration adapter.

Uses httpx against the JumpCloud v2 API.
Auth: API key (read-only), optionally scoped to a multi-tenant org.

Evidence source: systems (MDM-enrolled), system groups, commands. JumpCloud
provides MDM enrolment/compliance, OS version tracking and disk encryption
status for managed endpoints.

An endpoint the org's plan does not expose returns NOT_AVAILABLE rather than a
guess.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+--------------------------------------------------+---------------------------+--------------------------------------------+
| check_id                                         | check_category            | Controls mapped                            |
+--------------------------------------------------+---------------------------+--------------------------------------------+
| jumpcloud_mdm.systems.mdm_compliance             | endpoint_protection       | SOC2 CC6.8 . ISO27001 A.8.1               |
| jumpcloud_mdm.systems.os_version_currency        | vulnerability_management  | SOC2 CC7.1 . ISO27001 A.12.6.1 . PCI 6.2  |
| jumpcloud_mdm.systems.disk_encryption_status     | encryption_at_rest        | SOC2 CC6.1 . ISO27001 A.10.1.1 . PCI 3.4  |
+--------------------------------------------------+---------------------------+--------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

_BASE_URL = "https://console.jumpcloud.com"


@dataclass
class JumpCloudMDMCredentials:
    """Matches dashboard/src/integrations/jumpcloud_mdm/config.ts credentialFields."""

    api_key: str
    org_id: str = ""


class JumpCloudMDMAdapter:
    """Fetches device posture from JumpCloud (MDM-enrolled systems).

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: JumpCloudMDMCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # -- HTTP plumbing -------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {
            "x-api-key": self.credentials.api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.credentials.org_id:
            headers["x-org-id"] = self.credentials.org_id
        return headers

    async def _get(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        return await client.get(
            f"{_BASE_URL}/api/v2{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _get_v1(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        """JumpCloud v1 API -- systems endpoint lives here."""
        return await client.get(
            f"{_BASE_URL}/api{path}",
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
            resp = await self._get_v1(client, "/systems", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "JumpCloud rejected the API key "
                    f"(HTTP {resp.status_code}). Check the key is active and has "
                    "read access to systems."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach JumpCloud: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_mdm_compliance(client),
                self._check_os_version(client),
                self._check_disk_encryption(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("jumpcloud_mdm check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks --------------------------------------------------------------

    async def _check_mdm_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get_v1(client, "/systems", limit=500)
        if resp.status_code == 403:
            return [self._unavailable(
                "jumpcloud_mdm.systems.mdm_compliance",
                "MDM enrolment and compliance",
                "endpoint_protection",
                "The API key cannot read systems. Grant read access to the "
                "systems resource.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        systems = payload.get("results", payload) if isinstance(payload, dict) else payload
        if not isinstance(systems, list):
            systems = []
        total = len(systems)
        non_compliant = [
            s for s in systems
            if not s.get("mdm", {}).get("enrolled", False)
        ]
        passed = len(non_compliant) == 0
        return [IntegrationFinding(
            check_id="jumpcloud_mdm.systems.mdm_compliance",
            title="Systems are MDM-enrolled and compliant",
            description=(
                f"All {total} system(s) are MDM-enrolled."
                if passed else
                f"{len(non_compliant)} of {total} system(s) are not MDM-enrolled."
            ),
            remediation=(
                "Enrol non-managed systems through the JumpCloud MDM workflow. "
                "Ensure MDM profiles are pushed to all endpoints."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "total_systems": total,
                "non_enrolled_count": len(non_compliant),
                "non_enrolled_sample": [
                    s.get("displayName", s.get("hostname", s.get("_id")))
                    for s in non_compliant
                ][:20],
            },
        )]

    async def _check_os_version(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get_v1(client, "/systems", limit=500)
        if resp.status_code == 403:
            return [self._unavailable(
                "jumpcloud_mdm.systems.os_version_currency",
                "OS version currency",
                "vulnerability_management",
                "The API key cannot read systems. Grant read access to the "
                "systems resource.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        systems = payload.get("results", payload) if isinstance(payload, dict) else payload
        if not isinstance(systems, list):
            systems = []
        total = len(systems)
        # Flag systems that JumpCloud marks as having available updates or
        # that lack OS version info entirely.
        outdated = [
            s for s in systems
            if s.get("osVersionUpdateAvailable", False) or not s.get("osVersion")
        ]
        passed = len(outdated) == 0
        return [IntegrationFinding(
            check_id="jumpcloud_mdm.systems.os_version_currency",
            title="Systems are running current OS versions",
            description=(
                f"All {total} system(s) are running current OS versions."
                if passed else
                f"{len(outdated)} of {total} system(s) have OS updates available or "
                "missing version information."
            ),
            remediation=(
                "Deploy pending OS updates through JumpCloud commands or the MDM "
                "update workflow. Prioritise security updates."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={
                "total_systems": total,
                "outdated_count": len(outdated),
                "outdated_sample": [
                    s.get("displayName", s.get("hostname", s.get("_id")))
                    for s in outdated
                ][:20],
            },
        )]

    async def _check_disk_encryption(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get_v1(client, "/systems", limit=500)
        if resp.status_code == 403:
            return [self._unavailable(
                "jumpcloud_mdm.systems.disk_encryption_status",
                "Disk encryption status",
                "encryption_at_rest",
                "The API key cannot read systems. Grant read access to the "
                "systems resource.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        systems = payload.get("results", payload) if isinstance(payload, dict) else payload
        if not isinstance(systems, list):
            systems = []
        total = len(systems)
        unencrypted = [
            s for s in systems
            if not s.get("fde", {}).get("active", s.get("fileSystem", {}).get("encrypted", True))
        ]
        passed = len(unencrypted) == 0
        return [IntegrationFinding(
            check_id="jumpcloud_mdm.systems.disk_encryption_status",
            title="Systems have full disk encryption enabled",
            description=(
                f"All {total} system(s) have full disk encryption active."
                if passed else
                f"{len(unencrypted)} of {total} system(s) do not have full disk "
                "encryption enabled."
            ),
            remediation=(
                "Enable disk encryption through JumpCloud policies. Deploy "
                "BitLocker (Windows) or FileVault (macOS) via system policies."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="encryption_at_rest",
            result_details={
                "total_systems": total,
                "unencrypted_count": len(unencrypted),
                "unencrypted_sample": [
                    s.get("displayName", s.get("hostname", s.get("_id")))
                    for s in unencrypted
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
            description="Sentinel could not read this from JumpCloud with the supplied API key.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
