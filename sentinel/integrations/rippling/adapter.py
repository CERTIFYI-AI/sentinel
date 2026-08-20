# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Rippling integration adapter.

Reads joiner-mover-leaver (JML) lifecycle evidence from the Rippling
Platform API: whether terminated employees are promptly deactivated,
whether active employees have a manager assigned, and whether the
employment record change history is retrievable for audit evidence.

Auth: a single bearer API key (Rippling App Shop / API app token).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.rippling.com/platform/api"


@dataclass
class RipplingCredentials:
    """Matches dashboard/src/integrations/rippling/config.ts credentialFields."""

    api_key: str


class RipplingAdapter:
    """Fetches JML lifecycle evidence from Rippling."""

    def __init__(self, credentials: RipplingCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/employees", per_page=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Rippling rejected the API key. Verify the key is "
                    "active and has read permissions on Employees."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Rippling: {exc}") from exc
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
                logger.warning("rippling check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employees", employmentStatus="TERMINATED", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "rippling.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the API key read access to Employees.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("results", data.get("employees", []))
        still_active = [
            e for e in employees
            if str(e.get("status", e.get("employmentStatus", ""))).upper() in ("ACTIVE", "ENABLED")
        ]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="rippling.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(still_active)} of {len(employees)} terminated employee(s) "
                "still show an active status in Rippling."
            ),
            remediation=(
                "Confirm the offboarding workflow completed in Rippling and "
                "that downstream app access was revoked at termination."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "INFO",
            check_category="access_control",
            result_details={
                "terminated_count": len(employees),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employees", employmentStatus="ACTIVE", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "rippling.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the API key read access to Employees.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("results", data.get("employees", []))
        missing = [e for e in employees if not e.get("managerId")]
        passed = len(missing) == 0
        return [IntegrationFinding(
            check_id="rippling.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(missing)} of {len(employees)} active employee(s) have no "
                "manager assigned in Rippling."
            ),
            remediation=(
                "Assign a manager to every active employee record so "
                "approval chains and org-chart evidence stay complete."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_count": len(employees),
                "missing_manager_count": len(missing),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit_logs", category="EMPLOYEE_RECORD", per_page=25)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "rippling.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the API key read access to the Audit Log API.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("results", data.get("logs", []))
        passed = len(entries) > 0
        return [IntegrationFinding(
            check_id="rippling.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} employment record change entr(y/ies) found."
                if passed else
                "The audit log endpoint returned no employment record change "
                "entries."
            ),
            remediation=(
                "Confirm audit logging is enabled for employment record "
                "changes and that recent changes are being captured."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="audit_logging",
            result_details={"recent_entry_count": len(entries)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Rippling with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
