# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""monday.com integration adapter.

Reads access-review and data-location evidence from the monday.com
GraphQL API: disabled/dormant admin account hygiene, audit log
retrievability (Enterprise), and boards shared externally via a public
link.

Auth: a single api_key (monday.com API token, sent as a raw
``Authorization`` header — not Bearer-prefixed).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_GRAPHQL_URL = "https://api.monday.com/v2"


@dataclass
class MondayComCredentials:
    """Matches dashboard/src/integrations/monday_com/config.ts credentialFields."""

    api_key: str


class MondayComAdapter:
    """Fetches access-review and data-location posture from monday.com."""

    def __init__(self, credentials: MondayComCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            result = await self._query(client, "{ me { id } }")
            if "errors" in result:
                raise ValueError(
                    "monday.com rejected the API token. Verify the token is "
                    "active and has not been regenerated."
                )
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach monday.com: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_audit_log_retrievability(client),
                self._check_public_board_sharing(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("monday_com check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = "{ users (kind: all) { id name is_admin enabled } }"
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "monday_com.users.admin_hygiene",
                "Admin account hygiene",
                "least_privilege",
                "The API token cannot list account users. Verify it has "
                "admin-level access.",
            )]
        users = result.get("data", {}).get("users", []) or []
        admins = [u for u in users if u.get("is_admin")]
        disabled_admins = [a for a in admins if a.get("enabled") is False]
        passed = len(disabled_admins) == 0
        return [IntegrationFinding(
            check_id="monday_com.users.admin_hygiene",
            title="No disabled accounts retain the admin role",
            description=(
                f"{len(admins)} admin account(s) found, "
                f"{len(disabled_admins)} disabled but still admin."
            ),
            remediation="Remove admin privileges from disabled monday.com accounts during offboarding.",
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if disabled_admins else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "disabled_admin_count": len(disabled_admins),
            },
        )]

    async def _check_audit_log_retrievability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = "{ audit_logs (pagination: {limit: 1}) { data } }"
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "monday_com.account.audit_log_retrievability",
                "Audit log retrievability",
                "audit_logging",
                "monday.com audit logs require an Enterprise plan and the "
                "audit-log scope. Verify both are available.",
            )]
        logs = result.get("data", {}).get("audit_logs")
        retrievable = logs is not None
        return [IntegrationFinding(
            check_id="monday_com.account.audit_log_retrievability",
            title="Audit logs are retrievable",
            description=(
                "Audit log API responded with retrievable events."
                if retrievable else
                "Audit log API responded but returned no data."
            ),
            remediation="Ensure monday.com Enterprise audit logging remains enabled for this account.",
            status="PASSED" if retrievable else "WARNING",
            severity="INFO" if retrievable else "MEDIUM",
            check_category="audit_logging",
            result_details={"retrievable": retrievable},
        )]

    async def _check_public_board_sharing(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = '{ boards (board_kind: share, limit: 100) { id name } }'
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "monday_com.boards.public_link_sharing",
                "Boards shared externally via public link",
                "data_classification",
                "The API token cannot list boards. Verify it has board "
                "read access.",
            )]
        shared_boards = result.get("data", {}).get("boards", []) or []
        passed = len(shared_boards) == 0
        return [IntegrationFinding(
            check_id="monday_com.boards.public_link_sharing",
            title="No boards are shared externally via public link",
            description=f"{len(shared_boards)} board(s) have board_kind=share (externally shared).",
            remediation="Disable public link sharing for boards containing sensitive data, or move them to private.",
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if shared_boards else "INFO",
            check_category="data_classification",
            result_details={"externally_shared_board_count": len(shared_boards)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from monday.com with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
