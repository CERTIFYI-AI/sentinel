# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""SmartRecruiters integration adapter.

Reads applicant-tracking posture from the SmartRecruiters API: how
many users can see candidate personal data, whether extending an
offer requires a documented approval step, and whether recruiter/admin
accounts are pruned when they go dormant.

Auth: a single api_key (Bearer API token issued from SmartRecruiters
admin settings).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.smartrecruiters.com"
_DORMANT_DAYS = 90


@dataclass
class SmartrecruitersCredentials:
    """Matches dashboard/src/integrations/smartrecruiters/config.ts credentialFields."""

    api_key: str


class SmartrecruitersAdapter:
    """Fetches ATS governance posture from SmartRecruiters."""

    def __init__(self, credentials: SmartrecruitersCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
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
            resp = await self._get(client, "/identity/v1/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "SmartRecruiters rejected the API token. Verify the "
                    "token is active and has not been revoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach SmartRecruiters: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_candidate_pii_access(client),
                self._check_offer_approval_workflow(client),
                self._check_user_account_hygiene(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("smartrecruiters check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_candidate_pii_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/identity/v1/team-members")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "smartrecruiters.team.pii_access_scope",
                "Candidate PII access scope",
                "access_control",
                "Grant the API token read access to team member records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("content", data.get("results", []))
        total = len(users)
        elevated = [u for u in users if _role_code(u) in ("admin", "hr_administrator", "recruiter")]
        ratio = (len(elevated) / total) if total else 0.0
        over_broad = ratio > 0.6
        elevated_but_notable = ratio > 0.3
        status = "FAILED" if over_broad else ("WARNING" if elevated_but_notable else "PASSED")
        severity = "HIGH" if over_broad else ("MEDIUM" if elevated_but_notable else "INFO")
        return [IntegrationFinding(
            check_id="smartrecruiters.team.pii_access_scope",
            title="Candidate PII access is appropriately scoped",
            description=(
                f"{len(elevated)} of {total} SmartRecruiters team member(s) "
                "hold a role with access to candidate personal data and "
                "interview notes."
            ),
            remediation=(
                "Restrict HR administrator and recruiter roles to staff who "
                "need candidate PII access; move others to a scoped "
                "hiring-manager role."
            ),
            status=status,
            severity=severity,
            check_category="access_control",
            result_details={
                "total_users": total,
                "elevated_access_users": len(elevated),
                "elevated_access_ratio": round(ratio, 3),
            },
        )]

    async def _check_offer_approval_workflow(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/offers/v1/configuration")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "smartrecruiters.offers.approval_workflow",
                "Offer-approval workflow evidence",
                "change_management",
                "Grant the API token read access to offer configuration.",
            )]
        resp.raise_for_status()
        data = resp.json()
        approval_required = bool(data.get("approvalRequired", data.get("requiresApproval", False)))
        return [IntegrationFinding(
            check_id="smartrecruiters.offers.approval_workflow",
            title="Offers require documented approval before sending",
            description=(
                "SmartRecruiters offer configuration "
                + ("requires" if approval_required else "does not require")
                + " an approval step before an offer is sent to a candidate."
            ),
            remediation=(
                "Enable mandatory offer approval workflows in SmartRecruiters "
                "so no offer is extended without a documented sign-off."
            ),
            status="PASSED" if approval_required else "FAILED",
            severity="INFO" if approval_required else "HIGH",
            check_category="change_management",
            result_details={"approval_required": approval_required},
        )]

    async def _check_user_account_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/identity/v1/team-members")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "smartrecruiters.team.account_hygiene",
                "User account hygiene",
                "least_privilege",
                "Grant the API token read access to team member records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("content", data.get("results", []))
        cutoff = datetime.now(timezone.utc) - timedelta(days=_DORMANT_DAYS)
        dormant = []
        for u in users:
            if _role_code(u) not in ("admin", "hr_administrator", "recruiter"):
                continue
            last_login = _parse_datetime(u.get("lastLoginDate") or u.get("lastActiveAt"))
            if last_login is not None and last_login < cutoff:
                dormant.append(u)
        return [IntegrationFinding(
            check_id="smartrecruiters.team.account_hygiene",
            title="No dormant recruiter/admin accounts retain access",
            description=(
                f"{len(dormant)} privileged SmartRecruiters account(s) have "
                f"not logged in within {_DORMANT_DAYS} days."
            ),
            remediation=(
                "Deactivate or downgrade dormant recruiter/admin accounts to "
                "reduce standing access to candidate data."
            ),
            status="PASSED" if not dormant else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={"dormant_privileged_accounts": len(dormant)},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from SmartRecruiters with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )


def _role_code(user: dict) -> str:
    role = user.get("role", "")
    if isinstance(role, dict):
        return str(role.get("code", "")).lower()
    return str(role).lower()


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
