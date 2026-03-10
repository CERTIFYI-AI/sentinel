# sentinel/events/redis_bus.py
# Redis Streams-backed EventBus for multi-worker support — Sprint 4 #24
# Replaces the in-process asyncio.Queue bus with Redis XADD/XREAD
# so events are shared across all FastAPI worker processes.

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import asdict
from typing import AsyncIterator, Callable, Optional

logger = logging.getLogger(__name__)

# Lazy import — redis.asyncio is only required when Redis bus is active.
try:
    import redis.asyncio as aioredis  # type: ignore
except ImportError:  # pragma: no cover
    aioredis = None  # type: ignore

from .bus import SentinelEvent

# Stream name pattern: one stream per tenant
_STREAM_PREFIX = "sentinel:events:"
_CONSUMER_GROUP = "sentinel-workers"
_BACKLOG_STREAM = "sentinel:events:backlog"
_BACKLOG_MAX_LEN = 50  # Keep last 50 events for reconnect replay


class RedisBus:
    """Multi-worker EventBus backed by Redis Streams.

    Each tenant gets its own stream key: ``sentinel:events:<tenant_id>``.
    A shared backlog stream stores the last 50 events for WebSocket replay
    on reconnect.

    Usage::

        bus = RedisBus(redis_url="redis://localhost:6379")
        await bus.connect()

        # Publish
        await bus.publish(event)

        # Subscribe (long-running coroutine)
        async for event in bus.subscribe(tenant_id):
            process(event)

        await bus.close()
    """

    def __init__(self, redis_url: str = "redis://localhost:6379") -> None:
        if aioredis is None:
            raise RuntimeError(
                "redis.asyncio is required for RedisBus. "
                "Install it with: pip install redis[asyncio]"
            )
        self._url = redis_url
        self._client: Optional[aioredis.Redis] = None  # type: ignore
        self._connected = False

    async def connect(self) -> None:
        """Open Redis connection and create consumer groups."""
        self._client = aioredis.from_url(
            self._url,
            encoding="utf-8",
            decode_responses=True,
        )
        self._connected = True
        logger.info("RedisBus connected to %s", self._url)

    async def close(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.aclose()
            self._connected = False
        logger.info("RedisBus closed")

    def _stream_key(self, tenant_id: str) -> str:
        return f"{_STREAM_PREFIX}{tenant_id}"

    def _event_to_dict(self, event: SentinelEvent) -> dict[str, str]:
        """Serialise event to Redis stream field-value pairs."""
        d = asdict(event)
        # Redis streams require string values
        return {k: json.dumps(v) if not isinstance(v, str) else v for k, v in d.items()}

    def _dict_to_event(self, fields: dict[str, str]) -> SentinelEvent:
        """Deserialise Redis stream entry to SentinelEvent."""
        return SentinelEvent(
            event_type=fields["event_type"],
            tenant_id=fields["tenant_id"],
            payload=json.loads(fields.get("payload", "{}")),
            source_module=fields.get("source_module", ""),
            timestamp=fields.get("timestamp", ""),
            event_id=fields.get("event_id", ""),
        )

    async def publish(self, event: SentinelEvent) -> None:
        """Publish an event to the tenant stream and the shared backlog."""
        if not self._client:
            raise RuntimeError("RedisBus not connected. Call connect() first.")

        stream_key = self._stream_key(event.tenant_id)
        fields = self._event_to_dict(event)

        pipe = self._client.pipeline()
        # Tenant-scoped stream (maxlen 1000, approximate)
        pipe.xadd(stream_key, fields, maxlen=1000, approximate=True)
        # Shared backlog for WebSocket reconnect replay
        pipe.xadd(_BACKLOG_STREAM, fields, maxlen=_BACKLOG_MAX_LEN, approximate=False)
        await pipe.execute()
        logger.debug("RedisBus published %s to %s", event.event_type, stream_key)

    async def get_backlog(self, count: int = _BACKLOG_MAX_LEN) -> list[SentinelEvent]:
        """Return the last N events from the backlog stream for WebSocket replay."""
        if not self._client:
            return []
        try:
            entries = await self._client.xrevrange(_BACKLOG_STREAM, count=count)
            events = [self._dict_to_event(fields) for _, fields in entries]
            return list(reversed(events))  # chronological order
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to read backlog: %s", exc)
            return []

    async def subscribe(
        self,
        tenant_id: str,
        start_id: str = "$",
        block_ms: int = 2000,
    ) -> AsyncIterator[SentinelEvent]:
        """Async generator that yields events from the tenant stream.

        Args:
            tenant_id: Tenant to subscribe to.
            start_id: Redis stream ID to start reading from.
                      Use "$" for new events only, "0" for all historical.
            block_ms: How long to block on XREAD per iteration (milliseconds).
        """
        if not self._client:
            raise RuntimeError("RedisBus not connected.")

        stream_key = self._stream_key(tenant_id)
        last_id = start_id

        while True:
            try:
                results = await self._client.xread(
                    {stream_key: last_id},
                    count=100,
                    block=block_ms,
                )
                if results:
                    _key, entries = results[0]
                    for entry_id, fields in entries:
                        last_id = entry_id
                        try:
                            yield self._dict_to_event(fields)
                        except Exception as exc:  # pragma: no cover
                            logger.warning("Failed to deserialise event: %s", exc)
            except asyncio.CancelledError:
                break
            except Exception as exc:  # pragma: no cover
                logger.error("RedisBus subscribe error: %s", exc)
                await asyncio.sleep(1)

    async def ensure_consumer_group(self, tenant_id: str) -> None:
        """Create the consumer group for a tenant stream if it doesn't exist."""
        if not self._client:
            return
        stream_key = self._stream_key(tenant_id)
        try:
            await self._client.xgroup_create(
                stream_key,
                _CONSUMER_GROUP,
                id="$",
                mkstream=True,
            )
        except aioredis.ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise


# ---------------------------------------------------------------------------
# Factory: returns RedisBus if configured, falls back to in-process bus
# ---------------------------------------------------------------------------


def create_event_bus(
    redis_url: Optional[str] = None,
) -> "RedisBus | None":
    """Factory that creates a RedisBus if a redis_url is provided.

    Returns None when no Redis URL is configured so the caller can fall
    back to the in-process EventBus for single-worker deployments.
    """
    if not redis_url:
        logger.info(
            "No REDIS_URL configured. Using in-process EventBus (single-worker only)."
        )
        return None

    if aioredis is None:
        logger.warning(
            "redis.asyncio not installed. Falling back to in-process EventBus."
        )
        return None

    return RedisBus(redis_url=redis_url)
