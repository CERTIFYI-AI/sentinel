# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Insightly integration adapter.

Reads access-review and data-location evidence from the Insightly CRM REST
API: administrator/owner account concentration, webhook subscriptions
pushing CRM data to external endpoints, and leads set to be visible to
every user (``VISIBLE_TO = EVERYONE``) instead of being owner- or
team-restricted.

Auth: an API key, sent as HTTP Basic with the key as the username and a
blank password (Insightly's API-key auth scheme).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.insightly.com/v3.1"


@dataclass
class InsightlyCredentials:
    """Matches dashboard/src/integrations/insightly/config.ts credentialFields."""

    api_key: str


class InsightlyAdapter:
    """Fetches access-review and data-exposure posture from Insightly."""

    def __init__(self, credentials: InsightlyCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(self.credentials.api_key, "")

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        # Insightly's generic host 302-redirects to the account's regional
        # pod (e.g. api.na1.insightly.com); follow that redirect transparently.
        return httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/Users/Me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Insightly rejected the API key. Verify the key is "
                    "active."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Insightly: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_concentration(client),
                self._check_external_webhooks(client),
                self._check_leads_visible_to_everyone(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("insightly check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/Users")
        if resp.status_code == 403:
            return [self._unavailable(
                "insightly.users.admin_concentration",
                "Administrator/owner account concentration",
                "least_privilege",
                "Grant the API key read access to /Users.",
            )]
        resp.raise_for_status()
        users = resp.json() or []
        total = len(users)
        admins = [
            u for u in users
            if u.get("ADMINISTRATOR") in (True, "true", "True", 1)
            or u.get("ACCOUNT_OWNER") in (True, "true", "True", 1)
        ]
        ratio = (len(admins) / total) if total else 0
        passed = total > 0 and ratio <= 0.3
        return [IntegrationFinding(
            check_id="insightly.users.admin_concentration",
            title="Administrator/owner access is not over-concentrated",
            description=(
                f"{len(admins)} of {total} user(s) hold administrator or "
                "account-owner privileges."
                if total else
                "No users were returned for this account."
            ),
            remediation=(
                "Limit administrator and account-owner privileges to the "
                "smallest set of people who genuinely need account-wide "
                "control."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed and total else "INFO",
            check_category="least_privilege",
            result_details={
                "total_user_count": total,
                "admin_count": len(admins),
            },
        )]

    async def _check_external_webhooks(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/Webhooks")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "insightly.webhooks.external_targets",
                "Webhooks pushing data to external endpoints",
                "vendor_management",
                "Webhooks require an Insightly plan that includes the "
                "Webhooks API, and read access to /Webhooks.",
            )]
        resp.raise_for_status()
        hooks = resp.json() or []
        external = []
        for h in hooks:
            url = h.get("TARGET_URL", h.get("URL", ""))
            host = urlparse(url).hostname or ""
            if host and "insightly.com" not in host:
                external.append(h)
        passed = len(external) == 0
        return [IntegrationFinding(
            check_id="insightly.webhooks.external_targets",
            title="Outbound webhooks documented and vendor-reviewed",
            description=(
                f"{len(external)} of {len(hooks)} configured webhook(s) push "
                "CRM data to a third-party endpoint outside Insightly."
            ),
            remediation=(
                "Confirm every third-party webhook destination is a "
                "reviewed vendor with an active data-processing agreement; "
                "remove subscriptions that are no longer needed."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if external else "INFO",
            check_category="vendor_management",
            result_details={
                "webhook_count": len(hooks),
                "external_target_count": len(external),
            },
        )]

    async def _check_leads_visible_to_everyone(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/Leads", top=200)
        if resp.status_code == 403:
            return [self._unavailable(
                "insightly.leads.visible_to_everyone",
                "Leads visible to every user",
                "access_control",
                "Grant the API key read access to /Leads.",
            )]
        resp.raise_for_status()
        leads = resp.json() or []
        total = len(leads)
        public = [ld for ld in leads if str(ld.get("VISIBLE_TO", "")).upper() == "EVERYONE"]
        passed = len(public) == 0
        return [IntegrationFinding(
            check_id="insightly.leads.visible_to_everyone",
            title="No lead is set to be visible to every user",
            description=(
                f"{len(public)} of {total} lead(s) have VISIBLE_TO set to "
                "EVERYONE instead of being restricted to the owner or team."
            ),
            remediation=(
                "Set VISIBLE_TO to OWNER or TEAM for leads containing "
                "sensitive prospect data, reserving EVERYONE for records "
                "that are intentionally shared org-wide."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if public else "INFO",
            check_category="access_control",
            result_details={
                "lead_count": total,
                "visible_to_everyone_count": len(public),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Insightly with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
