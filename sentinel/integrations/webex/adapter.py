# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Webex integration adapter.

Reads access-review and data-location evidence from the Webex API:
organization admin-role concentration, Admin Audit Events retrievability,
and public meeting exposure.

Auth: a single access_credential (Bearer bot/integration access token).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://webexapis.com/v1"

_ADMIN_ROLE_KEYWORDS = ("admin", "full_admin")


@dataclass
class WebexCredentials:
    """Matches dashboard/src/integrations/webex/config.ts credentialFields."""

    access_credential: str


class WebexAdapter:
    """Fetches access-review and data-location evidence from Webex."""

    def __init__(self, credentials: WebexCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.access_credential}",
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
            resp = await self._get(client, "/people/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Webex rejected the access token. Verify the token is "
                    "active and belongs to an org admin-scoped integration."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Webex: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_role_concentration(client),
                self._check_audit_events_retrieval(client),
                self._check_public_meeting_exposure(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("webex check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_role_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        roles_resp = await self._get(client, "/roles")
        if roles_resp.status_code in (401, 403):
            return [self._unavailable(
                "webex.people.admin_concentration",
                "Organization admin-role concentration",
                "least_privilege",
                "Grant the token the identity:roles_read and identity:people_read scopes.",
            )]
        roles_resp.raise_for_status()
        roles = roles_resp.json().get("items", [])
        admin_role_ids = {
            r["id"] for r in roles
            if any(k in r.get("name", "").lower() for k in _ADMIN_ROLE_KEYWORDS)
        }

        people_resp = await self._get(client, "/people", max=200)
        if people_resp.status_code in (401, 403):
            return [self._unavailable(
                "webex.people.admin_concentration",
                "Organization admin-role concentration",
                "least_privilege",
                "Grant the token the identity:people_read scope.",
            )]
        people_resp.raise_for_status()
        people = people_resp.json().get("items", [])
        admins = [p for p in people if admin_role_ids & set(p.get("roles", []))]

        total = len(people)
        ratio = (len(admins) / total) if total else 0.0
        passed = total > 0 and ratio <= 0.2
        return [IntegrationFinding(
            check_id="webex.people.admin_concentration",
            title="Organization admin-role membership reviewed",
            description=(
                f"{len(admins)} of {total} licensed people hold an "
                f"organization admin role ({ratio:.0%})."
            ),
            remediation=(
                "Review org admin role assignments in Control Hub and remove "
                "standing administrative access that is not required."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_role_count": len(admins),
                "total_people": total,
            },
        )]

    async def _check_audit_events_retrieval(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/adminAudit/events", max=1)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "webex.audit.events_retrieval",
                "Admin audit events retrievability",
                "audit_logging",
                "Grant the token the audit:events_read scope (requires a "
                "Control Hub org admin integration).",
            )]
        resp.raise_for_status()
        events = resp.json().get("items", [])
        return [IntegrationFinding(
            check_id="webex.audit.events_retrieval",
            title="Admin audit events are retrievable",
            description=f"Admin Audit Events API returned {len(events)} recent event(s).",
            remediation=(
                "No action required. Continue forwarding Webex admin audit "
                "events into the SIEM for retention."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"recent_event_count": len(events)},
        )]

    async def _check_public_meeting_exposure(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/meetings", meetingType="meetingSeries", max=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "webex.meetings.public_exposure",
                "Publicly listed meetings",
                "data_classification",
                "Grant the token the meeting:schedules_read scope.",
            )]
        resp.raise_for_status()
        meetings = resp.json().get("items", [])
        public_meetings = [m for m in meetings if m.get("publicMeeting")]
        return [IntegrationFinding(
            check_id="webex.meetings.public_exposure",
            title="Meetings are not listed publicly",
            description=(
                f"{len(public_meetings)} of {len(meetings)} scheduled meeting "
                "series are flagged as publicly listed."
            ),
            remediation=(
                "Disable the 'List meeting on public calendar' option for any "
                "meeting series containing sensitive discussion."
            ),
            status="PASSED" if not public_meetings else "WARNING",
            severity="MEDIUM" if public_meetings else "INFO",
            check_category="data_classification",
            result_details={
                "public_meeting_count": len(public_meetings),
                "total_meeting_series": len(meetings),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Webex with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
