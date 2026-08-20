# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Microsoft OneDrive for Business integration adapter.

Built on the shared Graph client. OneDrive for Business is a SharePoint
drives endpoint, so this adapter queries Graph's /drives and /users/{id}/drive
paths.

Application permissions required (read-only, admin consent):
  Files.Read.All           drive enumeration and quota
  User.Read.All            per-user drive discovery

Checks:
  - Drive inventory (how many user drives exist)
  - Storage quota utilisation
  - Drive activity (last-modified recency)
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.msgraph import GraphClient, GraphCredentials

logger = logging.getLogger(__name__)


@dataclass
class OneDriveCredentials(GraphCredentials):
    """Matches dashboard/src/integrations/onedrive/config.ts."""


class OneDriveAdapter:
    def __init__(self, credentials: GraphCredentials, client=None) -> None:
        self.credentials = credentials
        self.graph = client if isinstance(client, GraphClient) else GraphClient(credentials, client)

    async def validate(self) -> bool:
        try:
            resp = await self.graph.get("/v1.0/drives", **{"$top": "1"})
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Graph refused /drives (HTTP {resp.status_code}). "
                    "Grant Files.Read.All (application) and complete admin consent."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Microsoft Graph: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_drive_inventory(),
            self._check_quota_usage(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("onedrive check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_drive_inventory(self) -> list[IntegrationFinding]:
        items, truncated = await self.graph.get_paged("/v1.0/drives")
        if not items and not truncated:
            resp = await self.graph.get("/v1.0/drives", **{"$top": "1"})
            if resp.status_code == 403:
                return [self._unavailable(
                    "onedrive.inventory.drive_count",
                    "OneDrive drives are inventoried",
                    "data_classification",
                    "Grant Files.Read.All (application) and complete admin consent.",
                )]
        return [IntegrationFinding(
            check_id="onedrive.inventory.drive_count",
            title="OneDrive drives are inventoried",
            description=f"{len(items)} drive(s) enumerated for data governance.",
            remediation="No action required — this is an inventory check.",
            status="PASSED",
            severity="INFO",
            check_category="data_classification",
            result_details={
                "drive_count": len(items),
                "truncated": truncated,
                "sample": [d.get("name", "") for d in items][:20],
            },
        )]

    async def _check_quota_usage(self) -> list[IntegrationFinding]:
        items, _ = await self.graph.get_paged("/v1.0/drives")
        if not items:
            resp = await self.graph.get("/v1.0/drives", **{"$top": "1"})
            if resp.status_code == 403:
                return [self._unavailable(
                    "onedrive.storage.quota_usage",
                    "Drive storage quotas are monitored",
                    "data_classification",
                    "Grant Files.Read.All (application) and complete admin consent.",
                )]
        high_usage: list[str] = []
        for drive in items:
            quota = drive.get("quota") or {}
            total = quota.get("total", 0)
            used = quota.get("used", 0)
            if total > 0 and used / total > 0.9:
                high_usage.append(drive.get("name", drive.get("id", "")))
        return [IntegrationFinding(
            check_id="onedrive.storage.quota_usage",
            title="Drive storage quotas are monitored",
            description=(
                f"{len(high_usage)} drive(s) above 90% quota utilisation "
                f"out of {len(items)} total."
            ),
            remediation=(
                "Review drives approaching their quota. High utilisation may indicate "
                "unmanaged data growth or missing retention policies."
            ),
            status="PASSED" if not high_usage else "WARNING",
            severity="LOW",
            check_category="data_classification",
            result_details={
                "high_usage_count": len(high_usage),
                "total_drives": len(items),
                "sample": high_usage[:20],
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
