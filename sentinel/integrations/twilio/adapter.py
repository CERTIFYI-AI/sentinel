# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Twilio integration adapter.

Reads access-review and data-location evidence from the Twilio REST API:
dormant subaccounts, insecure (non-HTTPS) voice/SMS webhook configuration,
and reliance on the full-access Auth Token instead of scoped API keys.

Auth: Twilio Account SID + Auth Token, HTTP Basic auth.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.twilio.com/2010-04-01"


@dataclass
class TwilioCredentials:
    """Matches dashboard/src/integrations/twilio/config.ts credentialFields."""

    account_sid: str
    auth_credential: str


class TwilioAdapter:
    """Fetches access-review and data-location posture from Twilio."""

    def __init__(self, credentials: TwilioCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> tuple[str, str]:
        return (self.credentials.account_sid, self.credentials.auth_credential)

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{_BASE}{path}",
            auth=self._auth(),
            params=params or None,
            headers={"Accept": "application/json"},
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, f"/Accounts/{self.credentials.account_sid}.json")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Twilio rejected the Account SID / Auth Token. Verify "
                    "both are correct and the Auth Token has not been "
                    "rotated."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Twilio: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_dormant_subaccounts(client),
                self._check_insecure_webhooks(client),
                self._check_scoped_key_usage(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("twilio check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_dormant_subaccounts(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/Accounts.json", PageSize=200)
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "twilio.subaccounts.dormant",
                "Dormant subaccount review",
                "least_privilege",
                "Grant the credential read access to the Accounts resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        accounts = data.get("accounts", [])
        suspended = [a for a in accounts if a.get("status") == "suspended"]
        return [IntegrationFinding(
            check_id="twilio.subaccounts.dormant",
            title="No dormant suspended subaccounts",
            description=(
                f"{len(accounts)} subaccount(s) found, {len(suspended)} in "
                "suspended (not closed) status."
            ),
            remediation=(
                "Close subaccounts that are no longer in use instead of "
                "leaving them suspended — a suspended subaccount retains "
                "its credentials and can be reactivated."
            ),
            status="PASSED" if not suspended else "WARNING",
            severity="MEDIUM" if suspended else "INFO",
            check_category="least_privilege",
            result_details={
                "subaccount_count": len(accounts),
                "suspended_count": len(suspended),
            },
        )]

    async def _check_insecure_webhooks(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client,
            f"/Accounts/{self.credentials.account_sid}/IncomingPhoneNumbers.json",
            PageSize=200,
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "twilio.numbers.insecure_webhooks",
                "Voice/SMS webhook transport security",
                "encryption_in_transit",
                "Grant the credential read access to IncomingPhoneNumbers.",
            )]
        resp.raise_for_status()
        data = resp.json()
        numbers = data.get("incoming_phone_numbers", [])
        insecure = [
            n for n in numbers
            if str(n.get("voice_url", "")).startswith("http://")
            or str(n.get("sms_url", "")).startswith("http://")
        ]
        return [IntegrationFinding(
            check_id="twilio.numbers.insecure_webhooks",
            title="Voice and SMS webhooks use HTTPS",
            description=(
                f"{len(insecure)} of {len(numbers)} phone number(s) have a "
                "voice or SMS webhook configured over plain HTTP."
            ),
            remediation=(
                "Update the Voice URL and SMS URL on affected numbers to "
                "HTTPS endpoints so call and message payloads are not sent "
                "in the clear."
            ),
            status="PASSED" if not insecure else "FAILED",
            severity="HIGH" if insecure else "INFO",
            check_category="encryption_in_transit",
            result_details={
                "phone_number_count": len(numbers),
                "insecure_webhook_count": len(insecure),
            },
        )]

    async def _check_scoped_key_usage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client,
            f"/Accounts/{self.credentials.account_sid}/Keys.json",
            PageSize=200,
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "twilio.keys.scoped_access",
                "Scoped API key usage",
                "access_control",
                "Grant the credential read access to the Keys resource.",
            )]
        resp.raise_for_status()
        data = resp.json()
        keys = data.get("keys", [])
        passed = len(keys) > 0
        return [IntegrationFinding(
            check_id="twilio.keys.scoped_access",
            title="Integrations use scoped API keys rather than the Auth Token",
            description=(
                f"{len(keys)} API key(s) issued. "
                + ("Automation can authenticate with a revocable, scoped "
                   "key instead of the full-access Auth Token."
                   if passed else
                   "No API keys exist — every integration must be using "
                   "the full-access Account Auth Token directly.")
            ),
            remediation=(
                "Issue a standard API key per integration and rotate the "
                "Account Auth Token out of day-to-day use; the Auth Token "
                "has unrestricted account-wide access with no revocation "
                "granularity."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if not passed else "INFO",
            check_category="access_control",
            result_details={
                "api_key_count": len(keys),
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Twilio with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
