# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Azure OpenAI integration adapter.

Reads deployment inventory, content-filtering posture, and network rules
from an Azure OpenAI resource via the Azure Management REST API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_API_VERSION = "2024-10-01"


@dataclass
class AzureOpenAiCredentials:
    resource_name: str
    api_key: str
    tenant_id: str = ""
    subscription_id: str = ""


class AzureOpenAiAdapter:
    def __init__(self, credentials: AzureOpenAiCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    @property
    def _base(self) -> str:
        return f"https://{self.credentials.resource_name}.openai.azure.com"

    def _headers(self) -> dict[str, str]:
        return {
            "api-key": self.credentials.api_key,
            "Accept": "application/json",
        }

    async def _get(self, path: str, **params: str) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        params.setdefault("api-version", _API_VERSION)
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
            remediation="Verify the API key and resource name are correct.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="access_control", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get("/openai/deployments")
            return True
        except Exception as exc:
            raise ValueError(f"Azure OpenAI credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_deployments(),
            self._check_content_filtering(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("aoai check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_deployments(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/openai/deployments")
            deployments = resp.json().get("data", [])
        except Exception as exc:
            return [self._unavailable(
                "aoai.deployments.inventory", "Unable to list deployments", str(exc))]
        models = [d.get("model", "unknown") for d in deployments]
        return [IntegrationFinding(
            check_id="aoai.deployments.inventory",
            title=f"{len(deployments)} deployment(s) on {self.credentials.resource_name}",
            description=f"Azure OpenAI resource has {len(deployments)} active deployment(s).",
            remediation="Review deployments for unused capacity and data-residency compliance.",
            status="PASSED", severity="INFO",
            check_category="data_classification",
            result_details={"count": len(deployments), "models": models[:20]},
        )]

    async def _check_content_filtering(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/openai/deployments")
            deployments = resp.json().get("data", [])
        except Exception as exc:
            return [self._unavailable(
                "aoai.content_filter.status", "Unable to check content filtering", str(exc))]
        unfiltered: list[str] = []
        for d in deployments:
            rai = d.get("rai_policy_name") or d.get("content_filter_policy")
            if not rai:
                unfiltered.append(d.get("id", "unknown"))
        status = "PASSED" if not unfiltered else "WARNING"
        return [IntegrationFinding(
            check_id="aoai.content_filter.status",
            title=("All deployments have content filtering"
                   if not unfiltered else
                   f"{len(unfiltered)} deployment(s) lack content filtering"),
            description=("Content filtering is active on all deployments."
                         if not unfiltered else
                         f"Deployments without filtering: {', '.join(unfiltered[:10])}"),
            remediation="Enable content filtering on all deployments to comply with responsible AI policies.",
            status=status, severity="HIGH" if unfiltered else "INFO",
            check_category="data_classification",
            result_details={"unfiltered": unfiltered[:20], "total": len(deployments)},
        )]
