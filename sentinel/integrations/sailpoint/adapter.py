# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""SailPoint integration adapter.

Reads identity governance posture from the SailPoint IdentityNow v3 REST API,
fronted by an OAuth 2.0 **client credentials** grant against a personal
access token (a client id / client secret pair issued under
Admin → Global → Security Settings → API Management). Scope the token to a
role with read-only reporting access — it can evidence every check here
without being able to approve a certification or change a role definition,
which is the point: evidence collection must not be able to alter what it is
evidencing.

Evidence source per the Continuous GRC master sheet: users, groups, roles,
MFA enrollment, app assignments, password policies, status — read here
through IdentityNow's governance-specific surfaces: certification campaigns,
individual certifications, the audit event stream, and role/entitlement
definitions.

A permission the token was not granted returns NOT_AVAILABLE rather than a
guess — a compliance platform reporting PASSED for a check it could not run
is the failure mode this pipeline exists to prevent.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: Active statuses a governance campaign can be in — STAGED counts as
#: "program running" for our purposes since it means one has been scheduled.
_ACTIVE_CAMPAIGN_STATUSES = frozenset({"ACTIVE", "STAGED", "PENDING"})


@dataclass
class SailPointCredentials:
    """Matches dashboard/src/integrations/sailpoint/config.ts credentialFields."""

    client_id: str
    client_credential: str
    tenant_url: str

    def api_base(self) -> str:
        return self.tenant_url.rstrip("/")


class SailPointAdapter:
    """Fetches identity governance posture from SailPoint IdentityNow.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: SailPointCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str = ""

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Client-credentials token, cached in memory for the life of this
        adapter instance. Nothing here writes a token to disk or a log line."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            f"{self.credentials.api_base()}/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code != 200:
            # Deliberately not echoing the response body: an error can quote
            # the submitted client_id, and the operator does not need it to act.
            raise ValueError(
                f"SailPoint rejected the client credentials for "
                f"{self.credentials.tenant_url!r} (HTTP {resp.status_code}). Check "
                "the client id, client credential and tenant URL."
            )
        self._access_token = str(resp.json().get("access_token", ""))
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{self.credentials.api_base()}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/v3/public-identities", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"SailPoint accepted the token but refused the read "
                    f"(HTTP {resp.status_code}). Grant the API client's role "
                    "read-only reporting access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach SailPoint IdentityNow: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_governance_campaigns(client),
                self._check_access_certifications(client),
                self._check_audit_event_logs(client),
                self._check_role_entitlements(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("sailpoint check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_governance_campaigns(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v3/campaigns", limit=250)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "sailpoint.governance.campaigns", "Identity governance campaigns running",
                "access_control",
                "Grant the API client read access to certification campaigns.",
            )]
        resp.raise_for_status()
        campaigns = resp.json() if isinstance(resp.json(), list) else resp.json().get("items", [])
        active = [c for c in campaigns if str(c.get("status", "")).upper() in _ACTIVE_CAMPAIGN_STATUSES]
        passed = bool(active)
        return [IntegrationFinding(
            check_id="sailpoint.governance.campaigns",
            title=f"{len(active)} active or scheduled governance campaign(s)",
            description=(
                f"{len(campaigns)} campaign(s) on record, {len(active)} active or "
                "scheduled." if passed else
                "No active or scheduled certification campaign — access reviews are "
                "not currently running."
            ),
            remediation=(
                "Certifications → Campaigns: schedule a recurring manager or "
                "entitlement-owner campaign so access review is continuous, not "
                "ad hoc."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={"total_campaigns": len(campaigns), "active_or_scheduled": len(active)},
        )]

    async def _check_access_certifications(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v3/certifications", limit=250)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "sailpoint.governance.certifications", "Access certifications completed on time",
                "access_control",
                "Grant the API client read access to certifications.",
            )]
        resp.raise_for_status()
        certs = resp.json() if isinstance(resp.json(), list) else resp.json().get("items", [])
        now = datetime.now(timezone.utc)
        overdue: list[str] = []
        for cert in certs:
            if cert.get("completed"):
                continue
            due = self._parse_ts(cert.get("due"))
            if due and due < now:
                overdue.append(cert.get("id", cert.get("name", "unknown")))
        passed = not overdue
        return [IntegrationFinding(
            check_id="sailpoint.governance.certifications",
            title=f"{len(overdue)} certification(s) overdue",
            description=(
                f"{len(overdue)} of {len(certs)} certification(s) are open past "
                "their due date." if overdue else
                f"No open certification is overdue, out of {len(certs)} on record."
            ),
            remediation=(
                "Certifications → open items: escalate overdue certifications to "
                "the assigned reviewer's manager, and set reminder notifications "
                "ahead of the due date."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={
                "total_certifications": len(certs),
                "overdue": len(overdue),
                "sample": overdue[:20],
            },
        )]

    async def _check_audit_event_logs(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v3/audit-events", limit=100)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "sailpoint.audit.event_logs", "Audit event logs are retrievable",
                "audit_logging",
                "Grant the API client the reporting-admin scope so audit events can "
                "be retained as evidence.",
            )]
        resp.raise_for_status()
        events = resp.json() if isinstance(resp.json(), list) else resp.json().get("items", [])
        return [IntegrationFinding(
            check_id="sailpoint.audit.event_logs",
            title="Audit event logs are retrievable for audit evidence",
            description=(
                f"{len(events)} recent audit event(s) retrieved from IdentityNow."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"events_examined": len(events)},
        )]

    async def _check_role_entitlements(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v3/roles", limit=250, filters="enabled eq true")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "sailpoint.roles.entitlements", "Roles have an accountable owner",
                "least_privilege",
                "Grant the API client read access to role definitions.",
            )]
        resp.raise_for_status()
        roles = resp.json() if isinstance(resp.json(), list) else resp.json().get("items", [])
        ownerless = [r for r in roles if not r.get("owner")]
        passed = not ownerless
        return [IntegrationFinding(
            check_id="sailpoint.roles.entitlements",
            title=f"{len(ownerless)} enabled role(s) without an owner",
            description=(
                f"{len(ownerless)} of {len(roles)} enabled role(s) have no assigned "
                "owner — nobody is accountable for certifying the entitlements "
                "bundled into them."
                if ownerless else
                f"All {len(roles)} enabled role(s) have an assigned owner."
            ),
            remediation=(
                "Roles → for each ownerless role: assign an owner accountable for "
                "the entitlements it grants, or disable the role if it is unused."
            ),
            status="PASSED" if passed else "FAILED",
            severity="MEDIUM",
            check_category="least_privilege",
            result_details={
                "enabled_roles": len(roles),
                "ownerless": len(ownerless),
                "sample": [r.get("name") for r in ownerless][:20],
            },
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
            description="Sentinel could not read this from SailPoint IdentityNow "
                        "with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
