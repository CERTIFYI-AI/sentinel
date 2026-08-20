# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""DigitalOcean integration adapter.

Reads cloud infrastructure security posture from the DigitalOcean API v2:
API token hygiene, Droplets left outside any firewall's coverage, and
Droplet backup configuration.

Auth: a single api_key (DigitalOcean Personal Access Token, Bearer).
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.digitalocean.com/v2"

#: An API token unused for longer than this is a finding. Mirrors the
#: CIS-style 90-day rotation window used by the AWS adapter.
_TOKEN_MAX_AGE_DAYS = 90


@dataclass
class DigitaloceanCredentials:
    """Matches dashboard/src/integrations/digitalocean/config.ts credentialFields."""

    api_key: str


class DigitaloceanAdapter:
    """Fetches cloud security posture from a DigitalOcean team/account."""

    def __init__(self, credentials: DigitaloceanCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Accept": "application/json",
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
                    "DigitalOcean rejected the API token. Verify the token "
                    "is active and has not expired."
                )
            resp.raise_for_status()
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach DigitalOcean: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_api_tokens(client),
                self._check_unfirewalled_droplets(client),
                self._check_droplet_backups(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("digitalocean check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_stale_api_tokens(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        # Team API token management (GET /v2/tokens) is only visible to team
        # owners; a member-scoped token cannot enumerate it.
        resp = await self._get(client, "/tokens", per_page=100)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "digitalocean.iam.stale_api_tokens",
                "API tokens reviewed for staleness and scope",
                "access_control",
                "Use a team-owner token, or grant this token read access to "
                "team token management.",
            )]
        resp.raise_for_status()
        data = resp.json()
        tokens = data.get("tokens", [])
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=_TOKEN_MAX_AGE_DAYS)
        stale: list[str] = []
        full_access: list[str] = []
        for token in tokens:
            name = token.get("name", token.get("id", "unknown"))
            last_used = token.get("last_used_at")
            if token.get("scopes") == "full" or token.get("scopes") == ["full_access"]:
                full_access.append(name)
            if not last_used:
                stale.append(name)
                continue
            try:
                used = dt.datetime.fromisoformat(str(last_used).replace("Z", "+00:00"))
            except ValueError:
                continue
            if used < cutoff:
                stale.append(name)
        status = "PASSED" if not stale and not full_access else "WARNING" if not stale else "FAILED"
        return [IntegrationFinding(
            check_id="digitalocean.iam.stale_api_tokens",
            title=(f"{len(stale)} of {len(tokens)} API tokens are stale or unused"
                   if stale else
                   f"{len(full_access)} API tokens hold full access" if full_access
                   else f"All {len(tokens)} API tokens are recently used and scoped"),
            description=(
                f"{len(tokens)} team API token(s); {len(stale)} unused for "
                f"{_TOKEN_MAX_AGE_DAYS}+ days, {len(full_access)} with full "
                "read/write access."
            ),
            remediation=(
                "Revoke tokens that have not been used recently, and scope "
                "new tokens to the minimum read/write access they need."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH"),
            check_category="access_control",
            result_details={
                "token_count": len(tokens),
                "stale_tokens": stale,
                "full_access_tokens": full_access,
                "max_age_days": _TOKEN_MAX_AGE_DAYS,
            },
        )]

    async def _check_unfirewalled_droplets(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        droplets_resp = await self._get(client, "/droplets", per_page=200)
        if droplets_resp.status_code in (403, 404):
            return [self._unavailable(
                "digitalocean.droplets.unfirewalled_public",
                "Droplets with a public IP are covered by a firewall",
                "network_security",
                "Grant the API token read access to Droplets and firewalls.",
            )]
        droplets_resp.raise_for_status()
        droplets = droplets_resp.json().get("droplets", [])

        firewalls_resp = await self._get(client, "/firewalls", per_page=200)
        covered: set[int] = set()
        if firewalls_resp.status_code not in (403, 404):
            firewalls_resp.raise_for_status()
            for fw in firewalls_resp.json().get("firewalls", []):
                covered.update(fw.get("droplet_ids", []))

        exposed: list[str] = []
        public_droplets = 0
        for droplet in droplets:
            networks = droplet.get("networks", {}).get("v4", [])
            has_public = any(n.get("type") == "public" for n in networks)
            if not has_public:
                continue
            public_droplets += 1
            if droplet.get("id") not in covered:
                exposed.append(droplet.get("name", str(droplet.get("id", ""))))
        status = "PASSED" if not exposed else "FAILED"
        return [IntegrationFinding(
            check_id="digitalocean.droplets.unfirewalled_public",
            title=(f"{len(exposed)} of {public_droplets} public Droplets have no firewall"
                   if exposed else
                   f"All {public_droplets} public Droplets are covered by a firewall"
                   if public_droplets else "No Droplets have a public IP"),
            description=("Public Droplets with no firewall attached: " + ", ".join(exposed[:20])
                         if exposed else
                         "Every Droplet with a public IP is a member of at least "
                         "one Cloud Firewall."),
            remediation=(
                "Networking → Firewalls → attach a firewall that restricts "
                "inbound traffic to the ports and sources the Droplet actually "
                "needs."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="network_security",
            result_details={
                "public_droplet_count": public_droplets,
                "unfirewalled_droplets": exposed,
                "droplet_count": len(droplets),
            },
        )]

    async def _check_droplet_backups(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/droplets", per_page=200)
        if resp.status_code in (403, 404):
            return [self._unavailable(
                "digitalocean.droplets.backups_enabled",
                "Droplet backups are enabled",
                "backup_recovery",
                "Grant the API token read access to Droplets.",
            )]
        resp.raise_for_status()
        droplets = resp.json().get("droplets", [])
        without_backups = [
            d.get("name", str(d.get("id", "")))
            for d in droplets
            if "backups" not in (d.get("features") or [])
        ]
        status = "PASSED" if not without_backups else "WARNING"
        return [IntegrationFinding(
            check_id="digitalocean.droplets.backups_enabled",
            title=(f"{len(without_backups)} of {len(droplets)} Droplets have backups disabled"
                   if without_backups else
                   f"All {len(droplets)} Droplets have backups enabled"
                   if droplets else "No Droplets found"),
            description=("Without automatic backups: " + ", ".join(without_backups[:20])
                         if without_backups else
                         "Every Droplet has the weekly automatic backup feature enabled."),
            remediation=(
                "Droplet → Backups → enable weekly backups, or snapshot "
                "critical Droplets on a schedule via the API/cron."
            ),
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="backup_recovery",
            result_details={
                "droplet_count": len(droplets),
                "droplets_without_backups": without_backups,
            },
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from DigitalOcean with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
