# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Sentry integration adapter.

Reads error monitoring posture from the Sentry API v0: unresolved
issues by severity, project DSN configuration, and release health
for incident response and vulnerability management evidence.

Auth: a Bearer auth token scoped to an organization slug.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://sentry.io/api/0"


@dataclass
class SentryCredentials:
    """Matches dashboard/src/integrations/sentry/config.ts credentialFields."""

    api_token: str
    organization_slug: str


class SentryAdapter:
    """Fetches error monitoring posture from Sentry."""

    def __init__(self, credentials: SentryCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_token}",
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
            org = self.credentials.organization_slug
            resp = await self._get(client, f"/organizations/{org}/")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Sentry rejected the auth token for organization "
                    f"{org!r} (HTTP {resp.status_code}). Verify the token "
                    "and organization slug."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Sentry: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_unresolved_issues(client),
                self._check_dsn_configuration(client),
                self._check_release_health(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("sentry check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_unresolved_issues(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org = self.credentials.organization_slug
        resp = await self._get(
            client,
            f"/organizations/{org}/issues/",
            query="is:unresolved",
            per_page="100",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sentry.issues.unresolved_by_severity",
                "Unresolved issues by severity",
                "incident_response",
                "The auth token cannot read issues. Grant project:read scope.",
            )]
        resp.raise_for_status()
        issues = resp.json()
        fatal = [i for i in issues if i.get("level") == "fatal"]
        error = [i for i in issues if i.get("level") == "error"]
        warning = [i for i in issues if i.get("level") == "warning"]
        return [IntegrationFinding(
            check_id="sentry.issues.unresolved_by_severity",
            title="Unresolved issues by severity reviewed",
            description=(
                f"{len(issues)} unresolved issue(s): {len(fatal)} fatal, "
                f"{len(error)} error, {len(warning)} warning."
            ),
            remediation=(
                "Triage unresolved issues: fix or resolve fatal and error "
                "issues first, then address warnings."
            ),
            status="FAILED" if fatal else ("WARNING" if error else "PASSED"),
            severity="CRITICAL" if fatal else ("HIGH" if error else "INFO"),
            check_category="incident_response",
            result_details={
                "total_unresolved": len(issues),
                "fatal_count": len(fatal),
                "error_count": len(error),
                "warning_count": len(warning),
            },
        )]

    async def _check_dsn_configuration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org = self.credentials.organization_slug
        resp = await self._get(
            client,
            f"/organizations/{org}/projects/",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sentry.projects.dsn_configuration",
                "Project DSN configuration",
                "vulnerability_management",
                "The auth token cannot list projects. Grant project:read scope.",
            )]
        resp.raise_for_status()
        projects = resp.json()
        total = len(projects)
        without_dsn = [
            p for p in projects
            if not p.get("dsn", {}).get("public")
        ]
        return [IntegrationFinding(
            check_id="sentry.projects.dsn_configuration",
            title="Project DSN configuration reviewed",
            description=(
                f"{total} project(s) found; {len(without_dsn)} lack a public DSN."
            ),
            remediation=(
                "Ensure every monitored project has a DSN configured so "
                "errors are captured."
            ),
            status="PASSED" if not without_dsn else "WARNING",
            severity="MEDIUM" if without_dsn else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_projects": total,
                "projects_without_dsn": len(without_dsn),
            },
        )]

    async def _check_release_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org = self.credentials.organization_slug
        resp = await self._get(
            client,
            f"/organizations/{org}/releases/",
            per_page="25",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "sentry.releases.health",
                "Release health",
                "vulnerability_management",
                "The auth token cannot read releases. Grant project:releases scope.",
            )]
        resp.raise_for_status()
        releases = resp.json()
        total = len(releases)
        with_new_issues = [
            r for r in releases
            if r.get("newGroups", 0) > 0
        ]
        return [IntegrationFinding(
            check_id="sentry.releases.health",
            title="Release health reviewed",
            description=(
                f"{total} recent release(s); {len(with_new_issues)} introduced "
                "new issues."
            ),
            remediation=(
                "Investigate releases that introduced new issues and consider "
                "rolling back or hotfixing if severity is high."
            ),
            status="PASSED" if not with_new_issues else "WARNING",
            severity="MEDIUM" if with_new_issues else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_releases": total,
                "releases_with_new_issues": len(with_new_issues),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Sentry with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
