# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Anthropic Claude Console integration adapter.

Reads console-level user management, SSO configuration, and security
settings from the Anthropic Admin API.
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
class AnthropicConsoleCredentials:
    api_key: str
    organization_id: str = ""


class AnthropicConsoleAdapter:
    def __init__(self, credentials: AnthropicConsoleCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            remediation="Verify the admin API key has console management access.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="access_control", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get("/models")
            return True
        except Exception as exc:
            raise ValueError(f"Anthropic Console credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_users(),
            self._check_sso_config(),
            self._check_invites(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("anthropic_console check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_users(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/organizations/members")
            members = resp.json().get("data", resp.json().get("members", []))
        except Exception as exc:
            return [self._unavailable(
                "anthropic_console.users.list", "Unable to list console users", str(exc))]
        admins = [m for m in members if m.get("role") in ("admin", "owner")]
        return [IntegrationFinding(
            check_id="anthropic_console.users.list",
            title=f"{len(members)} console user(s), {len(admins)} admin(s)",
            description=f"The console has {len(members)} user(s) and {len(admins)} admin(s).",
            remediation="Review console access quarterly; limit admin roles.",
            status="PASSED" if len(admins) <= 3 else "WARNING",
            severity="MEDIUM" if len(admins) > 3 else "INFO",
            check_category="access_control",
            result_details={"total_users": len(members), "admins": len(admins)},
        )]

    async def _check_sso_config(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/organizations/settings")
            settings = resp.json()
            sso_enabled = settings.get("sso_enabled", False)
        except Exception:
            return [IntegrationFinding(
                check_id="anthropic_console.sso.status",
                title="SSO configuration not available",
                description="Could not read SSO settings; admin scope may be required.",
                remediation="Use an admin-level API key to check SSO configuration.",
                status="NOT_AVAILABLE", severity="MEDIUM",
                check_category="mfa_enforcement", result_details={},
            )]
        return [IntegrationFinding(
            check_id="anthropic_console.sso.status",
            title="SSO is enabled" if sso_enabled else "SSO is not enabled",
            description=("Single sign-on is active for the organisation."
                         if sso_enabled else
                         "SSO is not configured; users authenticate with email/password."),
            remediation="Enable SSO to enforce organisational identity policies." if not sso_enabled else "No action required.",
            status="PASSED" if sso_enabled else "WARNING",
            severity="HIGH" if not sso_enabled else "INFO",
            check_category="mfa_enforcement",
            result_details={"sso_enabled": sso_enabled},
        )]

    async def _check_invites(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/organizations/invites")
            invites = resp.json().get("data", [])
        except Exception:
            return [IntegrationFinding(
                check_id="anthropic_console.invites.pending",
                title="Pending invites not available",
                description="Could not read invite list.",
                remediation="Verify admin access to the invites endpoint.",
                status="NOT_AVAILABLE", severity="LOW",
                check_category="access_control", result_details={},
            )]
        pending = [i for i in invites if i.get("status") == "pending"]
        return [IntegrationFinding(
            check_id="anthropic_console.invites.pending",
            title=f"{len(pending)} pending invite(s)" if pending else "No pending invites",
            description=(f"{len(pending)} invitation(s) are pending acceptance."
                         if pending else "All invitations have been accepted or expired."),
            remediation="Review and expire stale invitations.",
            status="PASSED" if not pending else "WARNING",
            severity="LOW",
            check_category="access_control",
            result_details={"pending_invites": len(pending)},
        )]
