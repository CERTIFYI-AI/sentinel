# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Docebo integration adapter.

Reads security-awareness-training evidence from the Docebo Learn API:
training completion, overdue course assignments, and whether
completion records carry an auditable actor/timestamp trail.

Auth: OAuth2 client_id + client_credential (Docebo API-only
application, client-credentials grant).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
# Docebo's OAuth2 and Learn API endpoints are tenant-subdomain scoped in
# production (https://<tenant>.docebosaas.com); this adapter targets the
# shared API gateway used by API-only applications.
_AUTH_URL = "https://api.docebosaas.com/oauth2/token"
_BASE = "https://api.docebosaas.com"


@dataclass
class DoceboCredentials:
    """Matches dashboard/src/integrations/docebo/config.ts credentialFields."""

    client_id: str
    client_credential: str


class DoceboAdapter:
    """Fetches security-awareness-training posture from Docebo."""

    def __init__(self, credentials: DoceboCredentials, client: httpx.AsyncClient | None = None) -> None:
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
                "scope": "api",
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Docebo rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID "
                "and credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        resp = await client.get(
            f"{_BASE}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            params=params or None,
            timeout=_TIMEOUT,
        )
        return resp

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/manage/v1/user/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Docebo rejected the request with the issued token "
                    f"(HTTP {resp.status_code}). Verify the API-only "
                    "application has the required Learn API scopes."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Docebo: {exc}") from exc
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
                logger.warning("docebo check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _fetch_enrollments(self, client: httpx.AsyncClient) -> httpx.Response:
        return await self._get(
            client, "/learn/v1/enrollments",
            page_size=500, category_name="Security Awareness",
        )

    async def _check_training_completion(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_enrollments(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "docebo.training.completion_rate",
                "Security-awareness training completion rate",
                "hr_controls",
                "Grant the API-only application read access to Learn "
                "enrollments.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data", {}).get("items", data.get("data", [])) if isinstance(data, dict) else data
        items = items if isinstance(items, list) else []
        total = len(items)
        completed = sum(1 for i in items if str(i.get("enrollment_status", "")).lower() == "completed")
        rate = (completed / total) if total else 0.0
        status = "PASSED" if rate >= 0.9 else ("WARNING" if rate >= 0.7 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="docebo.training.completion_rate",
            title="Security-awareness training completion rate",
            description=(
                f"{completed} of {total} enrolled employee(s) have completed "
                f"required security-awareness courses ({rate:.0%})."
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
                "enrolled_count": total,
                "completed_count": completed,
                "completion_rate": round(rate, 4),
            },
        )]

    async def _check_overdue_assignments(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_enrollments(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "docebo.training.overdue_assignments",
                "Overdue training assignments",
                "hr_controls",
                "Grant the API-only application read access to Learn "
                "enrollments.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data", {}).get("items", data.get("data", [])) if isinstance(data, dict) else data
        items = items if isinstance(items, list) else []
        total = len(items)
        overdue = sum(1 for i in items if str(i.get("enrollment_status", "")).lower() == "overdue")
        overdue_rate = (overdue / total) if total else 0.0
        status = "PASSED" if overdue_rate <= 0.05 else ("WARNING" if overdue_rate <= 0.2 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="docebo.training.overdue_assignments",
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
        resp = await self._get(client, "/manage/v1/audit/trail", event_type="course_completed", page_size=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "docebo.training.completion_audit_trail",
                "Training completion audit trail",
                "audit_logging",
                "Grant the API-only application read access to the audit "
                "trail API.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("data", {}).get("items", data.get("data", [])) if isinstance(data, dict) else data
        events = events if isinstance(events, list) else []
        untraceable = sum(1 for e in events if not e.get("actor") or not e.get("event_time"))
        status = "PASSED" if events and not untraceable else ("WARNING" if events else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="docebo.training.completion_audit_trail",
            title="Training completion audit trail",
            description=(
                f"{len(events)} completion event(s) reviewed; {untraceable} "
                "are missing an actor or timestamp."
            ),
            remediation=(
                "Ensure completion events are logged with both the acting "
                "user and a timestamp so completions can be traced during "
                "an audit."
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
            description="Sentinel could not read this from Docebo with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
