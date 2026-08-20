# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Google Workspace integration adapter.

Built on the shared Google client (``sentinel/integrations/google``), using
the Admin SDK Directory API to assess identity posture across a Google
Workspace domain.

Auth: a GCP service account with domain-wide delegation. OAuth scopes
required:

  https://www.googleapis.com/auth/admin.directory.user.readonly
  https://www.googleapis.com/auth/admin.directory.domain.readonly
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.google import GoogleClient, GoogleCredentials

logger = logging.getLogger(__name__)

_ADMIN_BASE = "https://admin.googleapis.com"

_SCOPES = [
    "https://www.googleapis.com/auth/admin.directory.user.readonly",
    "https://www.googleapis.com/auth/admin.directory.domain.readonly",
]

_MAX_ADMINS = 5


@dataclass
class GoogleWorkspaceCredentials(GoogleCredentials):
    """Matches dashboard credential fields for Google Workspace."""


class GoogleWorkspaceAdapter:
    """Fetches identity posture from Google Workspace Admin SDK."""

    def __init__(self, credentials: GoogleWorkspaceCredentials, client=None) -> None:
        self.credentials = credentials
        self.google = client if isinstance(client, GoogleClient) else GoogleClient(credentials, _SCOPES, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.google.get(
                f"{_ADMIN_BASE}/admin/directory/v1/users",
                maxResults="1",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Google accepted the token but refused the Directory API "
                    f"(HTTP {resp.status_code}). Verify domain-wide delegation "
                    "is configured and the required scopes are authorised."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Google Admin SDK: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_mfa_enforcement(),
            self._check_admin_count(),
            self._check_suspended_users(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("google_workspace check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_mfa_enforcement(self) -> list[IntegrationFinding]:
        domain = self.credentials.delegated_admin_email.split("@")[-1] if self.credentials.delegated_admin_email else ""
        resp = await self.google.get(
            f"{_ADMIN_BASE}/admin/directory/v1/users",
            domain=domain,
            maxResults="100",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "google_workspace.directory.mfa_enforcement",
                "MFA is enforced across the Workspace domain",
                "mfa_enforcement",
                "Grant admin.directory.user.readonly scope via domain-wide delegation.",
            )]
        resp.raise_for_status()
        users = resp.json().get("users", [])
        not_enrolled = [
            u.get("primaryEmail", "")
            for u in users
            if not u.get("isEnrolledIn2Sv", False)
        ]
        total = len(users)
        passed = not not_enrolled
        return [IntegrationFinding(
            check_id="google_workspace.directory.mfa_enforcement",
            title="MFA is enforced across the Workspace domain",
            description=(
                f"{len(not_enrolled)} of {total} users do not have 2-Step "
                "Verification enrolled."
            ),
            remediation=(
                "Enforce 2-Step Verification for all users in the Google Admin "
                "console under Security > Authentication > 2-Step Verification."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="mfa_enforcement",
            result_details={
                "users_without_2sv": len(not_enrolled),
                "total_users_examined": total,
                "sample": not_enrolled[:20],
            },
        )]

    async def _check_admin_count(self) -> list[IntegrationFinding]:
        domain = self.credentials.delegated_admin_email.split("@")[-1] if self.credentials.delegated_admin_email else ""
        resp = await self.google.get(
            f"{_ADMIN_BASE}/admin/directory/v1/users",
            domain=domain,
            query="isAdmin=true",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "google_workspace.directory.admin_count",
                "Admin accounts are kept to a minimum",
                "least_privilege",
                "Grant admin.directory.user.readonly scope via domain-wide delegation.",
            )]
        resp.raise_for_status()
        admins = resp.json().get("users", [])
        count = len(admins)
        passed = count <= _MAX_ADMINS
        return [IntegrationFinding(
            check_id="google_workspace.directory.admin_count",
            title=f"Admin accounts kept at or below {_MAX_ADMINS}",
            description=f"{count} account(s) have super-admin privileges.",
            remediation=(
                "Remove standing super-admin rights where possible. Use admin "
                "roles with the minimum privileges needed for each administrator."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="least_privilege",
            result_details={
                "admin_count": count,
                "threshold": _MAX_ADMINS,
                "sample": [a.get("primaryEmail", "") for a in admins][:20],
            },
        )]

    async def _check_suspended_users(self) -> list[IntegrationFinding]:
        domain = self.credentials.delegated_admin_email.split("@")[-1] if self.credentials.delegated_admin_email else ""
        resp = await self.google.get(
            f"{_ADMIN_BASE}/admin/directory/v1/users",
            domain=domain,
            maxResults="500",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "google_workspace.directory.suspended_users",
                "Suspended users are inventoried",
                "access_control",
                "Grant admin.directory.user.readonly scope via domain-wide delegation.",
            )]
        resp.raise_for_status()
        users = resp.json().get("users", [])
        suspended = [
            u.get("primaryEmail", "")
            for u in users
            if u.get("suspended", False)
        ]
        return [IntegrationFinding(
            check_id="google_workspace.directory.suspended_users",
            title="Suspended users are inventoried for periodic review",
            description=(
                f"{len(suspended)} suspended account(s) found. Suspended accounts "
                "should be reviewed and deleted when no longer needed."
            ),
            remediation=(
                "Review suspended accounts in the Google Admin console and delete "
                "those that are no longer required to reduce the attack surface."
            ),
            status="PASSED" if not suspended else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={
                "suspended_count": len(suspended),
                "sample": suspended[:20],
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Google Admin SDK with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
