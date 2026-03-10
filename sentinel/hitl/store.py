"""HitlStore - Human-in-the-loop store module.

Exposes HitlStore class for creating and managing HITL review items.
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from typing import Any


class HitlStore:
    """Store for Human-in-the-loop (HITL) review items."""

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
    ) -> object:
        """Create a new HITL review item."""
        item = SimpleNamespace(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            source_id=source_id,
            source_module=source_module,
            reason=reason,
            metric=metric,
            score=score,
            threshold=threshold,
            model_id=model_id,
            status="PENDING",
        )
        return item

    async def count_pending(self, tenant_id: str) -> int:
        """Return count of pending HITL items for a tenant."""
        return 0

    async def get_resolution_rate(self, tenant_id: str) -> float:
        """Return resolution rate for HITL items."""
        return 0.0
