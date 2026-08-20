# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Microsoft Entra ID integration adapter.

Built on the shared Graph client (``sentinel/integrations/msgraph``), so the
same class serves both the commercial tenant slug ``microsoft_entra_id`` and
``microsoft_entra_id_gcc_high`` — only the cloud endpoints differ, and those
are selected by the credentials rather than hardcoded.

Auth: an Entra app registration using client credentials. Application
permissions required (all read-only, admin consent needed):

  Policy.Read.All          security defaults + conditional access
  RoleManagement.Read.Directory  privileged role members
  User.Read.All            guest accounts, sign-in activity
  AuditLog.Read.All        sign-in activity + audit log availability
  Application.Read.All     app registration credential expiry

Entra is the access-control system of record for Microsoft-shop orgs, so its
evidence carries the same weight Okta's does elsewhere. A permission that was
not consented yields NOT_AVAILABLE for that check, never PASSED — a compliance
platform reporting a control satisfied because it could not look is the failure
mode this pipeline exists to prevent.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

┌──────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                             │ check_category           │ Controls mapped                             │
├──────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ entra.policies.mfa_enforced          │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ entra.roles.global_admin_count       │ least_privilege          │ SOC2 CC6.3 · ISO27001 A.9.2.3 · PCI 7.1     │
│ entra.users.stale_signin             │ hr_controls              │ SOC2 CC6.2/CC6.3 · ISO27001 A.9.2.5/A.9.2.6 │
│                                      │                          │ · HIPAA 164.308(a)(3)(ii)(C) · PCI 8.1.4    │
│ entra.users.guest_accounts           │ access_control           │ SOC2 CC6.1/CC6.3 · ISO27001 A.9.2.1         │
│                                      │                          │ · PCI 7.1 · GDPR Art. 28                    │
│ entra.apps.credential_expiry         │ secret_management        │ SOC2 CC6.1 · ISO27001 A.9.2.4 · PCI 8.2     │
│ entra.audit.signin_logs_available    │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1          │
│                                      │                          │ · HIPAA 164.312(b) · PCI 10.1 · GDPR Art. 30│
└──────────────────────────────────────┴──────────────────────────┴─────────────────────────────────────────────┘
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.msgraph import GraphClient, GraphCredentials

logger = logging.getLogger(__name__)

#: Well-known Entra role template id for Global Administrator. Stable across
#: every tenant and cloud — this is the id, not a display name that localises.
_GLOBAL_ADMIN_TEMPLATE = "62e90394-69f5-4237-9190-012177145e10"

#: Microsoft's own guidance is fewer than five standing Global Administrators.
_MAX_GLOBAL_ADMINS = 5

#: An enabled account unused this long is an offboarding signal, not proof of
#: compromise — reported as WARNING, never FAILED.
_STALE_SIGNIN_DAYS = 90

#: App credentials expiring inside this window need rotation scheduling.
_EXPIRY_WARN_DAYS = 30


@dataclass
class EntraCredentials(GraphCredentials):
    """Matches dashboard/src/integrations/entra/config.ts credentialFields."""


@dataclass
class EntraGccHighCredentials(GraphCredentials):
    """GCC High / DoD tenants.

    Same app-registration shape, different sovereign endpoints. Defaulting the
    cloud here — rather than asking the operator to get it right — is what stops
    a GCC High connection silently querying commercial Graph and reporting an
    empty tenant as a clean one.
    """

    cloud: str = "usgov"


