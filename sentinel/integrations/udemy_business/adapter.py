# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Udemy Business integration adapter.

Reads security-awareness-training evidence from the Udemy Business
Admin API: training completion, overdue course assignments, and
whether completion records carry an auditable actor/timestamp trail.

Auth: the Udemy Business Admin API authenticates with HTTP Basic
using a Client ID / Client Secret pair issued from Organization
Settings > API Clients. Sentinel models the pair as client_id +
client_credential to match the OAuth2-shaped credential contract used
across the integration catalog, but the wire protocol below is plain
HTTP Basic — there is no token endpoint to call.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://business-api.udemy.com/api-2.0"


@dataclass
class UdemyBusinessCredentials:
    """Matches dashboard/src/integrations/udemy_business/config.ts credentialFields."""

    client_id: str
    client_credential: str


class UdemyBusinessAdapter:
    """Fetches security-awareness-training posture from Udemy Business."""

    def __init__(self, credentials: UdemyBusinessCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        pair = f"{self.credentials.client_id}:{self.credentials.client_credential}".encode()
        return {
            "Authorization": f"Basic {base64.b64encode(pair).decode()}",
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
            resp = await self._get(client, "/organizations/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Udemy Business rejected the client ID/credential pair. "
                    "Verify the API client is active and has read "
                    "permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Udemy Business: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_training_completion(client),
                self._check_overdue_assignments(client),
                self._check_completion_audit_trail(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("udemy_business check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _fetch_assignments(self, client: httpx.AsyncClient) -> httpx.Response:
        return await self._get(
            client, "/organizations/analytics/assignments",
            page_size=500, tag="security-awareness",
        )

    async def _check_training_completion(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_assignments(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "udemy_business.training.completion_rate",
                "Security-awareness training completion rate",
                "hr_controls",
                "Grant the API client read access to organization "
                "analytics assignments.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("results", data.get("data", [])) if isinstance(data, dict) else data
        items = items if isinstance(items, list) else []
        total = len(items)
        completed = sum(1 for i in items if str(i.get("status", "")).lower() == "completed")
        rate = (completed / total) if total else 0.0
        status = "PASSED" if rate >= 0.9 else ("WARNING" if rate >= 0.7 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="udemy_business.training.completion_rate",
            title="Security-awareness training completion rate",
            description=(
                f"{completed} of {total} assigned employee(s) have completed "
                f"required security-awareness course(s) ({rate:.0%})."
            ),
            remediation=(
                "Follow up with employees who have not completed the required "
                "security-awareness course and escalate overdue completions "
                "to their manager."
            ),
            status=status,
            severity=severity,
            check_category="hr_controls",
            result_details={
                "assigned_count": total,
                "completed_count": completed,
                "completion_rate": round(rate, 4),
            },
        )]

    async def _check_overdue_assignments(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_assignments(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "udemy_business.training.overdue_assignments",
                "Overdue training assignments",
                "hr_controls",
                "Grant the API client read access to organization "
                "analytics assignments.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("results", data.get("data", [])) if isinstance(data, dict) else data
        items = items if isinstance(items, list) else []
        now = datetime.now(timezone.utc)
        overdue = 0
        for i in items:
            if str(i.get("status", "")).lower() == "completed":
                continue
            due_raw = i.get("due_date")
            if not due_raw:
                continue
            try:
                due = datetime.fromisoformat(str(due_raw).replace("Z", "+00:00"))
            except ValueError:
                continue
            if due < now:
                overdue += 1
        total = len(items)
        overdue_rate = (overdue / total) if total else 0.0
        status = "PASSED" if overdue_rate <= 0.05 else ("WARNING" if overdue_rate <= 0.2 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="udemy_business.training.overdue_assignments",
            title="Overdue training assignments",
            description=(
                f"{overdue} of {total} assignment(s) are past due without "
                f"completion ({overdue_rate:.0%})."
            ),
            remediation=(
                "Escalate overdue assignments to managers and re-notify "
                "employees whose training deadline has passed."
            ),
            status=status,
            severity=severity,
            check_category="hr_controls",
            result_details={
                "assignment_count": total,
                "overdue_count": overdue,
                "overdue_rate": round(overdue_rate, 4),
            },
        )]

    async def _check_completion_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/organizations/analytics/activity-log",
            event_type="course_completed", page_size=100,
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "udemy_business.training.completion_audit_trail",
                "Training completion audit trail",
                "audit_logging",
                "Grant the API client read access to the organization "
                "activity log.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("results", data.get("data", [])) if isinstance(data, dict) else data
        events = events if isinstance(events, list) else []
        untraceable = sum(1 for e in events if not e.get("user_id") or not e.get("event_time"))
        status = "PASSED" if events and not untraceable else ("WARNING" if events else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="udemy_business.training.completion_audit_trail",
            title="Training completion audit trail",
            description=(
                f"{len(events)} completion event(s) reviewed; {untraceable} "
                "are missing a user or timestamp."
            ),
            remediation=(
                "Ensure completion events are logged with both the "
                "completing user and a timestamp so completions can be "
                "traced during an audit."
            ),
            status=status,
            severity=severity,
            check_category="audit_logging",
            result_details={
                "events_evaluated": len(events),
                "untraceable_events": untraceable,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Udemy Business with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
