# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Bitsight integration adapter.

Reads security-rating data from the Bitsight API: company rating,
risk vectors, and third-party portfolio ratings for vendor-risk
management evidence. Auth: a single API token (Basic auth with
token as username, empty password).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.bitsighttech.com/ratings/v1"


@dataclass
class BitsightCredentials:
    """Matches dashboard/src/integrations/bitsight/config.ts credentialFields."""

    api_key: str


class BitsightAdapter:
    """Fetches security-rating data from Bitsight."""

    def __init__(self, credentials: BitsightCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Accept": "application/json",
        }

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(username=self.credentials.api_key, password="")

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            headers=self._headers(),
            auth=self._auth(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/portfolio")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Bitsight rejected the API token. Verify the token is "
                    "active and has portfolio read access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Bitsight: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_company_rating(client),
                self._check_risk_vectors(client),
                self._check_portfolio_ratings(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("bitsight check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_company_rating(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/portfolio")
        if resp.status_code == 403:
            return [self._unavailable(
                "bitsight.company.rating",
                "Company security rating",
                "vulnerability_management",
                "Grant the API token access to the portfolio endpoint.",
            )]
        resp.raise_for_status()
        data = resp.json()
        companies = data.get("results", [])
        my_company = companies[0] if companies else {}
        rating = my_company.get("rating", 0)
        # Bitsight ratings: 250-900. >=740 is Advanced.
        passed = rating >= 740
        return [IntegrationFinding(
            check_id="bitsight.company.rating",
            title="Company security rating at Advanced level",
            description=(
                f"Current Bitsight rating: {rating}. "
                f"{'Advanced' if rating >= 740 else 'Below Advanced'} tier."
            ),
            remediation=(
                "Review the risk vectors contributing to a lower rating "
                "and remediate the highest-impact findings."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "rating": rating,
                "company_name": my_company.get("name", ""),
            },
        )]

    async def _check_risk_vectors(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/portfolio")
        if resp.status_code == 403:
            return [self._unavailable(
                "bitsight.risk.vectors",
                "Risk vector grades",
                "vulnerability_management",
                "Grant the API token access to risk vector data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        companies = data.get("results", [])
        my_company = companies[0] if companies else {}
        rating_details = my_company.get("rating_details", {})
        failing_vectors = []
        for vector_name, detail in rating_details.items():
            grade = detail.get("rating", 0) if isinstance(detail, dict) else 0
            if grade < 640:
                failing_vectors.append(vector_name)
        passed = len(failing_vectors) == 0
        return [IntegrationFinding(
            check_id="bitsight.risk.vectors",
            title="All risk vectors at acceptable grade",
            description=(
                f"{len(failing_vectors)} risk vector(s) rated below acceptable threshold."
            ),
            remediation=(
                "Focus remediation on the lowest-rated risk vectors: "
                + ", ".join(failing_vectors[:5]) + "."
                if failing_vectors else "No action required."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vulnerability_management",
            result_details={
                "failing_vectors": failing_vectors[:20],
                "failing_count": len(failing_vectors),
            },
        )]

    async def _check_portfolio_ratings(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/portfolio")
        if resp.status_code == 403:
            return [self._unavailable(
                "bitsight.portfolio.vendor_ratings",
                "Third-party vendor ratings",
                "vendor_management",
                "Grant the API token access to the portfolio endpoint.",
            )]
        resp.raise_for_status()
        data = resp.json()
        companies = data.get("results", [])
        # Skip first entry (self), the rest are monitored vendors
        vendors = companies[1:] if len(companies) > 1 else []
        low_rated = [v for v in vendors if (v.get("rating", 0) or 0) < 640]
        passed = len(low_rated) == 0
        return [IntegrationFinding(
            check_id="bitsight.portfolio.vendor_ratings",
            title="All monitored vendors rated above threshold",
            description=(
                f"{len(low_rated)} of {len(vendors)} monitored vendor(s) rated below 640."
            ),
            remediation=(
                "Engage low-rated vendors to improve their security posture "
                "or add compensating controls to the risk register."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="vendor_management",
            result_details={
                "total_vendors": len(vendors),
                "low_rated_count": len(low_rated),
                "low_rated_sample": [v.get("name", "") for v in low_rated][:10],
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Bitsight with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
