# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""KnowBe4 integration adapter.

Reads security-awareness-training evidence from the KnowBe4 Reporting
API: security-awareness-training completion, phishing-simulation
click rates, and overdue training enrollments.

Auth: a single api_key (Bearer token from the KnowBe4 Reporting API,
Account Settings > API Access).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
# KnowBe4's Reporting API is region-scoped (us/eu/ca); this adapter targets
# the US region endpoint, matching the majority of connected tenants today.
_BASE = "https://us.api.knowbe4.com/v1"

_COMPLETED_STATUSES = {"passed", "completed"}


@dataclass
class Knowbe4Credentials:
    """Matches dashboard/src/integrations/knowbe4/config.ts credentialFields."""

    api_key: str


class Knowbe4Adapter:
    """Fetches security-awareness-training posture from KnowBe4."""

    def __init__(self, credentials: Knowbe4Credentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/account")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "KnowBe4 rejected the API key. Verify the key is "
                    "active and has Reporting API read permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach KnowBe4: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_training_completion(client),
                self._check_phishing_click_rate(client),
                self._check_overdue_enrollments(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("knowbe4 check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _fetch_enrollments(self, client: httpx.AsyncClient) -> httpx.Response:
        return await self._get(client, "/training/enrollments", per_page=500)

    async def _check_training_completion(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_enrollments(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "knowbe4.training.completion_rate",
                "Security-awareness training completion rate",
                "hr_controls",
                "Grant the API key read access to training enrollments.",
            )]
        resp.raise_for_status()
        enrollments = resp.json()
        enrollments = enrollments if isinstance(enrollments, list) else enrollments.get("data", [])
        total = len(enrollments)
        completed = sum(1 for e in enrollments if str(e.get("status", "")).lower() in _COMPLETED_STATUSES)
        rate = (completed / total) if total else 0.0
        status = "PASSED" if rate >= 0.9 else ("WARNING" if rate >= 0.7 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="knowbe4.training.completion_rate",
            title="Security-awareness training completion rate",
            description=(
                f"{completed} of {total} enrolled employee(s) have completed "
                f"required security-awareness training ({rate:.0%})."
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

    async def _check_phishing_click_rate(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/phishing/security_tests", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "knowbe4.phishing.click_rate",
                "Phishing-simulation click rate",
                "incident_response",
                "Grant the API key read access to phishing security tests.",
            )]
        resp.raise_for_status()
        tests = resp.json()
        tests = tests if isinstance(tests, list) else tests.get("data", [])
        closed = [t for t in tests if str(t.get("status", "")).lower() == "closed"]
        sample = closed or tests
        rates = [float(t.get("phish_prone_percentage", 0) or 0) for t in sample]
        avg_rate = (sum(rates) / len(rates) / 100.0) if rates else 0.0
        status = "PASSED" if avg_rate <= 0.05 else ("WARNING" if avg_rate <= 0.15 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="knowbe4.phishing.click_rate",
            title="Phishing-simulation click rate",
            description=(
                f"Average phish-prone percentage across {len(sample)} recent "
                f"simulated phishing campaign(s): {avg_rate:.1%}."
            ),
            remediation=(
                "Target remedial phishing-awareness training at employees who "
                "clicked, and increase simulation frequency for high-risk "
                "groups."
            ),
            status=status,
            severity=severity,
            check_category="incident_response",
            result_details={
                "campaigns_evaluated": len(sample),
                "average_phish_prone_rate": round(avg_rate, 4),
            },
        )]

    async def _check_overdue_enrollments(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_enrollments(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "knowbe4.training.overdue_enrollments",
                "Overdue training enrollments",
                "hr_controls",
                "Grant the API key read access to training enrollments.",
            )]
        resp.raise_for_status()
        enrollments = resp.json()
        enrollments = enrollments if isinstance(enrollments, list) else enrollments.get("data", [])
        now = datetime.now(timezone.utc)
        overdue = 0
        for e in enrollments:
            if str(e.get("status", "")).lower() in _COMPLETED_STATUSES:
                continue
            due_raw = e.get("due_date")
            if not due_raw:
                continue
            try:
                due = datetime.fromisoformat(str(due_raw).replace("Z", "+00:00"))
            except ValueError:
                continue
            if due < now:
                overdue += 1
        total = len(enrollments)
        overdue_rate = (overdue / total) if total else 0.0
        status = "PASSED" if overdue_rate <= 0.05 else ("WARNING" if overdue_rate <= 0.2 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="knowbe4.training.overdue_enrollments",
            title="Overdue training enrollments",
            description=(
                f"{overdue} of {total} enrollment(s) are past their due date "
                f"without completion ({overdue_rate:.0%})."
            ),
            remediation=(
                "Escalate overdue enrollments to managers and re-notify "
                "employees whose training deadline has passed."
            ),
            status=status,
            severity=severity,
            check_category="hr_controls",
            result_details={
                "enrolled_count": total,
                "overdue_count": overdue,
                "overdue_rate": round(overdue_rate, 4),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from KnowBe4 with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
