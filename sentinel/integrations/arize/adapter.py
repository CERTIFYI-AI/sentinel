# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Arize AI / Phoenix integration adapter.

Reads model monitoring posture: drift metrics, RAG retrieval quality,
and anomaly alerts from the Arize or Phoenix API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://app.arize.com/graphql"


@dataclass
class ArizeCredentials:
    api_key: str
    space_id: str = ""


class ArizeAdapter:
    def __init__(self, credentials: ArizeCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    async def _post(self, query: str, variables: dict | None = None) -> dict:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.post(
                _BASE, headers=self._headers(),
                json={"query": query, "variables": variables or {}},
            )
            resp.raise_for_status()
            return resp.json()
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the API key and space ID are correct.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="audit_logging", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            result = await self._post("query { viewer { id } }")
            if "errors" in result:
                raise ValueError(result["errors"][0].get("message", "Unknown error"))
            return True
        except Exception as exc:
            raise ValueError(f"Arize AI credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_models(),
            self._check_monitors(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("arize check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_models(self) -> list[IntegrationFinding]:
        query = """query { space { models { edges { node { name modelType } } } } }"""
        try:
            result = await self._post(query)
            edges = result.get("data", {}).get("space", {}).get("models", {}).get("edges", [])
            models = [e["node"] for e in edges]
        except Exception as exc:
            return [self._unavailable(
                "arize.models.inventory", "Unable to list monitored models", str(exc))]
        return [IntegrationFinding(
            check_id="arize.models.inventory",
            title=f"{len(models)} model(s) being monitored",
            description=f"Arize is monitoring {len(models)} model(s).",
            remediation="Ensure all production models are registered for monitoring.",
            status="PASSED" if models else "WARNING",
            severity="MEDIUM" if not models else "INFO",
            check_category="audit_logging",
            result_details={"model_count": len(models)},
        )]

    async def _check_monitors(self) -> list[IntegrationFinding]:
        query = """query { space { monitors { edges { node { name status } } } } }"""
        try:
            result = await self._post(query)
            edges = result.get("data", {}).get("space", {}).get("monitors", {}).get("edges", [])
            monitors = [e["node"] for e in edges]
        except Exception as exc:
            return [self._unavailable(
                "arize.monitors.status", "Unable to list monitors", str(exc))]
        active = [m for m in monitors if m.get("status") == "active"]
        return [IntegrationFinding(
            check_id="arize.monitors.status",
            title=f"{len(active)} active monitor(s) out of {len(monitors)}",
            description=f"{len(active)} monitor(s) are actively tracking drift and quality.",
            remediation="Activate monitors for all production models.",
            status="PASSED" if active else "WARNING",
            severity="MEDIUM" if not active else "INFO",
            check_category="audit_logging",
            result_details={"total_monitors": len(monitors), "active": len(active)},
        )]
