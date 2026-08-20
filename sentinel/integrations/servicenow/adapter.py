# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""ServiceNow integration adapter.

Reads access-review and data-location evidence from the ServiceNow Table
API: privileged (admin role) account hygiene, change-request approval
trail, and publicly visible knowledge-base articles.

Auth: OAuth2 client_id + client_credential (client-credentials grant)
against a tenant-specific instance URL.
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
class ServicenowCredentials:
    """Matches dashboard/src/integrations/servicenow/config.ts credentialFields."""

    instance_url: str
    client_id: str
    client_credential: str

    def base_url(self) -> str:
        return self.instance_url.rstrip("/")

    def token_url(self) -> str:
        return f"{self.base_url()}/oauth_token.do"

    def table_url(self, table: str) -> str:
        return f"{self.base_url()}/api/now/table/{table}"


class ServicenowAdapter:
    """Fetches access-review and change-management posture from ServiceNow."""

    def __init__(self, credentials: ServicenowCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            self.credentials.token_url(),
            data={
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
                "ServiceNow rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "credential and that the OAuth application is active."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get_table(self, client: httpx.AsyncClient, table: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            self.credentials.table_url(table),
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get_table(client, "sys_user", sysparm_limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "ServiceNow rejected the Table API request. Verify the "
                    "OAuth application has read access to sys_user."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach ServiceNow: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_role_hygiene(client),
                self._check_change_approval_trail(client),
                self._check_public_knowledge_articles(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("servicenow check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_role_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get_table(
            client, "sys_user_has_role",
            sysparm_query="role.name=admin",
            sysparm_fields="user.sys_id,user.active,user.name",
            sysparm_limit=200,
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "servicenow.users.admin_role_hygiene",
                "Admin role account hygiene",
                "least_privilege",
                "Grant the OAuth application read access to sys_user_has_role.",
            )]
        resp.raise_for_status()
        rows = resp.json().get("result", [])
        inactive_admins = [
            r for r in rows
            if str(r.get("user.active", "true")).lower() == "false"
        ]
        passed = len(inactive_admins) == 0
        return [IntegrationFinding(
            check_id="servicenow.users.admin_role_hygiene",
            title="No inactive accounts hold the admin role",
            description=(
                f"{len(rows)} admin role grant(s) found, "
                f"{len(inactive_admins)} assigned to inactive accounts."
            ),
            remediation=(
                "Revoke the admin role from inactive/deactivated accounts as "
                "part of regular access reviews."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if inactive_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_grant_count": len(rows),
                "inactive_admin_count": len(inactive_admins),
            },
        )]

    async def _check_change_approval_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get_table(
            client, "change_request",
            sysparm_query="active=true^state!=0",
            sysparm_fields="sys_id,number,approval,state",
            sysparm_limit=100,
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "servicenow.change.approval_trail",
                "Change requests carry an approval trail",
                "change_management",
                "Grant the OAuth application read access to change_request.",
            )]
        resp.raise_for_status()
        rows = resp.json().get("result", [])
        unapproved = [
            r for r in rows
            if str(r.get("approval", "")).lower() not in ("approved", "not requested")
        ]
        passed = len(unapproved) == 0
        return [IntegrationFinding(
            check_id="servicenow.change.approval_trail",
            title="Active changes carry an approval trail",
            description=(
                f"{len(rows)} active change request(s) reviewed, "
                f"{len(unapproved)} without a recorded approval."
            ),
            remediation=(
                "Route active changes through the CAB approval workflow "
                "before implementation, or record an approval exception."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if unapproved else "INFO",
            check_category="change_management",
            result_details={
                "active_change_count": len(rows),
                "unapproved_count": len(unapproved),
            },
        )]

    async def _check_public_knowledge_articles(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get_table(
            client, "kb_knowledge",
            sysparm_query="workflow_state=published^kb_knowledge_base.kb_managers.isEMPTY()",
            sysparm_fields="sys_id,short_description",
            sysparm_limit=100,
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "servicenow.kb.public_articles",
                "Publicly visible knowledge articles",
                "data_classification",
                "Grant the OAuth application read access to kb_knowledge.",
            )]
        resp.raise_for_status()
        rows = resp.json().get("result", [])
        passed = len(rows) == 0
        return [IntegrationFinding(
            check_id="servicenow.kb.public_articles",
            title="No published knowledge articles are unrestricted",
            description=(
                f"{len(rows)} published knowledge article(s) found in a "
                "knowledge base with no restricting managers group."
            ),
            remediation=(
                "Assign a managers/reader group to knowledge bases that "
                "should not be publicly readable, or archive stale articles."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if rows else "INFO",
            check_category="data_classification",
            result_details={"unrestricted_article_count": len(rows)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from ServiceNow with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
