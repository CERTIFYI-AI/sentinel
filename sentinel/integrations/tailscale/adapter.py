# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Tailscale integration adapter.

Reads network security posture from the Tailscale API v2: device
compliance (OS updates), ACL policy audit, and MFA enforcement
for network security, access control, and MFA evidence.

Auth: a Bearer API key scoped to a tailnet.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.tailscale.com/api/v2"


@dataclass
class TailscaleCredentials:
    """Matches dashboard/src/integrations/tailscale/config.ts credentialFields."""

    api_key: str
    tailnet: str


class TailscaleAdapter:
    """Fetches network security posture from Tailscale."""

    def __init__(self, credentials: TailscaleCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            tailnet = self.credentials.tailnet
            resp = await self._get(client, f"/tailnet/{tailnet}/devices")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Tailscale rejected the API key for tailnet "
                    f"{tailnet!r} (HTTP {resp.status_code}). Verify the "
                    "key and tailnet name."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Tailscale: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_device_compliance(client),
                self._check_acl_policy(client),
                self._check_mfa_enforcement(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("tailscale check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_device_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        tailnet = self.credentials.tailnet
        resp = await self._get(client, f"/tailnet/{tailnet}/devices")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "tailscale.devices.compliance", "Device compliance",
                "network_security",
                "The API key cannot list devices. Verify key permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        devices = data.get("devices", [])
        total = len(devices)
        outdated = [
            d for d in devices
            if d.get("updateAvailable", False) is True
        ]
        blocked = [d for d in devices if d.get("blocksIncomingConnections", False)]
        return [IntegrationFinding(
            check_id="tailscale.devices.compliance",
            title="Device compliance reviewed",
            description=(
                f"{total} device(s) in tailnet; {len(outdated)} have updates "
                f"available, {len(blocked)} block incoming connections."
            ),
            remediation=(
                "Update devices with pending OS or client updates. "
                "Review devices blocking incoming connections."
            ),
            status="PASSED" if not outdated else "WARNING",
            severity="MEDIUM" if outdated else "INFO",
            check_category="network_security",
            result_details={
                "total_devices": total,
                "outdated_devices": len(outdated),
                "blocked_devices": len(blocked),
            },
        )]

    async def _check_acl_policy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        tailnet = self.credentials.tailnet
        resp = await self._get(client, f"/tailnet/{tailnet}/acl")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "tailscale.acl.policy_audit", "ACL policy audit",
                "access_control",
                "The API key cannot read ACL policies. Verify key permissions "
                "include acl:read.",
            )]
        resp.raise_for_status()
        data = resp.json()
        acls = data.get("acls", data.get("ACLs", []))
        has_wildcard = any(
            rule.get("action") == "accept"
            and "*" in str(rule.get("src", []))
            and "*" in str(rule.get("dst", []))
            for rule in acls
        )
        return [IntegrationFinding(
            check_id="tailscale.acl.policy_audit",
            title="ACL policy audit",
            description=(
                f"{len(acls)} ACL rule(s) defined. "
                + ("Wildcard accept-all rule detected." if has_wildcard
                   else "No wildcard accept-all rule found.")
            ),
            remediation=(
                "Remove wildcard accept-all ACL rules and implement "
                "least-privilege network policies."
            ),
            status="PASSED" if not has_wildcard else "FAILED",
            severity="HIGH" if has_wildcard else "INFO",
            check_category="access_control",
            result_details={
                "total_acl_rules": len(acls),
                "has_wildcard_rule": has_wildcard,
            },
        )]

    async def _check_mfa_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        tailnet = self.credentials.tailnet
        resp = await self._get(client, f"/tailnet/{tailnet}/keys")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "tailscale.auth.mfa_enforcement", "MFA enforcement",
                "mfa_enforcement",
                "The API key cannot list auth keys. Verify key permissions.",
            )]
        resp.raise_for_status()
        data = resp.json()
        keys = data.get("keys", [])
        non_expiring = [k for k in keys if not k.get("expires")]
        reusable = [
            k for k in keys
            if k.get("capabilities", {}).get("devices", {}).get("create", {}).get("reusable", False)
        ]
        return [IntegrationFinding(
            check_id="tailscale.auth.mfa_enforcement",
            title="Auth key hygiene and MFA enforcement",
            description=(
                f"{len(keys)} auth key(s) found; {len(non_expiring)} non-expiring, "
                f"{len(reusable)} reusable."
            ),
            remediation=(
                "Set expiration on all auth keys and avoid reusable keys "
                "where possible. Enable MFA for all users in the identity provider."
            ),
            status="PASSED" if not non_expiring and not reusable else "WARNING",
            severity="MEDIUM" if non_expiring or reusable else "INFO",
            check_category="mfa_enforcement",
            result_details={
                "total_keys": len(keys),
                "non_expiring_keys": len(non_expiring),
                "reusable_keys": len(reusable),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Tailscale with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
