# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Slack integration adapter.

Reads access-review and data-location evidence from the Slack Web API:
workspace admin/owner concentration, Enterprise Grid audit log
retrievability, and Slack Connect (external-shared) channel exposure.

Auth: a single bot_token (Bearer, Slack Bot User OAuth Token `xoxb-...`).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://slack.com/api"
_AUDIT_BASE = "https://api.slack.com/audit/v1"

_AUTH_ERRORS = {
    "invalid_auth",
    "not_authed",
    "account_inactive",
    "token_revoked",
    "token_expired",
}


@dataclass
class SlackCredentials:
    """Matches dashboard/src/integrations/slack/config.ts credentialFields."""

    bot_token: str


class SlackAdapter:
    """Fetches access-review and data-location evidence from Slack."""

    def __init__(self, credentials: SlackCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.bot_token}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, base: str, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{base}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await client.post(f"{_BASE}/auth.test", headers=self._headers(), timeout=_TIMEOUT)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Slack rejected the bot token. Verify the token is "
                    "active and belongs to an installed app."
                )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("ok"):
                error = data.get("error", "unknown_error")
                if error in _AUTH_ERRORS:
                    raise ValueError(
                        f"Slack rejected the bot token ({error}). Verify the "
                        "token is active and has not been revoked."
                    )
                raise ValueError(f"Slack auth.test returned an error: {error}")
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Slack: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_concentration(client),
                self._check_audit_log_retrieval(client),
                self._check_external_shared_channels(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("slack check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, _BASE, "/users.list", limit=200)
        data = resp.json()
        if resp.status_code in (401, 403) or not data.get("ok"):
            return [self._unavailable(
                "slack.users.admin_concentration",
                "Workspace admin/owner concentration",
                "least_privilege",
                "Grant the bot token the users:read scope to list members and roles.",
            )]
        members = [m for m in data.get("members", []) if not m.get("deleted") and not m.get("is_bot")]
        admins = [m for m in members if m.get("is_admin") or m.get("is_owner") or m.get("is_primary_owner")]
        total = len(members)
        ratio = (len(admins) / total) if total else 0.0
        passed = total > 0 and ratio <= 0.2
        return [IntegrationFinding(
            check_id="slack.users.admin_concentration",
            title="Workspace admin/owner accounts are not over-concentrated",
            description=(
                f"{len(admins)} of {total} active member(s) hold admin or "
                f"owner privileges ({ratio:.0%})."
            ),
            remediation=(
                "Review workspace admins and owners and demote any account "
                "that does not require standing administrative access."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_owner_count": len(admins),
                "total_active_members": total,
            },
        )]

    async def _check_audit_log_retrieval(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, _AUDIT_BASE, "/logs", limit=1)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "slack.audit.log_retrieval",
                "Enterprise audit log retrievability",
                "audit_logging",
                "Grant the token the auditlogs:read scope (requires an "
                "Enterprise Grid organization token).",
            )]
        try:
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return [self._unavailable(
                "slack.audit.log_retrieval",
                "Enterprise audit log retrievability",
                "audit_logging",
                "Grant the token the auditlogs:read scope (requires an "
                "Enterprise Grid organization token).",
            )]
        entries = data.get("entries", [])
        return [IntegrationFinding(
            check_id="slack.audit.log_retrieval",
            title="Enterprise audit log is retrievable",
            description=f"Audit log API returned {len(entries)} recent entry/entries.",
            remediation=(
                "No action required. Continue forwarding Slack audit log "
                "events into the SIEM for retention."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"recent_entry_count": len(entries)},
        )]

    async def _check_external_shared_channels(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, _BASE, "/conversations.list",
            types="public_channel,private_channel",
            exclude_archived="true",
            limit=200,
        )
        data = resp.json()
        if resp.status_code in (401, 403) or not data.get("ok"):
            return [self._unavailable(
                "slack.channels.external_shared",
                "Slack Connect external-shared channels",
                "access_control",
                "Grant the bot token the channels:read and groups:read scopes.",
            )]
        channels = data.get("channels", [])
        external = [c for c in channels if c.get("is_ext_shared") or c.get("is_pending_ext_shared")]
        return [IntegrationFinding(
            check_id="slack.channels.external_shared",
            title="External-shared (Slack Connect) channels reviewed",
            description=(
                f"{len(external)} of {len(channels)} channel(s) are shared "
                "with an external organization via Slack Connect."
            ),
            remediation=(
                "Review Slack Connect channels for sensitive data exposure "
                "and remove external organizations that no longer need access."
            ),
            status="PASSED" if not external else "WARNING",
            severity="MEDIUM" if external else "INFO",
            check_category="access_control",
            result_details={
                "external_shared_channel_count": len(external),
                "total_channel_count": len(channels),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Slack with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
