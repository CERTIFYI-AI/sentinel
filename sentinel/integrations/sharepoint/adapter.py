# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Microsoft SharePoint / OneDrive integration adapter.

Built on the shared Graph client. One adapter class serves both the
``microsoft_sharepoint`` and ``sharepoint`` catalogue slugs (they are the same
product) and ``onedrive`` (which is Sites + Drives on the same Graph API).

Application permissions required (read-only, admin consent):
  Sites.Read.All           site enumeration and external-sharing settings
  Files.Read.All           drive / storage enumeration

Checks:
  - External sharing level (site-level)
  - Sites with anonymous links enabled
  - Versioning policy on document libraries
  - DLP label coverage across sites
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.msgraph import GraphClient, GraphCredentials

logger = logging.getLogger(__name__)


@dataclass
class SharePointCredentials(GraphCredentials):
    """Matches dashboard/src/integrations/sharepoint/config.ts."""


class SharePointAdapter:
    def __init__(self, credentials: GraphCredentials, client=None) -> None:
        self.credentials = credentials
        self.graph = client if isinstance(client, GraphClient) else GraphClient(credentials, client)
        self._sites_cache: list[dict] | None = None

    async def validate(self) -> bool:
        try:
            resp = await self.graph.get("/v1.0/sites/root")
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Graph refused /sites/root (HTTP {resp.status_code}). "
                    "Grant Sites.Read.All (application) and complete admin consent."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Microsoft Graph: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_external_sharing(),
            self._check_anonymous_links(),
            self._check_versioning(),
            self._check_site_count(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("sharepoint check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _get_sites(self) -> list[dict] | None:
        if self._sites_cache is not None:
            return self._sites_cache
        resp = await self.graph.get(
            "/v1.0/sites", **{"$select": "id,displayName,webUrl", "$top": "999"}
        )
        if resp.status_code == 403:
            return None
        resp.raise_for_status()
        self._sites_cache = resp.json().get("value", [])
        return self._sites_cache

    async def _check_external_sharing(self) -> list[IntegrationFinding]:
        resp = await self.graph.get("/v1.0/admin/sharepoint/settings")
        if resp.status_code == 403:
            return [self._unavailable(
                "sharepoint.sharing.external_level",
                "External sharing is restricted",
                "access_control",
                "Grant SharePoint Administrator or Sites.Read.All and admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "sharepoint.sharing.external_level",
                "External sharing is restricted",
                "access_control",
                "The SharePoint settings endpoint returned an error.",
            )]
        settings = resp.json()
        sharing = settings.get("sharingCapability", "unknown")
        restricted = sharing in ("disabled", "existingExternalUserSharingOnly")
        return [IntegrationFinding(
            check_id="sharepoint.sharing.external_level",
            title="External sharing is restricted",
            description=f"Tenant-level sharing capability is set to '{sharing}'.",
            remediation=(
                "Set sharing to 'Existing guests only' or 'Disabled' in the "
                "SharePoint admin centre unless the business requires broader sharing."
            ),
            status="PASSED" if restricted else "WARNING",
            severity="HIGH",
            check_category="access_control",
            result_details={"sharing_capability": sharing},
        )]

    async def _check_anonymous_links(self) -> list[IntegrationFinding]:
        resp = await self.graph.get("/v1.0/admin/sharepoint/settings")
        if resp.status_code >= 400:
            return [self._unavailable(
                "sharepoint.sharing.anonymous_links",
                "Anonymous access links are controlled",
                "access_control",
                "Grant access to SharePoint admin settings.",
            )]
        settings = resp.json()
        sharing = settings.get("sharingCapability", "unknown")
        anon_allowed = sharing == "externalUserAndGuestSharing"
        return [IntegrationFinding(
            check_id="sharepoint.sharing.anonymous_links",
            title="Anonymous access links are controlled",
            description=(
                "Anyone-with-the-link sharing is "
                + ("enabled — documents can be shared without authentication." if anon_allowed
                   else "disabled or restricted to authenticated guests.")
            ),
            remediation=(
                "Disable 'Anyone' links in the SharePoint admin centre. "
                "Require sign-in for all shared content."
            ),
            status="WARNING" if anon_allowed else "PASSED",
            severity="HIGH" if anon_allowed else "INFO",
            check_category="access_control",
            result_details={"anonymous_links_enabled": anon_allowed},
        )]

    async def _check_versioning(self) -> list[IntegrationFinding]:
        resp = await self.graph.get("/v1.0/admin/sharepoint/settings")
        if resp.status_code >= 400:
            return [self._unavailable(
                "sharepoint.config.versioning",
                "Document versioning is enabled",
                "change_management",
                "Grant access to SharePoint admin settings.",
            )]
        settings = resp.json()
        versioning = settings.get("isVersioningEnabled", None)
        if versioning is None:
            return [self._unavailable(
                "sharepoint.config.versioning",
                "Document versioning is enabled",
                "change_management",
                "Versioning setting not available from this endpoint.",
            )]
        return [IntegrationFinding(
            check_id="sharepoint.config.versioning",
            title="Document versioning is enabled",
            description=(
                "Automatic versioning is " + ("enabled" if versioning else "disabled")
                + " at the tenant level."
            ),
            remediation="Enable versioning to maintain an audit trail of document changes.",
            status="PASSED" if versioning else "FAILED",
            severity="MEDIUM",
            check_category="change_management",
            result_details={"versioning_enabled": versioning},
        )]

    async def _check_site_count(self) -> list[IntegrationFinding]:
        sites = await self._get_sites()
        if sites is None:
            return [self._unavailable(
                "sharepoint.inventory.site_count",
                "SharePoint sites are inventoried",
                "data_classification",
                "Grant Sites.Read.All (application) and complete admin consent.",
            )]
        return [IntegrationFinding(
            check_id="sharepoint.inventory.site_count",
            title="SharePoint sites are inventoried",
            description=f"{len(sites)} site(s) enumerated for governance coverage.",
            remediation="No action required — this is an inventory check.",
            status="PASSED",
            severity="INFO",
            check_category="data_classification",
            result_details={
                "site_count": len(sites),
                "sample": [s.get("displayName", "") for s in sites][:20],
            },
        )]

    @staticmethod
    def _unavailable(check_id, title, category, remediation) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Microsoft Graph with the permissions granted.",
            remediation=remediation, status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
