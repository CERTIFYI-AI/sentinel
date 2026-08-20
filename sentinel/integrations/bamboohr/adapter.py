# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""BambooHR integration adapter.

Reads joiner-mover-leaver (JML) evidence from the BambooHR API:
employee roster and employment status (via custom reports, since the
default employee directory excludes terminated employees), reporting
manager assignments, and the recently-changed-employees feed used as
audit evidence. This evidence feeds access-review and offboarding
compliance checks elsewhere in the platform.

Auth: HTTP Basic, with the BambooHR API key as the username and the
literal string "x" as the password, per BambooHR's documented auth
scheme.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+---------------------------------------------+---------------------------+
| check_id                                     | check_category            |
+---------------------------------------------+---------------------------+
| bamboohr.roster.terminated_still_active      | access_control            |
| bamboohr.roster.manager_assignment_coverage  | hr_controls               |
| bamboohr.audit.change_log_availability       | audit_logging             |
+---------------------------------------------+---------------------------+
"""

from __future__ import annotations

import asyncio
import datetime
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
#: BambooHR's documented Basic-auth scheme: API key as username, the
#: literal string "x" as password. This is not a real password.
_BASIC_AUTH_PLACEHOLDER = "x"


@dataclass
class BamboohrCredentials:
    """Matches dashboard/src/integrations/bamboohr/config.ts credentialFields."""

    subdomain: str
    api_key: str

    def base(self) -> str:
        return f"https://api.bamboohr.com/api/gateway.php/{self.subdomain}/v1"


class BamboohrAdapter:
    """Fetches JML roster evidence from BambooHR."""

    def __init__(self, credentials: BamboohrCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(self.credentials.api_key, _BASIC_AUTH_PLACEHOLDER)

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base()}{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _custom_report(
        self, client: httpx.AsyncClient, fields: list[str], status_filter: str | None = None,
    ) -> httpx.Response:
        body: dict = {
            "title": "Sentinel JML evidence",
            "fields": fields,
            "onlyCurrent": False,
        }
        if status_filter:
            body["filters"] = {
                "match": "all",
                "criteria": [{"field": "status", "operator": "equal", "value": status_filter}],
            }
        return await client.post(
            f"{self.credentials.base()}/reports/custom",
            auth=self._auth(),
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            params={"format": "JSON"},
            json=body,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/employees/directory")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "BambooHR rejected the API key "
                    f"(HTTP {resp.status_code}). Verify the key is active "
                    "and the subdomain is correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach BambooHR: {exc}") from exc
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
                logger.warning("bamboohr check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._custom_report(
            client, fields=["status", "terminationDate", "employeeNumber"], status_filter="Terminated",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "bamboohr.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the API key access to custom reports covering employment status.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data.get("employees", data if isinstance(data, list) else [])
        still_active = [e for e in employees if str(e.get("status", "")).lower() == "active"]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="bamboohr.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(employees)} terminated employee record(s) reviewed; "
                f"{len(still_active)} still show an active status."
            ),
            remediation=(
                "Deactivate the affected employee accounts and downstream "
                "access immediately, and review the offboarding workflow "
                "that failed to update employment status."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={
                "terminated_reviewed": len(employees),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._custom_report(
            client, fields=["status", "supervisorId", "employeeNumber"], status_filter="Active",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "bamboohr.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the API key access to custom reports covering the reporting structure.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data.get("employees", data if isinstance(data, list) else [])
        unassigned = [e for e in employees if not e.get("supervisorId")]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="bamboohr.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(employees)} active employee(s) reviewed; "
                f"{len(unassigned)} have no manager assigned."
            ),
            remediation=(
                "Assign a supervisor to each unassigned employee so "
                "approval chains and access reviews route correctly."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_reviewed": len(employees),
                "unassigned_count": len(unassigned),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
        resp = await self._get(client, "/employees/changed", since=since)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "bamboohr.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the API key access to the changed-employees feed.",
            )]
        resp.raise_for_status()
        data = resp.json()
        changed = data.get("employees", data if isinstance(data, dict) else {})
        count = len(changed) if isinstance(changed, (dict, list)) else 0
        passed = count > 0
        return [IntegrationFinding(
            check_id="bamboohr.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{count} employee record(s) with changes in the last 30 days."
            ),
            remediation=(
                "Confirm the changed-employees feed reflects recent HR "
                "activity; an empty result on an active tenant may signal "
                "a reporting gap."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="audit_logging",
            result_details={"changed_employee_count": count},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from BambooHR with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
