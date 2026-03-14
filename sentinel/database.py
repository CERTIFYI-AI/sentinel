
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sentinel.config import settings

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

if settings.database_url:
    db_url = str(settings.database_url)
    # Convert postgres:// to postgresql+asyncpg://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://") and "+" not in db_url.split("://")[0]:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(db_url, echo=False)
else:
    engine = create_async_engine("sqlite+aiosqlite:///./sentinel.db", echo=False, connect_args={"check_same_thread": False})

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")




# --- Repository classes (asyncpg-style) ---

import uuid as _uuid
from datetime import datetime as _dt, timezone as _tz


class AuditLogRepo:
    TABLE = "audit_log"

    @staticmethod
    async def append(db, tenant_id: str, **kwargs) -> dict:
        row_id = kwargs.get("id") or str(_uuid.uuid4())
        kwargs["id"] = row_id
        kwargs["tenant_id"] = tenant_id
        kwargs.setdefault("created_at", _dt.now(_tz.utc).isoformat())
        result = await db.fetchrow(
            f"INSERT INTO audit_log (id, tenant_id) VALUES ($1, $2) RETURNING *",
            row_id, tenant_id,
        )
        return result or {"id": row_id}

    @staticmethod
    async def list_(db, tenant_id: str, *, page: int = 1, limit: int = 25) -> tuple:
        offset = (page - 1) * limit
        items = await db.fetch(
            f"SELECT * FROM audit_log WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            tenant_id, limit, offset,
        )
        total = await db.fetchval(
            "SELECT count(*) FROM audit_log WHERE tenant_id=$1", tenant_id
        )
        return items, total


class UserRepo:
    TABLE = "users"

    @staticmethod
    async def create(db, *, tenant_id: str, email: str, name: str = "", role: str = "viewer", **kw) -> str:
        row = await db.fetchrow(
            "INSERT INTO users (id, tenant_id, email, name, role) VALUES ($1,$2,$3,$4,$5) RETURNING *",
            str(_uuid.uuid4()), tenant_id, email, name, role,
        )
        return str(row["id"]) if row else str(_uuid.uuid4())

    @staticmethod
    async def get_by_email(db, email: str):
        return await db.fetchrow("SELECT * FROM users WHERE email=$1", email)

    @staticmethod
    async def get_by_id(db, user_id: str):
        return await db.fetchrow("SELECT * FROM users WHERE id=$1", user_id)


class NotificationRepo:
    TABLE = "notifications"

    @staticmethod
    async def create(db, *, tenant_id: str = "", user_id: str, title: str = "", message: str = "", **kw) -> str:
        nid = str(_uuid.uuid4())
        row = await db.fetchrow(
            "INSERT INTO notifications (id,user_id,title,message,is_read) VALUES ($1,$2,$3,$4,false) RETURNING *",
            nid, user_id, title, message,
        )
        return str(row["id"]) if row else nid

    @staticmethod
    async def unread_count(db, user_id: str) -> int:
        val = await db.fetchval(
            "SELECT count(*) FROM notifications WHERE user_id=$1 AND is_read=false", user_id
        )
        return val or 0

    @staticmethod
    async def mark_read(db, notification_id: str, user_id: str = None) -> None:
        if user_id:
            await db.execute(
                "UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",
                notification_id, user_id,
            )
        else:
            await db.execute(
                "UPDATE notifications SET is_read=true WHERE id=$1",
                notification_id,
            )

    @staticmethod
    async def mark_all_read(db, user_id: str) -> None:
        await db.execute(
            "UPDATE notifications SET is_read=true WHERE user_id=$1", user_id
        )


class FindingRepo:
    TABLE = "findings"

    @staticmethod
    async def list_(db, tenant_id: str) -> list:
        return await db.fetch("SELECT * FROM findings WHERE tenant_id=$1", tenant_id)

    @staticmethod
    async def get(db, finding_id: str):
        return await db.fetchrow("SELECT * FROM findings WHERE id=$1", finding_id)


class ApprovalRepo:
    TABLE = "approvals"

    @staticmethod
    async def list_(db, tenant_id: str) -> list:
        return await db.fetch("SELECT * FROM approvals WHERE tenant_id=$1", tenant_id)

    @staticmethod
    async def decide(db, approval_id: str, *, status: str, decided_by: str) -> dict:
        row = await db.fetchrow(
            "UPDATE approvals SET status=$1, decided_by=$2 WHERE id=$3 RETURNING *",
            status, decided_by, approval_id,
        )
        return row or {"id": approval_id, "status": status}
