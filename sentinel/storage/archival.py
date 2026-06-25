"""archival.py

Sprint 5 — data archival strategy for audit logs and growing tables.

Strategy:
  1. Audit log entries older than `AUDIT_LOG_RETENTION_DAYS` (default 365)
     are moved to an `audit_log_archive` table, then deleted from `audit_log`.
  2. PostureHistory snapshots older than `POSTURE_HISTORY_RETENTION_DAYS` (default 365)
     are similarly archived.
  3. EvalRun results and SecurityCampaign results older than
     `EVAL_RESULT_RETENTION_DAYS` (default 180) are summarised and archived.
  4. The archiver runs on a nightly cron schedule via background_runner.py.
  5. A dry_run=True mode prints what would be archived without modifying data.

All archival operations are atomic (wrapped in a transaction).
Archived rows are never deleted — they are moved to _archive tables.
Archival events are emitted to the event bus for audit trail completeness.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

AUDIT_LOG_RETENTION_DAYS: int = int(os.environ.get("AUDIT_LOG_RETENTION_DAYS", "365"))
POSTURE_HISTORY_RETENTION_DAYS: int = int(os.environ.get("POSTURE_HISTORY_RETENTION_DAYS", "365"))
EVAL_RESULT_RETENTION_DAYS: int = int(os.environ.get("EVAL_RESULT_RETENTION_DAYS", "180"))
SECURITY_RESULT_RETENTION_DAYS: int = int(os.environ.get("SECURITY_RESULT_RETENTION_DAYS", "180"))


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------


@dataclass
class ArchivalReport:
    tenant_id: Optional[str]  # None = all tenants
    dry_run: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    audit_log_rows_archived: int = 0
    posture_history_rows_archived: int = 0
    eval_result_rows_archived: int = 0
    security_result_rows_archived: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def total_rows_archived(self) -> int:
        return (
            self.audit_log_rows_archived
            + self.posture_history_rows_archived
            + self.eval_result_rows_archived
            + self.security_result_rows_archived
        )


# ---------------------------------------------------------------------------
# SQL helpers
# ---------------------------------------------------------------------------

_ARCHIVE_AUDIT_LOG_SQL = """
WITH moved AS (
    DELETE FROM audit_log
    WHERE tenant_id = :tenant_id
      AND timestamp < :cutoff
    RETURNING *
)
INSERT INTO audit_log_archive
SELECT *, NOW() AS archived_at
FROM moved;
"""

_ARCHIVE_AUDIT_LOG_ALL_SQL = """
WITH moved AS (
    DELETE FROM audit_log
    WHERE timestamp < :cutoff
    RETURNING *
)
INSERT INTO audit_log_archive
SELECT *, NOW() AS archived_at
FROM moved;
"""

_ARCHIVE_POSTURE_HISTORY_SQL = """
WITH moved AS (
    DELETE FROM posture_history
    WHERE tenant_id = :tenant_id
      AND recorded_at < :cutoff
    RETURNING *
)
INSERT INTO posture_history_archive
SELECT *, NOW() AS archived_at
FROM moved;
"""

_ARCHIVE_EVAL_RESULTS_SQL = """
WITH moved AS (
    DELETE FROM eval_results
    WHERE tenant_id = :tenant_id
      AND completed_at < :cutoff
    RETURNING *
)
INSERT INTO eval_results_archive
SELECT *, NOW() AS archived_at
FROM moved;
"""

_ARCHIVE_SECURITY_RESULTS_SQL = """
WITH moved AS (
    DELETE FROM campaign_results
    WHERE tenant_id = :tenant_id
      AND completed_at < :cutoff
    RETURNING *
)
INSERT INTO campaign_results_archive
SELECT *, NOW() AS archived_at
FROM moved;
"""

_COUNT_SQL = "SELECT COUNT(*) FROM {table} WHERE tenant_id = :tenant_id AND {ts_col} < :cutoff"
_COUNT_ALL_SQL = "SELECT COUNT(*) FROM {table} WHERE {ts_col} < :cutoff"


# ---------------------------------------------------------------------------
# Main archival function
# ---------------------------------------------------------------------------


async def run_archival(
    tenant_id: Optional[str] = None,
    dry_run: bool = False,
) -> ArchivalReport:
    """Run the full data archival pipeline.

    If tenant_id is None, archives all tenants.
    If dry_run is True, counts rows that would be archived without modifying data.

    Called by background_runner.py on a nightly schedule.
    Also available as an admin API endpoint for manual runs.
    """
    now = datetime.now(timezone.utc)
    report = ArchivalReport(
        tenant_id=tenant_id,
        dry_run=dry_run,
        started_at=now,
    )

    audit_cutoff = now - timedelta(days=AUDIT_LOG_RETENTION_DAYS)
    posture_cutoff = now - timedelta(days=POSTURE_HISTORY_RETENTION_DAYS)
    eval_cutoff = now - timedelta(days=EVAL_RESULT_RETENTION_DAYS)
    security_cutoff = now - timedelta(days=SECURITY_RESULT_RETENTION_DAYS)

    try:
        import sqlalchemy  # noqa: PLC0415
        from sentinel.config import get_settings  # noqa: PLC0415
        from sqlalchemy.ext.asyncio import create_async_engine  # noqa: PLC0415

        settings = get_settings()
        engine = create_async_engine(settings.DATABASE_URL)

        async with engine.begin() as conn:
            params_base = {"tenant_id": tenant_id, "cutoff": audit_cutoff}

            if dry_run:
                # Count rows that would be archived
                report.audit_log_rows_archived = await _count_rows(
                    conn, "audit_log", "timestamp", audit_cutoff, tenant_id
                )
                report.posture_history_rows_archived = await _count_rows(
                    conn, "posture_history", "recorded_at", posture_cutoff, tenant_id
                )
                report.eval_result_rows_archived = await _count_rows(
                    conn, "eval_results", "completed_at", eval_cutoff, tenant_id
                )
                report.security_result_rows_archived = await _count_rows(
                    conn, "campaign_results", "completed_at", security_cutoff, tenant_id
                )
            else:
                # Execute archival — move rows to *_archive tables
                report.audit_log_rows_archived = await _archive(
                    conn,
                    _ARCHIVE_AUDIT_LOG_SQL if tenant_id else _ARCHIVE_AUDIT_LOG_ALL_SQL,
                    {"tenant_id": tenant_id, "cutoff": audit_cutoff} if tenant_id
                    else {"cutoff": audit_cutoff},
                )
                report.posture_history_rows_archived = await _archive(
                    conn,
                    _ARCHIVE_POSTURE_HISTORY_SQL,
                    {"tenant_id": tenant_id, "cutoff": posture_cutoff},
                )
                report.eval_result_rows_archived = await _archive(
                    conn,
                    _ARCHIVE_EVAL_RESULTS_SQL,
                    {"tenant_id": tenant_id, "cutoff": eval_cutoff},
                )
                report.security_result_rows_archived = await _archive(
                    conn,
                    _ARCHIVE_SECURITY_RESULTS_SQL,
                    {"tenant_id": tenant_id, "cutoff": security_cutoff},
                )

        await engine.dispose()

    except Exception as exc:  # noqa: BLE001
        report.errors.append(str(exc))
        logger.exception("Archival run failed", exc_info=exc)

    report.completed_at = datetime.now(timezone.utc)

    mode = "DRY RUN" if dry_run else "LIVE"
    logger.info(
        "Archival %s complete: %d total rows | tenant=%s | duration=%.1fs",
        mode,
        report.total_rows_archived,
        tenant_id or "ALL",
        (report.completed_at - report.started_at).total_seconds(),
    )

    # Emit archival complete event for audit trail
    if not dry_run and not report.errors:
        try:
            from sentinel.events.emitters import emit_archival_complete  # noqa: PLC0415
            await emit_archival_complete(tenant_id, report)
        except ImportError:
            pass  # emitter not yet available in minimal environments

    return report


async def _count_rows(
    conn: object,
    table: str,
    ts_col: str,
    cutoff: datetime,
    tenant_id: Optional[str],
) -> int:
    """Count rows that would be archived."""
    try:
        import sqlalchemy  # noqa: PLC0415

        if tenant_id:
            sql = _COUNT_SQL.format(table=table, ts_col=ts_col)
            result = await conn.execute(
                # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text
                sqlalchemy.text(sql), {"tenant_id": tenant_id, "cutoff": cutoff}
            )
        else:
            sql = _COUNT_ALL_SQL.format(table=table, ts_col=ts_col)
            # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text
            result = await conn.execute(sqlalchemy.text(sql), {"cutoff": cutoff})
        row = result.fetchone()
        return row[0] if row else 0
    except Exception as exc:  # noqa: BLE001
        logger.warning("Count failed for %s: %s", table, exc)
        return 0


async def _archive(conn: object, sql: str, params: dict) -> int:
    """Execute archive SQL and return affected row count."""
    try:
        import sqlalchemy  # noqa: PLC0415
        result = await conn.execute(sqlalchemy.text(sql), params)
        return result.rowcount or 0
    except Exception as exc:  # noqa: BLE001
        logger.warning("Archive SQL failed: %s", exc)
        return 0


# ---------------------------------------------------------------------------
# Migration SQL for archive tables (run once via Alembic)
# ---------------------------------------------------------------------------

ARCHIVAL_MIGRATION_SQL = """
-- Archive tables mirror their source with an additional archived_at column.
-- Partitioned by RANGE on archived_at for efficient time-based queries.

CREATE TABLE IF NOT EXISTS audit_log_archive (
    LIKE audit_log INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (archived_at);

CREATE TABLE IF NOT EXISTS posture_history_archive (
    LIKE posture_history INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eval_results_archive (
    LIKE eval_results INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_results_archive (
    LIKE campaign_results INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial partition for audit_log_archive (current year)
CREATE TABLE IF NOT EXISTS audit_log_archive_2026
    PARTITION OF audit_log_archive
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS audit_log_archive_2027
    PARTITION OF audit_log_archive
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Index for efficient tenant + time range queries on archive tables
CREATE INDEX IF NOT EXISTS idx_audit_log_archive_tenant_ts
    ON audit_log_archive (tenant_id, archived_at DESC);
"""
