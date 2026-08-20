# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Xero integration adapter.

Reads the organisation user roster and payables from the Xero Accounting
API for access-review and financial-controls-access evidence: privileged
role hygiene, SSO/MFA enforcement (where exposed), and unreviewed
high-value invoices awaiting payment.

Auth: OAuth2 client_credentials grant against a Xero Custom Connection
(client_id + client_credential), scoped to a single organisation
identified by tenant_id.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://identity.xero.com/connect/token"
_BASE = "https://api.xero.com/api.xro/2.0"
_HIGH_VALUE_THRESHOLD = 10000.0
_PRIVILEGED_ROLES = {"ADMIN", "FINANCIALADVISER"}


@dataclass
class XeroCredentials:
    """Matches dashboard/src/integrations/xero/config.ts credentialFields."""

    client_id: str
    client_credential: str
    tenant_id: str


class XeroAdapter:
    """Fetches organisation user roster and payables posture from Xero."""

    def __init__(self, credentials: XeroCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token for the Custom Connection."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Xero rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "credential belong to an active Custom Connection."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Xero-tenant-id": self.credentials.tenant_id,
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_BASE}{path}",
            headers=self._headers(token),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/Organisation")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Xero rejected the request for this organisation "
                    f"(HTTP {resp.status_code}). Verify the tenant ID matches "
                    "an organisation connected to this Custom Connection."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Xero: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_privileged_role_review(client),
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
                logger.warning("xero check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_privileged_role_review(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/Users")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "xero.users.privileged_role_review",
                "Privileged organisation role review",
                "least_privilege",
                "Grant the Custom Connection the accounting.settings.read scope.",
            )]
        resp.raise_for_status()
        users = resp.json().get("Users", [])
        privileged = [u for u in users if str(u.get("OrganisationRole", "")).upper() in _PRIVILEGED_ROLES]
        total = len(users)
        ratio_high = total > 0 and len(privileged) / total > 0.5
        needs_review = ratio_high or not privileged
        return [IntegrationFinding(
            check_id="xero.users.privileged_role_review",
            title="Admin/adviser roles are limited to those who need them",
            description=(
                f"{len(privileged)} of {total} user(s) hold an Admin or Financial "
                "Adviser role, which can approve and issue payments."
            ),
            remediation="Downgrade users who do not need to approve payments or manage settings to a Standard role.",
            status="WARNING" if needs_review else "PASSED",
            severity="MEDIUM" if needs_review else "INFO",
            check_category="least_privilege",
            result_details={
                "total_users": total,
                "privileged_role_count": len(privileged),
            },
        )]

    async def _check_sso_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # Xero's Accounting API does not expose organisation-wide SSO/MFA
        # enforcement status — that lives only in Xero's own account
        # security console, which is outside the accounting API surface.
        return [self._unavailable(
            "xero.security.sso_enforcement",
            "SSO/MFA enforcement",
            "mfa_enforcement",
            "Xero's Accounting API does not expose SSO/MFA enforcement "
            "status. Verify manually in the Xero account security settings.",
        )]

    async def _check_high_value_unreviewed(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/Invoices", where='Status=="AUTHORISED"', order="Total DESC")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "xero.invoices.high_value_unreviewed",
                "Unreviewed high-value invoices",
                "access_control",
                "Grant the Custom Connection the accounting.transactions.read scope.",
            )]
        resp.raise_for_status()
        invoices = resp.json().get("Invoices", [])
        high_value = [i for i in invoices if float(i.get("Total") or 0) >= _HIGH_VALUE_THRESHOLD]
        return [IntegrationFinding(
            check_id="xero.invoices.high_value_unreviewed",
            title="High-value invoices awaiting payment have a review trail",
            description=(
                f"{len(high_value)} invoice(s) over ${_HIGH_VALUE_THRESHOLD:,.0f} are "
                "authorised for payment but not yet paid."
            ),
            remediation=(
                "Confirm each high-value authorised invoice was reviewed by someone other "
                "than the approver before payment, per segregation-of-duties policy."
            ),
            status="PASSED" if not high_value else "WARNING",
            severity="MEDIUM" if high_value else "INFO",
            check_category="access_control",
            result_details={
                "authorised_invoice_count": len(invoices),
                "high_value_unpaid_count": len(high_value),
                "threshold": _HIGH_VALUE_THRESHOLD,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Xero with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
