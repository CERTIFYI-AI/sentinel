# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Ping Identity (PingFederate / PingDirectory) integration adapter.

Distinct from the PingOne connector (``sentinel/integrations/pingone``): this
one targets the federation and directory admin surface Ping Identity exposes
per environment for **PingFederate** (SSO/federation) and **PingDirectory**
(LDAP directory) — authentication policies, SP/IdP connections and the
administrative audit log — rather than PingOne's cloud user store and
sign-on policies. Kept as a separate adapter and catalogue row because the
evidence, the checks and typically the operator team differ even where the
credential shape does not.

Uses httpx (already a base dependency). Auth: the OAuth 2.0 **client
credentials** flow against a Ping Identity worker application, exchanged for
a Bearer token cached in memory for the life of the sync. Grant the worker
application read-only access to authentication policies, SP/IdP connections
and the audit log; every call this adapter makes is a GET.

A permission the worker application was not granted returns NOT_AVAILABLE
rather than a guess — a compliance platform reporting PASSED for a check it
could not run is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌───────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                              │ check_category           │ Controls mapped                             │
├───────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ ping_identity.policies.auth_required  │ access_control           │ SOC2 CC6.1 · ISO27001 A.9.4.2 · PCI 8.3     │
│ ping_identity.connections.secured     │ access_control           │ SOC2 CC6.1 · ISO27001 A.9.1.1 · PCI 7.1/7.2 │
│ ping_identity.audit.log_available     │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1          │
│                                       │                          │ · HIPAA 164.312(b) · PCI 10.1 · GDPR Art. 30│
└───────────────────────────────────────┴──────────────────────────┴─────────────────────────────────────────────┘
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

#: Values PingFederate uses to mark an authentication policy as effectively
#: open — no authenticator chain is invoked before granting access.
_NO_AUTH_REQUIREMENTS = frozenset({"NONE", "ANONYMOUS", ""})


@dataclass
class PingIdentityCredentials:
    """Matches dashboard/src/integrations/ping_identity/config.ts credentialFields."""

    client_id: str
    client_credential: str
    environment_id: str

    def auth_base(self) -> str:
        return "https://auth.pingfederate.com"

    def api_base(self) -> str:
        return f"https://api.pingfederate.com/v1/environments/{self.environment_id}"


