# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""GitHub Copilot integration adapter.

Reads Copilot usage, seat allocation, and policy configuration from
the GitHub REST API for an organisation.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.github.com"


@dataclass
class GithubCopilotCredentials:
    access_token: str
    organization: str


class GithubCopilotAdapter:
    def __init__(self, credentials: GithubCopilotCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def _get(self, path: str) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.get(f"{_BASE}{path}", headers=self._headers())
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the token has Copilot admin read scope for the organisation.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="access_control", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get(f"/orgs/{self.credentials.organization}")
            return True
        except Exception as exc:
            raise ValueError(f"GitHub Copilot credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_copilot_billing(),
            self._check_copilot_seats(),
            self._check_copilot_policies(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("gh_copilot check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_copilot_billing(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get(f"/orgs/{self.credentials.organization}/copilot/billing")
            data = resp.json()
        except Exception as exc:
            return [self._unavailable(
                "gh_copilot.billing.overview", "Unable to read Copilot billing", str(exc))]
        seat_count = data.get("seat_breakdown", {}).get("total", 0)
        plan = data.get("plan_type", "unknown")
        return [IntegrationFinding(
            check_id="gh_copilot.billing.overview",
            title=f"Copilot {plan} plan with {seat_count} seat(s)",
            description=f"The organisation is on the {plan} plan with {seat_count} total seat(s).",
            remediation="Review seat allocation to ensure only authorised developers have access.",
            status="PASSED", severity="INFO",
            check_category="access_control",
            result_details={"plan": plan, "total_seats": seat_count},
        )]

    async def _check_copilot_seats(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get(f"/orgs/{self.credentials.organization}/copilot/billing/seats")
            data = resp.json()
            seats = data.get("seats", [])
        except Exception as exc:
            return [self._unavailable(
                "gh_copilot.seats.allocation", "Unable to list Copilot seats", str(exc))]
        inactive = [s for s in seats if s.get("last_activity_at") is None]
        return [IntegrationFinding(
            check_id="gh_copilot.seats.allocation",
            title=f"{len(seats)} allocated seat(s), {len(inactive)} never used",
            description=(f"{len(inactive)} seat(s) have never been used."
                         if inactive else
                         f"All {len(seats)} seat(s) have been used."),
            remediation="Reclaim unused Copilot seats to reduce cost and limit exposure.",
            status="PASSED" if not inactive else "WARNING",
            severity="MEDIUM" if inactive else "INFO",
            check_category="access_control",
            result_details={"total_seats": len(seats), "never_used": len(inactive)},
        )]

    async def _check_copilot_policies(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get(f"/orgs/{self.credentials.organization}/copilot/billing")
            data = resp.json()
        except Exception as exc:
            return [self._unavailable(
                "gh_copilot.policies.public_code", "Unable to check Copilot policies", str(exc))]
        public_code_suggestions = data.get("public_code_suggestions", "allow")
        blocked = public_code_suggestions == "block"
        return [IntegrationFinding(
            check_id="gh_copilot.policies.public_code",
            title="Public code suggestions blocked" if blocked else "Public code suggestions allowed",
            description=("Copilot blocks suggestions matching public code."
                         if blocked else
                         "Copilot may suggest code matching public repositories."),
            remediation="Block public code suggestions to reduce IP and licensing risk." if not blocked else "No action required.",
            status="PASSED" if blocked else "WARNING",
            severity="HIGH" if not blocked else "INFO",
            check_category="data_classification",
            result_details={"public_code_suggestions": public_code_suggestions},
        )]
