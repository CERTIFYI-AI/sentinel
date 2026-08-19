# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Okta integration adapter.

Uses httpx (already a base dependency) against the Okta Management API v1.
Auth: an API token (SSWS) issued to a **service account**, or an OAuth service
app. Read-only scopes are sufficient — every call below is a GET.

Evidence source per the Continuous GRC master sheet: users, groups, MFA and
password policies, application assignments, admin roles, system log. Okta is
the access-control system of record for most orgs, which is why its evidence
maps to more framework controls than any other single connector.

An endpoint the org's plan does not expose returns NOT_AVAILABLE rather than a
guess — a compliance platform reporting PASSED for a check it could not run is
the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌──────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                             │ check_category           │ Controls mapped                             │
├──────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ okta.policies.mfa_enrollment         │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ okta.policies.password_strength      │ access_control           │ SOC2 CC6.1 · ISO27001 A.9.4.3 · PCI 8.2/8.3 │
│ okta.admins.super_admin_count        │ least_privilege          │ SOC2 CC6.3 · ISO27001 A.9.2.3 · PCI 7.1     │
│ okta.users.stale_active_accounts     │ hr_controls              │ SOC2 CC6.2/CC6.3 · ISO27001 A.9.2.5/A.9.2.6 │
│                                      │                          │ · HIPAA 164.308(a)(3)(ii)(C) · PCI 8.1.4    │
│ okta.apps.federated_signon           │ access_control           │ SOC2 CC6.1 · ISO27001 A.9.4.1 · PCI 8.2     │
│ okta.logs.system_log_available       │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1          │
│                                      │                          │ · HIPAA 164.312(b) · PCI 10.1 · GDPR Art. 30│
└──────────────────────────────────────┴──────────────────────────┴─────────────────────────────────────────────┘
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: Okta paginates with an RFC 5988 Link header; cap pages so one very large
#: tenant cannot stall a sync indefinitely. Reported honestly when truncated.
_MAX_PAGES = 10
_PAGE_SIZE = 200

#: An ACTIVE account unused for this long is an offboarding signal, not proof
#: of compromise — reported as WARNING, never FAILED.
_STALE_LOGIN_DAYS = 90

#: More than this many super admins is a least-privilege smell. Okta's own
#: guidance is to keep the count small and use granular roles instead.
_MAX_SUPER_ADMINS = 5

#: signOnMode values that federate authentication to Okta. Anything else (in
#: particular SECURE_PASSWORD_STORE / BOOKMARK) means shared or stored
#: passwords outside the IdP's control.
_FEDERATED_SIGNON = frozenset({
    "SAML_2_0", "SAML_1_1", "OPENID_CONNECT", "WS_FEDERATION",
})


@dataclass
class OktaCredentials:
    """Matches dashboard/src/integrations/okta/config.ts credentialFields."""

    org_url: str
    api_token: str

    def base_url(self) -> str:
        return self.org_url.rstrip("/")


