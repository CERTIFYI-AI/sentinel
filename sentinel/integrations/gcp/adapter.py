# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Google Cloud Platform integration adapter.

Built on the shared Google client (``sentinel/integrations/google``), using
the Cloud Resource Manager and IAM APIs to assess GCP project posture.

Auth: a GCP service account. OAuth scopes required:

  https://www.googleapis.com/auth/cloud-platform.read-only
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.google import GoogleClient, GoogleCredentials

logger = logging.getLogger(__name__)

_CRM_BASE = "https://cloudresourcemanager.googleapis.com"
_IAM_BASE = "https://iam.googleapis.com"

_SCOPES = [
    "https://www.googleapis.com/auth/cloud-platform.read-only",
]

_KEY_AGE_DAYS = 90


@dataclass
class GcpCredentials(GoogleCredentials):
    """Matches dashboard credential fields for GCP."""


class GcpAdapter:
    """Fetches project and IAM posture from Google Cloud Platform."""

    def __init__(self, credentials: GcpCredentials, client=None) -> None:
        self.credentials = credentials
        self.google = client if isinstance(client, GoogleClient) else GoogleClient(credentials, _SCOPES, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.google.get(
                f"{_CRM_BASE}/v1/projects/{self.credentials.project_id}",
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Google accepted the token but refused the Resource Manager API "
                    f"(HTTP {resp.status_code}). Verify the service account has "
                    "the required permissions on the project."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Google Cloud Resource Manager: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_service_account_keys(),
            self._check_projects_inventory(),
            self._check_audit_config(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("gcp check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_service_account_keys(self) -> list[IntegrationFinding]:
        project_id = self.credentials.project_id
        resp = await self.google.get(
            f"{_IAM_BASE}/v1/projects/{project_id}/serviceAccounts",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "gcp.iam.service_account_keys",
                "No service account has user-managed keys older than 90 days",
                "secret_management",
                "Grant the service account iam.serviceAccountKeys.list permission.",
            )]
        resp.raise_for_status()
        accounts = resp.json().get("accounts", [])
        cutoff = datetime.now(timezone.utc) - timedelta(days=_KEY_AGE_DAYS)
        stale_accounts: list[str] = []
        for sa in accounts:
            sa_email = sa.get("email", "")
            sa_name = sa.get("name", "")
            if not sa_name:
                continue
            keys_resp = await self.google.get(
                f"{_IAM_BASE}/v1/{sa_name}/keys",
            )
            if keys_resp.status_code != 200:
                continue
            for key in keys_resp.json().get("keys", []):
                if key.get("keyType") != "USER_MANAGED":
                    continue
                created = self._parse_ts(key.get("validAfterTime"))
                if created is not None and created < cutoff:
                    stale_accounts.append(sa_email)
                    break
        passed = not stale_accounts
        return [IntegrationFinding(
            check_id="gcp.iam.service_account_keys",
            title=f"No service account has user-managed keys older than {_KEY_AGE_DAYS} days",
            description=(
                f"{len(stale_accounts)} service account(s) have user-managed keys "
                f"older than {_KEY_AGE_DAYS} days."
            ),
            remediation=(
                "Rotate or delete user-managed service account keys older than "
                f"{_KEY_AGE_DAYS} days. Prefer workload identity federation or "
                "attached service accounts over exported keys."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="secret_management",
            result_details={
                "stale_key_accounts": len(stale_accounts),
                "threshold_days": _KEY_AGE_DAYS,
                "sample": stale_accounts[:20],
            },
        )]

    async def _check_projects_inventory(self) -> list[IntegrationFinding]:
        resp = await self.google.get(
            f"{_CRM_BASE}/v1/projects",
            filter=f"id:{self.credentials.project_id}",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "gcp.projects.inventory",
                "GCP projects are inventoried",
                "change_management",
                "Grant the service account resourcemanager.projects.get permission.",
            )]
        resp.raise_for_status()
        projects = resp.json().get("projects", [])
        return [IntegrationFinding(
            check_id="gcp.projects.inventory",
            title="GCP projects are inventoried",
            description=f"{len(projects)} project(s) visible to the service account.",
            remediation=(
                "Review the project inventory periodically and ensure unused "
                "projects are decommissioned."
            ),
            status="PASSED",
            severity="LOW",
            check_category="change_management",
            result_details={
                "project_count": len(projects),
                "sample": [p.get("projectId", "") for p in projects][:20],
            },
        )]

    async def _check_audit_config(self) -> list[IntegrationFinding]:
        project_id = self.credentials.project_id
        resp = await self.google.get(
            f"{_CRM_BASE}/v1/projects/{project_id}:getIamPolicy",
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "gcp.logging.audit_config",
                "Audit logging is configured on the project",
                "audit_logging",
                "Grant the service account resourcemanager.projects.getIamPolicy permission.",
            )]
        if resp.status_code == 404:
            return [self._unavailable(
                "gcp.logging.audit_config",
                "Audit logging is configured on the project",
                "audit_logging",
                "The project was not found. Verify the project_id is correct.",
            )]
        resp.raise_for_status()
        policy = resp.json()
        audit_configs = policy.get("auditConfigs", [])
        has_audit = len(audit_configs) > 0
        return [IntegrationFinding(
            check_id="gcp.logging.audit_config",
            title="Audit logging is configured on the project",
            description=(
                f"{len(audit_configs)} audit log configuration(s) found on the "
                "project IAM policy."
                if has_audit
                else "No audit log configurations found on the project IAM policy."
            ),
            remediation=(
                "Enable Data Access audit logs for critical services in the "
                "IAM & Admin section of the Cloud Console, or set auditConfigs "
                "on the project IAM policy."
            ),
            status="PASSED" if has_audit else "FAILED",
            severity="HIGH",
            check_category="audit_logging",
            result_details={
                "audit_config_count": len(audit_configs),
                "services": [c.get("service", "") for c in audit_configs][:20],
            },
        )]

    @staticmethod
    def _parse_ts(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Google Cloud with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
