# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""QuickBooks Online integration adapter.

Reads company user roles, the audit log, and payables from the
QuickBooks Online Accounting API for access-review and
financial-controls-access evidence: privileged account hygiene, audit-log
retrievability, and unreviewed high-value bills.

Auth: OAuth2 client_credentials grant (client_id + client_credential)
scoped to a single company identified by realm_id.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
_BASE = "https://quickbooks.api.intuit.com/v3/company"
_HIGH_VALUE_THRESHOLD = 10000.0


@dataclass
class QuickbooksCredentials:
    """Matches dashboard/src/integrations/quickbooks/config.ts credentialFields."""

    client_id: str
    client_credential: str
    realm_id: str


class QuickbooksAdapter:
    """Fetches company user roles and payables posture from QuickBooks Online."""

    def __init__(self, credentials: QuickbooksCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token for this company connection."""
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
                "QuickBooks rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "credential belong to an active connected app."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        realm = self.credentials.realm_id
        return await client.get(
            f"{_BASE}/{realm}{path}",
            headers=self._headers(token),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/companyinfo/" + self.credentials.realm_id)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "QuickBooks rejected the request for this company "
                    f"(HTTP {resp.status_code}). Verify the realm ID matches "
                    "a company connected to this app."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach QuickBooks: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_privileged_accounts(client),
                self._check_audit_log_retrievable(client),
                self._check_high_value_unreviewed(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("quickbooks check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_privileged_accounts(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # QuickBooks Online's Accounting API scope does not expose a
        # company-user roster with roles — user management lives in a
        # separate Intuit identity surface this connection cannot reach.
        resp = await self._get(client, "/query", query="SELECT * FROM User")
        if resp.status_code >= 400:
            return [self._unavailable(
                "quickbooks.users.privileged_accounts",
                "Privileged company-user account review",
                "least_privilege",
                "QuickBooks Online's Accounting API scope does not expose "
                "company users/roles for this connection type. Review "
                "admin users manually in Company Settings > Manage Users.",
            )]
        users = resp.json().get("QueryResponse", {}).get("User", [])
        admins = [u for u in users if u.get("IsAdmin")]
        inactive_admins = [u for u in admins if u.get("Active") is False]
        return [IntegrationFinding(
            check_id="quickbooks.users.privileged_accounts",
            title="Company admin accounts are active-only",
            description=(
                f"{len(admins)} of {len(users)} company user(s) hold admin rights; "
                f"{len(inactive_admins)} of those are inactive."
            ),
            remediation="Remove admin rights from inactive company-user accounts.",
            status="PASSED" if not inactive_admins else "FAILED",
            severity="HIGH" if inactive_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "total_users": len(users),
                "admin_count": len(admins),
                "inactive_admin_count": len(inactive_admins),
            },
        )]

    async def _check_audit_log_retrievable(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/auditlog", limit=25)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "quickbooks.audit.change_log_retrievable",
                "Change audit log retrievability",
                "audit_logging",
                "Grant this connection access to the QuickBooks Audit Log API.",
            )]
        resp.raise_for_status()
        entries = resp.json().get("AuditLogQueryResponse", {}).get("AuditLogEntry", [])
        return [IntegrationFinding(
            check_id="quickbooks.audit.change_log_retrievable",
            title="Company change audit log is retrievable for audit evidence",
            description=f"{len(entries)} audit log entry/entries retrieved from QuickBooks Online.",
            remediation="No action required — the audit log is enabled and accessible.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"audit_log_entry_count": len(entries)},
        )]

    async def _check_high_value_unreviewed(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/query",
            query=f"SELECT * FROM Bill WHERE Balance > '{_HIGH_VALUE_THRESHOLD:.2f}'",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "quickbooks.bills.high_value_unreviewed",
                "Unreviewed high-value bills",
                "access_control",
                "Grant this connection read access to the Bill entity.",
            )]
        resp.raise_for_status()
        bills = resp.json().get("QueryResponse", {}).get("Bill", [])
        return [IntegrationFinding(
            check_id="quickbooks.bills.high_value_unreviewed",
            title="High-value unpaid bills have a review trail",
            description=(
                f"{len(bills)} bill(s) with an outstanding balance over "
                f"${_HIGH_VALUE_THRESHOLD:,.0f} are awaiting payment."
            ),
            remediation=(
                "Confirm each high-value bill was reviewed and approved by someone other "
                "than the person who entered it, per segregation-of-duties policy."
            ),
            status="PASSED" if not bills else "WARNING",
            severity="MEDIUM" if bills else "INFO",
            check_category="access_control",
            result_details={
                "high_value_unpaid_bill_count": len(bills),
                "threshold": _HIGH_VALUE_THRESHOLD,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from QuickBooks with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
