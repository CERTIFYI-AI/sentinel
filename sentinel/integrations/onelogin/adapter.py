# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""OneLogin integration adapter.

Uses httpx (already a base dependency) against the OneLogin REST API v2.
Auth: the OAuth 2.0 **client credentials** flow — ``POST
/auth/oauth2/v2/token`` with the API credential pair, exchanged for a
short-lived Bearer token that is cached in memory for the life of the sync.
Grant the API credential the read-only "Read Users" and "Read All" scopes;
every call this adapter makes is a GET.

OneLogin is the access-control system of record for orgs that run it, so its
evidence carries the same weight Okta's does elsewhere. An endpoint the
plan does not expose, or a scope that was not granted, returns NOT_AVAILABLE
rather than a guess — a compliance platform reporting PASSED for a check it
could not run is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌──────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                             │ check_category           │ Controls mapped                             │
├──────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ onelogin.mfa.policy_enforced         │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ onelogin.users.provisioning_status   │ access_control           │ SOC2 CC6.1/CC6.2 · ISO27001 A.9.2.1         │
│                                      │                          │ · PCI 7.1 · GDPR Art. 25                    │
│ onelogin.events.log_available        │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1          │
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

#: OneLogin paginates users with `Cursor`; cap pages so one very large tenant
#: cannot stall a sync indefinitely. Reported honestly when truncated.
_MAX_PAGES = 10
_PAGE_SIZE = 100

#: OneLogin user status codes. 3 = suspended, 0 = unactivated.
_STATUS_SUSPENDED = 3
_STATUS_UNACTIVATED = 0


@dataclass
class OneLoginCredentials:
    """Matches dashboard/src/integrations/onelogin/config.ts credentialFields."""

    client_id: str
    client_credential: str
    subdomain_url: str

    def base_url(self) -> str:
        return self.subdomain_url.rstrip("/")


class OneLoginAdapter:
    """Fetches identity posture from OneLogin.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: OneLoginCredentials, client: httpx.AsyncClient | None = None) -> None:
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
        here writes the token or the API credential pair to disk, a log line
        or the database.
        """
        if self._token is not None:
            return self._token
        resp = await client.post(
            f"{self.credentials.base_url()}/auth/oauth2/v2/token",
            json={"grant_type": "client_credentials"},
            auth=(self.credentials.client_id, self.credentials.client_credential),
            headers={"Content-Type": "application/json"},
            timeout=_TIMEOUT,
        )
        if resp.status_code != 200:
            raise ValueError(
                f"OneLogin rejected the API credential pair for "
                f"{self.credentials.subdomain_url!r} (HTTP {resp.status_code}). "
                "Check the client id and client credential are current and the "
                "API credential has not been revoked."
            )
        token = resp.json().get("access_token")
        if not token:
            raise ValueError(
                "OneLogin's token endpoint returned no access token for "
                f"{self.credentials.subdomain_url!r}."
            )
        self._token = str(token)
        return self._token

    async def _headers(self, client: httpx.AsyncClient) -> dict[str, str]:
        token = await self._authenticate(client)
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers=await self._headers(client),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _get_paged(self, client: httpx.AsyncClient, path: str, **params) -> tuple[list[dict], bool]:
        """Follow OneLogin's After-Cursor pagination header."""
        items: list[dict] = []
        cursor: str | None = None
        for _ in range(_MAX_PAGES):
            query = {"limit": _PAGE_SIZE, **params}
            if cursor:
                query["after_cursor"] = cursor
            resp = await self._get(client, path, **query)
            resp.raise_for_status()
            batch = resp.json()
            if not isinstance(batch, list):
                return items, False
            items.extend(batch)
            cursor = resp.headers.get("After-Cursor") or resp.headers.get("after-cursor")
            if not cursor:
                return items, False
        return items, True

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/api/2/users", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"OneLogin rejected the request for "
                    f"{self.credentials.subdomain_url!r} (HTTP {resp.status_code}). "
                    "Confirm the API credential has the Read Users scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(
                f"Could not reach OneLogin at {self.credentials.subdomain_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_mfa_policy(client),
                self._check_provisioning_status(client),
                self._check_event_log(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("onelogin check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_mfa_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/api/2/mfa/policies")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "onelogin.mfa.policy_enforced", "An MFA policy is enforced",
                "mfa_enforcement",
                "Grant the API credential the Manage Policies (read) scope, or "
                "confirm this plan includes OneLogin Protect / MFA policies.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        policies = payload if isinstance(payload, list) else payload.get("data", [])
        enforcing = [p for p in policies if p.get("mfa_enabled") or p.get("factors")]
        passed = bool(enforcing)
        return [IntegrationFinding(
            check_id="onelogin.mfa.policy_enforced",
            title="An MFA policy is defined and enforced",
            description=(
                f"{len(enforcing)} of {len(policies)} MFA policy/policies require a "
                "second factor."
                if policies else "No MFA policy is defined for this account."
            ),
            remediation=(
                "Security → MFA: create a policy that requires at least one "
                "factor, and apply it to all users via a mapping."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={"policy_count": len(policies), "enforcing_count": len(enforcing)},
        )]

    async def _check_provisioning_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        users, truncated = await self._get_paged(client, "/api/2/users")
        suspended = [u for u in users if u.get("status") == _STATUS_SUSPENDED]
        unassigned = [
            u for u in users
            if u.get("status") not in (_STATUS_SUSPENDED, _STATUS_UNACTIVATED)
            and not u.get("role_id") and not u.get("group_id")
        ]
        passed = not unassigned
        scope = f"first {len(users)} users (more exist)" if truncated else f"all {len(users)} users"
        return [IntegrationFinding(
            check_id="onelogin.users.provisioning_status",
            title="Active users are provisioned through a role or group",
            description=(
                f"{len(unassigned)} of {scope} are active with no role or group "
                f"assignment; {len(suspended)} are suspended."
            ),
            remediation=(
                "Assign every active user a role or group through directory sync "
                "or a mapping — an ad hoc user with no assignment is a "
                "provisioning gap, not evidence of least privilege."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={
                "unassigned_active_count": len(unassigned),
                "suspended_count": len(suspended),
                "users_examined": len(users),
                "results_truncated": truncated,
                "sample": [u.get("email", u.get("id", "")) for u in unassigned][:20],
            },
        )]

    async def _check_event_log(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/api/1/events", limit=1)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "onelogin.events.log_available", "Event log is retrievable",
                "audit_logging",
                "Grant the API credential the Read Events scope so authentication "
                "and admin events can be retained as evidence.",
            )]
        resp.raise_for_status()
        return [IntegrationFinding(
            check_id="onelogin.events.log_available",
            title="Event log is retrievable for audit evidence",
            description=(
                "The Events API responded, so authentication and admin events can "
                "be collected as Art. 12 / CC7.2 evidence."
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
            description="Sentinel could not read this from OneLogin with the supplied credential.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
