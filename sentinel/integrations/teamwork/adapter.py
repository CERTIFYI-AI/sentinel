# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Teamwork integration adapter.

Reads access-review and data-location evidence from the Teamwork Projects
REST API: dormant site-administrator accounts, account-wide two-factor
authentication enforcement, and projects opened up to every person on the
site instead of being restricted to their assigned team.

Auth: installation domain + api_key, sent as HTTP Basic with the API key as
the username and any password (Teamwork's API-key auth scheme).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class TeamworkCredentials:
    """Matches dashboard/src/integrations/teamwork/config.ts credentialFields."""

    domain: str
    api_key: str

    def base_url(self) -> str:
        return f"https://{self.domain}"


class TeamworkAdapter:
    """Fetches access-review and data-exposure posture from Teamwork."""

    def __init__(self, credentials: TeamworkCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(self.credentials.api_key, "X")

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/me.json")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Teamwork rejected the API key. Verify the key and the "
                    "installation domain."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Teamwork: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admins(client),
                self._check_two_factor_enforcement(client),
                self._check_public_projects(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("teamwork check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/people.json", onlyOwnerCompany="false")
        if resp.status_code == 403:
            return [self._unavailable(
                "teamwork.people.dormant_admins",
                "Dormant administrator accounts",
                "least_privilege",
                "Grant the API key read access to /people.json.",
            )]
        resp.raise_for_status()
        people = resp.json().get("people", [])
        admins = [p for p in people if p.get("isAdmin") and not p.get("deleted")]
        dormant = [a for a in admins if not a.get("lastLogin")]
        passed = len(dormant) == 0
        return [IntegrationFinding(
            check_id="teamwork.people.dormant_admins",
            title="No dormant site-administrator accounts",
            description=(
                f"{len(admins)} administrator account(s) found, "
                f"{len(dormant)} with no recorded login."
            ),
            remediation=(
                "Remove or downgrade administrator accounts that have never "
                "logged in, or deactivate them if no longer needed."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "dormant_admin_count": len(dormant),
            },
        )]

    async def _check_two_factor_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/account.json")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "teamwork.account.two_factor_enforcement",
                "Two-factor authentication enforced account-wide",
                "mfa_enforcement",
                "Grant the API key access to /account.json.",
            )]
        resp.raise_for_status()
        account = resp.json().get("account", {})
        if "twoFactorAuthRequired" not in account:
            return [self._unavailable(
                "teamwork.account.two_factor_enforcement",
                "Two-factor authentication enforced account-wide",
                "mfa_enforcement",
                "Enable two-factor authentication reporting for this site "
                "under Site Administration > Security.",
            )]
        enforced = bool(account.get("twoFactorAuthRequired"))
        return [IntegrationFinding(
            check_id="teamwork.account.two_factor_enforcement",
            title="Two-factor authentication is enforced account-wide",
            description=(
                "Account settings report two-factor authentication as "
                + ("required." if enforced else "not required.")
            ),
            remediation=(
                "Require two-factor authentication for all users under Site "
                "Administration > Security."
            ),
            status="PASSED" if enforced else "FAILED",
            severity="HIGH" if not enforced else "INFO",
            check_category="mfa_enforcement",
            result_details={"two_factor_required": enforced},
        )]

    async def _check_public_projects(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/projects.json", status="active")
        if resp.status_code == 403:
            return [self._unavailable(
                "teamwork.projects.site_wide_visibility",
                "Projects visible to every site user",
                "access_control",
                "Grant the API key read access to /projects.json.",
            )]
        resp.raise_for_status()
        projects = resp.json().get("projects", [])
        open_to_all = [
            p for p in projects
            if str(p.get("privacy", p.get("announcement", ""))).lower() in ("everyone", "account", "all")
        ]
        passed = len(open_to_all) == 0
        return [IntegrationFinding(
            check_id="teamwork.projects.site_wide_visibility",
            title="No project is opened up to every site user",
            description=(
                f"{len(open_to_all)} of {len(projects)} active project(s) "
                "are visible to every user on the site rather than being "
                "restricted to their assigned team."
            ),
            remediation=(
                "Restrict project membership to the people who need access "
                "instead of exposing project content site-wide, especially "
                "for projects carrying client or financial data."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if open_to_all else "INFO",
            check_category="access_control",
            result_details={
                "project_count": len(projects),
                "site_wide_visible_count": len(open_to_all),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Teamwork with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
