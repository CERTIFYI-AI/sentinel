# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Trivy integration adapter.

Reads container/image scanning posture from a Trivy Server API:
container vulnerability count, misconfiguration findings, and
license compliance for vulnerability management and change
management evidence.

Auth: a Bearer API token against a user-provided Trivy server URL.
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
class TrivyCredentials:
    """Matches dashboard/src/integrations/trivy/config.ts credentialFields."""

    instance_url: str
    api_token: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")


class TrivyAdapter:
    """Fetches container scanning posture from Trivy Server."""

    def __init__(self, credentials: TrivyCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            f"{self.credentials.base_url()}/v1{path}",
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
                    "Trivy Server rejected the token for "
                    f"{self.credentials.instance_url!r} "
                    f"(HTTP {resp.status_code}). Verify the token is valid."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Trivy Server: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_container_vulns(client),
                self._check_misconfigurations(client),
                self._check_license_compliance(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("trivy check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_container_vulns(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/reports", type="vulnerability")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "trivy.containers.vulnerabilities",
                "Container vulnerability count",
                "vulnerability_management",
                "The token cannot read vulnerability reports. Verify "
                "token permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        results = data.get("Results", data.get("results", []))
        critical = 0
        high = 0
        total = 0
        for result in results:
            for vuln in result.get("Vulnerabilities", result.get("vulnerabilities", [])):
                total += 1
                sev = vuln.get("Severity", vuln.get("severity", "")).upper()
                if sev == "CRITICAL":
                    critical += 1
                elif sev == "HIGH":
                    high += 1
        return [IntegrationFinding(
            check_id="trivy.containers.vulnerabilities",
            title="Container vulnerability count reviewed",
            description=(
                f"{total} vulnerability(ies) across scanned images: "
                f"{critical} critical, {high} high."
            ),
            remediation=(
                "Rebuild container images with updated base images and "
                "patched dependencies to resolve critical and high CVEs."
            ),
            status="PASSED" if not critical else "FAILED",
            severity="CRITICAL" if critical else ("HIGH" if high else "INFO"),
            check_category="vulnerability_management",
            result_details={
                "total_vulnerabilities": total,
                "critical_count": critical,
                "high_count": high,
            },
        )]

    async def _check_misconfigurations(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/reports", type="misconfiguration")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "trivy.config.misconfigurations",
                "Misconfiguration findings",
                "change_management",
                "The token cannot read misconfiguration reports. "
                "Verify token permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        results = data.get("Results", data.get("results", []))
        failures = 0
        warnings = 0
        for result in results:
            for misconf in result.get("Misconfigurations", result.get("misconfigurations", [])):
                status = misconf.get("Status", misconf.get("status", "")).upper()
                if status == "FAIL":
                    failures += 1
                elif status == "WARN":
                    warnings += 1
        return [IntegrationFinding(
            check_id="trivy.config.misconfigurations",
            title="Misconfiguration findings reviewed",
            description=(
                f"{failures} misconfiguration failure(s) and {warnings} "
                "warning(s) detected."
            ),
            remediation=(
                "Fix misconfiguration failures in Dockerfiles, Kubernetes "
                "manifests, and IaC templates before deployment."
            ),
            status="PASSED" if not failures else "WARNING",
            severity="HIGH" if failures else ("MEDIUM" if warnings else "INFO"),
            check_category="change_management",
            result_details={
                "failure_count": failures,
                "warning_count": warnings,
            },
        )]

    async def _check_license_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/reports", type="license")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "trivy.licenses.compliance",
                "License compliance",
                "change_management",
                "The token cannot read license reports. Verify token "
                "permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        results = data.get("Results", data.get("results", []))
        restricted = 0
        total = 0
        for result in results:
            for lic in result.get("Licenses", result.get("licenses", [])):
                total += 1
                category = lic.get("Category", lic.get("category", "")).upper()
                if category in ("RESTRICTED", "FORBIDDEN"):
                    restricted += 1
        return [IntegrationFinding(
            check_id="trivy.licenses.compliance",
            title="License compliance reviewed",
            description=(
                f"{total} license(s) detected; {restricted} restricted or "
                "forbidden."
            ),
            remediation=(
                "Replace dependencies with restricted or forbidden licenses "
                "with permissively-licensed alternatives."
            ),
            status="PASSED" if not restricted else "WARNING",
            severity="HIGH" if restricted else "INFO",
            check_category="change_management",
            result_details={
                "total_licenses": total,
                "restricted_count": restricted,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Trivy with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
