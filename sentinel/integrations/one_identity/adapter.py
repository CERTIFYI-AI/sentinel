# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""One Identity integration adapter.

Reads identity governance posture from the One Identity Manager REST API:
joiner/mover/leaver lifecycle policy coverage, attestation (access
recertification) policy coverage, and audit trail availability. Auth is a
Bearer API key issued to a read-only reporting application under
Designer → Permissions → API applications — read access is enough, since
every call this adapter makes is a GET.

A permission the API key was not granted returns NOT_AVAILABLE rather than a
guess — a compliance platform reporting PASSED for a check it could not run
is the failure mode this pipeline exists to prevent.

Evidence source per the Continuous GRC master sheet: users, groups, roles,
MFA enrollment, app assignments, password policies, status.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: A recertification interval longer than this is an attestation-coverage
#: smell even when a policy is technically enabled.
_MAX_RECERT_INTERVAL_DAYS = 365


@dataclass
class OneIdentityCredentials:
    """Matches dashboard/src/integrations/one_identity/config.ts credentialFields."""

    api_key: str
    instance_url: str

    def api_base(self) -> str:
        return f"{self.instance_url.rstrip('/')}/api"


class OneIdentityAdapter:
    """Fetches identity governance posture from One Identity Manager.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: OneIdentityCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # ── HTTP plumbing ───────────────────────────────────────────────────────

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
            f"{self.credentials.api_base()}{path}",
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/lifecycle/policies", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"One Identity rejected the API key for "
                    f"{self.credentials.instance_url!r} (HTTP {resp.status_code}). "
                    "Check the key is active under Designer → Permissions → API "
                    "applications."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach One Identity Manager: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_lifecycle_policies(client),
                self._check_attestation_policies(client),
                self._check_audit_trail(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("one_identity check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_lifecycle_policies(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/lifecycle/policies", limit=250)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "one_identity.lifecycle.policies", "Leaver lifecycle policy enforced",
                "access_control",
                "Grant the API application read access to lifecycle processes.",
            )]
        resp.raise_for_status()
        policies = resp.json() if isinstance(resp.json(), list) else resp.json().get("items", [])
        enabled = [p for p in policies if p.get("enabled", False)]
        leaver_enabled = [
            p for p in enabled if str(p.get("type", "")).lower() in ("leaver", "termination")
        ]
        passed = bool(leaver_enabled)
        return [IntegrationFinding(
            check_id="one_identity.lifecycle.policies",
            title=f"{len(enabled)} enabled lifecycle polic(y/ies), {len(leaver_enabled)} cover leavers",
            description=(
                f"{len(leaver_enabled)} enabled leaver/termination lifecycle "
                "policy(ies) automate access removal." if passed else
                "No enabled leaver/termination lifecycle policy — offboarding "
                "access removal is not automated."
            ),
            remediation=(
                "Manager → Identity & Access Governance → Lifecycle: enable a "
                "leaver process that revokes entitlements on the HR-confirmed "
                "termination date."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH",
            check_category="access_control",
            result_details={
                "total_policies": len(policies),
                "enabled_policies": len(enabled),
                "leaver_policies_enabled": len(leaver_enabled),
            },
        )]

    async def _check_attestation_policies(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/attestation/policies", limit=250)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "one_identity.attestation.policies", "Access recertification policy enforced",
                "access_control",
                "Grant the API application read access to attestation policies.",
            )]
        resp.raise_for_status()
        policies = resp.json() if isinstance(resp.json(), list) else resp.json().get("items", [])
        enabled = [p for p in policies if p.get("enabled", False)]
        stale = [
            p for p in enabled
            if isinstance(p.get("recertificationIntervalDays"), int)
            and p["recertificationIntervalDays"] > _MAX_RECERT_INTERVAL_DAYS
        ]
        passed = bool(enabled) and not stale
        return [IntegrationFinding(
            check_id="one_identity.attestation.policies",
            title=f"{len(enabled)} enabled attestation polic(y/ies), {len(stale)} recertify too rarely",
            description=(
                f"{len(policies) - len(enabled)} policy(ies) disabled; "
                f"{len(stale)} enabled policy(ies) recertify less often than every "
                f"{_MAX_RECERT_INTERVAL_DAYS} days."
                if not enabled or stale else
                f"{len(enabled)} enabled attestation policy(ies), all recertifying "
                f"at {_MAX_RECERT_INTERVAL_DAYS} days or less."
            ),
            remediation=(
                "Manager → Attestation: enable a recurring recertification policy "
                f"for every governed resource, with an interval of "
                f"{_MAX_RECERT_INTERVAL_DAYS} days or less."
            ),
            status="PASSED" if passed else ("FAILED" if not enabled else "WARNING"),
            severity="HIGH" if not enabled else "MEDIUM",
            check_category="access_control",
            result_details={
                "total_policies": len(policies),
                "enabled_policies": len(enabled),
                "stale_recertification": len(stale),
            },
        )]

    async def _check_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit/events", limit=100)
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "one_identity.audit.trail", "Audit trail is retrievable",
                "audit_logging",
                "Grant the API application read access to the process/audit history.",
            )]
        resp.raise_for_status()
        events = resp.json() if isinstance(resp.json(), list) else resp.json().get("items", [])
        return [IntegrationFinding(
            check_id="one_identity.audit.trail",
            title="Audit trail is retrievable for audit evidence",
            description=f"{len(events)} recent audit event(s) retrieved from One Identity Manager.",
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"events_examined": len(events)},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from One Identity Manager "
                        "with the supplied API key.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
