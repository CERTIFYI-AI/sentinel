# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""7shifts integration adapter.

Reads joiner-mover-leaver (JML) evidence from the 7shifts API: whether
terminated staff are promptly deactivated, whether active staff have a
manager/supervisor assigned, and whether employment-record change history
is retrievable for audit purposes.

Auth: a single api_key (Bearer API access token from 7shifts > Company
Settings > API Access).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.7shifts.com/v2"


@dataclass
class SevenShiftsCredentials:
    """Matches dashboard/src/integrations/seven_shifts/config.ts credentialFields."""

    api_key: str


class SevenShiftsAdapter:
    """Fetches JML roster evidence from 7shifts."""

    def __init__(self, credentials: SevenShiftsCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/users", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "7shifts rejected the API access token. Verify the "
                    "token is active and has read permissions on users."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach 7shifts: {exc}") from exc
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
                logger.warning("7shifts check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", status="terminated", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "7shifts.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the API token read access to the users resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("data", data.get("users", []))
        still_active = [u for u in users if bool(u.get("active", False))]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="7shifts.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(users)} terminated user record(s) reviewed; "
                f"{len(still_active)} still show an active status in 7shifts."
            ),
            remediation=(
                "Deactivate terminated staff in 7shifts immediately upon "
                "offboarding so downstream access-review evidence stays accurate."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "INFO",
            check_category="access_control",
            result_details={
                "terminated_count": len(users),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", status="active", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "7shifts.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the API token read access to the users resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("data", data.get("users", []))
        unassigned = [u for u in users if not u.get("reportsTo")]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="7shifts.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(users)} active user(s) reviewed; "
                f"{len(unassigned)} have no manager/supervisor assigned."
            ),
            remediation=(
                "Assign a manager/supervisor to every active user in "
                "7shifts so approval and review chains resolve correctly."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_count": len(users),
                "unassigned_count": len(unassigned),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/company/audit_log", limit=10, sort="-occurred_at")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "7shifts.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the API token read access to the company audit log.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("data", data.get("entries", []))
        has_recent = len(entries) > 0
        return [IntegrationFinding(
            check_id="7shifts.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} recent employment change record(s) retrieved from 7shifts."
                if has_recent else
                "The company audit log endpoint returned no recent entries."
            ),
            remediation=(
                "Confirm employment record changes (status, manager, "
                "role) are being logged in 7shifts."
            ),
            status="PASSED" if has_recent else "WARNING",
            severity="INFO" if has_recent else "MEDIUM",
            check_category="audit_logging",
            result_details={
                "recent_change_count": len(entries),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from 7shifts with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
