# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Gusto integration adapter.

Reads joiner-mover-leaver (JML) lifecycle evidence from the Gusto
Embedded Payroll API: whether terminated employees are promptly
deactivated, whether active employees have a manager assigned, and
whether the employment record change history is retrievable for audit
evidence.

Auth: OAuth2 client_id + client_credential (client-credentials shape)
against Gusto's token endpoint.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://api.gusto.com/oauth/token"
_BASE = "https://api.gusto.com/v1"


@dataclass
class GustoCredentials:
    """Matches dashboard/src/integrations/gusto/config.ts credentialFields."""

    client_id: str
    client_credential: str
    company_id: str = ""


class GustoAdapter:
    """Fetches JML lifecycle evidence from Gusto."""

    def __init__(self, credentials: GustoCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _AUTH_URL,
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
                "Gusto rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_BASE}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, f"/companies/{self.credentials.company_id}/employees")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Gusto rejected the request for company employees. "
                    "Verify the client has the employees:read scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Gusto: {exc}") from exc
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
                logger.warning("gusto check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, f"/companies/{self.credentials.company_id}/employees", terminated="true"
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "gusto.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the client read access to the Employees API.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("employees", [])
        still_active = [e for e in employees if e.get("onboarded") and not e.get("terminated", True)]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="gusto.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(still_active)} of {len(employees)} terminated employee(s) "
                "still show an active status in Gusto."
            ),
            remediation=(
                "Confirm the termination was processed in Gusto and that "
                "downstream access was revoked at termination."
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
        resp = await self._get(
            client, f"/companies/{self.credentials.company_id}/employees", terminated="false"
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "gusto.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the client read access to the Employees API.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data if isinstance(data, list) else data.get("employees", [])
        missing = [e for e in employees if not e.get("manager_id")]
        passed = len(missing) == 0
        return [IntegrationFinding(
            check_id="gusto.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(missing)} of {len(employees)} active employee(s) have no "
                "manager assigned in Gusto."
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
        resp = await self._get(
            client, f"/companies/{self.credentials.company_id}/employee_history", per="25"
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "gusto.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the client read access to the employee change "
                "history endpoint.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("events", [])
        passed = len(entries) > 0
        return [IntegrationFinding(
            check_id="gusto.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} employment record change entr(y/ies) found."
                if passed else
                "The change history endpoint returned no employment record "
                "change entries."
            ),
            remediation=(
                "Confirm change tracking is enabled for employment records "
                "and that recent changes are being captured."
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
            description="Sentinel could not read this from Gusto with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
