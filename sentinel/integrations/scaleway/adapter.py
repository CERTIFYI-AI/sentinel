# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Scaleway integration adapter.

Reads cloud infrastructure security posture from the Scaleway API: API keys
with no expiration date, Instance security groups that expose administrative
ports to the internet, and Block Storage volumes with no snapshot.

Auth: a single api_key (Scaleway secret key, sent as ``X-Auth-Token``).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.scaleway.com"

_ANY_IPV4 = "0.0.0.0/0"
_ANY_IPV6 = "::/0"
#: Ports whose exposure to the internet is a finding regardless of intent.
_ADMIN_PORTS = {22, 23, 3389, 445, 1433, 3306, 5432, 6379, 27017, 9200}


@dataclass
class ScalewayCredentials:
    """Matches dashboard/src/integrations/scaleway/config.ts credentialFields."""

    api_key: str
    #: Default Project ID used to scope IAM key/instance/volume listings.
    project_id: str = ""
    #: Availability zone for Instance/Block Storage calls.
    zone: str = "fr-par-1"


class ScalewayAdapter:
    """Fetches cloud security posture from a Scaleway organization."""

    def __init__(self, credentials: ScalewayCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "X-Auth-Token": self.credentials.api_key,
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

    def _project_params(self) -> dict[str, str]:
        return {"project_id": self.credentials.project_id} if self.credentials.project_id else {}

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/account/v1/organizations")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Scaleway rejected the secret key. Verify the key is "
                    "active and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Scaleway: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_non_expiring_api_keys(client),
                self._check_security_group_open_ingress(client),
                self._check_volumes_without_snapshots(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("scaleway check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_non_expiring_api_keys(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/iam/v1alpha1/api-keys", **self._project_params())
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "scaleway.iam.non_expiring_api_keys",
                "API keys have an expiration date",
                "access_control",
                "Grant this key IAMReadOnly access to list API keys.",
            )]
        resp.raise_for_status()
        keys = resp.json().get("api_keys", [])
        non_expiring = [
            k.get("description", k.get("access_key", "unknown"))
            for k in keys if not k.get("expires_at")
        ]
        status = "PASSED" if not non_expiring else "WARNING"
        return [IntegrationFinding(
            check_id="scaleway.iam.non_expiring_api_keys",
            title=(f"{len(non_expiring)} of {len(keys)} API keys never expire"
                   if non_expiring else
                   f"All {len(keys)} API keys have an expiration date" if keys
                   else "No API keys found"),
            description=("Non-expiring keys: " + ", ".join(non_expiring[:20])
                         if non_expiring else
                         "Every API key has an expiration date set."),
            remediation=(
                "IAM → API keys → set an expiration date on long-lived keys, "
                "or move workloads to short-lived keys minted per deploy."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={
                "api_key_count": len(keys),
                "non_expiring_keys": non_expiring,
            },
        )]

    async def _check_security_group_open_ingress(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        zone = self.credentials.zone
        resp = await self._get(client, f"/instance/v1/zones/{zone}/security_groups",
                               **self._project_params())
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "scaleway.instance.security_group_open_ingress",
                "Security groups keep admin ports off the internet",
                "network_security",
                "Grant this key InstancesReadOnly access to security groups.",
            )]
        resp.raise_for_status()
        groups = resp.json().get("security_groups", [])
        exposed: list[str] = []
        for group in groups:
            gid = group.get("id", "")
            name = group.get("name", gid)
            rules_resp = await self._get(
                client, f"/instance/v1/zones/{zone}/security_groups/{gid}/rules"
            )
            if rules_resp.status_code in (403, 404):
                continue
            rules_resp.raise_for_status()
            for rule in rules_resp.json().get("rules", []):
                if rule.get("direction") != "inbound" or rule.get("action") != "accept":
                    continue
                ip_range = rule.get("ip_range", "")
                if ip_range not in (_ANY_IPV4, _ANY_IPV6):
                    continue
                if rule.get("protocol") == "ANY" or rule.get("dest_port_from") is None:
                    exposed.append(f"{name} (all ports)")
                    continue
                port = rule.get("dest_port_from")
                if port in _ADMIN_PORTS:
                    exposed.append(f"{name} (port {port})")
        status = "PASSED" if not exposed else "FAILED"
        return [IntegrationFinding(
            check_id="scaleway.instance.security_group_open_ingress",
            title=(f"{len(exposed)} security groups expose admin ports to the internet"
                   if exposed else
                   f"No security group in {zone} exposes admin ports to the internet"),
            description=("Open to 0.0.0.0/0 or ::/0: " + "; ".join(exposed[:20])
                         if exposed else
                         f"All {len(groups)} security groups in {zone} keep "
                         "administrative and database ports off the public internet."),
            remediation=(
                "Restrict the inbound rule to the specific IP range that "
                "needs it, or move access behind a bastion / VPN gateway."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="network_security",
            result_details={
                "zone": zone,
                "exposed_security_groups": exposed,
                "security_group_count": len(groups),
                "admin_ports": sorted(_ADMIN_PORTS),
            },
        )]

    async def _check_volumes_without_snapshots(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        zone = self.credentials.zone
        volumes_resp = await self._get(client, f"/instance/v1/zones/{zone}/volumes",
                                       **self._project_params())
        if volumes_resp.status_code in (403, 404):
            return [self._unavailable(
                "scaleway.storage.volumes_without_snapshots",
                "Block Storage volumes have at least one snapshot",
                "backup_recovery",
                "Grant this key InstancesReadOnly access to volumes and "
                "snapshots.",
            )]
        volumes_resp.raise_for_status()
        volumes = volumes_resp.json().get("volumes", [])

        snapshots_resp = await self._get(client, f"/instance/v1/zones/{zone}/snapshots",
                                         **self._project_params())
        snapshotted_ids: set[str] = set()
        if snapshots_resp.status_code not in (403, 404):
            snapshots_resp.raise_for_status()
            for snap in snapshots_resp.json().get("snapshots", []):
                base = snap.get("base_volume") or {}
                if base.get("id"):
                    snapshotted_ids.add(base["id"])

        without_snapshot = [
            v.get("name", v.get("id", "")) for v in volumes
            if v.get("id") not in snapshotted_ids
        ]
        status = "PASSED" if not without_snapshot else "WARNING"
        return [IntegrationFinding(
            check_id="scaleway.storage.volumes_without_snapshots",
            title=(f"{len(without_snapshot)} of {len(volumes)} volumes have no snapshot"
                   if without_snapshot else
                   f"All {len(volumes)} volumes have at least one snapshot"
                   if volumes else f"No Block Storage volumes in {zone}"),
            description=("Without any snapshot: " + ", ".join(without_snapshot[:20])
                         if without_snapshot else
                         f"Every Block Storage volume in {zone} has at least one "
                         "recorded snapshot."),
            remediation=(
                "Instances → Volumes → create a snapshot, or schedule "
                "recurring snapshots so a volume can be restored after "
                "accidental deletion or corruption."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="backup_recovery",
            result_details={
                "zone": zone,
                "volume_count": len(volumes),
                "volumes_without_snapshots": without_snapshot,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Scaleway with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
