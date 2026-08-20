# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Lakera / Protect AI integration adapter.

Reads AI guardrail posture: prompt injection detection stats, firewall
policies, and block logs from the Lakera Guard API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.lakera.ai/v1"


@dataclass
class LakeraCredentials:
    api_key: str
    project: str = ""


class LakeraAdapter:
    def __init__(self, credentials: LakeraCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
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

    async def _post(self, path: str, body: dict) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.post(f"{_BASE}{path}", headers=self._headers(), json=body)
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the API key is valid.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="vulnerability_management", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            resp = await self._post("/guard", {"input": "test", "detector": "prompt_injection"})
            resp.json()
            return True
        except Exception as exc:
            raise ValueError(f"Lakera credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_guard_status(),
            self._check_usage_stats(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("lakera check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_guard_status(self) -> list[IntegrationFinding]:
        try:
            resp = await self._post("/guard", {"input": "test validation", "detector": "prompt_injection"})
            data = resp.json()
            is_functional = "results" in data or "flagged" in data
        except Exception as exc:
            return [self._unavailable(
                "lakera.guard.status", "Unable to validate guard endpoint", str(exc))]
        return [IntegrationFinding(
            check_id="lakera.guard.status",
            title="Lakera Guard is operational" if is_functional else "Guard endpoint returned unexpected format",
            description=("The prompt injection detection endpoint is responding correctly."
                         if is_functional else
                         "The guard endpoint is reachable but returned unexpected data."),
            remediation="Investigate guard endpoint configuration." if not is_functional else "No action required.",
            status="PASSED" if is_functional else "WARNING",
            severity="HIGH" if not is_functional else "INFO",
            check_category="vulnerability_management",
            result_details={"functional": is_functional},
        )]

    async def _check_usage_stats(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/usage")
            data = resp.json()
            total_requests = data.get("total_requests", 0)
            blocked = data.get("blocked_requests", 0)
        except Exception:
            return [IntegrationFinding(
                check_id="lakera.usage.stats",
                title="Usage statistics not available",
                description="Could not read usage statistics; endpoint may require additional permissions.",
                remediation="Verify the API key has read access to usage data.",
                status="NOT_AVAILABLE", severity="LOW",
                check_category="audit_logging", result_details={},
            )]
        return [IntegrationFinding(
            check_id="lakera.usage.stats",
            title=f"{total_requests} total request(s), {blocked} blocked",
            description=f"Lakera has processed {total_requests} request(s) "
                        f"and blocked {blocked}.",
            remediation="Review blocked requests for patterns indicating active threats.",
            status="PASSED", severity="INFO",
            check_category="audit_logging",
            result_details={"total_requests": total_requests, "blocked": blocked},
        )]
