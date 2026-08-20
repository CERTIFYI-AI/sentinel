# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Intercom integration adapter.

Reads the teammate roster, admin activity log, and public Help Center
content from the Intercom API for access-review and data-location
evidence: admin account hygiene, audit-log retrievability, and
accidental exposure of internal content through published articles.

Auth: a single api_key (Intercom Access Token, Bearer, from
Settings > Developers > your app's Authentication section).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.intercom.io"
_SENSITIVE_KEYWORDS = ("internal only", "internal use", "do not share", "confidential", "do not publish")


@dataclass
class IntercomCredentials:
    """Matches dashboard/src/integrations/intercom/config.ts credentialFields."""

    api_key: str


class IntercomAdapter:
    """Fetches teammate roster and access posture from Intercom."""

    def __init__(self, credentials: IntercomCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
            "Intercom-Version": "2.11",
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
                    "Intercom rejected the access token. Verify the token "
                    "is active and belongs to an app with read scopes."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Intercom: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_audit_log_retrievable(client),
                self._check_public_article_exposure(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("intercom check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/admins")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "intercom.admins.hygiene",
                "Administrator/teammate account hygiene",
                "least_privilege",
                "Grant the access token read access to the Admins resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        admins = data.get("admins", [])
        # Intercom's Admins API does not expose a last-login or disabled
        # flag — away_mode is the closest available signal for accounts
        # that are provisioned but not actively working the inbox.
        away = [a for a in admins if a.get("away_mode_enabled")]
        return [IntegrationFinding(
            check_id="intercom.admins.hygiene",
            title="Teammate accounts are reviewed for standing access",
            description=(
                f"{len(admins)} teammate account(s) with workspace access; "
                f"{len(away)} currently marked away and worth an access review."
            ),
            remediation=(
                "Review teammate accounts marked away for an extended period and remove "
                "workspace access for anyone who has left or changed role."
            ),
            status="WARNING" if len(admins) and len(away) / len(admins) > 0.5 else "PASSED",
            severity="MEDIUM" if len(admins) and len(away) / len(admins) > 0.5 else "INFO",
            check_category="least_privilege",
            result_details={
                "total_teammates": len(admins),
                "away_teammate_count": len(away),
            },
        )]

    async def _check_audit_log_retrievable(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/admins/activity_logs", created_at_after=0)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "intercom.audit.activity_log_retrievable",
                "Admin activity log retrievability",
                "audit_logging",
                "Grant the access token read access to the Activity Logs resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("activity_logs", [])
        return [IntegrationFinding(
            check_id="intercom.audit.activity_log_retrievable",
            title="Teammate activity log is retrievable for audit evidence",
            description=f"{len(entries)} activity log entry/entries retrieved from Intercom's admin activity log.",
            remediation="No action required — activity logging is enabled and accessible.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"activity_log_entry_count": len(entries)},
        )]

    async def _check_public_article_exposure(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/articles", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "intercom.articles.public_exposure",
                "Public Help Center content exposure",
                "data_classification",
                "Grant the access token read access to the Articles resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        articles = data.get("data", [])
        published = [a for a in articles if a.get("state") == "published"]
        flagged = [
            a for a in published
            if any(kw in (a.get("title") or "").lower() for kw in _SENSITIVE_KEYWORDS)
        ]
        return [IntegrationFinding(
            check_id="intercom.articles.public_exposure",
            title="Published Help Center articles do not look internal-only",
            description=(
                f"{len(flagged)} of {len(published)} published article(s) have a title "
                "suggesting internal-only content published to the public Help Center."
            ),
            remediation=(
                "Unpublish or move flagged articles to an internal collection; audit "
                "the Help Center periodically for accidental publication of internal content."
            ),
            status="PASSED" if not flagged else "FAILED",
            severity="HIGH" if flagged else "INFO",
            check_category="data_classification",
            result_details={
                "published_article_count": len(published),
                "flagged_article_count": len(flagged),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Intercom with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
