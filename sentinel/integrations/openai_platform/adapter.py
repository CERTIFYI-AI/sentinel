# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""OpenAI integration adapter.

Reads organisation-level posture from the OpenAI Admin API: member list,
API key inventory, project configuration, and usage boundaries.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.openai.com/v1"


@dataclass
class OpenAiCredentials:
    api_key: str
    organization_id: str = ""


class OpenAiAdapter:
    def __init__(self, credentials: OpenAiCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        h: dict[str, str] = {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }
        if self.credentials.organization_id:
            h["OpenAI-Organization"] = self.credentials.organization_id
        return h

    async def _get(self, path: str, **params: str) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.get(f"{_BASE}{path}", headers=self._headers(), params=params)
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the API key has admin-level access.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="access_control", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get("/models")
            return True
        except Exception as exc:
            raise ValueError(f"OpenAI API key rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_models_inventory(),
            self._check_org_members(),
            self._check_api_usage(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("openai check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_models_inventory(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/models")
            data = resp.json().get("data", [])
        except Exception as exc:
            return [self._unavailable(
                "openai.models.inventory", "Unable to list models", str(exc))]
        ft_models = [m for m in data if m.get("owned_by", "").startswith("ft:")]
        return [IntegrationFinding(
            check_id="openai.models.inventory",
            title=f"{len(data)} models accessible, {len(ft_models)} fine-tuned",
            description=f"{len(data)} model(s) available to this organisation, "
                        f"including {len(ft_models)} fine-tuned model(s).",
            remediation="Review fine-tuned models for data-retention compliance.",
            status="PASSED", severity="INFO",
            check_category="data_classification",
            result_details={"total_models": len(data), "fine_tuned": len(ft_models)},
        )]

    async def _check_org_members(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/organization/users")
            members = resp.json().get("members", resp.json().get("data", []))
        except Exception as exc:
            return [self._unavailable(
                "openai.org.members", "Unable to list organisation members", str(exc))]
        owners = [m for m in members if m.get("role") == "owner"]
        return [IntegrationFinding(
            check_id="openai.org.members",
            title=f"{len(members)} org members, {len(owners)} owner(s)",
            description=f"The OpenAI organisation has {len(members)} member(s) "
                        f"with {len(owners)} owner-role account(s).",
            remediation="Limit owner-role accounts to a minimum and review membership quarterly.",
            status="PASSED" if len(owners) <= 3 else "WARNING",
            severity="MEDIUM" if len(owners) > 3 else "INFO",
            check_category="access_control",
            result_details={"total_members": len(members), "owners": len(owners)},
        )]

    async def _check_api_usage(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/organization/usage", bucket_width="1d")
            data = resp.json()
        except Exception:
            return [IntegrationFinding(
                check_id="openai.org.usage",
                title="Usage data not available",
                description="The usage endpoint did not return data; the key may lack admin scope.",
                remediation="Use an admin-level API key to access usage data.",
                status="NOT_AVAILABLE", severity="LOW",
                check_category="audit_logging", result_details={},
            )]
        return [IntegrationFinding(
            check_id="openai.org.usage",
            title="Organisation usage data accessible",
            description="Usage telemetry is accessible for audit and cost-governance purposes.",
            remediation="Review usage data periodically for anomalous consumption.",
            status="PASSED", severity="INFO",
            check_category="audit_logging",
            result_details={"has_data": bool(data)},
        )]
