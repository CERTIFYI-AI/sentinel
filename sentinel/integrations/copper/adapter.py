# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Copper integration adapter.

Reads access-review and data-location evidence from the Copper CRM REST
API: administrator account concentration, webhook subscriptions pushing
CRM data to external endpoints, and leads left without an owner (and so
without ownership-based access restriction).

Auth: an API token + the associated account email, sent as the
``X-PW-AccessToken`` / ``X-PW-UserEmail`` headers Copper requires on every
request.
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
_BASE = "https://api.copper.com/developer_api/v1"


@dataclass
class CopperCredentials:
    """Matches dashboard/src/integrations/copper/config.ts credentialFields."""

    api_key: str
    user_email: str


class CopperAdapter:
    """Fetches access-review and data-exposure posture from Copper."""

    def __init__(self, credentials: CopperCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "X-PW-AccessToken": self.credentials.api_key,
            "X-PW-UserEmail": self.credentials.user_email,
            "X-PW-Application": "developer_api",
            "Accept": "application/json",
            "Content-Type": "application/json",
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

    async def _post(self, client: httpx.AsyncClient, path: str, json: dict) -> httpx.Response:
        return await client.post(
            f"{_BASE}{path}",
            headers=self._headers(),
            json=json,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/account")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Copper rejected the API token/email pair. Verify both "
                    "the API token and the account email match."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Copper: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_concentration(client),
                self._check_external_webhook_subscriptions(client),
                self._check_unassigned_leads(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("copper check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users")
        if resp.status_code == 403:
            return [self._unavailable(
                "copper.users.admin_concentration",
                "Administrator account concentration",
                "least_privilege",
                "The /users endpoint requires an API token issued by an "
                "account administrator.",
            )]
        resp.raise_for_status()
        users = resp.json() or []
        total = len(users)
        admins = [u for u in users if str(u.get("role", "")).lower() in ("administrator", "owner")]
        ratio = (len(admins) / total) if total else 0
        passed = total > 0 and ratio <= 0.3
        return [IntegrationFinding(
            check_id="copper.users.admin_concentration",
            title="Administrator access is not over-concentrated",
            description=(
                f"{len(admins)} of {total} user(s) hold administrator or "
                "owner privileges."
                if total else
                "No users were returned for this account."
            ),
            remediation=(
                "Limit administrator/owner privileges to the smallest set "
                "of people who genuinely need account-wide control."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed and total else "INFO",
            check_category="least_privilege",
            result_details={
                "total_user_count": total,
                "admin_count": len(admins),
            },
        )]

    async def _check_external_webhook_subscriptions(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/subscriptions")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "copper.subscriptions.external_targets",
                "Webhook subscriptions pushing data to external endpoints",
                "vendor_management",
                "Grant the API token read access to /subscriptions.",
            )]
        resp.raise_for_status()
        subs = resp.json() or []
        external = []
        for s in subs:
            url = s.get("target", s.get("target_url", ""))
            host = urlparse(url).hostname or ""
            if host and "copper.com" not in host:
                external.append(s)
        passed = len(external) == 0
        return [IntegrationFinding(
            check_id="copper.subscriptions.external_targets",
            title="Outbound webhook subscriptions documented and vendor-reviewed",
            description=(
                f"{len(external)} of {len(subs)} configured webhook "
                "subscription(s) push CRM data to a third-party endpoint."
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
                "subscription_count": len(subs),
                "external_target_count": len(external),
            },
        )]

    async def _check_unassigned_leads(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(client, "/leads/search", json={"page_size": 200})
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "copper.leads.unassigned_exposure",
                "Leads without an assigned owner",
                "access_control",
                "Grant the API token read access to /leads/search.",
            )]
        resp.raise_for_status()
        leads = resp.json() or []
        total = len(leads)
        unassigned = [ld for ld in leads if not ld.get("assignee_id")]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="copper.leads.unassigned_exposure",
            title="No lead is left without an assigned owner",
            description=(
                f"{len(unassigned)} of {total} lead(s) have no assigned "
                "owner, leaving them outside ownership-based access "
                "restrictions."
            ),
            remediation=(
                "Assign an owner to every lead so record-level access can "
                "be governed by ownership rather than defaulting to "
                "unrestricted visibility."
            ),
            status="PASSED" if passed else "WARNING",
            severity="LOW" if unassigned else "INFO",
            check_category="access_control",
            result_details={
                "lead_count": total,
                "unassigned_lead_count": len(unassigned),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Copper with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
