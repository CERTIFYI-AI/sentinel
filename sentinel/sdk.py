"""Python SDK client for Certifyi Sentinel.

Provides a high-level client for interacting with a running
Sentinel proxy instance programmatically.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from sentinel.models import HealthStatus, LLMMessage


class SentinelClient:
    """HTTP client for a running Sentinel proxy."""

    def __init__(
        self,
        base_url: str = "http://localhost:8080",
        api_key: Optional[str] = None,
        timeout: int = 30,
    ) -> None:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.AsyncClient(
            base_url=base_url, headers=headers, timeout=timeout
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "",
        provider: str = "",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send a chat completion request through Sentinel."""
        payload: Dict[str, Any] = {
            "messages": messages,
            "model": model,
            "provider": provider,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if metadata:
            payload["metadata"] = metadata

        resp = await self._client.post("/v1/chat/completions", json=payload)
        resp.raise_for_status()
        return resp.json()

    async def health(self) -> HealthStatus:
        """Check Sentinel health."""
        resp = await self._client.get("/health")
        resp.raise_for_status()
        return HealthStatus(**resp.json())

    async def get_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get dashboard statistics."""
        resp = await self._client.get(
            "/dashboard/stats", params={"hours": hours}
        )
        resp.raise_for_status()
        return resp.json()

    async def get_events(
        self,
        request_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Query audit events."""
        params: Dict[str, Any] = {"limit": limit}
        if request_id:
            params["request_id"] = request_id
        if event_type:
            params["event_type"] = event_type
        resp = await self._client.get("/dashboard/events", params=params)
        resp.raise_for_status()
        return resp.json()

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> SentinelClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
