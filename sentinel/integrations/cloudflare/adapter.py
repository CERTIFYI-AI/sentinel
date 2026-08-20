# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Cloudflare integration adapter.

Reads account and zone security posture from the Cloudflare API:
non-expiring or stale API tokens, WAF managed-ruleset enforcement per
zone, and the Always Online resilience setting as a backup/recovery
signal.

Auth: a scoped API Token (Bearer) plus the account ID the token operates
against.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_BASE = "https://api.cloudflare.com/client/v4"

#: A token with no use recorded (or none recorded within this window) is
#: worth reviewing — it is either unused or Cloudflare has no visibility
#: into it, and either way it is standing risk with no offsetting benefit.
_STALE_TOKEN_DAYS = 90


@dataclass
class CloudflareCredentials:
    """Matches dashboard/src/integrations/cloudflare/config.ts credentialFields."""

    api_key: str
    account_id: str


class CloudflareAdapter:
    """Reads account and zone security posture from Cloudflare."""

    def __init__(self, credentials: CloudflareCredentials, client: httpx.AsyncClient | None = None) -> None:
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
            resp = await self._get(client, "/user/tokens/verify")
            if resp.status_code in (401, 403):
                raise ValueError(
                    "Cloudflare rejected the API token. Verify the token is "
                    "active and has not expired or been revoked."
                )
            resp.raise_for_status()
            body = resp.json()
            if not body.get("success"):
                raise ValueError(
                    "Cloudflare rejected the token: "
                    + str(body.get("errors", "unknown error"))
                )
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Cloudflare: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_or_nonexpiring_tokens(client),
                self._check_waf_managed_ruleset_active(client),
                self._check_always_online_enabled(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("cloudflare check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    async def _zones(self, client: httpx.AsyncClient) -> list[dict]:
        resp = await self._get(client, "/zones", **{"account.id": self.credentials.account_id, "per_page": 50})
        if resp.status_code in (401, 403):
            return []
        resp.raise_for_status()
        return resp.json().get("result", []) or []

    # -- checks ----------------------------------------------------------------

    async def _check_stale_or_nonexpiring_tokens(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        resp = await self._get(client, "/user/tokens")
        if resp.status_code in (401, 403):
            return [self._unavailable(
                "cloudflare.tokens.stale_or_nonexpiring",
                "Stale or non-expiring API tokens",
                "access_control",
                "This check requires a token with the 'API Tokens Read' "
                "permission on the user's own tokens.",
            )]
        resp.raise_for_status()
        body = resp.json()
        if not body.get("success"):
            return [self._unavailable(
                "cloudflare.tokens.stale_or_nonexpiring",
                "Stale or non-expiring API tokens",
                "access_control",
                "This check requires a token with the 'API Tokens Read' "
                "permission on the user's own tokens.",
            )]
        tokens = body.get("result", []) or []
        now = datetime.now(timezone.utc)
        flagged: list[str] = []
        for token in tokens:
            if token.get("status") != "active":
                continue
            name = token.get("name", token.get("id", "unknown"))
            non_expiring = not token.get("expires_on")
            last_used = token.get("last_used_on")
            stale = False
            if last_used:
                try:
                    used_at = datetime.fromisoformat(last_used.replace("Z", "+00:00"))
                    stale = (now - used_at).days > _STALE_TOKEN_DAYS
                except ValueError:
                    stale = False
            else:
                stale = True  # never used
            if non_expiring or stale:
                flagged.append(str(name))
        status = "PASSED" if not flagged else "WARNING"
        return [IntegrationFinding(
            check_id="cloudflare.tokens.stale_or_nonexpiring",
            title=(f"{len(flagged)} of {len(tokens)} active API tokens are non-expiring or "
                   f"unused for {_STALE_TOKEN_DAYS}+ days" if flagged else
                   f"All {len(tokens)} active API tokens expire and show recent use"),
            description=("Flagged tokens: " + ", ".join(flagged[:20]) + "." if flagged else
                         "Every active token has an expiry date and recent recorded use."),
            remediation="Cloudflare Dashboard → My Profile → API Tokens → set an expiry "
                        "(and a Time-based Adaptive Authentication policy where relevant) "
                        "on standing tokens, and delete tokens with no recent use.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"active_tokens": len(tokens), "flagged_tokens": flagged,
                            "max_age_days": _STALE_TOKEN_DAYS},
        )]

    async def _check_waf_managed_ruleset_active(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        zones = await self._zones(client)
        if not zones:
            return [self._unavailable(
                "cloudflare.waf.managed_ruleset_active",
                "WAF managed ruleset enforcement",
                "network_security",
                "Grant the token the 'Zone WAF Read' permission for zones "
                "under this account.",
            )]
        without_waf: list[str] = []
        for zone in zones:
            zone_id = zone.get("id", "")
            name = zone.get("name", zone_id)
            resp = await self._get(
                client, f"/zones/{zone_id}/rulesets/phases/http_request_firewall_managed/entrypoint"
            )
            if resp.status_code == 404:
                without_waf.append(str(name))
                continue
            if resp.status_code in (401, 403):
                continue
            resp.raise_for_status()
            body = resp.json()
            rules = (body.get("result") or {}).get("rules", []) if body.get("success") else []
            if not rules:
                without_waf.append(str(name))
        status = "PASSED" if not without_waf else "FAILED"
        return [IntegrationFinding(
            check_id="cloudflare.waf.managed_ruleset_active",
            title=(f"{len(without_waf)} of {len(zones)} zones have no active WAF managed "
                   "ruleset" if without_waf else f"All {len(zones)} zones enforce a WAF managed ruleset"),
            description=("Zones without an active managed ruleset: " + ", ".join(without_waf[:20])
                         if without_waf else
                         "Every zone has at least one rule active in the managed WAF phase."),
            remediation="Cloudflare Dashboard → zone → Security → WAF → Managed rules → "
                        "deploy the Cloudflare Managed Ruleset (and OWASP Core Ruleset where "
                        "applicable) to the zone.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="network_security",
            result_details={"zones": len(zones), "zones_without_waf": without_waf},
        )]

    async def _check_always_online_enabled(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        zones = await self._zones(client)
        if not zones:
            return [self._unavailable(
                "cloudflare.zone.always_online_enabled",
                "Always Online resilience setting",
                "backup_recovery",
                "Grant the token the 'Zone Settings Read' permission for "
                "zones under this account.",
            )]
        disabled: list[str] = []
        for zone in zones:
            zone_id = zone.get("id", "")
            name = zone.get("name", zone_id)
            resp = await self._get(client, f"/zones/{zone_id}/settings/always_online")
            if resp.status_code in (401, 403, 404):
                disabled.append(str(name))
                continue
            resp.raise_for_status()
            body = resp.json()
            value = (body.get("result") or {}).get("value") if body.get("success") else None
            if value != "on":
                disabled.append(str(name))
        status = "PASSED" if not disabled else "WARNING"
        return [IntegrationFinding(
            check_id="cloudflare.zone.always_online_enabled",
            title=(f"{len(disabled)} of {len(zones)} zones have Always Online off" if disabled
                   else f"All {len(zones)} zones have Always Online on"),
            description=("Zones without Always Online: " + ", ".join(disabled[:20]) + "."
                         if disabled else
                         "Every zone serves a cached copy of the site if the origin goes down."),
            remediation="Cloudflare Dashboard → zone → Caching → Configuration → turn on "
                        "Always Online so visitors still see a cached page during an origin outage.",
            status=status,
            severity="INFO" if status == "PASSED" else "LOW",
            check_category="backup_recovery",
            result_details={"zones": len(zones), "always_online_off": disabled},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Cloudflare with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
