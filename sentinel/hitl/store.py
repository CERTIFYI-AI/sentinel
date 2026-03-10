"""HitlStore — Human-in-the-loop store module.

In-memory store for HITL review items. Tracks items per tenant,
supports resolution, and provides aggregate metrics for posture scoring.

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
    """A single HITL review item."""
    id: str
    tenant_id: str
    source_id: str
    source_module: str
    reason: str
    metric: str | None = None
    score: float | None = None
    threshold: float | None = None
    model_id: str | None = None
    status: str = "PENDING"  # PENDING | APPROVED | REJECTED | ESCALATED
    resolution_note: str = ""
    resolved_by: str | None = None
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    resolved_at: str | None = None


class HitlStore:
    """In-memory HITL store. Class-level storage for singleton behaviour."""

    _items: dict[str, list[HitlItem]] = {}  # tenant_id -> items

    async def create(
        self,
        *,
        tenant_id: str,
        source_id: str,
        source_module: str = "evals",
        reason: str = "",
        metric: str | None = None,
        score: float | None = None,
        threshold: float | None = None,
        model_id: str | None = None,
        **kwargs: Any,
    ) -> HitlItem:
        """Create a new HITL review item."""
        item = HitlItem(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            source_id=source_id,
            source_module=source_module,
            reason=reason,
            metric=metric,
            score=score,
            threshold=threshold,
            model_id=model_id,
        )
        if tenant_id not in self._items:
            self._items[tenant_id] = []
        self._items[tenant_id].append(item)
        logger.info("HITL item created: %s for tenant %s", item.id, tenant_id)
        return item

    async def resolve(
        self,
        tenant_id: str,
        item_id: str,
        *,
        status: str = "APPROVED",
        resolution_note: str = "",
        resolved_by: str | None = None,
    ) -> HitlItem | None:
        """Resolve a HITL item."""
        for item in self._items.get(tenant_id, []):
            if item.id == item_id and item.status == "PENDING":
                item.status = status
                item.resolution_note = resolution_note
                item.resolved_by = resolved_by
                item.resolved_at = datetime.now(timezone.utc).isoformat()
                logger.info("HITL item %s resolved as %s", item_id, status)
                return item
        return None

    async def count_pending(self, tenant_id: str) -> int:
        """Return count of pending HITL items for a tenant."""
        return sum(
            1 for item in self._items.get(tenant_id, [])
            if item.status == "PENDING"
        )

    async def get_resolution_rate(self, tenant_id: str) -> float:
        """Return resolution rate (resolved / total) for HITL items."""
        items = self._items.get(tenant_id, [])
        if not items:
            return 0.0
        resolved = sum(1 for item in items if item.status != "PENDING")
        return resolved / len(items)

    async def get_all(
        self, tenant_id: str, *, status: str | None = None
    ) -> list[HitlItem]:
        """Return all HITL items for a tenant, optionally filtered by status."""
        items = self._items.get(tenant_id, [])
        if status:
            return [i for i in items if i.status == status]
        return list(items)

    async def get_by_id(self, tenant_id: str, item_id: str) -> HitlItem | None:
        """Return a single HITL item by ID."""
        for item in self._items.get(tenant_id, []):
            if item.id == item_id:
                return item
        return None
