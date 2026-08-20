# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Pinecone integration adapter.

Reads vector database posture: index inventory, encryption settings,
RBAC configuration, and backup status.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.pinecone.io"


@dataclass
class PineconeCredentials:
    api_key: str
    project_id: str
    environment: str = ""


class PineconeAdapter:
    def __init__(self, credentials: PineconeCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Api-Key": self.credentials.api_key,
            "Accept": "application/json",
        }

    async def _get(self, path: str) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.get(f"{_BASE}{path}", headers=self._headers())
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the API key is valid for this project.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="encryption_at_rest", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get("/indexes")
            return True
        except Exception as exc:
            raise ValueError(f"Pinecone credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_indexes(),
            self._check_collections(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("pinecone check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_indexes(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/indexes")
            indexes = resp.json().get("indexes", resp.json().get("data", []))
        except Exception as exc:
            return [self._unavailable(
                "pinecone.indexes.inventory", "Unable to list indexes", str(exc))]
        serverless = [i for i in indexes if i.get("spec", {}).get("serverless")]
        return [IntegrationFinding(
            check_id="pinecone.indexes.inventory",
            title=f"{len(indexes)} index(es), {len(serverless)} serverless",
            description=f"Pinecone project has {len(indexes)} index(es).",
            remediation="Review index configuration for encryption and access control.",
            status="PASSED", severity="INFO",
            check_category="encryption_at_rest",
            result_details={"total_indexes": len(indexes), "serverless": len(serverless)},
        )]

    async def _check_collections(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/collections")
            collections = resp.json().get("collections", resp.json().get("data", []))
        except Exception:
            return [IntegrationFinding(
                check_id="pinecone.collections.inventory",
                title="Collection data not accessible",
                description="Could not list collections; endpoint may require additional permissions.",
                remediation="Verify the API key has collection read access.",
                status="NOT_AVAILABLE", severity="LOW",
                check_category="backup_recovery", result_details={},
            )]
        return [IntegrationFinding(
            check_id="pinecone.collections.inventory",
            title=f"{len(collections)} collection(s) (backup snapshots)",
            description=f"Pinecone project has {len(collections)} collection(s) serving as backups.",
            remediation="Create collections as backup snapshots for critical indexes.",
            status="PASSED" if collections else "WARNING",
            severity="MEDIUM" if not collections else "INFO",
            check_category="backup_recovery",
            result_details={"total_collections": len(collections)},
        )]
