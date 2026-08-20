# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Vercel integration adapter.

Reads deployment platform security posture from the Vercel REST API:
personal access token staleness, projects with no deployment protection
in front of them, and environment variables holding sensitive-looking
values in plaintext instead of Vercel's encrypted storage.

Auth: a single api_key (Vercel Access Token, Bearer).
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
import re
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.vercel.com"

#: A token unused for longer than this is a finding.
_TOKEN_MAX_AGE_DAYS = 180

#: Env var name shapes that usually hold something sensitive.
_SENSITIVE_NAME = re.compile(r"(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)", re.IGNORECASE)


@dataclass
class VercelCredentials:
    """Matches dashboard/src/integrations/vercel/config.ts credentialFields."""

    api_key: str


class VercelAdapter:
    """Fetches deployment platform security posture from Vercel."""

    def __init__(self, credentials: VercelCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/v2/user")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Vercel rejected the access token. Verify the token is "
                    "active and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Vercel: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_tokens(client),
                self._check_unprotected_deployments(client),
                self._check_env_var_encryption(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("vercel check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_stale_tokens(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v5/user/tokens")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "vercel.iam.stale_tokens",
                "Access tokens reviewed for staleness",
                "access_control",
                "Grant this token permission to list account access tokens.",
            )]
        resp.raise_for_status()
        data = resp.json()
        tokens = data.get("tokens", [])
        cutoff_ms = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=_TOKEN_MAX_AGE_DAYS)).timestamp() * 1000
        stale: list[str] = []
        for token in tokens:
            name = token.get("name", token.get("id", "unknown"))
            activity = token.get("activeAt") or token.get("createdAt") or 0
            if activity < cutoff_ms:
                stale.append(name)
        status = "PASSED" if not stale else "WARNING"
        return [IntegrationFinding(
            check_id="vercel.iam.stale_tokens",
            title=(f"{len(stale)} of {len(tokens)} access tokens are stale"
                   if stale else
                   f"All {len(tokens)} access tokens were used within {_TOKEN_MAX_AGE_DAYS} days"
                   if tokens else "No access tokens on this account"),
            description=("Inactive tokens: " + ", ".join(stale[:20]) if stale else
                         "Every personal access token shows activity inside the "
                         "rotation window."),
            remediation=(
                "Account Settings → Tokens → revoke tokens that are no "
                "longer used, and scope new tokens to a single team/project "
                "where possible."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={
                "token_count": len(tokens),
                "stale_tokens": stale,
                "max_age_days": _TOKEN_MAX_AGE_DAYS,
            },
        )]

    async def _check_unprotected_deployments(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v9/projects", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "vercel.projects.unprotected_deployments",
                "Projects have deployment protection configured",
                "network_security",
                "Grant this token read access to projects.",
            )]
        resp.raise_for_status()
        projects = resp.json().get("projects", [])
        unprotected: list[str] = []
        for project in projects:
            sso = project.get("ssoProtection")
            pw = project.get("passwordProtection")
            if not sso and not pw:
                unprotected.append(project.get("name", project.get("id", "")))
        status = "PASSED" if not unprotected else "WARNING"
        return [IntegrationFinding(
            check_id="vercel.projects.unprotected_deployments",
            title=(f"{len(unprotected)} of {len(projects)} projects have no deployment protection"
                   if unprotected else
                   f"All {len(projects)} projects have deployment protection"
                   if projects else "No projects found"),
            description=("Without SSO or password protection on preview/prod "
                         "deployments: " + ", ".join(unprotected[:20]) if unprotected else
                         "Every project restricts access to its deployments via "
                         "Vercel Authentication or a deployment password."),
            remediation=(
                "Project → Settings → Deployment Protection → enable Vercel "
                "Authentication (SSO) or a password, at least for "
                "preview/staging deployments."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="network_security",
            result_details={
                "project_count": len(projects),
                "unprotected_projects": unprotected,
            },
        )]

    async def _check_env_var_encryption(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        projects_resp = await self._get(client, "/v9/projects", limit=100)
        if projects_resp.status_code in (403, 404):
            return [self._unavailable(
                "vercel.projects.env_var_encryption",
                "Sensitive environment variables are stored encrypted",
                "encryption_at_rest",
                "Grant this token read access to projects and their "
                "environment variables.",
            )]
        projects_resp.raise_for_status()
        projects = projects_resp.json().get("projects", [])

        plaintext_sensitive: list[str] = []
        checked_vars = 0
        unreadable = 0
        for project in projects:
            project_id = project.get("id", "")
            env_resp = await self._get(client, f"/v9/projects/{project_id}/env")
            if env_resp.status_code in (403, 404):
                unreadable += 1
                continue
            env_resp.raise_for_status()
            for var in env_resp.json().get("envs", []):
                checked_vars += 1
                key = var.get("key", "")
                if var.get("type") == "plain" and _SENSITIVE_NAME.search(key):
                    plaintext_sensitive.append(f"{project.get('name', project_id)}:{key}")

        if projects and unreadable == len(projects):
            status: str = "NOT_AVAILABLE"
        else:
            status = "PASSED" if not plaintext_sensitive else "FAILED"
        return [IntegrationFinding(
            check_id="vercel.projects.env_var_encryption",
            title={
                "NOT_AVAILABLE": "Environment variables not readable by this token",
                "PASSED": f"No plaintext sensitive-looking env vars across {len(projects)} projects",
                "FAILED": f"{len(plaintext_sensitive)} sensitive-looking env vars stored as plaintext",
            }[status],
            description=(
                "This token cannot read project environment variables."
                if status == "NOT_AVAILABLE" else
                ("Stored as plain text: " + ", ".join(plaintext_sensitive[:20])
                 if plaintext_sensitive else
                 f"Checked {checked_vars} environment variable(s); none matching "
                 "a KEY/SECRET/TOKEN/PASSWORD name are stored as plain type.")
            ),
            remediation=(
                "Project → Settings → Environment Variables → change the "
                "variable's type from Plain Text to Encrypted (Sensitive) so "
                "the value is never exposed after save."
            ),
            status=status,  # type: ignore[arg-type]
            severity="INFO" if status == "PASSED" else ("LOW" if status == "NOT_AVAILABLE" else "HIGH"),
            check_category="encryption_at_rest",
            result_details={
                "project_count": len(projects),
                "env_vars_checked": checked_vars,
                "plaintext_sensitive_vars": plaintext_sensitive,
                "unreadable_projects": unreadable,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Vercel with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
