"""Overdue task detector cron job.

Runs every hour, finds tasks past their due date, emits task.overdue
events to the event bus for notification and escalation.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import asyncpg

from sentinel.events.bus import EventBus, SentinelEvent

logger = logging.getLogger(__name__)


class OverdueDetector:
    """Periodically scans for overdue tasks and emits events."""

    def __init__(
        self,
        pool: asyncpg.Pool,
        event_bus: EventBus,
        interval_seconds: int = 3600,
    ) -> None:
        self._pool = pool
        self._bus = event_bus
        self._interval = interval_seconds
        self._running = False

    async def start(self) -> None:
        """Start the periodic overdue detection loop."""
        self._running = True
        logger.info("OverdueDetector started (interval=%ds)", self._interval)
        while self._running:
            try:
                count = await self._detect_and_emit()
                if count > 0:
                    logger.info("Emitted %d task.overdue events", count)
            except Exception:
                logger.exception("OverdueDetector scan failed")
            await asyncio.sleep(self._interval)

    async def stop(self) -> None:
        """Stop the detection loop."""
        self._running = False
        logger.info("OverdueDetector stopped")

    async def _detect_and_emit(self) -> int:
        """Find overdue tasks and emit events. Returns count."""
        now = datetime.now(timezone.utc)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, tenant_id, title, priority, due_date, assignee_id
                FROM tasks
                WHERE status NOT IN ('done', 'closed', 'cancelled')
                  AND due_date IS NOT NULL
                  AND due_date < $1
                  AND overdue_notified = false
                """,
                now,
            )

        count = 0
        for row in rows:
            tenant_id = str(row["tenant_id"])
            event = SentinelEvent(
                event_type="task.overdue",
                tenant_id=tenant_id,
                payload={
                    "task_id": str(row["id"]),
                    "title": row["title"],
                    "priority": row["priority"],
                    "due_date": row["due_date"].isoformat(),
                    "assignee_id": str(row["assignee_id"]) if row["assignee_id"] else None,
                    "hours_overdue": round(
                        (now - row["due_date"]).total_seconds() / 3600, 1
                    ),
                },
            )
            await self._bus.publish(event)
            count += 1

        # Mark tasks as notified to avoid duplicate events
        if rows:
            task_ids = [row["id"] for row in rows]
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE tasks SET overdue_notified = true
                    WHERE id = ANY($1::uuid[])
                    """,
                    task_ids,
                )

        return count
