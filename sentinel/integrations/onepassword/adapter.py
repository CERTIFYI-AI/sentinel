# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""1Password integration adapter.

Reads identity/secrets-manager posture from two separate 1Password surfaces,
both reachable with the one Bearer token issued from
Settings → Automation → Events Reporting (a "reader" token, read-only by
design):

  * the **Events API** (a fixed regional host, independent of the sign-in
    address) — sign-in attempts, used here as the audit-trail evidence
    source;
  * the **SCIM bridge**, deployed at the tenant's own sign-in address when an
    org provisions 1Password through an external IdP — group and user
    inventory, used here as the vault-access and membership evidence source.

Not every tenant runs a SCIM bridge. When it is absent the corresponding
checks report NOT_AVAILABLE rather than guessing at vault access from data
the token cannot see — a compliance platform reporting PASSED for a check it
could not run is the failure mode this pipeline exists to avoid.

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

#: Sign-in attempt categories 1Password reports as anything other than a
#: clean success. Any of these appearing in the recent window is a signal
#: worth surfacing, not proof of compromise.
_FAILURE_CATEGORIES = frozenset({
    "credentials_failed", "mfa_failed", "modern_version_failed",
    "firewall_failed", "sso_authentication_failed", "sso_saml_failed",
})


@dataclass
class OnePasswordCredentials:
    """Matches dashboard/src/integrations/onepassword/config.ts credentialFields."""

    api_token: str
    sign_in_url: str

    def scim_base(self) -> str:
        return self.sign_in_url.rstrip("/")

    def events_base(self) -> str:
        """The Events API host is regional, not tenant-specific.

        Derived from the sign-in domain's TLD rather than asked for
        separately — one fewer field an operator can get wrong.
        """
        domain = self.sign_in_url.rstrip("/").rsplit(".", 1)[-1].lower()
        if domain == "eu":
            return "https://events.1password.eu"
        if domain == "ca":
            return "https://events.1password.ca"
        return "https://events.1password.com"


class OnePasswordAdapter:
    """Fetches identity and secrets-management posture from 1Password.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: OnePasswordCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    # ── HTTP plumbing ───────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_token}",
            "Accept": "application/json",
        }

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _post(self, client: httpx.AsyncClient, url: str, json: dict) -> httpx.Response:
        return await client.post(url, headers=self._headers(), json=json, timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, url: str) -> httpx.Response:
        return await client.get(url, headers=self._headers(), timeout=_TIMEOUT)

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._post(
                client, f"{self.credentials.events_base()}/api/v1/signinattempts", {"limit": 1}
            )
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"1Password rejected the token for {self.credentials.sign_in_url!r} "
                    f"(HTTP {resp.status_code}). Issue a fresh reader token under "
                    "Settings → Automation → Events Reporting."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach 1Password: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_signin_events(client),
                self._check_vault_access_policies(client),
                self._check_team_member_status(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("1pw check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_signin_events(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._post(
            client, f"{self.credentials.events_base()}/api/v1/signinattempts", {"limit": 100}
        )
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "onepassword.events.signin_attempts", "Sign-in events are retrievable",
                "audit_logging",
                "Grant the reader token access to sign-in attempt reporting under "
                "Settings → Automation → Events Reporting.",
            )]
        resp.raise_for_status()
        items = resp.json().get("items", [])
        failures = [i for i in items if i.get("category") in _FAILURE_CATEGORIES]
        return [IntegrationFinding(
            check_id="onepassword.events.signin_attempts",
            title="Sign-in events are retrievable for audit evidence",
            description=(
                f"{len(items)} recent sign-in attempt(s) retrieved; "
                f"{len(failures)} were not a clean success."
            ),
            remediation=(
                "No action required for retrievability. Investigate any "
                "concentration of failed attempts from a single account or IP."
            ),
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={
                "attempts_examined": len(items),
                "non_success_count": len(failures),
            },
        )]

    async def _check_vault_access_policies(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # Vault access is granted through SCIM-provisioned groups when an org
        # provisions 1Password from an external IdP. No SCIM bridge deployed
        # means this org manages vault access natively — reported honestly,
        # not guessed at.
        resp = await self._get(client, f"{self.credentials.scim_base()}/scim/v2/Groups")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "onepassword.provisioning.vault_access_groups", "Vault access is group-managed",
                "access_control",
                "No SCIM bridge reachable at the sign-in URL, or the token lacks "
                "provisioning scope. If vault access is managed natively inside "
                "1Password, review vault permissions in the admin console instead.",
            )]
        resp.raise_for_status()
        groups = resp.json().get("Resources", [])
        passed = bool(groups)
        return [IntegrationFinding(
            check_id="onepassword.provisioning.vault_access_groups",
            title="Vault access is granted through provisioned groups",
            description=(
                f"{len(groups)} SCIM-provisioned group(s) available for group-based "
                "vault access." if passed else
                "The SCIM bridge is reachable but no groups are provisioned — vault "
                "access cannot be centrally attested."
            ),
            remediation=(
                "Model vault access on IdP groups synced through SCIM so access can "
                "be reviewed and revoked centrally, rather than per-vault invites."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="access_control",
            result_details={"group_count": len(groups)},
        )]

    async def _check_team_member_status(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, f"{self.credentials.scim_base()}/scim/v2/Users")
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "onepassword.provisioning.member_status", "Team member status is retrievable",
                "hr_controls",
                "No SCIM bridge reachable at the sign-in URL, or the token lacks "
                "provisioning scope. Review member status in the admin console "
                "under People instead.",
            )]
        resp.raise_for_status()
        users = resp.json().get("Resources", [])
        active = [u for u in users if u.get("active", True)]
        suspended = [u for u in users if not u.get("active", True)]
        return [IntegrationFinding(
            check_id="onepassword.provisioning.member_status",
            title="Team member status is retrievable for leaver review",
            description=(
                f"{len(active)} active and {len(suspended)} suspended member(s) of "
                f"{len(users)} tracked through provisioning."
            ),
            remediation=(
                "Confirm every suspended member matches a completed offboarding "
                "and every active member is still an employee or contractor."
            ),
            status="PASSED",
            severity="INFO",
            check_category="hr_controls",
            result_details={
                "total_members": len(users),
                "active": len(active),
                "suspended": len(suspended),
            },
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from 1Password with the supplied token.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
