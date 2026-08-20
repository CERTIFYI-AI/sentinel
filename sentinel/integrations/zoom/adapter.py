# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Zoom integration adapter.

Reads access-review and data-location evidence from the Zoom API: role
membership (privileged Admin/Owner roles), account-level two-factor
authentication enforcement, and public sharing of cloud recordings.

Auth: Zoom Server-to-Server OAuth (account_id, client_id, client_credential).
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
_AUTH_URL = "https://zoom.us/oauth/token"
_BASE = "https://api.zoom.us/v2"

_PRIVILEGED_ROLE_NAMES = {"owner", "admin"}


@dataclass
class ZoomCredentials:
    """Matches dashboard/src/integrations/zoom/config.ts credentialFields."""

    account_id: str
    client_id: str
    client_credential: str


class ZoomAdapter:
    """Fetches access-review and data-location evidence from Zoom."""

    def __init__(self, credentials: ZoomCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain a Server-to-Server OAuth access token."""
        if self._access_token:
            return self._access_token
        basic = base64.b64encode(
            f"{self.credentials.client_id}:{self.credentials.client_credential}".encode()
        ).decode()
        resp = await client.post(
            _AUTH_URL,
            headers={"Authorization": f"Basic {basic}"},
            params={
                "grant_type": "account_credentials",
                "account_id": self.credentials.account_id,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Zoom rejected the Server-to-Server OAuth credentials "
                f"(HTTP {resp.status_code}). Verify the account ID, client "
                "ID, and client credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_BASE}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/users", page_size=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Zoom rejected the access token when listing users. "
                    "Verify the Server-to-Server app has user:read:admin scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Zoom: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_privileged_roles(client),
                self._check_two_factor_auth(client),
                self._check_recording_public_sharing(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("zoom check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_privileged_roles(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        roles_resp = await self._get(client, "/roles")
        if roles_resp.status_code in (401, 403):
            return [self._unavailable(
                "zoom.roles.privileged_count",
                "Privileged role membership",
                "least_privilege",
                "Grant the Server-to-Server app role:read:admin scope.",
            )]
        roles_resp.raise_for_status()
        roles = roles_resp.json().get("roles", [])
        if not roles:
            return [self._unavailable(
                "zoom.roles.privileged_count",
                "Privileged role membership",
                "least_privilege",
                "Grant the Server-to-Server app role:read:admin scope.",
            )]
        privileged_roles = [r for r in roles if r.get("name", "").strip().lower() in _PRIVILEGED_ROLE_NAMES]

        privileged_total = 0
        for role in privileged_roles:
            members_resp = await self._get(client, f"/roles/{role['id']}/members", page_size=1)
            if members_resp.status_code in (401, 403, 404):
                continue
            members_resp.raise_for_status()
            privileged_total += members_resp.json().get("total_records", 0)

        users_resp = await self._get(client, "/users", page_size=1, status="active")
        users_resp.raise_for_status()
        total_users = users_resp.json().get("total_records", 0)

        ratio = (privileged_total / total_users) if total_users else 0.0
        passed = total_users > 0 and ratio <= 0.2
        return [IntegrationFinding(
            check_id="zoom.roles.privileged_count",
            title="Privileged (Owner/Admin) role membership reviewed",
            description=(
                f"{privileged_total} of {total_users} active user(s) hold an "
                f"Owner or Admin role ({ratio:.0%})."
            ),
            remediation=(
                "Review Owner and Admin role assignments and remove standing "
                "privileged access that is not actively required."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="least_privilege",
            result_details={
                "privileged_user_count": privileged_total,
                "total_active_users": total_users,
            },
        )]

    async def _check_two_factor_auth(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, f"/accounts/{self.credentials.account_id}/settings", option="security"
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "zoom.security.two_factor_auth",
                "Account two-factor authentication enforcement",
                "mfa_enforcement",
                "Grant the Server-to-Server app account:read:admin scope.",
            )]
        resp.raise_for_status()
        security = resp.json().get("security", {})
        two_factor = security.get("sign_in_with_two_factor_auth", {})
        enabled = bool(two_factor.get("enable", False))
        return [IntegrationFinding(
            check_id="zoom.security.two_factor_auth",
            title="Account-wide two-factor authentication is enforced",
            description=(
                "Two-factor authentication is "
                + ("enforced" if enabled else "not enforced")
                + " for sign-in at the account level."
            ),
            remediation=(
                "Enable 'Sign in with Two-Factor Authentication' under "
                "Account Settings > Security in the Zoom admin portal."
            ),
            status="PASSED" if enabled else "FAILED",
            severity="INFO" if enabled else "HIGH",
            check_category="mfa_enforcement",
            result_details={"two_factor_auth_enabled": enabled},
        )]

    async def _check_recording_public_sharing(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, f"/accounts/{self.credentials.account_id}/settings", option="recording"
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "zoom.recordings.public_sharing",
                "Cloud recording public sharing",
                "data_classification",
                "Grant the Server-to-Server app account:read:admin scope.",
            )]
        resp.raise_for_status()
        share = resp.json().get("share_recording", {})
        share_option = share.get("share_recording", "")
        publicly_shared = share_option == "publicly"
        return [IntegrationFinding(
            check_id="zoom.recordings.public_sharing",
            title="Cloud recordings are not shared publicly by default",
            description=(
                f"Default cloud recording sharing is set to '{share_option or 'unknown'}'."
            ),
            remediation=(
                "Set the default cloud recording sharing option to "
                "'Only authenticated users can view' or 'Internally' rather "
                "than 'Publicly'."
            ),
            status="FAILED" if publicly_shared else "PASSED",
            severity="HIGH" if publicly_shared else "INFO",
            check_category="data_classification",
            result_details={"share_recording_option": share_option},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Zoom with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
