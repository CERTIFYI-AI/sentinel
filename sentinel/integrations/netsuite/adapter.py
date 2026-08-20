# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""NetSuite integration adapter.

Reads joiner-mover-leaver (JML) evidence from the NetSuite SuiteTalk REST
Web Services employee record: terminated-employee status hygiene,
manager-assignment coverage, and employment-record change-history
availability.

Auth: NetSuite REST Token-Based Authentication (TBA), a per-request OAuth1
signature built from five credentials — account_id, consumer_key,
consumer_credential, token_id, token_credential. There is no separate token
exchange call: every request is individually signed.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import logging
import secrets
import time
from dataclasses import dataclass
from urllib.parse import quote

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


@dataclass
class NetsuiteCredentials:
    """Matches dashboard/src/integrations/netsuite/config.ts credentialFields."""

    account_id: str
    consumer_key: str
    consumer_credential: str
    token_id: str
    token_credential: str

    def base_url(self) -> str:
        # NetSuite account ids use "_" in the hostname where the account id
        # itself uses "-" (e.g. account 1234567_SB1 -> 1234567-sb1).
        host_account = self.account_id.lower().replace("_", "-")
        return f"https://{host_account}.suitetalk.api.netsuite.com/services/rest/record/v1"


class NetsuiteAdapter:
    """Fetches JML roster evidence from NetSuite via signed REST calls."""

    def __init__(self, credentials: NetsuiteCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    @staticmethod
    def _percent_encode(value: str) -> str:
        return quote(str(value), safe="~")

    def _oauth1_header(self, method: str, url: str, params: dict | None = None) -> str:
        """Build a NetSuite TBA ``Authorization: OAuth ...`` header.

        A lightweight, single-purpose OAuth1/HMAC-SHA256 signer — not a
        general OAuth1 client library — scoped to exactly what NetSuite's
        documented TBA signing flow requires for one request.
        """
        creds = self.credentials
        oauth_params = {
            "oauth_consumer_key": creds.consumer_key,
            "oauth_token": creds.token_id,
            "oauth_signature_method": "HMAC-SHA256",
            "oauth_timestamp": str(int(time.time())),
            "oauth_nonce": secrets.token_hex(16),
            "oauth_version": "1.0",
        }
        all_params = {**(params or {}), **oauth_params}
        param_string = "&".join(
            f"{self._percent_encode(k)}={self._percent_encode(v)}"
            for k, v in sorted(all_params.items())
        )
        base_string = "&".join([
            method.upper(),
            self._percent_encode(url),
            self._percent_encode(param_string),
        ])
        # NetSuite TBA signing key: percent-encoded consumer credential and
        # token credential joined by "&". Neither half is logged.
        signing_key = (
            f"{self._percent_encode(creds.consumer_credential)}&"
            f"{self._percent_encode(creds.token_credential)}"
        )
        signature = base64.b64encode(
            hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha256).digest()
        ).decode()

        header_params = {**oauth_params, "oauth_signature": signature}
        header_body = ", ".join(
            f'{k}="{self._percent_encode(v)}"' for k, v in header_params.items()
        )
        return f'OAuth realm="{self._percent_encode(creds.account_id)}", {header_body}'

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        url = f"{self.credentials.base_url()}{path}"
        auth_header = self._oauth1_header("GET", url, params)
        return await client.get(
            url,
            headers={"Authorization": auth_header, "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/employee", limit=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "NetSuite rejected the TBA credentials "
                    f"(HTTP {resp.status_code}). Verify the account id, "
                    "consumer key/credential, and token id/credential."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach NetSuite: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_terminated_still_active(client),
                self._check_manager_assignment_coverage(client),
                self._check_change_log_availability(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("netsuite check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_terminated_still_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employee", q="releasedate ISNOTEMPTY", limit=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "netsuite.roster.terminated_still_active",
                "Terminated employees promptly marked inactive",
                "access_control",
                "Grant the token role read access to the Employee record.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data.get("items", data if isinstance(data, list) else [])
        still_active = [e for e in employees if e.get("isInactive") in (False, "false", None)]
        passed = len(still_active) == 0
        return [IntegrationFinding(
            check_id="netsuite.roster.terminated_still_active",
            title="Terminated employees promptly marked inactive",
            description=(
                f"{len(still_active)} of {len(employees)} released employee(s) "
                "still show an active (not-inactive) status in NetSuite."
            ),
            remediation=(
                "Set the Employee record's Inactive flag for every released "
                "employee as part of offboarding."
            ),
            status="PASSED" if passed else "FAILED",
            severity="HIGH" if not passed else "LOW",
            check_category="access_control",
            result_details={
                "released_count": len(employees),
                "still_active_count": len(still_active),
            },
        )]

    async def _check_manager_assignment_coverage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employee", q="isinactive IS false", limit=500)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "netsuite.roster.manager_assignment_coverage",
                "Employee manager assignments complete",
                "hr_controls",
                "Grant the token role read access to the Employee record.",
            )]
        resp.raise_for_status()
        data = resp.json()
        employees = data.get("items", data if isinstance(data, list) else [])
        unassigned = [e for e in employees if not e.get("supervisor")]
        passed = len(unassigned) == 0
        return [IntegrationFinding(
            check_id="netsuite.roster.manager_assignment_coverage",
            title="Employee manager assignments complete",
            description=(
                f"{len(unassigned)} of {len(employees)} active employee(s) have "
                "no supervisor assigned in NetSuite."
            ),
            remediation=(
                "Assign a supervisor to every active Employee record so "
                "approvals and access reviews have a clear owner."
            ),
            status="PASSED" if passed else "WARNING",
            severity="INFO" if passed else "MEDIUM",
            check_category="hr_controls",
            result_details={
                "active_count": len(employees),
                "unassigned_count": len(unassigned),
            },
        )]

    async def _check_change_log_availability(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/employee/systemNotes", limit=25)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "netsuite.audit.change_log_availability",
                "Employment record change history is retrievable",
                "audit_logging",
                "Grant the token role read access to System Notes on the "
                "Employee record.",
            )]
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("items", data if isinstance(data, list) else [])
        has_entries = len(entries) > 0
        return [IntegrationFinding(
            check_id="netsuite.audit.change_log_availability",
            title="Employment record change history is retrievable",
            description=(
                f"{len(entries)} employment record change entry/entries "
                "retrieved from NetSuite's system notes."
            ),
            remediation=(
                "Ensure System Notes tracking remains enabled on the "
                "Employee record so field-level changes stay auditable."
            ),
            status="PASSED" if has_entries else "WARNING",
            severity="INFO" if has_entries else "MEDIUM",
            check_category="audit_logging",
            result_details={
                "entry_count": len(entries),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from NetSuite with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
