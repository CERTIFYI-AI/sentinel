# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Bitwarden integration adapter.

Reads organization vault security posture from the Bitwarden Public
API: member access hygiene (privileged role concentration), collection
sharing scope, and two-factor-authentication enforcement across the
organization.

Auth: OAuth2 client-credentials against Bitwarden's identity service,
using an organization API key (client_id + client_credential).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_TOKEN_URL = "https://identity.bitwarden.com/connect/token"
_API_BASE = "https://api.bitwarden.com/public"

#: Privileged Bitwarden organization member roles (Type 0 = Owner, 1 = Admin).
_PRIVILEGED_ROLE_TYPES = {0, 1}


@dataclass
class BitwardenCredentials:
    """Matches dashboard/src/integrations/bitwarden/config.ts credentialFields."""

    client_id: str
    client_credential: str


class BitwardenAdapter:
    """Fetches organization vault security posture from Bitwarden."""

    def __init__(self, credentials: BitwardenCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via client-credentials grant."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
                "scope": "api.organization",
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (400, 401, 403):
            raise ValueError(
                "Bitwarden rejected the OAuth2 client credentials. Verify "
                "the organization API key's client ID and credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{_API_BASE}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/members")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Bitwarden rejected the request for organization members. "
                    "Verify the API key has organization admin access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Bitwarden: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_member_access_hygiene(client),
                self._check_collection_sharing_scope(client),
                self._check_2fa_enforcement(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("bitwarden check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_member_access_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/members")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "bitwarden.members.access_hygiene",
                "Organization member access hygiene",
                "access_control",
                "Grant the organization API key admin access to list members.",
            )]
        resp.raise_for_status()
        members = resp.json().get("data", [])
        active = [m for m in members if m.get("status", 2) != -1]
        privileged = [m for m in active if m.get("type") in _PRIVILEGED_ROLE_TYPES]
        total = len(active)
        broad_ratio = total > 0 and (len(privileged) / total) > 0.5
        return [IntegrationFinding(
            check_id="bitwarden.members.access_hygiene",
            title="Owner/Admin roles are not over-assigned",
            description=(
                f"{len(privileged)} of {total} active member(s) hold the "
                "Owner or Admin role."
            ),
            remediation=(
                "Limit Owner and Admin roles to a small set of trusted "
                "administrators. Use the Manager or User role with "
                "collection-level access for everyone else."
            ),
            status="PASSED" if not broad_ratio else "WARNING",
            severity="MEDIUM" if broad_ratio else "INFO",
            check_category="access_control",
            result_details={
                "active_member_count": total,
                "privileged_member_count": len(privileged),
            },
        )]

    async def _check_collection_sharing_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/collections")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "bitwarden.collections.sharing_scope",
                "Collection sharing scope",
                "data_classification",
                "Grant the organization API key admin access to list "
                "collections.",
            )]
        resp.raise_for_status()
        collections = resp.json().get("data", [])
        unrestricted = [c for c in collections if not (c.get("groups") or [])]
        passed = len(collections) == 0 or len(unrestricted) == 0
        return [IntegrationFinding(
            check_id="bitwarden.collections.sharing_scope",
            title="Collections are scoped to specific groups",
            description=(
                f"{len(unrestricted)} of {len(collections)} collection(s) have "
                "no group assigned, meaning access depends solely on "
                "individual item shares rather than a reviewable group scope."
            ),
            remediation=(
                "Assign every collection to one or more groups with explicit "
                "read/write permissions instead of relying on ad-hoc "
                "individual sharing, so access can be reviewed and revoked "
                "at the group level."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if unrestricted else "INFO",
            check_category="data_classification",
            result_details={
                "collection_count": len(collections),
                "unrestricted_collection_count": len(unrestricted),
            },
        )]

    async def _check_2fa_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/members")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "bitwarden.members.two_factor_enforcement",
                "Two-factor authentication enforcement",
                "mfa_enforcement",
                "Grant the organization API key admin access to list members.",
            )]
        resp.raise_for_status()
        members = resp.json().get("data", [])
        active = [m for m in members if m.get("status", 2) != -1]
        without_2fa = [m for m in active if not m.get("twoFactorEnabled", False)]
        passed = len(active) > 0 and len(without_2fa) == 0
        return [IntegrationFinding(
            check_id="bitwarden.members.two_factor_enforcement",
            title="All active members have two-factor authentication enabled",
            description=(
                f"{len(without_2fa)} of {len(active)} active member(s) do not "
                "have two-factor authentication enabled."
            ),
            remediation=(
                "Enable the organization policy that requires two-factor "
                "authentication for all members, and follow up with members "
                "currently missing it before they are removed by the policy."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if without_2fa else "INFO",
            check_category="mfa_enforcement",
            result_details={
                "active_member_count": len(active),
                "members_without_two_factor": len(without_2fa),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Bitwarden with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
