# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""HiddenLayer integration adapter.

Reads ML model security posture: vulnerability scan results, tampering
alerts, and inference anomaly detection from the HiddenLayer API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.hiddenlayer.ai/v1"


@dataclass
class HiddenLayerCredentials:
    client_id: str
    client_credential: str
    tenant: str = ""


class HiddenLayerAdapter:
    def __init__(self, credentials: HiddenLayerCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str = ""

    async def _authenticate(self) -> str:
        if self._access_token:
            return self._access_token
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.post(
                f"{_BASE}/auth/token",
                json={"client_id": self.credentials.client_id,
                      "client_secret": self.credentials.client_credential},
            )
            resp.raise_for_status()
            self._access_token = resp.json().get("access_token", "")
            return self._access_token
        finally:
            if not self._client:
                await client.aclose()

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Accept": "application/json",
        }

    async def _get(self, path: str) -> httpx.Response:
        await self._authenticate()
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.get(f"{_BASE}{path}", headers=self._headers())
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the client credentials are valid.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="vulnerability_management", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._authenticate()
            return True
        except Exception as exc:
            raise ValueError(f"HiddenLayer credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_model_scans(),
            self._check_alerts(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("hiddenlayer check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_model_scans(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/models")
            models = resp.json().get("models", resp.json().get("data", []))
        except Exception as exc:
            return [self._unavailable(
                "hiddenlayer.models.scans", "Unable to list model scans", str(exc))]
        scanned = [m for m in models if m.get("last_scan_status") == "completed"]
        vulnerable = [m for m in models if m.get("vulnerability_count", 0) > 0]
        return [IntegrationFinding(
            check_id="hiddenlayer.models.scans",
            title=f"{len(models)} model(s), {len(scanned)} scanned, {len(vulnerable)} with findings",
            description=f"{len(scanned)} of {len(models)} model(s) have completed scans; "
                        f"{len(vulnerable)} have known vulnerabilities.",
            remediation="Scan all models before deployment and remediate findings.",
            status="PASSED" if not vulnerable else "FAILED",
            severity="HIGH" if vulnerable else "INFO",
            check_category="vulnerability_management",
            result_details={"total": len(models), "scanned": len(scanned), "vulnerable": len(vulnerable)},
        )]

    async def _check_alerts(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/alerts")
            alerts = resp.json().get("alerts", resp.json().get("data", []))
        except Exception:
            return [IntegrationFinding(
                check_id="hiddenlayer.alerts.status",
                title="Alert data not accessible",
                description="Could not read alert data.",
                remediation="Verify the credentials have alert read access.",
                status="NOT_AVAILABLE", severity="LOW",
                check_category="audit_logging", result_details={},
            )]
        active = [a for a in alerts if a.get("status") == "active"]
        return [IntegrationFinding(
            check_id="hiddenlayer.alerts.status",
            title=f"{len(active)} active alert(s) out of {len(alerts)}",
            description=f"{len(active)} alert(s) require attention.",
            remediation="Investigate and resolve active alerts.",
            status="PASSED" if not active else "WARNING",
            severity="HIGH" if active else "INFO",
            check_category="audit_logging",
            result_details={"total_alerts": len(alerts), "active": len(active)},
        )]
