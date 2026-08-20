# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""CyberArk integration adapter.

Reads privileged-access posture from the CyberArk Identity Security Platform:
Privilege Cloud's REST API for account and platform data, fronted by an
OAuth 2.0 **client credentials** grant against the tenant's CyberArk Identity
service — the standard shape for an unattended auditor. Grant the service
user the built-in **Auditor** or **DPA - View Safe Members and Accounts**
scope; it can read every check here without being able to change a vaulted
credential, which is the point: evidence collection must not be able to
alter what it is evidencing.

The identity (token) endpoint lives on a sibling host to the Privilege Cloud
API — ``{subdomain}.id.cyberark.cloud`` versus
``{subdomain}.privilegecloud.cyberark.cloud`` — so the subdomain is derived
from the one ``tenant_url`` the operator supplies rather than asked for
twice.

A permission the service user was not granted returns NOT_AVAILABLE rather
than a guess — a compliance platform reporting PASSED for a check it could
not run is the failure mode this pipeline exists to prevent.

Evidence source per the Continuous GRC master sheet: users, groups, roles,
MFA enrollment, app assignments, password policies, status.
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

#: A platform's CPM rotation interval longer than this is a secret-management
#: smell even when rotation is technically "configured".
_MAX_ROTATION_DAYS = 90


@dataclass
class CyberArkCredentials:
    """Matches dashboard/src/integrations/cyberark/config.ts credentialFields."""

    client_id: str
    client_credential: str
    tenant_url: str

    def api_base(self) -> str:
        return self.tenant_url.rstrip("/")

    def identity_subdomain(self) -> str:
        """The first label of the Privilege Cloud host, e.g. ``yourco`` from
        ``yourco.privilegecloud.cyberark.cloud``."""
        host = urlparse(self.tenant_url).netloc or self.tenant_url
        return host.split(".")[0]

    def token_url(self) -> str:
        return f"https://{self.identity_subdomain()}.id.cyberark.cloud/oauth2/platformtoken"


