# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Ramp integration adapter.

Reads users and card transactions from the Ramp Developer API for
access-review and financial-controls-access evidence: inactive
admin/owner accounts that retain card-issuing and approval authority,
SSO/MFA enforcement (where exposed), and high-value transactions
awaiting review.

Auth: OAuth2 client_credentials grant (client_id + client_credential)
against Ramp's token endpoint.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://api.ramp.com/v1/public/customer/token"
_BASE = "https://api.ramp.com/developer/v1"
_HIGH_VALUE_THRESHOLD_CENTS = 1_000_000  # $10,000.00
_PRIVILEGED_ROLES = {"BUSINESS_ADMIN", "BUSINESS_OWNER"}
_SCOPES = "users:read transactions:read"


@dataclass
class RampCredentials:
    """Matches dashboard/src/integrations/ramp/config.ts credentialFields."""

    client_id: str
    client_credential: str


class RampAdapter:
    """Fetches users and card-spend posture from Ramp."""

    def __init__(self, credentials: RampCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via client_credentials."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "scope": _SCOPES,
            },
            auth=(self.credentials.client_id, self.credentials.client_credential),
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Ramp rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "credential belong to an active API client."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_BASE}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/users", page_size=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Ramp rejected the request with these credentials "
                    f"(HTTP {resp.status_code}). Verify the API client has "
                    "users:read and transactions:read scopes."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Ramp: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_inactive_admins(client),
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
                logger.warning("ramp check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_inactive_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", page_size=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ramp.users.inactive_admins",
                "Inactive admin/owner accounts with card-issuing authority",
                "least_privilege",
                "Grant the API client the users:read scope.",
            )]
        resp.raise_for_status()
        users = resp.json().get("data", [])
        admins = [u for u in users if str(u.get("role", "")).upper() in _PRIVILEGED_ROLES]
        inactive_admins = [a for a in admins if str(a.get("status", "")).upper() != "USER_ACTIVE"]
        return [IntegrationFinding(
            check_id="ramp.users.inactive_admins",
            title="Admin/owner accounts with card-issuing authority are active-only",
            description=(
                f"{len(admins)} of {len(users)} user(s) hold Business Admin or Owner "
                f"rights; {len(inactive_admins)} of those are inactive or suspended."
            ),
            remediation="Remove admin/owner rights from inactive users so they cannot issue or approve cards.",
            status="PASSED" if not inactive_admins else "FAILED",
            severity="HIGH" if inactive_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "total_users": len(users),
                "admin_count": len(admins),
                "inactive_admin_count": len(inactive_admins),
            },
        )]

    async def _check_sso_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # Ramp's Developer API does not expose organization-wide SSO/MFA
        # enforcement status — that is only configurable in the Ramp admin
        # console under Security settings.
        return [self._unavailable(
            "ramp.security.sso_enforcement",
            "SSO/MFA enforcement",
            "mfa_enforcement",
            "Ramp's Developer API does not expose SSO/MFA enforcement "
            "status. Verify manually in the Ramp admin console under Security.",
        )]

    async def _check_high_value_unreviewed(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/transactions", page_size=100, state="CLEARED")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ramp.transactions.high_value_unreviewed",
                "Unreviewed high-value transactions",
                "access_control",
                "Grant the API client the transactions:read scope.",
            )]
        resp.raise_for_status()
        transactions = resp.json().get("data", [])
        flagged = [
            t for t in transactions
            if abs(int(t.get("amount", 0))) >= _HIGH_VALUE_THRESHOLD_CENTS
            and not t.get("memo")
        ]
        return [IntegrationFinding(
            check_id="ramp.transactions.high_value_unreviewed",
            title="High-value transactions carry a review memo",
            description=(
                f"{len(flagged)} transaction(s) over ${_HIGH_VALUE_THRESHOLD_CENTS / 100:,.0f} "
                "are missing a memo describing the business purpose."
            ),
            remediation="Require a memo on transactions above the review threshold before they clear.",
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
            description="Sentinel could not read this from Ramp with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
