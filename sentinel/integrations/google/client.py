# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Shared Google client for the Google-family adapters.

Six catalogue slugs share one auth surface: a GCP service account with
domain-wide delegation. Workspace, Cloud Identity, Drive, GCP, Vertex AI and
Chronicle are different check sets over the same JWT-assertion flow and the
same paging contract, so the token acquisition and paging live here once and
each adapter contributes only its checks.

Nothing here writes a token to disk, a log line or the database -- tokens are
cached in memory for the life of one sync only.
"""

from __future__ import annotations

import base64
import json
import logging
import time
from dataclasses import dataclass

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

_MAX_PAGES = 20


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


@dataclass
class GoogleCredentials:
    """Service account with optional domain-wide delegation.

    Shared by every Google-family adapter; each one documents the OAuth scopes
    its own checks require.
    """

    service_account_json: str = ""
    delegated_admin_email: str = ""
    project_id: str = ""


class GoogleClient:
    """Token acquisition and paging against Google REST APIs."""

    def __init__(
        self,
        credentials: GoogleCredentials,
        scopes: list[str],
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.credentials = credentials
        self.scopes = scopes
        self._client = client
        self._token: str | None = None

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        return self._client

    def _build_jwt(self) -> str:
        sa = json.loads(self.credentials.service_account_json)
        now = int(time.time())
        header = {"alg": "RS256", "typ": "JWT"}
        claims: dict = {
            "iss": sa["client_email"],
            "scope": " ".join(self.scopes),
            "aud": _TOKEN_ENDPOINT,
            "iat": now,
            "exp": now + 3600,
        }
        if self.credentials.delegated_admin_email:
            claims["sub"] = self.credentials.delegated_admin_email

        segments = _b64url(json.dumps(header).encode()) + "." + _b64url(json.dumps(claims).encode())
        private_key = serialization.load_pem_private_key(
            sa["private_key"].encode(), password=None,
        )
        signature = private_key.sign(  # type: ignore[union-attr]
            segments.encode(),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return segments + "." + _b64url(signature)

    async def token(self) -> str:
        """JWT-assertion token for Google APIs, cached for this sync run."""
        if self._token is not None:
            return self._token
        assertion = self._build_jwt()
        response = await self._http().post(
            _TOKEN_ENDPOINT,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
            timeout=_TIMEOUT,
        )
        if response.status_code != 200:
            raise ValueError(
                f"Google rejected the service account assertion (HTTP {response.status_code}). "
                "Check the service account JSON key, that domain-wide delegation is "
                "configured, and that the required OAuth scopes are authorised."
            )
        self._token = str(response.json().get("access_token", ""))
        return self._token

    async def get(self, url: str, **params) -> httpx.Response:
        """One authenticated GET. Returns the raw response so a check can
        distinguish 403 (scope not granted) from a real fault."""
        token = await self.token()
        return await self._http().get(
            url,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params or None,
            timeout=_TIMEOUT,
        )

    async def get_paged(
        self, url: str, key: str = "items", **params
    ) -> tuple[list[dict], bool]:
        """Follow Google's ``nextPageToken`` paging.

        Returns (items, truncated). ``truncated`` is True when the page cap was
        hit -- a check reports that rather than implying full coverage.
        """
        items: list[dict] = []
        query: dict = dict(params)
        for _ in range(_MAX_PAGES):
            resp = await self.get(url, **query)
            resp.raise_for_status()
            payload = resp.json()
            items.extend(payload.get(key, []))
            next_token = payload.get("nextPageToken")
            if not next_token:
                return items, False
            query["pageToken"] = next_token
        return items, True

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
