"""Events API Router for Sentinel - with WebSocket real-time streaming.

Exposes:
  GET  /api/events/          - list recent events (REST)
  POST /api/events/          - publish a custom event
  GET  /api/events/stream    - SSE stream for real-time events
  WS   /api/events/ws        - WebSocket for real-time events
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
router = APIRouter(tags=["events"])

# ---------------------------------------------------------------------------
# In-memory event log + WebSocket connection manager
# ---------------------------------------------------------------------------
_event_log: list[dict[str, Any]] = []
_MAX_LOG = 1000

_ws_connections: dict[str, list[WebSocket]] = {}  # tenant_id -> [ws]

# ---------------------------------------------------------------------------
# Try to wire into the real EventBus singleton
# ---------------------------------------------------------------------------
try:
    from sentinel.events.bus import bus as _event_bus
    _has_event_bus = True
    logger.info("EventBus singleton connected to events_router")
except Exception as e:
    _event_bus = None
    _has_event_bus = False
    logger.warning(f"EventBus not available: {e}")


# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, tenant_id: str):
        await ws.accept()
        self.active.setdefault(tenant_id, []).append(ws)

    def disconnect(self, ws: WebSocket, tenant_id: str):
        self.active.get(tenant_id, []).remove(ws) if ws in self.active.get(tenant_id, []) else None

    async def broadcast(self, message: dict, tenant_id: str):
        dead = []
        for ws in self.active.get(tenant_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, tenant_id)

    async def broadcast_all(self, message: dict):
        for tenant_id in list(self.active.keys()):
            await self.broadcast(message, tenant_id)


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Background task: pump EventBus -> WebSocket connections
# ---------------------------------------------------------------------------
async def _pump_event_bus(tenant_id: str, q: asyncio.Queue, ws: WebSocket):
    """Relay events from EventBus queue to a WebSocket client."""
    try:
        while True:
            event = await asyncio.wait_for(q.get(), timeout=30)
            payload = {
                "event_type": event.type if isinstance(event.type, str) else event.type.value,
                "tenant_id": event.tenant_id,
                "data": event.payload,
                "timestamp": event.timestamp,
            }
            _event_log.append(payload)
            if len(_event_log) > _MAX_LOG:
                _event_log.pop(0)
            await ws.send_json(payload)
    except (asyncio.TimeoutError, asyncio.CancelledError):
        pass
    except WebSocketDisconnect:
        pass


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class PublishRequest(BaseModel):
    event_type: str = Field(..., description="Dot-separated event type, e.g. model.registered")
    tenant_id: str = Field(default="default")
    data: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------
@router.get("/")
async def list_events(
    tenant_id: str = Query(default="default"),
    limit: int = Query(default=50, le=500),
):
    """Return recent events for a tenant."""
    events = [
        e for e in _event_log
        if e.get("tenant_id") == tenant_id
    ]
    return {"events": events[-limit:], "total": len(events)}


@router.post("/")
async def publish_event(req: PublishRequest):
    """Publish a custom event."""
    event_data = {
        "event_type": req.event_type,
        "tenant_id": req.tenant_id,
        "data": req.data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _event_log.append(event_data)
    if len(_event_log) > _MAX_LOG:
        _event_log.pop(0)

    # Broadcast to connected WebSocket clients
    await manager.broadcast(event_data, req.tenant_id)

    # Also publish to EventBus if available
    if _has_event_bus and _event_bus:
        try:
            from sentinel.events.bus import SentinelEvent, EventType
            # Use a generic event type if the specific one doesn't exist
            evt = SentinelEvent(
                type=req.event_type,  # type: ignore[arg-type]
                source_module="api.events",
                tenant_id=req.tenant_id,
                payload=req.data,
            )
            await _event_bus.publish(evt)
        except Exception as e:
            logger.warning(f"EventBus publish failed: {e}")

    return {"status": "published", "event": event_data}


@router.get("/stream")
async def event_stream(
    tenant_id: str = Query(default="default"),
):
    """SSE stream: sends events as text/event-stream."""
    async def generate():
        # Send a heartbeat first
        yield f"data: {{\"type\": \"connected\", \"tenant_id\": \"{tenant_id}\"}}\ n\ n"
        last_idx = len(_event_log)
        while True:
            await asyncio.sleep(1)
            current = _event_log
            new_events = [
                e for e in current[last_idx:]
                if e.get("tenant_id") == tenant_id
            ]
            for evt in new_events:
                yield f"data: {json.dumps(evt)}\n\n"
            last_idx = len(current)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, tenant_id: str = Query(default="default")):
    """WebSocket endpoint for real-time event streaming."""
    await manager.connect(ws, tenant_id)
    logger.info(f"WebSocket connected: tenant={tenant_id}")

    # Also subscribe to the EventBus if available
    pump_task = None
    if _has_event_bus and _event_bus:
        try:
            q = _event_bus.subscribe(tenant_id)
            pump_task = asyncio.create_task(_pump_event_bus(tenant_id, q, ws))
        except Exception as e:
            logger.warning(f"EventBus subscribe failed: {e}")
            q = None
    else:
        q = None

    try:
        # Send connection confirmation
        await ws.send_json({
            "event_type": "connection.established",
            "tenant_id": tenant_id,
            "data": {"message": "Connected to Sentinel event stream"},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        while True:
            # Keep connection alive, receive pings
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await ws.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
            except asyncio.TimeoutError:
                # Send keepalive heartbeat
                await ws.send_json({"event_type": "heartbeat", "tenant_id": tenant_id, "data": {}, "timestamp": datetime.now(timezone.utc).isoformat()})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: tenant={tenant_id}")
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        if pump_task:
            pump_task.cancel()
        if q and _event_bus:
            try:
                _event_bus.unsubscribe(tenant_id, q)
            except Exception:
                pass
        manager.disconnect(ws, tenant_id)
