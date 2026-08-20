# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Gitleaks integration adapter.

Reads secrets-scanning results from the Gitleaks cloud API: detected
leaks, scan history, and configuration status.
Auth: a single api_key (Bearer token from the Gitleaks admin panel).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.gitleaks.io/v1"


@dataclass
class GitleaksCredentials:
    """Matches dashboard/src/integrations/gitleaks/config.ts credentialFields."""

    api_key: str


class GitleaksAdapter:
    """Fetches secrets-scanning results from Gitleaks."""

    def __init__(self, credentials: GitleaksCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/health")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Gitleaks rejected the API key. Verify the key is "
                    "active and has read permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Gitleaks: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_open_leaks(client),
                self._check_scan_history(client),
                self._check_configuration_status(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("gitleaks check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_open_leaks(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/leaks", status="open", per_page=100)
        if resp.status_code == 403:
            return [self._unavailable(
                "gitleaks.leaks.open_count",
                "Open secret leaks",
                "secret_management",
                "Grant the API key read access to leaks.",
            )]
        resp.raise_for_status()
        data = resp.json()
        leaks = data if isinstance(data, list) else data.get("leaks", data.get("results", []))
        critical = [l for l in leaks if l.get("severity", "").upper() in ("CRITICAL", "HIGH")]
        passed = len(leaks) == 0
        return [IntegrationFinding(
            check_id="gitleaks.leaks.open_count",
            title="No open secret leaks detected",
            description=(
                f"{len(leaks)} open leak(s), {len(critical)} rated critical/high."
            ),
            remediation=(
                "Rotate compromised credentials immediately and mark the leak "
                "as resolved after remediation."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL" if critical else "HIGH",
            check_category="secret_management",
            result_details={
                "open_leak_count": len(leaks),
                "critical_high_count": len(critical),
            },
        )]

    async def _check_scan_history(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/scans", per_page=10, sort="-created_at")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "gitleaks.scans.recent_activity",
                "Recent scan activity",
                "vulnerability_management",
                "Grant the API key read access to scan history.",
            )]
        resp.raise_for_status()
        data = resp.json()
        scans = data if isinstance(data, list) else data.get("scans", data.get("results", []))
        failed_scans = [s for s in scans if s.get("status", "").lower() == "failed"]
        return [IntegrationFinding(
            check_id="gitleaks.scans.recent_activity",
            title="Secret scanning is running successfully",
            description=(
                f"{len(scans)} recent scan(s), {len(failed_scans)} failed."
            ),
            remediation=(
                "Investigate failed scans. Ensure Gitleaks is configured "
                "to run on all repositories."
            ),
            status="PASSED" if scans and not failed_scans else "WARNING",
            severity="MEDIUM" if failed_scans else "INFO",
            check_category="vulnerability_management",
            result_details={
                "recent_scan_count": len(scans),
                "failed_scan_count": len(failed_scans),
            },
        )]

    async def _check_configuration_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/config")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "gitleaks.config.status",
                "Configuration status",
                "secret_management",
                "Grant the API key read access to configuration.",
            )]
        resp.raise_for_status()
        data = resp.json()
        repos_monitored = data.get("repos_monitored", data.get("repository_count", 0))
        rules_enabled = data.get("rules_enabled", data.get("rule_count", 0))
        passed = repos_monitored > 0 and rules_enabled > 0
        return [IntegrationFinding(
            check_id="gitleaks.config.status",
            title="Gitleaks is properly configured",
            description=(
                f"{repos_monitored} repository/repositories monitored with "
                f"{rules_enabled} detection rule(s) enabled."
            ),
            remediation=(
                "Ensure all repositories are enrolled in Gitleaks scanning "
                "and detection rules cover common credential patterns."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="secret_management",
            result_details={
                "repos_monitored": repos_monitored,
                "rules_enabled": rules_enabled,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Gitleaks with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
