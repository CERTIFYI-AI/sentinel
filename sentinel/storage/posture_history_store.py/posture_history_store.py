"""PostureHistory store — persists posture scores for trend analysis.

Stores computed posture scores after every compute_posture_score() call.
Used by GET /ciso/posture/history?days=N for trend charts and by
riskTrend/trendDelta computation in ciso_router.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import asyncpg


@dataclass(frozen=True)
class PostureSnapshot:
    """Immutable point-in-time posture score record."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = ""
    overall_score: float = 0.0
    security_score: float = 0.0
    compliance_score: float = 0.0
    quality_score: float = 0.0
    hitl_score: float = 0.0
    open_findings: int = 0
    open_tasks: int = 0
    recorded_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class PostureHistoryStore:
    """PostgreSQL-backed posture history with trend computation."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def record(
        self, snapshot: PostureSnapshot
    ) -> PostureSnapshot:
        """Persist a posture snapshot after posture computation."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO posture_history (
                    id, tenant_id, overall_score, security_score,
                    compliance_score, quality_score, hitl_score,
                    open_findings, open_tasks, recorded_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                """,
                snapshot.id,
                snapshot.tenant_id,
                snapshot.overall_score,
                snapshot.security_score,
                snapshot.compliance_score,
                snapshot.quality_score,
                snapshot.hitl_score,
                snapshot.open_findings,
                snapshot.open_tasks,
                snapshot.recorded_at,
            )
        return snapshot

    async def get_history(
        self, tenant_id: str, days: int = 90
    ) -> list[PostureSnapshot]:
        """Return posture snapshots for the last N days, ordered chronologically."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM posture_history
                WHERE tenant_id = $1 AND recorded_at >= $2
                ORDER BY recorded_at ASC
                """,
                tenant_id,
                cutoff,
            )
        return [self._row_to_snapshot(r) for r in rows]

    async def get_latest(
        self, tenant_id: str
    ) -> Optional[PostureSnapshot]:
        """Return the most recent posture snapshot for a tenant."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM posture_history
                WHERE tenant_id = $1
                ORDER BY recorded_at DESC
                LIMIT 1
                """,
                tenant_id,
            )
        if row is None:
            return None
        return self._row_to_snapshot(row)

    async def compute_trend(
        self, tenant_id: str, lookback_days: int = 7
    ) -> tuple[str, float]:
        """Compute risk trend direction and delta.

        Returns:
            (trend, delta) where trend is 'improving', 'stable', or
            'degrading' and delta is the score change over the period.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT overall_score, recorded_at
                FROM posture_history
                WHERE tenant_id = $1 AND recorded_at >= $2
                ORDER BY recorded_at ASC
                """,
                tenant_id,
                cutoff,
            )

        if len(rows) < 2:
            return ("stable", 0.0)

        first_score = float(rows[0]["overall_score"])
        last_score = float(rows[-1]["overall_score"])
        delta = round(last_score - first_score, 2)

        threshold = 2.0
        if delta > threshold:
            trend = "improving"
        elif delta < -threshold:
            trend = "degrading"
        else:
            trend = "stable"

        return (trend, delta)

    @staticmethod
    def _row_to_snapshot(row: asyncpg.Record) -> PostureSnapshot:
        return PostureSnapshot(
            id=str(row["id"]),
            tenant_id=str(row["tenant_id"]),
            overall_score=float(row["overall_score"]),
            security_score=float(row["security_score"]),
            compliance_score=float(row["compliance_score"]),
            quality_score=float(row["quality_score"]),
            hitl_score=float(row["hitl_score"]),
            open_findings=int(row["open_findings"]),
            open_tasks=int(row["open_tasks"]),
            recorded_at=row["recorded_at"],
        )
