"""Layer 4: Hash-chained append-only audit ledger.

Every request through the Sentinel pipeline produces an immutable audit entry
linked to the previous entry via SHA-256 hash chain. This satisfies ISO 42001
Control A.6.2.6 (logging of AI system decisions) and EU AI Act Article 12
(record-keeping obligations). The chain is append-only by design — there is
no update or delete function in this module.

The hash chain allows any compliance auditor to verify that no audit records
have been tampered with by walking the chain from genesis to the latest entry.
"""

from __future__ import annotations

import csv as _csv
import hashlib as _hashlib
import io as _io
import json as _json
import logging as _logging
import uuid
import datetime as _dt

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import asyncpg

from sentinel.models import AuditEntry, AuditEntryInput, IntegrityReport

_logger = _logging.getLogger(__name__)


def _canonical_json(entry_data: dict[str, Any]) -> str:
    """Produce deterministic JSON for hash computation."""
    filtered = {k: v for k, v in entry_data.items() if k != "entry_hash"}
    return _json.dumps(filtered, sort_keys=True, separators=(",", ":"), default=str)


def _compute_hash(prev_hash: str, canonical: str) -> str:
    """SHA-256 of previous hash concatenated with canonical JSON."""
    return _hashlib.sha256(
        prev_hash.encode("utf-8") + canonical.encode("utf-8")
    ).hexdigest()


def _genesis_hash(tenant_id: str) -> str:
    """Compute the genesis hash for a tenant's audit chain."""
    return _hashlib.sha256(f"{tenant_id}:GENESIS".encode("utf-8")).hexdigest()


async def _get_last_entry_hash(tenant_id: str, db: asyncpg.Connection) -> str:
    """Fetch the most recent entry_hash for a tenant, or genesis if none exist."""
    row = await db.fetchrow(
        "SELECT entry_hash FROM audit_log "
        "WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT 1",
        tenant_id,
    )
    if row is not None:
        return str(row["entry_hash"])
    return _genesis_hash(tenant_id)


async def log(
    entry_data: AuditEntryInput,
    db: asyncpg.Connection,
) -> AuditEntry:
    """Append a new entry to the tenant's audit chain."""
    entry_id = str(uuid.uuid4())
    now = _dt.datetime.now(tz=_dt.timezone.utc)

    prev_hash = await _get_last_entry_hash(entry_data.tenant_id, db)

    prompt_hash = _hashlib.sha256(
        entry_data.prompt_hash.encode("utf-8")
    ).hexdigest()
    response_hash = _hashlib.sha256(
        entry_data.response_hash.encode("utf-8")
    ).hexdigest()

    entry_dict: dict[str, Any] = {
        "entry_id": entry_id,
        "tenant_id": entry_data.tenant_id,
        "request_id": entry_data.request_id,
        "timestamp": now.isoformat(),
        "prompt_hash": prompt_hash,
        "response_hash": response_hash,
        "trust_score": entry_data.trust_score,
        "intervention_level": entry_data.intervention_level,
        "cost_usd": entry_data.cost_usd,
        "latency_ms": entry_data.latency_ms,
        "previous_entry_hash": prev_hash,
        "metadata": entry_data.metadata,
    }

    canonical = _canonical_json(entry_dict)
    entry_hash = _compute_hash(prev_hash, canonical)
    entry_dict["entry_hash"] = entry_hash

    await db.execute(
        "INSERT INTO audit_log "
        "(entry_id, tenant_id, request_id, timestamp, prompt_hash, "
        "response_hash, trust_score, intervention_level, cost_usd, latency_ms, "
        "previous_entry_hash, entry_hash, metadata) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
        entry_id,
        entry_data.tenant_id,
        entry_data.request_id,
        now,
        prompt_hash,
        response_hash,
        entry_data.trust_score,
        entry_data.intervention_level,
        entry_data.cost_usd,
        entry_data.latency_ms,
        prev_hash,
        entry_hash,
        _json.dumps(entry_data.metadata, default=str),
    )

    _logger.info(
        "Audit entry %s logged for tenant %s (trust=%.4f, intervention=%d)",
        entry_id,
        entry_data.tenant_id,
        entry_data.trust_score,
        entry_data.intervention_level,
    )

    return AuditEntry(
        entry_id=uuid.UUID(entry_id),
        tenant_id=entry_data.tenant_id,
        request_id=entry_data.request_id,
        timestamp=now,
        prompt_hash=prompt_hash,
        response_hash=response_hash,
        trust_score=entry_data.trust_score,
        intervention_level=entry_data.intervention_level,
        cost_usd=entry_data.cost_usd,
        latency_ms=entry_data.latency_ms,
        prev_hash=prev_hash,
        entry_hash=entry_hash,
        metadata=entry_data.metadata,
    )


