"""Sentinel Event Bus.

In-process pub/sub for the Sentinel platform. All modules emit events here.
The WebSocket router distributes them to connected clients filtered by tenant_id.

Production upgrade path: swap asyncio.Queue for Redis Streams by replacing
queues with Redis XADD/XREAD — API is identical.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class EventType(str, Enum):
    CAMPAIGN_FINDING_CRITICAL = "campaign.finding.critical"
    CAMPAIGN_FINDING_HIGH = "campaign.finding.high"
    CAMPAIGN_COMPLETE = "campaign.complete"
    EVAL_RUN_FAILED = "eval.run.failed"
    EVAL_METRIC_THRESHOLD_BREACH = "eval.metric.thresholdbreach"
    HITL_ITEM_CREATED = "hitl.item.created"
    HITL_ITEM_RESOLVED = "hitl.item.resolved"
    COMPLIANCE_GAP_CREATED = "compliance.gap.created"
    COMPLIANCE_GAP_RESOLVED = "compliance.gap.resolved"
    MODEL_REGISTERED = "model.registered"
    MODEL_TRUSTSCORE_UPDATED = "model.trustscore.updated"
    TASK_CREATED = "task.created"
    TASK_OVERDUE = "task.overdue"
    AUDIT_CHAIN_INTEGRITY_FAIL = "audit.chain.integrityfail"
    POSTURE_SCORE_UPDATED = "posture.score.updated"


@dataclass
class SentinelEvent:
    type: EventType
    source_module: str  # "proxy" | "evals" | "security"
    tenant_id: str
    payload: dict[str, Any]
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_json(self) -> str:
        d = asdict(self)
        d["type"] = self.type.value
        return json.dumps(d)


class EventBus:
    """One asyncio.Queue per tenant.

    WebSocket connections subscribe by tenant_id.
    Emitters call publish from any async context.
    """

    def __init__(self) -> None:
        self._queues: defaultdict[
            str, list[asyncio.Queue[SentinelEvent]]
        ] = defaultdict(list)

    def subscribe(self, tenant_id: str) -> asyncio.Queue[SentinelEvent]:
        q: asyncio.Queue[SentinelEvent] = asyncio.Queue(maxsize=100)
        self._queues[tenant_id].append(q)
        return q

    def unsubscribe(
        self, tenant_id: str, q: asyncio.Queue[SentinelEvent]
    ) -> None:
        try:
            self._queues[tenant_id].remove(q)
        except ValueError:
            pass

    async def publish(self, event: SentinelEvent) -> None:
        """Emit an event to all subscribers for event.tenant_id."""
        for q in list(self._queues.get(event.tenant_id, [])):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # Slow consumer — drop event, do not block emitter

    async def publish_all(self, event: SentinelEvent) -> None:
        """Emit to ALL tenants (used for system-level events)."""
        for tenant_queues in self._queues.values():
            for q in list(tenant_queues):
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    pass


# Singleton — import this everywhere
bus = EventBus()
event_bus = bus  # Alias for backwards compatibility with generated routers
