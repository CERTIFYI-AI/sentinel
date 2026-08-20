# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Oracle Cloud Infrastructure (OCI) integration adapter.

Reads tenancy security posture from the OCI Identity and Object Storage
APIs: user API-signing keys past a rotation window, Object Storage buckets
with public read access, and buckets relying on Oracle-managed encryption
rather than a customer-managed KMS key.

Auth: OCI API key request signing — a tenancy OCID, user OCID, key
fingerprint, and an RSA private key, not a bearer token. Every request is
individually signed (RSA-SHA256 over a canonical signing string); there is
no separate token-exchange call. This is a lightweight, clearly-scoped
signer for exactly the GET requests this adapter makes — not a general OCI
SDK — in the same pragmatic spirit as NetSuite's OAuth1 TBA signer in
``sentinel/integrations/netsuite/adapter.py``. It does not implement every
edge case of OCI's signing spec (body-hash headers for writes, nested
compartment enumeration); prioritise the ``IntegrationFinding`` contract
over perfecting the signature math.
"""

from __future__ import annotations

import asyncio
import base64
import datetime as dt
import logging
import time
from dataclasses import dataclass
from urllib.parse import urlsplit

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: An API-signing key older than this is a finding, mirroring the CIS-style
#: 90-day rotation window used by the AWS adapter's access-key-age check.
_KEY_MAX_AGE_DAYS = 90


@dataclass
class OracleCloudCredentials:
    """Matches dashboard/src/integrations/oracle_cloud/config.ts credentialFields."""

    tenancy_id: str
    user_id: str
    key_fingerprint: str
    #: PEM-encoded RSA private key paired with the fingerprint above.
    private_key_credential: str
    #: OCI region identifier, e.g. "us-ashburn-1".
    region: str = "us-ashburn-1"

    def identity_host(self) -> str:
        return f"identity.{self.region}.oraclecloud.com"

    def object_storage_host(self) -> str:
        return f"objectstorage.{self.region}.oraclecloud.com"


class OracleCloudAdapter:
    """Fetches tenancy security posture from OCI via signed REST calls."""

    def __init__(self, credentials: OracleCloudCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._private_key = None
        self._namespace: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    def _load_private_key(self):
        if self._private_key is None:
            pem = self.credentials.private_key_credential.encode()
            # No passphrase support: OCI's console-generated API keys are
            # unencrypted PEM by default. A passphrase-protected key raises
            # here, which validate() normalizes into a ValueError.
            self._private_key = serialization.load_pem_private_key(pem, password=None)
        return self._private_key

    def _signed_headers(self, method: str, url: str) -> dict[str, str]:
        """Build an OCI ``Authorization: Signature ...`` header for one GET request."""
        creds = self.credentials
        parts = urlsplit(url)
        request_target = parts.path + (f"?{parts.query}" if parts.query else "")
        date_header = time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime())

        signing_string = "\n".join([
            f"(request-target): {method.lower()} {request_target}",
            f"date: {date_header}",
            f"host: {parts.netloc}",
        ])
        signature = base64.b64encode(
            self._load_private_key().sign(
                signing_string.encode(),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
        ).decode()

        key_id = f"{creds.tenancy_id}/{creds.user_id}/{creds.key_fingerprint}"
        auth_header = (
            'Signature version="1",'
            f'headers="(request-target) date host",'
            f'keyId="{key_id}",'
            'algorithm="rsa-sha256",'
            f'signature="{signature}"'
        )
        return {
            "Authorization": auth_header,
            "Date": date_header,
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, url: str, **params) -> httpx.Response:
        if params:
            sep = "&" if "?" in url else "?"
            url = url + sep + "&".join(f"{k}={v}" for k, v in params.items())
        return await client.get(url, headers=self._signed_headers("GET", url), timeout=_TIMEOUT)

    async def _namespace_name(self, client: httpx.AsyncClient) -> str:
        if self._namespace is not None:
            return self._namespace
        url = f"https://{self.credentials.object_storage_host()}/n/"
        resp = await self._get(client, url)
        resp.raise_for_status()
        # The namespace endpoint returns the bare namespace string as JSON.
        self._namespace = str(resp.json()).strip('"')
        return self._namespace

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            url = f"https://{self.credentials.identity_host()}/20160918/users/{self.credentials.user_id}"
            resp = await self._get(client, url)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "OCI rejected the API key signature "
                    f"(HTTP {resp.status_code}). Verify the tenancy OCID, "
                    "user OCID, key fingerprint, and that the private key "
                    "matches an active API key on that user."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach OCI: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_api_keys(client),
                self._check_public_buckets(client),
                self._check_bucket_kms_encryption(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("oracle_cloud check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_stale_api_keys(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        users_url = f"https://{self.credentials.identity_host()}/20160918/users"
        resp = await self._get(client, users_url, compartmentId=self.credentials.tenancy_id)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "oracle_cloud.iam.stale_api_keys",
                "User API-signing keys are within the rotation window",
                "least_privilege",
                "Grant the signing user INSPECT/READ on group Identity in "
                "the root compartment.",
            )]
        resp.raise_for_status()
        users = resp.json()
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=_KEY_MAX_AGE_DAYS)
        stale: list[str] = []
        total_keys = 0
        for user in users:
            user_id = user.get("id", "")
            name = user.get("name", user_id)
            keys_resp = await self._get(
                client, f"https://{self.credentials.identity_host()}/20160918/users/{user_id}/apiKeys"
            )
            if keys_resp.status_code in (403, 404):
                continue
            keys_resp.raise_for_status()
            for key in keys_resp.json():
                if key.get("lifecycleState") != "ACTIVE":
                    continue
                total_keys += 1
                created = key.get("timeCreated")
                if not created:
                    continue
                try:
                    created_at = dt.datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                except ValueError:
                    continue
                if created_at < cutoff:
                    stale.append(f"{name}:{key.get('fingerprint', '')[-11:]}")
        status = "PASSED" if not stale else "FAILED"
        return [IntegrationFinding(
            check_id="oracle_cloud.iam.stale_api_keys",
            title=(f"{len(stale)} of {total_keys} active API keys are older than {_KEY_MAX_AGE_DAYS} days"
                   if stale else
                   f"All {total_keys} active API keys are within {_KEY_MAX_AGE_DAYS} days"
                   if total_keys else "No active user API-signing keys"),
            description=("Keys past rotation (user:fingerprint tail): " + ", ".join(stale[:20])
                         if stale else
                         "Every active API-signing key was created inside the "
                         "rotation window."),
            remediation=(
                "Identity & Security → Users → API keys → add a new key, "
                "update whatever consumes it, then delete the old one."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="least_privilege",
            result_details={
                "active_key_count": total_keys,
                "stale_keys": stale,
                "max_age_days": _KEY_MAX_AGE_DAYS,
            },
        )]

    async def _bucket_details(self, client: httpx.AsyncClient) -> tuple[list[dict], bool]:
        """Shared fetch: (bucket detail objects, readable) for the two Object
        Storage checks below, so a single tenancy only pays for one list +
        N detail calls instead of two."""
        namespace = await self._namespace_name(client)
        list_url = f"https://{self.credentials.object_storage_host()}/n/{namespace}/b"
        resp = await self._get(client, list_url, compartmentId=self.credentials.tenancy_id)
        if resp.status_code in (403, 404):
            return [], False
        resp.raise_for_status()
        buckets = resp.json()
        details: list[dict] = []
        for bucket in buckets:
            name = bucket.get("name", "")
            detail_resp = await self._get(
                client, f"https://{self.credentials.object_storage_host()}/n/{namespace}/b/{name}"
            )
            if detail_resp.status_code in (403, 404):
                continue
            detail_resp.raise_for_status()
            details.append(detail_resp.json())
        return details, True

    async def _check_public_buckets(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        details, readable = await self._bucket_details(client)
        if not readable:
            return [self._unavailable(
                "oracle_cloud.object_storage.public_buckets",
                "Object Storage buckets do not allow public access",
                "network_security",
                "Grant the signing user INSPECT/READ on object-family "
                "resources in the root compartment.",
            )]
        public_buckets = [
            b.get("name", "") for b in details
            if b.get("publicAccessType", "NoPublicAccess") != "NoPublicAccess"
        ]
        status = "PASSED" if not public_buckets else "FAILED"
        return [IntegrationFinding(
            check_id="oracle_cloud.object_storage.public_buckets",
            title=(f"{len(public_buckets)} of {len(details)} Object Storage buckets allow public access"
                   if public_buckets else
                   f"All {len(details)} Object Storage buckets are private"
                   if details else "No Object Storage buckets found"),
            description=("Public buckets: " + ", ".join(public_buckets[:20])
                         if public_buckets else
                         "Every checked bucket has its public access type set "
                         "to NoPublicAccess."),
            remediation=(
                "Storage → Buckets → bucket → Edit Visibility → set to "
                "Private, and use pre-authenticated requests for controlled "
                "public access instead."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="network_security",
            result_details={
                "bucket_count": len(details),
                "public_buckets": public_buckets,
            },
        )]

    async def _check_bucket_kms_encryption(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        details, readable = await self._bucket_details(client)
        if not readable:
            return [self._unavailable(
                "oracle_cloud.object_storage.kms_encryption",
                "Object Storage buckets use a customer-managed encryption key",
                "encryption_at_rest",
                "Grant the signing user INSPECT/READ on object-family "
                "resources in the root compartment.",
            )]
        without_kms = [b.get("name", "") for b in details if not b.get("kmsKeyId")]
        # Object Storage encrypts every object with an Oracle-managed key by
        # default, so a missing customer key is a hardening gap, not a raw
        # failure to encrypt at all.
        status = "PASSED" if not without_kms else "WARNING"
        return [IntegrationFinding(
            check_id="oracle_cloud.object_storage.kms_encryption",
            title=(f"{len(without_kms)} of {len(details)} buckets use Oracle-managed encryption only"
                   if without_kms else
                   f"All {len(details)} buckets use a customer-managed KMS key"
                   if details else "No Object Storage buckets found"),
            description=("Without a customer-managed key: " + ", ".join(without_kms[:20])
                         if without_kms else
                         "Every checked bucket encrypts objects with a "
                         "customer-managed Vault key. All buckets are "
                         "encrypted at rest regardless; this tracks who "
                         "controls the key."),
            remediation=(
                "Storage → Buckets → bucket → Edit Encryption Key → assign a "
                "Vault key you control, so key rotation and revocation are "
                "in your hands rather than Oracle's default managed key."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "LOW",
            check_category="encryption_at_rest",
            result_details={
                "bucket_count": len(details),
                "buckets_without_customer_key": without_kms,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from OCI with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
