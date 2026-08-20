# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Apollo.io integration adapter.

Reads access-review and data-location evidence from the Apollo.io API:
dormant admin seats, audit/activity log retrievability, and sharing scope
on saved contact/lead lists (Apollo stores prospect and contact PII).

Auth: a single api_key (Bearer token from Apollo Settings > Integrations).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.apollo.io/v1"


@dataclass
class ApolloCredentials:
    """Matches dashboard/src/integrations/apollo/config.ts credentialFields."""

    api_key: str


class ApolloAdapter:
    """Fetches access-review and data-location posture from Apollo.io."""

    def __init__(self, credentials: ApolloCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/auth/health")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Apollo rejected the API key. Verify it is active in "
                    "Settings > Integrations and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Apollo: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admins(client),
                self._check_audit_log_access(client),
                self._check_list_sharing_scope(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("apollo check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users/search", page=1, per_page=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "apollo.users.dormant_admin",
                "Dormant admin seat review",
                "least_privilege",
                "Grant the API key the users.search permission.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data.get("users", data.get("people", []))
        admins = [u for u in users if str(u.get("role", "")).lower() in ("admin", "owner")]
        dormant = [u for u in admins if not u.get("last_login_at") and not u.get("last_active_at")]
        return [IntegrationFinding(
            check_id="apollo.users.dormant_admin",
            title="No dormant admin seats",
            description=(
                f"{len(admins)} admin/owner seat(s), {len(dormant)} with no "
                "recorded login or activity."
            ),
            remediation=(
                "Downgrade or remove admin seats that show no login "
                "activity; dormant admin accounts are a standing "
                "privilege-escalation risk."
            ),
            status="PASSED" if not dormant else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "dormant_admin_count": len(dormant),
            },
        )]

    async def _check_audit_log_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/activities", page=1, per_page=25)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "apollo.account.audit_log_access",
                "Audit/activity log retrievability",
                "audit_logging",
                "Grant the API key access to the activity log endpoint, or "
                "confirm the plan includes activity logging.",
            )]
        resp.raise_for_status()
        data = resp.json()
        events = data.get("activities", data.get("results", []))
        return [IntegrationFinding(
            check_id="apollo.account.audit_log_access",
            title="Account activity log is retrievable",
            description=(
                f"{len(events)} recent activity event(s) retrieved via the API."
            ),
            remediation=(
                "No action required — activity events are retrievable for "
                "audit purposes. If this count is unexpectedly zero, "
                "confirm activity logging is enabled for the organization."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={
                "recent_event_count": len(events),
            },
        )]

    async def _check_list_sharing_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/lists", page=1, per_page=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "apollo.lists.sharing_scope",
                "Contact/lead list sharing scope",
                "data_classification",
                "Grant the API key read access to saved lists.",
            )]
        resp.raise_for_status()
        data = resp.json()
        lists = data.get("lists", data.get("labels", []))
        org_wide = [
            entry for entry in lists
            if str(entry.get("visibility", entry.get("share_type", ""))).lower()
            in ("team", "organization", "everyone", "public")
        ]
        return [IntegrationFinding(
            check_id="apollo.lists.sharing_scope",
            title="Contact/lead lists are not broadly over-shared",
            description=(
                f"{len(lists)} saved list(s), {len(org_wide)} shared "
                "org-wide or team-wide."
            ),
            remediation=(
                "Restrict org-wide list sharing to lists that genuinely "
                "need it. Broadly shared lists expose enriched contact PII "
                "(emails, phone numbers) to every seat."
            ),
            status="PASSED" if not org_wide else "WARNING",
            severity="MEDIUM" if org_wide else "INFO",
            check_category="data_classification",
            result_details={
                "list_count": len(lists),
                "org_wide_shared_count": len(org_wide),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Apollo with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
