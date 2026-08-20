# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Cursor / Codeium integration adapter.

Reads enterprise team posture: privacy mode enforcement, SSO/SAML
configuration, seat inventory, and data-retention settings.
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
class CursorCodeiumCredentials:
    api_key: str
    team: str = ""
    base_url: str = "https://api.cursor.com/v1"


class CursorCodeiumAdapter:
    def __init__(self, credentials: CursorCodeiumCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }

    @property
    def _base(self) -> str:
        return self.credentials.base_url.rstrip("/")

    async def _get(self, path: str) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.get(f"{self._base}{path}", headers=self._headers())
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the admin API key is valid.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="access_control", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get("/team")
            return True
        except Exception as exc:
            raise ValueError(f"Cursor/Codeium credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_team_members(),
            self._check_privacy_mode(),
            self._check_sso_enforcement(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("cursor check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_team_members(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/team/members")
            members = resp.json().get("members", resp.json().get("data", []))
        except Exception as exc:
            return [self._unavailable(
                "cursor.team.members", "Unable to list team members", str(exc))]
        admins = [m for m in members if m.get("role") == "admin"]
        return [IntegrationFinding(
            check_id="cursor.team.members",
            title=f"{len(members)} team member(s), {len(admins)} admin(s)",
            description=f"The team has {len(members)} member(s) with {len(admins)} admin(s).",
            remediation="Review team membership and limit admin access.",
            status="PASSED", severity="INFO",
            check_category="access_control",
            result_details={"total_members": len(members), "admins": len(admins)},
        )]

    async def _check_privacy_mode(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/team/settings")
            settings = resp.json()
            privacy = settings.get("privacy_mode", settings.get("zero_data_retention", False))
        except Exception:
            return [IntegrationFinding(
                check_id="cursor.privacy.mode",
                title="Privacy mode status not available",
                description="Could not read privacy/data-retention settings.",
                remediation="Verify admin API access to team settings.",
                status="NOT_AVAILABLE", severity="MEDIUM",
                check_category="data_classification", result_details={},
            )]
        return [IntegrationFinding(
            check_id="cursor.privacy.mode",
            title="Privacy mode enabled" if privacy else "Privacy mode disabled",
            description=("Zero data retention / privacy mode is active."
                         if privacy else
                         "Privacy mode is not enabled; code may be retained for training."),
            remediation="Enable privacy mode to prevent code retention." if not privacy else "No action required.",
            status="PASSED" if privacy else "WARNING",
            severity="HIGH" if not privacy else "INFO",
            check_category="data_classification",
            result_details={"privacy_mode": privacy},
        )]

    async def _check_sso_enforcement(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/team/settings")
            settings = resp.json()
            sso = settings.get("sso_enforced", settings.get("saml_enabled", False))
        except Exception:
            return [IntegrationFinding(
                check_id="cursor.sso.enforcement",
                title="SSO enforcement status not available",
                description="Could not read SSO settings.",
                remediation="Verify admin API access.",
                status="NOT_AVAILABLE", severity="MEDIUM",
                check_category="mfa_enforcement", result_details={},
            )]
        return [IntegrationFinding(
            check_id="cursor.sso.enforcement",
            title="SSO enforced" if sso else "SSO not enforced",
            description=("SAML SSO is enforced for all team members."
                         if sso else
                         "SSO is not enforced; users authenticate with individual credentials."),
            remediation="Enforce SSO for enterprise identity governance." if not sso else "No action required.",
            status="PASSED" if sso else "WARNING",
            severity="HIGH" if not sso else "INFO",
            check_category="mfa_enforcement",
            result_details={"sso_enforced": sso},
        )]
