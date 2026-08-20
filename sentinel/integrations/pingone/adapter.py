# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""PingOne integration adapter.

Uses httpx (already a base dependency) against the PingOne Management API.
Auth: the OAuth 2.0 **client credentials** flow against a PingOne worker
application, exchanged for a Bearer token cached in memory for the life of
the sync. Grant the worker application read-only roles (Environment
Viewer / Identity Data Read Only); every call this adapter makes is a GET.

The environment's region selects both the auth host (``auth.pingone.<tld>``)
and the API host (``api.pingone.<tld>``) — getting it wrong is a silent
tenant mismatch, not a clean error, so it is a first-class credential field
rather than assumed to be ``.com``.

PingOne is the access-control system of record for orgs that run it, so its
evidence carries the same weight Okta's does elsewhere. A permission the
worker application was not granted returns NOT_AVAILABLE rather than a
guess — a compliance platform reporting PASSED for a check it could not run
is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌──────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                             │ check_category           │ Controls mapped                             │
├──────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ pingone.policies.mfa_required        │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ pingone.policies.password_strength   │ access_control           │ SOC2 CC6.1 · ISO27001 A.9.4.3 · PCI 8.2/8.3 │
│ pingone.users.population_audit       │ hr_controls              │ SOC2 CC6.2/CC6.3 · ISO27001 A.9.2.5/A.9.2.6 │
│                                      │                          │ · HIPAA 164.308(a)(3)(ii)(C) · PCI 8.1.4    │
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


@dataclass
class PingOneCredentials:
    """Matches dashboard/src/integrations/pingone/config.ts credentialFields."""

    client_id: str
    client_credential: str
    environment_id: str
    region: str = "com"

    def auth_base(self) -> str:
        return f"https://auth.pingone.{self.region}"

    def api_base(self) -> str:
        return f"https://api.pingone.{self.region}/v1/environments/{self.environment_id}"


class PingOneAdapter:
    """Fetches identity posture from PingOne.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: PingOneCredentials, client: httpx.AsyncClient | None = None) -> None:
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
                f"PingOne rejected the worker application credential for "
                f"environment {self.credentials.environment_id!r} in region "
                f"{self.credentials.region!r} (HTTP {resp.status_code}). Check the "
                "client id, client credential and region are all correct."
            )
        token = resp.json().get("access_token")
        if not token:
            raise ValueError(
                "PingOne's token endpoint returned no access token for "
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
        """Follow PingOne's HAL `_links.next` pagination."""
        items: list[dict] = []
        url: str | None = f"{self.credentials.api_base()}{path}"
        query: dict | None = {"limit": _PAGE_SIZE, **params}
        for _ in range(_MAX_PAGES):
            resp = await client.get(url, headers=await self._headers(client), params=query, timeout=_TIMEOUT)
            resp.raise_for_status()
            payload = resp.json()
            embedded = payload.get("_embedded", {})
            batch = next(iter(embedded.values()), []) if embedded else []
            items.extend(batch)
            next_link = (payload.get("_links", {}) or {}).get("next", {}).get("href")
            url, query = next_link, None
            if not url:
                return items, False
        return items, True

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "")
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"PingOne rejected the request for environment "
                    f"{self.credentials.environment_id!r} (HTTP {resp.status_code}). "
                    "Confirm the worker application has an Identity Data Read Only "
                    "or Environment Viewer role on this environment."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(
                f"Could not reach PingOne environment "
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
                self._check_mfa_policy(client),
                self._check_password_policy(client),
                self._check_population_audit(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("pingone check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_mfa_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/signOnPolicies")
        if resp.status_code == 403:
            return [self._unavailable(
                "pingone.policies.mfa_required", "Sign-on policy requires MFA",
                "mfa_enforcement",
                "Grant the worker application the Identity Data Read Only role so "
                "sign-on policies can be read.",
            )]
        resp.raise_for_status()
        policies = resp.json().get("_embedded", {}).get("signOnPolicies", [])
        requiring_mfa: list[str] = []
        for policy in policies:
            actions = policy.get("_embedded", {}).get("actions", [])
            # A LOGIN action alone doesn't guarantee MFA; the reliable signal is
            # a dedicated MULTI_FACTOR_AUTHENTICATION policy action.
            if any(a.get("type") == "MULTI_FACTOR_AUTHENTICATION" for a in actions):
                requiring_mfa.append(policy.get("name", ""))
        passed = bool(requiring_mfa)
        return [IntegrationFinding(
            check_id="pingone.policies.mfa_required",
            title="A sign-on policy requires multi-factor authentication",
            description=(
                f"{len(requiring_mfa)} of {len(policies)} sign-on policy/policies "
                "include a Multi-Factor Authentication action."
                if policies else "No sign-on policies are defined for this environment."
            ),
            remediation=(
                "Experiences → Policies → Sign On Policies: add a Multi-Factor "
                "Authentication action to the policy applied at authentication, and "
                "assign it to the applications that need it."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={"policy_count": len(policies), "mfa_policies": requiring_mfa[:20]},
        )]

    async def _check_password_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/passwordPolicies")
        if resp.status_code == 403:
            return [self._unavailable(
                "pingone.policies.password_strength", "Password policy strength",
                "access_control",
                "Grant the worker application the Identity Data Read Only role so "
                "password policies can be read.",
            )]
        resp.raise_for_status()
        policies = resp.json().get("_embedded", {}).get("passwordPolicies", [])
        weakest: int | None = None
        for policy in policies:
            min_len = (policy.get("length") or {}).get("min")
            if isinstance(min_len, int):
                weakest = min_len if weakest is None else min(weakest, min_len)
        if weakest is None:
            return [self._unavailable(
                "pingone.policies.password_strength", "Password policy strength",
                "access_control",
                "No password policy in this environment declares a minimum "
                "length. Define one under Experiences → Policies → Password Policies.",
            )]
        passed = weakest >= 12
        return [IntegrationFinding(
            check_id="pingone.policies.password_strength",
            title="Password policy requires at least 12 characters",
            description=f"Weakest password policy requires {weakest} characters.",
            remediation=(
                "Experiences → Policies → Password Policies: raise the minimum "
                "length to 12 or more, consistent with NIST SP 800-63B guidance."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={"min_length": weakest, "policy_count": len(policies)},
        )]

    async def _check_population_audit(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        users, truncated = await self._get_paged(client, "/users")
        unassigned = [u for u in users if not (u.get("population") or {}).get("id")]
        locked = [u for u in users if (u.get("lifecycle") or {}).get("status") == "ACCOUNT_LOCKED"]
        passed = not unassigned
        scope = f"first {len(users)} users (more exist)" if truncated else f"all {len(users)} users"
        return [IntegrationFinding(
            check_id="pingone.users.population_audit",
            title="Every user belongs to a managed population",
            description=(
                f"{len(unassigned)} of {scope} have no population assignment; "
                f"{len(locked)} account(s) are currently locked."
            ),
            remediation=(
                "Assign every user to a population through directory sync or "
                "provisioning — an unassigned user falls outside population-scoped "
                "policies and reviews."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="hr_controls",
            result_details={
                "unassigned_count": len(unassigned),
                "locked_count": len(locked),
                "users_examined": len(users),
                "results_truncated": truncated,
                "sample": [u.get("username", u.get("id", "")) for u in unassigned][:20],
            },
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from PingOne with the supplied credential.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
