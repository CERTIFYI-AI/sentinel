# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Box integration adapter.

Reads access-review and data-location evidence from the Box API:
enterprise admin/co-admin concentration, Enterprise Events (admin audit
log) retrievability, and publicly-accessible ("open") shared links.

Auth: OAuth2 Client Credentials Grant with an enterprise subject
(client_id, client_credential, enterprise_id).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://api.box.com/oauth2/token"
_BASE = "https://api.box.com/2.0"


@dataclass
class BoxCredentials:
    """Matches dashboard/src/integrations/box/config.ts credentialFields."""

    client_id: str
    client_credential: str
    enterprise_id: str


class BoxAdapter:
    """Fetches access-review and data-location evidence from Box."""

    def __init__(self, credentials: BoxCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via the Client Credentials Grant."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
                "box_subject_type": "enterprise",
                "box_subject_id": self.credentials.enterprise_id,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Box rejected the OAuth2 client credentials "
                f"(HTTP {resp.status_code}). Verify the client ID, client "
                "credential, and enterprise ID."
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
            resp = await self._get(client, "/users", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Box rejected the access token when listing users. "
                    "Verify the app has enterprise-level manage users permission."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Box: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_concentration(client),
                self._check_audit_events_retrieval(client),
                self._check_public_shared_links(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("box check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", limit=1000, user_type="managed")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "box.users.admin_concentration",
                "Enterprise admin/co-admin concentration",
                "least_privilege",
                "Grant the app enterprise-level manage users permission.",
            )]
        resp.raise_for_status()
        users = resp.json().get("entries", [])
        admins = [u for u in users if u.get("role") in ("admin", "coadmin")]
        total = len(users)
        ratio = (len(admins) / total) if total else 0.0
        passed = total > 0 and ratio <= 0.2
        return [IntegrationFinding(
            check_id="box.users.admin_concentration",
            title="Enterprise admin/co-admin concentration reviewed",
            description=(
                f"{len(admins)} of {total} managed user(s) hold admin or "
                f"co-admin privileges ({ratio:.0%})."
            ),
            remediation=(
                "Review enterprise admin and co-admin role assignments and "
                "demote accounts that do not require standing access."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_coadmin_count": len(admins),
                "total_managed_users": total,
            },
        )]

    async def _check_audit_events_retrieval(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/events", stream_type="admin_logs", limit=1)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "box.audit.events_retrieval",
                "Enterprise Events (admin audit log) retrievability",
                "audit_logging",
                "Grant the app enterprise-level manage enterprise permission "
                "to read the admin_logs event stream.",
            )]
        resp.raise_for_status()
        events = resp.json().get("entries", [])
        return [IntegrationFinding(
            check_id="box.audit.events_retrieval",
            title="Enterprise admin audit events are retrievable",
            description=f"The admin_logs event stream returned {len(events)} recent event(s).",
            remediation=(
                "No action required. Continue forwarding Box Enterprise "
                "Events into the SIEM for retention."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"recent_event_count": len(events)},
        )]

    async def _check_public_shared_links(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/events", stream_type="admin_logs", event_type="SHARED_LINK_CREATE", limit=100
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "box.shared_links.public_exposure",
                "Publicly-accessible ('open') shared links",
                "access_control",
                "Grant the app enterprise-level manage enterprise permission "
                "to read the admin_logs event stream.",
            )]
        resp.raise_for_status()
        events = resp.json().get("entries", [])
        open_links = [
            e for e in events
            if (e.get("source", {}).get("item", {}).get("shared_link", {}) or {}).get("access") == "open"
        ]
        return [IntegrationFinding(
            check_id="box.shared_links.public_exposure",
            title="Newly created shared links are not open to the public",
            description=(
                f"{len(open_links)} of {len(events)} recent shared-link "
                "creation event(s) set access to 'open' (anyone with the link)."
            ),
            remediation=(
                "Restrict shared link access to 'People in your company' or "
                "'People in the shared folder' instead of 'People with the link'."
            ),
            status="PASSED" if not open_links else "WARNING",
            severity="MEDIUM" if open_links else "INFO",
            check_category="access_control",
            result_details={
                "open_shared_link_events": len(open_links),
                "shared_link_events_reviewed": len(events),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Box with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