async def verify_chain_integrity(
    tenant_id: str,
    db: asyncpg.Connection,
) -> IntegrityReport:
    """Walk the entire audit chain for a tenant and verify every hash link."""
    broken_links: list[str] = []
    total_entries = 0
    expected_prev_hash = _genesis_hash(tenant_id)

    async with db.transaction():
        async for row in db.cursor(
            "SELECT entry_id, tenant_id, request_id, timestamp, prompt_hash, "
            "response_hash, trust_score, intervention_level, cost_usd, latency_ms, "
            "previous_entry_hash, entry_hash, metadata "
            "FROM audit_log WHERE tenant_id = $1 ORDER BY timestamp ASC",
            tenant_id,
        ):
            total_entries += 1

            row_dict: dict[str, Any] = {
                "entry_id": str(row["entry_id"]),
                "tenant_id": row["tenant_id"],
                "request_id": row["request_id"],
                "timestamp": (
                    row["timestamp"].isoformat()
                    if hasattr(row["timestamp"], "isoformat")
                    else str(row["timestamp"])
                ),
                "prompt_hash": row["prompt_hash"],
                "response_hash": row["response_hash"],
                "trust_score": float(row["trust_score"]),
                "intervention_level": int(row["intervention_level"]),
                "cost_usd": float(row["cost_usd"]),
                "latency_ms": float(row["latency_ms"]),
                "previous_entry_hash": row["previous_entry_hash"],
                "metadata": _json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
            }

            if row["previous_entry_hash"] != expected_prev_hash:
                broken_links.append(str(row["entry_id"]))

            canonical = _canonical_json(row_dict)
            expected_hash = _compute_hash(row["previous_entry_hash"], canonical)
            if expected_hash != row["entry_hash"]:
                if str(row["entry_id"]) not in broken_links:
                    broken_links.append(str(row["entry_id"]))

            expected_prev_hash = row["entry_hash"]

    intact = len(broken_links) == 0

    _logger.info(
        "Chain integrity check for tenant %s: %d entries, %s (broken: %d)",
        tenant_id,
        total_entries,
        "INTACT" if intact else "BROKEN",
        len(broken_links),
    )

    return IntegrityReport(
        tenant_id=tenant_id,
        total_entries=total_entries,
        intact=intact,
        broken_at=broken_links,
        checked_at=_dt.datetime.now(tz=_dt.timezone.utc),
    )


async def get_entries(
    tenant_id: str,
    db: asyncpg.Connection,
    limit: int = 50,
    offset: int = 0,
) -> list[AuditEntry]:
    """Retrieve paginated audit entries for a tenant, newest first."""
    clamped_limit = max(1, min(limit, 500))
    rows = await db.fetch(
        "SELECT entry_id, tenant_id, request_id, timestamp, prompt_hash, "
        "response_hash, trust_score, intervention_level, cost_usd, latency_ms, "
        "previous_entry_hash, entry_hash, metadata "
        "FROM audit_log WHERE tenant_id = $1 "
        "ORDER BY timestamp DESC LIMIT $2 OFFSET $3",
        tenant_id,
        clamped_limit,
        offset,
    )

    entries: list[AuditEntry] = []
    for row in rows:
        metadata = row["metadata"]
        if isinstance(metadata, str):
            metadata = _json.loads(metadata)
        entries.append(
            AuditEntry(
                entry_id=row["entry_id"],
                tenant_id=row["tenant_id"],
                request_id=row["request_id"],
                timestamp=row["timestamp"],
                prompt_hash=row["prompt_hash"],
                response_hash=row["response_hash"],
                trust_score=float(row["trust_score"]),
                intervention_level=int(row["intervention_level"]),
                cost_usd=float(row["cost_usd"]),
                latency_ms=float(row["latency_ms"]),
                prev_hash=row["previous_entry_hash"],
                entry_hash=row["entry_hash"],
                metadata=metadata if metadata else {},
            )
        )
    return entries


