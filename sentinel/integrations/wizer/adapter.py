# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Wizer integration adapter.

Reads security-awareness-training evidence from the Wizer API:
training completion, phishing-simulation click rate, and
phishing-simulation report rate.

Auth: a single api_key (Bearer token from Wizer Account Settings > API).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.wizer-training.com/v1"

_COMPLETED_STATUSES = {"completed", "passed"}


@dataclass
class WizerCredentials:
    """Matches dashboard/src/integrations/wizer/config.ts credentialFields."""

    api_key: str


class WizerAdapter:
    """Fetches security-awareness-training posture from Wizer."""

    def __init__(self, credentials: WizerCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/organization")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Wizer rejected the API key. Verify the key is "
                    "active and has read permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Wizer: {exc}") from exc
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
                self._check_phishing_report_rate(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("wizer check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_training_completion(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/training/completions", per_page=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "wizer.training.completion_rate",
                "Security-awareness training completion rate",
                "hr_controls",
                "Grant the API key read access to training completions.",
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
            check_id="wizer.training.completion_rate",
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

    async def _fetch_phishing_results(self, client: httpx.AsyncClient) -> httpx.Response:
        return await self._get(client, "/phishing/campaigns/results", per_page=100)

    async def _check_phishing_click_rate(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_phishing_results(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "wizer.phishing.click_rate",
                "Phishing-simulation click rate",
                "incident_response",
                "Grant the API key read access to phishing campaign results.",
            )]
        resp.raise_for_status()
        data = resp.json()
        campaigns = data if isinstance(data, list) else data.get("data", data.get("results", []))
        sent = sum(int(c.get("sent_count", 0) or 0) for c in campaigns)
        clicked = sum(int(c.get("clicked_count", 0) or 0) for c in campaigns)
        click_rate = (clicked / sent) if sent else 0.0
        status = "PASSED" if click_rate <= 0.05 else ("WARNING" if click_rate <= 0.15 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="wizer.phishing.click_rate",
            title="Phishing-simulation click rate",
            description=(
                f"{clicked} of {sent} simulated phishing email(s) sent across "
                f"{len(campaigns)} campaign(s) were clicked ({click_rate:.1%})."
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
                "campaigns_evaluated": len(campaigns),
                "sent_count": sent,
                "clicked_count": clicked,
                "click_rate": round(click_rate, 4),
            },
        )]

    async def _check_phishing_report_rate(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._fetch_phishing_results(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "wizer.phishing.report_rate",
                "Phishing-simulation report rate",
                "incident_response",
                "Grant the API key read access to phishing campaign results.",
            )]
        resp.raise_for_status()
        data = resp.json()
        campaigns = data if isinstance(data, list) else data.get("data", data.get("results", []))
        sent = sum(int(c.get("sent_count", 0) or 0) for c in campaigns)
        reported = sum(int(c.get("reported_count", 0) or 0) for c in campaigns)
        report_rate = (reported / sent) if sent else 0.0
        status = "PASSED" if report_rate >= 0.4 else ("WARNING" if report_rate >= 0.15 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="wizer.phishing.report_rate",
            title="Phishing-simulation report rate",
            description=(
                f"{reported} of {sent} simulated phishing email(s) sent across "
                f"{len(campaigns)} campaign(s) were reported by employees "
                f"({report_rate:.1%})."
            ),
            remediation=(
                "Reinforce 'report suspicious email' workflows and recognise "
                "employees who report simulated phishing to build reporting "
                "culture."
            ),
            status=status,
            severity=severity,
            check_category="incident_response",
            result_details={
                "campaigns_evaluated": len(campaigns),
                "sent_count": sent,
                "reported_count": reported,
                "report_rate": round(report_rate, 4),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Wizer with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
