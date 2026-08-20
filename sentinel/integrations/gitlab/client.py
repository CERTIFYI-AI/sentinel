# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Shared GitLab REST v4 client.

GitLab Cloud, GitLab Self-Managed and GitLab CI/CD are different check sets
over the same REST surface and the same authentication mechanism (Personal
Access Token via the ``PRIVATE-TOKEN`` header).  Token handling and pagination
live here once; each adapter contributes only its checks.

Self-managed instances are why ``base_url`` is parameterised: a cloud adapter
defaults to ``https://gitlab.com`` while a self-managed adapter requires the
operator to supply the instance URL.

Nothing here writes a token to disk, a log line or the database -- tokens are
held in memory for the life of one sync only.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_MAX_PAGES = 20


@dataclass
class GitLabCredentials:
    """Base credential shape shared by every GitLab-family adapter."""

    token: str = ""
    base_url: str = "https://gitlab.com"


class GitLabClient:
    """Token-authenticated paging client against one GitLab instance's v4 API."""

    def __init__(
        self,
        credentials: GitLabCredentials,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.credentials = credentials
        self._client = client

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        return self._client

    @property
    def _base(self) -> str:
        return self.credentials.base_url.rstrip("/")

    def _headers(self) -> dict[str, str]:
        return {
            "PRIVATE-TOKEN": self.credentials.token,
            "Accept": "application/json",
        }

    async def get(self, path: str, **params) -> httpx.Response:
        """One authenticated GET against ``/api/v4/{path}``."""
        url = f"{self._base}/api/v4/{path.lstrip('/')}"
        return await self._http().get(
            url,
            headers=self._headers(),
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def get_paged(self, path: str, **params) -> tuple[list[dict], bool]:
        """Follow GitLab's ``Link`` header pagination.

        Returns ``(items, truncated)``.  ``truncated`` is True when the page
        cap was hit -- a check reports that rather than implying full coverage.
        """
        items: list[dict] = []
        url: str | None = f"{self._base}/api/v4/{path.lstrip('/')}"
        query: dict | None = params or None
        for _ in range(_MAX_PAGES):
            resp = await self._http().get(
                url,
                headers=self._headers(),
                params=query,
                timeout=_TIMEOUT,
            )
            resp.raise_for_status()
            payload = resp.json()
            if isinstance(payload, list):
                items.extend(payload)
            url = self._next_page_url(resp)
            query = None
            if not url:
                return items, False
        return items, True

    @staticmethod
    def _next_page_url(resp: httpx.Response) -> str | None:
        link_header = resp.headers.get("link", "")
        for part in link_header.split(","):
            if 'rel="next"' in part:
                url = part.split(";")[0].strip().strip("<>")
                if url:
                    return url
        return None

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
