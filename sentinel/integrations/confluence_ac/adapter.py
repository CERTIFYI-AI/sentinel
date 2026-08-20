# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Confluence Access Control integration adapter.

Built on the shared Atlassian client (``sentinel/integrations/atlassian``).
Uses the same Confluence API as the base Confluence adapter but focuses on
access-control checks: anonymous access and per-space permission restrictions.

Auth: HTTP Basic with email + API token.  The token needs:

  read:confluence-space.summary   space listing
  read:confluence-props           look-and-feel / site settings

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+--------------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                         | check_category            | Controls mapped                              |
+--------------------------------------------------+---------------------------+----------------------------------------------+
| confluence_ac.permissions.anonymous_access        | access_control            | SOC2 CC6.1 * ISO27001 A.9.1.2 * GDPR Art. 25 |
| confluence_ac.permissions.space_permissions       | access_control            | SOC2 CC6.1 * ISO27001 A.9.1.2 * PCI 7.1      |
+--------------------------------------------------+---------------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.atlassian import AtlassianClient, AtlassianCredentials
from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)


@dataclass
class ConfluenceAcCredentials(AtlassianCredentials):
    """Matches dashboard/src/integrations/confluence_ac/config.ts credentialFields."""


class ConfluenceAcAdapter:
    """Checks Confluence access controls: anonymous access and space permissions.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: ConfluenceAcCredentials, client=None) -> None:
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
            self._check_anonymous_access(),
            self._check_space_permissions(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("confluence_ac check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_anonymous_access(self) -> list[IntegrationFinding]:
        resp = await self.atl.get("/wiki/rest/api/settings/lookandfeel")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "confluence_ac.permissions.anonymous_access",
                "Anonymous access is disabled",
                "access_control",
                "Grant read:confluence-props scope to the API token.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        anon_enabled = bool(payload.get("custom", {}).get("anonymousAccess", False))
        if not anon_enabled:
            top_level = payload.get("anonymousAccess", None)
            if top_level is not None:
                anon_enabled = bool(top_level)
        return [IntegrationFinding(
            check_id="confluence_ac.permissions.anonymous_access",
            title=("Anonymous access is enabled"
                   if anon_enabled
                   else "Anonymous access is disabled"),
            description=(
                "The Confluence site allows anonymous (unauthenticated) access. "
                "Content in spaces that permit anonymous viewing is exposed to "
                "anyone with the URL."
                if anon_enabled else
                "Anonymous access is disabled; all visitors must authenticate."
            ),
            remediation="Disable anonymous access in Confluence administration "
                        "under Global Permissions unless public documentation "
                        "is intentional and approved.",
            status="FAILED" if anon_enabled else "PASSED",
            severity="CRITICAL" if anon_enabled else "INFO",
            check_category="access_control",
            result_details={"anonymous_access_enabled": anon_enabled},
        )]

    async def _check_space_permissions(self) -> list[IntegrationFinding]:
        resp = await self.atl.get("/wiki/api/v2/spaces", limit=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "confluence_ac.permissions.space_permissions",
                "Space permissions are restricted",
                "access_control",
                "Grant read:confluence-space.summary scope to the API token.",
            )]
        resp.raise_for_status()
        spaces = resp.json().get("results", [])
        if not spaces:
            return [IntegrationFinding(
                check_id="confluence_ac.permissions.space_permissions",
                title="Space permissions are restricted",
                description="No spaces found; permission check is not applicable.",
                remediation="Create spaces with explicit permission schemes.",
                status="NOT_AVAILABLE",
                severity="INFO",
                check_category="access_control",
                result_details={"space_count": 0},
            )]
        unrestricted: list[str] = []
        restricted: list[str] = []
        for space in spaces:
            space_id = space.get("id")
            space_key = space.get("key", str(space_id))
            detail_resp = await self.atl.get(f"/wiki/api/v2/spaces/{space_id}")
            if detail_resp.status_code in (401, 403):
                continue
            if detail_resp.status_code >= 400:
                continue
            detail = detail_resp.json()
            perms = detail.get("permissions", [])
            has_anon = any(
                p.get("principal", {}).get("type") == "anonymous"
                for p in perms
                if isinstance(p, dict)
            )
            if has_anon:
                unrestricted.append(space_key)
            else:
                restricted.append(space_key)
        has_unrestricted = len(unrestricted) > 0
        return [IntegrationFinding(
            check_id="confluence_ac.permissions.space_permissions",
            title=(f"{len(unrestricted)} space(s) allow anonymous access"
                   if has_unrestricted
                   else "All spaces have restricted permissions"),
            description=(
                f"{len(unrestricted)} of {len(spaces)} space(s) include an "
                "anonymous principal in their permissions, making content "
                "available without authentication."
                if has_unrestricted else
                f"All {len(spaces)} space(s) restrict access to authenticated "
                "users or named groups."
            ),
            remediation="Remove anonymous access from space permissions; use "
                        "named groups to control who can view each space.",
            status="FAILED" if has_unrestricted else "PASSED",
            severity="HIGH" if has_unrestricted else "INFO",
            check_category="access_control",
            result_details={
                "unrestricted_spaces": unrestricted[:20],
                "restricted_count": len(restricted),
                "total_spaces": len(spaces),
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
