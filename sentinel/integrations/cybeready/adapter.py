# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""CybeReady integration adapter.

Reads security-awareness-training evidence from the CybeReady API:
training completion, phishing-simulation click rate, and the share of
employees flagged as repeat clickers ("at risk") and auto-enrolled in
remedial training.

Auth: a single api_key (Bearer token from CybeReady Admin Console >
API Access).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.cybeready.com/v1"

_COMPLETED_STATUSES = {"completed", "passed"}


@dataclass
class CybereadyCredentials:
    """Matches dashboard/src/integrations/cybeready/config.ts credentialFields."""

    api_key: str


class CybereadyAdapter:
    """Fetches security-awareness-training posture from CybeReady."""

    def __init__(self, credentials: CybereadyCredentials, client: httpx.AsyncClient | None = None) -> None:
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
                    "CybeReady rejected the API key. Verify the key is "
                    "active and has read permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach CybeReady: {exc}") from exc
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
                self._check_at_risk_employees(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("cybeready check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_training_completion(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/training/progress", per_page=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "cybeready.training.completion_rate",
                "Security-awareness training completion rate",
                "hr_controls",
                "Grant the API key read access to training progress.",
            )]
        resp.raise_for_status()
        data = resp.json()
        records = data if isinstance(data, list) else data.get("data", data.get("results", []))
        total = len(records)
        completed = sum(1 for r in records if str(r.get("status", "")).lower() in _COMPLETED_STATUSES)
        rate = (completed / total) if total else 0.0
        status = "PASSED" if rate >= 0.9 else ("WARNING" if rate >= 0.7 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="cybeready.training.completion_rate",
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

    async def _fetch_simulation_results(self, client: httpx.AsyncClient) -> httpx.Response:
        return await self._get(client, "/phishing/simulations/results", per_page=200)

    async def _check_phishing_click_rate(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_simulation_results(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "cybeready.phishing.click_rate",
                "Phishing-simulation click rate",
                "incident_response",
                "Grant the API key read access to phishing simulation results.",
            )]
        resp.raise_for_status()
        data = resp.json()
        simulations = data if isinstance(data, list) else data.get("data", data.get("results", []))
        sent = sum(int(s.get("sent_count", 0) or 0) for s in simulations)
        clicked = sum(int(s.get("clicked_count", 0) or 0) for s in simulations)
        click_rate = (clicked / sent) if sent else 0.0
        status = "PASSED" if click_rate <= 0.05 else ("WARNING" if click_rate <= 0.15 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="cybeready.phishing.click_rate",
            title="Phishing-simulation click rate",
            description=(
                f"{clicked} of {sent} simulated phishing email(s) sent across "
                f"{len(simulations)} simulation(s) were clicked ({click_rate:.1%})."
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
                "simulations_evaluated": len(simulations),
                "sent_count": sent,
                "clicked_count": clicked,
                "click_rate": round(click_rate, 4),
            },
        )]

    async def _check_at_risk_employees(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/phishing/at-risk-employees", per_page=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "cybeready.training.at_risk_employees",
                "Employees flagged at risk for repeat phishing clicks",
                "hr_controls",
                "Grant the API key read access to at-risk employee reporting.",
            )]
        resp.raise_for_status()
        data = resp.json()
        at_risk = data if isinstance(data, list) else data.get("data", data.get("results", []))
        total_employees = data.get("total_employees") if isinstance(data, dict) else None
        total_employees = total_employees or len(at_risk) or 1
        at_risk_count = len(at_risk)
        at_risk_rate = at_risk_count / total_employees
        status = "PASSED" if at_risk_rate <= 0.05 else ("WARNING" if at_risk_rate <= 0.15 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="cybeready.training.at_risk_employees",
            title="Employees flagged at risk for repeat phishing clicks",
            description=(
                f"{at_risk_count} of {total_employees} employee(s) are flagged "
                f"as repeat clickers auto-enrolled in remedial training "
                f"({at_risk_rate:.0%})."
            ),
            remediation=(
                "Confirm remedial training auto-enrollment is completing for "
                "flagged employees and consider manager escalation for "
                "repeat offenders."
            ),
            status=status,
            severity=severity,
            check_category="hr_controls",
            result_details={
                "total_employees": total_employees,
                "at_risk_count": at_risk_count,
                "at_risk_rate": round(at_risk_rate, 4),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from CybeReady with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
