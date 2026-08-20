# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Notion integration adapter.

Reads access-review and data-location evidence from the Notion API:
bot/integration accounts with workspace access, workspace audit log
retrievability, and pages or databases shared to the public web.

Auth: a single api_key (Bearer, Notion internal integration secret).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.notion.com/v1"
_NOTION_VERSION = "2022-06-28"


@dataclass
class NotionCredentials:
    """Matches dashboard/src/integrations/notion/config.ts credentialFields."""

    api_key: str


class NotionAdapter:
    """Fetches access-review and data-location evidence from Notion."""

    def __init__(self, credentials: NotionCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Notion-Version": _NOTION_VERSION,
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await client.get(f"{_BASE}/users/me", headers=self._headers(), timeout=_TIMEOUT)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Notion rejected the integration secret. Verify the key "
                    "is active and the integration is not disconnected."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Notion: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_bot_integration_count(client),
                self._check_audit_log_retrieval(client),
                self._check_public_url_exposure(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("notion check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_bot_integration_count(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await client.get(
            f"{_BASE}/users", headers=self._headers(), params={"page_size": 100}, timeout=_TIMEOUT
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "notion.users.bot_integration_count",
                "Bot/integration accounts with workspace access",
                "least_privilege",
                "The integration secret needs read access to the workspace's user list.",
            )]
        resp.raise_for_status()
        users = resp.json().get("results", [])
        bots = [u for u in users if u.get("type") == "bot"]
        total = len(users)
        ratio = (len(bots) / total) if total else 0.0
        passed = total > 0 and ratio <= 0.3
        return [IntegrationFinding(
            check_id="notion.users.bot_integration_count",
            title="Bot/integration accounts with workspace access reviewed",
            description=(
                f"{len(bots)} of {total} workspace user(s) are bot "
                f"integrations with standing API access ({ratio:.0%})."
            ),
            remediation=(
                "Review connected integrations in Workspace Settings and "
                "remove any bot that no longer needs access to workspace content."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="least_privilege",
            result_details={
                "bot_integration_count": len(bots),
                "total_workspace_users": total,
            },
        )]

    async def _check_audit_log_retrieval(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await client.post(
            f"{_BASE}/audit_logs", headers=self._headers(), json={"page_size": 1}, timeout=_TIMEOUT
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "notion.audit.log_retrieval",
                "Workspace audit log retrievability",
                "audit_logging",
                "Audit log export requires a Notion Enterprise plan and an "
                "integration granted audit log access.",
            )]
        resp.raise_for_status()
        entries = resp.json().get("results", [])
        return [IntegrationFinding(
            check_id="notion.audit.log_retrieval",
            title="Workspace audit log is retrievable",
            description=f"The audit log API returned {len(entries)} recent entry/entries.",
            remediation=(
                "No action required. Continue forwarding Notion audit log "
                "entries into the SIEM for retention."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"recent_entry_count": len(entries)},
        )]

    async def _check_public_url_exposure(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await client.post(
            f"{_BASE}/search",
            headers=self._headers(),
            json={"page_size": 100},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "notion.pages.public_url_exposure",
                "Pages/databases shared to the public web",
                "data_classification",
                "The integration secret needs read access to shared pages and databases.",
            )]
        resp.raise_for_status()
        objects = resp.json().get("results", [])
        public = [o for o in objects if o.get("public_url")]
        return [IntegrationFinding(
            check_id="notion.pages.public_url_exposure",
            title="Pages and databases are not shared to the public web",
            description=(
                f"{len(public)} of {len(objects)} object(s) visible to this "
                "integration have a public share link enabled."
            ),
            remediation=(
                "Review pages and databases with 'Share to web' enabled and "
                "turn it off for any containing sensitive information."
            ),
            status="PASSED" if not public else "WARNING",
            severity="MEDIUM" if public else "INFO",
            check_category="data_classification",
            result_details={
                "public_url_count": len(public),
                "objects_reviewed": len(objects),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Notion with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
