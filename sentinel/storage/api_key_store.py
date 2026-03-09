"""API key store for tenant key management."""
from __future__ import annotations

import asyncpg


async def get_key(db: asyncpg.Connection, key_id: str) -> dict | None:
    """Retrieve an API key record."""
    row = await db.fetchrow("SELECT * FROM api_keys WHERE key_id = $1", key_id)
    return dict(row) if row else None


async def list_keys(db: asyncpg.Connection, tenant_id: str) -> list[dict]:
    """List all API keys for a tenant."""
    rows = await db.fetch("SELECT * FROM api_keys WHERE tenant_id = $1", tenant_id)
    return [dict(r) for r in rows]