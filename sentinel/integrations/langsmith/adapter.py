# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""LangSmith / Langfuse integration adapter.

Reads tracing, prompt safety, and observability posture from LangSmith
or Langfuse (self-hosted or cloud).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class LangSmithCredentials:
    api_key: str
    host: str = "https://api.smith.langchain.com"
    project: str = ""


class LangSmithAdapter:
    def __init__(self, credentials: LangSmithCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.credentials.api_key,
            "Accept": "application/json",
        }

    @property
    def _base(self) -> str:
        return self.credentials.host.rstrip("/")

    async def _get(self, path: str, **params: str) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.get(f"{self._base}{path}", headers=self._headers(), params=params)
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the API key and host are correct.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="audit_logging", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get("/sessions")
            return True
        except Exception as exc:
            raise ValueError(f"LangSmith/Langfuse credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_projects(),
            self._check_traces(),
            self._check_feedback(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("langsmith check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_projects(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/sessions")
            projects = resp.json() if isinstance(resp.json(), list) else resp.json().get("data", [])
        except Exception as exc:
            return [self._unavailable(
                "langsmith.projects.inventory", "Unable to list projects", str(exc))]
        return [IntegrationFinding(
            check_id="langsmith.projects.inventory",
            title=f"{len(projects)} project(s) configured",
            description=f"LangSmith workspace has {len(projects)} project(s).",
            remediation="Ensure all production LLM applications have tracing enabled.",
            status="PASSED", severity="INFO",
            check_category="audit_logging",
            result_details={"project_count": len(projects)},
        )]

    async def _check_traces(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/runs", limit="1")
            data = resp.json()
            has_traces = bool(data if isinstance(data, list) else data.get("data", []))
        except Exception:
            return [IntegrationFinding(
                check_id="langsmith.traces.available",
                title="Trace data not accessible",
                description="Could not read trace runs; the key may lack read scope.",
                remediation="Verify the API key has read access to trace data.",
                status="NOT_AVAILABLE", severity="MEDIUM",
                check_category="audit_logging", result_details={},
            )]
        return [IntegrationFinding(
            check_id="langsmith.traces.available",
            title="LLM traces are being collected" if has_traces else "No traces found",
            description=("Trace data is flowing into LangSmith."
                         if has_traces else
                         "No trace data found; LLM calls may not be instrumented."),
            remediation="Instrument all LLM calls with tracing for auditability." if not has_traces else "No action required.",
            status="PASSED" if has_traces else "WARNING",
            severity="HIGH" if not has_traces else "INFO",
            check_category="audit_logging",
            result_details={"has_traces": has_traces},
        )]

    async def _check_feedback(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/feedback", limit="1")
            data = resp.json()
            has_feedback = bool(data if isinstance(data, list) else data.get("data", []))
        except Exception:
            return [IntegrationFinding(
                check_id="langsmith.feedback.available",
                title="Feedback data not accessible",
                description="Could not read feedback; endpoint may not be available.",
                remediation="Configure feedback collection for safety and quality monitoring.",
                status="NOT_AVAILABLE", severity="LOW",
                check_category="data_classification", result_details={},
            )]
        return [IntegrationFinding(
            check_id="langsmith.feedback.available",
            title="Feedback data is being collected" if has_feedback else "No feedback data found",
            description=("Human or automated feedback is flowing into the workspace."
                         if has_feedback else
                         "No feedback data found; safety evaluations may not be running."),
            remediation="Configure automated safety evaluations." if not has_feedback else "No action required.",
            status="PASSED" if has_feedback else "WARNING",
            severity="MEDIUM" if not has_feedback else "INFO",
            check_category="data_classification",
            result_details={"has_feedback": has_feedback},
        )]
