# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""OVHcloud integration adapter.

Reads Public Cloud security posture from the OVHcloud API: API credentials
with no expiration, Object Storage containers with public read access, and
Block Storage volumes with no snapshot.

Auth: OVHcloud's 3-key scheme — Application Key, Application Secret and
Consumer Key — signed per request as ``$1$`` + SHA1(...). There is no
separate token exchange call: every request is individually signed, the
same shape as NetSuite's OAuth1 TBA in
``sentinel/integrations/netsuite/adapter.py``.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class OvhcloudCredentials:
    """Matches dashboard/src/integrations/ovhcloud/config.ts credentialFields."""

    application_key: str
    application_credential: str
    consumer_credential: str
    #: Regional API endpoint. OVHcloud runs separate endpoints per region;
    #: "eu" covers most European/legacy accounts.
    api_endpoint: str = "https://eu.api.ovh.com/1.0"


class OvhcloudAdapter:
    """Fetches Public Cloud security posture from an OVHcloud account.

    Signing is a lightweight, single-purpose implementation of OVH's
    documented ``$1$`` request-signature scheme — not a general OVH API
    client — scoped to exactly what a single GET request needs. It has no
    server-clock synchronisation (``/auth/time``), which OVH's own SDKs use
    to tolerate clock drift; a host with a skewed clock may see signature
    failures surface as validate() errors rather than a clean auth check.
    """

    def __init__(self, credentials: OvhcloudCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    def _signed_headers(self, method: str, url: str, body: str = "") -> dict[str, str]:
        creds = self.credentials
        timestamp = str(int(time.time()))
        # OVH's documented signature: "$1$" + sha1("AS+CK+METHOD+URL+BODY+TS").
        # Neither the application credential nor the consumer credential is
        # logged; only the resulting digest leaves this function.
        to_sign = "+".join([
            creds.application_credential,
            creds.consumer_credential,
            method.upper(),
            url,
            body,
            timestamp,
        ])
        # SHA1 is OVH's documented, non-negotiable API v6 signature algorithm
        # (https://api.ovh.com/g934.first_step_with_api) — OVH's servers
        # compute and compare the signature with SHA1 themselves, so using a
        # stronger hash here would not weaken anything; it would just make
        # every signed request fail authentication.
        # nosemgrep: python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-sha1
        signature = "$1$" + hashlib.sha1(to_sign.encode()).hexdigest()  # noqa: S324
        return {
            "X-Ovh-Application": creds.application_key,
            "X-Ovh-Consumer": creds.consumer_credential,
            "X-Ovh-Timestamp": timestamp,
            "X-Ovh-Signature": signature,
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        url = f"{self.credentials.api_endpoint}{path}"
        return await client.get(
            url,
            headers=self._signed_headers("GET", url),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "OVHcloud rejected the application/consumer credentials "
                    f"(HTTP {resp.status_code}). Verify the application key, "
                    "application credential, and consumer credential, and "
                    "that the consumer key has not expired."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach OVHcloud: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_non_expiring_credentials(client),
                self._check_public_storage_containers(client),
                self._check_volumes_without_snapshots(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("ovhcloud check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_non_expiring_credentials(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/me/api/credential")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ovhcloud.iam.non_expiring_credentials",
                "API consumer credentials have an expiration",
                "access_control",
                "Grant this consumer key read access to /me/api/credential.",
            )]
        resp.raise_for_status()
        credential_ids = resp.json()
        non_expiring: list[str] = []
        total = 0
        for cred_id in credential_ids:
            detail_resp = await self._get(client, f"/me/api/credential/{cred_id}")
            if detail_resp.status_code in (403, 404):
                continue
            detail_resp.raise_for_status()
            detail = detail_resp.json()
            total += 1
            if not detail.get("expiration"):
                non_expiring.append(str(detail.get("credentialId", cred_id)))
        status = "PASSED" if not non_expiring else "WARNING"
        return [IntegrationFinding(
            check_id="ovhcloud.iam.non_expiring_credentials",
            title=(f"{len(non_expiring)} of {total} API credentials never expire"
                   if non_expiring else
                   f"All {total} API credentials have an expiration" if total
                   else "No API credentials found"),
            description=("Non-expiring consumer keys: " + ", ".join(non_expiring[:20])
                         if non_expiring else
                         "Every consumer key issued for this account has an "
                         "expiration date."),
            remediation=(
                "API → Your tokens → revoke long-lived consumer keys, and "
                "request new ones with an explicit validity period for "
                "automation that does not need permanent access."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={
                "credential_count": total,
                "non_expiring_credentials": non_expiring,
            },
        )]

    async def _check_public_storage_containers(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        projects_resp = await self._get(client, "/cloud/project")
        if projects_resp.status_code in (403, 404):
            return [self._unavailable(
                "ovhcloud.storage.public_containers",
                "Object Storage containers are not publicly readable",
                "network_security",
                "Grant this consumer key read access to Public Cloud "
                "projects and storage.",
            )]
        projects_resp.raise_for_status()
        projects = projects_resp.json()

        public_containers: list[str] = []
        total_containers = 0
        for project_id in projects:
            storage_resp = await self._get(client, f"/cloud/project/{project_id}/storage")
            if storage_resp.status_code in (403, 404):
                continue
            storage_resp.raise_for_status()
            for container in storage_resp.json():
                total_containers += 1
                if container.get("containerType", "").lower() == "public":
                    public_containers.append(
                        f"{project_id}:{container.get('name', container.get('id', ''))}"
                    )
        status = "PASSED" if not public_containers else "FAILED"
        return [IntegrationFinding(
            check_id="ovhcloud.storage.public_containers",
            title=(f"{len(public_containers)} of {total_containers} Object Storage containers are public"
                   if public_containers else
                   f"All {total_containers} Object Storage containers are private"
                   if total_containers else "No Object Storage containers found"),
            description=("Public containers: " + ", ".join(public_containers[:20])
                         if public_containers else
                         "Every Object Storage container across the checked "
                         "projects is set to private."),
            remediation=(
                "Public Cloud → Object Storage → container → change "
                "visibility from Public to Private, and use pre-signed URLs "
                "or a CDN for controlled public access instead."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="network_security",
            result_details={
                "project_count": len(projects),
                "container_count": total_containers,
                "public_containers": public_containers,
            },
        )]

    async def _check_volumes_without_snapshots(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        projects_resp = await self._get(client, "/cloud/project")
        if projects_resp.status_code in (403, 404):
            return [self._unavailable(
                "ovhcloud.storage.volumes_without_snapshots",
                "Block Storage volumes have at least one snapshot",
                "backup_recovery",
                "Grant this consumer key read access to Public Cloud "
                "volumes and snapshots.",
            )]
        projects_resp.raise_for_status()
        projects = projects_resp.json()

        without_snapshot: list[str] = []
        total_volumes = 0
        for project_id in projects:
            volumes_resp = await self._get(client, f"/cloud/project/{project_id}/volume")
            if volumes_resp.status_code in (403, 404):
                continue
            volumes_resp.raise_for_status()
            volumes = volumes_resp.json()

            snapshots_resp = await self._get(client, f"/cloud/project/{project_id}/volume/snapshot")
            snapshotted_ids: set[str] = set()
            if snapshots_resp.status_code not in (403, 404):
                snapshots_resp.raise_for_status()
                for snap in snapshots_resp.json():
                    if snap.get("volumeId"):
                        snapshotted_ids.add(snap["volumeId"])

            for volume in volumes:
                total_volumes += 1
                if volume.get("id") not in snapshotted_ids:
                    without_snapshot.append(f"{project_id}:{volume.get('name', volume.get('id', ''))}")
        status = "PASSED" if not without_snapshot else "WARNING"
        return [IntegrationFinding(
            check_id="ovhcloud.storage.volumes_without_snapshots",
            title=(f"{len(without_snapshot)} of {total_volumes} volumes have no snapshot"
                   if without_snapshot else
                   f"All {total_volumes} volumes have at least one snapshot"
                   if total_volumes else "No Block Storage volumes found"),
            description=("Without any snapshot: " + ", ".join(without_snapshot[:20])
                         if without_snapshot else
                         "Every Block Storage volume across the checked "
                         "projects has at least one recorded snapshot."),
            remediation=(
                "Public Cloud → Volumes → create a snapshot, or schedule "
                "recurring snapshots so a volume can be restored after "
                "accidental deletion or corruption."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="backup_recovery",
            result_details={
                "project_count": len(projects),
                "volume_count": total_volumes,
                "volumes_without_snapshots": without_snapshot,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from OVHcloud with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
