# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Dropbox integration adapter.

Reads access-review and data-location evidence from the Dropbox Business
API: team admin-role concentration, team activity log (audit)
retrievability, and publicly-visible shared links.

Auth: a single access_credential (Bearer, team-scoped access token).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.dropboxapi.com/2"

_ADMIN_ROLE_TAGS = {"team_admin", "user_management_admin", "support_admin"}


@dataclass
class DropboxCredentials:
    """Matches dashboard/src/integrations/dropbox/config.ts credentialFields."""

    access_credential: str


class DropboxAdapter:
    """Fetches access-review and data-location evidence from Dropbox Business."""

    def __init__(self, credentials: DropboxCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.access_credential}",
            "Content-Type": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _post(self, client: httpx.AsyncClient, path: str, payload: dict | None = None) -> httpx.Response:
        return await client.post(
            f"{_BASE}{path}",
            headers=self._headers(),
            json=payload or {},
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._post(client, "/team/get_info")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Dropbox rejected the access token. Verify the token is "
                    "a team-scoped Business token and has not expired."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Dropbox: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_concentration(client),
                self._check_team_log_retrieval(client),
                self._check_public_shared_links(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("dropbox check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(client, "/team/members/list_v2", {"limit": 1000})
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "dropbox.team_members.admin_concentration",
                "Team admin-role concentration",
                "least_privilege",
                "Grant the token the members.read scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        members = [
            m for m in data.get("members", [])
            if m.get("profile", {}).get("status", {}).get(".tag") == "active"
        ]
        admins = [
            m for m in members
            if m.get("role", {}).get(".tag") in _ADMIN_ROLE_TAGS
        ]
        total = len(members)
        ratio = (len(admins) / total) if total else 0.0
        passed = total > 0 and ratio <= 0.2
        return [IntegrationFinding(
            check_id="dropbox.team_members.admin_concentration",
            title="Team admin-role concentration reviewed",
            description=(
                f"{len(admins)} of {total} active team member(s) hold a "
                f"team, user-management, or support admin role ({ratio:.0%})."
            ),
            remediation=(
                "Review team admin role assignments in the Admin Console "
                "and remove standing admin access that is not required."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_member_count": len(admins),
                "total_active_members": total,
            },
        )]

    async def _check_team_log_retrieval(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(client, "/team_log/get_events", {"limit": 1})
        if resp.status_code in (401, 403, 409):
            return [self._unavailable(
                "dropbox.audit.team_log_retrieval",
                "Team activity log (audit) retrievability",
                "audit_logging",
                "Grant the token the events.read scope (requires a Dropbox "
                "Business Advanced/Enterprise plan).",
            )]
        resp.raise_for_status()
        events = resp.json().get("events", [])
        return [IntegrationFinding(
            check_id="dropbox.audit.team_log_retrieval",
            title="Team activity log is retrievable",
            description=f"The team_log API returned {len(events)} recent event(s).",
            remediation=(
                "No action required. Continue forwarding Dropbox team log "
                "events into the SIEM for retention."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"recent_event_count": len(events)},
        )]

    async def _check_public_shared_links(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(client, "/sharing/list_shared_links", {})
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "dropbox.shared_links.public_exposure",
                "Publicly-visible shared links",
                "data_classification",
                "Grant the token the sharing.read scope.",
            )]
        resp.raise_for_status()
        links = resp.json().get("links", [])
        public_links = [
            link for link in links
            if (link.get("link_permissions", {}).get("visibility", {}) or {}).get(".tag") == "public"
        ]
        return [IntegrationFinding(
            check_id="dropbox.shared_links.public_exposure",
            title="Shared links are not visible to the public",
            description=(
                f"{len(public_links)} of {len(links)} shared link(s) reviewed "
                "have public visibility."
            ),
            remediation=(
                "Restrict shared link visibility to 'Team only' or a "
                "password-protected link instead of 'Public'."
            ),
            status="PASSED" if not public_links else "WARNING",
            severity="MEDIUM" if public_links else "INFO",
            check_category="data_classification",
            result_details={
                "public_link_count": len(public_links),
                "total_links_reviewed": len(links),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Dropbox with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
