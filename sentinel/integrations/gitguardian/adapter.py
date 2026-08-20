# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""GitGuardian integration adapter.

Reads secrets-detection posture from GitGuardian: open incidents (leaked
credentials), remediation status, and scanning coverage.
Auth: a personal or service access token from GitGuardian > API > Personal
Access Tokens.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.gitguardian.com/v1"


@dataclass
class GitGuardianCredentials:
    """Matches dashboard/src/integrations/gitguardian/config.ts credentialFields."""

    api_key: str


class GitGuardianAdapter:
    """Fetches secrets-detection findings from GitGuardian."""

    def __init__(self, credentials: GitGuardianCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Token {self.credentials.api_key}",
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
                    "GitGuardian rejected the API token. Verify the token is "
                    "active and has read permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach GitGuardian: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_open_incidents(client),
                self._check_unresolved_severity(client),
                self._check_scan_coverage(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("gitguardian check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_open_incidents(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/incidents", status="TRIGGERED", per_page=1)
        if resp.status_code == 403:
            return [self._unavailable(
                "gitguardian.incidents.open_count",
                "Open secret incidents",
                "secret_management",
                "Grant the API token read access to incidents.",
            )]
        resp.raise_for_status()
        # GitGuardian returns total in a header
        total_str = resp.headers.get("x-total-count", "0")
        total = int(total_str) if total_str.isdigit() else 0
        passed = total == 0
        return [IntegrationFinding(
            check_id="gitguardian.incidents.open_count",
            title="No open secret-leak incidents",
            description=f"{total} triggered (open) incident(s) in GitGuardian.",
            remediation=(
                "Rotate compromised credentials immediately and resolve the "
                "incident in GitGuardian after remediation."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="secret_management",
            result_details={"open_incident_count": total},
        )]

    async def _check_unresolved_severity(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/incidents",
            status="TRIGGERED", severity="critical", per_page=1,
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "gitguardian.incidents.critical_unresolved",
                "Critical unresolved incidents",
                "vulnerability_management",
                "Grant the API token read access to incidents with severity filtering.",
            )]
        resp.raise_for_status()
        total_str = resp.headers.get("x-total-count", "0")
        total = int(total_str) if total_str.isdigit() else 0
        passed = total == 0
        return [IntegrationFinding(
            check_id="gitguardian.incidents.critical_unresolved",
            title="No critical unresolved secret incidents",
            description=f"{total} critical unresolved incident(s).",
            remediation=(
                "Critical incidents indicate high-value credentials (cloud keys, "
                "database connection strings) are exposed. Rotate immediately."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="vulnerability_management",
            result_details={"critical_unresolved_count": total},
        )]

    async def _check_scan_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/sources", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "gitguardian.sources.scan_coverage",
                "Repository scan coverage",
                "secret_management",
                "Grant the API token read access to sources.",
            )]
        resp.raise_for_status()
        data = resp.json()
        sources = data if isinstance(data, list) else data.get("results", [])
        active = [s for s in sources if s.get("health", "").lower() == "safe" or s.get("last_scan")]
        return [IntegrationFinding(
            check_id="gitguardian.sources.scan_coverage",
            title="Repository sources are being scanned",
            description=(
                f"{len(active)} of {len(sources)} source(s) have been scanned."
            ),
            remediation=(
                "Add unscanned repositories to GitGuardian monitoring to ensure "
                "full coverage of your codebase."
            ),
            status="PASSED" if len(active) == len(sources) and sources else "WARNING",
            severity="MEDIUM",
            check_category="secret_management",
            result_details={
                "total_sources": len(sources),
                "scanned_sources": len(active),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from GitGuardian with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
