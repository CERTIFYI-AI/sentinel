# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Miro integration adapter.

Reads access-review and data-location evidence from the Miro REST API
(Enterprise Org API + Boards API): admin account hygiene, audit-log
retrievability, and boards left open to public link sharing.

Auth: a single api_key (Bearer token from a Miro OAuth2 app / enterprise
service token).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.miro.com/v2"


@dataclass
class MiroCredentials:
    """Matches dashboard/src/integrations/miro/config.ts credentialFields."""

    api_key: str


class MiroAdapter:
    """Fetches access-review and data-location posture from Miro."""

    def __init__(self, credentials: MiroCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._org_id: str | None = None

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

    async def _org_id_for(self, client: httpx.AsyncClient) -> str | None:
        """Resolve the enterprise org id this token belongs to (cached)."""
        if self._org_id is not None:
            return self._org_id
        resp = await self._get(client, "/orgs")
        if resp.status_code in (401, 403, 404):
            return None
        resp.raise_for_status()
        orgs = resp.json().get("data", [])
        if not orgs:
            return None
        self._org_id = orgs[0].get("id")
        return self._org_id

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/boards", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Miro rejected the API key. Verify the token is active "
                    "and has read access to boards."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Miro: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_audit_log_retrievability(client),
                self._check_public_board_sharing(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("miro check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_id = await self._org_id_for(client)
        if org_id is None:
            return [self._unavailable(
                "miro.org.admin_hygiene",
                "Admin account hygiene",
                "access_control",
                "Grant the token org member read access (Miro Enterprise Org API).",
            )]
        resp = await self._get(client, f"/orgs/{org_id}/members", role="admin", limit=50)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "miro.org.admin_hygiene",
                "Admin account hygiene",
                "access_control",
                "Grant the token org member read access (Miro Enterprise Org API).",
            )]
        resp.raise_for_status()
        data = resp.json()
        members = data if isinstance(data, list) else data.get("members", data.get("data", []))
        admins = [m for m in members if m.get("role", "").lower() == "admin"]
        inactive_admins = [m for m in admins if m.get("active") is False]
        passed = len(inactive_admins) == 0
        return [IntegrationFinding(
            check_id="miro.org.admin_hygiene",
            title="No dormant admin accounts",
            description=(
                f"{len(admins)} admin account(s) found, "
                f"{len(inactive_admins)} inactive/dormant."
            ),
            remediation=(
                "Deactivate or downgrade dormant admin accounts and review the "
                "admin roster on a regular cadence."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if inactive_admins else "INFO",
            check_category="access_control",
            result_details={
                "admin_count": len(admins),
                "inactive_admin_count": len(inactive_admins),
            },
        )]

    async def _check_audit_log_retrievability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_id = await self._org_id_for(client)
        if org_id is None:
            return [self._unavailable(
                "miro.org.audit_log_retrievability",
                "Audit log retrievability",
                "audit_logging",
                "Grant the token audit log read access (Miro Enterprise Audit Logs API).",
            )]
        resp = await self._get(client, f"/orgs/{org_id}/audit_logs", limit=1)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "miro.org.audit_log_retrievability",
                "Audit log retrievability",
                "audit_logging",
                "Grant the token audit log read access (Miro Enterprise Audit Logs API).",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("data", data.get("audit_logs", []))
        retrievable = isinstance(events, list)
        return [IntegrationFinding(
            check_id="miro.org.audit_log_retrievability",
            title="Audit logs are retrievable",
            description=(
                "Audit log API responded with retrievable events."
                if retrievable else
                "Audit log API responded but returned an unexpected shape."
            ),
            remediation=(
                "Ensure Miro Enterprise audit logging is enabled and the "
                "integration token retains audit log read scope."
            ),
            status="PASSED" if retrievable else "WARNING",
            severity="INFO" if retrievable else "MEDIUM",
            check_category="audit_logging",
            result_details={"sample_event_count": len(events) if isinstance(events, list) else 0},
        )]

    async def _check_public_board_sharing(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/boards", limit=50)
        if resp.status_code == 403:
            return [self._unavailable(
                "miro.boards.public_link_sharing",
                "Boards open to public link sharing",
                "data_classification",
                "Grant the token board read access.",
            )]
        resp.raise_for_status()
        data = resp.json()
        boards = data.get("data", data.get("boards", []))
        public_boards = [
            b for b in boards
            if str(b.get("sharingPolicy", {}).get("access", "")).lower() in ("public", "anyone")
        ]
        passed = len(public_boards) == 0
        return [IntegrationFinding(
            check_id="miro.boards.public_link_sharing",
            title="No boards shared publicly via link",
            description=(
                f"{len(public_boards)} of {len(boards)} board(s) checked have "
                "public/anyone-with-the-link sharing enabled."
            ),
            remediation=(
                "Set board sharing policy to organization or invite-only for "
                "boards that may contain sensitive data."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if public_boards else "INFO",
            check_category="data_classification",
            result_details={
                "boards_checked": len(boards),
                "public_board_count": len(public_boards),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Miro with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
