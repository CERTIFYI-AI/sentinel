"""TimescaleDB audit store — database connection management for the audit layer.

This module owns the asyncpg connection pool and provides the database
connection lifecycle that the audit layer (sentinel.layers.auditor)
needs. The auditor module contains the business logic (hash chains,
integrity verification); this module handles the PostgreSQL specifics.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

import asyncpg

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Module-level connection pool — initialized once at startup
_pool: asyncpg.Pool | None = None


async def init_pool(database_url: str, min_size: int = 2, max_size: int = 10) -> asyncpg.Pool:
    """Create and cache the asyncpg connection pool.

    Called once at FastAPI startup. The pool is shared across all
    audit operations to avoid connection overhead per request.

    Args:
        database_url: PostgreSQL connection string (asyncpg format).
        min_size: Minimum idle connections in the pool.
        max_size: Maximum connections in the pool.

    Returns:
        The initialized connection pool.
    """
    global _pool  # noqa: PLW0603
    _pool = await asyncpg.create_pool(
        database_url,
        min_size=min_size,
        max_size=max_size,
    )
    logger.info(
        "Audit store pool initialized (min=%d, max=%d)",
        min_size,
        max_size,
    )
    return _pool


async def get_connection() -> asyncpg.Connection:
    """Acquire a connection from the pool.

    Raises:
        RuntimeError: If the pool has not been initialized via init_pool().
    """
    if _pool is None:
        msg = (
            "Audit store pool not initialized. Call init_pool() at startup. "
            "Check that DATABASE_URL is set in your environment."
        )
        raise RuntimeError(msg)
    return await _pool.acquire()


async def release_connection(conn: asyncpg.Connection) -> None:
    """Release a connection back to the pool."""
    if _pool is not None:
        await _pool.release(conn)


async def close_pool() -> None:
    """Close all connections in the pool. Called at shutdown."""
    global _pool  # noqa: PLW0603
    if _pool is not None:
        await _pool.close()
        logger.info("Audit store pool closed")
        _pool = None


async def ensure_schema(conn: asyncpg.Connection) -> None:
    """Create the audit_log table and indexes if they don't exist.

    This is idempotent and safe to call at every startup. The hypertable
    creation is wrapped in a try/except because it will fail if the table
    already exists as a hypertable (TimescaleDB returns an error, not a no-op).
    """
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL,
            request_id TEXT NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            prompt_hash TEXT NOT NULL,
            response_hash TEXT NOT NULL,
            trust_score FLOAT NOT NULL,
            intervention SMALLINT NOT NULL,
            cost_usd FLOAT NOT NULL,
            latency_ms FLOAT NOT NULL,
            prev_hash TEXT NOT NULL,
            entry_hash TEXT NOT NULL,
            metadata JSONB
        )
    """)

    # Create index for tenant-scoped queries (used by get_entries, verify_chain)
    await conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_ts
        ON audit_log (tenant_id, timestamp DESC)
    """)

    # Try to create TimescaleDB hypertable — only works if TimescaleDB extension
    # is available. Falls back gracefully to a regular table.
    try:
        await conn.execute("""
            SELECT create_hypertable(
                'audit_log', 'timestamp',
                chunk_time_interval => INTERVAL '7 days',
                if_not_exists => TRUE,
                migrate_data => TRUE
            )
        """)
        logger.info("audit_log configured as TimescaleDB hypertable")
    except asyncpg.UndefinedFunctionError:
        logger.warning(
            "TimescaleDB extension not available. audit_log will use a regular "
            "PostgreSQL table. For production, install TimescaleDB for automatic "
            "time-based partitioning: CREATE EXTENSION timescaledb;"
        )
    except asyncpg.InvalidObjectDefinitionError:
        # Table is already a hypertable
        logger.debug("audit_log is already a hypertable")


async def execute_query(
    query: str,
    *args: Any,
) -> list[asyncpg.Record]:
    """Execute a read query using a connection from the pool.

    Convenience wrapper for one-off queries that don't need a long-lived
    connection. Acquires and releases a connection automatically.
    """
    if _pool is None:
        msg = "Audit store pool not initialized."
        raise RuntimeError(msg)
    async with _pool.acquire() as conn:
        return await conn.fetch(query, *args)
