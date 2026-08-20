# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Weaviate integration adapter.

Reads vector database posture: schema classes, multi-tenancy isolation,
and cluster health from the Weaviate REST API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class WeaviateCredentials:
    api_key: str
    cluster_url: str


class WeaviateAdapter:
    def __init__(self, credentials: WeaviateCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
        }

    @property
    def _base(self) -> str:
        return self.credentials.cluster_url.rstrip("/")

    async def _get(self, path: str) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.get(f"{self._base}{path}", headers=self._headers())
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the API key and cluster URL are correct.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="access_control", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get("/v1/meta")
            return True
        except Exception as exc:
            raise ValueError(f"Weaviate credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_schema(),
            self._check_cluster_health(),
            self._check_multi_tenancy(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("weaviate check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_schema(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/v1/schema")
            classes = resp.json().get("classes", [])
        except Exception as exc:
            return [self._unavailable(
                "weaviate.schema.classes", "Unable to list schema classes", str(exc))]
        return [IntegrationFinding(
            check_id="weaviate.schema.classes",
            title=f"{len(classes)} schema class(es)",
            description=f"The Weaviate cluster has {len(classes)} class(es) defined.",
            remediation="Review schema classes for appropriate vectorizer and module configuration.",
            status="PASSED", severity="INFO",
            check_category="data_classification",
            result_details={"class_count": len(classes)},
        )]

    async def _check_cluster_health(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/v1/nodes")
            nodes = resp.json().get("nodes", [])
        except Exception:
            return [IntegrationFinding(
                check_id="weaviate.cluster.health",
                title="Cluster health not accessible",
                description="Could not read cluster node status.",
                remediation="Verify the API key has cluster admin access.",
                status="NOT_AVAILABLE", severity="MEDIUM",
                check_category="encryption_in_transit", result_details={},
            )]
        unhealthy = [n for n in nodes if n.get("status") != "HEALTHY"]
        return [IntegrationFinding(
            check_id="weaviate.cluster.health",
            title=("All nodes healthy" if not unhealthy
                   else f"{len(unhealthy)} unhealthy node(s)"),
            description=(f"All {len(nodes)} node(s) are healthy."
                         if not unhealthy else
                         f"{len(unhealthy)} of {len(nodes)} node(s) are not healthy."),
            remediation="Investigate unhealthy nodes." if unhealthy else "No action required.",
            status="PASSED" if not unhealthy else "WARNING",
            severity="HIGH" if unhealthy else "INFO",
            check_category="encryption_in_transit",
            result_details={"total_nodes": len(nodes), "unhealthy": len(unhealthy)},
        )]

    async def _check_multi_tenancy(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/v1/schema")
            classes = resp.json().get("classes", [])
        except Exception as exc:
            return [self._unavailable(
                "weaviate.tenancy.isolation", "Unable to check multi-tenancy", str(exc))]
        mt_enabled = [c for c in classes if c.get("multiTenancyConfig", {}).get("enabled")]
        return [IntegrationFinding(
            check_id="weaviate.tenancy.isolation",
            title=(f"{len(mt_enabled)} of {len(classes)} class(es) have multi-tenancy"
                   if classes else "No classes to check"),
            description=(f"{len(mt_enabled)} class(es) enforce tenant isolation."
                         if classes else "No schema classes found."),
            remediation="Enable multi-tenancy on classes storing tenant-specific data.",
            status="PASSED" if mt_enabled or not classes else "WARNING",
            severity="MEDIUM" if classes and not mt_enabled else "INFO",
            check_category="access_control",
            result_details={"total_classes": len(classes), "mt_enabled": len(mt_enabled)},
        )]
