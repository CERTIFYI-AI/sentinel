# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Rockset integration adapter.

Reads access-review and data-location evidence from the Rockset REST API:
dormant admin users, audit-log retrievability, and over-broadly scoped API
keys with admin-level access to query real-time data collections.

Auth: a single api_key (Rockset API key), sent as ``Authorization: ApiKey
<key>`` per Rockset's documented header format.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.rockset.com/v1"


@dataclass
class RocksetCredentials:
    """Matches dashboard/src/integrations/rockset/config.ts credentialFields."""

    api_key: str


class RocksetAdapter:
    """Fetches access-review and data-location posture from Rockset."""

    def __init__(self, credentials: RocksetCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"ApiKey {self.credentials.api_key}",
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
            resp = await self._get(client, "/orgs/self")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Rockset rejected the API key. Verify it is active and "
                    "has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Rockset: {exc}") from exc
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
                logger.warning("rockset check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/orgs/self/users")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "rockset.users.dormant_admin",
                "Dormant admin user review",
                "least_privilege",
                "Grant the API key read access to the org users resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data.get("data", [])
        admins = [u for u in users if "admin" in [r.lower() for r in u.get("roles", [])]]
        dormant = [u for u in admins if not u.get("last_login_time") and not u.get("lastLoginTime")]
        return [IntegrationFinding(
            check_id="rockset.users.dormant_admin",
            title="No dormant admin users",
            description=(
                f"{len(admins)} admin user(s), {len(dormant)} with no "
                "recorded login."
            ),
            remediation=(
                "Remove the admin role from users who have never logged in "
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
        resp = await self._get(client, "/orgs/self/auditlogs")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "rockset.account.audit_log_access",
                "Audit-log retrievability",
                "audit_logging",
                "Grant the API key access to the org audit log resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("data", [])
        return [IntegrationFinding(
            check_id="rockset.account.audit_log_access",
            title="Org audit log is retrievable",
            description=(
                f"{len(events)} recent audit event(s) retrieved via the API."
            ),
            remediation=(
                "No action required — audit events are retrievable. If "
                "this count is unexpectedly zero, confirm audit logging is "
                "enabled for the organization."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={
                "recent_event_count": len(events),
            },
        )]

    async def _check_api_key_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/orgs/self/apikeys")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "rockset.apikeys.scope",
                "API key access scope",
                "access_control",
                "Grant the API key read access to the org API-keys resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        keys = data.get("data", [])
        admin_keys = [k for k in keys if "admin" in [r.lower() for r in k.get("roles", [])]]
        return [IntegrationFinding(
            check_id="rockset.apikeys.scope",
            title="API keys are not overly broadly scoped",
            description=(
                f"{len(keys)} API key(s), {len(admin_keys)} with org "
                "admin-level access."
            ),
            remediation=(
                "Issue collection- or workspace-scoped API keys for "
                "integrations that only read or write specific "
                "collections; reserve admin-scoped keys for a minimal, "
                "reviewed set."
            ),
            status="PASSED" if not admin_keys else "WARNING",
            severity="MEDIUM" if admin_keys else "INFO",
            check_category="access_control",
            result_details={
                "api_key_count": len(keys),
                "admin_scoped_key_count": len(admin_keys),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Rockset with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
