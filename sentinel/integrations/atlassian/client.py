# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Shared Atlassian Cloud client.

Jira, Jira Service Management, Confluence and Confluence Access Control all
authenticate against an Atlassian Cloud site with the same HTTP Basic scheme
(email + API token) and the same ``startAt`` / ``maxResults`` / ``total``
paging contract.  The token and paging live here once; each adapter contributes
only its checks.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_MAX_PAGES = 20


@dataclass
class AtlassianCredentials:
    """HTTP Basic credentials for an Atlassian Cloud site.

    Shared by every Atlassian-family adapter except Bitbucket (which uses its
    own workspace-scoped app password).
    """

    email: str = ""
    api_token: str = ""
    site_url: str = ""


class AtlassianClient:
    """HTTP Basic auth and ``startAt`` paging against one Atlassian Cloud site."""

    def __init__(
        self,
        credentials: AtlassianCredentials,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.credentials = credentials
        self._client = client

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        return self._client

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(self.credentials.email, self.credentials.api_token)

    async def get(self, path: str, **params) -> httpx.Response:
        """One authenticated GET. Returns the raw response so a check can
        distinguish 403 (permission denied) from a real fault."""
        url = path if path.startswith("http") else f"{self.credentials.site_url.rstrip('/')}{path}"
        return await self._http().get(
            url,
            auth=self._auth(),
            headers={"Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def get_paged(
        self,
        path: str,
        key: str = "values",
        **params,
    ) -> tuple[list[dict], bool]:
        """Follow Atlassian's ``startAt`` / ``maxResults`` paging.

        Returns (items, truncated). ``truncated`` is True when the page cap was
        hit -- a check reports that rather than implying full coverage.
        """
        items: list[dict] = []
        start_at = 0
        max_results = params.pop("maxResults", 50)
        for _ in range(_MAX_PAGES):
            resp = await self.get(path, startAt=start_at, maxResults=max_results, **params)
            resp.raise_for_status()
            payload = resp.json()
            page = payload.get(key) or payload.get("results") or []
            items.extend(page)
            total = payload.get("total")
            if total is not None and start_at + len(page) >= total:
                return items, False
            if not page:
                return items, False
            start_at += len(page)
        return items, True

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
