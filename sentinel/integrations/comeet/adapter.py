# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Comeet integration adapter.

Reads applicant-tracking posture from the Comeet API: how many users
can see candidate personal data, whether extending an offer requires
a documented approval step, and whether recruiter/admin accounts are
pruned when they go dormant.

Auth: an api_key plus a company_uid path segment (Comeet scopes every
request to a specific company).
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
_BASE = "https://www.comeet.co/api/v3/company"
_DORMANT_DAYS = 90


@dataclass
class ComeetCredentials:
    """Matches dashboard/src/integrations/comeet/config.ts credentialFields."""

    api_key: str
    company_uid: str


class ComeetAdapter:
    """Fetches ATS governance posture from Comeet."""

    def __init__(self, credentials: ComeetCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-token": self.credentials.api_key,
            "Accept": "application/json",
        }

    def _company_path(self, path: str) -> str:
        return f"{_BASE}/{self.credentials.company_uid}{path}"

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            self._company_path(path),
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/positions")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Comeet rejected the API key/company UID pair. Verify "
                    "both values are active and unrevoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Comeet: {exc}") from exc
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
                logger.warning("comeet check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_candidate_pii_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/team_members")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "comeet.team.pii_access_scope",
                "Candidate PII access scope",
                "access_control",
                "Grant the API key read access to team member records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("team_members", data.get("results", []))
        total = len(users)
        elevated = [
            u for u in users
            if str(u.get("role", u.get("permission", ""))).lower() in ("admin", "company_admin", "recruiter")
        ]
        ratio = (len(elevated) / total) if total else 0.0
        over_broad = ratio > 0.6
        elevated_but_notable = ratio > 0.3
        status = "FAILED" if over_broad else ("WARNING" if elevated_but_notable else "PASSED")
        severity = "HIGH" if over_broad else ("MEDIUM" if elevated_but_notable else "INFO")
        return [IntegrationFinding(
            check_id="comeet.team.pii_access_scope",
            title="Candidate PII access is appropriately scoped",
            description=(
                f"{len(elevated)} of {total} Comeet team member(s) hold a "
                "role with access to candidate personal data and interview "
                "notes."
            ),
            remediation=(
                "Restrict admin and recruiter permissions to staff who need "
                "candidate PII access; move others to a scoped interviewer "
                "role."
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
        resp = await self._get(client, "/offer_approval_settings")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "comeet.offers.approval_workflow",
                "Offer-approval workflow evidence",
                "change_management",
                "Grant the API key read access to offer-approval settings.",
            )]
        resp.raise_for_status()
        data = resp.json()
        approval_required = bool(data.get("approval_required", data.get("requires_approval", False)))
        return [IntegrationFinding(
            check_id="comeet.offers.approval_workflow",
            title="Offers require documented approval before sending",
            description=(
                "Comeet offer settings "
                + ("require" if approval_required else "do not require")
                + " an approval step before an offer is sent to a candidate."
            ),
            remediation=(
                "Enable mandatory offer approval in Comeet so no offer is "
                "extended without a documented sign-off."
            ),
            status="PASSED" if approval_required else "FAILED",
            severity="INFO" if approval_required else "HIGH",
            check_category="change_management",
            result_details={"approval_required": approval_required},
        )]

    async def _check_user_account_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/team_members")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "comeet.team.account_hygiene",
                "User account hygiene",
                "least_privilege",
                "Grant the API key read access to team member records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("team_members", data.get("results", []))
        cutoff = datetime.now(timezone.utc) - timedelta(days=_DORMANT_DAYS)
        dormant = []
        for u in users:
            if str(u.get("role", u.get("permission", ""))).lower() not in ("admin", "company_admin", "recruiter"):
                continue
            last_login = _parse_datetime(u.get("last_login") or u.get("last_active_at"))
            if last_login is not None and last_login < cutoff:
                dormant.append(u)
        return [IntegrationFinding(
            check_id="comeet.team.account_hygiene",
            title="No dormant recruiter/admin accounts retain access",
            description=(
                f"{len(dormant)} privileged Comeet account(s) have not "
                f"logged in within {_DORMANT_DAYS} days."
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
            description="Sentinel could not read this from Comeet with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
