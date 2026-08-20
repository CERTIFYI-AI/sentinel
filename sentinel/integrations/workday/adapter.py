# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Workday HCM integration adapter.

Reads joiner-mover-leaver (JML) evidence from the Workday REST API:
worker roster and status, manager assignments, and staffing event
history. This evidence feeds access-review and offboarding compliance
checks elsewhere in the platform.

Auth: OAuth2 client-credentials grant against the tenant's Workday
instance (``tenant_url``), using a registered API client's
``client_id`` + ``client_credential``.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+---------------------------------------------+---------------------------+
| check_id                                     | check_category            |
+---------------------------------------------+---------------------------+
| workday.roster.terminated_still_active       | access_control            |
| workday.roster.manager_assignment_coverage   | hr_controls               |
| workday.audit.change_log_availability        | audit_logging             |
+---------------------------------------------+---------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class WorkdayCredentials:
    """Matches dashboard/src/integrations/workday/config.ts credentialFields."""

    tenant_url: str
    client_id: str
    client_credential: str

    def base(self) -> str:
        return self.tenant_url.rstrip("/")


class WorkdayAdapter:
    """Fetches JML roster evidence from Workday HCM."""

    def __init__(self, credentials: WorkdayCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via the client-credentials grant."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            f"{self.credentials.base()}/ccx/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Workday rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID, client "
                "credential, and tenant URL."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{self.credentials.base()}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/ccx/api/v1/workers", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Workday rejected the API request "
                    f"(HTTP {resp.status_code}). Verify the client has "
                    "read access to worker data."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Workday: {exc}") from exc
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
                logger.warning("workday check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/ccx/api/v1/workers", status="Terminated", limit=200)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "workday.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the API client read access to worker status data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        workers = data if isinstance(data, list) else data.get("data", data.get("workers", []))
        still_active = [
            w for w in workers
            if str(w.get("status", w.get("workerStatus", ""))).lower() == "active"
        ]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="workday.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(workers)} terminated worker record(s) reviewed; "
                f"{len(still_active)} still show an active status."
            ),
            remediation=(
                "Deactivate the affected worker accounts and downstream "
                "access immediately, and review the offboarding workflow "
                "that failed to update employment status."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={
                "terminated_reviewed": len(workers),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/ccx/api/v1/workers", status="Active", limit=200)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "workday.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the API client read access to worker organizational data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        workers = data if isinstance(data, list) else data.get("data", data.get("workers", []))
        unassigned = [w for w in workers if not w.get("managerId", w.get("manager"))]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="workday.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(workers)} active worker(s) reviewed; "
                f"{len(unassigned)} have no manager assigned."
            ),
            remediation=(
                "Assign a manager to each unassigned worker so approval "
                "chains and access reviews route correctly."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_reviewed": len(workers),
                "unassigned_count": len(unassigned),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/ccx/api/v1/staffing/events", limit=25)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "workday.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the API client read access to staffing event history.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data if isinstance(data, list) else data.get("data", data.get("events", []))
        passed = len(events) > 0
        return [IntegrationFinding(
            check_id="workday.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(events)} employment record change event(s) retrieved "
                "from the staffing event history."
            ),
            remediation=(
                "Confirm staffing event history capture is enabled for the "
                "worker record types used in access reviews."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="audit_logging",
            result_details={"recent_event_count": len(events)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Workday with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
