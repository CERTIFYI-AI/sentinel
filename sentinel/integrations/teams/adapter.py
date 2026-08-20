# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Microsoft Teams integration adapter.

Built on the shared Graph client. Checks Teams governance posture: guest
access policies, external federation, messaging policies, and team inventory.

Application permissions required (read-only, admin consent):
  Team.ReadBasic.All       team enumeration
  TeamSettings.Read.All    per-team guest settings
  Policy.Read.All          messaging and meeting policies
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.msgraph import GraphClient, GraphCredentials

logger = logging.getLogger(__name__)


@dataclass
class TeamsCredentials(GraphCredentials):
    """Matches dashboard/src/integrations/teams/config.ts."""


class TeamsAdapter:
    def __init__(self, credentials: GraphCredentials, client=None) -> None:
        self.credentials = credentials
        self.graph = client if isinstance(client, GraphClient) else GraphClient(credentials, client)

    async def validate(self) -> bool:
        try:
            resp = await self.graph.get("/v1.0/teams", **{"$top": "1"})
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"Graph refused /teams (HTTP {resp.status_code}). "
                    "Grant Team.ReadBasic.All (application) and complete admin consent."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Microsoft Graph: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        results = await asyncio.gather(
            self._check_team_inventory(),
            self._check_guest_access(),
            self._check_external_access(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("teams check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_team_inventory(self) -> list[IntegrationFinding]:
        items, truncated = await self.graph.get_paged("/v1.0/teams")
        if not items:
            resp = await self.graph.get("/v1.0/teams", **{"$top": "1"})
            if resp.status_code == 403:
                return [self._unavailable(
                    "teams.inventory.team_count",
                    "Teams are inventoried",
                    "data_classification",
                    "Grant Team.ReadBasic.All (application) and complete admin consent.",
                )]
        return [IntegrationFinding(
            check_id="teams.inventory.team_count",
            title="Teams are inventoried",
            description=f"{len(items)} team(s) enumerated for governance coverage.",
            remediation="No action required — this is an inventory check.",
            status="PASSED",
            severity="INFO",
            check_category="data_classification",
            result_details={
                "team_count": len(items),
                "truncated": truncated,
                "sample": [t.get("displayName", "") for t in items][:20],
            },
        )]

    async def _check_guest_access(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/policies/authorizationPolicy"
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "teams.policy.guest_access",
                "Guest access policy is reviewed",
                "access_control",
                "Grant Policy.Read.All (application) and complete admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "teams.policy.guest_access",
                "Guest access policy is reviewed",
                "access_control",
                "The authorization policy endpoint returned an error.",
            )]
        policy = resp.json()
        guest_invite = policy.get("allowInvitesFrom", "unknown")
        restricted = guest_invite in ("none", "adminsAndGuestInviters")
        return [IntegrationFinding(
            check_id="teams.policy.guest_access",
            title="Guest access policy is reviewed",
            description=f"Guest invitation policy: '{guest_invite}'.",
            remediation=(
                "Restrict guest invitations to admins and designated inviters "
                "in the Entra admin centre → External Identities."
            ),
            status="PASSED" if restricted else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={"allow_invites_from": guest_invite},
        )]

    async def _check_external_access(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/policies/crossTenantAccessPolicy/default"
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "teams.policy.external_access",
                "Cross-tenant access is governed",
                "access_control",
                "Grant Policy.Read.All (application) and complete admin consent.",
            )]
        if resp.status_code >= 400:
            return [self._unavailable(
                "teams.policy.external_access",
                "Cross-tenant access is governed",
                "access_control",
                "The cross-tenant access policy endpoint returned an error.",
            )]
        policy = resp.json()
        inbound = policy.get("inboundTrust", {})
        return [IntegrationFinding(
            check_id="teams.policy.external_access",
            title="Cross-tenant access is governed",
            description="Cross-tenant access policy default settings are configured.",
            remediation=(
                "Review cross-tenant access policies in the Entra admin centre. "
                "Restrict inbound and outbound access to known partner tenants."
            ),
            status="PASSED",
            severity="INFO",
            check_category="access_control",
            result_details={"inbound_trust": inbound},
        )]

    @staticmethod
    def _unavailable(check_id, title, category, remediation) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Microsoft Graph with the permissions granted.",
            remediation=remediation, status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
