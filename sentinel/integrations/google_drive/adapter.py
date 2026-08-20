# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Google Drive integration adapter.

Built on the shared Google client (``sentinel/integrations/google``), using
the Drive API v3 to assess file sharing posture.

Auth: a GCP service account with domain-wide delegation. OAuth scopes
required:

  https://www.googleapis.com/auth/drive.readonly
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.google import GoogleClient, GoogleCredentials

logger = logging.getLogger(__name__)

_DRIVE_BASE = "https://www.googleapis.com/drive/v3"

_SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
]


@dataclass
class GoogleDriveCredentials(GoogleCredentials):
    """Matches dashboard credential fields for Google Drive."""


class GoogleDriveAdapter:
    """Fetches file sharing posture from Google Drive."""

    def __init__(self, credentials: GoogleDriveCredentials, client=None) -> None:
        self.credentials = credentials
        self.google = client if isinstance(client, GoogleClient) else GoogleClient(credentials, _SCOPES, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.google.get(
                f"{_DRIVE_BASE}/files",
                pageSize="1",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Google accepted the token but refused the Drive API "
                    f"(HTTP {resp.status_code}). Verify domain-wide delegation "
                    "is configured and the required scopes are authorised."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Google Drive API: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_external_files(),
            self._check_domain_sharing(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("google_drive check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_external_files(self) -> list[IntegrationFinding]:
        resp = await self.google.get(
            f"{_DRIVE_BASE}/files",
            q="visibility='anyoneWithLink'",
            fields="files(id,name)",
            pageSize="100",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "google_drive.sharing.external_files",
                "No files shared publicly via link",
                "data_classification",
                "Grant drive.readonly scope via domain-wide delegation.",
            )]
        resp.raise_for_status()
        files = resp.json().get("files", [])
        count = len(files)
        passed = count == 0
        return [IntegrationFinding(
            check_id="google_drive.sharing.external_files",
            title="No files shared publicly via link",
            description=(
                f"{count} file(s) are shared with 'anyone with the link'. "
                "These files are accessible without authentication."
            ),
            remediation=(
                "Review files shared with 'anyone with the link' and restrict "
                "sharing to specific users or the organisation domain where "
                "public access is not required."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="data_classification",
            result_details={
                "externally_shared_count": count,
                "sample": [f.get("name", "") for f in files][:20],
            },
        )]

    async def _check_domain_sharing(self) -> list[IntegrationFinding]:
        resp = await self.google.get(
            f"{_DRIVE_BASE}/files",
            q="visibility='domainCanFind' or visibility='domainWithLink'",
            fields="files(id,name)",
            pageSize="100",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "google_drive.sharing.domain_sharing",
                "Domain-wide file sharing is inventoried",
                "data_classification",
                "Grant drive.readonly scope via domain-wide delegation.",
            )]
        resp.raise_for_status()
        files = resp.json().get("files", [])
        count = len(files)
        return [IntegrationFinding(
            check_id="google_drive.sharing.domain_sharing",
            title="Domain-wide file sharing is inventoried",
            description=(
                f"{count} file(s) are shared domain-wide. Domain sharing is "
                "less risky than public sharing but should still be reviewed."
            ),
            remediation=(
                "Review domain-shared files periodically and restrict sharing "
                "to specific users or groups where broad access is not needed."
            ),
            status="PASSED" if count == 0 else "WARNING",
            severity="MEDIUM",
            check_category="data_classification",
            result_details={
                "domain_shared_count": count,
                "sample": [f.get("name", "") for f in files][:20],
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Google Drive with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
