# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""GitHub integration adapter.

Install: ``pip install PyGithub`` (imported as ``github``).

Evidence source per the Continuous GRC master sheet: repositories, branch
rules, memberships, security alerts. Auth: a fine-grained PAT or GitHub App
token with ``read:org``, ``repo`` (metadata/administration read) and
``security_events`` read.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌──────────────────────────────────────┬──────────────────────────┬─────────────────────────────────────────────┐
│ check_id                             │ check_category           │ Controls mapped                             │
├──────────────────────────────────────┼──────────────────────────┼─────────────────────────────────────────────┤
│ github.org.mfa_required              │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2         │
│                                      │                          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3          │
│ github.org.admin_ratio               │ least_privilege          │ SOC2 CC6.3 · ISO27001 A.9.2.3/A.9.4.1       │
│                                      │                          │ · PCI 7.1 · GDPR Art. 25                    │
│ github.repos.private_visibility      │ access_control           │ SOC2 CC6.1–6.3 · ISO27001 A.9.1.1/A.9.2.1   │
│                                      │                          │ · PCI 7.1/7.2 · GDPR Art. 25                │
│ github.repos.branch_protection       │ change_management        │ SOC2 CC8.1 · ISO27001 A.12.1.2 · PCI 6.4    │
│ github.repos.secret_scanning         │ secret_management        │ SOC2 CC6.1 · ISO27001 A.9.2.4 · PCI 8.2     │
│ github.repos.dependabot_alerts       │ vulnerability_management │ SOC2 CC7.1 · ISO27001 A.12.6.1 · PCI 6.3/11.3│
│ github.org.audit_log_available       │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1/A.12.4.3 │
│                                      │                          │ · HIPAA 164.312(b) · PCI 10.1/10.2          │
│                                      │                          │ · GDPR Art. 30                              │
└──────────────────────────────────────┴──────────────────────────┴─────────────────────────────────────────────┘
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

# Enterprise Cloud plans expose the org audit log API; other plans 404.
_AUDIT_LOG_PLANS = {"enterprise", "business"}


@dataclass
class GithubCredentials:
    """Matches dashboard/src/integrations/github/config.ts credentialFields."""

    token: str
    organization: str
    base_url: str = "https://api.github.com"  # GHES: https://ghe.example.com/api/v3


