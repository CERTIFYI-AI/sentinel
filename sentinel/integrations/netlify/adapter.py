# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Netlify integration adapter.

Reads deployment platform security posture from the Netlify API: Owner-role
concentration across team members, sites that do not force HTTPS, and
sensitive-looking environment variables that are not marked as protected
("secret") values.

Auth: a single api_key (Netlify Personal Access Token, Bearer).
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.netlify.com/api/v1"

#: Env var name shapes that usually hold something sensitive.
_SENSITIVE_NAME = re.compile(r"(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)", re.IGNORECASE)


@dataclass
class NetlifyCredentials:
    """Matches dashboard/src/integrations/netlify/config.ts credentialFields."""

    api_key: str


class NetlifyAdapter:
    """Fetches deployment platform security posture from Netlify."""

    def __init__(self, credentials: NetlifyCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/user")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Netlify rejected the personal access token. Verify "
                    "the token is active and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Netlify: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_owner_role_concentration(client),
                self._check_force_ssl(client),
                self._check_unmarked_secret_env_vars(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("netlify check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_owner_role_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        accounts_resp = await self._get(client, "/accounts")
        if accounts_resp.status_code in (403, 404):
            return [self._unavailable(
                "netlify.iam.owner_role_concentration",
                "Team Owner role is not over-assigned",
                "least_privilege",
                "Grant this token read access to team accounts and members.",
            )]
        accounts_resp.raise_for_status()
        accounts = accounts_resp.json()

        owners: list[str] = []
        total_members = 0
        unreadable = 0
        for account in accounts:
            slug = account.get("slug", "")
            members_resp = await self._get(client, f"/{slug}/members")
            if members_resp.status_code in (403, 404):
                unreadable += 1
                continue
            members_resp.raise_for_status()
            for member in members_resp.json():
                total_members += 1
                if member.get("role", "").lower() == "owner":
                    owners.append(f"{slug}:{member.get('email', member.get('id', ''))}")

        if accounts and unreadable == len(accounts):
            status: str = "NOT_AVAILABLE"
        else:
            ratio = (len(owners) / total_members) if total_members else 0.0
            status = "PASSED" if len(owners) <= 2 or ratio <= 0.15 else (
                "WARNING" if ratio <= 0.34 else "FAILED")
        return [IntegrationFinding(
            check_id="netlify.iam.owner_role_concentration",
            title={
                "NOT_AVAILABLE": "Team membership not readable by this token",
            }.get(status, f"{len(owners)} of {total_members} team members hold the Owner role"),
            description=(
                "This token cannot read team membership."
                if status == "NOT_AVAILABLE" else
                ("Owners: " + ", ".join(owners[:20]) if owners else
                 "No team member holds the Owner role beyond the account default.")
            ),
            remediation=(
                "Team settings → Members → downgrade members who do not need "
                "billing/team-management control from Owner to Collaborator."
            ),
            status=status,  # type: ignore[arg-type]
            severity="INFO" if status in ("PASSED", "NOT_AVAILABLE") else (
                "MEDIUM" if status == "WARNING" else "HIGH"),
            check_category="least_privilege",
            result_details={
                "owner_count": len(owners),
                "member_count": total_members,
                "owners": owners,
                "unreadable_accounts": unreadable,
            },
        )]

    async def _check_force_ssl(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/sites", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "netlify.sites.force_ssl_disabled",
                "Sites enforce HTTPS",
                "network_security",
                "Grant this token read access to sites.",
            )]
        resp.raise_for_status()
        sites = resp.json()
        without_ssl = [
            s.get("name", s.get("id", "")) for s in sites if not s.get("force_ssl")
        ]
        status = "PASSED" if not without_ssl else "FAILED"
        return [IntegrationFinding(
            check_id="netlify.sites.force_ssl_disabled",
            title=(f"{len(without_ssl)} of {len(sites)} sites do not force HTTPS"
                   if without_ssl else
                   f"All {len(sites)} sites force HTTPS" if sites else "No sites found"),
            description=("HTTPS not enforced on: " + ", ".join(without_ssl[:20])
                         if without_ssl else
                         "Every site redirects plain HTTP traffic to HTTPS."),
            remediation=(
                "Site settings → Domain management → HTTPS → enable "
                "'Force HTTPS' so requests to the site can never fall back "
                "to an unencrypted connection."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="network_security",
            result_details={
                "site_count": len(sites),
                "sites_without_force_ssl": without_ssl,
            },
        )]

    async def _check_unmarked_secret_env_vars(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        accounts_resp = await self._get(client, "/accounts")
        if accounts_resp.status_code in (403, 404):
            return [self._unavailable(
                "netlify.env.unmarked_secret_variables",
                "Sensitive environment variables are marked secret",
                "encryption_at_rest",
                "Grant this token read access to team accounts and their "
                "environment variables.",
            )]
        accounts_resp.raise_for_status()
        accounts = accounts_resp.json()

        unmarked: list[str] = []
        checked = 0
        unreadable = 0
        for account in accounts:
            slug = account.get("slug", "")
            env_resp = await self._get(client, f"/accounts/{slug}/env")
            if env_resp.status_code in (403, 404):
                unreadable += 1
                continue
            env_resp.raise_for_status()
            for var in env_resp.json():
                checked += 1
                key = var.get("key", "")
                if not var.get("is_secret") and _SENSITIVE_NAME.search(key):
                    unmarked.append(f"{slug}:{key}")

        if accounts and unreadable == len(accounts):
            status: str = "NOT_AVAILABLE"
        else:
            status = "PASSED" if not unmarked else "FAILED"
        return [IntegrationFinding(
            check_id="netlify.env.unmarked_secret_variables",
            title={
                "NOT_AVAILABLE": "Environment variables not readable by this token",
                "PASSED": f"No unmarked sensitive-looking env vars across {checked} checked",
                "FAILED": f"{len(unmarked)} sensitive-looking env vars are not marked secret",
            }[status],
            description=(
                "This token cannot read team environment variables."
                if status == "NOT_AVAILABLE" else
                ("Not marked secret: " + ", ".join(unmarked[:20]) if unmarked else
                 f"Checked {checked} environment variable(s); none matching a "
                 "KEY/SECRET/TOKEN/PASSWORD name are stored unmarked.")
            ),
            remediation=(
                "Site/Team → Environment variables → mark sensitive values "
                "as 'Contains secret values' so they are redacted from "
                "build logs and the UI."
            ),
            status=status,  # type: ignore[arg-type]
            severity="INFO" if status == "PASSED" else ("LOW" if status == "NOT_AVAILABLE" else "HIGH"),
            check_category="encryption_at_rest",
            result_details={
                "env_vars_checked": checked,
                "unmarked_sensitive_vars": unmarked,
                "unreadable_accounts": unreadable,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Netlify with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
