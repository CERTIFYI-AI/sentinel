# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Duo Security integration adapter.

Uses httpx (already a base dependency) against the Duo Admin API. Duo's own
SDKs sign every request with HMAC-SHA1 over the request line and date
header; this adapter authenticates with HTTP Basic auth over the integration
key and signing key instead (``integration_key:signing_key``), which the
Admin API also accepts. That trades Duo's replay-hardened per-request
signature for the same transport-level protection every other adapter in
this codebase relies on — acceptable because every call here is a read over
TLS, never a request that changes Duo state. Grant the integration a
read-only Admin API role; every call this adapter makes is a GET.

Duo is the second-factor system of record for orgs that layer it in front of
another IdP, so its evidence is checked independently of whichever primary
directory a tenant also connects. A permission the integration was not
granted returns NOT_AVAILABLE rather than a guess — a compliance platform
reporting PASSED for a check it could not run is the failure mode this whole
pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌──────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                             │ check_category           │ Controls mapped                             │
├──────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ duo.policies.bypass_disabled         │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ duo.users.two_factor_status          │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ duo.logs.admin_log_available         │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1          │
│                                      │                          │ · HIPAA 164.312(b) · PCI 10.1 · GDPR Art. 30│
└──────────────────────────────────────┴──────────────────────────┴─────────────────────────────────────────────┘
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

_MAX_PAGES = 10
_PAGE_SIZE = 100

#: Duo user "status" values that mean the account can already authenticate.
_ACTIVE_STATUSES = frozenset({"active"})


@dataclass
class DuoCredentials:
    """Matches dashboard/src/integrations/duo/config.ts credentialFields."""

    integration_key: str
    signing_key: str
    api_hostname: str

    def base_url(self) -> str:
        host = self.api_hostname.rstrip("/")
        if not host.startswith("http"):
            host = f"https://{host}"
        return host


class DuoAdapter:
    """Fetches identity posture from Duo Security.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: DuoCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        # Injectable for tests; constructed lazily otherwise so importing the
        # adapter never opens a connection.
        self._client = client

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    def _auth(self) -> tuple[str, str]:
        return (self.credentials.integration_key, self.credentials.signing_key)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/admin/v1{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _get_paged(self, client: httpx.AsyncClient, path: str, **params) -> tuple[list[dict], bool]:
        """Follow the Admin API's `offset`/`next_offset` pagination."""
        items: list[dict] = []
        offset = 0
        for _ in range(_MAX_PAGES):
            resp = await self._get(client, path, limit=_PAGE_SIZE, offset=offset, **params)
            resp.raise_for_status()
            payload = resp.json()
            batch = payload.get("response", []) if isinstance(payload, dict) else payload
            if not isinstance(batch, list):
                return items, False
            items.extend(batch)
            metadata = payload.get("metadata", {}) if isinstance(payload, dict) else {}
            next_offset = metadata.get("next_offset")
            if next_offset is None:
                return items, False
            offset = int(next_offset)
        return items, True

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient()

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/users", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Duo rejected the integration credential for "
                    f"{self.credentials.api_hostname!r} (HTTP {resp.status_code}). "
                    "Check the integration key and signing key belong to an "
                    "Admin API integration with the Grant read-only role."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(
                f"Could not reach Duo at {self.credentials.api_hostname!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_bypass_policy(client),
                self._check_two_factor_status(client),
                self._check_admin_log(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("duo check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_bypass_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/policies")
        if resp.status_code == 403:
            return [self._unavailable(
                "duo.policies.bypass_disabled", "No policy always bypasses two-factor",
                "mfa_enforcement",
                "Grant the Admin API integration the Grant read information "
                "about policies permission.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        policies = payload.get("response", []) if isinstance(payload, dict) else payload
        bypassing = [
            p.get("name", "") for p in policies
            if str((p.get("policy") or {}).get("two_factor_enrollment", "")).lower() == "bypass"
        ]
        passed = not bypassing
        return [IntegrationFinding(
            check_id="duo.policies.bypass_disabled",
            title="No authentication policy always bypasses two-factor",
            description=(
                f"{len(bypassing)} of {len(policies)} policy/policies set two-factor "
                "enrollment to bypass, letting matched users authenticate with only "
                "their primary credential."
                if policies else "No authentication policies are configured."
            ),
            remediation=(
                "Policies → each policy → Two-Factor Enrollment: set it to "
                "Enforce enrollment (or Deny access) rather than Bypass "
                "two-factor, except for a documented, time-bound break-glass policy."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={"policy_count": len(policies), "bypassing_policies": bypassing[:20]},
        )]

    async def _check_two_factor_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        try:
            users, truncated = await self._get_paged(client, "/users")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 403:
                return [self._unavailable(
                    "duo.users.two_factor_status", "Active users have a second factor enrolled",
                    "mfa_enforcement",
                    "Grant the Admin API integration the Grant read information "
                    "about users permission.",
                )]
            raise
        active = [u for u in users if u.get("status") in _ACTIVE_STATUSES]
        without_factor = [
            u.get("username", u.get("user_id", "")) for u in active
            if not u.get("phones") and not u.get("tokens") and not u.get("webauthncredentials")
        ]
        passed = not without_factor
        scope = f"first {len(active)} active users (more exist)" if truncated else f"all {len(active)} active users"
        return [IntegrationFinding(
            check_id="duo.users.two_factor_status",
            title="Active users have a second factor enrolled",
            description=(
                f"{len(without_factor)} of {scope} have no phone, hardware token or "
                "WebAuthn credential enrolled."
            ),
            remediation=(
                "Have each listed user self-enroll at the Duo enrollment portal, or "
                "send an enrollment link from Users → select user → Send Enrollment "
                "Email."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={
                "without_factor_count": len(without_factor),
                "active_users_examined": len(active),
                "results_truncated": truncated,
                "sample": without_factor[:20],
            },
        )]

    async def _check_admin_log(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/logs/administrator", mintime=0)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "duo.logs.admin_log_available", "Administrator log is retrievable",
                "audit_logging",
                "Grant the Admin API integration the Grant read log permission "
                "so administrative changes can be retained as evidence.",
            )]
        resp.raise_for_status()
        return [IntegrationFinding(
            check_id="duo.logs.admin_log_available",
            title="Administrator log is retrievable for audit evidence",
            description=(
                "The administrator log endpoint responded, so configuration and "
                "policy changes can be collected as Art. 12 / CC7.2 evidence."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Duo with the supplied credential.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
