# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Certn integration adapter.

Reads background-check posture from the Certn API: background checks
stuck pending beyond a reasonable SLA, adverse/flagged results that
have not been reviewed, and whether the account's audit trail of who
ordered checks is retrievable.

Auth: a single api_key (Bearer token from Certn account settings).
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
_BASE = "https://api.certn.co/api/v2"
_PENDING_SLA_DAYS = 7


@dataclass
class CertnCredentials:
    """Matches dashboard/src/integrations/certn/config.ts credentialFields."""

    api_key: str


class CertnAdapter:
    """Fetches background-check governance posture from Certn."""

    def __init__(self, credentials: CertnCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/checks", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Certn rejected the API key. Verify the key is active "
                    "and has not been revoked in account settings."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Certn: {exc}") from exc
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
                logger.warning("certn check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_pending_checks_aging(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/checks", status="pending", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "certn.checks.pending_aging",
                "Pending checks aging",
                "hr_controls",
                "Grant the API key read access to background checks.",
            )]
        resp.raise_for_status()
        data = resp.json()
        checks = data if isinstance(data, list) else data.get("results", data.get("checks", []))
        cutoff = datetime.now(timezone.utc) - timedelta(days=_PENDING_SLA_DAYS)
        aged = []
        for c in checks:
            created = _parse_datetime(c.get("created_at") or c.get("ordered_at"))
            if created is not None and created < cutoff:
                aged.append(c)
        return [IntegrationFinding(
            check_id="certn.checks.pending_aging",
            title="No background checks are stuck pending beyond SLA",
            description=(
                f"{len(aged)} of {len(checks)} pending check(s) have been "
                f"open longer than {_PENDING_SLA_DAYS} days, leaving a "
                "pre-hire risk unresolved."
            ),
            remediation=(
                "Escalate pending checks that exceed the SLA with Certn "
                "support and hold access grants until the check clears."
            ),
            status="PASSED" if not aged else "WARNING",
            severity="MEDIUM" if aged else "INFO",
            check_category="hr_controls",
            result_details={
                "total_pending": len(checks),
                "aged_beyond_sla": len(aged),
                "sla_days": _PENDING_SLA_DAYS,
            },
        )]

    async def _check_adverse_finding_follow_up(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/checks", status="adverse", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "certn.checks.adverse_follow_up",
                "Adverse-finding follow-up",
                "hr_controls",
                "Grant the API key read access to background checks with "
                "adverse results.",
            )]
        resp.raise_for_status()
        data = resp.json()
        checks = data if isinstance(data, list) else data.get("results", data.get("checks", []))
        unreviewed = [c for c in checks if not c.get("reviewed_at") and not c.get("reviewed_by")]
        return [IntegrationFinding(
            check_id="certn.checks.adverse_follow_up",
            title="Adverse background-check findings are reviewed",
            description=(
                f"{len(unreviewed)} of {len(checks)} adverse/flagged "
                "check(s) have no recorded review."
            ),
            remediation=(
                "Assign an HR reviewer to every adverse finding and record "
                "the outcome before any hiring decision proceeds."
            ),
            status="PASSED" if not unreviewed else "FAILED",
            severity="HIGH" if unreviewed else "INFO",
            check_category="hr_controls",
            result_details={
                "adverse_findings": len(checks),
                "unreviewed_findings": len(unreviewed),
            },
        )]

    async def _check_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit-log", limit=1)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "certn.account.audit_trail",
                "API credential scope / audit trail",
                "audit_logging",
                "Grant the API key read access to the account audit log so "
                "who ordered each check can be reconstructed.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("results", data.get("entries", []))
        return [IntegrationFinding(
            check_id="certn.account.audit_trail",
            title="Certn audit trail of ordered checks is retrievable",
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
            description="Sentinel could not read this from Certn with the supplied credentials.",
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
