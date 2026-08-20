# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""MongoDB Atlas integration adapter.

Reads cluster and organization security posture from the Atlas
Administration API: organization API keys with owner-level roles,
project-level IP access-list exposure, and encryption-at-rest key
management configuration.

Auth: HTTP Digest, using an Atlas API public key as the digest username
and the paired private key as the digest password. This adapter talks to
the commercial Atlas host; ``mongodb_atlas_for_government`` is a separate
adapter pointed at the government host.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://cloud.mongodb.com/api/atlas/v2"
_ACCEPT = "application/vnd.atlas.2024-08-05+json"

_ANY_IPV4 = "0.0.0.0/0"

#: Roles considered organization-owner-equivalent for API keys.
_OWNER_ROLES = {"ORG_OWNER"}


@dataclass
class MongoDbAtlasCredentials:
    """Matches dashboard/src/integrations/mongodb_atlas/config.ts credentialFields."""

    public_key: str
    private_credential: str


class MongoDbAtlasAdapter:
    """Reads organization and project security posture from MongoDB Atlas."""

    #: Overridable by the government subclass/adapter; kept as an instance
    #: attribute rather than a module constant so a shared base could serve
    #: both if it were ever introduced.
    base_url: str = _BASE

    def __init__(self, credentials: MongoDbAtlasCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> httpx.DigestAuth:
        return httpx.DigestAuth(self.credentials.public_key, self.credentials.private_credential)

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.base_url}{path}",
            auth=self._auth(),
            headers={"Accept": _ACCEPT},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/orgs", itemsPerPage=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Atlas rejected the API key pair. Verify the public key "
                    "and private key are active and have not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach MongoDB Atlas: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_org_owner_api_keys(client),
                self._check_project_network_access(client),
                self._check_encryption_at_rest(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("mongodb_atlas check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- helpers -----------------------------------------------------------------

    async def _orgs(self, client: httpx.AsyncClient) -> list[dict]:
        resp = await self._get(client, "/orgs", itemsPerPage=100)
        if resp.status_code in (401, 403):
            return []
        resp.raise_for_status()
        return resp.json().get("results", [])

    async def _projects(self, client: httpx.AsyncClient) -> list[dict]:
        resp = await self._get(client, "/groups", itemsPerPage=100)
        if resp.status_code in (401, 403):
            return []
        resp.raise_for_status()
        return resp.json().get("results", [])

    # -- checks --------------------------------------------------------------

    async def _check_org_owner_api_keys(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        orgs = await self._orgs(client)
        if not orgs:
            return [self._unavailable(
                "mongodb_atlas.org.owner_api_keys",
                "Organization API keys with owner-level roles",
                "access_control",
                "Grant the API key the Organization Read Only role so "
                "organizations and their API keys are visible.",
            )]
        owner_keys: list[str] = []
        total_keys = 0
        for org in orgs:
            org_id = org.get("id", "")
            resp = await self._get(client, f"/orgs/{org_id}/apiKeys", itemsPerPage=100)
            if resp.status_code in (401, 403):
                continue
            resp.raise_for_status()
            for key in resp.json().get("results", []):
                total_keys += 1
                roles = set(key.get("roles", []))
                if roles & _OWNER_ROLES:
                    owner_keys.append(key.get("id", key.get("desc", "unknown")))
        total = len(owner_keys)
        ratio = (total / total_keys) if total_keys else 0.0
        status = "PASSED" if total <= 2 or ratio <= 0.34 else "WARNING"
        return [IntegrationFinding(
            check_id="mongodb_atlas.org.owner_api_keys",
            title=f"{total} of {total_keys} organization API keys hold ORG_OWNER",
            description=("ORG_OWNER-scoped keys: " + ", ".join(sorted(str(k) for k in owner_keys)[:20])
                         if owner_keys else "No organization API key holds the ORG_OWNER role."),
            remediation="Atlas → Organization Access Manager → API Keys → scope keys to "
                        "the narrowest role that does the job (e.g. ORG_READ_ONLY, "
                        "PROJECT_OWNER on a specific project) instead of ORG_OWNER.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"organizations": len(orgs), "total_api_keys": total_keys,
                            "org_owner_keys": owner_keys},
        )]

    async def _check_project_network_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        projects = await self._projects(client)
        if not projects:
            return [self._unavailable(
                "mongodb_atlas.project.network_access_open",
                "Project IP access-list exposure",
                "network_security",
                "Grant the API key the Project Read Only role so project "
                "access lists are visible.",
            )]
        open_projects: list[str] = []
        for project in projects:
            group_id = project.get("id", "")
            name = project.get("name", group_id)
            resp = await self._get(client, f"/groups/{group_id}/accessList", itemsPerPage=100)
            if resp.status_code in (401, 403):
                continue
            resp.raise_for_status()
            entries = resp.json().get("results", [])
            if any(e.get("cidrBlock") == _ANY_IPV4 or e.get("ipAddress") == "0.0.0.0" for e in entries):
                open_projects.append(str(name))
        status = "PASSED" if not open_projects else "FAILED"
        return [IntegrationFinding(
            check_id="mongodb_atlas.project.network_access_open",
            title=(f"{len(open_projects)} projects allow database access from any IP"
                   if open_projects else f"No project among {len(projects)} allows access from any IP"),
            description=("Projects with 0.0.0.0/0 in the access list: " + ", ".join(open_projects[:20])
                         if open_projects else
                         "Every project's IP access list excludes 0.0.0.0/0."),
            remediation="Atlas → Project → Network Access → remove the 0.0.0.0/0 entry "
                        "and add specific CIDR ranges, or use VPC/Private Endpoint peering.",
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="network_security",
            result_details={"projects": len(projects), "open_projects": open_projects},
        )]

    async def _check_encryption_at_rest(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        projects = await self._projects(client)
        if not projects:
            return [self._unavailable(
                "mongodb_atlas.project.encryption_at_rest",
                "Encryption-at-rest key management configuration",
                "encryption_at_rest",
                "Grant the API key the Project Read Only role so encryption "
                "configuration is visible.",
            )]
        without_cmk: list[str] = []
        for project in projects:
            group_id = project.get("id", "")
            name = project.get("name", group_id)
            resp = await self._get(client, f"/groups/{group_id}/encryptionAtRest")
            if resp.status_code in (401, 403, 404):
                without_cmk.append(str(name))
                continue
            resp.raise_for_status()
            cfg = resp.json()
            enabled = any(
                (cfg.get(provider) or {}).get("enabled")
                for provider in ("awsKms", "azureKeyVault", "googleCloudKms")
            )
            if not enabled:
                without_cmk.append(str(name))
        status = "PASSED" if not without_cmk else "WARNING"
        return [IntegrationFinding(
            check_id="mongodb_atlas.project.encryption_at_rest",
            title=(f"{len(without_cmk)} of {len(projects)} projects have no customer-managed "
                   "encryption key configured" if without_cmk else
                   f"All {len(projects)} projects use a customer-managed encryption key"),
            description=("Atlas' storage-layer default encryption still applies, but no "
                         "customer-managed key (KMS/Key Vault) is configured for: "
                         + ", ".join(without_cmk[:20]) + "." if without_cmk else
                         "Every project has customer-managed key encryption at rest enabled "
                         "through AWS KMS, Azure Key Vault, or Google Cloud KMS."),
            remediation="Atlas → Project → Security → Advanced → Encryption at Rest using "
                        "Customer Key Management → configure a KMS key for the project's cloud provider.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="encryption_at_rest",
            result_details={"projects": len(projects), "without_customer_managed_key": without_cmk},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from MongoDB Atlas with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
