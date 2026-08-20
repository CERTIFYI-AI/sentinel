# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Basecamp integration adapter.

Reads access-review and data-location evidence from the Basecamp 4 API:
admin account hygiene, single-sign-on enforcement posture, and projects
that expose data to external clients.

Auth: OAuth2 client_id + client_credential (37signals ID) plus the
numeric Basecamp account_id.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_TOKEN_URL = "https://launchpad.37signals.com/authorization/token"


@dataclass
class BasecampCredentials:
    """Matches dashboard/src/integrations/basecamp/config.ts credentialFields."""

    client_id: str
    client_credential: str
    account_id: str

    def base_url(self) -> str:
        return f"https://3.basecampapi.com/{self.account_id}"


class BasecampAdapter:
    """Fetches access-review and data-location posture from Basecamp."""

    def __init__(self, credentials: BasecampCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via the client-credentials grant."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _TOKEN_URL,
            data={
                "type": "refresh",
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Basecamp rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "User-Agent": "Sentinel Compliance (compliance@certifyi.ai)",
            },
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/my/profile.json")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Basecamp rejected the request. Verify the account ID "
                    "and that the OAuth application has access to it."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Basecamp: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_sso_enforcement(client),
                self._check_client_visible_projects(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("basecamp check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/people.json")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "basecamp.people.admin_hygiene",
                "Admin account hygiene",
                "least_privilege",
                "Grant the OAuth application read access to People.",
            )]
        resp.raise_for_status()
        people = resp.json()
        admins = [p for p in people if p.get("admin")]
        total = len(people)
        excessive = total > 0 and (len(admins) / total) > 0.3
        return [IntegrationFinding(
            check_id="basecamp.people.admin_hygiene",
            title="Admin count is proportionate to account size",
            description=f"{len(admins)} of {total} person/people hold the admin role.",
            remediation="Review the admin roster and reduce standing admin access to those who need it.",
            status="PASSED" if not excessive else "WARNING",
            severity="MEDIUM" if excessive else "INFO",
            check_category="least_privilege",
            result_details={"person_count": total, "admin_count": len(admins)},
        )]

    async def _check_sso_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/my/profile.json")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "basecamp.account.sso_enforcement",
                "Single sign-on enforced account-wide",
                "mfa_enforcement",
                "Grant the OAuth application access to the account profile.",
            )]
        resp.raise_for_status()
        profile = resp.json()
        # Basecamp/37signals ID does not expose an org-wide SSO-enforcement
        # flag through the public API; only report a result if present.
        if "sso_required" not in profile:
            return [self._unavailable(
                "basecamp.account.sso_enforcement",
                "Single sign-on enforced account-wide",
                "mfa_enforcement",
                "Basecamp does not expose SSO/2FA enforcement via the "
                "public API; verify manually in 37signals ID account "
                "settings.",
            )]
        enforced = bool(profile.get("sso_required"))
        return [IntegrationFinding(
            check_id="basecamp.account.sso_enforcement",
            title="Single sign-on is enforced account-wide",
            description=f"Account reports SSO as {'required' if enforced else 'not required'}.",
            remediation="Require SSO for all 37signals ID accounts tied to this Basecamp account.",
            status="PASSED" if enforced else "FAILED",
            severity="HIGH" if not enforced else "INFO",
            check_category="mfa_enforcement",
            result_details={"sso_required": enforced},
        )]

    async def _check_client_visible_projects(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/projects.json")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "basecamp.projects.client_visibility",
                "Projects exposing data to external clients",
                "data_classification",
                "Grant the OAuth application read access to Projects.",
            )]
        resp.raise_for_status()
        projects = resp.json()
        client_visible = [
            p for p in projects
            if any(tool.get("name") == "client_correspondences" for tool in p.get("dock", []))
        ]
        passed = len(client_visible) == 0
        return [IntegrationFinding(
            check_id="basecamp.projects.client_visibility",
            title="No projects unexpectedly expose data to external clients",
            description=f"{len(client_visible)} of {len(projects)} project(s) have client-side access enabled.",
            remediation="Confirm client-visible projects are intentional and scoped to non-sensitive content only.",
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if client_visible else "INFO",
            check_category="data_classification",
            result_details={
                "project_count": len(projects),
                "client_visible_count": len(client_visible),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Basecamp with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
