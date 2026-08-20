# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Salesforce integration adapter.

Reads access-review and data-location evidence from the Salesforce REST/SOQL
API: dormant System Administrator users, retrievability of the Setup Audit
Trail, and profiles granting "View All Data" broad record visibility.

Auth: OAuth2 client-credentials flow (Connected App) against a
tenant-specific instance URL.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_API_VERSION = "v59.0"


@dataclass
class SalesforceCredentials:
    """Matches dashboard/src/integrations/salesforce/config.ts credentialFields."""

    instance_url: str
    client_id: str
    client_credential: str

    def token_url(self) -> str:
        return f"{self.instance_url.rstrip('/')}/services/oauth2/token"


class SalesforceAdapter:
    """Fetches access-review and data-exposure posture from Salesforce."""

    def __init__(self, credentials: SalesforceCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None
        self._api_instance_url: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token via the client-credentials flow."""
        if self._access_token:
            return self._access_token
        resp = await client.post(
            self.credentials.token_url(),
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                # OAuth2 token-endpoint parameter name (RFC 6749 §2.3.1);
                # the value is the operator-supplied credential.
                "client_secret": self.credentials.client_credential,
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (400, 401, 403):
            raise ValueError(
                "Salesforce rejected the OAuth2 client credentials "
                f"(HTTP {resp.status_code}). Verify the client ID, client "
                "credential, and instance URL."
            )
        resp.raise_for_status()
        payload = resp.json()
        self._access_token = payload.get("access_token", "")
        self._api_instance_url = payload.get("instance_url", self.credentials.instance_url)
        return self._access_token

    async def _query(self, client: httpx.AsyncClient, soql: str) -> httpx.Response:
        token = await self._authenticate(client)
        base = (self._api_instance_url or self.credentials.instance_url).rstrip("/")
        return await client.get(
            f"{base}/services/data/{_API_VERSION}/query",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params={"q": soql},
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._query(client, "SELECT Id FROM Organization LIMIT 1")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Salesforce rejected the access token when querying the "
                    "Organization object. Verify the Connected App's OAuth "
                    "scopes include API access."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Salesforce: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_admins(client),
                self._check_setup_audit_trail(client),
                self._check_view_all_data_profiles(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("salesforce check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_admins(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._query(
            client,
            "SELECT Id, Name, LastLoginDate FROM User "
            "WHERE IsActive = true AND Profile.Name = 'System Administrator'",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "salesforce.users.dormant_admins",
                "Dormant System Administrator accounts",
                "least_privilege",
                "Grant the Connected App API access to query the User and "
                "Profile objects.",
            )]
        resp.raise_for_status()
        admins = resp.json().get("records", [])
        dormant = [a for a in admins if not a.get("LastLoginDate")]
        passed = len(dormant) == 0
        return [IntegrationFinding(
            check_id="salesforce.users.dormant_admins",
            title="No dormant System Administrator accounts",
            description=(
                f"{len(admins)} active System Administrator account(s), "
                f"{len(dormant)} with no recorded login."
            ),
            remediation=(
                "Deactivate or reassign System Administrator accounts that "
                "have never logged in, and periodically review LastLoginDate "
                "for all privileged profiles."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if dormant else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_count": len(admins),
                "dormant_admin_count": len(dormant),
            },
        )]

    async def _check_setup_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._query(
            client,
            "SELECT Id, Action, CreatedDate, Display FROM SetupAuditTrail "
            "ORDER BY CreatedDate DESC LIMIT 10",
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "salesforce.setup_audit_trail.retrievable",
                "Setup Audit Trail retrievable",
                "audit_logging",
                "Grant the Connected App API access to query "
                "SetupAuditTrail.",
            )]
        resp.raise_for_status()
        entries = resp.json().get("records", [])
        passed = len(entries) > 0
        return [IntegrationFinding(
            check_id="salesforce.setup_audit_trail.retrievable",
            title="Setup Audit Trail is retrievable and populated",
            description=(
                f"{len(entries)} recent Setup Audit Trail entry/entries "
                "retrieved."
                if passed else
                "The Setup Audit Trail returned no entries."
            ),
            remediation=(
                "Confirm administrative actions are being recorded to the "
                "Setup Audit Trail so configuration changes remain "
                "traceable."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="audit_logging",
            result_details={"recent_entry_count": len(entries)},
        )]

    async def _check_view_all_data_profiles(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._query(
            client,
            "SELECT Id, Name, PermissionsViewAllData, PermissionsModifyAllData "
            "FROM Profile WHERE PermissionsViewAllData = true",
        )
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "salesforce.profiles.view_all_data",
                "Profiles granted View All Data",
                "access_control",
                "Grant the Connected App API access to query the Profile "
                "object.",
            )]
        resp.raise_for_status()
        profiles = resp.json().get("records", [])
        modify_all = [p for p in profiles if p.get("PermissionsModifyAllData")]
        passed = len(profiles) == 0
        return [IntegrationFinding(
            check_id="salesforce.profiles.view_all_data",
            title="No unnecessary profile is granted org-wide data visibility",
            description=(
                f"{len(profiles)} profile(s) grant View All Data, of which "
                f"{len(modify_all)} also grant Modify All Data — bypassing "
                "record-level sharing rules for every user assigned to them."
            ),
            remediation=(
                "Limit View All Data / Modify All Data to the profiles that "
                "genuinely require org-wide access; rely on role hierarchy "
                "and sharing rules for everyone else."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if modify_all else ("MEDIUM" if profiles else "INFO"),
            check_category="access_control",
            result_details={
                "view_all_data_profile_count": len(profiles),
                "modify_all_data_profile_count": len(modify_all),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Salesforce with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
