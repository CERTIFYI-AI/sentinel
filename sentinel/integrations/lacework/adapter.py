# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Lacework integration adapter.

Reads cloud-security posture from the Lacework platform: compliance
violations, vulnerability host assessments, and agent coverage.
Auth: account + api_key + api_credential (generated from Lacework
Console > Settings > API Keys). Token exchange via /api/v2/access/tokens.
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
class LaceworkCredentials:
    """Matches dashboard/src/integrations/lacework/config.ts credentialFields."""

    account: str
    api_key: str
    api_credential: str

    def base_url(self) -> str:
        acct = self.account.rstrip("/")
        if "." not in acct:
            return f"https://{acct}.lacework.net"
        return f"https://{acct}"


class LaceworkAdapter:
    """Fetches cloud-security findings from Lacework."""

    def __init__(self, credentials: LaceworkCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Exchange API key for a temporary access token."""
        if self._token:
            return self._token
        resp = await client.post(
            f"{self.credentials.base_url()}/api/v2/access/tokens",
            json={"keyId": self.credentials.api_key, "expiryTime": 3600},
            headers={
                "X-LW-UAKS": self.credentials.api_credential,
                "Content-Type": "application/json",
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Lacework rejected the API key. Verify the account name, "
                "API key, and credential are correct."
            )
        resp.raise_for_status()
        self._token = resp.json().get("data", [{}])[0].get("token", "")
        return self._token

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        return await client.get(
            f"{self.credentials.base_url()}{path}",
            headers=self._headers(token),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Lacework: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_compliance_violations(client),
                self._check_host_vulnerabilities(client),
                self._check_agent_status(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("lacework check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_compliance_violations(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/api/v2/Configs/ComplianceEvaluations",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "lacework.compliance.violations",
                "Compliance violations",
                "vulnerability_management",
                "Grant the API key read access to compliance data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data", [])
        critical = [i for i in items if i.get("severity") in ("Critical", "1")]
        passed = len(critical) == 0
        return [IntegrationFinding(
            check_id="lacework.compliance.violations",
            title="No critical compliance violations",
            description=(
                f"{len(critical)} critical compliance violation(s) "
                f"out of {len(items)} evaluation(s)."
            ),
            remediation=(
                "Remediate critical compliance violations. Review Lacework's "
                "compliance dashboard for guided remediation."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL" if critical else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_evaluations": len(items),
                "critical_violations": len(critical),
            },
        )]

    async def _check_host_vulnerabilities(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/api/v2/Vulnerabilities/Hosts",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "lacework.vulns.host_critical",
                "Critical host vulnerabilities",
                "vulnerability_management",
                "Grant the API key read access to vulnerability data.",
            )]
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data", [])
        critical = [i for i in items if i.get("severity") in ("Critical", "1")]
        passed = len(critical) == 0
        return [IntegrationFinding(
            check_id="lacework.vulns.host_critical",
            title="No critical host vulnerabilities",
            description=f"{len(critical)} critical host vulnerability/vulnerabilities found.",
            remediation=(
                "Patch hosts with critical vulnerabilities. Use Lacework's "
                "host vulnerability assessment for prioritisation."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL" if critical else "INFO",
            check_category="vulnerability_management",
            result_details={"critical_host_vuln_count": len(critical)},
        )]

    async def _check_agent_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/api/v2/AgentInfo")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "lacework.agents.coverage",
                "Agent coverage",
                "endpoint_protection",
                "Grant the API key read access to agent information.",
            )]
        resp.raise_for_status()
        data = resp.json()
        agents = data.get("data", [])
        total = len(agents)
        return [IntegrationFinding(
            check_id="lacework.agents.coverage",
            title="Lacework agents deployed",
            description=f"{total} Lacework agent(s) reporting.",
            remediation=(
                "Deploy Lacework agents to all production hosts for "
                "complete workload visibility."
            ),
            status="PASSED" if total > 0 else "WARNING",
            severity="MEDIUM" if total == 0 else "INFO",
            check_category="endpoint_protection",
            result_details={"agent_count": total},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Lacework with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
