# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Fieldguide integration adapter.

Fieldguide is an audit/engagement-management platform used by accounting
and advisory firms to run SOC 2 and similar audits. This adapter reads
engagement-level evidence-collection status: overdue request-list items,
client-side portal access grants, and whether uploaded evidence carries a
retrievable audit trail.

Auth: a single api_key (Bearer API token issued from the Fieldguide
firm-admin settings).

Note: Fieldguide's public API surface is not well-documented outside
customer accounts, so this adapter keeps to conservative, generically-named
REST endpoints and degrades to NOT_AVAILABLE rather than guessing at
vendor-specific field names.
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
_BASE = "https://app.fieldguide.io/api/v1"

#: A portal access grant not touched in this many days is considered stale.
_STALE_ACCESS_DAYS = 90


@dataclass
class FieldguideCredentials:
    """Matches dashboard/src/integrations/fieldguide/config.ts credentialFields."""

    api_key: str


class FieldguideAdapter:
    """Fetches audit-engagement evidence-collection status from Fieldguide."""

    def __init__(self, credentials: FieldguideCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Fieldguide rejected the API key. Verify the key is "
                    "active and was issued with firm-admin read access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Fieldguide: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_overdue_request_items(client),
                self._check_engagement_access(client),
                self._check_evidence_audit_trail(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("fieldguide check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_overdue_request_items(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/request-list-items", status="open", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "fieldguide.request_items.overdue",
                "Overdue evidence requests",
                "vendor_management",
                "Grant the API key read access to request-list items across "
                "active engagements.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data if isinstance(data, list) else data.get("items", data.get("results", []))

        now = datetime.now(timezone.utc)
        overdue = []
        for item in items:
            due_at = item.get("due_date") or item.get("due_at")
            if not due_at:
                continue
            try:
                due = datetime.fromisoformat(str(due_at).replace("Z", "+00:00"))
            except ValueError:
                continue
            if due < now:
                overdue.append(item)

        passed = len(overdue) == 0
        return [IntegrationFinding(
            check_id="fieldguide.request_items.overdue",
            title="No overdue evidence-collection requests",
            description=(
                f"{len(overdue)} of {len(items)} open request-list item(s) "
                "are past their due date."
            ),
            remediation=(
                "Follow up with evidence owners on overdue request-list "
                "items so the audit engagement stays on schedule."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if overdue else "INFO",
            check_category="vendor_management",
            result_details={
                "open_item_count": len(items),
                "overdue_item_count": len(overdue),
            },
        )]

    async def _check_engagement_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/engagement-access", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "fieldguide.access.engagement_grants",
                "Engagement portal access",
                "access_control",
                "Grant the API key read access to engagement user "
                "access/membership records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        grants = data if isinstance(data, list) else data.get("access", data.get("results", []))

        now = datetime.now(timezone.utc)
        stale = []
        for grant in grants:
            last_active = grant.get("last_active_at") or grant.get("last_login_at")
            if not last_active:
                continue
            try:
                last_active_dt = datetime.fromisoformat(str(last_active).replace("Z", "+00:00"))
            except ValueError:
                continue
            if (now - last_active_dt).days > _STALE_ACCESS_DAYS:
                stale.append(grant)

        passed = len(stale) == 0
        return [IntegrationFinding(
            check_id="fieldguide.access.engagement_grants",
            title="No stale engagement portal access grants",
            description=(
                f"{len(grants)} client-side portal access grant(s) reviewed; "
                f"{len(stale)} inactive more than {_STALE_ACCESS_DAYS} days."
            ),
            remediation=(
                "Review portal access granted to client-side users and "
                "revoke access that has been inactive for an extended "
                "period or is no longer needed for the engagement."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if stale else "INFO",
            check_category="access_control",
            result_details={
                "total_grants": len(grants),
                "stale_grant_count": len(stale),
            },
        )]

    async def _check_evidence_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/evidence/audit-log", per_page=10)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "fieldguide.evidence.audit_trail",
                "Evidence upload audit trail",
                "audit_logging",
                "Grant the API key read access to the evidence upload "
                "audit trail.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("entries", data.get("results", []))
        retrievable = len(entries) > 0
        return [IntegrationFinding(
            check_id="fieldguide.evidence.audit_trail",
            title="Evidence upload audit trail is retrievable",
            description=(
                f"{len(entries)} recent evidence audit-trail entr{'y' if len(entries) == 1 else 'ies'} "
                "retrieved from Fieldguide."
            ),
            remediation=(
                "Confirm evidence uploads are consistently logged with "
                "uploader, timestamp, and file identity so the audit trail "
                "supports later review."
            ),
            status="PASSED" if retrievable else "WARNING",
            severity="INFO" if retrievable else "MEDIUM",
            check_category="audit_logging",
            result_details={
                "audit_trail_entries": len(entries),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Fieldguide with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
