# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Jobvite integration adapter.

Reads applicant-tracking posture from the Jobvite Hire API: how many
users can see candidate personal data, whether extending an offer
requires a documented approval step, and whether recruiter/admin
accounts are pruned when they go dormant.

Auth: a Jobvite API key + secret pair, sent as query parameters on
every request (Jobvite's API does not accept a bearer header).
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
_BASE = "https://api.jobvite.com/api/v2"
_DORMANT_DAYS = 90


@dataclass
class JobviteCredentials:
    """Matches dashboard/src/integrations/jobvite/config.ts credentialFields."""

    api_key: str
    api_credential: str


class JobviteAdapter:
    """Fetches ATS governance posture from Jobvite."""

    def __init__(self, credentials: JobviteCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth_params(self) -> dict[str, str]:
        return {
            "api": self.credentials.api_key,
            "sc": self.credentials.api_credential,
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        merged = {**self._auth_params(), **params}
        return await client.get(
            f"{_BASE}{path}",
            headers={"Accept": "application/json"},
            params=merged,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/company")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Jobvite rejected the API key/secret pair. Verify both "
                    "values are active and unrevoked."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Jobvite: {exc}") from exc
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
                logger.warning("jobvite check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_candidate_pii_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/user")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "jobvite.user.pii_access_scope",
                "Candidate PII access scope",
                "access_control",
                "Grant the API key/secret pair read access to user records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("requisitions", data.get("users", data.get("results", [])))
        total = len(users)
        elevated = [
            u for u in users
            if str(u.get("role", u.get("permissionGroup", ""))).lower() in ("admin", "administrator", "recruiter")
        ]
        ratio = (len(elevated) / total) if total else 0.0
        over_broad = ratio > 0.6
        elevated_but_notable = ratio > 0.3
        status = "FAILED" if over_broad else ("WARNING" if elevated_but_notable else "PASSED")
        severity = "HIGH" if over_broad else ("MEDIUM" if elevated_but_notable else "INFO")
        return [IntegrationFinding(
            check_id="jobvite.user.pii_access_scope",
            title="Candidate PII access is appropriately scoped",
            description=(
                f"{len(elevated)} of {total} Jobvite user(s) hold a role with "
                "access to candidate personal data and interview notes."
            ),
            remediation=(
                "Restrict admin and recruiter permission groups to staff who "
                "need candidate PII access; move others to a scoped "
                "interviewer permission group."
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
        resp = await self._get(client, "/company/offerApprovalSettings")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "jobvite.offer.approval_workflow",
                "Offer-approval workflow evidence",
                "change_management",
                "Grant the API key/secret pair read access to offer "
                "approval settings.",
            )]
        resp.raise_for_status()
        data = resp.json()
        approval_required = bool(data.get("approvalRequired", data.get("requiresApproval", False)))
        return [IntegrationFinding(
            check_id="jobvite.offer.approval_workflow",
            title="Offers require documented approval before sending",
            description=(
                "Jobvite offer settings "
                + ("require" if approval_required else "do not require")
                + " an approval step before an offer is sent to a candidate."
            ),
            remediation=(
                "Enable mandatory offer approval workflow in Jobvite so no "
                "offer is extended without a documented sign-off."
            ),
            status="PASSED" if approval_required else "FAILED",
            severity="INFO" if approval_required else "HIGH",
            check_category="change_management",
            result_details={"approval_required": approval_required},
        )]

    async def _check_user_account_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/user")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "jobvite.user.account_hygiene",
                "User account hygiene",
                "least_privilege",
                "Grant the API key/secret pair read access to user records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("requisitions", data.get("users", data.get("results", [])))
        cutoff = datetime.now(timezone.utc) - timedelta(days=_DORMANT_DAYS)
        dormant = []
        for u in users:
            if str(u.get("role", u.get("permissionGroup", ""))).lower() not in ("admin", "administrator", "recruiter"):
                continue
            last_login = _parse_datetime(u.get("lastLoginDate") or u.get("lastLoginAt"))
            if last_login is not None and last_login < cutoff:
                dormant.append(u)
        return [IntegrationFinding(
            check_id="jobvite.user.account_hygiene",
            title="No dormant recruiter/admin accounts retain access",
            description=(
                f"{len(dormant)} privileged Jobvite account(s) have not "
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
            description="Sentinel could not read this from Jobvite with the supplied credentials.",
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