class EntraAdapter:
    """Fetches identity posture from Microsoft Entra ID.

    No database access; the worker persists returned findings.
    """

    def __init__(self, credentials: GraphCredentials, client=None) -> None:
        self.credentials = credentials
        self.graph = client if isinstance(client, GraphClient) else GraphClient(credentials, client)

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            resp = await self.graph.get("/v1.0/organization")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Entra accepted the token but refused /organization "
                    f"(HTTP {resp.status_code}). Grant the app registration the "
                    "read-only application permissions this connector needs and "
                    "complete admin consent."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(f"Could not reach Microsoft Graph: {exc}") from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_mfa_enforced(),
            self._check_global_admins(),
            self._check_stale_signin(),
            self._check_guest_accounts(),
            self._check_app_credentials(),
            self._check_audit_logs(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("entra check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_mfa_enforced(self) -> list[IntegrationFinding]:
        """Either security defaults are on, or conditional access requires MFA.

        Both are legitimate ways to enforce MFA and they are mutually exclusive
        in practice — a tenant on Conditional Access has security defaults off.
        Checking only one would fail a correctly configured tenant.
        """
        defaults_on = False
        defaults_resp = await self.graph.get(
            "/v1.0/policies/identitySecurityDefaultsEnforcementPolicy"
        )
        if defaults_resp.status_code == 403:
            return [self._unavailable(
                "entra.policies.mfa_enforced", "MFA is enforced tenant-wide",
                "mfa_enforcement",
                "Grant Policy.Read.All (application) and complete admin consent.",
            )]
        if defaults_resp.status_code == 200:
            defaults_on = bool(defaults_resp.json().get("isEnabled"))

        ca_enabled: list[str] = []
        ca_resp = await self.graph.get("/v1.0/identity/conditionalAccess/policies")
        if ca_resp.status_code == 200:
            for policy in ca_resp.json().get("value", []):
                if policy.get("state") != "enabled":
                    continue
                controls = (policy.get("grantControls") or {}).get("builtInControls") or []
                if "mfa" in controls:
                    ca_enabled.append(policy.get("displayName", ""))

        passed = defaults_on or bool(ca_enabled)
        if defaults_on:
            description = "Security defaults are enabled, which requires MFA for all users."
        elif ca_enabled:
            description = (
                f"{len(ca_enabled)} enabled Conditional Access policy/policies require MFA."
            )
        else:
            description = (
                "Neither security defaults nor an enabled Conditional Access policy "
                "requires MFA — users can sign in with a password alone."
            )
        return [IntegrationFinding(
            check_id="entra.policies.mfa_enforced",
            title="MFA is enforced tenant-wide",
            description=description,
            remediation=(
                "Enable security defaults (Entra admin centre → Properties), or on "
                "P1/P2 create a Conditional Access policy granting access only with "
                "MFA for all users."
            ),
            status="PASSED" if passed else "FAILED",
            severity="CRITICAL",
            check_category="mfa_enforcement",
            result_details={
                "security_defaults_enabled": defaults_on,
                "mfa_conditional_access_policies": ca_enabled[:20],
            },
        )]

    async def _check_global_admins(self) -> list[IntegrationFinding]:
        roles_resp = await self.graph.get("/v1.0/directoryRoles")
        if roles_resp.status_code == 403:
            return [self._unavailable(
                "entra.roles.global_admin_count", "Global Administrators kept few",
                "least_privilege",
                "Grant RoleManagement.Read.Directory (application) and consent.",
            )]
        roles_resp.raise_for_status()
        role_id = next(
            (r.get("id") for r in roles_resp.json().get("value", [])
             if r.get("roleTemplateId") == _GLOBAL_ADMIN_TEMPLATE),
            None,
        )
        if not role_id:
            # The role is only listed once activated in the tenant. Absent is an
            # unknown, not zero admins.
            return [self._unavailable(
                "entra.roles.global_admin_count", "Global Administrators kept few",
                "least_privilege",
                "The Global Administrator role was not returned for this tenant; "
                "review role assignments in the Entra admin centre.",
            )]
        members, truncated = await self.graph.get_paged(f"/v1.0/directoryRoles/{role_id}/members")
        count = len(members)
        passed = count <= _MAX_GLOBAL_ADMINS
        return [IntegrationFinding(
            check_id="entra.roles.global_admin_count",
            title=f"Global Administrators kept at or below {_MAX_GLOBAL_ADMINS}",
            description=f"{count} account(s) hold the Global Administrator role.",
            remediation=(
                "Replace standing Global Administrator rights with the least "
                "privileged built-in role that works, and put the rest behind "
                "Privileged Identity Management just-in-time activation."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH",
            check_category="least_privilege",
            result_details={
                "global_admin_count": count,
                "threshold": _MAX_GLOBAL_ADMINS,
                "results_truncated": truncated,
            },
        )]

    async def _check_stale_signin(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/users",
            **{"$select": "userPrincipalName,accountEnabled,signInActivity", "$top": "999"},
        )
        if resp.status_code in (403, 400):
            # signInActivity needs AuditLog.Read.All and an Entra ID P1 licence;
            # without either Graph refuses the $select rather than omitting it.
            return [self._unavailable(
                "entra.users.stale_signin", f"No enabled account idle {_STALE_SIGNIN_DAYS}+ days",
                "hr_controls",
                "Sign-in activity needs AuditLog.Read.All (application) and an "
                "Entra ID P1 licence. Grant both, or run the leaver review manually.",
            )]
        resp.raise_for_status()
        cutoff = datetime.now(timezone.utc) - timedelta(days=_STALE_SIGNIN_DAYS)
        stale: list[str] = []
        enabled = 0
        for user in resp.json().get("value", []):
            if not user.get("accountEnabled"):
                continue
            enabled += 1
            activity = user.get("signInActivity") or {}
            last = self._parse_ts(activity.get("lastSignInDateTime"))
            if last is None or last < cutoff:
                stale.append(user.get("userPrincipalName", ""))
        passed = not stale
        return [IntegrationFinding(
            check_id="entra.users.stale_signin",
            title=f"No enabled account idle for {_STALE_SIGNIN_DAYS}+ days",
            description=(
                f"{len(stale)} of {enabled} enabled accounts have no sign-in within "
                f"{_STALE_SIGNIN_DAYS} days."
            ),
            remediation=(
                "Confirm each account is still needed; disable the ones that are "
                "not. Dormant enabled accounts are the usual finding in a leaver review."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="hr_controls",
            result_details={
                "stale_count": len(stale),
                "enabled_users_examined": enabled,
                "sample": stale[:20],
            },
        )]

    async def _check_guest_accounts(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/users",
            **{"$filter": "userType eq 'Guest'", "$select": "userPrincipalName", "$top": "999"},
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "entra.users.guest_accounts", "Guest accounts are inventoried",
                "access_control",
                "Grant User.Read.All (application) and complete admin consent.",
            )]
        resp.raise_for_status()
        guests = resp.json().get("value", [])
        # Guests are legitimate; an uninventoried guest population is the risk.
        # This reports the number rather than asserting a threshold nobody agreed.
        return [IntegrationFinding(
            check_id="entra.users.guest_accounts",
            title="Guest accounts are inventoried for periodic review",
            description=(
                f"{len(guests)} guest account(s) in the tenant. Guests are a normal "
                "collaboration mechanism; the control is that they are reviewed."
            ),
            remediation=(
                "Run an Entra access review over guest users so external access is "
                "re-attested rather than accumulating."
            ),
            status="PASSED",
            severity="INFO",
            check_category="access_control",
            result_details={
                "guest_count": len(guests),
                "sample": [g.get("userPrincipalName") for g in guests][:20],
            },
        )]

    async def _check_app_credentials(self) -> list[IntegrationFinding]:
        resp = await self.graph.get(
            "/v1.0/applications",
            **{"$select": "displayName,passwordCredentials,keyCredentials", "$top": "999"},
        )
        if resp.status_code == 403:
            return [self._unavailable(
                "entra.apps.credential_expiry", "App credentials are current",
                "secret_management",
                "Grant Application.Read.All (application) and complete admin consent.",
            )]
        resp.raise_for_status()
        now = datetime.now(timezone.utc)
        soon = now + timedelta(days=_EXPIRY_WARN_DAYS)
        expired: list[str] = []
        expiring: list[str] = []
        for app in resp.json().get("value", []):
            name = app.get("displayName", "")
            creds = (app.get("passwordCredentials") or []) + (app.get("keyCredentials") or [])
            for cred in creds:
                end = self._parse_ts(cred.get("endDateTime"))
                if end is None:
                    continue
                if end < now:
                    expired.append(name)
                elif end < soon:
                    expiring.append(name)
        passed = not expired
        return [IntegrationFinding(
            check_id="entra.apps.credential_expiry",
            title="App registration credentials are current",
            description=(
                f"{len(set(expired))} application(s) have an expired credential; "
                f"{len(set(expiring))} expire within {_EXPIRY_WARN_DAYS} days."
            ),
            remediation=(
                "Rotate expiring secrets and certificates on a schedule, and remove "
                "expired credentials — they are dead weight that hides live ones."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM",
            check_category="secret_management",
            result_details={
                "expired_apps": sorted(set(expired))[:20],
                "expiring_soon_apps": sorted(set(expiring))[:20],
                "warn_window_days": _EXPIRY_WARN_DAYS,
            },
        )]

    async def _check_audit_logs(self) -> list[IntegrationFinding]:
        resp = await self.graph.get("/v1.0/auditLogs/signIns", **{"$top": "1"})
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "entra.audit.signin_logs_available", "Sign-in logs are retrievable",
                "audit_logging",
                "Grant AuditLog.Read.All (application). Sign-in logs also require an "
                "Entra ID P1 licence.",
            )]
        resp.raise_for_status()
        return [IntegrationFinding(
            check_id="entra.audit.signin_logs_available",
            title="Sign-in logs are retrievable for audit evidence",
            description=(
                "The sign-in log endpoint responded, so authentication events can be "
                "collected as Art. 12 / CC7.2 evidence."
            ),
            remediation="No action required.",
            status="PASSED",
            severity="INFO",
            check_category="audit_logging",
            result_details={},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_ts(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE — never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from Microsoft Graph with the permissions granted.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
