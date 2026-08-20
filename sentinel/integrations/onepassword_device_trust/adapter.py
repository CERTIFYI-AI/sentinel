# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""1Password Device Trust (Kolide) integration adapter.

Reads endpoint posture from the Kolide fleet API (the product 1Password
acquired and rebranded as 1Password Device Trust): per-device compliance
status, the specific checks currently failing across the fleet, and the raw
device inventory. Auth is a Bearer API token issued to a read-only service
account under Settings → API.

An org name is optional at connect time — most tenants resolve it from the
token itself — but is sent when present so a token scoped to more than one
organization is unambiguous about which one Sentinel is reading.

A tenant that has not enrolled any devices, or whose token lacks fleet read
access, reports NOT_AVAILABLE rather than an empty PASSED — a compliance
platform reporting a control satisfied because it could not look is the
failure mode this pipeline exists to prevent.

Evidence source per the Continuous GRC master sheet: device compliance
status, failing checks, device inventory.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://k2.kolide.com/api/v0"

#: Kolide check severities that make a device non-compliant regardless of
#: total failure count — surfaced separately so one critical failure is
#: never buried in an aggregate.
_HIGH_SEVERITY = frozenset({"high", "critical"})


@dataclass
class OnePasswordDeviceTrustCredentials:
    """Matches dashboard/src/integrations/onepassword_device_trust/config.ts
    credentialFields."""

    api_token: str
    organization: str = ""


class OnePasswordDeviceTrustAdapter:
    """Fetches endpoint compliance posture from 1Password Device Trust (Kolide).

    No database access; the worker persists returned findings.
    """

    def __init__(
        self,
        credentials: OnePasswordDeviceTrustCredentials,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.credentials = credentials
        self._client = client

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.credentials.api_token}",
            "Accept": "application/json",
        }
        if self.credentials.organization:
            headers["X-Kolide-Organization"] = self.credentials.organization
        return headers

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}", headers=self._headers(), params=params or None, timeout=_TIMEOUT
        )

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/devices", per_page=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"1Password Device Trust rejected the API token (HTTP "
                    f"{resp.status_code}). Check the token is active under "
                    "Settings → API and, if the account spans multiple "
                    "organizations, that the organization name is correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach 1Password Device Trust: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_device_compliance(client),
                self._check_failing_checks(client),
                self._check_device_inventory(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("1password_device_trust check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_device_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/devices", per_page=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "onepassword_device_trust.devices.compliance_status", "Device compliance status",
                "endpoint_protection",
                "Grant the API token read access to the device fleet under "
                "Settings → API.",
            )]
        resp.raise_for_status()
        devices = resp.json().get("data", resp.json() if isinstance(resp.json(), list) else [])
        if not devices:
            return [self._unavailable(
                "onepassword_device_trust.devices.compliance_status", "Device compliance status",
                "endpoint_protection",
                "No enrolled devices were returned. Confirm devices are enrolled "
                "and the token's organization scope is correct.",
            )]
        failing = [d for d in devices if d.get("failure_count", 0) > 0]
        passed = not failing
        return [IntegrationFinding(
            check_id="onepassword_device_trust.devices.compliance_status",
            title=f"{len(devices) - len(failing)} of {len(devices)} device(s) fully compliant",
            description=(
                f"{len(failing)} enrolled device(s) currently fail at least one "
                "compliance check."
            ),
            remediation=(
                "Devices → filter by failing: prompt the affected users to remediate "
                "through the Kolide desktop app, or quarantine devices that stay "
                "non-compliant past the grace period."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="endpoint_protection",
            result_details={
                "total_devices": len(devices),
                "failing_devices": len(failing),
            },
        )]

    async def _check_failing_checks(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/checks", status="failing", per_page=200)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "onepassword_device_trust.checks.failing", "Fleet-wide failing checks",
                "vulnerability_management",
                "Grant the API token read access to checks under Settings → API.",
            )]
        resp.raise_for_status()
        checks = resp.json().get("data", resp.json() if isinstance(resp.json(), list) else [])
        high_severity = [c for c in checks if str(c.get("severity", "")).lower() in _HIGH_SEVERITY]
        passed = not checks
        return [IntegrationFinding(
            check_id="onepassword_device_trust.checks.failing",
            title=f"{len(checks)} check(s) failing across the fleet",
            description=(
                "No checks are currently failing." if passed else
                f"{len(checks)} check(s) failing fleet-wide, {len(high_severity)} at "
                "high or critical severity."
            ),
            remediation=(
                "No action required." if passed else
                "Checks → sort by affected device count: prioritize high/critical "
                "checks with the widest device impact first."
            ),
            status="PASSED" if passed else ("FAILED" if high_severity else "WARNING"),
            severity="HIGH" if high_severity else ("MEDIUM" if checks else "INFO"),
            check_category="vulnerability_management",
            result_details={
                "failing_check_count": len(checks),
                "high_or_critical_count": len(high_severity),
            },
        )]

    async def _check_device_inventory(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/devices", per_page=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "onepassword_device_trust.devices.inventory", "Device inventory",
                "endpoint_protection",
                "Grant the API token read access to the device fleet under "
                "Settings → API.",
            )]
        resp.raise_for_status()
        devices = resp.json().get("data", resp.json() if isinstance(resp.json(), list) else [])
        by_platform: dict[str, int] = {}
        for device in devices:
            platform = str(device.get("platform", "unknown"))
            by_platform[platform] = by_platform.get(platform, 0) + 1
        return [IntegrationFinding(
            check_id="onepassword_device_trust.devices.inventory",
            title=f"{len(devices)} device(s) enrolled",
            description=(
                f"{len(devices)} device(s) reporting to 1Password Device Trust "
                f"across {len(by_platform)} platform(s)."
            ),
            remediation=(
                "Cross-check this count against your HR roster and MDM inventory to "
                "surface unmanaged or unenrolled endpoints."
            ),
            status="PASSED",
            severity="INFO",
            check_category="endpoint_protection",
            result_details={"total_devices": len(devices), "by_platform": by_platform},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from 1Password Device Trust "
                        "with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