class PingIdentityAdapter:
    """Fetches identity posture from Ping Identity (PingFederate/PingDirectory).

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: PingIdentityCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        # Injectable for tests; constructed lazily otherwise so importing the
        # adapter never opens a connection.
        self._client = client
        self._token: str | None = None

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient()

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Client-credentials token exchange, cached per sync run.

        Cached in memory only, for the life of this adapter instance. Nothing
        here writes the token or the worker application's credential to disk,
        a log line or the database.
        """
        if self._token is not None:
            return self._token
        resp = await client.post(
            f"{self.credentials.auth_base()}/{self.credentials.environment_id}/as/token",
            data={"grant_type": "client_credentials"},
            auth=(self.credentials.client_id, self.credentials.client_credential),
            timeout=_TIMEOUT,
        )
        if resp.status_code != 200:
            raise ValueError(
                f"Ping Identity rejected the worker application credential for "
                f"environment {self.credentials.environment_id!r} "
                f"(HTTP {resp.status_code}). Check the client id and client "
                "credential are current."
            )
        token = resp.json().get("access_token")
        if not token:
            raise ValueError(
                "Ping Identity's token endpoint returned no access token for "
                f"environment {self.credentials.environment_id!r}."
            )
        self._token = str(token)
        return self._token

    async def _headers(self, client: httpx.AsyncClient) -> dict[str, str]:
        token = await self._authenticate(client)
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.api_base()}{path}",
            headers=await self._headers(client),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _get_paged(self, client: httpx.AsyncClient, path: str, **params) -> tuple[list[dict], bool]:
        """Follow the `nextCursor` pagination style used across this API."""
        items: list[dict] = []
        cursor: str | None = None
        for _ in range(_MAX_PAGES):
            query = {"limit": _PAGE_SIZE, **params}
            if cursor:
                query["cursor"] = cursor
            resp = await self._get(client, path, **query)
            resp.raise_for_status()
            payload = resp.json()
            batch = payload.get("items", payload) if isinstance(payload, dict) else payload
            if not isinstance(batch, list):
                return items, False
            items.extend(batch)
            cursor = payload.get("nextCursor") if isinstance(payload, dict) else None
            if not cursor:
                return items, False
        return items, True

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/authenticationPolicies", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Ping Identity rejected the request for environment "
                    f"{self.credentials.environment_id!r} (HTTP {resp.status_code}). "
                    "Confirm the worker application has read access to "
                    "authentication policies."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(
                f"Could not reach Ping Identity environment "
                f"{self.credentials.environment_id!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_authentication_policies(client),
                self._check_connections_secured(client),
                self._check_audit_log(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("ping_identity check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_authentication_policies(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        policies, truncated = await self._get_paged(client, "/authenticationPolicies")
        if not policies and not truncated:
            resp = await self._get(client, "/authenticationPolicies", limit=1)
            if resp.status_code == 403:
                return [self._unavailable(
                    "ping_identity.policies.auth_required", "Authentication policies require a challenge",
                    "access_control",
                    "Grant the worker application read access to authentication "
                    "policies.",
                )]
        open_policies = [
            p.get("name", "") for p in policies
            if str(p.get("defaultAuthenticationSourceId", "")).upper() in _NO_AUTH_REQUIREMENTS
        ]
        passed = bool(policies) and not open_policies
        return [IntegrationFinding(
            check_id="ping_identity.policies.auth_required",
            title="Authentication policies require a credential challenge",
            description=(
                f"{len(open_policies)} of {len(policies)} authentication policy/"
                "policies have no authentication source configured."
                if policies else "No authentication policies are configured."
            ),
            remediation=(
                "PingFederate admin console → Authentication → Policies: assign an "
                "authentication source to every policy contract, and remove or "
                "disable policies with none."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="access_control",
            result_details={
                "policy_count": len(policies),
                "open_policies": open_policies[:20],
                "results_truncated": truncated,
            },
        )]

    async def _check_connections_secured(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        sp, sp_truncated = await self._get_paged(client, "/spConnections")
        idp, idp_truncated = await self._get_paged(client, "/idpConnections")
        connections = sp + idp
        unsigned = [
            c.get("name", "") for c in connections
            if c.get("active", True) and not (c.get("credentials") or {}).get("signingSettings")
        ]
        passed = bool(connections) and not unsigned
        return [IntegrationFinding(
            check_id="ping_identity.connections.secured",
            title="Federation connections require signed assertions",
            description=(
                f"{len(unsigned)} of {len(connections)} active SP/IdP connection(s) "
                "have no signing settings configured."
                if connections else "No SP or IdP connections are configured."
            ),
            remediation=(
                "PingFederate admin console → each connection → Credentials → "
                "Digital Signature Settings: configure a signing certificate for "
                "every active connection."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={
                "connection_count": len(connections),
                "unsigned_connections": unsigned[:20],
                "results_truncated": sp_truncated or idp_truncated,
            },
        )]

    async def _check_audit_log(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/auditLogs", limit=1)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ping_identity.audit.log_available", "Administrative audit log is retrievable",
                "audit_logging",
                "Grant the worker application read access to the audit log so "
                "authentication and configuration events can be retained as "
                "evidence.",
            )]
        resp.raise_for_status()
        return [IntegrationFinding(
            check_id="ping_identity.audit.log_available",
            title="Administrative audit log is retrievable for audit evidence",
            description=(
                "The audit log endpoint responded, so authentication and "
                "configuration change events can be collected as Art. 12 / "
                "CC7.2 evidence."
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
            description="Sentinel could not read this from Ping Identity with the supplied credential.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
