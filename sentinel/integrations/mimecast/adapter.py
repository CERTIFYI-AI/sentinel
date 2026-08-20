# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Mimecast integration adapter.

Mimecast is an email-security gateway, not a training platform, so
this adapter reads email-security posture from the Mimecast API 2.0
instead of training-completion data: inbound-threat blocking, DMARC/
DKIM enforcement across sending domains, and the audit trail for
quarantine hold/release actions.

Auth: OAuth2 client_id + client_credential (Mimecast API 2.0
client-credentials grant).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://api.mimecast.com/oauth/token"
_BASE = "https://api.mimecast.com/api2"


@dataclass
class MimecastCredentials:
    """Matches dashboard/src/integrations/mimecast/config.ts credentialFields."""

    client_id: str
    client_credential: str


class MimecastAdapter:
    """Fetches email-security posture from Mimecast."""

    def __init__(self, credentials: MimecastCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Mimecast rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID "
                "and credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        resp = await client.get(
            f"{_BASE}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            params=params or None,
            timeout=_TIMEOUT,
        )
        return resp

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/account")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Mimecast rejected the request with the issued token "
                    f"(HTTP {resp.status_code}). Verify the API application "
                    "has the required scopes."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Mimecast: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_inbound_threat_blocking(client),
                self._check_dmarc_dkim_enforcement(client),
                self._check_quarantine_audit_trail(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("mimecast check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_inbound_threat_blocking(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/monitoring/statistics/inbound-threats", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "mimecast.email.inbound_threat_blocking",
                "Inbound malicious-email blocking",
                "incident_response",
                "Grant the API application read access to inbound threat "
                "monitoring statistics.",
            )]
        resp.raise_for_status()
        data = resp.json()
        stats = data.get("data", data) if isinstance(data, dict) else {}
        blocked = int(stats.get("blocked_count", 0) or 0)
        bypassed = int(stats.get("bypassed_count", stats.get("delivered_malicious_count", 0)) or 0)
        status = "PASSED" if bypassed == 0 else "FAILED"
        severity = "INFO" if status == "PASSED" else "CRITICAL"
        return [IntegrationFinding(
            check_id="mimecast.email.inbound_threat_blocking",
            title="Inbound malicious-email blocking",
            description=(
                f"{blocked} malicious inbound message(s) blocked; "
                f"{bypassed} reached a mailbox without being blocked."
            ),
            remediation=(
                "Investigate any malicious message that bypassed filtering, "
                "tighten the relevant detection policy, and confirm the "
                "recipient did not act on it."
            ),
            status=status,
            severity=severity,
            check_category="incident_response",
            result_details={
                "blocked_count": blocked,
                "bypassed_count": bypassed,
            },
        )]

    async def _check_dmarc_dkim_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/domainauth/get-domain-auth-summary", per_page=200)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "mimecast.email.dmarc_dkim_enforcement",
                "DMARC/DKIM enforcement across sending domains",
                "network_security",
                "Grant the API application read access to domain "
                "authentication summaries.",
            )]
        resp.raise_for_status()
        data = resp.json()
        domains = data.get("data", data.get("domains", [])) if isinstance(data, dict) else data
        domains = domains if isinstance(domains, list) else []
        total = len(domains)
        enforced = sum(
            1 for d in domains
            if str(d.get("dmarc_policy", "")).lower() in ("reject", "quarantine")
            and d.get("dkim_aligned", False)
        )
        rate = (enforced / total) if total else 0.0
        status = "PASSED" if rate == 1.0 and total else ("WARNING" if rate >= 0.5 else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="mimecast.email.dmarc_dkim_enforcement",
            title="DMARC/DKIM enforcement across sending domains",
            description=(
                f"{enforced} of {total} sending domain(s) enforce DMARC "
                f"(reject/quarantine) with aligned DKIM ({rate:.0%})."
            ),
            remediation=(
                "Move DMARC policy from 'none' to 'quarantine' or 'reject' "
                "for all sending domains and ensure DKIM signing is aligned."
            ),
            status=status,
            severity=severity,
            check_category="network_security",
            result_details={
                "domain_count": total,
                "enforced_count": enforced,
                "enforcement_rate": round(rate, 4),
            },
        )]

    async def _check_quarantine_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit/get-audit-events", category="Held Message", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "mimecast.email.quarantine_audit_trail",
                "Quarantine hold/release audit trail",
                "audit_logging",
                "Grant the API application read access to the audit events "
                "API.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("data", data.get("events", [])) if isinstance(data, dict) else data
        events = events if isinstance(events, list) else []
        untraceable = sum(1 for e in events if not e.get("user") or not e.get("eventTime", e.get("event_time")))
        status = "PASSED" if events and not untraceable else ("WARNING" if events else "FAILED")
        severity = "INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH")
        return [IntegrationFinding(
            check_id="mimecast.email.quarantine_audit_trail",
            title="Quarantine hold/release audit trail",
            description=(
                f"{len(events)} hold/release event(s) reviewed; {untraceable} "
                "are missing an actor or timestamp."
            ),
            remediation=(
                "Ensure every quarantine release is logged with both the "
                "acting user and a timestamp so releases can be traced "
                "during an audit."
            ),
            status=status,
            severity=severity,
            check_category="audit_logging",
            result_details={
                "events_evaluated": len(events),
                "untraceable_events": untraceable,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Mimecast with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
