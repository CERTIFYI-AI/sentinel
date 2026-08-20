# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""AlexisHR integration adapter.

Reads joiner-mover-leaver (JML) evidence from the AlexisHR API: whether
offboarded employees are promptly deactivated, whether active employees
have a manager assigned, and whether employment-record change history is
retrievable for audit purposes.

Auth: a single api_key (Bearer API key from AlexisHR > Settings > API keys).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.alexishr.com/v1"


@dataclass
class AlexisHRCredentials:
    """Matches dashboard/src/integrations/alexishr/config.ts credentialFields."""

    api_key: str


class AlexisHRAdapter:
    """Fetches JML roster evidence from AlexisHR."""

    def __init__(self, credentials: AlexisHRCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/employees", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "AlexisHR rejected the API key. Verify the key is "
                    "active and has read permissions on employees."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach AlexisHR: {exc}") from exc
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
                logger.warning("alexishr check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employees", status="offboarded", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "alexishr.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the API key read access to the employees resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("data", data.get("employees", []))
        still_active = [e for e in employees if str(e.get("status", "")).lower() == "active"]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="alexishr.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(employees)} offboarded employee record(s) reviewed; "
                f"{len(still_active)} still show an active status in AlexisHR."
            ),
            remediation=(
                "Deactivate offboarded employees in AlexisHR immediately so "
                "downstream access-review evidence stays accurate."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "INFO",
            check_category="access_control",
            result_details={
                "offboarded_count": len(employees),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employees", status="active", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "alexishr.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the API key read access to the employees resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("data", data.get("employees", []))
        unassigned = [e for e in employees if not e.get("managerId")]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="alexishr.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(employees)} active employee(s) reviewed; "
                f"{len(unassigned)} have no manager assigned."
            ),
            remediation=(
                "Assign a manager to every active employee in AlexisHR so "
                "approval and review chains resolve correctly."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_count": len(employees),
                "unassigned_count": len(unassigned),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit-log", limit=10, sort="-occurredAt")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "alexishr.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the API key read access to the audit log.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("data", data.get("entries", []))
        has_recent = len(entries) > 0
        return [IntegrationFinding(
            check_id="alexishr.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} recent employment change record(s) retrieved from AlexisHR."
                if has_recent else
                "The audit-log endpoint returned no recent entries."
            ),
            remediation=(
                "Confirm employment record changes (status, manager, "
                "compensation) are being logged in AlexisHR."
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
            description="Sentinel could not read this from AlexisHR with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