async def export_to_csv(
    tenant_id: str,
    db: asyncpg.Connection,
) -> bytes:
    """Export the full audit log for a tenant as a CSV string."""
    output = _io.StringIO()
    writer = _csv.writer(output)
    writer.writerow([
        "entry_id", "tenant_id", "request_id", "timestamp",
        "prompt_hash", "response_hash", "trust_score", "intervention_level",
        "cost_usd", "latency_ms", "prev_hash", "entry_hash",
    ])

    async with db.transaction():
        async for row in db.cursor(
            "SELECT entry_id, tenant_id, request_id, timestamp, prompt_hash, "
            "response_hash, trust_score, intervention_level, cost_usd, latency_ms, "
            "previous_entry_hash, entry_hash "
            "FROM audit_log WHERE tenant_id = $1 ORDER BY timestamp ASC",
            tenant_id,
        ):
            writer.writerow([
                str(row["entry_id"]),
                row["tenant_id"],
                row["request_id"],
                row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
                row["prompt_hash"],
                row["response_hash"],
                f"{row['trust_score']:.4f}",
                row["intervention_level"],
                f"{row['cost_usd']:.6f}",
                f"{row['latency_ms']:.1f}",
                row["previous_entry_hash"],
                row["entry_hash"],
            ])

    return output.getvalue().encode("utf-8")


async def _get_summary_stats(
    tenant_id: str,
    db: asyncpg.Connection,
) -> dict[str, Any]:
    """Compute aggregate statistics for the dashboard metrics panel."""
    row = await db.fetchrow(
        "SELECT "
        "  COUNT(*) as total_entries, "
        "  AVG(trust_score) as avg_trust_score, "
        "  AVG(cost_usd) as avg_cost_usd, "
        "  AVG(latency_ms) as avg_latency_ms, "
        "  SUM(cost_usd) as total_cost_usd, "
        "  COUNT(*) FILTER (WHERE intervention_level > 0) as intervention_count, "
        "  COUNT(*) FILTER (WHERE trust_score >= 0.85) as high_trust_count, "
        "  COUNT(*) FILTER (WHERE trust_score >= 0.70 AND trust_score < 0.85) as medium_trust_count, "
        "  COUNT(*) FILTER (WHERE trust_score < 0.70) as low_trust_count "
        "FROM audit_log WHERE tenant_id = $1",
        tenant_id,
    )
    if row is None:
        return {
            "total_entries": 0,
            "avg_trust_score": 0.0,
            "avg_cost_usd": 0.0,
            "avg_latency_ms": 0.0,
            "total_cost_usd": 0.0,
            "intervention_rate": 0.0,
            "trust_distribution": {"high": 0, "medium": 0, "low": 0},
        }

    total = int(row["total_entries"])
    return {
        "total_entries": total,
        "avg_trust_score": round(float(row["avg_trust_score"] or 0), 4),
        "avg_cost_usd": round(float(row["avg_cost_usd"] or 0), 6),
        "avg_latency_ms": round(float(row["avg_latency_ms"] or 0), 1),
        "total_cost_usd": round(float(row["total_cost_usd"] or 0), 6),
        "intervention_rate": round(int(row["intervention_count"]) / total, 4) if total > 0 else 0.0,
        "trust_distribution": {
            "high": int(row["high_trust_count"]),
            "medium": int(row["medium_trust_count"]),
            "low": int(row["low_trust_count"]),
        },
    }
