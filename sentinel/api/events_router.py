"""Events API Router for Sentinel - with WebSocket real-time streaming.

Exposes:
  GET  /api/events/         - list recent events (REST)
  POST /api/events/         - publish a custom event
  GET  /api/events/stream   - SSE stream for real-time events
  WS   /api/events/ws       - WebSocket for real-time events
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["events"])

# ---------------------------------------------------------------------------
# In-memory event log + WebSocket connection manager
# ---------------------------------------------------------------------------
_event_log: list[dict[str, Any]] = []
_MAX_LOG = 1000  # keep last 1000 events in memory


class ConnectionManager:
    """Manages active WebSocket connections per tenant."""

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str) -> None:
        await websocket.accept()
        self._connections.setdefault(tenant_id, []).append(websocket)
        logger.info("WS connected: tenant=%s total=%d", tenant_id, len(self._connections[tenant_id]))

    def disconnect(self, websocket: WebSocket, tenant_id: str) -> None:
        conns = self._connections.get(tenant_id, [])
        if websocket in conns:
            conns.remove(websocket)
        logger.info("WS disconnected: tenant=%s remaining=%d", tenant_id, len(conns))

    async def broadcast(self, event: dict[str, Any]) -> None:
        """Broadcast event to all connections for the event's tenant."""
        tenant_id = event.get("tenant_id", "")
        conns = list(self._connections.get(tenant_id, []))
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(event))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, tenant_id)


manager = ConnectionManager()


# Try to wire up the real EventBus for cross-module propagation
try:
    from sentinel.events.bus import EventBus
    _bus = EventBus.get_instance()
    _BUS_AVAILABLE = True
except Exception as _bus_err:
    logger.warning("EventBus not available: %s", _bus_err)
    _bus = None
    _BUS_AVAILABLE = False


async def _store_and_broadcast(event: dict[str, Any]) -> None:
    """Persist event to log and broadcast to WebSocket subscribers."""
    _event_log.append(event)
    if len(_event_log) > _MAX_LOG:
        del _event_log[: len(_event_log) - _MAX_LOG]
    await manager.broadcast(event)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class EventPayload(BaseModel):
    """Schema for publishing a custom event."""

    event_type: str = Field(..., description="Dot-notated event type")
    tenant_id: str = Field(..., description="Tenant that owns the event")
    data: dict[str, Any] = Field(default_factory=dict)


class EventResponse(BaseModel):
    event_type: str
    tenant_id: str
    data: dict[str, Any]
    timestamp: str | None = None


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[EventResponse])
async def list_events(
    tenant_id: str = Query(..., description="Filter by tenant"),
    event_type: str | None = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=500),
) -> list[dict[str, Any]]:
    """Return recent events for a tenant."""
    filtered = [e for e in _event_log if e.get("tenant_id") == tenant_id]
    if event_type:
        filtered = [e for e in filtered if e.get("event_type") == event_type]
    return filtered[-limit:]


@router.post("/", response_model=EventResponse, status_code=201)
async def publish_event(payload: EventPayload) -> dict[str, Any]:
    """Publish a custom event - persists to log and broadcasts via WS."""
    record: dict[str, Any] = {
        "event_type": payload.event_type,
        "tenant_id": payload.tenant_id,
        "data": payload.data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await _store_and_broadcast(record)
    # Also publish to real EventBus if available
    if _BUS_AVAILABLE and _bus is not None:
        try:
            await _bus.publish(
                event_type=payload.event_type,
                tenant_id=payload.tenant_id,
                data=payload.data,
            )
        except Exception as bus_err:
            logger.warning("EventBus publish failed: %s", bus_err)
    logger.info("Event published: %s for tenant %s", payload.event_type, payload.tenant_id)
    return record


# ---------------------------------------------------------------------------
# SSE stream endpoint
# ---------------------------------------------------------------------------


@router.get("/stream")
async def event_stream(
    tenant_id: str = Query(..., description="Tenant to subscribe"),
    event_type: str | None = Query(None, description="Filter by event type prefix"),
) -> StreamingResponse:
    """Server-Sent Events stream for real-time event delivery."""

    async def generator():
        # Send last 20 events on connect
        backlog = [e for e in _event_log if e.get("tenant_id") == tenant_id][-20:]
        for evt in backlog:
            yield f"data: {json.dumps(evt)}\n\n"
        # Then stream new events via polling
        last_idx = len(_event_log)
        while True:
            await asyncio.sleep(1)
            new_events = _event_log[last_idx:]
            for evt in new_events:
                if evt.get("tenant_id") == tenant_id:
                    if not event_type or evt.get("event_type", "").startswith(event_type):
                        yield f"data: {json.dumps(evt)}\n\n"
            last_idx = len(_event_log)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# WebSocket endpoint for real-time bidirectional streaming
# ---------------------------------------------------------------------------


@router.websocket("/ws")
async def websocket_events(
    websocket: WebSocket,
    tenant_id: str = Query(..., description="Tenant ID"),
) -> None:
    """WebSocket endpoint. Connects client to tenant event stream.

    On connect: sends last 20 events as backlog.
    Ongoing:    receives events published by any module and forwards them.
    Client can also send JSON to publish an event.
    """
    await manager.connect(websocket, tenant_id)
    # Send backlog
    backlog = [e for e in _event_log if e.get("tenant_id") == tenant_id][-20:]
    for evt in backlog:
        await websocket.send_text(json.dumps(evt))
    try:
        while True:
            # Accept optional messages from client (publish from frontend)
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=30)
            try:
                payload = json.loads(raw)
                record: dict[str, Any] = {
                    "event_type": payload.get("event_type", "ui.custom"),
                    "tenant_id": tenant_id,
                    "data": payload.get("data", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await _store_and_broadcast(record)
            except Exception as parse_err:
                logger.debug("WS parse error: %s", parse_err)
    except (WebSocketDisconnect, asyncio.TimeoutError):
        manager.disconnect(websocket, tenant_id)
