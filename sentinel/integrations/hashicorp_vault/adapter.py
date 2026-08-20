# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""HashiCorp Vault integration adapter.

Reads Vault's own security posture from its HTTP API: seal status and
whether an audit device is enabled, token TTL hygiene (unbounded or
long-lived tokens are a standing risk), and policy over-permissioning
(wildcard-path policies granting broad capabilities).

Auth: a Vault token presented via the ``X-Vault-Token`` header.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: A token TTL of zero means "never expires" in Vault's API.
_UNLIMITED_TTL = 0
#: TTLs beyond this many seconds (30 days) are treated as long-lived.
_LONG_LIVED_TTL_SECONDS = 30 * 24 * 60 * 60
#: Capabilities that, combined with a wildcard path, indicate an
#: over-permissioned policy.
_BROAD_CAPABILITIES = {"sudo", "root", "delete"}


@dataclass
class HashicorpVaultCredentials:
    """Matches dashboard/src/integrations/hashicorp_vault/config.ts credentialFields."""

    vault_addr: str
    credential: str

    def root(self) -> str:
        return self.vault_addr.rstrip("/")


class HashicorpVaultAdapter:
    """Fetches Vault's own security posture from its HTTP API."""

    def __init__(self, credentials: HashicorpVaultCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "X-Vault-Token": self.credentials.credential,
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, authed: bool = True, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.root()}{path}",
            headers=self._headers() if authed else {"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            # sys/seal-status is unauthenticated by design; use lookup-self
            # to actually verify the supplied token.
            resp = await self._get(client, "/v1/auth/token/lookup-self")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Vault rejected the token. Verify it is active and has "
                    "not expired or been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Vault: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_seal_and_audit_status(client),
                self._check_token_ttl_hygiene(client),
                self._check_policy_over_permissioning(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("hashicorp_vault check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_seal_and_audit_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        seal_resp = await self._get(client, "/v1/sys/seal-status", authed=False)
        if seal_resp.status_code in (401, 403):
            return [self._unavailable(
                "hashicorp_vault.sys.seal_and_audit_status",
                "Seal status and audit device",
                "secret_management",
                "Verify the Vault address is correct and reachable.",
            )]
        seal_resp.raise_for_status()
        seal = seal_resp.json()
        sealed = seal.get("sealed", True)
        initialized = seal.get("initialized", False)

        audit_resp = await self._get(client, "/v1/sys/audit")
        if audit_resp.status_code in (401, 403):
            return [self._unavailable(
                "hashicorp_vault.sys.seal_and_audit_status",
                "Seal status and audit device",
                "secret_management",
                "Grant the token the 'sys/audit' read capability to check "
                "whether an audit device is enabled.",
            )]
        audit_resp.raise_for_status()
        audit_devices = audit_resp.json().get("data", audit_resp.json())
        audit_devices = {k: v for k, v in audit_devices.items() if isinstance(v, dict)}
        has_audit_device = len(audit_devices) > 0

        passed = (not sealed) and initialized and has_audit_device
        return [IntegrationFinding(
            check_id="hashicorp_vault.sys.seal_and_audit_status",
            title="Vault is unsealed, initialized, and audit logging is enabled",
            description=(
                f"sealed={sealed}, initialized={initialized}, "
                f"audit device(s) enabled={len(audit_devices)}."
            ),
            remediation=(
                "Ensure Vault is unsealed and initialized for normal "
                "operation, and enable at least one audit device (file, "
                "syslog, or socket) so every request is logged for "
                "traceability."
            ),
            status="PASSED" if passed else ("FAILED" if sealed or not initialized else "WARNING"),
            severity="CRITICAL" if sealed else ("HIGH" if not has_audit_device else "INFO"),
            check_category="secret_management",
            result_details={
                "sealed": sealed,
                "initialized": initialized,
                "audit_device_count": len(audit_devices),
            },
        )]

    async def _check_token_ttl_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v1/auth/token/lookup-self")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "hashicorp_vault.tokens.ttl_hygiene",
                "Token TTL hygiene",
                "access_control",
                "The supplied token could not look up its own metadata.",
            )]
        resp.raise_for_status()
        data = resp.json().get("data", {})
        ttl = data.get("ttl", _UNLIMITED_TTL)
        creation_ttl = data.get("creation_ttl", ttl)
        is_unlimited = creation_ttl == _UNLIMITED_TTL
        is_long_lived = creation_ttl > _LONG_LIVED_TTL_SECONDS

        accessor_count = None
        accessors_resp = await self._get(client, "/v1/auth/token/accessors", list="true")
        if accessors_resp.status_code == 200:
            accessor_count = len(accessors_resp.json().get("data", {}).get("keys", []))

        passed = not is_unlimited and not is_long_lived
        return [IntegrationFinding(
            check_id="hashicorp_vault.tokens.ttl_hygiene",
            title="Tokens are not issued with unbounded or excessive TTLs",
            description=(
                f"The credential under evaluation has a creation TTL of "
                f"{creation_ttl} second(s) "
                + ("(never expires)." if is_unlimited else ".")
                + (f" {accessor_count} total token accessor(s) exist across "
                   "the mount." if accessor_count is not None else "")
            ),
            remediation=(
                "Issue tokens with a bounded, renewable TTL appropriate to "
                "their use (short for human sessions, scoped for machine "
                "roles) rather than unlimited or multi-year TTLs, and "
                "periodically audit `auth/token/accessors` for stale tokens."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if is_unlimited else ("MEDIUM" if is_long_lived else "INFO"),
            check_category="access_control",
            result_details={
                "creation_ttl_seconds": creation_ttl,
                "unlimited_ttl": is_unlimited,
                "total_token_accessor_count": accessor_count,
            },
        )]

    async def _check_policy_over_permissioning(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/v1/sys/policies/acl", list="true")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "hashicorp_vault.policies.over_permissioning",
                "Policy over-permissioning",
                "least_privilege",
                "Grant the token the 'sys/policies/acl' list and read "
                "capability.",
            )]
        resp.raise_for_status()
        policy_names = resp.json().get("data", {}).get("keys", [])
        broad_policies: list[str] = []
        checked = 0
        for name in policy_names[:25]:
            if name in ("root", "default"):
                continue
            detail_resp = await self._get(client, f"/v1/sys/policies/acl/{name}")
            if detail_resp.status_code in (401, 403, 404):
                continue
            detail_resp.raise_for_status()
            checked += 1
            rules = (detail_resp.json().get("data", {}).get("policy", "") or "").lower()
            if 'path "*"' in rules and any(cap in rules for cap in _BROAD_CAPABILITIES):
                broad_policies.append(name)

        if checked == 0:
            return [self._unavailable(
                "hashicorp_vault.policies.over_permissioning",
                "Policy over-permissioning",
                "least_privilege",
                "No custom policies could be read with the supplied token.",
            )]

        passed = len(broad_policies) == 0
        return [IntegrationFinding(
            check_id="hashicorp_vault.policies.over_permissioning",
            title="No custom policy grants broad capabilities on all paths",
            description=(
                f"{len(broad_policies)} of {checked} custom polic(ies) grant "
                "sudo, root, or delete capabilities on a wildcard ('*') path."
            ),
            remediation=(
                "Scope each policy's paths to the specific secret engines and "
                "prefixes a role actually needs, and avoid granting 'sudo' or "
                "wildcard-path capabilities outside of break-glass roles."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL" if broad_policies else "INFO",
            check_category="least_privilege",
            result_details={
                "custom_policies_checked": checked,
                "over_permissioned_policy_names": broad_policies,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Vault with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
