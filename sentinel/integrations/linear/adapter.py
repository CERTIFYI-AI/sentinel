# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Linear integration adapter.

Reads access-review and data-location evidence from the Linear GraphQL
API: dormant admin account hygiene, SAML/SSO enforcement, and guest
(external workspace member) access.

Auth: a single api_key (Linear API key, Bearer).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_GRAPHQL_URL = "https://api.linear.app/graphql"


@dataclass
class LinearCredentials:
    """Matches dashboard/src/integrations/linear/config.ts credentialFields."""

    api_key: str


class LinearAdapter:
    """Fetches access-review and data-location posture from Linear."""

    def __init__(self, credentials: LinearCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": self.credentials.api_key,
            "Content-Type": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _query(self, client: httpx.AsyncClient, query: str, variables: dict | None = None) -> dict:
        resp = await client.post(
            _GRAPHQL_URL,
            headers=self._headers(),
            json={"query": query, "variables": variables or {}},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            return {"errors": [{"message": f"HTTP {resp.status_code}"}]}
        resp.raise_for_status()
        return resp.json()

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            result = await self._query(client, "{ viewer { id } }")
            if "errors" in result:
                raise ValueError(
                    "Linear rejected the API key. Verify the key is active "
                    "and has not been revoked."
                )
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Linear: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_saml_enforcement(client),
                self._check_guest_access(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("linear check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = """
        query {
            users(filter: { admin: { eq: true } }) {
                nodes { id name active }
            }
        }
        """
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "linear.users.admin_hygiene",
                "Admin account hygiene",
                "least_privilege",
                "The API key cannot list organization admins. Verify it has "
                "admin-level access.",
            )]
        admins = result.get("data", {}).get("users", {}).get("nodes", [])
        inactive_admins = [a for a in admins if a.get("active") is False]
        passed = len(inactive_admins) == 0
        return [IntegrationFinding(
            check_id="linear.users.admin_hygiene",
            title="No deactivated accounts retain the admin role",
            description=(
                f"{len(admins)} admin account(s) found, "
                f"{len(inactive_admins)} deactivated but still admin."
            ),
            remediation=(
                "Remove admin privileges from deactivated Linear accounts "
                "during offboarding."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if inactive_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "inactive_admin_count": len(inactive_admins),
            },
        )]

    async def _check_saml_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = "{ organization { samlEnabled } }"
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "linear.organization.saml_enforcement",
                "SAML SSO enforced for the workspace",
                "mfa_enforcement",
                "The API key cannot read organization settings. Verify it "
                "has workspace admin access.",
            )]
        org = result.get("data", {}).get("organization")
        if org is None or "samlEnabled" not in org:
            return [self._unavailable(
                "linear.organization.saml_enforcement",
                "SAML SSO enforced for the workspace",
                "mfa_enforcement",
                "SAML SSO requires a Linear Enterprise plan; upgrade or "
                "confirm the setting is exposed to this API key.",
            )]
        enabled = bool(org.get("samlEnabled"))
        return [IntegrationFinding(
            check_id="linear.organization.saml_enforcement",
            title="SAML SSO is enforced for the workspace",
            description=f"Organization reports SAML SSO as {'enabled' if enabled else 'disabled'}.",
            remediation="Enable and enforce SAML SSO for all workspace members under Workspace Settings > Security.",
            status="PASSED" if enabled else "FAILED",
            severity="HIGH" if not enabled else "INFO",
            check_category="mfa_enforcement",
            result_details={"saml_enabled": enabled},
        )]

    async def _check_guest_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = """
        query {
            users(filter: { guest: { eq: true } }) {
                nodes { id name active }
            }
        }
        """
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "linear.users.guest_access",
                "External guest access to the workspace",
                "access_control",
                "The API key cannot list guest members. Verify it has "
                "admin-level access.",
            )]
        guests = result.get("data", {}).get("users", {}).get("nodes", [])
        active_guests = [g for g in guests if g.get("active")]
        passed = len(active_guests) == 0
        return [IntegrationFinding(
            check_id="linear.users.guest_access",
            title="No active external guests on the workspace",
            description=f"{len(active_guests)} active guest account(s) found.",
            remediation="Remove guest access once external collaboration on shared teams ends.",
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if active_guests else "INFO",
            check_category="access_control",
            result_details={"active_guest_count": len(active_guests)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Linear with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
