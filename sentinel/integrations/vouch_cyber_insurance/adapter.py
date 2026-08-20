# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Vouch cyber-insurance integration adapter.

Vouch is a cyber-insurance provider whose customer portal exposes policy
and coverage data. This adapter reads policy coverage limits, claims/
incident history, and renewal-date proximity as vendor-management and
incident-response evidence.

Auth: a single api_key (Bearer API token issued from the Vouch policyholder
portal).

Note: Vouch's public API surface is not well-documented outside
policyholder accounts, so this adapter keeps to conservative, generically-
named REST endpoints and degrades to NOT_AVAILABLE rather than guessing at
vendor-specific field names.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.vouch.us/v1"

#: Documented minimum cyber-liability coverage threshold, in USD. This is a
#: business-policy figure, not a regulatory minimum — flag as INFO/WARNING,
#: never as a failed control.
_COVERAGE_THRESHOLD_USD = 1_000_000

#: A policy renewing within this many days is flagged for follow-up.
_RENEWAL_WARNING_DAYS = 30


@dataclass
class VouchCyberInsuranceCredentials:
    """Matches dashboard/src/integrations/vouch_cyber_insurance/config.ts credentialFields."""

    api_key: str


class VouchCyberInsuranceAdapter:
    """Fetches cyber-insurance policy and claims data from Vouch."""

    def __init__(self, credentials: VouchCyberInsuranceCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/account")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Vouch rejected the API key. Verify the key is active "
                    "and has read permissions on the policyholder account."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Vouch: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_coverage_adequacy(client),
                self._check_claims_history(client),
                self._check_renewal_proximity(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("vouch_cyber_insurance check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _get_active_policy(self, client: httpx.AsyncClient) -> tuple[httpx.Response, dict | None]:
        resp = await self._get(client, "/policies", status="active", per_page=10)
        if resp.status_code in (403, 404):
            return resp, None
        resp.raise_for_status()
        data = resp.json()
        policies = data if isinstance(data, list) else data.get("policies", data.get("results", []))
        return resp, (policies[0] if policies else None)

    async def _check_coverage_adequacy(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp, policy = await self._get_active_policy(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "vouch.policy.coverage_adequacy",
                "Cyber policy coverage-limit adequacy",
                "vendor_management",
                "Grant the API key read access to active policy details.",
            )]
        if policy is None:
            return [self._unavailable(
                "vouch.policy.coverage_adequacy",
                "Cyber policy coverage-limit adequacy",
                "vendor_management",
                "No active Vouch policy was found on this account.",
            )]

        coverage = policy.get("coverage_limit_usd") or policy.get("aggregate_limit_usd") or 0
        below_threshold = coverage > 0 and coverage < _COVERAGE_THRESHOLD_USD
        return [IntegrationFinding(
            check_id="vouch.policy.coverage_adequacy",
            title="Cyber policy coverage-limit reviewed",
            description=(
                f"Active policy coverage limit is ${coverage:,.0f}, against a "
                f"documented reference threshold of ${_COVERAGE_THRESHOLD_USD:,.0f}."
            ),
            remediation=(
                "This is a business-judgment signal, not a pass/fail control. "
                "Review whether the current coverage limit is adequate for "
                "the organization's risk profile and consider increasing it "
                "if it falls below the documented reference threshold."
            ),
            status="WARNING" if below_threshold else "INFO",
            severity="MEDIUM" if below_threshold else "INFO",
            check_category="vendor_management",
            result_details={
                "coverage_limit_usd": coverage,
                "reference_threshold_usd": _COVERAGE_THRESHOLD_USD,
                "below_threshold": below_threshold,
            },
        )]

    async def _check_claims_history(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/claims", per_page=25)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "vouch.claims.history",
                "Claims/incident history retrievability",
                "incident_response",
                "Grant the API key read access to claims and incident "
                "history.",
            )]
        resp.raise_for_status()
        data = resp.json()
        claims = data if isinstance(data, list) else data.get("claims", data.get("results", []))
        open_claims = [c for c in claims if c.get("status", "").lower() not in ("closed", "resolved")]
        return [IntegrationFinding(
            check_id="vouch.claims.history",
            title="Claims/incident history is retrievable",
            description=(
                f"{len(claims)} claim(s) on record, {len(open_claims)} currently open."
            ),
            remediation=(
                "Ensure open claims have an assigned incident-response "
                "owner and are tracked through to resolution alongside the "
                "insurer's claims process."
            ),
            status="PASSED",
            severity="MEDIUM" if open_claims else "INFO",
            check_category="incident_response",
            result_details={
                "total_claims": len(claims),
                "open_claims": len(open_claims),
            },
        )]

    async def _check_renewal_proximity(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp, policy = await self._get_active_policy(client)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "vouch.policy.renewal_proximity",
                "Policy renewal-date proximity",
                "vendor_management",
                "Grant the API key read access to active policy details.",
            )]
        if policy is None:
            return [self._unavailable(
                "vouch.policy.renewal_proximity",
                "Policy renewal-date proximity",
                "vendor_management",
                "No active Vouch policy was found on this account.",
            )]

        renewal_raw = policy.get("renewal_date") or policy.get("expiration_date")
        if not renewal_raw:
            return [self._unavailable(
                "vouch.policy.renewal_proximity",
                "Policy renewal-date proximity",
                "vendor_management",
                "The active policy record did not include a renewal or "
                "expiration date.",
            )]

        try:
            renewal_dt = datetime.fromisoformat(str(renewal_raw).replace("Z", "+00:00"))
        except ValueError:
            return [self._unavailable(
                "vouch.policy.renewal_proximity",
                "Policy renewal-date proximity",
                "vendor_management",
                "The active policy record's renewal date could not be parsed.",
            )]

        now = datetime.now(timezone.utc)
        days_remaining = (renewal_dt - now).days
        lapsed = days_remaining < 0
        nearing = 0 <= days_remaining <= _RENEWAL_WARNING_DAYS

        if lapsed:
            status, severity = "FAILED", "HIGH"
            desc = f"The policy's renewal/expiration date was {abs(days_remaining)} day(s) ago."
        elif nearing:
            status, severity = "WARNING", "MEDIUM"
            desc = f"The policy renews in {days_remaining} day(s)."
        else:
            status, severity = "PASSED", "INFO"
            desc = f"The policy renews in {days_remaining} day(s)."

        return [IntegrationFinding(
            check_id="vouch.policy.renewal_proximity",
            title="Cyber policy renewal date reviewed",
            description=desc,
            remediation=(
                "Confirm renewal is in progress well before the expiration "
                "date; an unintentionally lapsed cyber policy is itself a "
                "vendor-management risk."
            ),
            status=status,
            severity=severity,
            check_category="vendor_management",
            result_details={
                "renewal_date": renewal_raw,
                "days_remaining": days_remaining,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Vouch with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
