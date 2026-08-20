# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Weights & Biases (W&B) integration adapter.

Reads experiment tracking posture: team members, project inventory,
and dataset versioning from the W&B API.
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
class WandbCredentials:
    api_key: str
    entity: str
    host: str = "https://api.wandb.ai"


class WandbAdapter:
    def __init__(self, credentials: WandbCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    @property
    def _base(self) -> str:
        return self.credentials.host.rstrip("/")

    async def _gql(self, query: str, variables: dict | None = None) -> dict:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.post(
                f"{self._base}/graphql", headers=self._headers(),
                json={"query": query, "variables": variables or {}},
            )
            resp.raise_for_status()
            return resp.json()
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the API key and entity name are correct.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="audit_logging", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            result = await self._gql("query { viewer { id username } }")
            if "errors" in result:
                raise ValueError(result["errors"][0].get("message", "Unknown error"))
            return True
        except Exception as exc:
            raise ValueError(f"W&B credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_team_members(),
            self._check_projects(),
            self._check_artifacts(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("wandb check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_team_members(self) -> list[IntegrationFinding]:
        query = """query($entity: String!) {
            entity(name: $entity) { members { edges { node { username admin } } } }
        }"""
        try:
            result = await self._gql(query, {"entity": self.credentials.entity})
            edges = result.get("data", {}).get("entity", {}).get("members", {}).get("edges", [])
            members = [e["node"] for e in edges]
        except Exception as exc:
            return [self._unavailable(
                "wandb.team.members", "Unable to list team members", str(exc))]
        admins = [m for m in members if m.get("admin")]
        return [IntegrationFinding(
            check_id="wandb.team.members",
            title=f"{len(members)} team member(s), {len(admins)} admin(s)",
            description=f"The W&B entity has {len(members)} member(s) with {len(admins)} admin(s).",
            remediation="Review team membership and limit admin access.",
            status="PASSED", severity="INFO",
            check_category="access_control",
            result_details={"total_members": len(members), "admins": len(admins)},
        )]

    async def _check_projects(self) -> list[IntegrationFinding]:
        query = """query($entity: String!) {
            entity(name: $entity) { projects { edges { node { name access } } } }
        }"""
        try:
            result = await self._gql(query, {"entity": self.credentials.entity})
            edges = result.get("data", {}).get("entity", {}).get("projects", {}).get("edges", [])
            projects = [e["node"] for e in edges]
        except Exception as exc:
            return [self._unavailable(
                "wandb.projects.inventory", "Unable to list projects", str(exc))]
        public = [p for p in projects if p.get("access") == "public"]
        return [IntegrationFinding(
            check_id="wandb.projects.inventory",
            title=f"{len(projects)} project(s), {len(public)} public",
            description=f"The entity has {len(projects)} project(s), {len(public)} publicly accessible.",
            remediation="Review public project visibility for data-leakage risk.",
            status="PASSED" if not public else "WARNING",
            severity="MEDIUM" if public else "INFO",
            check_category="data_classification",
            result_details={"total": len(projects), "public": len(public)},
        )]

    async def _check_artifacts(self) -> list[IntegrationFinding]:
        query = """query($entity: String!) {
            entity(name: $entity) { projects { edges { node {
                artifactTypes { edges { node { name artifactCollections { totalCount } } } }
            } } } }
        }"""
        try:
            result = await self._gql(query, {"entity": self.credentials.entity})
            edges = result.get("data", {}).get("entity", {}).get("projects", {}).get("edges", [])
            total_artifacts = 0
            for e in edges:
                for at in e.get("node", {}).get("artifactTypes", {}).get("edges", []):
                    total_artifacts += at.get("node", {}).get("artifactCollections", {}).get("totalCount", 0)
        except Exception:
            return [IntegrationFinding(
                check_id="wandb.artifacts.lineage",
                title="Artifact lineage data not accessible",
                description="Could not read artifact data for lineage tracking.",
                remediation="Verify the API key has artifact read access.",
                status="NOT_AVAILABLE", severity="LOW",
                check_category="audit_logging", result_details={},
            )]
        return [IntegrationFinding(
            check_id="wandb.artifacts.lineage",
            title=f"{total_artifacts} artifact collection(s) tracked",
            description=f"W&B is tracking {total_artifacts} artifact collection(s) for lineage.",
            remediation="Ensure all training datasets and model checkpoints use artifact versioning.",
            status="PASSED" if total_artifacts > 0 else "WARNING",
            severity="MEDIUM" if total_artifacts == 0 else "INFO",
            check_category="audit_logging",
            result_details={"total_artifacts": total_artifacts},
        )]
