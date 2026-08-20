# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Confluence Cloud integration adapter.

Built on the shared Atlassian client (``sentinel/integrations/atlassian``).
Auth: HTTP Basic with email + API token.  The token needs:

  read:confluence-space.summary   space listing

Uses the Confluence REST API v2 (paths under ``/wiki/api/v2/``).

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                 | check_category            | Controls mapped                              |
+------------------------------------------+---------------------------+----------------------------------------------+
| confluence.spaces.inventory              | change_management         | SOC2 CC8.1 * ISO27001 A.12.1.2               |
| confluence.content.public_pages          | data_classification       | SOC2 CC6.1 * ISO27001 A.8.2.1 * GDPR Art. 25 |
+------------------------------------------+---------------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.atlassian import AtlassianClient, AtlassianCredentials
from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)


@dataclass
class ConfluenceCredentials(AtlassianCredentials):
    """Matches dashboard/src/integrations/confluence/config.ts credentialFields."""


class ConfluenceAdapter:
    """Fetches space and content posture from Confluence Cloud.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: ConfluenceCredentials, client=None) -> None:
        self.credentials = credentials
        self.atl = client if isinstance(client, AtlassianClient) else AtlassianClient(credentials, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.atl.get("/wiki/api/v2/spaces", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Confluence rejected the credentials (HTTP {resp.status_code}). "
                    "Check the email, API token and site URL."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Confluence: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_spaces_inventory(),
            self._check_public_pages(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("confluence check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_spaces_inventory(self) -> list[IntegrationFinding]:
        resp = await self.atl.get("/wiki/api/v2/spaces")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "confluence.spaces.inventory",
                "Confluence space inventory",
                "change_management",
                "Grant read:confluence-space.summary scope to the API token.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        spaces = payload.get("results", [])
        count = len(spaces)
        return [IntegrationFinding(
            check_id="confluence.spaces.inventory",
            title=f"{count} Confluence space(s) discovered",
            description=f"The Confluence site has {count} space(s) under management.",
            remediation="Review spaces periodically to archive stale ones and "
                        "ensure each has appropriate permissions.",
            status="PASSED",
            severity="LOW",
            check_category="change_management",
            result_details={
                "space_count": count,
                "sample": [
                    {"key": s.get("key", ""), "name": s.get("name", "")}
                    for s in spaces[:20]
                ],
            },
        )]

    async def _check_public_pages(self) -> list[IntegrationFinding]:
        resp = await self.atl.get(
            "/wiki/api/v2/spaces",
            type="global",
            status="current",
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "confluence.content.public_pages",
                "Globally visible Confluence spaces",
                "data_classification",
                "Grant read:confluence-space.summary scope to the API token.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        global_spaces = payload.get("results", [])
        count = len(global_spaces)
        has_global = count > 0
        return [IntegrationFinding(
            check_id="confluence.content.public_pages",
            title=(f"{count} globally visible space(s) found"
                   if has_global
                   else "No globally visible spaces found"),
            description=(
                f"{count} space(s) are typed as global and currently active. "
                "Global spaces may be visible to all authenticated users and "
                "could contain sensitive documentation."
                if has_global else
                "No global spaces found; all spaces appear to be restricted."
            ),
            remediation="Review global spaces and restrict access where content "
                        "is sensitive. Convert to personal or team spaces where "
                        "appropriate.",
            status="WARNING" if has_global else "PASSED",
            severity="HIGH" if has_global else "INFO",
            check_category="data_classification",
            result_details={
                "global_space_count": count,
                "sample": [
                    {"key": s.get("key", ""), "name": s.get("name", "")}
                    for s in global_spaces[:20]
                ],
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Confluence with the "
                        "permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
