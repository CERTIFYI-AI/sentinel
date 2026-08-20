# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Auth0 integration adapter.

Uses httpx (already a base dependency) against the Auth0 Management API v2.
Auth: a Management API access token issued to a **Machine to Machine**
application authorized against the Management API, with read-only scopes
(``read:users``, ``read:connections``, ``read:logs``). The token is supplied
directly as ``api_key`` rather than exchanged here — Auth0 M2M tokens are
short-lived (typically 24h) and operators are expected to rotate the stored
value through the same client-credentials grant they used to mint it. Every
call this adapter makes is a GET.

Auth0 is the access-control system of record for orgs that run it, so its
evidence carries the same weight Okta's does elsewhere. An endpoint the
tenant's plan does not expose, or a scope that was not granted, returns
NOT_AVAILABLE rather than a guess — a compliance platform reporting PASSED
for a check it could not run is the failure mode this whole pipeline exists
to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌──────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                             │ check_category           │ Controls mapped                             │
├──────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ auth0.users.mfa_not_enrolled         │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ auth0.connections.password_policy    │ access_control           │ SOC2 CC6.1 · ISO27001 A.9.4.3 · PCI 8.2/8.3 │
│ auth0.connections.brute_force        │ access_control           │ SOC2 CC6.1 · ISO27001 A.9.4.2 · PCI 8.3.4   │
│ auth0.logs.suspicious_activity       │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1          │
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

#: Auth0 paginates with `page`/`per_page`; cap pages so one very large tenant
#: cannot stall a sync indefinitely. Reported honestly when truncated.
_MAX_PAGES = 10
_PAGE_SIZE = 100

#: Log event types Auth0 itself classifies as suspicious / anomalous.
#: https://auth0.com/docs/deploy-monitor/logs/log-event-type-codes
_SUSPICIOUS_LOG_TYPES = frozenset({
    "sui", "sepft", "sapft", "fsa", "limit_wc", "limit_mu", "limit_ui",
    "anomalous",
})


@dataclass
class Auth0Credentials:
    """Matches dashboard/src/integrations/auth0/config.ts credentialFields."""

    tenant_domain: str
    api_key: str

    def base_url(self) -> str:
        return self.tenant_domain.rstrip("/")


