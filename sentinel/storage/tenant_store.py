"""Tenant configuration store."""
from __future__ import annotations

import asyncpg

from sentinel.models import TenantConfig


async def get_config(db: asyncpg.Connection, tenant_id: str) -> TenantConfig | None:
    """Load tenant configuration from the database."""
    row = await db.fetchrow(
        "SELECT * FROM tenants WHERE tenant_id = $1", tenant_id
    )
    if row is None:
        return None
    return TenantConfig(**dict(row))