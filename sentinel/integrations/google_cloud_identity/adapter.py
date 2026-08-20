# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Google Cloud Identity integration adapter.

Built on the shared Google client (``sentinel/integrations/google``), using
the Cloud Identity Groups API to assess group membership posture.

Auth: a GCP service account with domain-wide delegation. OAuth scopes
required:

  https://www.googleapis.com/auth/cloud-identity.groups.readonly
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.google import GoogleClient, GoogleCredentials

logger = logging.getLogger(__name__)

_CI_BASE = "https://cloudidentity.googleapis.com"

_SCOPES = [
    "https://www.googleapis.com/auth/cloud-identity.groups.readonly",
]


@dataclass
class GoogleCloudIdentityCredentials(GoogleCredentials):
    """Matches dashboard credential fields for Google Cloud Identity."""


class GoogleCloudIdentityAdapter:
    """Fetches group posture from Google Cloud Identity."""

    def __init__(self, credentials: GoogleCloudIdentityCredentials, client=None) -> None:
        self.credentials = credentials
        self.google = client if isinstance(client, GoogleClient) else GoogleClient(credentials, _SCOPES, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.google.get(
                f"{_CI_BASE}/v1/groups",
                parent="customers/my_customer",
                pageSize="1",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Google accepted the token but refused the Cloud Identity API "
                    f"(HTTP {resp.status_code}). Verify domain-wide delegation "
                    "is configured and the required scopes are authorised."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Google Cloud Identity: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_groups_inventory(),
            self._check_external_members(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("google_cloud_identity check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_groups_inventory(self) -> list[IntegrationFinding]:
        resp = await self.google.get(
            f"{_CI_BASE}/v1/groups",
            parent="customers/my_customer",
            pageSize="200",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "google_cloud_identity.groups.inventory",
                "Groups are inventoried",
                "access_control",
                "Grant cloud-identity.groups.readonly scope via domain-wide delegation.",
            )]
        resp.raise_for_status()
        groups = resp.json().get("groups", [])
        return [IntegrationFinding(
            check_id="google_cloud_identity.groups.inventory",
            title="Cloud Identity groups are inventoried",
            description=f"{len(groups)} group(s) found in the directory.",
            remediation=(
                "Review group membership periodically to ensure access grants "
                "remain appropriate and remove stale groups."
            ),
            status="PASSED",
            severity="MEDIUM",
            check_category="access_control",
            result_details={
                "group_count": len(groups),
                "sample": [g.get("displayName", "") for g in groups][:20],
            },
        )]

    async def _check_external_members(self) -> list[IntegrationFinding]:
        resp = await self.google.get(
            f"{_CI_BASE}/v1/groups",
            parent="customers/my_customer",
            pageSize="200",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "google_cloud_identity.groups.external_members",
                "Groups do not contain external members",
                "access_control",
                "Grant cloud-identity.groups.readonly scope via domain-wide delegation.",
            )]
        resp.raise_for_status()
        groups = resp.json().get("groups", [])
        groups_with_external: list[str] = []
        for group in groups:
            group_name = group.get("name", "")
            if not group_name:
                continue
            members_resp = await self.google.get(
                f"{_CI_BASE}/v1/{group_name}/memberships",
                pageSize="200",
            )
            if members_resp.status_code != 200:
                continue
            for member in members_resp.json().get("memberships", []):
                member_key = member.get("preferredMemberKey", {})
                member_id = member_key.get("id", "")
                if member_id and "@" in member_id:
                    group_domain = group.get("groupKey", {}).get("id", "").split("@")[-1]
                    member_domain = member_id.split("@")[-1]
                    if group_domain and member_domain and group_domain != member_domain:
                        groups_with_external.append(group.get("displayName", group_name))
                        break
        passed = not groups_with_external
        return [IntegrationFinding(
            check_id="google_cloud_identity.groups.external_members",
            title="Groups do not contain external members",
            description=(
                f"{len(groups_with_external)} group(s) contain members from "
                "external domains."
            ),
            remediation=(
                "Review groups with external members and confirm the access is "
                "intentional. Restrict external membership where it is not needed."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="access_control",
            result_details={
                "groups_with_external_members": len(groups_with_external),
                "sample": groups_with_external[:20],
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Cloud Identity with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
