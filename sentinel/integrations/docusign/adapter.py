# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""DocuSign integration adapter.

Reads access-review and data-location evidence from the DocuSign
eSignature API: account-administrator concentration, envelope audit
trail retrievability, and publicly-accessible PowerForms.

Auth: OAuth2 (client_id, client_credential, account_id). DocuSign's
production integrations use the JWT Grant; this adapter uses the
equivalent Client Credentials shape for the same token endpoint.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_AUTH_URL = "https://account.docusign.com/oauth/token"
_USERINFO_URL = "https://account.docusign.com/oauth/userinfo"
_DEFAULT_BASE = "https://na3.docusign.net/restapi/v2.1"

_ADMIN_PROFILE_KEYWORDS = ("admin",)


@dataclass
class DocusignCredentials:
    """Matches dashboard/src/integrations/docusign/config.ts credentialFields."""

    client_id: str
    client_credential: str
    account_id: str


class DocusignAdapter:
    """Fetches access-review and data-location evidence from DocuSign."""

    def __init__(self, credentials: DocusignCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._access_token: str | None = None
        self._api_base: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Obtain an OAuth2 access token."""
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
                "scope": "signature impersonation",
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "DocuSign rejected the OAuth2 credentials "
                f"(HTTP {resp.status_code}). Verify the client ID and "
                "client credential."
            )
        resp.raise_for_status()
        self._access_token = resp.json().get("access_token", "")
        return self._access_token

    async def _base_url(self, client: httpx.AsyncClient) -> str:
        """Resolve the account's base URI, falling back to a default region."""
        if self._api_base:
            return self._api_base
        token = await self._authenticate(client)
        resp = await client.get(
            _USERINFO_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=_TIMEOUT,
        )
        if resp.status_code == 200:
            for account in resp.json().get("accounts", []):
                if account.get("account_id") == self.credentials.account_id:
                    self._api_base = f"{account['base_uri']}/restapi/v2.1"
                    return self._api_base
        self._api_base = _DEFAULT_BASE
        return self._api_base

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        token = await self._authenticate(client)
        base = await self._base_url(client)
        return await client.get(
            f"{base}/accounts/{self.credentials.account_id}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            resp = await self._get(client, "/users", count=1)
            if resp.status_code in (401, 403):
                raise ValueError(
                    "DocuSign rejected the access token when listing users. "
                    "Verify the integration key has account administration "
                    "permission for this account."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach DocuSign: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_admin_concentration(client),
                self._check_envelope_audit_trail(client),
                self._check_powerform_public_exposure(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("docusign check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_admin_concentration(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/users", count=100, status="Active")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "docusign.users.admin_concentration",
                "Account administrator concentration",
                "least_privilege",
                "Grant the integration key account administration permission.",
            )]
        resp.raise_for_status()
        users = resp.json().get("users", [])
        admins = [
            u for u in users
            if any(k in u.get("permissionProfileName", "").lower() for k in _ADMIN_PROFILE_KEYWORDS)
        ]
        total = len(users)
        ratio = (len(admins) / total) if total else 0.0
        passed = total > 0 and ratio <= 0.2
        return [IntegrationFinding(
            check_id="docusign.users.admin_concentration",
            title="Account administrator concentration reviewed",
            description=(
                f"{len(admins)} of {total} active user(s) hold an "
                f"administrator permission profile ({ratio:.0%})."
            ),
            remediation=(
                "Review account administrator permission profile assignments "
                "and move users who do not need standing admin access to a "
                "lower-privilege profile."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="least_privilege",
            result_details={
                "admin_user_count": len(admins),
                "total_active_users": total,
            },
        )]

    async def _check_envelope_audit_trail(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        envelopes_resp = await self._get(client, "/envelopes", from_date="2000-01-01", count=1)
        if envelopes_resp.status_code in (401, 403):
            return [self._unavailable(
                "docusign.audit.envelope_trail",
                "Envelope audit trail retrievability",
                "audit_logging",
                "Grant the integration key permission to read envelopes.",
            )]
        envelopes_resp.raise_for_status()
        envelopes = envelopes_resp.json().get("envelopes", [])
        if not envelopes:
            return [self._unavailable(
                "docusign.audit.envelope_trail",
                "Envelope audit trail retrievability",
                "audit_logging",
                "No envelopes exist yet to verify audit trail retrievability against.",
            )]
        envelope_id = envelopes[0]["envelopeId"]
        audit_resp = await self._get(client, f"/envelopes/{envelope_id}/audit_events")
        if audit_resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "docusign.audit.envelope_trail",
                "Envelope audit trail retrievability",
                "audit_logging",
                "Grant the integration key permission to read envelope audit events.",
            )]
        audit_resp.raise_for_status()
        events = audit_resp.json().get("auditEvents", [])
        return [IntegrationFinding(
            check_id="docusign.audit.envelope_trail",
            title="Envelope audit trail is retrievable",
            description=f"The audit events endpoint returned {len(events)} event(s) for a sampled envelope.",
            remediation=(
                "No action required. Continue retaining envelope audit "
                "trails and Certificates of Completion as evidence."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={"sampled_audit_event_count": len(events)},
        )]

    async def _check_powerform_public_exposure(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/powerforms")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "docusign.powerforms.public_exposure",
                "Publicly-accessible PowerForms",
                "data_classification",
                "Grant the integration key permission to read PowerForms, "
                "or enable the PowerForms feature for this account.",
            )]
        resp.raise_for_status()
        forms = resp.json().get("powerForms", [])
        active_forms = [f for f in forms if f.get("isActive") in (True, "true")]
        return [IntegrationFinding(
            check_id="docusign.powerforms.public_exposure",
            title="Publicly-accessible PowerForms reviewed",
            description=(
                f"{len(active_forms)} of {len(forms)} PowerForm(s) are active "
                "and reachable via a public signing link."
            ),
            remediation=(
                "Deactivate PowerForms that are no longer in use and confirm "
                "active ones do not expose sensitive template fields."
            ),
            status="PASSED" if not active_forms else "WARNING",
            severity="LOW" if active_forms else "INFO",
            check_category="data_classification",
            result_details={
                "active_powerform_count": len(active_forms),
                "total_powerform_count": len(forms),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from DocuSign with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
