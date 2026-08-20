# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Rollbar integration adapter.

Reads error-tracking posture from the Rollbar API: project activity
(audit logging evidence) and recent error/critical items (incident
response evidence).

Auth: a project or account-level read access token.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.rollbar.com/api/1"


@dataclass
class RollbarCredentials:
    """Matches dashboard/src/integrations/rollbar/config.ts credentialFields."""

    api_token: str


class RollbarAdapter:
    """Fetches error-tracking posture from Rollbar."""

    def __init__(self, credentials: RollbarCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "X-Rollbar-Access-Token": self.credentials.api_token,
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
            resp = await self._get(client, "/projects")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Rollbar rejected the access token "
                    f"(HTTP {resp.status_code}). Verify the token is active "
                    "and has read scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Rollbar: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_project_activity(client),
                self._check_recent_errors(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("rollbar check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_project_activity(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/projects")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "rollbar.projects.activity", "Project activity retrievable",
                "audit_logging",
                "The access token cannot list projects. Grant read access.",
            )]
        resp.raise_for_status()
        data = resp.json()
        projects = data.get("result", [])
        return [IntegrationFinding(
            check_id="rollbar.projects.activity",
            title="Rollbar project activity is retrievable",
            description=f"{len(projects)} project(s) visible via the API.",
            remediation="No action required.",
            status="PASSED" if projects else "WARNING",
            severity="INFO",
            check_category="audit_logging",
            result_details={"project_count": len(projects)},
        )]

    async def _check_recent_errors(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/items", status="active", level="error", limit="20")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "rollbar.items.recent_errors", "Recent error items",
                "incident_response",
                "The access token cannot read items. Grant read:item scope.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("result", [])
        critical = [i for i in items if i.get("level", 0) >= 50]
        return [IntegrationFinding(
            check_id="rollbar.items.recent_errors",
            title="Active error items reviewed",
            description=(
                f"{len(items)} active error-level item(s), "
                f"{len(critical)} at critical level."
            ),
            remediation=(
                "Triage active error items and resolve or mute items that "
                "represent known, accepted behaviour."
            ),
            status="PASSED" if not critical else "WARNING",
            severity="MEDIUM" if critical else "INFO",
            check_category="incident_response",
            result_details={
                "active_errors": len(items),
                "critical_count": len(critical),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Rollbar with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
