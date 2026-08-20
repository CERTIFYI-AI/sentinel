# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Square Payroll integration adapter.

Reads joiner-mover-leaver (JML) evidence from the Square Team Members API:
terminated-employee status hygiene, manager-assignment coverage, and
employment-record change-history availability.

Auth: a single api_key (Bearer access token from a Square application with
the ``EMPLOYEES_READ`` scope).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://connect.squareup.com/v2"


@dataclass
class SquarePayrollCredentials:
    """Matches dashboard/src/integrations/square_payroll/config.ts credentialFields."""

    api_key: str


class SquarePayrollAdapter:
    """Fetches JML roster evidence from Square Payroll."""

    def __init__(self, credentials: SquarePayrollCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _post(self, client: httpx.AsyncClient, path: str, json: dict | None = None) -> httpx.Response:
        return await client.post(
            f"{_BASE}{path}",
            headers=self._headers(),
            json=json or {},
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._post(client, "/team-members/search", {"limit": 1})
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Square rejected the access token. Verify the token is "
                    "active and has the EMPLOYEES_READ scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Square Payroll: {exc}") from exc
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
                logger.warning("square_payroll check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(
            client, "/team-members/search",
            {"query": {"filter": {"status": "INACTIVE"}}, "limit": 200},
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "square_payroll.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the access token EMPLOYEES_READ scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        team_members = data.get("team_members", [])
        still_active = [t for t in team_members if str(t.get("status", "")).upper() == "ACTIVE"]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="square_payroll.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(still_active)} of {len(team_members)} terminated team "
                "member(s) still show an active status in Square."
            ),
            remediation=(
                "Set team member status to INACTIVE and revoke device/POS "
                "access for every offboarded employee."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "LOW",
            check_category="access_control",
            result_details={
                "terminated_count": len(team_members),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(
            client, "/team-members/search",
            {"query": {"filter": {"status": "ACTIVE"}}, "limit": 200},
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "square_payroll.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the access token EMPLOYEES_READ scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        team_members = data.get("team_members", [])
        unassigned = [t for t in team_members if not t.get("primary_manager_id")]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="square_payroll.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(unassigned)} of {len(team_members)} active team "
                "member(s) have no manager assigned in Square."
            ),
            remediation=(
                "Assign a primary manager to every active team member so "
                "approvals and access reviews have a clear owner."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_count": len(team_members),
                "unassigned_count": len(unassigned),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await client.get(
            f"{_BASE}/team-members/changes",
            headers=self._headers(),
            params={"limit": 25},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "square_payroll.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the access token read access to team member change "
                "history.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("changes", data.get("results", []))
        has_entries = len(entries) > 0
        return [IntegrationFinding(
            check_id="square_payroll.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} employment record change entry/entries "
                "retrieved from Square's change history."
            ),
            remediation=(
                "Ensure Square's team member change history captures "
                "employment record modifications so they remain auditable."
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
            description="Sentinel could not read this from Square Payroll with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
