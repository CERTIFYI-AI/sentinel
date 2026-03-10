"""Campaign scheduler — cron-based red team campaign triggering.

Manages scheduled security campaign configurations and triggers
campaign runs on a schedule for continuous assurance.
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
class CampaignSchedule:
    """Configuration for a scheduled red team campaign."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = ""
    name: str = ""
    campaign_template_id: str = ""
    target_deployment_id: str = ""
    attack_types: list[str] = field(default_factory=list)
    cron_expression: str = "0 3 * * 1"  # default: weekly Monday 3 AM
    enabled: bool = True
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class CampaignScheduler:
    """Manages campaign schedule CRUD and periodic trigger loop."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool
        self._running = False
        self._check_interval = 60

    async def create_schedule(
        self, schedule: CampaignSchedule
    ) -> CampaignSchedule:
        """Create a new campaign schedule."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO campaign_schedules (
                    id, tenant_id, name, campaign_template_id,
                    target_deployment_id, attack_types,
                    cron_expression, enabled, last_run_at,
                    next_run_at, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                """,
                schedule.id,
                schedule.tenant_id,
                schedule.name,
                schedule.campaign_template_id,
                schedule.target_deployment_id,
                schedule.attack_types,
                schedule.cron_expression,
                schedule.enabled,
                schedule.last_run_at,
                schedule.next_run_at,
                schedule.created_at,
            )
        return schedule

    async def list_schedules(
        self, tenant_id: str
    ) -> list[CampaignSchedule]:
        """List all campaign schedules for a tenant."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM campaign_schedules WHERE tenant_id = $1 ORDER BY created_at DESC",
                tenant_id,
            )
        return [self._row_to_schedule(r) for r in rows]

    async def get_due_schedules(self) -> list[CampaignSchedule]:
        """Find schedules that are due to run now."""
        now = datetime.now(timezone.utc)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM campaign_schedules
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
                UPDATE campaign_schedules
                SET last_run_at = $2, next_run_at = $3
                WHERE id = $1
                """,
                schedule_id,
                now,
                next_run_at,
            )

    async def delete_schedule(self, schedule_id: str) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM campaign_schedules WHERE id = $1",
                schedule_id,
            )

    async def start(self, run_campaign_callback) -> None:
        """Start the scheduler loop."""
        self._running = True
        logger.info("CampaignScheduler started")
        while self._running:
            try:
                due = await self.get_due_schedules()
                for schedule in due:
                    logger.info("Triggering scheduled campaign: %s", schedule.name)
                    await run_campaign_callback(schedule)
            except Exception:
                logger.exception("CampaignScheduler tick failed")
            await asyncio.sleep(self._check_interval)

    async def stop(self) -> None:
        self._running = False
        logger.info("CampaignScheduler stopped")

    @staticmethod
    def _row_to_schedule(row: asyncpg.Record) -> CampaignSchedule:
        return CampaignSchedule(
            id=str(row["id"]),
            tenant_id=str(row["tenant_id"]),
            name=row["name"],
            campaign_template_id=str(row["campaign_template_id"]),
            target_deployment_id=str(row["target_deployment_id"]),
            attack_types=row.get("attack_types", []),
            cron_expression=row["cron_expression"],
            enabled=row["enabled"],
            last_run_at=row.get("last_run_at"),
            next_run_at=row.get("next_run_at"),
            created_at=row["created_at"],
        )
