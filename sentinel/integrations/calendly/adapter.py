# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Calendly integration adapter.

Reads access-review and data-location evidence from the Calendly API:
organization owner/admin concentration, webhook subscription transport
security, and publicly-listed event types.

Auth: a single api_key (Bearer, Calendly Personal Access Token).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.calendly.com"

_ADMIN_ROLES = {"owner", "admin"}


@dataclass
class CalendlyCredentials:
    """Matches dashboard/src/integrations/calendly/config.ts credentialFields."""

    api_key: str


class CalendlyAdapter:
    """Fetches access-review and data-location evidence from Calendly."""

    def __init__(self, credentials: CalendlyCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._org_uri: str | None = None

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

    async def _current_user(self, client: httpx.AsyncClient) -> dict:
        resp = await self._get(client, "/users/me")
        resp.raise_for_status()
        return resp.json().get("resource", {})

    async def _organization_uri(self, client: httpx.AsyncClient) -> str | None:
        if self._org_uri:
            return self._org_uri
        me = await self._current_user(client)
        self._org_uri = me.get("current_organization")
        return self._org_uri

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/users/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Calendly rejected the Personal Access Token. Verify the "
                    "token is active and has not been regenerated or revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Calendly: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_concentration(client),
                self._check_webhook_transport_security(client),
                self._check_public_event_types(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("calendly check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_uri = await self._organization_uri(client)
        if not org_uri:
            return [self._unavailable(
                "calendly.org_members.admin_concentration",
                "Organization owner/admin concentration",
                "least_privilege",
                "This token's account is not part of a Calendly organization.",
            )]
        resp = await self._get(client, "/organization_memberships", organization=org_uri, count=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "calendly.org_members.admin_concentration",
                "Organization owner/admin concentration",
                "least_privilege",
                "This token needs organization admin scope to list members.",
            )]
        resp.raise_for_status()
        members = resp.json().get("collection", [])
        admins = [m for m in members if m.get("role") in _ADMIN_ROLES]
        total = len(members)
        ratio = (len(admins) / total) if total else 0.0
        passed = total > 0 and ratio <= 0.3
        return [IntegrationFinding(
            check_id="calendly.org_members.admin_concentration",
            title="Organization owner/admin concentration reviewed",
            description=(
                f"{len(admins)} of {total} organization member(s) hold the "
                f"owner or admin role ({ratio:.0%})."
            ),
            remediation=(
                "Review organization owner/admin role assignments and demote "
                "members who do not require standing administrative access."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_owner_count": len(admins),
                "total_org_members": total,
            },
        )]

    async def _check_webhook_transport_security(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_uri = await self._organization_uri(client)
        if not org_uri:
            return [self._unavailable(
                "calendly.webhooks.transport_security",
                "Webhook subscription transport security",
                "encryption_in_transit",
                "This token's account is not part of a Calendly organization.",
            )]
        resp = await self._get(client, "/webhook_subscriptions", organization=org_uri, scope="organization", count=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "calendly.webhooks.transport_security",
                "Webhook subscription transport security",
                "encryption_in_transit",
                "This token needs organization admin scope to list webhook subscriptions.",
            )]
        resp.raise_for_status()
        subscriptions = resp.json().get("collection", [])
        insecure = [s for s in subscriptions if not str(s.get("callback_url", "")).startswith("https://")]
        return [IntegrationFinding(
            check_id="calendly.webhooks.transport_security",
            title="Webhook subscriptions deliver over encrypted transport",
            description=(
                f"{len(insecure)} of {len(subscriptions)} webhook "
                "subscription(s) use a non-HTTPS callback URL."
            ),
            remediation=(
                "Update every webhook subscription's callback URL to use "
                "HTTPS so booking and invitee payloads are encrypted in transit."
            ),
            status="PASSED" if not insecure else "FAILED",
            severity="HIGH" if insecure else "INFO",
            check_category="encryption_in_transit",
            result_details={
                "insecure_webhook_count": len(insecure),
                "total_webhook_count": len(subscriptions),
            },
        )]

    async def _check_public_event_types(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        org_uri = await self._organization_uri(client)
        if not org_uri:
            return [self._unavailable(
                "calendly.event_types.public_listing",
                "Publicly-listed event types",
                "access_control",
                "This token's account is not part of a Calendly organization.",
            )]
        resp = await self._get(client, "/event_types", organization=org_uri, active=True, count=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "calendly.event_types.public_listing",
                "Publicly-listed event types",
                "access_control",
                "This token needs organization scope to list event types.",
            )]
        resp.raise_for_status()
        event_types = resp.json().get("collection", [])
        public = [e for e in event_types if not e.get("secret")]
        return [IntegrationFinding(
            check_id="calendly.event_types.public_listing",
            title="Active event types reviewed for public listing",
            description=(
                f"{len(public)} of {len(event_types)} active event type(s) "
                "are publicly listed on booking pages rather than secret/unlisted."
            ),
            remediation=(
                "Mark event types used for internal or sensitive scheduling "
                "as secret so they are only reachable via a direct link."
            ),
            status="PASSED" if not public else "WARNING",
            severity="LOW" if public else "INFO",
            check_category="access_control",
            result_details={
                "publicly_listed_count": len(public),
                "total_active_event_types": len(event_types),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Calendly with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
