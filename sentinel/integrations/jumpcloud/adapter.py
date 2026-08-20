# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""JumpCloud integration adapter.

Uses httpx (already a base dependency) against the JumpCloud v2 REST API.
Auth: an API key issued to an administrator account, sent as the
``x-api-key`` header — JumpCloud does not use OAuth for this surface. When
the account manages multiple organizations, ``org_id`` selects which one the
key operates against via the ``x-org-id`` header; a single-org account can
leave it blank. Read-only administrator permissions are sufficient — every
call this adapter makes is a GET.

JumpCloud is the directory and device posture system of record for orgs
that run it, so its evidence carries the same weight Okta's does elsewhere.
An endpoint the plan does not expose returns NOT_AVAILABLE rather than a
guess — a compliance platform reporting PASSED for a check it could not run
is the failure mode this whole pipeline exists to avoid.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌──────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                             │ check_category           │ Controls mapped                             │
├──────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ jumpcloud.users.mfa_not_configured   │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ jumpcloud.users.status_audit         │ hr_controls              │ SOC2 CC6.2/CC6.3 · ISO27001 A.9.2.5/A.9.2.6 │
│                                      │                          │ · HIPAA 164.308(a)(3)(ii)(C) · PCI 8.1.4    │
│ jumpcloud.insights.events_available  │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1          │
│                                      │                          │ · HIPAA 164.312(b) · PCI 10.1 · GDPR Art. 30│
│ jumpcloud.policies.password_strength │ access_control           │ SOC2 CC6.1 · ISO27001 A.9.4.3 · PCI 8.2/8.3 │
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

_API_BASE = "https://console.jumpcloud.com/api/v2"
#: Directory Insights lives on its own host, separate from the v2 admin API.
_INSIGHTS_BASE = "https://api.jumpcloud.com/insights/directory/v1"

_MAX_PAGES = 10
_PAGE_SIZE = 100

#: systemuser.state values JumpCloud uses for an account not yet activated.
_INACTIVE_STATES = frozenset({"STAGED", "SUSPENDED"})


@dataclass
class JumpCloudCredentials:
    """Matches dashboard/src/integrations/jumpcloud/config.ts credentialFields."""

    api_key: str
    org_id: str = ""


