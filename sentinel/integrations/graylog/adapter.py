# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Graylog integration adapter.

Reads SIEM posture from the Graylog REST API: input health, stream
count, and alert condition status for audit logging and incident
response evidence.

Auth: a Bearer API token against a user-provided Graylog instance URL.
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
class GraylogCredentials:
    """Matches dashboard/src/integrations/graylog/config.ts credentialFields."""

    instance_url: str
    api_token: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")


class GraylogAdapter:
    """Fetches SIEM posture from Graylog."""

    def __init__(self, credentials: GraylogCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        import base64
        encoded = base64.b64encode(
            f"{self.credentials.api_token}:token".encode()
        ).decode()
        return {
            "Authorization": f"Basic {encoded}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/system")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Graylog rejected the token for "
                    f"{self.credentials.instance_url!r} "
                    f"(HTTP {resp.status_code}). Verify the token is valid."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Graylog: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_input_health(client),
                self._check_stream_count(client),
                self._check_alert_conditions(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("graylog check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_input_health(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/system/inputs")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "graylog.inputs.health", "Input health",
                "audit_logging",
                "The token cannot list inputs. Verify the token has "
                "the inputs:read permission.",
            )]
        resp.raise_for_status()
        data = resp.json()
        inputs = data.get("inputs", [])
        total = len(inputs)
        not_running = [
            i for i in inputs
            if i.get("state", "").upper() != "RUNNING"
        ]
        return [IntegrationFinding(
            check_id="graylog.inputs.health",
            title="Input health reviewed",
            description=(
                f"{total} input(s) configured; {len(not_running)} not running."
            ),
            remediation=(
                "Investigate inputs that are not in the RUNNING state "
                "to restore log collection from all sources."
            ),
            status="PASSED" if not not_running else "WARNING",
            severity="MEDIUM" if not_running else "INFO",
            check_category="audit_logging",
            result_details={
                "total_inputs": total,
                "not_running": len(not_running),
            },
        )]

    async def _check_stream_count(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/streams")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "graylog.streams.count", "Stream count",
                "audit_logging",
                "The token cannot list streams. Verify the token has "
                "the streams:read permission.",
            )]
        resp.raise_for_status()
        data = resp.json()
        streams = data.get("streams", [])
        total = len(streams)
        disabled = [s for s in streams if s.get("disabled", False)]
        return [IntegrationFinding(
            check_id="graylog.streams.count",
            title="Stream configuration reviewed",
            description=(
                f"{total} stream(s) configured; {len(disabled)} disabled."
            ),
            remediation=(
                "Review disabled streams and re-enable any that should "
                "be routing log messages for audit evidence."
            ),
            status="PASSED" if total > 0 and not disabled else "WARNING",
            severity="MEDIUM" if disabled else "INFO",
            check_category="audit_logging",
            result_details={
                "total_streams": total,
                "disabled_streams": len(disabled),
            },
        )]

    async def _check_alert_conditions(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/alerts/conditions")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "graylog.alerts.conditions", "Alert condition status",
                "incident_response",
                "The token cannot list alert conditions. Verify the "
                "token has the alerts:read permission.",
            )]
        resp.raise_for_status()
        data = resp.json()
        conditions = data.get("conditions", [])
        if isinstance(conditions, list):
            total = len(conditions)
            triggered = [c for c in conditions if c.get("triggered", False)]
        else:
            total = int(conditions)
            triggered = []
        return [IntegrationFinding(
            check_id="graylog.alerts.conditions",
            title="Alert conditions reviewed",
            description=(
                f"{total} alert condition(s) configured"
                + (f"; {len(triggered)} currently triggered." if isinstance(conditions, list) else ".")
            ),
            remediation=(
                "Ensure alert conditions are configured for critical log "
                "patterns and that triggered alerts are reviewed promptly."
            ),
            status="PASSED" if total > 0 else "WARNING",
            severity="MEDIUM" if total == 0 else "INFO",
            check_category="incident_response",
            result_details={
                "total_conditions": total,
                "triggered_count": len(triggered) if isinstance(conditions, list) else 0,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Graylog with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
