# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""ManageEngine Endpoint Central integration adapter.

Uses httpx against the ManageEngine Endpoint Central REST API.
Auth: API auth token for Endpoint Central.

Evidence source: computers, patches, configurations. ManageEngine Endpoint
Central provides agent status, patch compliance and configuration deployment
tracking for managed endpoints.

An endpoint the org's plan does not expose returns NOT_AVAILABLE rather than a
guess.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+--------------------------------------------+---------------------------+--------------------------------------------+
| check_id                                   | check_category            | Controls mapped                            |
+--------------------------------------------+---------------------------+--------------------------------------------+
| manageengine.agents.agent_status           | endpoint_protection       | SOC2 CC6.8 . ISO27001 A.8.1               |
| manageengine.patches.patch_compliance      | vulnerability_management  | SOC2 CC7.1 . ISO27001 A.12.6.1 . PCI 6.2  |
| manageengine.configs.deployment_status     | access_control            | SOC2 CC6.1 . ISO27001 A.12.5.1            |
+--------------------------------------------+---------------------------+--------------------------------------------+
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
class ManageEngineCredentials:
    """Matches dashboard/src/integrations/manageengine/config.ts credentialFields."""

    server_url: str
    api_token: str

    def base_url(self) -> str:
        return self.server_url.rstrip("/")


class ManageEngineAdapter:
    """Fetches device posture from ManageEngine Endpoint Central.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: ManageEngineCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # -- HTTP plumbing -------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_token}",
            "Accept": "application/json",
        }

    async def _get(self, client: httpx.AsyncClient, path: str, **params: object) -> httpx.Response:
        return await client.get(
            f"{self.credentials.base_url()}/api/1.4{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient()

    # -- contract ------------------------------------------------------------

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/som/computers", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"ManageEngine rejected the API token for {self.credentials.server_url!r} "
                    f"(HTTP {resp.status_code}). Check the token is active and has "
                    "read access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                f"Could not reach ManageEngine at {self.credentials.server_url!r}: {exc}"
            ) from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_agent_status(client),
                self._check_patch_compliance(client),
                self._check_config_deployment(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("manageengine check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks --------------------------------------------------------------

    async def _check_agent_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/som/computers")
        if resp.status_code == 403:
            return [self._unavailable(
                "manageengine.agents.agent_status", "Endpoint agent status",
                "endpoint_protection",
                "The API token cannot read computer data. Grant read access to "
                "the computer inventory.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        computers = payload if isinstance(payload, list) else payload.get("computers", payload.get("message_response", {}).get("computers", []))
        total = len(computers)
        inactive = [c for c in computers if str(c.get("agent_status", c.get("AgentStatus", ""))).upper() != "ACTIVE"]
        passed = len(inactive) == 0
        return [IntegrationFinding(
            check_id="manageengine.agents.agent_status",
            title="Endpoint Central agents are active on managed computers",
            description=(
                f"All {total} managed computer(s) have active agents."
                if passed else
                f"{len(inactive)} of {total} managed computer(s) have inactive or "
                "unreachable agents."
            ),
            remediation=(
                "Investigate computers with inactive agents in Endpoint Central. "
                "Reinstall or restart the agent where connectivity is confirmed."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="endpoint_protection",
            result_details={
                "total_computers": total,
                "inactive_count": len(inactive),
                "inactive_sample": [c.get("computer_name", c.get("ComputerName", c.get("id"))) for c in inactive][:20],
            },
        )]

    async def _check_patch_compliance(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/patch/allpatches", filter="missing")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "manageengine.patches.patch_compliance", "Patch compliance status",
                "vulnerability_management",
                "The API token cannot read patch data. Grant read access to "
                "the patch management module.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        patches = payload if isinstance(payload, list) else payload.get("patches", payload.get("message_response", {}).get("patches", []))
        missing = len(patches)
        passed = missing == 0
        return [IntegrationFinding(
            check_id="manageengine.patches.patch_compliance",
            title="All managed endpoints are fully patched",
            description=(
                "No missing patches detected across managed endpoints."
                if passed else
                f"{missing} missing patch(es) detected across managed endpoints."
            ),
            remediation=(
                "Review and deploy missing patches through Endpoint Central. "
                "Prioritise critical and security patches."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="vulnerability_management",
            result_details={"missing_patch_count": missing},
        )]

    async def _check_config_deployment(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/som/configurations")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "manageengine.configs.deployment_status", "Configuration deployment status",
                "access_control",
                "The API token cannot read configuration data. Grant read access "
                "to the configuration module.",
            )]
        resp.raise_for_status()
        payload = resp.json()
        configs = payload if isinstance(payload, list) else payload.get("configurations", payload.get("message_response", {}).get("configurations", []))
        total = len(configs)
        failed = [c for c in configs if str(c.get("status", c.get("Status", ""))).upper() in ("FAILED", "ERROR")]
        passed = len(failed) == 0
        return [IntegrationFinding(
            check_id="manageengine.configs.deployment_status",
            title="Configuration deployments have succeeded",
            description=(
                f"All {total} configuration(s) deployed successfully."
                if passed else
                f"{len(failed)} of {total} configuration deployment(s) have failed."
            ),
            remediation=(
                "Review failed configuration deployments in Endpoint Central. "
                "Re-deploy after fixing the root cause of the failure."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={
                "total_configurations": total,
                "failed_count": len(failed),
                "failed_sample": [c.get("config_name", c.get("ConfigName", c.get("id"))) for c in failed][:20],
            },
        )]

    # -- helpers -------------------------------------------------------------

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from ManageEngine with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
