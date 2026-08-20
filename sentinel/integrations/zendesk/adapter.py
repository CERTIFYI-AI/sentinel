# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Zendesk integration adapter.

Reads access-review and data-location evidence from the Zendesk REST API:
dormant admin accounts, account-wide two-factor-authentication
enforcement, and organizations configured to share tickets/comments across
every user at their domain.

Auth: subdomain + email + api_key, sent as HTTP Basic
``{email}/token:{api_key}`` per Zendesk's API token authentication scheme.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class ZendeskCredentials:
    """Matches dashboard/src/integrations/zendesk/config.ts credentialFields."""

    subdomain: str
    email: str
    api_key: str

    def base_url(self) -> str:
        return f"https://{self.subdomain}.zendesk.com/api/v2"


class ZendeskAdapter:
    """Fetches access-review and data-exposure posture from Zendesk."""

    def __init__(self, credentials: ZendeskCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        token = f"{self.credentials.email}/token:{self.credentials.api_key}"
        basic = base64.b64encode(token.encode()).decode()
        return {
            "Authorization": f"Basic {basic}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/users/me.json")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Zendesk rejected the credentials. Verify the email, "
                    "API token, and subdomain."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Zendesk: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_two_factor_enforcement(client),
                self._check_shared_organization_tickets(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("zendesk check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users.json", role="admin", per_page=100)
        if resp.status_code == 403:
            return [self._unavailable(
                "zendesk.users.admin_hygiene",
                "Admin account hygiene",
                "least_privilege",
                "Grant the API token admin read access to /users.json.",
            )]
        resp.raise_for_status()
        admins = resp.json().get("users", [])
        suspended_admins = [a for a in admins if a.get("suspended")]
        passed = len(suspended_admins) == 0
        return [IntegrationFinding(
            check_id="zendesk.users.admin_hygiene",
            title="No suspended accounts retain the admin role",
            description=(
                f"{len(admins)} admin account(s) found, "
                f"{len(suspended_admins)} currently suspended."
            ),
            remediation=(
                "Remove the admin role from suspended accounts instead of "
                "leaving privileged access dormant."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if suspended_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "suspended_admin_count": len(suspended_admins),
            },
        )]

    async def _check_two_factor_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/account/settings.json")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "zendesk.account.two_factor_enforcement",
                "Two-factor authentication enforced account-wide",
                "mfa_enforcement",
                "Grant the API token access to /account/settings.json.",
            )]
        resp.raise_for_status()
        settings = resp.json().get("settings", {})
        security = settings.get("security", {})
        if "two_factor_authentication" not in security:
            return [self._unavailable(
                "zendesk.account.two_factor_enforcement",
                "Two-factor authentication enforced account-wide",
                "mfa_enforcement",
                "Enable two-factor authentication reporting in the Zendesk "
                "account security settings.",
            )]
        enforced = bool(security.get("two_factor_authentication"))
        return [IntegrationFinding(
            check_id="zendesk.account.two_factor_enforcement",
            title="Two-factor authentication is enforced account-wide",
            description=(
                "Account settings report two-factor authentication as "
                + ("enforced." if enforced else "not enforced.")
            ),
            remediation=(
                "Enable and enforce two-factor authentication for all agents "
                "and admins under Admin Center > Security."
            ),
            status="PASSED" if enforced else "FAILED",
            severity="HIGH" if not enforced else "INFO",
            check_category="mfa_enforcement",
            result_details={"two_factor_enforced": enforced},
        )]

    async def _check_shared_organization_tickets(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/organizations.json", per_page=100)
        if resp.status_code == 403:
            return [self._unavailable(
                "zendesk.organizations.shared_ticket_visibility",
                "Organizations with account-wide shared ticket visibility",
                "access_control",
                "Grant the API token read access to /organizations.json.",
            )]
        resp.raise_for_status()
        orgs = resp.json().get("organizations", [])
        shared = [o for o in orgs if o.get("shared_tickets") or o.get("shared_comments")]
        passed = len(shared) == 0
        return [IntegrationFinding(
            check_id="zendesk.organizations.shared_ticket_visibility",
            title="No organization exposes tickets to its entire domain",
            description=(
                f"{len(shared)} of {len(orgs)} organization(s) have "
                "shared_tickets or shared_comments enabled, exposing ticket "
                "content to any user at that domain."
            ),
            remediation=(
                "Disable shared_tickets/shared_comments for organizations "
                "handling sensitive requests, or confirm the exposure is "
                "intentional and documented."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if shared else "INFO",
            check_category="access_control",
            result_details={
                "organization_count": len(orgs),
                "shared_visibility_count": len(shared),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Zendesk with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
