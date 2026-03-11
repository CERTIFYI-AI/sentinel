"""Database persistence layer for Sentinel.

Provides async PostgreSQL connection pool via asyncpg,
plus repository helpers for core tables.
Audit logs are append-only (no UPDATE/DELETE).
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg

from sentinel.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Return (and lazily create) the global connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10,
        )
        logger.info("DB pool created (%s)", settings.database_url[:30])
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("DB pool closed")


async def get_connection() -> asyncpg.Connection:
    pool = await get_pool()
    return await pool.acquire()


# ---------------------------------------------------------------------------
# Schema bootstrap (run once on startup)
# ---------------------------------------------------------------------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    config      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    email       TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'viewer',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,
    details     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_findings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    framework   TEXT NOT NULL,
    control     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open',
    severity    TEXT NOT NULL DEFAULT 'medium',
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    assignee    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    type        TEXT NOT NULL,
    requester   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    reason      TEXT,
    decided_by  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    message     TEXT NOT NULL,
    read        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_runs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    model       TEXT NOT NULL,
    dataset     TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',
    scores      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'todo',
    assignee    TEXT,
    due_date    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    type        TEXT NOT NULL,
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_tenant ON compliance_findings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON approvals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
"""


async def bootstrap_schema() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA_SQL)
    logger.info("Schema bootstrap complete")


# ---------------------------------------------------------------------------
# Audit log repo (APPEND-ONLY — no update/delete)
# ---------------------------------------------------------------------------
class AuditLogRepo:
    @staticmethod
    async def append(
        conn: asyncpg.Connection,
        *,
        tenant_id: str,
        actor: str,
        action: str,
        details: dict[str, Any] | None = None,
    ) -> str:
        row = await conn.fetchrow(
            "INSERT INTO audit_logs (tenant_id, actor, action, details) "
            "VALUES ($1, $2, $3, $4) RETURNING id",
            uuid.UUID(tenant_id),
            actor,
            action,
            details or {},
        )
        return str(row["id"])

    @staticmethod
    async def list_(
        conn: asyncpg.Connection,
        tenant_id: str,
        *,
        page: int = 1,
        limit: int = 50,
    ) -> tuple[list[dict[str, Any]], int]:
        offset = (page - 1) * limit
        rows = await conn.fetch(
            "SELECT * FROM audit_logs WHERE tenant_id = $1 "
            "ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            uuid.UUID(tenant_id),
            limit,
            offset,
        )
        count = await conn.fetchval(
            "SELECT count(*) FROM audit_logs WHERE tenant_id = $1",
            uuid.UUID(tenant_id),
        )
        return [dict(r) for r in rows], count


# ---------------------------------------------------------------------------
# Users repo
# ---------------------------------------------------------------------------
class UserRepo:
    @staticmethod
    async def create(
        conn: asyncpg.Connection,
        *,
        tenant_id: str,
        email: str,
        password_hash: str,
        role: str = "viewer",
    ) -> str:
        row = await conn.fetchrow(
            "INSERT INTO users (tenant_id, email, password_hash, role) "
            "VALUES ($1, $2, $3, $4) RETURNING id",
            uuid.UUID(tenant_id),
            email,
            password_hash,
            role,
        )
        return str(row["id"])

    @staticmethod
    async def get_by_email(
        conn: asyncpg.Connection, email: str
    ) -> dict[str, Any] | None:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE email = $1", email
        )
        return dict(row) if row else None

    @staticmethod
    async def get_by_id(
        conn: asyncpg.Connection, user_id: str
    ) -> dict[str, Any] | None:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1", uuid.UUID(user_id)
        )
        return dict(row) if row else None


