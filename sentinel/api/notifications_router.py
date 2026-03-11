"""Notifications API router."""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from sentinel.api.auth_router import _get_current_user, _get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    user: dict = Depends(_get_current_user),
    db: asyncpg.Connection = Depends(_get_db),
) -> list[dict]:
    rows = await db.fetch(
        """SELECT id, type, title, body, read, created_at
           FROM notifications
           WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL)
           ORDER BY read ASC, created_at DESC
           LIMIT 100""",
        user["tenant_id"], user["id"],
    )
    return [dict(r) for r in rows]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    user: dict = Depends(_get_current_user),
    db: asyncpg.Connection = Depends(_get_db),
) -> dict:
    await db.execute(
        "UPDATE notifications SET read = TRUE WHERE id = $1 AND tenant_id = $2",
        notification_id, user["tenant_id"],
    )
    return {"status": "ok"}


@router.post("/read-all")
async def mark_all_read(
    user: dict = Depends(_get_current_user),
    db: asyncpg.Connection = Depends(_get_db),
) -> dict:
    await db.execute(
        """UPDATE notifications SET read = TRUE
           WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL) AND read = FALSE""",
        user["tenant_id"], user["id"],
    )
    return {"status": "ok"}


@router.get("/count")
async def unread_count(
    user: dict = Depends(_get_current_user),
    db: asyncpg.Connection = Depends(_get_db),
) -> dict:
    count = await db.fetchval(
        """SELECT COUNT(*) FROM notifications
           WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL) AND read = FALSE""",
        user["tenant_id"], user["id"],
    )
    return {"unread": count or 0}
