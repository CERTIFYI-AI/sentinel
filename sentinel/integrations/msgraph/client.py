# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Shared Microsoft Graph client.

Phase 1 of the connector rollout is thirteen catalogue slugs that all sit
behind one auth surface — an Entra app registration using the client-credentials
flow. Entra ID, Intune, SharePoint, OneDrive, Teams, Defender and Sentinel are
different *check sets* over the same token and the same paging contract, so the
token and paging live here once and each adapter contributes only its checks.

SOVEREIGN CLOUDS ARE WHY THIS IS PARAMETERISED. GCC High and DoD tenants use
different login and Graph hostnames from commercial; a `microsoft_entra_id`
adapter hardcoded to `graph.microsoft.com` simply cannot serve
`microsoft_entra_id_gcc_high`. Selecting the cloud here means one adapter class
serves both catalogue slugs, which is the whole leverage argument for this
phase.

Nothing here writes a token to disk, a log line or the database — tokens are
cached in memory for the life of one sync only.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: Endpoint pairs per Microsoft national cloud. Keys are what an operator picks
#: in the connect form.
CLOUDS: dict[str, dict[str, str]] = {
    "commercial": {
        "login": "https://login.microsoftonline.com",
        "graph": "https://graph.microsoft.com",
    },
    # GCC High / DoD. Distinct hostnames, not a suffix change on commercial.
    "usgov": {
        "login": "https://login.microsoftonline.us",
        "graph": "https://graph.microsoft.us",
    },
}

#: Cap pages so one very large tenant cannot stall a sync. When the cap is hit
#: the caller is told, so a check can say it saw a subset instead of implying
#: it saw everything.
_MAX_PAGES = 20


@dataclass
class GraphCredentials:
    """Entra app registration using client credentials.

    Shared by every Graph-family adapter; each one documents the application
    permissions its own checks require.
    """

    tenant_id: str
    client_id: str
    client_secret: str
    #: 'commercial' or 'usgov'. The GCC High credential subclasses override the
    #: default so the operator cannot silently point a GCC High connection at
    #: commercial endpoints.
    cloud: str = "commercial"

    def endpoints(self) -> dict[str, str]:
        return CLOUDS.get(self.cloud, CLOUDS["commercial"])


class GraphClient:
    """Token acquisition and paging against one tenant's Graph endpoint."""

    def __init__(self, credentials: GraphCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._token: str | None = None

    @property
    def graph_base(self) -> str:
        return self.credentials.endpoints()["graph"]

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        return self._client

    async def token(self) -> str:
        """Client-credentials token for Graph, cached for this sync run."""
        if self._token is not None:
            return self._token
        login = self.credentials.endpoints()["login"]
        response = await self._http().post(
            f"{login}/{self.credentials.tenant_id}/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.credentials.client_id,
                "client_secret": self.credentials.client_secret,
                "scope": f"{self.graph_base}/.default",
            },
            timeout=_TIMEOUT,
        )
        if response.status_code != 200:
            # Deliberately not echoing the response body: an Entra error can
            # quote the submitted client_id, and the operator does not need it
            # to act on this.
            raise ValueError(
                f"Microsoft rejected the app registration (HTTP {response.status_code}). "
                "Check the tenant id, client id and client secret, that the secret "
                "has not expired, and that admin consent was granted for the "
                "application permissions this connector needs."
            )
        self._token = str(response.json().get("access_token", ""))
        return self._token

    async def get(self, path: str, **params) -> httpx.Response:
        """One authenticated GET against Graph. Returns the raw response so a
        check can distinguish 403 (permission not consented) from a real fault."""
        token = await self.token()
        url = path if path.startswith("http") else f"{self.graph_base}{path}"
        return await self._http().get(
            url,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def get_paged(self, path: str, **params) -> tuple[list[dict], bool]:
        """Follow Graph's ``@odata.nextLink`` paging.

        Returns (items, truncated). ``truncated`` is True when the page cap was
        hit — a check reports that rather than implying full coverage.
        """
        items: list[dict] = []
        url: str | None = path
        query: dict | None = params or None
        for _ in range(_MAX_PAGES):
            resp = await self.get(url, **(query or {}))
            resp.raise_for_status()
            payload = resp.json()
            items.extend(payload.get("value", []))
            url, query = payload.get("@odata.nextLink"), None
            if not url:
                return items, False
        return items, True

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
