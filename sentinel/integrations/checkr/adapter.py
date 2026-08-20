# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Checkr integration adapter.

Reads background-check posture from the Checkr API: background checks
stuck pending beyond a reasonable SLA, adverse/flagged results that
have not been reviewed, and whether the account's audit trail of who
ordered checks is retrievable.

Auth: a single api_key sent as the Basic auth username with a blank
password (Checkr's documented API key scheme).
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
_BASE = "https://api.checkr.com/v1"
_PENDING_SLA_DAYS = 7


@dataclass
class CheckrCredentials:
    """Matches dashboard/src/integrations/checkr/config.ts credentialFields."""

    api_key: str


class CheckrAdapter:
    """Fetches background-check governance posture from Checkr."""

    def __init__(self, credentials: CheckrCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> tuple[str, str]:
        return (self.credentials.api_key, "")

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/reports", per_page=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Checkr rejected the API key. Verify the key is active "
                    "and has not been revoked in account settings."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Checkr: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_pending_checks_aging(client),
                self._check_adverse_finding_follow_up(client),
                self._check_audit_trail(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("checkr check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_pending_checks_aging(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/reports", status="pending", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "checkr.reports.pending_aging",
                "Pending checks aging",
                "hr_controls",
                "Grant the API key read access to background check "
                "reports.",
            )]
        resp.raise_for_status()
        data = resp.json()
        reports = data if isinstance(data, list) else data.get("data", data.get("results", []))
        cutoff = datetime.now(timezone.utc) - timedelta(days=_PENDING_SLA_DAYS)
        aged = []
        for r in reports:
            created = _parse_datetime(r.get("created_at"))
            if created is not None and created < cutoff:
                aged.append(r)
        return [IntegrationFinding(
            check_id="checkr.reports.pending_aging",
            title="No background checks are stuck pending beyond SLA",
            description=(
                f"{len(aged)} of {len(reports)} pending report(s) have been "
                f"open longer than {_PENDING_SLA_DAYS} days, leaving a "
                "pre-hire risk unresolved."
            ),
            remediation=(
                "Escalate pending reports that exceed the SLA with Checkr "
                "support and hold access grants until the report clears."
            ),
            status="PASSED" if not aged else "WARNING",
            severity="MEDIUM" if aged else "INFO",
            check_category="hr_controls",
            result_details={
                "total_pending": len(reports),
                "aged_beyond_sla": len(aged),
                "sla_days": _PENDING_SLA_DAYS,
            },
        )]

    async def _check_adverse_finding_follow_up(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/reports", status="consider", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "checkr.reports.adverse_follow_up",
                "Adverse-finding follow-up",
                "hr_controls",
                "Grant the API key read access to reports flagged for "
                "adverse action.",
            )]
        resp.raise_for_status()
        data = resp.json()
        reports = data if isinstance(data, list) else data.get("data", data.get("results", []))
        unreviewed = [r for r in reports if not r.get("adjudication") and not r.get("reviewed_at")]
        return [IntegrationFinding(
            check_id="checkr.reports.adverse_follow_up",
            title="Adverse background-check findings are reviewed",
            description=(
                f"{len(unreviewed)} of {len(reports)} report(s) flagged "
                "'consider' have no recorded adjudication or review."
            ),
            remediation=(
                "Complete the adverse-action review and record an "
                "adjudication for every flagged report before a hiring "
                "decision proceeds."
            ),
            status="PASSED" if not unreviewed else "FAILED",
            severity="HIGH" if unreviewed else "INFO",
            check_category="hr_controls",
            result_details={
                "adverse_findings": len(reports),
                "unreviewed_findings": len(unreviewed),
            },
        )]

    async def _check_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit_logs", per_page=1)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "checkr.account.audit_trail",
                "API credential scope / audit trail",
                "audit_logging",
                "Grant the API key read access to the account audit log so "
                "who ordered each report can be reconstructed.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("data", data.get("results", []))
        return [IntegrationFinding(
            check_id="checkr.account.audit_trail",
            title="Checkr audit trail of ordered reports is retrievable",
            description=(
                f"The audit log is reachable and returned {len(entries)} "
                "recent entry/entries covering who ordered background "
                "checks."
            ),
            remediation=(
                "No action required. Keep audit-log read scope on the API "
                "key so ordering activity remains reconstructable."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"recent_entries": len(entries)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Checkr with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
