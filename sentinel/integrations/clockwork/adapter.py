# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Clockwork integration adapter.

Reads access-review and data-location evidence from Clockwork's admin
REST API: dormant admin users, audit-event retrievability, and
over-broadly scoped API keys/integrations.

This adapter follows the conservative, generic shape common to SaaS admin
APIs (list users, list audit events, list API keys) since Clockwork does
not publish a broadly documented public API surface beyond that.

Auth: a single api_key (Bearer token from Clockwork admin settings).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.clockwork.io/v1"


@dataclass
class ClockworkCredentials:
    """Matches dashboard/src/integrations/clockwork/config.ts credentialFields."""

    api_key: str


class ClockworkAdapter:
    """Fetches access-review and data-location posture from Clockwork."""

    def __init__(self, credentials: ClockworkCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

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

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/users", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Clockwork rejected the API key. Verify it is active "
                    "and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Clockwork: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admins(client),
                self._check_audit_log_access(client),
                self._check_api_key_scope(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("clockwork check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", role="admin", limit=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "clockwork.users.dormant_admin",
                "Dormant admin user review",
                "least_privilege",
                "Grant the API key read access to the users resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data.get("users", data.get("data", []))
        admins = [u for u in users if str(u.get("role", "")).lower() == "admin"]
        dormant = [u for u in admins if not u.get("last_login_at")]
        return [IntegrationFinding(
            check_id="clockwork.users.dormant_admin",
            title="No dormant admin users",
            description=(
                f"{len(admins)} admin user(s), {len(dormant)} with no "
                "recorded login."
            ),
            remediation=(
                "Remove or downgrade admin users who have never logged in "
                "or have been inactive for an extended period."
            ),
            status="PASSED" if not dormant else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "dormant_admin_count": len(dormant),
            },
        )]

    async def _check_audit_log_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit-events", limit=25)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "clockwork.account.audit_log_access",
                "Audit-event retrievability",
                "audit_logging",
                "Grant the API key access to the audit-events resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("events", data.get("data", []))
        return [IntegrationFinding(
            check_id="clockwork.account.audit_log_access",
            title="Audit events are retrievable",
            description=(
                f"{len(events)} recent audit event(s) retrieved via the API."
            ),
            remediation=(
                "No action required — audit events are retrievable. If "
                "this count is unexpectedly zero, confirm audit logging is "
                "enabled for the account."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={
                "recent_event_count": len(events),
            },
        )]

    async def _check_api_key_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/api-keys", limit=200)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "clockwork.apikeys.scope",
                "API key/integration access scope",
                "access_control",
                "Grant the API key read access to the api-keys resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        keys = data.get("keys", data.get("data", []))
        broad_scope = [k for k in keys if str(k.get("scope", k.get("role", ""))).lower() in ("admin", "full_access", "owner")]
        return [IntegrationFinding(
            check_id="clockwork.apikeys.scope",
            title="API keys are not overly broadly scoped",
            description=(
                f"{len(keys)} API key(s)/integration(s), {len(broad_scope)} "
                "with admin/full-access scope."
            ),
            remediation=(
                "Issue narrowly scoped, read-only keys for integrations "
                "that do not need write access; reserve admin-scoped keys "
                "for a minimal, reviewed set."
            ),
            status="PASSED" if not broad_scope else "WARNING",
            severity="MEDIUM" if broad_scope else "INFO",
            check_category="access_control",
            result_details={
                "api_key_count": len(keys),
                "broad_scope_key_count": len(broad_scope),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Clockwork with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