# ---------------------------------------------------------------------------
# Notifications repo
# ---------------------------------------------------------------------------
class NotificationRepo:
    @staticmethod
    async def create(
        conn: asyncpg.Connection,
        *,
        tenant_id: str,
        user_id: str,
        message: str,
    ) -> str:
        row = await conn.fetchrow(
            "INSERT INTO notifications (tenant_id, user_id, message) "
            "VALUES ($1, $2, $3) RETURNING id",
            uuid.UUID(tenant_id),
            uuid.UUID(user_id),
            message,
        )
        return str(row["id"])

    @staticmethod
    async def list_for_user(
        conn: asyncpg.Connection, user_id: str
    ) -> list[dict[str, Any]]:
        rows = await conn.fetch(
            "SELECT * FROM notifications WHERE user_id = $1 "
            "ORDER BY created_at DESC LIMIT 100",
            uuid.UUID(user_id),
        )
        return [dict(r) for r in rows]

    @staticmethod
    async def mark_read(
        conn: asyncpg.Connection, notification_id: str
    ) -> None:
        await conn.execute(
            "UPDATE notifications SET read = true WHERE id = $1",
            uuid.UUID(notification_id),
        )

    @staticmethod
    async def mark_all_read(
        conn: asyncpg.Connection, user_id: str
    ) -> None:
        await conn.execute(
            "UPDATE notifications SET read = true WHERE user_id = $1 AND read = false",
            uuid.UUID(user_id),
        )

    @staticmethod
    async def unread_count(
        conn: asyncpg.Connection, user_id: str
    ) -> int:
        return await conn.fetchval(
            "SELECT count(*) FROM notifications WHERE user_id = $1 AND read = false",
            uuid.UUID(user_id),
        )


# ---------------------------------------------------------------------------
# Compliance findings repo
# ---------------------------------------------------------------------------
class FindingRepo:
    @staticmethod
    async def list_(
        conn: asyncpg.Connection, tenant_id: str
    ) -> list[dict[str, Any]]:
        rows = await conn.fetch(
            "SELECT * FROM compliance_findings WHERE tenant_id = $1 "
            "ORDER BY created_at DESC",
            uuid.UUID(tenant_id),
        )
        return [dict(r) for r in rows]

    @staticmethod
    async def get(
        conn: asyncpg.Connection, finding_id: str
    ) -> dict[str, Any] | None:
        row = await conn.fetchrow(
            "SELECT * FROM compliance_findings WHERE id = $1",
            uuid.UUID(finding_id),
        )
        return dict(row) if row else None

    @staticmethod
    async def update(
        conn: asyncpg.Connection,
        finding_id: str,
        **kwargs: Any,
    ) -> dict[str, Any] | None:
        sets = []
        vals = []
        idx = 1
        for key, val in kwargs.items():
            if key in ("status", "severity", "assignee", "description", "title"):
                sets.append(f"{key} = ${idx}")
                vals.append(val)
                idx += 1
        if not sets:
            return await FindingRepo.get(conn, finding_id)
        sets.append(f"updated_at = ${idx}")
        vals.append(datetime.now(timezone.utc))
        idx += 1
        vals.append(uuid.UUID(finding_id))
        row = await conn.fetchrow(
            f"UPDATE compliance_findings SET {', '.join(sets)} "
            f"WHERE id = ${idx} RETURNING *",
            *vals,
        )
        return dict(row) if row else None


# ---------------------------------------------------------------------------
# Approvals repo
# ---------------------------------------------------------------------------
class ApprovalRepo:
    @staticmethod
    async def list_(
        conn: asyncpg.Connection, tenant_id: str
    ) -> list[dict[str, Any]]:
        rows = await conn.fetch(
            "SELECT * FROM approvals WHERE tenant_id = $1 ORDER BY created_at DESC",
            uuid.UUID(tenant_id),
        )
        return [dict(r) for r in rows]

    @staticmethod
    async def decide(
        conn: asyncpg.Connection,
        approval_id: str,
        *,
        status: str,
        decided_by: str,
        reason: str | None = None,
    ) -> dict[str, Any] | None:
        row = await conn.fetchrow(
            "UPDATE approvals SET status = $1, decided_by = $2, reason = $3, "
            "decided_at = $4 WHERE id = $5 RETURNING *",
            status,
            decided_by,
            reason,
            datetime.now(timezone.utc),
            uuid.UUID(approval_id),
        )
        return dict(row) if row else None
