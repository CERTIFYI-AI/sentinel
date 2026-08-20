# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Wiz integration adapter.

Reads cloud-native application protection posture from the Wiz
GraphQL API: critical issue count, cloud configuration findings,
and vulnerability assessment for vulnerability management, access
control, and network security evidence.

Auth: OAuth2 client_id + client_credential against a tenant-specific
API URL.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://auth.app.wiz.io/oauth/token"


@dataclass
class WizCredentials:
    """Matches dashboard/src/integrations/wiz/config.ts credentialFields."""

    api_url: str
    client_id: str
    client_credential: str

    def graphql_url(self) -> str:
        return self.api_url.rstrip("/")


class WizAdapter:
    """Fetches cloud security posture from Wiz."""

    def __init__(self, credentials: WizCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            _AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
                "audience": "wiz-api",
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Wiz rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID "
                "and credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _query(self, client: httpx.AsyncClient, query: str, variables: dict | None = None) -> dict:
        token = await self._authenticate(client)
        resp = await client.post(
            self.credentials.graphql_url(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"query": query, "variables": variables or {}},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (403, 404):
            return {"errors": [{"message": f"HTTP {resp.status_code}"}]}
        resp.raise_for_status()
        return resp.json()

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            result = await self._query(client, "{ currentUser { id } }")
            if "errors" in result:
                raise ValueError(
                    "Wiz GraphQL returned errors: "
                    + str(result["errors"][:1])
                )
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Wiz: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_critical_issues(client),
                self._check_cloud_config(client),
                self._check_vuln_assessment(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("wiz check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_critical_issues(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = """
        query {
            issueAnalytics(
                filterBy: { status: [OPEN, IN_PROGRESS] }
            ) {
                severityBreakdown { critical high medium low info }
            }
        }
        """
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "wiz.issues.critical_count",
                "Critical issue count",
                "vulnerability_management",
                "The credentials cannot query issue analytics. Verify "
                "the client has read:issues scope.",
            )]
        breakdown = (
            result.get("data", {})
            .get("issueAnalytics", {})
            .get("severityBreakdown", {})
        )
        critical = breakdown.get("critical", 0)
        high = breakdown.get("high", 0)
        return [IntegrationFinding(
            check_id="wiz.issues.critical_count",
            title="Critical issue count reviewed",
            description=(
                f"{critical} critical and {high} high open issue(s) in Wiz."
            ),
            remediation=(
                "Prioritise remediation of critical issues. Review high "
                "issues and assign owners for timely resolution."
            ),
            status="PASSED" if not critical else "FAILED",
            severity="CRITICAL" if critical else ("HIGH" if high else "INFO"),
            check_category="vulnerability_management",
            result_details={
                "critical_issues": critical,
                "high_issues": high,
            },
        )]

    async def _check_cloud_config(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = """
        query {
            configurationFindings(
                filterBy: { status: [OPEN] }
                first: 1
            ) {
                totalCount
                nodes {
                    severity
                }
            }
        }
        """
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "wiz.config.cloud_findings",
                "Cloud configuration findings",
                "access_control",
                "The credentials cannot query configuration findings. "
                "Verify the client has read:configurations scope.",
            )]
        findings_data = result.get("data", {}).get("configurationFindings", {})
        total = findings_data.get("totalCount", 0)
        return [IntegrationFinding(
            check_id="wiz.config.cloud_findings",
            title="Cloud configuration findings reviewed",
            description=(
                f"{total} open cloud configuration finding(s) detected."
            ),
            remediation=(
                "Review open configuration findings and remediate "
                "misconfigured cloud resources, especially those affecting "
                "access control and public exposure."
            ),
            status="PASSED" if total == 0 else "WARNING",
            severity="HIGH" if total > 0 else "INFO",
            check_category="access_control",
            result_details={
                "total_open_findings": total,
            },
        )]

    async def _check_vuln_assessment(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = """
        query {
            vulnerabilityFindings(
                filterBy: { status: [OPEN] }
                first: 1
            ) {
                totalCount
            }
        }
        """
        result = await self._query(client, query)
        if "errors" in result:
            return [self._unavailable(
                "wiz.vulns.assessment",
                "Vulnerability assessment",
                "network_security",
                "The credentials cannot query vulnerability findings. "
                "Verify the client has read:vulnerabilities scope.",
            )]
        findings_data = result.get("data", {}).get("vulnerabilityFindings", {})
        total = findings_data.get("totalCount", 0)
        return [IntegrationFinding(
            check_id="wiz.vulns.assessment",
            title="Vulnerability assessment reviewed",
            description=(
                f"{total} open vulnerability finding(s) across cloud workloads."
            ),
            remediation=(
                "Remediate open vulnerability findings, prioritising those "
                "on internet-facing or critical workloads."
            ),
            status="PASSED" if total == 0 else "WARNING",
            severity="HIGH" if total > 0 else "INFO",
            check_category="network_security",
            result_details={
                "total_open_vulns": total,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Wiz with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
