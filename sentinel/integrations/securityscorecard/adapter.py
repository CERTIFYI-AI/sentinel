# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""SecurityScorecard integration adapter.

Reads cyber risk ratings and issue findings from the SecurityScorecard
API v2: overall scorecard for vendor management evidence and active
issues for vulnerability management evidence.

Auth: a Bearer API token with portfolio read access.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.securityscorecard.io"


@dataclass
class SecurityScorecardCredentials:
    """Matches dashboard/src/integrations/securityscorecard/config.ts credentialFields."""

    api_token: str


class SecurityScorecardAdapter:
    """Fetches cyber risk ratings from SecurityScorecard."""

    def __init__(self, credentials: SecurityScorecardCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Token {self.credentials.api_token}",
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

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/portfolios")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "SecurityScorecard rejected the API token "
                    f"(HTTP {resp.status_code}). Verify the token is valid "
                    "and has portfolio read access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach SecurityScorecard: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_overall_score(client),
                self._check_active_issues(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("securityscorecard check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_overall_score(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/portfolios")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "securityscorecard.portfolio.overall_score",
                "Portfolio overall score",
                "vendor_management",
                "The API token cannot read portfolios. Grant portfolio read access.",
            )]
        resp.raise_for_status()
        data = resp.json()
        portfolios = data.get("entries", [])
        total = len(portfolios)
        return [IntegrationFinding(
            check_id="securityscorecard.portfolio.overall_score",
            title="Portfolio risk ratings retrievable",
            description=f"{total} portfolio(s) visible via the API for vendor risk assessment.",
            remediation=(
                "Add your critical vendors to a SecurityScorecard portfolio "
                "so their risk scores are continuously monitored."
            ),
            status="PASSED" if total > 0 else "WARNING",
            severity="MEDIUM" if total == 0 else "INFO",
            check_category="vendor_management",
            result_details={"portfolio_count": total},
        )]

    async def _check_active_issues(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/companies/my-scorecard/issues")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "securityscorecard.issues.active",
                "Active security issues",
                "vulnerability_management",
                "The API token cannot read issues. Grant scorecard read access.",
            )]
        resp.raise_for_status()
        data = resp.json()
        issues = data.get("entries", [])
        high_sev = [i for i in issues if i.get("severity", "").lower() in ("high", "critical")]
        return [IntegrationFinding(
            check_id="securityscorecard.issues.active",
            title="Active security issues reviewed",
            description=(
                f"{len(issues)} active issue(s), {len(high_sev)} rated high or critical."
            ),
            remediation=(
                "Triage high and critical issues and track remediation in the "
                "SecurityScorecard resolution workflow."
            ),
            status="PASSED" if not high_sev else "WARNING",
            severity="HIGH" if high_sev else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_issues": len(issues),
                "high_critical_count": len(high_sev),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from SecurityScorecard with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
