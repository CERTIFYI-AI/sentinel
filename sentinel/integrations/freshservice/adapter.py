# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Freshservice integration adapter.

Reads access-review and data-location evidence from the Freshservice REST
API: dormant admin-role agents, retrievability of the account's audit-log
trail, and agents granted global (all-departments) ticket visibility instead
of scoped access.

Auth: helpdesk domain + api_key, sent as HTTP Basic with the API key as the
username and the literal string "X" as the password (Freshservice's
API-key auth scheme).
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
class FreshserviceCredentials:
    """Matches dashboard/src/integrations/freshservice/config.ts credentialFields."""

    domain: str
    api_key: str

    def base_url(self) -> str:
        return f"https://{self.domain}/api/v2"


class FreshserviceAdapter:
    """Fetches access-review and data-exposure posture from Freshservice."""

    def __init__(self, credentials: FreshserviceCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/agents/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Freshservice rejected the API key. Verify the key and "
                    "the helpdesk domain."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Freshservice: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admin_agents(client),
                self._check_audit_log_retrievable(client),
                self._check_global_ticket_scope(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("freshservice check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admin_agents(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        roles_resp = await self._get(client, "/roles")
        agents_resp = await self._get(client, "/agents", per_page=100)
        if roles_resp.status_code == 403 or agents_resp.status_code == 403:
            return [self._unavailable(
                "freshservice.agents.dormant_admins",
                "Dormant administrator agents",
                "least_privilege",
                "Grant the API key read access to /roles and /agents.",
            )]
        roles_resp.raise_for_status()
        agents_resp.raise_for_status()
        roles = roles_resp.json().get("roles", [])
        admin_role_ids = {r["id"] for r in roles if "admin" in str(r.get("name", "")).lower()}
        agents = agents_resp.json().get("agents", [])
        admins = [
            a for a in agents
            if a.get("active") and any(
                (ra.get("role_id") if isinstance(ra, dict) else ra) in admin_role_ids
                for ra in (a.get("roles") or [])
            )
        ]
        dormant = [a for a in admins if not a.get("last_login_at")]
        passed = len(dormant) == 0
        return [IntegrationFinding(
            check_id="freshservice.agents.dormant_admins",
            title="No dormant administrator agents",
            description=(
                f"{len(admins)} active administrator agent(s) found, "
                f"{len(dormant)} with no recorded login."
            ),
            remediation=(
                "Deactivate or remove the administrator role from agents "
                "that have never logged in."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_agent_count": len(admins),
                "dormant_admin_count": len(dormant),
            },
        )]

    async def _check_audit_log_retrievable(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit_logs", per_page=10)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "freshservice.audit_logs.retrievable",
                "Audit log trail retrievable",
                "audit_logging",
                "Audit logs require a Freshservice plan that includes audit "
                "logging and an API key with admin scope.",
            )]
        resp.raise_for_status()
        logs = resp.json().get("audit_logs", resp.json().get("logs", []))
        passed = len(logs) > 0
        return [IntegrationFinding(
            check_id="freshservice.audit_logs.retrievable",
            title="Audit log trail is retrievable and populated",
            description=(
                f"{len(logs)} recent audit log entry/entries retrieved."
                if passed else
                "The audit log endpoint returned no entries."
            ),
            remediation=(
                "Confirm audit logging is enabled account-wide so admin "
                "actions remain traceable."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="audit_logging",
            result_details={"recent_log_count": len(logs)},
        )]

    async def _check_global_ticket_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/agents", per_page=100)
        if resp.status_code == 403:
            return [self._unavailable(
                "freshservice.agents.global_ticket_scope",
                "Agents with global ticket visibility",
                "access_control",
                "Grant the API key read access to /agents.",
            )]
        resp.raise_for_status()
        agents = resp.json().get("agents", [])
        active = [a for a in agents if a.get("active")]
        global_scope = [a for a in active if a.get("ticket_scope") == 1]
        passed = len(global_scope) == 0
        return [IntegrationFinding(
            check_id="freshservice.agents.global_ticket_scope",
            title="No agent has unrestricted global ticket visibility",
            description=(
                f"{len(global_scope)} of {len(active)} active agent(s) can "
                "view tickets from every department instead of being scoped "
                "to their assigned group."
            ),
            remediation=(
                "Restrict ticket_scope to group- or restricted-level access "
                "for agents who do not need cross-department visibility."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if global_scope else "INFO",
            check_category="access_control",
            result_details={
                "active_agent_count": len(active),
                "global_scope_agent_count": len(global_scope),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Freshservice with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