class OktaAdapter:
    """Fetches identity posture from Okta.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: OktaCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        # Injectable for tests; constructed lazily otherwise so importing the
        # adapter never opens a connection.
        self._client = client

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"SSWS {self.credentials.api_token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _get_paged(self, client: httpx.AsyncClient, path: str, **params) -> tuple[list[dict], bool]:
        """Follow Okta's Link-header pagination.

        Returns (items, truncated). ``truncated`` is True when the page cap was
        hit, so a check can say so instead of silently reporting on a subset.
        """
        items: list[dict] = []
        url: str | None = f"{self.credentials.base_url()}{path}"
        query: dict | None = {"limit": _PAGE_SIZE, **params}
        for _ in range(_MAX_PAGES):
            resp = await client.get(url, headers=self._headers(), params=query, timeout=_TIMEOUT)
            resp.raise_for_status()
            page = resp.json()
            if isinstance(page, list):
                items.extend(page)
            url, query = self._next_link(resp), None
            if not url:
                return items, False
        return items, True

    @staticmethod
    def _next_link(resp: httpx.Response) -> str | None:
        """Extract rel="next" from the Link header, if present."""
        link = resp.headers.get("link") or resp.headers.get("Link")
        if not link:
            return None
        for part in link.split(","):
            segments = part.split(";")
            if len(segments) < 2:
                continue
            if any('rel="next"' in s.replace(" ", "") for s in segments[1:]):
                return segments[0].strip().strip("<>")
        return None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient()

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/api/v1/users", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Okta rejected the API token for {self.credentials.org_url!r} "
                    f"(HTTP {resp.status_code}). Check the token is active and the "
                    "service account still has read access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(
                f"Could not reach Okta at {self.credentials.org_url!r}: {exc}"
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
                self._check_super_admins(client),
                self._check_stale_accounts(client),
                self._check_app_signon(client),
                self._check_system_log(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("okta check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_mfa_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/api/v1/policies", type="MFA_ENROLL")
        if resp.status_code == 403:
            return [self._unavailable(
                "okta.policies.mfa_enrollment", "MFA enrolment policy",
                "mfa_enforcement",
                "The API token cannot read policies. Grant the service account "
                "read access to policies, or use an admin-scoped token.",
            )]
        resp.raise_for_status()
        policies = [p for p in resp.json() if p.get("status") == "ACTIVE"]
        passed = bool(policies)
        return [IntegrationFinding(
            check_id="okta.policies.mfa_enrollment",
            title="MFA enrolment policy is active",
            description=(
                f"{len(policies)} active MFA enrolment policy/policies."
                if passed else
                "No active MFA enrolment policy — users can authenticate with a "
                "password alone."
            ),
            remediation=(
                "Security → Authenticators → Enrollment: add an enrolment policy "
                "that requires at least one strong factor, and set it ACTIVE."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={
                "active_policy_count": len(policies),
                "policy_names": [p.get("name") for p in policies][:20],
            },
        )]

    async def _check_password_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/api/v1/policies", type="PASSWORD")
        if resp.status_code == 403:
            return [self._unavailable(
                "okta.policies.password_strength", "Password policy strength",
                "access_control",
                "The API token cannot read policies. Grant read access to policies.",
            )]
        resp.raise_for_status()
        active = [p for p in resp.json() if p.get("status") == "ACTIVE"]
        weakest: int | None = None
        for policy in active:
            complexity = (
                policy.get("settings", {}).get("password", {}).get("complexity", {})
            )
            min_len = complexity.get("minLength")
            if isinstance(min_len, int):
                weakest = min_len if weakest is None else min(weakest, min_len)
        # No active policy, or none declaring a minimum length, is not evidence
        # of a strong policy — say so rather than passing by default.
        if weakest is None:
            return [self._unavailable(
                "okta.policies.password_strength", "Password policy strength",
                "access_control",
                "No active password policy declares a minimum length. Define one "
                "under Security → Authenticators → Password.",
            )]
        passed = weakest >= 12
        return [IntegrationFinding(
            check_id="okta.policies.password_strength",
            title="Password policy requires at least 12 characters",
            description=(
                f"Weakest active password policy requires {weakest} characters."
            ),
            remediation=(
                "Security → Authenticators → Password: raise the minimum length to "
                "12 or more, consistent with NIST SP 800-63B guidance."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={
                "min_length": weakest,
                "active_policy_count": len(active),
            },
        )]

    async def _check_super_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # "List users with role assignments". Older orgs / restricted tokens do
        # not expose it; that is reported, not guessed around.
        resp = await self._get(client, "/api/v1/iam/assignees/users")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "okta.admins.super_admin_count", "Super administrator count",
                "least_privilege",
                "This org or token does not expose the IAM assignees API. Review "
                "admin assignments under Security → Administrators.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        assignees = payload.get("value", payload) if isinstance(payload, dict) else payload
        count = len(assignees) if isinstance(assignees, list) else 0
        passed = count <= _MAX_SUPER_ADMINS
        return [IntegrationFinding(
            check_id="okta.admins.super_admin_count",
            title=f"Administrator assignments kept at or below {_MAX_SUPER_ADMINS}",
            description=f"{count} user(s) hold an administrator role assignment.",
            remediation=(
                "Security → Administrators: remove standing super-admin rights and "
                "replace them with the narrowest standard or custom role that works."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="least_privilege",
            result_details={"admin_assignee_count": count, "threshold": _MAX_SUPER_ADMINS},
        )]

    async def _check_stale_accounts(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        users, truncated = await self._get_paged(
            client, "/api/v1/users", filter='status eq "ACTIVE"'
        )
        cutoff = datetime.now(timezone.utc) - timedelta(days=_STALE_LOGIN_DAYS)
        stale: list[str] = []
        for user in users:
            last = user.get("lastLogin")
            if not last:
                # Never signed in: stale only if the account is old enough that
                # it should have been used by now.
                created = self._parse_ts(user.get("created"))
                if created and created < cutoff:
                    stale.append(user.get("profile", {}).get("login", user.get("id", "")))
                continue
            parsed = self._parse_ts(last)
            if parsed and parsed < cutoff:
                stale.append(user.get("profile", {}).get("login", user.get("id", "")))
        passed = not stale
        scope = (
            f"first {len(users)} active users (more exist)"
            if truncated else f"all {len(users)} active users"
        )
        return [IntegrationFinding(
            check_id="okta.users.stale_active_accounts",
            title=f"No active account unused for {_STALE_LOGIN_DAYS}+ days",
            description=(
                f"{len(stale)} of {scope} have not signed in for "
                f"{_STALE_LOGIN_DAYS} days."
            ),
            remediation=(
                "Confirm each account is still needed. Suspend or deactivate the "
                "ones that are not — dormant active accounts are the usual "
                "evidence gap in a leaver review."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="hr_controls",
            result_details={
                "stale_count": len(stale),
                "active_users_examined": len(users),
                "results_truncated": truncated,
                "sample": stale[:20],
            },
        )]

    async def _check_app_signon(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        apps, truncated = await self._get_paged(client, "/api/v1/apps", filter='status eq "ACTIVE"')
        federated = [a for a in apps if a.get("signOnMode") in _FEDERATED_SIGNON]
        other = [a for a in apps if a.get("signOnMode") not in _FEDERATED_SIGNON]
        passed = not other
        return [IntegrationFinding(
            check_id="okta.apps.federated_signon",
            title="Active applications authenticate through federated SSO",
            description=(
                f"{len(federated)} of {len(apps)} active applications use SAML/OIDC; "
                f"{len(other)} use a password-based or bookmark sign-on mode."
            ),
            remediation=(
                "Migrate password-store and bookmark apps to SAML or OIDC so "
                "authentication, MFA and deprovisioning stay under Okta's control."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={
                "federated_count": len(federated),
                "non_federated_count": len(other),
                "results_truncated": truncated,
                "non_federated_sample": [a.get("label") for a in other][:20],
            },
        )]

    async def _check_system_log(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        since = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        resp = await self._get(client, "/api/v1/logs", since=since, limit=1)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "okta.logs.system_log_available", "System log is retrievable",
                "audit_logging",
                "Grant the service account read access to the System Log API so "
                "authentication events can be retained as evidence.",
            )]
        resp.raise_for_status()
        return [IntegrationFinding(
            check_id="okta.logs.system_log_available",
            title="System log is retrievable for audit evidence",
            description=(
                "The System Log API responded, so authentication and admin events "
                "can be collected as Art. 12 / CC7.2 evidence."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"queried_since": since},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_ts(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Okta with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
