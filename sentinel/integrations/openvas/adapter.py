# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""OpenVAS integration adapter.

Reads vulnerability-scan results from a Greenbone/OpenVAS instance via
the GVM API (GMP over HTTP): scan tasks, vulnerability results, and
severity distributions.
Auth: server_url + username + credential for the GVM web interface.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class OpenVasCredentials:
    """Matches dashboard/src/integrations/openvas/config.ts credentialFields."""

    server_url: str
    username: str
    credential: str

    def base_url(self) -> str:
        return self.server_url.rstrip("/")


class OpenVasAdapter:
    """Fetches vulnerability-scan results from OpenVAS / Greenbone."""

    def __init__(self, credentials: OpenVasCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(
            username=self.credentials.username,
            password=self.credentials.credential,
        )

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/version")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "OpenVAS rejected the credentials. Verify the username, "
                    "credential, and server URL are correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not reach OpenVAS at {self.credentials.server_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_task_results(client),
                self._check_high_severity_vulns(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("openvas check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_task_results(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/tasks")
        if resp.status_code == 403:
            return [self._unavailable(
                "openvas.tasks.result_status",
                "Scan task results",
                "vulnerability_management",
                "Grant the user read access to scan tasks.",
            )]
        resp.raise_for_status()
        data = resp.json()
        tasks = data.get("tasks", data.get("task", []))
        if not isinstance(tasks, list):
            tasks = [tasks] if tasks else []
        failed = [t for t in tasks if t.get("status", "").lower() in ("error", "stopped")]
        passed = len(failed) == 0 and len(tasks) > 0
        return [IntegrationFinding(
            check_id="openvas.tasks.result_status",
            title="All scan tasks completed successfully",
            description=(
                f"{len(tasks)} scan task(s), {len(failed)} in error or stopped state."
            ),
            remediation=(
                "Investigate failed scan tasks. Ensure target hosts are "
                "reachable and scan configurations are valid."
            ),
            status="PASSED" if passed else ("WARNING" if tasks else "FAILED"),
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "total_tasks": len(tasks),
                "failed_tasks": len(failed),
            },
        )]

    async def _check_high_severity_vulns(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/results", filter="severity>7.0", first=1)
        if resp.status_code == 403:
            return [self._unavailable(
                "openvas.results.high_severity",
                "High-severity vulnerabilities",
                "vulnerability_management",
                "Grant the user read access to scan results.",
            )]
        resp.raise_for_status()
        data = resp.json()
        total = data.get("filtered", data.get("result_count", {}).get("filtered", 0))
        if isinstance(total, dict):
            total = total.get("filtered", 0)
        total = int(total) if total else 0
        passed = total == 0
        return [IntegrationFinding(
            check_id="openvas.results.high_severity",
            title="No high-severity vulnerabilities",
            description=f"{total} vulnerability/vulnerabilities with CVSS > 7.0 detected.",
            remediation=(
                "Remediate high-severity vulnerabilities through patching or "
                "compensating controls. Prioritise externally facing assets."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={"high_severity_count": total},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from OpenVAS with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
