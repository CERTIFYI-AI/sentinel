# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""HiBob integration adapter.

Reads joiner-mover-leaver (JML) lifecycle evidence from the HiBob "Bob"
API: whether terminated employees are promptly deactivated, whether
active employees have a manager assigned, and whether the employment
record change history is retrievable for audit evidence.

Auth: HTTP Basic authentication with a Service User ID as the username
and a Service User token (modeled as ``credential``) as the password,
per HiBob's documented Service User API pattern.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.hibob.com/v1"


@dataclass
class HibobCredentials:
    """Matches dashboard/src/integrations/hibob/config.ts credentialFields."""

    service_user_id: str
    credential: str


class HibobAdapter:
    """Fetches JML lifecycle evidence from HiBob."""

    def __init__(self, credentials: HibobCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        pair = f"{self.credentials.service_user_id}:{self.credentials.credential}"
        token = base64.b64encode(pair.encode("utf-8")).decode("ascii")
        return {
            "Authorization": f"Basic {token}",
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

    async def _post(self, client: httpx.AsyncClient, path: str, json: dict) -> httpx.Response:
        return await client.post(
            f"{_BASE}{path}",
            headers=self._headers(),
            json=json,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/company/named-lists/employment-status")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "HiBob rejected the Service User credentials. Verify "
                    "the Service User ID and token are active."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach HiBob: {exc}") from exc
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
                logger.warning("hibob check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(
            client,
            "/people/search",
            json={
                "fields": ["root.id", "root.fullName", "employment.status", "work.isActive"],
                "filters": [
                    {"fieldPath": "employment.status", "operator": "equals", "values": ["Terminated"]}
                ],
            },
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "hibob.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the Service User read access to the People API.",
            )]
        resp.raise_for_status()
        data = resp.json()
        people = data.get("employees", data if isinstance(data, list) else [])
        still_active = [p for p in people if p.get("work", {}).get("isActive", False)]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="hibob.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(still_active)} of {len(people)} terminated employee(s) "
                "still show an active status in HiBob."
            ),
            remediation=(
                "Offboard the affected employee records in HiBob and confirm "
                "downstream access (SSO, apps) was revoked at termination."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "INFO",
            check_category="access_control",
            result_details={
                "terminated_count": len(people),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(
            client,
            "/people/search",
            json={
                "fields": ["root.id", "root.fullName", "work.reportsTo", "employment.status"],
                "filters": [
                    {"fieldPath": "employment.status", "operator": "equals", "values": ["Employed"]}
                ],
            },
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "hibob.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the Service User read access to the People API.",
            )]
        resp.raise_for_status()
        data = resp.json()
        people = data.get("employees", data if isinstance(data, list) else [])
        missing = [p for p in people if not p.get("work", {}).get("reportsTo", {}).get("id")]
        passed = len(missing) == 0
        return [IntegrationFinding(
            check_id="hibob.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(missing)} of {len(people)} active employee(s) have no "
                "manager assigned in HiBob."
            ),
            remediation=(
                "Assign a manager (reportsTo) to every active employee record "
                "so approval chains and org-chart evidence stay complete."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_count": len(people),
                "missing_manager_count": len(missing),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit-trail", since="-30d")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "hibob.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the Service User read access to the Audit Trail API "
                "(HiBob Enterprise add-on).",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("entries", data if isinstance(data, list) else [])
        passed = len(entries) > 0
        return [IntegrationFinding(
            check_id="hibob.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} employment record change entr(y/ies) found in "
                "the last 30 days."
                if passed else
                "The audit trail endpoint returned no entries in the last 30 days."
            ),
            remediation=(
                "Confirm audit trail logging is enabled for employment record "
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
            description="Sentinel could not read this from HiBob with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
