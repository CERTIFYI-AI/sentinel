# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Brex integration adapter.

Reads users, spend budgets, and card transactions from the Brex API for
access-review and financial-controls-access evidence: inactive users who
retain budget-approval authority, SSO/MFA enforcement (where exposed),
and high-value card transactions without a memo/receipt on file.

Auth: a single api_key (Brex API token, Bearer, issued from the Brex
Developer Dashboard).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://platform.brexapis.com"
_HIGH_VALUE_THRESHOLD_CENTS = 1_000_000  # $10,000.00


@dataclass
class BrexCredentials:
    """Matches dashboard/src/integrations/brex/config.ts credentialFields."""

    api_key: str


class BrexAdapter:
    """Fetches users, budgets, and card-spend posture from Brex."""

    def __init__(self, credentials: BrexCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/v2/users/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Brex rejected the API token. Verify the token is "
                    "active and was issued with read scopes."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Brex: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_inactive_budget_owners(client),
                self._check_sso_enforcement(client),
                self._check_high_value_unreviewed(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("brex check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_inactive_budget_owners(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        users_resp = await self._get(client, "/v2/users", cursor="")
        if users_resp.status_code in (403, 404):
            return [self._unavailable(
                "brex.budgets.inactive_approvers",
                "Inactive users with spend-approval authority",
                "least_privilege",
                "Grant the API token read access to the Users API.",
            )]
        users_resp.raise_for_status()
        users = {u.get("id"): u for u in users_resp.json().get("items", [])}

        budgets_resp = await self._get(client, "/v2/budgets", cursor="")
        if budgets_resp.status_code in (403, 404):
            return [self._unavailable(
                "brex.budgets.inactive_approvers",
                "Inactive users with spend-approval authority",
                "least_privilege",
                "Grant the API token read access to the Budgets API.",
            )]
        budgets_resp.raise_for_status()
        budgets = budgets_resp.json().get("items", [])

        inactive_approvers: set[str] = set()
        for budget in budgets:
            for owner_id in budget.get("owner_user_ids", []):
                owner = users.get(owner_id)
                if owner and str(owner.get("status", "")).upper() not in ("ACTIVE", ""):
                    inactive_approvers.add(owner_id)

        return [IntegrationFinding(
            check_id="brex.budgets.inactive_approvers",
            title="Budget spend-approval authority is limited to active users",
            description=(
                f"{len(inactive_approvers)} inactive user(s) still own or approve "
                f"one or more of the {len(budgets)} spend budget(s) in Brex."
            ),
            remediation=(
                "Remove inactive users as budget owners/approvers so departed or "
                "suspended employees cannot retain spend-approval authority."
            ),
            status="PASSED" if not inactive_approvers else "FAILED",
            severity="HIGH" if inactive_approvers else "INFO",
            check_category="least_privilege",
            result_details={
                "budget_count": len(budgets),
                "inactive_approver_count": len(inactive_approvers),
            },
        )]

    async def _check_sso_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # Brex's public API does not expose organization-wide SSO/MFA
        # enforcement status — that is only configurable in the Brex admin
        # console under Security settings.
        return [self._unavailable(
            "brex.security.sso_enforcement",
            "SSO/MFA enforcement",
            "mfa_enforcement",
            "Brex's API does not expose SSO/MFA enforcement status. Verify "
            "manually in the Brex admin console under Security.",
        )]

    async def _check_high_value_unreviewed(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v2/transactions/card/primary", cursor="")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "brex.transactions.high_value_unreviewed",
                "High-value card transactions without a memo/receipt",
                "access_control",
                "Grant the API token read access to the Transactions API.",
            )]
        resp.raise_for_status()
        transactions = resp.json().get("items", [])
        flagged = [
            t for t in transactions
            if abs(int((t.get("amount") or {}).get("amount", 0))) >= _HIGH_VALUE_THRESHOLD_CENTS
            and not t.get("memo") and not t.get("receipts")
        ]
        return [IntegrationFinding(
            check_id="brex.transactions.high_value_unreviewed",
            title="High-value card transactions carry a memo or receipt",
            description=(
                f"{len(flagged)} card transaction(s) over "
                f"${_HIGH_VALUE_THRESHOLD_CENTS / 100:,.0f} are missing both a memo "
                "and an attached receipt."
            ),
            remediation="Require a memo and receipt for card transactions above the review threshold.",
            status="PASSED" if not flagged else "WARNING",
            severity="MEDIUM" if flagged else "INFO",
            check_category="access_control",
            result_details={
                "transaction_count": len(transactions),
                "flagged_high_value_count": len(flagged),
                "threshold_cents": _HIGH_VALUE_THRESHOLD_CENTS,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Brex with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
