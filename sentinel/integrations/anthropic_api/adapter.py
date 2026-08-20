# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Anthropic Claude API integration adapter.

Reads organisation-level posture from the Anthropic Admin API: workspace
members, API key inventory, and usage boundaries.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.anthropic.com/v1"


@dataclass
class AnthropicApiCredentials:
    api_key: str
    organization_id: str = ""


class AnthropicApiAdapter:
    def __init__(self, credentials: AnthropicApiCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.credentials.api_key,
            "anthropic-version": "2023-06-01",
            "Accept": "application/json",
        }

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
            remediation="Verify the API key has admin-level organisation access.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="access_control", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get("/models")
            return True
        except Exception as exc:
            raise ValueError(f"Anthropic API key rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_models(),
            self._check_workspace_members(),
            self._check_api_keys(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("anthropic_api check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_models(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/models")
            models = resp.json().get("data", [])
        except Exception as exc:
            return [self._unavailable(
                "anthropic.models.inventory", "Unable to list models", str(exc))]
        return [IntegrationFinding(
            check_id="anthropic.models.inventory",
            title=f"{len(models)} model(s) accessible",
            description=f"The organisation has access to {len(models)} Anthropic model(s).",
            remediation="Review model access to ensure only approved models are available.",
            status="PASSED", severity="INFO",
            check_category="data_classification",
            result_details={"model_count": len(models)},
        )]

    async def _check_workspace_members(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/organizations/members")
            members = resp.json().get("data", resp.json().get("members", []))
        except Exception as exc:
            return [self._unavailable(
                "anthropic.org.members", "Unable to list workspace members", str(exc))]
        admins = [m for m in members if m.get("role") in ("admin", "owner")]
        return [IntegrationFinding(
            check_id="anthropic.org.members",
            title=f"{len(members)} workspace member(s), {len(admins)} admin(s)",
            description=f"The workspace has {len(members)} member(s) with "
                        f"{len(admins)} admin-role account(s).",
            remediation="Limit admin-role accounts and review membership quarterly.",
            status="PASSED" if len(admins) <= 3 else "WARNING",
            severity="MEDIUM" if len(admins) > 3 else "INFO",
            check_category="access_control",
            result_details={"total_members": len(members), "admins": len(admins)},
        )]

    async def _check_api_keys(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/organizations/api_keys")
            keys = resp.json().get("data", [])
        except Exception:
            return [IntegrationFinding(
                check_id="anthropic.org.api_keys",
                title="API key inventory not available",
                description="The key inventory endpoint is not accessible; admin scope may be required.",
                remediation="Use an admin-level API key.",
                status="NOT_AVAILABLE", severity="LOW",
                check_category="audit_logging", result_details={},
            )]
        active = [k for k in keys if k.get("status") == "active"]
        return [IntegrationFinding(
            check_id="anthropic.org.api_keys",
            title=f"{len(active)} active API key(s) out of {len(keys)}",
            description=f"The organisation has {len(active)} active key(s).",
            remediation="Revoke unused API keys and rotate active ones periodically.",
            status="PASSED" if len(active) <= 10 else "WARNING",
            severity="MEDIUM" if len(active) > 10 else "INFO",
            check_category="audit_logging",
            result_details={"total_keys": len(keys), "active_keys": len(active)},
        )]