class GithubAdapter:
    """Fetches org/repo security posture from GitHub via PyGithub.

    No database access; the worker persists returned findings. All PyGithub
    calls are blocking, so they run through ``asyncio.to_thread``.
    """

    def __init__(self, credentials: GithubCredentials, client=None) -> None:
        self.credentials = credentials
        # Injectable for tests; constructed lazily otherwise so importing the
        # adapter never requires network or the SDK's auth machinery.
        self._client = client

    def _github(self):
        if self._client is None:
            from github import Auth, Github  # pip install PyGithub

            self._client = Github(
                auth=Auth.Token(self.credentials.token),
                base_url=self.credentials.base_url,
            )
        return self._client

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            org = await asyncio.to_thread(
                self._github().get_organization, self.credentials.organization
            )
            _ = org.login
            return True
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(
                f"GitHub credentials rejected for organization "
                f"{self.credentials.organization!r}: {exc}"
            ) from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        checks = (
            self._check_org_mfa(),
            self._check_admin_ratio(),
            self._check_repo_visibility(),
            self._check_branch_protection(),
            self._check_secret_scanning(),
            self._check_dependabot_alerts(),
            self._check_audit_log(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("github check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _org(self):
        return await asyncio.to_thread(
            self._github().get_organization, self.credentials.organization
        )

    async def _repos(self) -> list:
        org = await self._org()
        return await asyncio.to_thread(lambda: list(org.get_repos()))

    # ── checks ──────────────────────────────────────────────────────────────

    async def _check_org_mfa(self) -> list[IntegrationFinding]:
        org = await self._org()
        enabled = bool(getattr(org, "two_factor_requirement_enabled", False))
        return [IntegrationFinding(
            check_id="github.org.mfa_required",
            title="Organization requires two-factor authentication"
                  if enabled else "Two-factor authentication not required",
            description=(
                f"Organization {org.login!r} "
                + ("requires 2FA for all members."
                   if enabled else "does not require 2FA — any member may sign in with password only.")
            ),
            remediation="Organization Settings → Authentication security → "
                        "Require two-factor authentication.",
            status="PASSED" if enabled else "FAILED",
            severity="INFO" if enabled else "CRITICAL",
            check_category="mfa_enforcement",
            result_details={"organization": org.login,
                            "two_factor_requirement_enabled": enabled},
        )]

    async def _check_admin_ratio(self) -> list[IntegrationFinding]:
        org = await self._org()
        admins = await asyncio.to_thread(lambda: list(org.get_members(role="admin")))
        members = await asyncio.to_thread(lambda: list(org.get_members()))
        total, n_admin = len(members), len(admins)
        ratio = (n_admin / total) if total else 0.0
        # More than a third of the org holding owner rights is not least
        # privilege in any reading; below that it degrades to a warning.
        status = "PASSED" if ratio <= 0.15 or n_admin <= 2 else (
            "WARNING" if ratio <= 0.34 else "FAILED")
        return [IntegrationFinding(
            check_id="github.org.admin_ratio",
            title=f"{n_admin} of {total} members hold organization owner role",
            description=f"{n_admin}/{total} members ({ratio:.0%}) are organization owners.",
            remediation="Demote members who do not need owner rights; grant "
                        "repo-level admin instead of org ownership.",
            status=status,
            severity="INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH"),
            check_category="least_privilege",
            result_details={"admins": [a.login for a in admins], "member_count": total},
        )]

    async def _check_repo_visibility(self) -> list[IntegrationFinding]:
        repos = await self._repos()
        public = [r.full_name for r in repos if not r.private]
        status = "PASSED" if not public else "WARNING"
        return [IntegrationFinding(
            check_id="github.repos.private_visibility",
            title=(f"{len(public)} public repositories" if public
                   else "All repositories are private"),
            description=("Public repositories in the organization: "
                         + ", ".join(public[:20]) if public
                         else "Every repository in the organization is private."),
            remediation="Review each public repository; make private unless "
                        "publication is intentional and approved.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"public_repos": public, "total_repos": len(repos)},
        )]

    async def _check_branch_protection(self) -> list[IntegrationFinding]:
        repos = await self._repos()
        unprotected: list[str] = []
        for repo in repos:
            if getattr(repo, "archived", False):
                continue
            try:
                branch = await asyncio.to_thread(repo.get_branch, repo.default_branch)
                if not branch.protected:
                    unprotected.append(repo.full_name)
            except Exception:  # noqa: BLE001 — empty repo has no default branch
                continue
        status = "PASSED" if not unprotected else "FAILED"
        return [IntegrationFinding(
            check_id="github.repos.branch_protection",
            title=(f"{len(unprotected)} repositories without default-branch protection"
                   if unprotected else "All default branches are protected"),
            description=("Default branch is unprotected on: "
                         + ", ".join(unprotected[:20]) if unprotected
                         else "Every active repository protects its default branch."),
            remediation="Add a branch protection rule (required reviews, no "
                        "force pushes) to each default branch.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="change_management",
            result_details={"unprotected_repos": unprotected},
        )]

    async def _check_secret_scanning(self) -> list[IntegrationFinding]:
        repos = await self._repos()
        disabled: list[str] = []
        unknown = 0
        for repo in repos:
            sa = getattr(repo, "security_and_analysis", None)
            if sa is None or getattr(sa, "secret_scanning", None) is None:
                unknown += 1
                continue
            if getattr(sa.secret_scanning, "status", "disabled") != "enabled":
                disabled.append(repo.full_name)
        if unknown == len(repos):
            status: str = "NOT_AVAILABLE"
        else:
            status = "PASSED" if not disabled else "FAILED"
        return [IntegrationFinding(
            check_id="github.repos.secret_scanning",
            title={"NOT_AVAILABLE": "Secret scanning state not visible to this token",
                   "PASSED": "Secret scanning enabled on all repositories",
                   "FAILED": f"Secret scanning disabled on {len(disabled)} repositories",
                   }[status],
            description=("The token cannot read security_and_analysis; grant "
                         "administration read or use a GitHub App."
                         if status == "NOT_AVAILABLE" else
                         ("Disabled on: " + ", ".join(disabled[:20])
                          if disabled else "Enabled everywhere.")),
            remediation="Repository Settings → Code security → enable Secret "
                        "scanning (org-wide via Security configurations).",
            status=status,  # type: ignore[arg-type]
            severity="INFO" if status == "PASSED" else ("LOW" if status == "NOT_AVAILABLE" else "HIGH"),
            check_category="secret_management",
            result_details={"disabled_repos": disabled, "unreadable_repos": unknown},
        )]

    async def _check_dependabot_alerts(self) -> list[IntegrationFinding]:
        repos = await self._repos()
        disabled: list[str] = []
        for repo in repos:
            try:
                enabled = await asyncio.to_thread(repo.get_vulnerability_alert)
            except Exception:  # noqa: BLE001
                continue
            if not enabled:
                disabled.append(repo.full_name)
        status = "PASSED" if not disabled else "FAILED"
        return [IntegrationFinding(
            check_id="github.repos.dependabot_alerts",
            title=(f"Dependabot alerts disabled on {len(disabled)} repositories"
                   if disabled else "Dependabot alerts enabled on all repositories"),
            description=("Disabled on: " + ", ".join(disabled[:20])
                         if disabled else "Vulnerability alerts are on everywhere."),
            remediation="Repository Settings → Code security → enable "
                        "Dependabot alerts (or org-wide via Security configurations).",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="vulnerability_management",
            result_details={"disabled_repos": disabled},
        )]

    async def _check_audit_log(self) -> list[IntegrationFinding]:
        org = await self._org()
        plan = getattr(getattr(org, "plan", None), "name", "") or ""
        available = plan.lower() in _AUDIT_LOG_PLANS
        return [IntegrationFinding(
            check_id="github.org.audit_log_available",
            title=("Organization audit log API available" if available
                   else "Audit log API not available on this plan"),
            description=(f"Plan {plan!r} exposes the organization audit log API."
                         if available else
                         f"Plan {plan!r} does not expose the audit log API; "
                         "audit trail evidence cannot be pulled automatically."),
            remediation="Upgrade to GitHub Enterprise Cloud for audit log API "
                        "access, or export logs manually for evidence.",
            status="PASSED" if available else "NOT_AVAILABLE",
            severity="INFO" if available else "LOW",
            check_category="audit_logging",
            result_details={"plan": plan},
        )]
