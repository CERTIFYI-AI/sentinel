# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""PayFit integration adapter.

Reads joiner-mover-leaver (JML) evidence from the PayFit public API:
terminated-employee status hygiene, manager-assignment coverage, and
employment-record change-history availability.

Auth: a single api_key (Bearer token issued from the PayFit partner portal).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://partner-api.payfit.com/v1"


@dataclass
class PayfitCredentials:
    """Matches dashboard/src/integrations/payfit/config.ts credentialFields."""

    api_key: str


class PayfitAdapter:
    """Fetches JML roster evidence from PayFit."""

    def __init__(self, credentials: PayfitCredentials, client: httpx.AsyncClient | None = None) -> None:
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
                    "PayFit rejected the API key. Verify the key is "
                    "active and has read permissions on the employee "
                    "roster."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach PayFit: {exc}") from exc
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
                logger.warning("payfit check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employees", contractStatus="terminated", limit=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "payfit.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the API key read access to the employee roster.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("employees", data.get("results", []))
        still_active = [
            e for e in employees
            if str(e.get("contractStatus", e.get("status", ""))).lower() in ("active", "enabled")
        ]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="payfit.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(still_active)} of {len(employees)} terminated employee(s) "
                "still show an active status in PayFit."
            ),
            remediation=(
                "Disable system access and set contract status to terminated "
                "for every offboarded employee."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "LOW",
            check_category="access_control",
            result_details={
                "terminated_count": len(employees),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employees", contractStatus="active", limit=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "payfit.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the API key read access to the employee roster.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("employees", data.get("results", []))
        unassigned = [e for e in employees if not e.get("managerId")]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="payfit.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(unassigned)} of {len(employees)} active employee(s) have "
                "no manager assigned in PayFit."
            ),
            remediation=(
                "Assign a manager to every active employee so approvals and "
                "access reviews have a clear owner."
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
        resp = await self._get(client, "/employees/history", limit=25)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "payfit.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the API key read access to the change-history "
                "endpoint.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("entries", data.get("results", []))
        has_entries = len(entries) > 0
        return [IntegrationFinding(
            check_id="payfit.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} employment record change entry/entries "
                "retrieved from PayFit's history endpoint."
            ),
            remediation=(
                "Ensure PayFit's change-history logging captures employment "
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
            description="Sentinel could not read this from PayFit with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
