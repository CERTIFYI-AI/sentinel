# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""JobAdder integration adapter.

Reads applicant-tracking posture from the JobAdder API: how many
users can see candidate personal data, whether extending an offer
requires a documented approval step, and whether recruiter/admin
accounts are pruned when they go dormant.

Auth: OAuth2 client_id + client_credential using the client-credentials
grant against JobAdder's identity server.
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
_AUTH_URL = "https://id.jobadder.com/connect/token"
_BASE = "https://api.jobadder.com/v2"
_DORMANT_DAYS = 90


@dataclass
class JobadderCredentials:
    """Matches dashboard/src/integrations/jobadder/config.ts credentialFields."""

    client_id: str
    client_credential: str


class JobadderAdapter:
    """Fetches ATS governance posture from JobAdder."""

    def __init__(self, credentials: JobadderCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via the client-credentials grant."""
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
                "scope": "read",
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "JobAdder rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        resp = await client.get(
            f"{_BASE}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            params=params or None,
            timeout=_TIMEOUT,
        )
        return resp

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/users", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "JobAdder rejected the request with the issued access "
                    "token. Verify the client has the required API scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach JobAdder: {exc}") from exc
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
                logger.warning("jobadder check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_candidate_pii_access(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "jobadder.users.pii_access_scope",
                "Candidate PII access scope",
                "access_control",
                "Grant the OAuth2 client read access to user records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("items", data.get("results", []))
        total = len(users)
        elevated = [
            u for u in users
            if str(u.get("role", u.get("type", ""))).lower() in ("administrator", "admin", "recruiter")
        ]
        ratio = (len(elevated) / total) if total else 0.0
        over_broad = ratio > 0.6
        elevated_but_notable = ratio > 0.3
        status = "FAILED" if over_broad else ("WARNING" if elevated_but_notable else "PASSED")
        severity = "HIGH" if over_broad else ("MEDIUM" if elevated_but_notable else "INFO")
        return [IntegrationFinding(
            check_id="jobadder.users.pii_access_scope",
            title="Candidate PII access is appropriately scoped",
            description=(
                f"{len(elevated)} of {total} JobAdder user(s) hold a role "
                "with access to candidate personal data and interview notes."
            ),
            remediation=(
                "Restrict administrator and recruiter roles to staff who "
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
        resp = await self._get(client, "/settings/placements/offerApproval")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "jobadder.offers.approval_workflow",
                "Offer-approval workflow evidence",
                "change_management",
                "Grant the OAuth2 client read access to placement "
                "approval settings.",
            )]
        resp.raise_for_status()
        data = resp.json()
        approval_required = bool(data.get("approvalRequired", data.get("requiresApproval", False)))
        return [IntegrationFinding(
            check_id="jobadder.offers.approval_workflow",
            title="Offers require documented approval before sending",
            description=(
                "JobAdder placement settings "
                + ("require" if approval_required else "do not require")
                + " an approval step before an offer is sent to a candidate."
            ),
            remediation=(
                "Enable mandatory offer approval in JobAdder so no offer is "
                "extended without a documented sign-off."
            ),
            status="PASSED" if approval_required else "FAILED",
            severity="INFO" if approval_required else "HIGH",
            check_category="change_management",
            result_details={"approval_required": approval_required},
        )]

    async def _check_user_account_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", limit=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "jobadder.users.account_hygiene",
                "User account hygiene",
                "least_privilege",
                "Grant the OAuth2 client read access to user records.",
            )]
        resp.raise_for_status()
        data = resp.json()
        users = data if isinstance(data, list) else data.get("items", data.get("results", []))
        cutoff = datetime.now(timezone.utc) - timedelta(days=_DORMANT_DAYS)
        dormant = []
        for u in users:
            if str(u.get("role", u.get("type", ""))).lower() not in ("administrator", "admin", "recruiter"):
                continue
            last_login = _parse_datetime(u.get("lastLogin") or u.get("lastLoginAt"))
            if last_login is not None and last_login < cutoff:
                dormant.append(u)
        return [IntegrationFinding(
            check_id="jobadder.users.account_hygiene",
            title="No dormant recruiter/admin accounts retain access",
            description=(
                f"{len(dormant)} privileged JobAdder account(s) have not "
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
            description="Sentinel could not read this from JobAdder with the supplied credentials.",
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
