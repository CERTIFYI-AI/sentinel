"""Audit storage — append-only INSERT into TimescaleDB hypertable."""
from __future__ import annotations

import json

import asyncpg

from sentinel.models import AuditEntry


class AuditStore:
    async def insert_entry(
        self,
        conn: asyncpg.Connection,
        entry: AuditEntry,
    ) -> None:
        """
        Inserts one audit entry into the append-only audit_log hypertable.
        Uses parameterised SQL — never f-strings.
        The entry_hash has already been computed by the auditor layer.
        """
        await conn.execute(
            """
            INSERT INTO audit_log (
                entry_id, tenant_id, request_id, timestamp,
                prompt_hash, response_hash, trust_score, intervention,
                cost_usd, latency_ms, prev_hash, entry_hash, metadata
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
            """,
            entry.entry_id,
            entry.tenant_id,
            entry.request_id,
            entry.timestamp,
            entry.prompt_hash,
            entry.response_hash,
            entry.trust_score,
            entry.intervention.value,
            entry.cost_usd,
            entry.latency_ms,
            entry.prev_hash,
            entry.entry_hash,
            json.dumps(entry.metadata),
        )

    async def get_entries(
        self,
        conn: asyncpg.Connection,
        tenant_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> list[dict]:
        """Returns paginated audit log entries for a tenant."""
        offset = (page - 1) * page_size
        rows = await conn.fetch(
            """
            SELECT * FROM audit_log
            WHERE tenant_id = $1
            ORDER BY timestamp DESC
            LIMIT $2 OFFSET $3
            """,
            tenant_id,
            page_size,
            offset,
        )
        return [dict(r) for r in rows]


audit_store = AuditStore()