class JumpCloudAdapter:
    """Fetches identity posture from JumpCloud.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: JumpCloudCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        # Injectable for tests; constructed lazily otherwise so importing the
        # adapter never opens a connection.
        self._client = client

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        headers = {
            "x-api-key": self.credentials.api_key,
            "Accept": "application/json",
        }
        if self.credentials.org_id:
            headers["x-org-id"] = self.credentials.org_id
        return headers

    async def _get(self, client: httpx.AsyncClient, base: str, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{base}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _get_paged(self, client: httpx.AsyncClient, path: str, **params) -> tuple[list[dict], bool]:
        """Follow the v2 API's `limit`/`skip` pagination."""
        items: list[dict] = []
        for page in range(_MAX_PAGES):
            resp = await self._get(client, _API_BASE, path, limit=_PAGE_SIZE, skip=page * _PAGE_SIZE, **params)
            resp.raise_for_status()
            batch = resp.json()
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
            resp = await self._get(client, _API_BASE, "/systemusers", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"JumpCloud rejected the API key (HTTP {resp.status_code}). "
                    "Check the key is active and, for a multi-org account, that "
                    "org_id names an organization it can access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach JumpCloud: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_mfa_configured(client),
                self._check_user_status(client),
                self._check_directory_insights(client),
                self._check_password_policy(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("jumpcloud check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_mfa_configured(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        try:
            users, truncated = await self._get_paged(client, "/systemusers", fields="mfa,state")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 403:
                return [self._unavailable(
                    "jumpcloud.users.mfa_not_configured", "System users have MFA configured",
                    "mfa_enforcement",
                    "Grant the API key's administrator read access to system users.",
                )]
            raise
        active = [u for u in users if u.get("state") == "ACTIVATED"]
        not_configured = [
            u.get("username", u.get("_id", "")) for u in active
            if not (u.get("mfa") or {}).get("configured") and not (u.get("mfa") or {}).get("exclusion")
        ]
        passed = not not_configured
        scope = f"first {len(active)} activated users (more exist)" if truncated else f"all {len(active)} activated users"
        return [IntegrationFinding(
            check_id="jumpcloud.users.mfa_not_configured",
            title="Activated users have MFA configured",
            description=(
                f"{len(not_configured)} of {scope} have no MFA factor configured "
                "and are not excluded from the requirement."
            ),
            remediation=(
                "User Security Settings → require MFA, then have every user "
                "without an excluded role enroll a TOTP or push factor."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={
                "not_configured_count": len(not_configured),
                "activated_users_examined": len(active),
                "results_truncated": truncated,
                "sample": not_configured[:20],
            },
        )]

    async def _check_user_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        users, truncated = await self._get_paged(client, "/systemusers", fields="username,state,created")
        inactive = [u for u in users if u.get("state") in _INACTIVE_STATES]
        passed = not inactive
        return [IntegrationFinding(
            check_id="jumpcloud.users.status_audit",
            title="No system user is left staged or suspended",
            description=(
                f"{len(inactive)} of {len(users)} system user(s) are STAGED or "
                "SUSPENDED rather than activated or removed."
            ),
            remediation=(
                "Complete or cancel pending activations, and delete suspended "
                "accounts once the leaver review confirms they are no longer "
                "needed — a suspended account left in place is an incomplete "
                "offboarding, not a closed one."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="hr_controls",
            result_details={
                "inactive_count": len(inactive),
                "users_examined": len(users),
                "results_truncated": truncated,
                "sample": [u.get("username", u.get("_id", "")) for u in inactive][:20],
            },
        )]

    async def _check_directory_insights(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, _INSIGHTS_BASE, "/events",
            service=["directory"], limit=1,
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "jumpcloud.insights.events_available", "Directory Insights events are retrievable",
                "audit_logging",
                "Enable Directory Insights on this plan and grant the API key "
                "read access to it, so authentication and admin events can be "
                "retained as evidence.",
            )]
        resp.raise_for_status()
        return [IntegrationFinding(
            check_id="jumpcloud.insights.events_available",
            title="Directory Insights events are retrievable for audit evidence",
            description=(
                "The Directory Insights events endpoint responded, so "
                "authentication and administrative events can be collected as "
                "Art. 12 / CC7.2 evidence."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={},
        )]

    async def _check_password_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, _API_BASE, "/policies", filter="template.name:eq:password_complexity")
        if resp.status_code == 403:
            return [self._unavailable(
                "jumpcloud.policies.password_strength", "Password policy strength",
                "access_control",
                "Grant the API key's administrator read access to policies.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        policies = payload if isinstance(payload, list) else payload.get("results", [])
        weakest: int | None = None
        active_count = 0
        for policy in policies:
            if not policy.get("active", True):
                continue
            active_count += 1
            min_len = (policy.get("values") or {}).get("min_length")
            if isinstance(min_len, int):
                weakest = min_len if weakest is None else min(weakest, min_len)
        if weakest is None:
            return [self._unavailable(
                "jumpcloud.policies.password_strength", "Password policy strength",
                "access_control",
                "No active password complexity policy declares a minimum "
                "length. Create one under Policy Management.",
            )]
        passed = weakest >= 12
        return [IntegrationFinding(
            check_id="jumpcloud.policies.password_strength",
            title="Password policy requires at least 12 characters",
            description=f"Weakest active password policy requires {weakest} characters.",
            remediation=(
                "Policy Management → password complexity policy: raise the "
                "minimum length to 12 or more, consistent with NIST SP 800-63B "
                "guidance."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={"min_length": weakest, "active_policy_count": active_count},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from JumpCloud with the supplied API key.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
