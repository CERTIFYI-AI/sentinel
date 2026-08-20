# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Akamai integration adapter.

Reads edge/CDN security posture from the Akamai APIs: stale API clients
in Identity and Access Management, WAF enforcement in Application
Security, and property-config rollback coverage in Property Manager.

Auth: Akamai EdgeGrid — a client_token / client_credential / access_credential
triple signed per request (HMAC-SHA256), plus the tenant's API host. This is
the credential shape ``.edgerc`` files use; Sentinel collects the same four
values through the connect form instead of reading a local file.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import logging
import time
import uuid
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: An API client credential unused past this many days is a finding.
_STALE_CLIENT_DAYS = 90


@dataclass
class AkamaiCredentials:
    """Matches dashboard/src/integrations/akamai/config.ts credentialFields."""

    host: str
    client_token: str
    client_credential: str
    access_credential: str

    def base_url(self) -> str:
        host = self.host.strip().rstrip("/")
        if not host.startswith("http"):
            host = f"https://{host}"
        return host


class AkamaiAdapter:
    """Reads CDN/edge security posture from Akamai via EdgeGrid-signed calls."""

    def __init__(self, credentials: AkamaiCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    # -- EdgeGrid request signing ------------------------------------------------

    def _sign(self, method: str, path: str, timestamp: str, nonce: str) -> str:
        """Build the EG1-HMAC-SHA256 Authorization header per the Akamai
        EdgeGrid spec. GET requests carry no body, so the content hash is
        empty."""
        auth_header = (
            "EG1-HMAC-SHA256 "
            f"client_token={self.credentials.client_token};"
            f"access_token={self.credentials.access_credential};"
            f"timestamp={timestamp};"
            f"nonce={nonce};"
        )
        data_to_sign = f"{method}\thttps\t{self.credentials.host}\t{path}\t\t\t{auth_header}"
        signing_key = base64.b64encode(
            hmac.new(self.credentials.client_credential.encode(), timestamp.encode(), hashlib.sha256).digest()
        )
        signature = base64.b64encode(
            hmac.new(signing_key, data_to_sign.encode(), hashlib.sha256).digest()
        ).decode()
        return f"{auth_header}signature={signature}"

    def _headers(self, method: str, path: str) -> dict[str, str]:
        timestamp = time.strftime("%Y%m%dT%H:%M:%S+0000", time.gmtime())
        nonce = str(uuid.uuid4())
        return {
            "Authorization": self._sign(method, path, timestamp, nonce),
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers=self._headers("GET", path),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/identity-management/v3/api-clients/self")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Akamai rejected the EdgeGrid credentials. Verify the "
                    "client token, client credential, access credential, "
                    "and host all belong to the same API client."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Akamai: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_api_clients(client),
                self._check_waf_enforcement(client),
                self._check_property_rollback_coverage(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("akamai check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_stale_api_clients(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        path = "/identity-management/v3/api-clients"
        resp = await self._get(client, path, actions="true")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "akamai.iam.stale_api_clients",
                "Stale API clients with elevated access",
                "access_control",
                "Grant the credential the Identity and Access Management "
                "READ-WRITE (or READ) role so client inventory is visible.",
            )]
        resp.raise_for_status()
        data = resp.json()
        clients = data if isinstance(data, list) else data.get("apiClients", data.get("clients", []))
        stale: list[str] = []
        admin_count = 0
        for c in clients:
            group_access = c.get("groupAccess", {}) or {}
            is_admin = any(
                g.get("roleId") in (1, 2) or str(g.get("roleName", "")).lower() in ("administrator", "admin")
                for g in group_access.get("groups", [])
            )
            if is_admin:
                admin_count += 1
            if c.get("activeCredentialCount", 0) == 0 or c.get("isLocked"):
                stale.append(c.get("clientName", c.get("clientId", "unknown")))
        status = "PASSED" if not stale else "WARNING"
        return [IntegrationFinding(
            check_id="akamai.iam.stale_api_clients",
            title=(f"{len(stale)} Akamai API client(s) are locked or have no active credential"
                   if stale else f"All {len(clients)} Akamai API clients have an active credential"),
            description=(
                "Stale or locked clients: " + ", ".join(stale[:20]) + "."
                if stale else
                f"{admin_count} of {len(clients)} API client(s) hold administrator-level group access; "
                "none are stale or locked."
            ),
            remediation="Identity and Access Management → API Clients → deactivate or "
                        "delete clients that are locked or have no active credential, "
                        "and scope administrator-level group access to as few clients as possible.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"total_clients": len(clients), "admin_clients": admin_count,
                            "stale_or_locked": stale},
        )]

    async def _check_waf_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/appsec/v1/configs")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "akamai.appsec.waf_enforcement",
                "WAF enforcement across security configurations",
                "network_security",
                "Grant the credential the Application Security READ role.",
            )]
        resp.raise_for_status()
        data = resp.json()
        configs = data if isinstance(data, list) else data.get("configurations", [])
        not_on_production: list[str] = []
        for cfg in configs:
            name = cfg.get("name", cfg.get("id", "unknown"))
            versions = cfg.get("productionVersion")
            if not versions:
                not_on_production.append(str(name))
        status = "PASSED" if configs and not not_on_production else ("WARNING" if configs else "FAILED")
        return [IntegrationFinding(
            check_id="akamai.appsec.waf_enforcement",
            title=(f"{len(not_on_production)} of {len(configs)} security configurations "
                   "have no WAF version active in production" if not_on_production else
                   f"All {len(configs)} security configurations enforce WAF in production"
                   if configs else "No Application Security configuration exists"),
            description=("Without an active production version: " + ", ".join(not_on_production[:20])
                         if not_on_production else
                         ("Every security configuration has an activated production version."
                          if configs else
                          "No WAF/security configuration is provisioned, so edge traffic "
                          "reaches origin without managed-rule inspection.")),
            remediation="Application Security → select the configuration → activate the "
                        "latest version to the production network with the managed rule "
                        "sets enabled.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="network_security",
            result_details={"configurations": len(configs), "not_enforced": not_on_production},
        )]

    async def _check_property_rollback_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/papi/v1/properties")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "akamai.property.rollback_coverage",
                "Property Manager version rollback coverage",
                "backup_recovery",
                "Grant the credential the Property Manager READ role.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("properties", {}).get("items", data if isinstance(data, list) else [])
        no_rollback: list[str] = []
        for prop in items:
            name = prop.get("propertyName", prop.get("propertyId", "unknown"))
            latest = prop.get("latestVersion") or 0
            production = prop.get("productionVersion")
            # A property with only one saved version, or whose production
            # version is the latest with nothing behind it, has no prior
            # version to roll back to if the next activation misbehaves.
            if latest <= 1 or production is None:
                no_rollback.append(str(name))
        status = "PASSED" if items and not no_rollback else ("WARNING" if items else "NOT_AVAILABLE")
        return [IntegrationFinding(
            check_id="akamai.property.rollback_coverage",
            title=(f"{len(no_rollback)} of {len(items)} properties have no prior version to roll back to"
                   if no_rollback else
                   f"All {len(items)} properties retain a rollback-eligible prior version"
                   if items else "No Property Manager properties visible to this credential"),
            description=("Without rollback coverage: " + ", ".join(no_rollback[:20])
                         if no_rollback else
                         ("Every property has at least one prior saved version behind "
                          "the active one." if items else
                          "These credentials cannot see any properties, or none exist.")),
            remediation="Property Manager → before activating a new version, confirm a "
                        "known-good prior version remains available so a bad activation "
                        "can be rolled back quickly.",
            status=status,
            severity="INFO" if status in ("PASSED", "NOT_AVAILABLE") else "MEDIUM",
            check_category="backup_recovery",
            result_details={"properties": len(items), "no_rollback": no_rollback},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Akamai with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
