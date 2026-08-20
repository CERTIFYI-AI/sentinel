# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Pipedrive integration adapter.

Reads access-review and data-location evidence from the Pipedrive REST API:
dormant admin-user accounts, webhook subscriptions pushing CRM data to
external endpoints, and permission sets granting deal/lead visibility
across the entire company instead of being ownership-restricted.

Auth: a Pipedrive API token, sent as the ``api_token`` query parameter.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.pipedrive.com/v1"


@dataclass
class PipedriveCredentials:
    """Matches dashboard/src/integrations/pipedrive/config.ts credentialFields."""

    api_key: str


class PipedriveAdapter:
    """Fetches access-review and data-exposure posture from Pipedrive."""

    def __init__(self, credentials: PipedriveCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        query = {"api_token": self.credentials.api_key, **params}
        return await client.get(
            f"{_BASE}{path}",
            headers={"Accept": "application/json"},
            params=query,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/users/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Pipedrive rejected the API token. Verify the token is "
                    "active."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Pipedrive: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admins(client),
                self._check_external_webhooks(client),
                self._check_company_wide_permission_sets(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("pipedrive check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users")
        if resp.status_code == 403:
            return [self._unavailable(
                "pipedrive.users.dormant_admins",
                "Dormant administrator accounts",
                "least_privilege",
                "Grant the API token read access to /users.",
            )]
        resp.raise_for_status()
        users = resp.json().get("data") or []
        admins = [u for u in users if u.get("is_admin") and u.get("active_flag", True)]
        dormant = [a for a in admins if not a.get("last_login")]
        passed = len(dormant) == 0
        return [IntegrationFinding(
            check_id="pipedrive.users.dormant_admins",
            title="No dormant administrator accounts",
            description=(
                f"{len(admins)} active administrator account(s) found, "
                f"{len(dormant)} with no recorded login."
            ),
            remediation=(
                "Deactivate or downgrade administrator accounts that have "
                "never logged in."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "dormant_admin_count": len(dormant),
            },
        )]

    async def _check_external_webhooks(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/webhooks")
        if resp.status_code == 403:
            return [self._unavailable(
                "pipedrive.webhooks.external_targets",
                "Webhooks pushing data to external endpoints",
                "vendor_management",
                "Grant the API token read access to /webhooks.",
            )]
        resp.raise_for_status()
        hooks = resp.json().get("data") or []
        external = []
        for h in hooks:
            url = h.get("subscription_url", "")
            host = urlparse(url).hostname or ""
            if host and "pipedrive" not in host:
                external.append(h)
        passed = len(external) == 0
        return [IntegrationFinding(
            check_id="pipedrive.webhooks.external_targets",
            title="Outbound webhooks documented and vendor-reviewed",
            description=(
                f"{len(external)} of {len(hooks)} configured webhook(s) push "
                "CRM data to a third-party endpoint outside Pipedrive."
            ),
            remediation=(
                "Confirm every third-party webhook destination is a "
                "reviewed vendor with an active data-processing agreement; "
                "remove subscriptions that are no longer needed."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if external else "INFO",
            check_category="vendor_management",
            result_details={
                "webhook_count": len(hooks),
                "external_target_count": len(external),
            },
        )]

    async def _check_company_wide_permission_sets(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/permissionSets")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "pipedrive.permission_sets.company_wide_visibility",
                "Permission sets granting company-wide record visibility",
                "access_control",
                "Permission sets require a Pipedrive plan with role-based "
                "access control enabled, and read access to "
                "/permissionSets.",
            )]
        resp.raise_for_status()
        sets = resp.json().get("data") or []
        broad = [
            s for s in sets
            if "share_visibility_group_leads" in (s.get("permissions") or [])
            or str(s.get("name", "")).lower() in ("owner and followers", "entire company")
        ]
        passed = len(broad) == 0
        return [IntegrationFinding(
            check_id="pipedrive.permission_sets.company_wide_visibility",
            title="No permission set exposes deals/leads to the entire company by default",
            description=(
                f"{len(broad)} of {len(sets)} permission set(s) grant "
                "visibility of deals or leads beyond the owner's team."
            ),
            remediation=(
                "Scope permission sets to the owner and their team rather "
                "than the entire company unless broader visibility is a "
                "documented business need."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if broad else "INFO",
            check_category="access_control",
            result_details={
                "permission_set_count": len(sets),
                "company_wide_count": len(broad),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Pipedrive with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