class Auth0Adapter:
    """Fetches identity posture from Auth0.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: Auth0Credentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        # Injectable for tests; constructed lazily otherwise so importing the
        # adapter never opens a connection.
        self._client = client

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api/v2{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _get_paged(self, client: httpx.AsyncClient, path: str, **params) -> tuple[list[dict], bool]:
        """Follow Auth0's page/per_page pagination with totals included."""
        items: list[dict] = []
        for page in range(_MAX_PAGES):
            resp = await self._get(
                client, path, page=page, per_page=_PAGE_SIZE, include_totals="true", **params
            )
            resp.raise_for_status()
            payload = resp.json()
            batch = payload.get("users", payload) if isinstance(payload, dict) else payload
            if not isinstance(batch, list):
                return items, False
            items.extend(batch)
            if len(batch) < _PAGE_SIZE:
                return items, False
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
            resp = await self._get(client, "/users", per_page=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Auth0 rejected the Management API token for "
                    f"{self.credentials.tenant_domain!r} (HTTP {resp.status_code}). "
                    "Check the token is a current Machine to Machine token "
                    "authorized against the Management API with read scopes."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(
                f"Could not reach Auth0 at {self.credentials.tenant_domain!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_mfa_enrollment(client),
                self._check_password_policy(client),
                self._check_brute_force_protection(client),
                self._check_suspicious_logs(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("auth0 check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_mfa_enrollment(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        try:
            users, truncated = await self._get_paged(client, "/users", fields="user_id,multifactor")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 403:
                return [self._unavailable(
                    "auth0.users.mfa_not_enrolled", "Users are enrolled in MFA",
                    "mfa_enforcement",
                    "Grant the Machine to Machine application read:users on the "
                    "Management API.",
                )]
            raise
        not_enrolled = [u.get("user_id", "") for u in users if not u.get("multifactor")]
        passed = not not_enrolled
        scope = f"first {len(users)} users (more exist)" if truncated else f"all {len(users)} users"
        return [IntegrationFinding(
            check_id="auth0.users.mfa_not_enrolled",
            title="Users are enrolled in a multi-factor authenticator",
            description=(
                f"{len(not_enrolled)} of {scope} have no multifactor enrollment on record."
            ),
            remediation=(
                "Security → Multi-factor Auth: enable an MFA factor and enforce it with "
                "an Actions flow or a rule that always challenges, then have every "
                "remaining user enroll."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={
                "unenrolled_count": len(not_enrolled),
                "users_examined": len(users),
                "results_truncated": truncated,
                "sample": not_enrolled[:20],
            },
        )]

    async def _check_password_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/connections", strategy="auth0")
        if resp.status_code == 403:
            return [self._unavailable(
                "auth0.connections.password_policy", "Database connection password policy",
                "access_control",
                "Grant the Machine to Machine application read:connections on the "
                "Management API.",
            )]
        resp.raise_for_status()
        connections = resp.json()
        weak: list[str] = []
        examined = 0
        for conn in connections:
            options = conn.get("options", {})
            policy = options.get("passwordPolicy")
            if policy is None:
                continue
            examined += 1
            min_len = (options.get("passwordComplexityOptions") or {}).get("min_length", 0)
            if policy in ("none", "low", "fair") or (isinstance(min_len, int) and min_len < 8):
                weak.append(conn.get("name", ""))
        passed = examined > 0 and not weak
        if examined == 0:
            return [self._unavailable(
                "auth0.connections.password_policy", "Database connection password policy",
                "access_control",
                "No database (username-password-authentication strategy) connections "
                "declare a password policy. Configure one under Authentication → "
                "Database → connection settings.",
            )]
        return [IntegrationFinding(
            check_id="auth0.connections.password_policy",
            title="Database connections enforce a strong password policy",
            description=(
                f"{len(weak)} of {examined} database connection(s) use a weak or "
                "unset password policy."
            ),
            remediation=(
                "Authentication → Database → connection → Password Policy: set at "
                "least Good, with a minimum length of 8 or more characters."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={"weak_connections": weak[:20], "connections_examined": examined},
        )]

    async def _check_brute_force_protection(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/connections", strategy="auth0")
        if resp.status_code == 403:
            return [self._unavailable(
                "auth0.connections.brute_force", "Connections have brute-force protection",
                "access_control",
                "Grant the Machine to Machine application read:connections on the "
                "Management API.",
            )]
        resp.raise_for_status()
        connections = resp.json()
        unprotected = [
            c.get("name", "") for c in connections
            if not c.get("options", {}).get("brute_force_protection", True)
        ]
        passed = not unprotected
        return [IntegrationFinding(
            check_id="auth0.connections.brute_force",
            title="Database connections have brute-force protection enabled",
            description=(
                f"{len(unprotected)} of {len(connections)} database connection(s) "
                "have brute-force protection turned off."
            ),
            remediation=(
                "Security → Attack Protection → Brute-force Protection: enable it, "
                "and confirm each database connection inherits the tenant default."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={
                "unprotected_connections": unprotected[:20],
                "connections_examined": len(connections),
            },
        )]

    async def _check_suspicious_logs(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = " OR ".join(f'type:"{t}"' for t in sorted(_SUSPICIOUS_LOG_TYPES))
        resp = await self._get(client, "/logs", q=query, per_page=50, sort="date:-1")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "auth0.logs.suspicious_activity", "Suspicious activity logs are retrievable",
                "audit_logging",
                "Grant the Machine to Machine application read:logs on the "
                "Management API so anomalous sign-in events can be collected as "
                "Art. 12 evidence.",
            )]
        resp.raise_for_status()
        events = resp.json()
        count = len(events) if isinstance(events, list) else 0
        return [IntegrationFinding(
            check_id="auth0.logs.suspicious_activity",
            title="Suspicious activity logs are retrievable for audit evidence",
            description=(
                f"The Management API log search returned {count} suspicious or "
                "anomalous event(s) in the most recent page, confirming the log "
                "stream is queryable."
            ),
            remediation=(
                "No action required for retrievability. Investigate any non-zero "
                "count through Monitoring → Logs."
            ),
            status="PASSED",
            severity="INFO" if count == 0 else "MEDIUM",
            check_category="audit_logging",
            result_details={"suspicious_event_count": count, "query": query},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Auth0 with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
