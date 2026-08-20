# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Semgrep integration adapter.

Reads SAST scan results from the Semgrep App API: deployment-level
scan status for change management evidence and vulnerability findings
for vulnerability management evidence.

Auth: a Bearer API token scoped to a deployment slug.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://semgrep.dev/api/v1"


@dataclass
class SemgrepCredentials:
    """Matches dashboard/src/integrations/semgrep/config.ts credentialFields."""

    api_token: str
    deployment_slug: str


class SemgrepAdapter:
    """Fetches SAST scan results from Semgrep."""

    def __init__(self, credentials: SemgrepCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(
                client,
                f"/deployments/{self.credentials.deployment_slug}",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Semgrep rejected the API token for deployment "
                    f"{self.credentials.deployment_slug!r} "
                    f"(HTTP {resp.status_code})."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Semgrep: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_scan_status(client),
                self._check_findings(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("semgrep check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_scan_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        slug = self.credentials.deployment_slug
        resp = await self._get(client, f"/deployments/{slug}/scans", page_size="1")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "semgrep.scans.status", "Semgrep scan activity",
                "change_management",
                "The API token cannot read scans. Verify token permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        scans = data.get("scans", [])
        has_recent = len(scans) > 0
        return [IntegrationFinding(
            check_id="semgrep.scans.status",
            title="SAST scans are running",
            description=(
                "At least one scan recorded in the deployment."
                if has_recent else
                "No scans found for this deployment."
            ),
            remediation=(
                "Configure CI to run Semgrep on every pull request so "
                "code changes are scanned before merge."
            ),
            status="PASSED" if has_recent else "WARNING",
            severity="HIGH" if not has_recent else "INFO",
            check_category="change_management",
            result_details={"has_scans": has_recent},
        )]

    async def _check_findings(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        slug = self.credentials.deployment_slug
        resp = await self._get(
            client,
            f"/deployments/{slug}/findings",
            page_size="100",
            triage_state="untriaged",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "semgrep.findings.open", "Open SAST findings",
                "vulnerability_management",
                "The API token cannot read findings. Verify token permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("findings", [])
        high_sev = [f for f in items if f.get("severity", "").lower() in ("error", "high")]
        return [IntegrationFinding(
            check_id="semgrep.findings.open",
            title="Open SAST findings reviewed",
            description=(
                f"{len(items)} untriaged finding(s), "
                f"{len(high_sev)} at high/error severity."
            ),
            remediation=(
                "Triage open findings: fix security-relevant ones and mark "
                "false positives so the backlog reflects real risk."
            ),
            status="PASSED" if not high_sev else "WARNING",
            severity="HIGH" if high_sev else "INFO",
            check_category="vulnerability_management",
            result_details={
                "untriaged_count": len(items),
                "high_severity_count": len(high_sev),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Semgrep with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
