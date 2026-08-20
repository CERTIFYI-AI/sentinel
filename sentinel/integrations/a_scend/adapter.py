# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""A.Scend integration adapter.

A.Scend is treated generically here: this adapter reads a plausible,
conservatively-shaped set of governance signals — administrator account
hygiene, audit-log retrievability, and data-sharing/export scope — common
to SaaS admin APIs, following the same access-review/data-location theme
used elsewhere in this integration rollout.

Auth: a single api_key (Bearer API token issued from the A.Scend admin
console).

Note: A.Scend's public API surface is not well-documented, so this adapter
keeps to conservative, generically-named REST endpoints and degrades to
NOT_AVAILABLE rather than guessing at vendor-specific field names.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.ascend.app/v1"


@dataclass
class AScendCredentials:
    """Matches dashboard/src/integrations/a_scend/config.ts credentialFields."""

    api_key: str


class AScendAdapter:
    """Fetches admin, audit-log, and data-sharing posture from A.Scend."""

    def __init__(self, credentials: AScendCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/me")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "A.Scend rejected the API key. Verify the key is "
                    "active and has read permissions on the account."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach A.Scend: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_hygiene(client),
                self._check_audit_log_retrievability(client),
                self._check_data_sharing_scope(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("a_scend check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", role="admin", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ascend.admins.hygiene",
                "Admin account hygiene",
                "access_control",
                "Grant the API key read access to the user/role directory.",
            )]
        resp.raise_for_status()
        data = resp.json()
        admins = data if isinstance(data, list) else data.get("users", data.get("results", []))
        no_mfa = [a for a in admins if a.get("mfa_enabled") is False]
        passed = len(admins) > 0 and not no_mfa
        return [IntegrationFinding(
            check_id="ascend.admins.hygiene",
            title="Admin accounts follow expected hygiene",
            description=(
                f"{len(admins)} admin account(s) reviewed, {len(no_mfa)} without MFA enabled."
            ),
            remediation=(
                "Keep the number of standing admin accounts minimal and "
                "require MFA on every admin account."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if no_mfa else "INFO",
            check_category="access_control",
            result_details={
                "admin_count": len(admins),
                "admins_without_mfa": len(no_mfa),
            },
        )]

    async def _check_audit_log_retrievability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/audit-log", per_page=10)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ascend.audit_log.retrievability",
                "Audit-log retrievability",
                "audit_logging",
                "Grant the API key read access to the audit log.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data if isinstance(data, list) else data.get("entries", data.get("results", []))
        retrievable = len(entries) > 0
        return [IntegrationFinding(
            check_id="ascend.audit_log.retrievability",
            title="Audit log is retrievable",
            description=(
                f"{len(entries)} recent audit-log entr{'y' if len(entries) == 1 else 'ies'} retrieved."
            ),
            remediation=(
                "Confirm administrative and data-access actions are "
                "consistently recorded with actor, timestamp, and action "
                "type so the audit log supports later review."
            ),
            status="PASSED" if retrievable else "WARNING",
            severity="INFO" if retrievable else "MEDIUM",
            check_category="audit_logging",
            result_details={
                "audit_log_entries": len(entries),
            },
        )]

    async def _check_data_sharing_scope(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/data-exports", status="active", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "ascend.data.sharing_scope",
                "Data-sharing and export scope",
                "data_classification",
                "Grant the API key read access to data-export/sharing "
                "configuration.",
            )]
        resp.raise_for_status()
        data = resp.json()
        exports = data if isinstance(data, list) else data.get("exports", data.get("results", []))
        external = [e for e in exports if e.get("destination_type", "").lower() == "external"]
        passed = len(external) == 0
        return [IntegrationFinding(
            check_id="ascend.data.sharing_scope",
            title="Data-sharing and export scope reviewed",
            description=(
                f"{len(exports)} active data export/sharing configuration(s), "
                f"{len(external)} pointing to an external destination."
            ),
            remediation=(
                "Review active data-export and sharing configurations and "
                "confirm each external destination is authorized and "
                "appropriately scoped for the data it carries."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if external else "INFO",
            check_category="data_classification",
            result_details={
                "active_export_count": len(exports),
                "external_destination_count": len(external),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from A.Scend with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
