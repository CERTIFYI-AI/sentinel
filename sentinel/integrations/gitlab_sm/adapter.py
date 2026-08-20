# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""GitLab Self-Managed instance integration adapter.

Auth: a Personal Access Token with ``read_api`` and ``sudo`` (for
application-settings access) scopes on the self-managed instance.  The
``base_url`` has no default -- the operator must supply their instance URL.

Control mapping table (resolved by sentinel/integrations/control_mapping.py):

+----------------------------------------------+-----------------------+----------------------------------------------+
| check_id                                     | check_category        | Controls mapped                              |
+----------------------------------------------+-----------------------+----------------------------------------------+
| gitlab_sm.instance.version                   | change_management     | SOC2 CC8.1 . ISO27001 A.12.6.1 . PCI 6.3     |
| gitlab_sm.settings.signup_enabled            | access_control        | SOC2 CC6.1/CC6.3 . ISO27001 A.9.2.1 . PCI 7.1|
| gitlab_sm.settings.two_factor                | mfa_enforcement       | SOC2 CC6.1/CC6.6 . ISO27001 A.9.4.2 . PCI 8.3|
+----------------------------------------------+-----------------------+----------------------------------------------+
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding
from sentinel.integrations.gitlab import GitLabClient, GitLabCredentials

logger = logging.getLogger(__name__)


@dataclass
class GitLabSelfManagedCredentials(GitLabCredentials):
    """Matches dashboard/src/integrations/gitlab_sm/config.ts credentialFields."""

    base_url: str = ""


class GitLabSelfManagedAdapter:
    """Fetches instance-level security posture from a GitLab Self-Managed instance.

    No database access; the worker persists returned findings.
    """

    def __init__(
        self,
        credentials: GitLabSelfManagedCredentials,
        client: GitLabClient | None = None,
    ) -> None:
        self.credentials = credentials
        self.gl = client if isinstance(client, GitLabClient) else GitLabClient(credentials, client)

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        if not self.credentials.base_url:
            raise ValueError(
                "GitLab Self-Managed requires a base_url pointing to the "
                "instance (e.g. https://gitlab.example.com)."
            )
        try:
            resp = await self.gl.get("/user")
            if resp.status_code in (401, 403):
                raise ValueError(
                    f"GitLab rejected the token (HTTP {resp.status_code}). "
                    "Check that the Personal Access Token is valid and has "
                    "the read_api scope."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(
                f"Could not reach GitLab at {self.credentials.base_url}: {exc}"
            ) from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        results = await asyncio.gather(
            self._check_instance_version(),
            self._check_signup_enabled(),
            self._check_two_factor(),
            return_exceptions=True,
        )
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("gitlab_sm check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _check_instance_version(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/version")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_sm.instance.version",
                "Instance runs a current GitLab version",
                "change_management",
                "Grant the token read_api scope, or use an admin-level token "
                "to access the version endpoint.",
            )]
        resp.raise_for_status()
        data = resp.json()
        version = data.get("version", "unknown")
        revision = data.get("revision", "unknown")
        return [IntegrationFinding(
            check_id="gitlab_sm.instance.version",
            title=f"Instance running GitLab {version}",
            description=(
                f"The self-managed instance reports version {version} "
                f"(revision {revision}). Verify this is within the vendor's "
                "supported release window."
            ),
            remediation=(
                "Upgrade to the latest stable release within GitLab's "
                "supported version policy. Self-managed instances more than "
                "one major version behind miss security patches."
            ),
            status="PASSED",
            severity="MEDIUM",
            check_category="change_management",
            result_details={"version": version, "revision": revision},
        )]

    async def _check_signup_enabled(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/application/settings")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_sm.settings.signup_enabled",
                "Open signup is disabled",
                "access_control",
                "Grant the token admin-level access to read application settings.",
            )]
        resp.raise_for_status()
        settings = resp.json()
        signup_enabled = settings.get("signup_enabled", False)
        return [IntegrationFinding(
            check_id="gitlab_sm.settings.signup_enabled",
            title=(
                "Open signup is enabled -- anyone can create an account"
                if signup_enabled
                else "Open signup is disabled"
            ),
            description=(
                "The instance allows unauthenticated visitors to register accounts. "
                "On a self-managed instance this typically means anyone with network "
                "access can create a user, which is a significant access-control risk."
                if signup_enabled
                else "The instance does not allow open registration; accounts must be "
                "provisioned by an administrator or via SSO."
            ),
            remediation=(
                "Admin Area > Settings > General > Sign-up restrictions: "
                "uncheck 'Sign-up enabled'. Provision accounts via LDAP, "
                "SAML/SSO, or manual admin creation instead."
            ),
            status="FAILED" if signup_enabled else "PASSED",
            severity="CRITICAL" if signup_enabled else "INFO",
            check_category="access_control",
            result_details={"signup_enabled": signup_enabled},
        )]

    async def _check_two_factor(self) -> list[IntegrationFinding]:
        resp = await self.gl.get("/application/settings")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "gitlab_sm.settings.two_factor",
                "Instance requires two-factor authentication",
                "mfa_enforcement",
                "Grant the token admin-level access to read application settings.",
            )]
        resp.raise_for_status()
        settings = resp.json()
        required = settings.get("require_two_factor_authentication", False)
        return [IntegrationFinding(
            check_id="gitlab_sm.settings.two_factor",
            title=(
                "Instance requires two-factor authentication"
                if required
                else "Two-factor authentication is not required instance-wide"
            ),
            description=(
                "The instance enforces two-factor authentication for all users."
                if required
                else "The instance does not enforce 2FA; users may sign in with "
                "a password alone."
            ),
            remediation=(
                "Admin Area > Settings > General > Sign-in restrictions: "
                "check 'Require all users to set up two-factor authentication'."
            ),
            status="PASSED" if required else "FAILED",
            severity="INFO" if required else "HIGH",
            check_category="mfa_enforcement",
            result_details={"require_two_factor_authentication": required},
        )]

    @staticmethod
    def _unavailable(
        check_id: str, title: str, category: str, remediation: str,
    ) -> IntegrationFinding:
        """A check we could not run reports NOT_AVAILABLE -- never PASSED."""
        return IntegrationFinding(
            check_id=check_id,
            title=title,
            description="Sentinel could not read this from GitLab with the token provided.",
            remediation=remediation,
            status="NOT_AVAILABLE",
            severity="INFO",
            check_category=category,
            result_details={},
        )
