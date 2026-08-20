# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Jira Service Management integration adapter.

Built on the shared Atlassian client (``sentinel/integrations/atlassian``).
Auth: HTTP Basic with email + API token.  The token needs:

  manage:servicedesk-customer    read service desks and queues

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+------------------------------------------+---------------------------+----------------------------------------------+
| check_id                                 | check_category            | Controls mapped                              |
+------------------------------------------+---------------------------+----------------------------------------------+
| jira_sm.servicedesk.inventory            | incident_response         | SOC2 CC7.3/7.4 * ISO27001 A.16.1.1 * PCI 12 |
| jira_sm.queues.sla_enabled               | incident_response         | SOC2 CC7.3/7.4 * ISO27001 A.16.1.1 * PCI 12 |
+------------------------------------------+---------------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.atlassian import AtlassianClient, AtlassianCredentials
from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)


@dataclass
class JiraSmCredentials(AtlassianCredentials):
    """Matches dashboard/src/integrations/jira_sm/config.ts credentialFields."""


class JiraSmAdapter:
    """Fetches service desk and SLA posture from Jira Service Management.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: JiraSmCredentials, client=None) -> None:
        self.credentials = credentials
        self.atl = client if isinstance(client, AtlassianClient) else AtlassianClient(credentials, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.atl.get("/rest/servicedeskapi/info")
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Jira Service Management rejected the credentials "
                    f"(HTTP {resp.status_code}). Check the email, API token "
                    "and site URL."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not reach Jira Service Management: {exc}"
            ) from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_servicedesk_inventory(),
            self._check_sla_queues(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("jira_sm check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _get_service_desks(self) -> list[dict] | None:
        resp = await self.atl.get("/rest/servicedeskapi/servicedesk")
        if resp.status_code in (401, 403):
            return None
        resp.raise_for_status()
        return resp.json().get("values", [])

    async def _check_servicedesk_inventory(self) -> list[IntegrationFinding]:
        desks = await self._get_service_desks()
        if desks is None:
            return [self._unavailable(
                "jira_sm.servicedesk.inventory",
                "Service desk inventory",
                "incident_response",
                "Grant manage:servicedesk-customer scope to the API token.",
            )]
        count = len(desks)
        return [IntegrationFinding(
            check_id="jira_sm.servicedesk.inventory",
            title=f"{count} service desk(s) discovered",
            description=(
                f"The Jira Service Management site has {count} service desk(s). "
                + ("At least one service desk exists for incident intake."
                   if count > 0
                   else "No service desks found; incidents cannot be tracked.")
            ),
            remediation="Create at least one service desk to serve as the formal "
                        "incident intake channel.",
            status="PASSED" if count > 0 else "FAILED",
            severity="MEDIUM",
            check_category="incident_response",
            result_details={
                "desk_count": count,
                "sample": [
                    {"id": d.get("id"), "name": d.get("projectName", "")}
                    for d in desks[:20]
                ],
            },
        )]

    async def _check_sla_queues(self) -> list[IntegrationFinding]:
        desks = await self._get_service_desks()
        if desks is None:
            return [self._unavailable(
                "jira_sm.queues.sla_enabled",
                "SLA-tracked queues exist",
                "incident_response",
                "Grant manage:servicedesk-customer scope to the API token.",
            )]
        if not desks:
            return [IntegrationFinding(
                check_id="jira_sm.queues.sla_enabled",
                title="SLA-tracked queues exist",
                description="No service desks found; SLA queues cannot be evaluated.",
                remediation="Create a service desk with SLA-tracked queues for "
                            "incident response time commitments.",
                status="NOT_AVAILABLE",
                severity="HIGH",
                check_category="incident_response",
                result_details={"desk_count": 0},
            )]
        desks_with_queues: list[str] = []
        desks_without_queues: list[str] = []
        for desk in desks:
            desk_id = desk.get("id")
            desk_name = desk.get("projectName", str(desk_id))
            resp = await self.atl.get(
                f"/rest/servicedeskapi/servicedesk/{desk_id}/queue",
            )
            if resp.status_code in (401, 403):
                continue
            if resp.status_code >= 400:
                continue
            queues = resp.json().get("values", [])
            if queues:
                desks_with_queues.append(desk_name)
            else:
                desks_without_queues.append(desk_name)
        has_sla = len(desks_with_queues) > 0
        return [IntegrationFinding(
            check_id="jira_sm.queues.sla_enabled",
            title=(f"{len(desks_with_queues)} service desk(s) have queues"
                   if has_sla
                   else "No service desks have SLA-tracked queues"),
            description=(
                f"{len(desks_with_queues)} of {len(desks)} service desk(s) have "
                "at least one queue, providing evidence of SLA-tracked incident "
                "handling."
                if has_sla else
                "None of the service desks have queues configured. Without queues, "
                "there is no evidence of SLA-tracked incident handling."
            ),
            remediation="Configure queues with SLA targets (e.g. time to first "
                        "response, time to resolution) on each service desk.",
            status="PASSED" if has_sla else "FAILED",
            severity="HIGH",
            check_category="incident_response",
            result_details={
                "desks_with_queues": desks_with_queues,
                "desks_without_queues": desks_without_queues,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Jira Service Management "
                        "with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
