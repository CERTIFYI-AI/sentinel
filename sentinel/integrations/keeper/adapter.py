# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Keeper integration adapter.

Reads identity and vault posture from the Keeper Enterprise API: per-user MFA
enrollment, vault audit-event availability, and user provisioning status.
Auth is a Bearer API key issued to a read-only enterprise administrator role
under Admin Console → Admin → Secrets & Encryption → API.

An enterprise id is optional — most keys resolve to exactly one enterprise —
but is sent as a scoping header when present so a key valid across an MSP's
multiple managed enterprises is unambiguous about which one Sentinel reads.

An endpoint the plan or role does not expose returns NOT_AVAILABLE rather than
a guess — a compliance platform reporting PASSED for a check it could not run
is the failure mode this pipeline exists to avoid.

Evidence source per the Continuous GRC master sheet: users, groups, roles, MFA
enrollment, app assignments, password policies, status.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://keepersecurity.com/api/v1/enterprise"

#: User statuses that count as provisioned and able to authenticate. Anything
#: else (locked, invited, blocked) is excluded from the MFA denominator —
#: an invited user who has never accepted has no MFA state to evaluate.
_ACTIVE_STATUSES = frozenset({"active"})


@dataclass
class KeeperCredentials:
    """Matches dashboard/src/integrations/keeper/config.ts credentialFields."""

    api_key: str
    enterprise_id: str = ""


class KeeperAdapter:
    """Fetches identity and vault posture from Keeper.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: KeeperCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }
        if self.credentials.enterprise_id:
            headers["X-Enterprise-Id"] = self.credentials.enterprise_id
        return headers

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}", headers=self._headers(), params=params or None, timeout=_TIMEOUT
        )

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/users", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Keeper rejected the API key (HTTP {resp.status_code}). Check "
                    "the key is active and, if it spans multiple enterprises, that "
                    "the enterprise id is correct."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach Keeper: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_mfa_enforcement(client),
                self._check_vault_audit_events(client),
                self._check_user_provisioning(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("keeper check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_mfa_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", limit=500)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "keeper.users.mfa_enforcement", "Multi-factor authentication enforced",
                "mfa_enforcement",
                "Grant the API key read access to the user roster under "
                "Admin Console → Admin.",
            )]
        resp.raise_for_status()
        users = resp.json().get("users", resp.json() if isinstance(resp.json(), list) else [])
        active = [u for u in users if str(u.get("status", "active")).lower() in _ACTIVE_STATUSES]
        without_mfa = [u for u in active if not u.get("two_factor_enabled", False)]
        passed = not without_mfa
        return [IntegrationFinding(
            check_id="keeper.users.mfa_enforcement",
            title=f"{len(active) - len(without_mfa)} of {len(active)} active user(s) have MFA enabled",
            description=(
                "All active users have two-factor authentication enabled." if passed
                else f"{len(without_mfa)} active user(s) can authenticate with a "
                     "master password alone."
            ),
            remediation=(
                "Admin Console → Roles: enforce two-factor authentication as a role "
                "policy so it cannot be individually opted out of."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={
                "active_users": len(active),
                "without_mfa": len(without_mfa),
                "sample": [u.get("email") for u in without_mfa][:20],
            },
        )]

    async def _check_vault_audit_events(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit/events", limit=100)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "keeper.vault.audit_events", "Vault audit events are retrievable",
                "audit_logging",
                "Grant the API key read access to Advanced Reporting & Alerts (ARAM) "
                "under Admin Console → Reporting.",
            )]
        resp.raise_for_status()
        events = resp.json().get("events", resp.json() if isinstance(resp.json(), list) else [])
        return [IntegrationFinding(
            check_id="keeper.vault.audit_events",
            title="Vault audit events are retrievable for audit evidence",
            description=(
                f"{len(events)} recent vault event(s) retrieved through Advanced "
                "Reporting & Alerts."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"events_examined": len(events)},
        )]

    async def _check_user_provisioning(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", limit=500)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "keeper.users.provisioning", "User provisioning status",
                "access_control",
                "Grant the API key read access to the user roster under "
                "Admin Console → Admin.",
            )]
        resp.raise_for_status()
        users = resp.json().get("users", resp.json() if isinstance(resp.json(), list) else [])
        by_status: dict[str, int] = {}
        for user in users:
            status = str(user.get("status", "unknown")).lower()
            by_status[status] = by_status.get(status, 0) + 1
        locked_or_blocked = by_status.get("locked", 0) + by_status.get("blocked", 0)
        return [IntegrationFinding(
            check_id="keeper.users.provisioning",
            title=f"{len(users)} provisioned user(s) tracked",
            description=(
                f"{by_status.get('active', 0)} active, {locked_or_blocked} locked or "
                f"blocked, {by_status.get('invited', 0)} invited and not yet accepted."
            ),
            remediation=(
                "Reconcile the roster against HR-confirmed headcount. Remove invited "
                "users whose invitation is stale, and confirm every locked account "
                "corresponds to a completed offboarding."
            ),
            status="PASSED",
            severity="INFO",
            check_category="access_control",
            result_details={"total_users": len(users), "by_status": by_status},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Keeper with the supplied "
                        "API key.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
