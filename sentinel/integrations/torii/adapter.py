# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Torii integration adapter.

Reads access-review and data-location evidence from the Torii SaaS
management API: stale unused-app licenses (an access-review signal in its
own right for a SaaS-management platform), audit-log retrievability, and
API access token scope.

Auth: a single api_key (Bearer token from Torii Settings > API tokens).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.toriihq.com"


@dataclass
class ToriiCredentials:
    """Matches dashboard/src/integrations/torii/config.ts credentialFields."""

    api_key: str


class ToriiAdapter:
    """Fetches access-review and data-location posture from Torii."""

    def __init__(self, credentials: ToriiCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/apps", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Torii rejected the API token. Verify it is active in "
                    "Settings > API tokens."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Torii: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_unused_licenses(client),
                self._check_audit_log_access(client),
                self._check_api_token_scope(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("torii check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_stale_unused_licenses(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/apps", limit=500)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "torii.apps.stale_unused_licenses",
                "Stale unused-app license review",
                "least_privilege",
                "Grant the API token read access to Apps.",
            )]
        resp.raise_for_status()
        data = resp.json()
        apps = data.get("apps", data.get("data", []))
        stale_licenses = 0
        for app in apps:
            unused = app.get("unusedLicenses", app.get("unused_licenses"))
            if isinstance(unused, int):
                stale_licenses += unused
        return [IntegrationFinding(
            check_id="torii.apps.stale_unused_licenses",
            title="No material stale unused-app license exposure",
            description=(
                f"{len(apps)} managed app(s), {stale_licenses} unused "
                "license(s) still assigned across the SaaS estate."
            ),
            remediation=(
                "Reclaim licenses assigned to users who have not used the "
                "app in the vendor's own usage window; unused seats are "
                "unreviewed standing access."
            ),
            status="PASSED" if stale_licenses == 0 else "WARNING",
            severity="MEDIUM" if stale_licenses else "INFO",
            check_category="least_privilege",
            result_details={
                "managed_app_count": len(apps),
                "stale_unused_license_count": stale_licenses,
            },
        )]

    async def _check_audit_log_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/activities", limit=25)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "torii.account.audit_log_access",
                "Audit-log retrievability",
                "audit_logging",
                "Grant the API token access to the activities endpoint.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("activities", data.get("data", []))
        return [IntegrationFinding(
            check_id="torii.account.audit_log_access",
            title="Torii activity log is retrievable",
            description=(
                f"{len(events)} recent activity event(s) retrieved via the API."
            ),
            remediation=(
                "No action required — activity events are retrievable for "
                "audit purposes. If this count is unexpectedly zero, "
                "confirm activity logging is enabled for the workspace."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={
                "recent_event_count": len(events),
            },
        )]

    async def _check_api_token_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/settings/api-tokens", limit=200)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "torii.tokens.scope",
                "API access token scope",
                "access_control",
                "Grant the API token read access to Settings > API tokens.",
            )]
        resp.raise_for_status()
        data = resp.json()
        tokens = data.get("tokens", data.get("data", []))
        broad_scope = [
            t for t in tokens
            if str(t.get("scope", t.get("role", ""))).lower() in ("admin", "full_access", "owner")
        ]
        return [IntegrationFinding(
            check_id="torii.tokens.scope",
            title="API tokens are not overly broadly scoped",
            description=(
                f"{len(tokens)} API token(s), {len(broad_scope)} with "
                "admin/full-access scope."
            ),
            remediation=(
                "Issue read-only or narrowly scoped tokens for "
                "integrations that do not need write access; reserve "
                "admin-scoped tokens for a minimal, reviewed set."
            ),
            status="PASSED" if not broad_scope else "WARNING",
            severity="MEDIUM" if broad_scope else "INFO",
            check_category="access_control",
            result_details={
                "api_token_count": len(tokens),
                "broad_scope_token_count": len(broad_scope),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Torii with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
