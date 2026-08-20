# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Hugging Face Enterprise integration adapter.

Reads organisation-level model repositories, member lists, and
supply-chain posture from the Hugging Face Hub API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://huggingface.co/api"


@dataclass
class HuggingFaceCredentials:
    access_token: str
    organization: str


class HuggingFaceAdapter:
    def __init__(self, credentials: HuggingFaceCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.access_token}",
            "Accept": "application/json",
        }

    async def _get(self, path: str, **params: str) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=_TIMEOUT)
        try:
            resp = await client.get(f"{_BASE}{path}", headers=self._headers(), params=params)
            resp.raise_for_status()
            return resp
        finally:
            if not self._client:
                await client.aclose()

    def _unavailable(self, check_id: str, title: str, reason: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title, description=reason,
            remediation="Verify the access token has read scope for the organisation.",
            status="NOT_AVAILABLE", severity="LOW",
            check_category="access_control", result_details={"error": reason},
        )

    async def validate(self) -> bool:
        try:
            await self._get(f"/organizations/{self.credentials.organization}")
            return True
        except Exception as exc:
            raise ValueError(f"Hugging Face credentials rejected: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        checks = (
            self._check_org_members(),
            self._check_model_repos(),
            self._check_model_licenses(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for r in results:
            if isinstance(r, BaseException):
                logger.warning("hf check failed: %s", r)
                continue
            findings.extend(r)
        return findings

    async def _check_org_members(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get(f"/organizations/{self.credentials.organization}/members")
            members = resp.json()
        except Exception as exc:
            return [self._unavailable(
                "hf.org.members", "Unable to list organisation members", str(exc))]
        admins = [m for m in members if m.get("role") == "admin"]
        return [IntegrationFinding(
            check_id="hf.org.members",
            title=f"{len(members)} member(s), {len(admins)} admin(s)",
            description=f"The Hugging Face org has {len(members)} member(s) "
                        f"with {len(admins)} admin(s).",
            remediation="Review membership quarterly and limit admin access.",
            status="PASSED", severity="INFO",
            check_category="access_control",
            result_details={"total_members": len(members), "admins": len(admins)},
        )]

    async def _check_model_repos(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/models", author=self.credentials.organization)
            models = resp.json()
        except Exception as exc:
            return [self._unavailable(
                "hf.models.inventory", "Unable to list model repositories", str(exc))]
        private = [m for m in models if m.get("private")]
        return [IntegrationFinding(
            check_id="hf.models.inventory",
            title=f"{len(models)} model repo(s), {len(private)} private",
            description=f"The org has {len(models)} model repositor(ies), "
                        f"{len(private)} private.",
            remediation="Review public model repos for unintentional exposure.",
            status="PASSED" if not models or private else "WARNING",
            severity="MEDIUM" if models and not private else "INFO",
            check_category="data_classification",
            result_details={"total": len(models), "private": len(private)},
        )]

    async def _check_model_licenses(self) -> list[IntegrationFinding]:
        try:
            resp = await self._get("/models", author=self.credentials.organization)
            models = resp.json()
        except Exception as exc:
            return [self._unavailable(
                "hf.models.licenses", "Unable to check model licenses", str(exc))]
        no_license: list[str] = []
        for m in models:
            tags = m.get("tags", [])
            has_license = any(t.startswith("license:") for t in tags)
            if not has_license:
                no_license.append(m.get("modelId", "unknown"))
        return [IntegrationFinding(
            check_id="hf.models.licenses",
            title=(f"{len(no_license)} model(s) lack a declared license"
                   if no_license else
                   "All models have declared licenses"),
            description=("Models without license: " + ", ".join(no_license[:10])
                         if no_license else
                         "Every model repository has a license tag."),
            remediation="Add a license to every model repository for supply-chain compliance.",
            status="PASSED" if not no_license else "WARNING",
            severity="MEDIUM" if no_license else "INFO",
            check_category="vendor_management",
            result_details={"unlicensed": no_license[:20], "total": len(models)},
        )]
