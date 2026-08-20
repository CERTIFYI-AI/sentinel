# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Aqua Security integration adapter.

Reads container-security posture from the Aqua Cloud Security Platform:
image vulnerabilities, runtime protection policies, and endpoint agent
status. Auth: an API key issued from Aqua Console > Settings > API Keys.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.cloudsploit.com/v2"


@dataclass
class AquaSecurityCredentials:
    """Matches dashboard/src/integrations/aqua_security/config.ts credentialFields."""

    api_key: str


class AquaSecurityAdapter:
    """Fetches container-security findings from Aqua Security."""

    def __init__(self, credentials: AquaSecurityCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/images", pagesize=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Aqua Security rejected the API key. Verify the key is "
                    "active and has read-only permissions."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Aqua Security: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_image_vulnerabilities(client),
                self._check_runtime_policies(client),
                self._check_enforcer_status(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("aqua_security check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_image_vulnerabilities(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/images", pagesize=100, order_by="-vulnerabilities_high")
        if resp.status_code == 403:
            return [self._unavailable(
                "aqua.images.critical_vulns",
                "Container image vulnerabilities",
                "vulnerability_management",
                "Grant the API key read access to the images endpoint.",
            )]
        resp.raise_for_status()
        data = resp.json()
        images = data.get("result", data) if isinstance(data, dict) else data
        if not isinstance(images, list):
            images = []
        vuln_images = [
            img for img in images
            if (img.get("vulnerabilities_high", 0) or 0) + (img.get("vulnerabilities_critical", 0) or 0) > 0
        ]
        passed = len(vuln_images) == 0
        return [IntegrationFinding(
            check_id="aqua.images.critical_vulns",
            title="No container images with critical/high vulnerabilities",
            description=(
                f"{len(vuln_images)} of {len(images)} scanned image(s) have "
                "critical or high vulnerabilities."
            ),
            remediation=(
                "Rebuild affected images with patched base layers. "
                "Enable Aqua image assurance policies to block vulnerable images."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={
                "total_images": len(images),
                "vulnerable_images": len(vuln_images),
            },
        )]

    async def _check_runtime_policies(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/runtime_policies")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "aqua.runtime.policies",
                "Runtime protection policies",
                "endpoint_protection",
                "Grant the API key read access to runtime policies.",
            )]
        resp.raise_for_status()
        data = resp.json()
        policies = data.get("result", data) if isinstance(data, dict) else data
        if not isinstance(policies, list):
            policies = []
        enabled = [p for p in policies if p.get("enabled", False)]
        passed = len(enabled) > 0
        return [IntegrationFinding(
            check_id="aqua.runtime.policies",
            title="Runtime protection policies are enabled",
            description=(
                f"{len(enabled)} of {len(policies)} runtime policy/policies enabled."
            ),
            remediation=(
                "Enable at least one runtime policy to detect and block "
                "anomalous container behaviour at runtime."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "total_policies": len(policies),
                "enabled_policies": len(enabled),
            },
        )]

    async def _check_enforcer_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/enforcers")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "aqua.enforcers.status",
                "Enforcer agent health",
                "endpoint_protection",
                "Grant the API key read access to enforcers.",
            )]
        resp.raise_for_status()
        data = resp.json()
        enforcers = data.get("result", data) if isinstance(data, dict) else data
        if not isinstance(enforcers, list):
            enforcers = []
        disconnected = [e for e in enforcers if e.get("status", "").lower() != "connected"]
        passed = len(disconnected) == 0 and len(enforcers) > 0
        return [IntegrationFinding(
            check_id="aqua.enforcers.status",
            title="All Aqua enforcers are connected",
            description=(
                f"{len(enforcers)} enforcer(s) total, {len(disconnected)} disconnected."
                if enforcers else "No enforcers registered."
            ),
            remediation=(
                "Investigate disconnected enforcers. Ensure the Aqua agent is "
                "deployed on all container hosts."
            ),
            status="PASSED" if passed else ("WARNING" if enforcers else "FAILED"),
            severity="HIGH" if not enforcers else "MEDIUM",
            check_category="endpoint_protection",
            result_details={
                "total_enforcers": len(enforcers),
                "disconnected": len(disconnected),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Aqua Security with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
