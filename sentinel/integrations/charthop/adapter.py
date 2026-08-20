# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""ChartHop integration adapter.

Reads joiner-mover-leaver (JML) evidence from the ChartHop API:
terminated-employee status hygiene, manager-assignment coverage, and
employment-record change-history availability.

Auth: a single api_key (Bearer token from the ChartHop API settings).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.charthop.com/v2"


@dataclass
class CharthopCredentials:
    """Matches dashboard/src/integrations/charthop/config.ts credentialFields."""

    api_key: str


class CharthopAdapter:
    """Fetches JML roster evidence from ChartHop."""

    def __init__(self, credentials: CharthopCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/people", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "ChartHop rejected the API key. Verify the key is "
                    "active and has read permissions on people records."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach ChartHop: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_terminated_still_active(client),
                self._check_manager_assignment_coverage(client),
                self._check_change_log_availability(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("charthop check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/people", status="terminated", limit=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "charthop.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the API key read access to people records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        people = data if isinstance(data, list) else data.get("data", data.get("results", []))
        still_active = [
            p for p in people
            if str(p.get("status", p.get("employeeStatus", ""))).lower() in ("active", "enabled")
        ]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="charthop.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(still_active)} of {len(people)} terminated employee(s) "
                "still show an active status in ChartHop."
            ),
            remediation=(
                "Set employee status to terminated and revoke system access "
                "for every offboarded employee."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "LOW",
            check_category="access_control",
            result_details={
                "terminated_count": len(people),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/people", status="active", limit=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "charthop.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the API key read access to people records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        people = data if isinstance(data, list) else data.get("data", data.get("results", []))
        unassigned = [p for p in people if not p.get("managerId")]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="charthop.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(unassigned)} of {len(people)} active employee(s) have "
                "no manager assigned in ChartHop."
            ),
            remediation=(
                "Assign a manager to every active employee in the org chart "
                "so approvals and access reviews have a clear owner."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_count": len(people),
                "unassigned_count": len(unassigned),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/people/history", limit=25)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "charthop.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the API key read access to the people history "
                "endpoint.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("data", data.get("results", []))
        has_entries = len(entries) > 0
        return [IntegrationFinding(
            check_id="charthop.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} employment record change entry/entries "
                "retrieved from ChartHop's history endpoint."
            ),
            remediation=(
                "Ensure ChartHop's history tracking captures employment "
                "record modifications so they remain auditable."
            ),
            status="PASSED" if has_entries else "WARNING",
            severity="INFO" if has_entries else "MEDIUM",
            check_category="audit_logging",
            result_details={
                "entry_count": len(entries),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from ChartHop with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
