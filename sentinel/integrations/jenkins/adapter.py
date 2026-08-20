# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Jenkins integration adapter.

Reads build-server security posture from the Jenkins REST API:
credential-store hygiene, plugin vulnerability posture (outdated
plugins flagged by the update center), and whether build-log secret
masking is in place.

Auth: HTTP Basic with a Jenkins username and API token.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: Plugins whose presence indicates the instance is configured to mask
#: secret values out of build console logs.
_LOG_MASKING_PLUGINS = {"mask-passwords", "credentials-binding"}


@dataclass
class JenkinsCredentials:
    """Matches dashboard/src/integrations/jenkins/config.ts credentialFields."""

    base_url: str
    username: str
    api_credential: str

    def root(self) -> str:
        return self.base_url.rstrip("/")


class JenkinsAdapter:
    """Fetches build-server security posture from Jenkins."""

    def __init__(self, credentials: JenkinsCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _auth(self) -> tuple[str, str]:
        return (self.credentials.username, self.credentials.api_credential)

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _get(self, client: httpx.AsyncClient, path: str, **params) -> httpx.Response:
        return await client.get(
            f"{self.credentials.root()}{path}",
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            resp = await self._get(client, "/api/json")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Jenkins rejected the username / API token pair. Verify "
                    "the API token is active for that user."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Jenkins: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_credential_store_hygiene(client),
                self._check_plugin_vulnerability_posture(client),
                self._check_build_log_secret_leakage(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("jenkins check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_credential_store_hygiene(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client,
            "/credentials/store/system/domain/_/api/json",
            tree="credentials[id,description,typeName]",
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "jenkins.credentials.store_hygiene",
                "Credential store hygiene",
                "secret_management",
                "Grant the API token Credentials > View permission on the "
                "system credential store.",
            )]
        resp.raise_for_status()
        creds = resp.json().get("credentials", [])
        undocumented = [c for c in creds if not (c.get("description") or "").strip()]
        passed = len(creds) == 0 or len(undocumented) == 0
        return [IntegrationFinding(
            check_id="jenkins.credentials.store_hygiene",
            title="Stored credentials are documented and reviewable",
            description=(
                f"{len(undocumented)} of {len(creds)} stored credential(s) in "
                "the system domain have no description, making stale/unused "
                "entries hard to identify for rotation or removal."
            ),
            remediation=(
                "Add an owner and purpose to every stored credential's "
                "description, and periodically audit the credential store "
                "to remove entries no longer referenced by any job."
            ),
            status="PASSED" if passed else "WARNING",
            severity="MEDIUM" if undocumented else "INFO",
            check_category="secret_management",
            result_details={
                "credential_count": len(creds),
                "undocumented_credential_count": len(undocumented),
            },
        )]

    async def _check_plugin_vulnerability_posture(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client,
            "/pluginManager/api/json",
            tree="plugins[shortName,version,active,hasUpdate]",
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "jenkins.plugins.vulnerability_posture",
                "Plugin vulnerability posture",
                "vulnerability_management",
                "Grant the API token Overall > Read and Manage permission on "
                "the plugin manager.",
            )]
        resp.raise_for_status()
        plugins = resp.json().get("plugins", [])
        outdated_active = [p for p in plugins if p.get("active") and p.get("hasUpdate")]
        passed = len(outdated_active) == 0
        return [IntegrationFinding(
            check_id="jenkins.plugins.vulnerability_posture",
            title="Active plugins are up to date",
            description=(
                f"{len(outdated_active)} of {len(plugins)} active plugin(s) "
                "have an available update, which may include a security fix."
            ),
            remediation=(
                "Update outdated plugins via the update center, prioritising "
                "any flagged with a published security advisory, and remove "
                "plugins that are installed but unused."
            ),
            status="PASSED" if passed else "WARNING",
            severity="HIGH" if len(outdated_active) > 5 else ("MEDIUM" if outdated_active else "INFO"),
            check_category="vulnerability_management",
            result_details={
                "plugin_count": len(plugins),
                "outdated_active_plugin_count": len(outdated_active),
                "outdated_active_plugin_names": [p.get("shortName") for p in outdated_active][:25],
            },
        )]

    async def _check_build_log_secret_leakage(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(
            client,
            "/pluginManager/api/json",
            tree="plugins[shortName,active]",
        )
        if resp.status_code in (401, 403, 404):
            return [self._unavailable(
                "jenkins.builds.log_masking",
                "Build-log leakage protection",
                "change_management",
                "Grant the API token Overall > Read permission on the plugin "
                "manager.",
            )]
        resp.raise_for_status()
        plugins = resp.json().get("plugins", [])
        active_names = {p.get("shortName") for p in plugins if p.get("active")}
        masking_installed = bool(active_names & _LOG_MASKING_PLUGINS)
        return [IntegrationFinding(
            check_id="jenkins.builds.log_masking",
            title="Build console logs mask injected credential values",
            description=(
                "A credential-masking plugin (mask-passwords or "
                "credentials-binding) is "
                + ("active." if masking_installed else "not active.")
            ),
            remediation=(
                "Install and enable the Mask Passwords plugin (or rely "
                "exclusively on the Credentials Binding plugin's `withCredentials` "
                "step) so secret values injected into build steps are redacted "
                "from console output."
            ),
            status="PASSED" if masking_installed else "FAILED",
            severity="INFO" if masking_installed else "HIGH",
            check_category="change_management",
            result_details={
                "active_plugin_count": len(active_names),
                "log_masking_plugin_active": masking_installed,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Jenkins with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
