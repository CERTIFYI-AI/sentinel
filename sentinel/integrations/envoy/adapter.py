# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Envoy integration adapter.

Reads access-review and data-location evidence from the Envoy workplace
API: dormant admin employees, visitor-data retention posture, and public
exposure of the employee directory used by front-desk sign-in.

Auth: a single api_key (Bearer token from Envoy Settings > API tokens).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.envoy.com/api/v2"


@dataclass
class EnvoyCredentials:
    """Matches dashboard/src/integrations/envoy/config.ts credentialFields."""

    api_key: str


class EnvoyAdapter:
    """Fetches access-review and data-location posture from Envoy."""

    def __init__(self, credentials: EnvoyCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/locations", page={"size": 1})
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Envoy rejected the API token. Verify it is active in "
                    "Settings > API tokens."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Envoy: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admins(client),
                self._check_visitor_retention_posture(client),
                self._check_directory_exposure(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("envoy check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employees", **{"page[size]": 200})
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "envoy.employees.dormant_admin",
                "Dormant admin employee review",
                "least_privilege",
                "Grant the API token read access to Employees.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data.get("data", [])
        admins = [
            e for e in employees
            if str((e.get("attributes") or {}).get("role", "")).lower() in ("admin", "owner")
        ]
        dormant = [
            a for a in admins
            if not (a.get("attributes") or {}).get("last-sign-in-at")
            and not (a.get("attributes") or {}).get("last_sign_in_at")
        ]
        return [IntegrationFinding(
            check_id="envoy.employees.dormant_admin",
            title="No dormant workplace admin accounts",
            description=(
                f"{len(admins)} admin employee(s), {len(dormant)} with no "
                "recorded sign-in."
            ),
            remediation=(
                "Remove admin privileges from employees who have never "
                "signed in to the Envoy dashboard."
            ),
            status="PASSED" if not dormant else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "dormant_admin_count": len(dormant),
            },
        )]

    async def _check_visitor_retention_posture(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/locations", **{"page[size]": 100})
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "envoy.visitors.retention_posture",
                "Visitor-data retention posture",
                "data_classification",
                "Grant the API token read access to Locations.",
            )]
        resp.raise_for_status()
        data = resp.json()
        locations = data.get("data", [])
        no_policy = [
            loc for loc in locations
            if not (loc.get("attributes") or {}).get("visitor-data-retention-days")
            and not (loc.get("attributes") or {}).get("visitor_data_retention_days")
        ]
        return [IntegrationFinding(
            check_id="envoy.visitors.retention_posture",
            title="Visitor data has a defined retention period",
            description=(
                f"{len(locations)} location(s) checked, {len(no_policy)} "
                "with no explicit visitor-data retention period configured."
            ),
            remediation=(
                "Configure a visitor-data retention period for every "
                "location so visitor names, photos, and host details are "
                "not retained indefinitely."
            ),
            status="PASSED" if not no_policy else "WARNING",
            severity="MEDIUM" if no_policy else "INFO",
            check_category="data_classification",
            result_details={
                "location_count": len(locations),
                "locations_without_retention_policy": len(no_policy),
            },
        )]

    async def _check_directory_exposure(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/locations", **{"page[size]": 100})
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "envoy.directory.public_exposure",
                "Employee directory public exposure",
                "access_control",
                "Grant the API token read access to Locations.",
            )]
        resp.raise_for_status()
        data = resp.json()
        locations = data.get("data", [])
        public_directory = [
            loc for loc in locations
            if (loc.get("attributes") or {}).get("employee-directory-public", False)
            or (loc.get("attributes") or {}).get("employee_directory_public", False)
        ]
        return [IntegrationFinding(
            check_id="envoy.directory.public_exposure",
            title="Employee directory is not publicly exposed at sign-in",
            description=(
                f"{len(public_directory)} of {len(locations)} location(s) "
                "expose the full employee directory to unauthenticated "
                "visitors at the sign-in kiosk."
            ),
            remediation=(
                "Disable public employee-directory lookups at kiosks that "
                "do not require it; require visitors to search by exact "
                "host name instead of browsing the full directory."
            ),
            status="PASSED" if not public_directory else "FAILED",
            severity="MEDIUM" if public_directory else "INFO",
            check_category="access_control",
            result_details={
                "location_count": len(locations),
                "public_directory_location_count": len(public_directory),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Envoy with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