class CyberArkAdapter:
    """Fetches privileged-access posture from CyberArk.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: CyberArkCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str = ""

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Client-credentials token, cached in memory for the life of this
        adapter instance. Nothing here writes a token to disk or a log line."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            self.credentials.token_url(),
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code != 200:
            # Deliberately not echoing the response body: an error can quote
            # the submitted client_id, and the operator does not need it to act.
            raise ValueError(
                f"CyberArk rejected the client credentials for "
                f"{self.credentials.identity_subdomain()!r} (HTTP {resp.status_code}). "
                "Check the client id, client credential and tenant URL."
            )
        self._access_token = str(resp.json().get("access_token", ""))
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{self.credentials.api_base()}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/PasswordVault/api/Accounts", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"CyberArk accepted the token but refused Accounts "
                    f"(HTTP {resp.status_code}). Grant the service user the "
                    "Auditor role, or an equivalent read-only safe permission."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach CyberArk: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_privileged_account_inventory(client),
                self._check_session_recording_policy(client),
                self._check_credential_rotation_policy(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("cyberark check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_privileged_account_inventory(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/PasswordVault/api/Accounts", limit=500)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "cyberark.accounts.privileged_inventory", "Privileged account inventory",
                "least_privilege",
                "Grant the service user the Auditor role so onboarded accounts can "
                "be enumerated.",
            )]
        resp.raise_for_status()
        accounts = resp.json().get("value", resp.json() if isinstance(resp.json(), list) else [])
        unmanaged = [
            a for a in accounts
            if not a.get("secretManagement", {}).get("automaticManagementEnabled", False)
        ]
        passed = not unmanaged
        return [IntegrationFinding(
            check_id="cyberark.accounts.privileged_inventory",
            title=f"{len(accounts)} privileged account(s) vaulted, {len(unmanaged)} unmanaged",
            description=(
                f"{len(unmanaged)} of {len(accounts)} onboarded account(s) have "
                "automatic secret management disabled — a human knows the "
                "credential and CyberArk is not enforcing least-privilege rotation."
                if unmanaged else
                f"All {len(accounts)} onboarded privileged account(s) are under "
                "automatic secret management."
            ),
            remediation=(
                "PrivilegeCloud → Accounts: enable automatic management on every "
                "onboarded account, or explain the exception in a documented "
                "break-glass procedure."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="least_privilege",
            result_details={
                "total_accounts": len(accounts),
                "unmanaged_accounts": len(unmanaged),
                "sample": [a.get("userName") for a in unmanaged][:20],
            },
        )]

    async def _check_session_recording_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/PasswordVault/api/Platforms", active="True")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "cyberark.sessions.recording_policy", "Privileged session recording enforced",
                "audit_logging",
                "Grant the service user read access to Platforms configuration.",
            )]
        resp.raise_for_status()
        platforms = resp.json().get("Platforms", resp.json() if isinstance(resp.json(), list) else [])
        not_recorded = [
            p for p in platforms
            if not p.get("properties", {}).get("privilegedSessionManagement", {}).get("recordSession", False)
        ]
        passed = platforms and not not_recorded
        return [IntegrationFinding(
            check_id="cyberark.sessions.recording_policy",
            title=f"{len(platforms) - len(not_recorded)} of {len(platforms)} platform(s) record sessions",
            description=(
                f"{len(not_recorded)} active platform(s) do not require privileged "
                "session recording."
                if not_recorded else
                f"All {len(platforms)} active platform(s) require privileged session "
                "recording and isolation."
            ),
            remediation=(
                "Administration → Platform Management: enable Privileged Session "
                "Management recording on every active platform used for interactive "
                "access."
            ),
            status="PASSED" if passed else ("WARNING" if platforms else "NOT_AVAILABLE"),
            severity="HIGH" if not_recorded else "INFO",
            check_category="audit_logging",
            result_details={
                "active_platforms": len(platforms),
                "without_session_recording": len(not_recorded),
                "sample": [p.get("id") or p.get("name") for p in not_recorded][:20],
            },
        )]

    async def _check_credential_rotation_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/PasswordVault/api/Platforms", active="True")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "cyberark.accounts.credential_rotation_policy", "Credential rotation policy",
                "secret_management",
                "Grant the service user read access to Platforms configuration.",
            )]
        resp.raise_for_status()
        platforms = resp.json().get("Platforms", resp.json() if isinstance(resp.json(), list) else [])
        not_rotating: list[str] = []
        slow_rotation: list[str] = []
        for platform in platforms:
            policy = platform.get("properties", {}).get("credentialsManagementPolicy", {})
            label = platform.get("id") or platform.get("name") or "unknown"
            if not policy.get("automaticRotationConfigured", False):
                not_rotating.append(label)
                continue
            interval = policy.get("changePasswordEveryXDays")
            if isinstance(interval, int) and interval > _MAX_ROTATION_DAYS:
                slow_rotation.append(label)
        passed = platforms and not not_rotating and not slow_rotation
        return [IntegrationFinding(
            check_id="cyberark.accounts.credential_rotation_policy",
            title=f"{len(not_rotating)} platform(s) without automatic rotation",
            description=(
                f"{len(not_rotating)} active platform(s) have no automatic CPM "
                f"rotation configured; {len(slow_rotation)} rotate less often than "
                f"every {_MAX_ROTATION_DAYS} days."
                if (not_rotating or slow_rotation) else
                f"All {len(platforms)} active platform(s) rotate credentials "
                f"automatically at {_MAX_ROTATION_DAYS} days or less."
            ),
            remediation=(
                "Administration → Platform Management: enable automatic password "
                "management (CPM) on every active platform and set the rotation "
                f"interval to {_MAX_ROTATION_DAYS} days or less."
            ),
            status="PASSED" if passed else ("FAILED" if not_rotating else "WARNING"),
            severity="HIGH" if not_rotating else ("MEDIUM" if slow_rotation else "INFO"),
            check_category="secret_management",
            result_details={
                "active_platforms": len(platforms),
                "without_automatic_rotation": len(not_rotating),
                "rotation_slower_than_threshold": len(slow_rotation),
            },
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from CyberArk with the "
                        "supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
