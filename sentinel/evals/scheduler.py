"""Eval scheduler — cron-based eval run triggering.

Manages scheduled eval configurations and triggers eval runs
automatically based on cron expressions (daily, weekly, custom).
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import asyncpg

logger = logging.getLogger(__name__)


@dataclass
class EvalSchedule:
    """Configuration for a scheduled eval run."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = ""
    name: str = ""
    dataset_id: str = ""
    metric_ids: list[str] = field(default_factory=list)
    cron_expression: str = "0 2 * * *"  # default: daily at 2 AM
    enabled: bool = True
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class EvalScheduler:
    """Manages eval schedule CRUD and periodic trigger loop."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool
        self._running = False
        self._check_interval = 60  # check every 60 seconds

    async def create_schedule(
        self, schedule: EvalSchedule
    ) -> EvalSchedule:
        """Create a new eval schedule."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO eval_schedules (
                    id, tenant_id, name, dataset_id, metric_ids,
                    cron_expression, enabled, last_run_at,
                    next_run_at, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                """,
                schedule.id,
                schedule.tenant_id,
                schedule.name,
                schedule.dataset_id,
                schedule.metric_ids,
                schedule.cron_expression,
                schedule.enabled,
                schedule.last_run_at,
                schedule.next_run_at,
                schedule.created_at,
            )
        return schedule

    async def list_schedules(
        self, tenant_id: str
    ) -> list[EvalSchedule]:
        """List all eval schedules for a tenant."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM eval_schedules WHERE tenant_id = $1 ORDER BY created_at DESC",
                tenant_id,
            )
        return [self._row_to_schedule(r) for r in rows]

    async def update_schedule(
        self, schedule_id: str, **kwargs
    ) -> None:
        """Update schedule fields."""
        allowed = {"name", "cron_expression", "enabled", "dataset_id", "metric_ids"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
        values = [schedule_id] + list(updates.values())
        async with self._pool.acquire() as conn:
            await conn.execute(
                f"UPDATE eval_schedules SET {set_clause} WHERE id = $1",
                *values,
            )

    async def delete_schedule(self, schedule_id: str) -> None:
        """Delete an eval schedule."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM eval_schedules WHERE id = $1",
                schedule_id,
            )

    async def get_due_schedules(self) -> list[EvalSchedule]:
        """Find schedules that are due to run now."""
        now = datetime.now(timezone.utc)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM eval_schedules
                WHERE enabled = true
                  AND (next_run_at IS NULL OR next_run_at <= $1)
                """,
                now,
            )
        return [self._row_to_schedule(r) for r in rows]

    async def mark_run(
        self, schedule_id: str, next_run_at: datetime
    ) -> None:
        """Update last_run_at and next_run_at after a run."""
        now = datetime.now(timezone.utc)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE eval_schedules
                SET last_run_at = $2, next_run_at = $3
                WHERE id = $1
                """,
                schedule_id,
                now,
                next_run_at,
            )

    async def start(self, run_eval_callback) -> None:
        """Start the scheduler loop."""
        self._running = True
        logger.info("EvalScheduler started")
        while self._running:
            try:
                due = await self.get_due_schedules()
                for schedule in due:
                    logger.info("Triggering scheduled eval: %s", schedule.name)
                    await run_eval_callback(schedule)
            except Exception:
                logger.exception("EvalScheduler tick failed")
            await asyncio.sleep(self._check_interval)

    async def stop(self) -> None:
        self._running = False
        logger.info("EvalScheduler stopped")

    @staticmethod
    def _row_to_schedule(row: asyncpg.Record) -> EvalSchedule:
        return EvalSchedule(
            id=str(row["id"]),
            tenant_id=str(row["tenant_id"]),
            name=row["name"],
            dataset_id=str(row["dataset_id"]),
            metric_ids=row.get("metric_ids", []),
            cron_expression=row["cron_expression"],
            enabled=row["enabled"],
            last_run_at=row.get("last_run_at"),
            next_run_at=row.get("next_run_at"),
            created_at=row["created_at"],
        )
