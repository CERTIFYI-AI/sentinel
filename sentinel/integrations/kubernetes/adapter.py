# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Kubernetes integration adapter.

Reads cluster security posture straight from the Kubernetes API server:
RBAC over-permissioning on ClusterRoleBindings, pod hardening (running as
root / missing resource limits), and whether workload secrets sit in
plain Kubernetes Secret objects rather than an external secret manager.

Auth: a service-account bearer token presented to the cluster's API
server URL.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: ClusterRoleBinding subjects that hand cluster-admin to (effectively)
#: everyone, rather than a scoped identity.
_BROAD_SUBJECTS = {"system:authenticated", "system:unauthenticated", "system:anonymous"}


@dataclass
class KubernetesCredentials:
    """Matches dashboard/src/integrations/kubernetes/config.ts credentialFields."""

    api_server_url: str
    credential: str

    def base_url(self) -> str:
        return self.api_server_url.rstrip("/")


class KubernetesAdapter:
    """Fetches cluster security posture from the Kubernetes API server."""

    def __init__(self, credentials: KubernetesCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.credential}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/api/v1/namespaces", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Kubernetes rejected the service-account token. Verify "
                    "the token is active and bound to a role with at least "
                    "read access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach the Kubernetes API server: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_rbac_over_permissioning(client),
                self._check_pod_hardening(client),
                self._check_secret_storage(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("kubernetes check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_rbac_over_permissioning(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/apis/rbac.authorization.k8s.io/v1/clusterrolebindings", limit=500
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "kubernetes.rbac.cluster_admin_bindings",
                "ClusterRoleBinding over-permissioning",
                "least_privilege",
                "Grant the service account read access to "
                "clusterrolebindings.rbac.authorization.k8s.io.",
            )]
        resp.raise_for_status()
        items = resp.json().get("items", [])
        broad_bindings = []
        for binding in items:
            role_ref = binding.get("roleRef", {})
            if role_ref.get("name") != "cluster-admin":
                continue
            subjects = binding.get("subjects") or []
            is_broad = len(subjects) > 5 or any(
                s.get("name") in _BROAD_SUBJECTS or s.get("kind") == "Group" and s.get("name") == "system:masters"
                for s in subjects
            )
            if is_broad or not subjects:
                broad_bindings.append(binding.get("metadata", {}).get("name", "unnamed"))
        passed = len(broad_bindings) == 0
        return [IntegrationFinding(
            check_id="kubernetes.rbac.cluster_admin_bindings",
            title="cluster-admin is not granted broadly",
            description=(
                f"{len(broad_bindings)} of {len(items)} ClusterRoleBinding(s) grant "
                "cluster-admin to a broad or unrestricted set of subjects."
            ),
            remediation=(
                "Scope ClusterRoleBindings that reference cluster-admin down to "
                "named service accounts or groups. Replace broad bindings with "
                "namespaced RoleBindings using least-privilege ClusterRoles."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL" if broad_bindings else "INFO",
            check_category="least_privilege",
            result_details={
                "cluster_role_binding_count": len(items),
                "broad_cluster_admin_bindings": broad_bindings,
            },
        )]

    async def _check_pod_hardening(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/api/v1/pods", limit=500)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "kubernetes.pods.hardening",
                "Pod hardening (root user, resource limits)",
                "endpoint_protection",
                "Grant the service account cluster-wide read access to pods.",
            )]
        resp.raise_for_status()
        pods = resp.json().get("items", [])
        root_pods = 0
        no_limit_pods = 0
        for pod in pods:
            spec = pod.get("spec", {})
            pod_ctx = spec.get("securityContext", {}) or {}
            containers = spec.get("containers", []) or []
            runs_as_non_root = pod_ctx.get("runAsNonRoot")
            container_declares_root = any(
                (c.get("securityContext") or {}).get("runAsNonRoot") is False
                for c in containers
            )
            if container_declares_root or runs_as_non_root is False:
                root_pods += 1
            elif runs_as_non_root is not True and not any(
                (c.get("securityContext") or {}).get("runAsNonRoot") for c in containers
            ):
                # No explicit non-root declaration anywhere in the pod: it may
                # fall back to the container image's default (often root).
                root_pods += 1
            if any(not (c.get("resources") or {}).get("limits") for c in containers):
                no_limit_pods += 1
        total = len(pods)
        passed = total > 0 and root_pods == 0 and no_limit_pods == 0
        return [IntegrationFinding(
            check_id="kubernetes.pods.hardening",
            title="Pods run as non-root with resource limits set",
            description=(
                f"Of {total} pod(s): {root_pods} may run as root (no explicit "
                f"runAsNonRoot), {no_limit_pods} have at least one container "
                "without resource limits."
            ),
            remediation=(
                "Set securityContext.runAsNonRoot: true on pod or container "
                "specs, and set resources.limits (cpu, memory) on every "
                "container to prevent noisy-neighbour and privilege-escalation "
                "risk."
            ),
            status="PASSED" if passed else ("WARNING" if total else "FAILED"),
            severity="HIGH" if root_pods else ("MEDIUM" if no_limit_pods else "INFO"),
            check_category="endpoint_protection",
            result_details={
                "pod_count": total,
                "possible_root_pods": root_pods,
                "pods_without_resource_limits": no_limit_pods,
            },
        )]

    async def _check_secret_storage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/api/v1/secrets", limit=500)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "kubernetes.secrets.storage_backend",
                "Secret storage backend",
                "secret_management",
                "Grant the service account cluster-wide read access to secrets "
                "(metadata only is sufficient).",
            )]
        resp.raise_for_status()
        items = resp.json().get("items", [])
        opaque = [
            s for s in items
            if s.get("type") == "Opaque"
            and "owner" not in (s.get("metadata", {}).get("labels", {}) or {})
        ]
        external_managed = [
            s for s in items
            if any(
                key.startswith("external-secrets.io") or key.startswith("secrets-store.csi")
                for key in (s.get("metadata", {}).get("labels", {}) or {}).keys()
            )
        ]
        total = len(items)
        passed = total == 0 or len(opaque) == 0
        return [IntegrationFinding(
            check_id="kubernetes.secrets.storage_backend",
            title="Workload secrets are not stored as plain Kubernetes Secrets",
            description=(
                f"{len(opaque)} of {total} Secret object(s) are plain Opaque "
                f"secrets with no external-secret-manager label; "
                f"{len(external_managed)} are synced from an external manager."
            ),
            remediation=(
                "Migrate application secrets to an external secret manager "
                "(e.g. HashiCorp Vault, AWS Secrets Manager) synced in via "
                "External Secrets Operator or the Secrets Store CSI driver, "
                "rather than storing plaintext-in-etcd Opaque Secrets."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if opaque else "INFO",
            check_category="secret_management",
            result_details={
                "total_secret_count": total,
                "plain_opaque_secret_count": len(opaque),
                "externally_managed_secret_count": len(external_managed),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from the Kubernetes API server with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
