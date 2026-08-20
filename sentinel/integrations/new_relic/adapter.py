# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""New Relic integration adapter.

Reads observability posture from New Relic: alert conditions, open
incidents/violations, and NerdGraph API access for audit evidence.
Auth: account_id + api_key (User API key from New Relic > API Keys).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_NERDGRAPH = "https://api.newrelic.com/graphql"
_REST_BASE = "https://api.newrelic.com/v2"


@dataclass
class NewRelicCredentials:
    """Matches dashboard/src/integrations/new_relic/config.ts credentialFields."""

    account_id: str
    api_key: str


class NewRelicAdapter:
    """Fetches observability posture from New Relic."""

    def __init__(self, credentials: NewRelicCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Api-Key": self.credentials.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _nerdgraph(self, client: httpx.AsyncClient, query: str, variables: dict | None = None) -> dict:
        payload: dict = {"query": query}
        if variables:
            payload["variables"] = variables
        resp = await client.post(
            _NERDGRAPH,
            headers=self._headers(),
            json=payload,
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "New Relic rejected the API key. Verify the User key is active "
                "and has the required permissions."
            )
        resp.raise_for_status()
        return resp.json()

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_REST_BASE}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            data = await self._nerdgraph(client, "{ actor { user { email } } }")
            if "errors" in data and data["errors"]:
                raise ValueError(
                    "New Relic NerdGraph returned errors: "
                    + str(data["errors"][0].get("message", "unknown"))
                )
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach New Relic: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_alert_conditions(client),
                self._check_open_violations(client),
                self._check_nerdgraph_access(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("new_relic check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_alert_conditions(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        query = """
        {
          actor {
            account(id: %s) {
              alerts {
                policiesSearch {
                  totalCount
                }
              }
            }
          }
        }
        """ % self.credentials.account_id
        try:
            data = await self._nerdgraph(client, query)
        except Exception:
            return [self._unavailable(
                "newrelic.alerts.policy_count",
                "Alert policy count",
                "audit_logging",
                "Grant the API key read access to alert policies.",
            )]
        account = data.get("data", {}).get("actor", {}).get("account", {})
        total = account.get("alerts", {}).get("policiesSearch", {}).get("totalCount", 0)
        return [IntegrationFinding(
            check_id="newrelic.alerts.policy_count",
            title="Alert policies are configured",
            description=f"{total} alert policy/policies configured in the account.",
            remediation=(
                "Configure alert policies to detect anomalies in application "
                "performance and infrastructure health."
            ),
            status="PASSED" if total > 0 else "WARNING",
            severity="MEDIUM" if total == 0 else "INFO",
            check_category="audit_logging",
            result_details={"policy_count": total},
        )]

    async def _check_open_violations(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client, "/alerts_violations.json",
            only_open="true",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "newrelic.alerts.open_violations",
                "Open alert violations",
                "vulnerability_management",
                "Grant the API key read access to alert violations.",
            )]
        resp.raise_for_status()
        data = resp.json()
        violations = data.get("violations", [])
        critical = [v for v in violations if v.get("priority") == "critical"]
        passed = len(critical) == 0
        return [IntegrationFinding(
            check_id="newrelic.alerts.open_violations",
            title="No critical open alert violations",
            description=(
                f"{len(violations)} open violation(s), {len(critical)} critical."
            ),
            remediation=(
                "Investigate and resolve critical alert violations. "
                "Persistent violations may indicate reliability issues."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if critical else "INFO",
            check_category="vulnerability_management",
            result_details={
                "total_open": len(violations),
                "critical_count": len(critical),
            },
        )]

    async def _check_nerdgraph_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        try:
            data = await self._nerdgraph(client, "{ actor { user { email } } }")
            user_email = data.get("data", {}).get("actor", {}).get("user", {}).get("email", "")
            accessible = bool(user_email)
        except Exception:
            return [self._unavailable(
                "newrelic.api.nerdgraph_access",
                "NerdGraph API accessible",
                "audit_logging",
                "Verify the API key has NerdGraph access.",
            )]
        return [IntegrationFinding(
            check_id="newrelic.api.nerdgraph_access",
            title="NerdGraph API is accessible for audit queries",
            description=(
                "The NerdGraph API responded. Audit evidence and NRQL queries "
                "can be used for compliance."
            ),
            remediation="No action required.",
            status="PASSED" if accessible else "WARNING",
            severity="INFO",
            check_category="audit_logging",
            result_details={"nerdgraph_accessible": accessible},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from New Relic with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
