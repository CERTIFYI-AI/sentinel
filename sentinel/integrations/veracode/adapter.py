# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Veracode integration adapter.

Reads application security posture from the Veracode REST API:
application scan findings, policy compliance, and sandbox scan
status for vulnerability management and change management evidence.

Auth: API ID + API key via HMAC-based authentication.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import time
import uuid
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.veracode.com/appsec/v2"


@dataclass
class VeracodeCredentials:
    """Matches dashboard/src/integrations/veracode/config.ts credentialFields."""

    api_id: str
    api_key: str


class VeracodeAdapter:
    """Fetches application security posture from Veracode."""

    def __init__(self, credentials: VeracodeCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth_header(self, method: str, url: str) -> str:
        """Generate Veracode HMAC authorization header."""
        nonce = uuid.uuid4().hex
        timestamp = str(int(time.time() * 1000))
        signing_data = f"id={self.credentials.api_id}&host=api.veracode.com&url={url}&method={method}"
        key_nonce = hmac.new(
            self.credentials.api_key.encode("utf-8"),
            nonce.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        key_date = hmac.new(
            key_nonce.encode("utf-8"),
            timestamp.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        signature = hmac.new(
            key_date.encode("utf-8"),
            signing_data.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return (
            f"VERACODE-HMAC-SHA-256 "
            f"id={self.credentials.api_id},"
            f"ts={timestamp},"
            f"nonce={nonce},"
            f"sig={signature}"
        )

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        url = f"{_BASE}{path}"
        return await client.get(
            url,
            headers={
                "Authorization": self._auth_header("GET", path),
                "Accept": "application/json",
            },
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/applications", size="1")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Veracode rejected the API credentials "
                    f"(HTTP {resp.status_code}). Verify the API ID and "
                    "API key."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Veracode: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_scan_findings(client),
                self._check_policy_compliance(client),
                self._check_sandbox_scans(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("veracode check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_scan_findings(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/applications", size="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "veracode.apps.scan_findings",
                "Application scan findings",
                "vulnerability_management",
                "The API credentials cannot list applications. Verify "
                "the API ID has the Results API role.",
            )]
        resp.raise_for_status()
        data = resp.json()
        apps = data.get("_embedded", {}).get("applications", [])
        total = len(apps)
        very_high = [
            a for a in apps
            if a.get("profile", {}).get("policies", [{}])[0].get("policy_compliance_status", "") == "Did Not Pass"
        ]
        return [IntegrationFinding(
            check_id="veracode.apps.scan_findings",
            title="Application scan findings reviewed",
            description=(
                f"{total} application(s) found; {len(very_high)} did not pass "
                "their policy scan."
            ),
            remediation=(
                "Review applications that did not pass their policy scan "
                "and remediate high-severity findings."
            ),
            status="PASSED" if not very_high else "FAILED",
            severity="HIGH" if very_high else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_applications": total,
                "did_not_pass": len(very_high),
            },
        )]

    async def _check_policy_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/applications", size="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "veracode.policy.compliance",
                "Policy compliance",
                "change_management",
                "The API credentials cannot read policy status. Verify "
                "the API ID has the Results API role.",
            )]
        resp.raise_for_status()
        data = resp.json()
        apps = data.get("_embedded", {}).get("applications", [])
        total = len(apps)
        compliant = [
            a for a in apps
            if a.get("profile", {}).get("policies", [{}])[0].get("policy_compliance_status", "") == "Pass"
        ]
        conditional = [
            a for a in apps
            if a.get("profile", {}).get("policies", [{}])[0].get("policy_compliance_status", "") == "Conditional Pass"
        ]
        return [IntegrationFinding(
            check_id="veracode.policy.compliance",
            title="Policy compliance reviewed",
            description=(
                f"{len(compliant)} of {total} application(s) pass their policy; "
                f"{len(conditional)} have a conditional pass."
            ),
            remediation=(
                "Move conditional-pass applications to full compliance by "
                "remediating outstanding findings before their grace period expires."
            ),
            status="PASSED" if len(compliant) == total else "WARNING",
            severity="MEDIUM" if len(compliant) < total else "INFO",
            check_category="change_management",
            result_details={
                "total_applications": total,
                "compliant": len(compliant),
                "conditional_pass": len(conditional),
            },
        )]

    async def _check_sandbox_scans(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/applications", size="100")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "veracode.sandboxes.scan_status",
                "Sandbox scan status",
                "change_management",
                "The API credentials cannot list applications. Verify "
                "the API ID has the Sandbox API role.",
            )]
        resp.raise_for_status()
        data = resp.json()
        apps = data.get("_embedded", {}).get("applications", [])
        with_sandbox = 0
        without_sandbox = 0
        for app in apps:
            app_id = app.get("id")
            if not app_id:
                continue
            sb_resp = await self._get(
                client, f"/applications/{app_id}/sandboxes", size="1",
            )
            if sb_resp.status_code == 200:
                sandboxes = sb_resp.json().get("_embedded", {}).get("sandboxes", [])
                if sandboxes:
                    with_sandbox += 1
                else:
                    without_sandbox += 1
        return [IntegrationFinding(
            check_id="veracode.sandboxes.scan_status",
            title="Sandbox scan status reviewed",
            description=(
                f"{with_sandbox} application(s) have sandbox scans; "
                f"{without_sandbox} do not."
            ),
            remediation=(
                "Create sandbox scans for development branches to catch "
                "vulnerabilities before they reach production scans."
            ),
            status="PASSED" if not without_sandbox else "WARNING",
            severity="MEDIUM" if without_sandbox else "INFO",
            check_category="change_management",
            result_details={
                "with_sandbox": with_sandbox,
                "without_sandbox": without_sandbox,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Veracode with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
