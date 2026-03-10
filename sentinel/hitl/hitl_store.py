"""HITL Store — in-memory Human-in-the-Loop item storage.

Production upgrade: replace with PostgreSQL-backed store.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class HitlItem:
    id: str
    tenant_id: str
    request_id: str
    model_id: str | None
    prompt: str
    response: str
    trust_score: float
    intervention_level: str  # REGENERATE | UPGRADE | HITL | BLOCKED
    reason: str
    status: str  # PENDING | APPROVED | REJECTED | ESCALATED
    reviewer_id: str | None = None
    decision_note: str | None = None
    source_module: str = "proxy"
    source_type: str = "trust_threshold"
    source_id: str = ""
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    resolved_at: str | None = None


class HitlStore:
    """In-memory HITL store. Singleton pattern via class-level storage."""

    _items: dict[str, list[HitlItem]] = {}  # tenant_id -> items

    async def create(
        self,
        *,
        tenant_id: str,
        request_id: str = "",
        model_id: str | None = None,
        prompt: str = "",
        response: str = "",
        trust_score: float = 0.0,
        intervention_level: str = "HITL",
        reason: str = "",
        status: str = "PENDING",
        source_module: str = "proxy",
        source_type: str = "trust_threshold",
        source_id: str = "",
    ) -> HitlItem:
        item = HitlItem(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            request_id=request_id,
            model_id=model_id,
            prompt=prompt,
            response=response,
            trust_score=trust_score,
            intervention_level=intervention_level,
            reason=reason,
            status=status,
            source_module=source_module,
            source_type=source_type,
            source_id=source_id,
        )
        if tenant_id not in self._items:
            self._items[tenant_id] = []
        self._items[tenant_id].append(item)
        logger.info("HITL item created: %s for tenant %s", item.id, tenant_id)
        return item

    async def get_by_id(
        self, tenant_id: str, item_id: str
    ) -> HitlItem | None:
        for item in self._items.get(tenant_id, []):
            if item.id == item_id:
                return item
        return None

    async def decide(
        self,
        tenant_id: str,
        item_id: str,
        decision: str,
        reviewer_id: str | None = None,
        note: str | None = None,
    ) -> HitlItem | None:
        item = await self.get_by_id(tenant_id, item_id)
        if not item:
            return None
        if item.status != "PENDING":
            return None
        item.status = decision  # APPROVED | REJECTED | ESCALATED
        item.reviewer_id = reviewer_id
        item.decision_note = note
        item.resolved_at = datetime.now(timezone.utc).isoformat()
        logger.info("HITL item %s decided: %s", item_id, decision)
        return item

    async def get_all(
        self,
        tenant_id: str,
        status: str | None = None,
    ) -> list[HitlItem]:
        items = self._items.get(tenant_id, [])
        if status and status != "ALL":
            items = [i for i in items if i.status == status]
        return items

    async def count_pending(self, tenant_id: str) -> int:
        return len(
            [i for i in self._items.get(tenant_id, []) if i.status == "PENDING"]
        )

    async def get_resolution_rate(self, tenant_id: str) -> float:
        """Return percentage of resolved items (0.0-100.0)."""
        items = self._items.get(tenant_id, [])
        if not items:
            return 100.0
        resolved = [i for i in items if i.status in ("APPROVED", "REJECTED")]
        return round((len(resolved) / len(items)) * 100, 1)

    async def get_avg_resolution_time(self, tenant_id: str) -> float:
        """Return average resolution time in seconds."""
        items = self._items.get(tenant_id, [])
        resolved = [
            i for i in items
            if i.resolved_at and i.created_at
        ]
        if not resolved:
            return 0.0
        total = 0.0
        for item in resolved:
            created = datetime.fromisoformat(item.created_at)
            resolved_at = datetime.fromisoformat(item.resolved_at)
            total += (resolved_at - created).total_seconds()
        return round(total / len(resolved), 1)
