# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""IBM Cloud integration adapter.

Reads account security posture from IBM Cloud's global (region-independent)
control-plane APIs: stale IAM API keys, Context-Based Restrictions network
zone enforcement, and provisioned key-management (Key Protect / Hyper
Protect Crypto Services) instances as an encryption-at-rest signal.

Auth: an IAM API key, exchanged for a short-lived bearer token via the
standard ``urn:ibm:params:oauth:grant-type:apikey`` grant. The account ID
needed by the account-scoped APIs is read out of the resulting token
rather than collected separately.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"
_IAM_BASE = "https://iam.cloud.ibm.com/v1"
_CBR_BASE = "https://context-based-restrictions.cloud.ibm.com/v1"
_RC_BASE = "https://resource-controller.cloud.ibm.com/v2"

#: An enabled API key created before this many days ago, with no way to
#: confirm recent use, is flagged for review rather than silently trusted.
_STALE_KEY_DAYS = 180

#: Service names (from the instance CRN's 5th segment) recognised as
#: centralized key management.
_KMS_SERVICE_NAMES = {"kms", "hs-crypto"}


@dataclass
class IbmCloudCredentials:
    """Matches dashboard/src/integrations/ibm_cloud/config.ts credentialFields."""

    api_key: str


class IbmCloudAdapter:
    """Reads account-wide security posture from IBM Cloud."""

    def __init__(self, credentials: IbmCloudCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._bearer_token: str | None = None
        self._account_id: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> tuple[str, str]:
        """Exchange the API key for a bearer token; return (token, account_id)."""
        if self._bearer_token and self._account_id:
            return self._bearer_token, self._account_id
        resp = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": self.credentials.api_key,
                "response_type": "cloud_iam",
            },
            headers={"Accept": "application/json"},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (400, 401, 403):
            raise ValueError(
                "IBM Cloud rejected the API key "
                f"(HTTP {resp.status_code}). Verify the key is active and "
                "has not been deleted or locked."
            )
        resp.raise_for_status()
        token = resp.json().get("access_token", "")
        self._bearer_token = token
        self._account_id = self._account_from_token(token)
        return self._bearer_token, self._account_id or ""

    @staticmethod
    def _account_from_token(token: str) -> str | None:
        """Read the account ID out of the IAM bearer token's claims. The
        token is already trusted (it came straight from IBM's own token
        endpoint over TLS); this only decodes it, it does not verify a
        signature."""
        try:
            payload_segment = token.split(".")[1]
            padded = payload_segment + "=" * (-len(payload_segment) % 4)
            claims = json.loads(base64.urlsafe_b64decode(padded))
            return claims.get("account", {}).get("bss")
        except Exception:  # noqa: BLE001 — malformed/opaque token
            return None

    async def _get(self, client: httpx.AsyncClient, base: str, path: str, token: str, **params) -> httpx.Response:
        return await client.get(
            f"{base}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            token, account_id = await self._authenticate(client)
            if not account_id:
                raise ValueError(
                    "IBM Cloud accepted the API key but no account ID could "
                    "be read from the resulting token."
                )
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach IBM Cloud: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_api_keys(client),
                self._check_network_zones_enforced(client),
                self._check_key_management_provisioned(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("ibm_cloud check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_stale_api_keys(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        token, account_id = await self._authenticate(client)
        resp = await self._get(client, _IAM_BASE, "/apikeys", token, account_id=account_id, pagesize=100)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "ibm_cloud.iam.stale_api_keys",
                "Stale IAM API keys",
                "access_control",
                "Grant the API key's identity the IAM Identity Service "
                "'Viewer' (or higher) service role so account API keys "
                "are listable.",
            )]
        resp.raise_for_status()
        keys = resp.json().get("apikeys", [])
        now = datetime.now(timezone.utc)
        stale: list[str] = []
        enabled_count = 0
        for key in keys:
            if key.get("disabled") or key.get("locked"):
                continue
            enabled_count += 1
            created_at = key.get("created_at", "")
            try:
                created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                continue
            if (now - created).days > _STALE_KEY_DAYS:
                stale.append(key.get("name", key.get("id", "unknown")))
        status = "PASSED" if not stale else "WARNING"
        return [IntegrationFinding(
            check_id="ibm_cloud.iam.stale_api_keys",
            title=(f"{len(stale)} of {enabled_count} enabled API keys are older than "
                   f"{_STALE_KEY_DAYS} days" if stale else
                   f"All {enabled_count} enabled API keys are within {_STALE_KEY_DAYS} days old"),
            description=("Keys past the review window: " + ", ".join(sorted(str(s) for s in stale)[:20])
                         if stale else "No enabled API key is older than the review window."),
            remediation="Manage → Access (IAM) → API keys → rotate or delete keys past "
                        f"{_STALE_KEY_DAYS} days old, and confirm each remaining key is "
                        "still consumed by something.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"enabled_keys": enabled_count, "stale_keys": stale,
                            "max_age_days": _STALE_KEY_DAYS},
        )]

    async def _check_network_zones_enforced(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        token, account_id = await self._authenticate(client)
        resp = await self._get(client, _CBR_BASE, "/rules", token, account_id=account_id)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "ibm_cloud.cbr.network_zones_enforced",
                "Context-Based Restrictions network enforcement",
                "network_security",
                "Grant the API key's identity the Context-based "
                "Restrictions service 'Viewer' role.",
            )]
        resp.raise_for_status()
        rules = resp.json().get("rules", [])
        enabled_rules = [r for r in rules if r.get("enforcement_mode", "enabled") != "disabled"]
        status = "PASSED" if enabled_rules else "FAILED"
        return [IntegrationFinding(
            check_id="ibm_cloud.cbr.network_zones_enforced",
            title=(f"{len(enabled_rules)} Context-Based Restrictions rule(s) are enforced"
                   if enabled_rules else "No Context-Based Restrictions rule is enforced"),
            description=(f"{len(enabled_rules)} of {len(rules)} account rule(s) restrict "
                        "service access to defined network zones." if enabled_rules else
                        "No CBR rule restricts which network zones (IP ranges, VPCs, "
                        "private endpoints) may reach account resources — services are "
                        "reachable from anywhere the underlying service's own settings allow."),
            remediation="Manage → Context-based restrictions → create a network zone "
                        "covering your trusted ranges and a rule that binds sensitive "
                        "services to it.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="network_security",
            result_details={"total_rules": len(rules), "enabled_rules": len(enabled_rules)},
        )]

    async def _check_key_management_provisioned(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        token, account_id = await self._authenticate(client)
        resp = await self._get(
            client, _RC_BASE, "/resource_instances", token,
            account_id=account_id, type="service_instance", limit=200,
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "ibm_cloud.kms.key_management_provisioned",
                "Centralized key-management service provisioned",
                "encryption_at_rest",
                "Grant the API key's identity the Resource Controller "
                "'Viewer' role at the account level.",
            )]
        resp.raise_for_status()
        instances = resp.json().get("resources", [])
        kms_instances = []
        for inst in instances:
            crn_parts = str(inst.get("crn", "")).split(":")
            if len(crn_parts) > 4 and crn_parts[4] in _KMS_SERVICE_NAMES:
                kms_instances.append(inst)
        status = "PASSED" if kms_instances else "WARNING"
        return [IntegrationFinding(
            check_id="ibm_cloud.kms.key_management_provisioned",
            title=(f"{len(kms_instances)} Key Protect / Hyper Protect Crypto Services "
                   "instance(s) provisioned" if kms_instances else
                   "No Key Protect or Hyper Protect Crypto Services instance is provisioned"),
            description=(f"{len(kms_instances)} centralized key-management instance(s) "
                        "exist, so services that support customer-managed keys have one "
                        "to use." if kms_instances else
                        "Resources still default to IBM-managed encryption at rest, but "
                        "no customer-managed key-management service is provisioned for "
                        "services that need one."),
            remediation="Catalog → Security → provision a Key Protect or Hyper Protect "
                        "Crypto Services instance, then point encryption-capable services "
                        "(Cloud Object Storage, Databases, block storage) at it.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="encryption_at_rest",
            result_details={"total_service_instances": len(instances),
                            "kms_instances": len(kms_instances)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from IBM Cloud with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
