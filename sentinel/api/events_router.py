"""Events API Router for Sentinel.

Exposes endpoints for the event bus: list recent events, publish
custom events, and subscribe via SSE (server-sent events).
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["events"])

# ---------------------------------------------------------------------------
# In-memory event log (replaced by EventBus in production wiring)
# ---------------------------------------------------------------------------
_event_log: list[dict[str, Any]] = []


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


@router.get("/", response_model=list[EventResponse])
async def list_events(
    tenant_id: str = Query(..., description="Filter by tenant"),
    event_type: str | None = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=500),
) -> list[dict[str, Any]]:
    """Return recent events for a tenant."""
    filtered = [
        e for e in _event_log if e.get("tenant_id") == tenant_id
    ]
    if event_type:
        filtered = [
            e for e in filtered if e.get("event_type") == event_type
        ]
    return filtered[-limit:]


@router.post("/", response_model=EventResponse, status_code=201)
async def publish_event(payload: EventPayload) -> dict[str, Any]:
    """Publish a custom event into the event log."""
    from datetime import datetime, timezone

    record: dict[str, Any] = {
        "event_type": payload.event_type,
        "tenant_id": payload.tenant_id,
        "data": payload.data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _event_log.append(record)
    logger.info(
        "Event published: %s for tenant %s",
        payload.event_type,
        payload.tenant_id,
    )
    return record
