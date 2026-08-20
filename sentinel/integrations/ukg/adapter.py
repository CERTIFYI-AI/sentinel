# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""UKG (UKG Pro / UKG Ready) integration adapter.

Reads joiner-mover-leaver (JML) evidence from the UKG HR API:
employee roster and employment status, supervisor assignments, and
personnel change history. This evidence feeds access-review and
offboarding compliance checks elsewhere in the platform.

Auth: OAuth2 client-credentials grant against the tenant's UKG API
instance (``instance_url``), using a registered API client's
``client_id`` + ``client_credential``.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+---------------------------------------------+---------------------------+
| check_id                                     | check_category            |
+---------------------------------------------+---------------------------+
| ukg.roster.terminated_still_active           | access_control            |
| ukg.roster.manager_assignment_coverage       | hr_controls               |
| ukg.audit.change_log_availability            | audit_logging             |
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
class UkgCredentials:
    """Matches dashboard/src/integrations/ukg/config.ts credentialFields."""

    instance_url: str
    client_id: str
    client_credential: str

    def base(self) -> str:
        return self.instance_url.rstrip("/")


class UkgAdapter:
    """Fetches JML roster evidence from UKG Pro / UKG Ready."""

    def __init__(self, credentials: UkgCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            f"{self.credentials.base()}/api/v1/token",
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
                "UKG rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID, client "
                "credential, and instance URL."
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
            resp = await self._get(client, "/personnel/v1/employees", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "UKG rejected the API request "
                    f"(HTTP {resp.status_code}). Verify the client has "
                    "read access to employee data."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach UKG: {exc}") from exc
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
                logger.warning("ukg check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/personnel/v1/employees", employmentStatus="Terminated", limit=200)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ukg.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the API client read access to employee status data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("items", data.get("employees", []))
        still_active = [
            e for e in employees
            if str(e.get("employmentStatus", e.get("status", ""))).lower() == "active"
        ]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="ukg.roster.terminated_still_active",
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
        resp = await self._get(client, "/personnel/v1/employees", employmentStatus="Active", limit=200)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ukg.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the API client read access to employee organizational data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("items", data.get("employees", []))
        unassigned = [e for e in employees if not e.get("supervisorId", e.get("managerId"))]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="ukg.roster.manager_assignment_coverage",
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
        resp = await self._get(client, "/personnel/v1/employees/changes", limit=25)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ukg.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the API client read access to personnel change history.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("items", data.get("changes", []))
        passed = len(entries) > 0
        return [IntegrationFinding(
            check_id="ukg.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} employment record change entr(y/ies) retrieved."
            ),
            remediation=(
                "Confirm personnel change history capture is enabled for "
                "the employee record types used in access reviews."
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
            description="Sentinel could not read this from UKG with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
