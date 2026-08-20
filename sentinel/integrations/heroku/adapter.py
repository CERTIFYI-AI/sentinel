# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Heroku integration adapter.

Reads platform security posture from the Heroku Platform API: OAuth
authorizations with no expiration, apps that run a database/cache add-on
outside a Private Space (so the data plane sits on the public Common
Runtime), and Postgres add-ons with no recorded backup.

Auth: a single api_key (Heroku API key / OAuth token, Bearer).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.heroku.com"
_ACCEPT = "application/vnd.heroku+json; version=3"

#: Add-on service slugs treated as holding data at rest.
_DATA_ADDON_PREFIXES = ("heroku-postgresql", "heroku-redis", "heroku-kafka")


@dataclass
class HerokuCredentials:
    """Matches dashboard/src/integrations/heroku/config.ts credentialFields."""

    api_key: str


class HerokuAdapter:
    """Fetches platform security posture from a Heroku account."""

    def __init__(self, credentials: HerokuCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": _ACCEPT,
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
            resp = await self._get(client, "/account")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Heroku rejected the API key. Verify the key is active "
                    "and has not been rotated."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Heroku: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_non_expiring_oauth_tokens(client),
                self._check_data_addons_outside_private_space(client),
                self._check_postgres_backups_configured(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("heroku check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_non_expiring_oauth_tokens(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/oauth/authorizations")
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "heroku.iam.non_expiring_oauth_tokens",
                "OAuth authorizations have an expiration",
                "access_control",
                "Grant this key read access to OAuth authorizations "
                "(identity scope).",
            )]
        resp.raise_for_status()
        authorizations = resp.json()
        non_expiring = [
            a.get("description", a.get("id", "unknown"))
            for a in authorizations
            if not (a.get("access_token") or {}).get("expires_in")
        ]
        status = "PASSED" if not non_expiring else "WARNING"
        return [IntegrationFinding(
            check_id="heroku.iam.non_expiring_oauth_tokens",
            title=(f"{len(non_expiring)} of {len(authorizations)} OAuth authorizations never expire"
                   if non_expiring else
                   f"All {len(authorizations)} OAuth authorizations expire"
                   if authorizations else "No OAuth authorizations found"),
            description=("Long-lived authorizations: " + ", ".join(non_expiring[:20])
                         if non_expiring else
                         "Every OAuth authorization on this account has a token "
                         "expiration set."),
            remediation=(
                "Account → Applications → revoke long-lived authorizations "
                "that are no longer needed, and prefer short-lived tokens "
                "refreshed via the OAuth flow for CI/CD integrations."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={
                "authorization_count": len(authorizations),
                "non_expiring_authorizations": non_expiring,
            },
        )]

    async def _check_data_addons_outside_private_space(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        apps_resp = await self._get(client, "/apps")
        if apps_resp.status_code in (403, 404):
            return [self._unavailable(
                "heroku.apps.database_addons_outside_private_space",
                "Data add-ons run inside a Private Space",
                "network_security",
                "Grant this key read access to apps and add-ons.",
            )]
        apps_resp.raise_for_status()
        apps = apps_resp.json()

        exposed: list[str] = []
        checked_apps = 0
        for app in apps:
            app_id = app.get("id", "")
            in_private_space = bool(app.get("space"))
            addons_resp = await self._get(client, f"/apps/{app_id}/addons")
            if addons_resp.status_code in (403, 404):
                continue
            addons_resp.raise_for_status()
            addons = addons_resp.json()
            has_data_addon = any(
                str((a.get("addon_service") or {}).get("name", "")).startswith(_DATA_ADDON_PREFIXES)
                for a in addons
            )
            if has_data_addon:
                checked_apps += 1
                if not in_private_space:
                    exposed.append(app.get("name", app_id))
        status = "PASSED" if not exposed else "WARNING"
        return [IntegrationFinding(
            check_id="heroku.apps.database_addons_outside_private_space",
            title=(f"{len(exposed)} of {checked_apps} apps with a data add-on run outside a Private Space"
                   if exposed else
                   f"All {checked_apps} apps with a data add-on run in a Private Space"
                   if checked_apps else "No apps with a Postgres/Redis/Kafka add-on found"),
            description=("On the public Common Runtime: " + ", ".join(exposed[:20])
                         if exposed else
                         "Every app running a Postgres, Redis, or Kafka add-on "
                         "is deployed inside a network-isolated Private Space."),
            remediation=(
                "Move apps that hold production data into a Private Space so "
                "the dyno-to-datastore path never traverses the public "
                "internet, or restrict the add-on's own network access."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="network_security",
            result_details={
                "apps_with_data_addon": checked_apps,
                "apps_outside_private_space": exposed,
                "app_count": len(apps),
            },
        )]

    async def _check_postgres_backups_configured(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        apps_resp = await self._get(client, "/apps")
        if apps_resp.status_code in (403, 404):
            return [self._unavailable(
                "heroku.postgres.backups_configured",
                "Heroku Postgres add-ons have a recorded backup",
                "backup_recovery",
                "Grant this key read access to apps, add-ons, and Postgres "
                "backups.",
            )]
        apps_resp.raise_for_status()
        apps = apps_resp.json()

        without_backups: list[str] = []
        pg_apps = 0
        for app in apps:
            app_id = app.get("id", "")
            addons_resp = await self._get(client, f"/apps/{app_id}/addons")
            if addons_resp.status_code in (403, 404):
                continue
            addons_resp.raise_for_status()
            pg_addons = [
                a for a in addons_resp.json()
                if str((a.get("addon_service") or {}).get("name", "")).startswith("heroku-postgresql")
            ]
            if not pg_addons:
                continue
            pg_apps += 1
            for addon in pg_addons:
                addon_id = addon.get("id", addon.get("name", ""))
                backups_resp = await client.get(
                    f"{_BASE}/client/v11/apps/{app_id}/addons/{addon_id}/backups",
                    headers=self._headers(),
                    timeout=_TIMEOUT,
                )
                if backups_resp.status_code in (403, 404):
                    continue
                backups_resp.raise_for_status()
                if not backups_resp.json():
                    without_backups.append(f"{app.get('name', app_id)}:{addon.get('name', addon_id)}")
        status = "PASSED" if not without_backups else "WARNING"
        return [IntegrationFinding(
            check_id="heroku.postgres.backups_configured",
            title=(f"{len(without_backups)} of {pg_apps} Postgres add-ons have no recorded backup"
                   if without_backups else
                   f"All {pg_apps} Postgres add-ons have a recorded backup"
                   if pg_apps else "No Heroku Postgres add-ons found"),
            description=("Without any backup: " + ", ".join(without_backups[:20])
                         if without_backups else
                         "Every Heroku Postgres add-on has at least one "
                         "captured backup."),
            remediation=(
                "heroku pg:backups:schedule → schedule a daily backup for "
                "every production Postgres add-on, or trigger one manually "
                "with heroku pg:backups:capture."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="backup_recovery",
            result_details={
                "postgres_addon_apps": pg_apps,
                "addons_without_backups": without_backups,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Heroku with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
