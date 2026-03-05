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

import csv
import hashlib
import io
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import asyncpg

from sentinel.models import AuditEntry, AuditEntryInput, IntegrityReport

logger = logging.getLogger(__name__)


def _canonical_json(entry_data: dict[str, Any]) -> str:
    """Produce deterministic JSON for hash computation.

    Uses sorted keys and minimal separators so that the same logical entry
    always produces the same byte sequence regardless of dict insertion order.
    The 'entry_hash' field is excluded because it is the output of this
    computation, not an input to it.
    """
    filtered = {k: v for k, v in entry_data.items() if k != "entry_hash"}
    return json.dumps(filtered, sort_keys=True, separators=(",", ":"), default=str)


def _compute_hash(prev_hash: str, canonical: str) -> str:
    """SHA-256 of previous hash concatenated with canonical JSON.

    This is the core of the hash chain integrity guarantee. Each entry's hash
    depends on the previous entry's hash, forming an ordered, tamper-evident
    sequence similar to a blockchain without the consensus overhead.
    """
    return hashlib.sha256(
        prev_hash.encode("utf-8") + canonical.encode("utf-8")
    ).hexdigest()


def _genesis_hash(tenant_id: str) -> str:
    """Compute the genesis hash for a tenant's audit chain.

    The first entry in every tenant's chain uses this deterministic seed
    instead of a previous entry hash. This anchors the chain to the tenant
    identity so chains from different tenants cannot be spliced together.
    """
    return hashlib.sha256(f"{tenant_id}:GENESIS".encode("utf-8")).hexdigest()


async def _get_last_entry_hash(tenant_id: str, db: asyncpg.Connection) -> str:
    """Fetch the most recent entry_hash for a tenant, or genesis if none exist.

    This query uses the (tenant_id, timestamp DESC) index to avoid a full
    table scan. Returns the genesis hash for new tenants with no audit history.
    """
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
    """Append a new entry to the tenant's audit chain.

    Computes the hash chain link by fetching the previous entry's hash,
    building the canonical JSON representation, and computing SHA-256.
    The entry is then inserted into the TimescaleDB hypertable in a single
    round-trip. This function is called as a fire-and-forget background task
    from the proxy layer — failures are logged but never propagated to the
    client because the response has already been delivered.

    Args:
        entry_data: Pre-validated input containing all audit fields except
            the computed hashes and entry_id.
        db: An asyncpg connection from the pool. Must be acquired before
            calling this function.

    Returns:
        The complete AuditEntry with computed hashes and generated entry_id.

    Raises:
        asyncpg.PostgresError: If the database insert fails. Caller should
            log and retry with exponential backoff.
    """
    entry_id = str(uuid.uuid4())
    now = datetime.now(tz=timezone.utc)
    prev_hash = await _get_last_entry_hash(entry_data.tenant_id, db)

    prompt_hash = hashlib.sha256(
        entry_data.prompt.encode("utf-8")
    ).hexdigest()
    response_hash = hashlib.sha256(
        entry_data.response.encode("utf-8")
    ).hexdigest()

    entry_dict: dict[str, Any] = {
        "entry_id": entry_id,
        "tenant_id": entry_data.tenant_id,
        "request_id": entry_data.request_id,
        "timestamp": now.isoformat(),
        "prompt_hash": prompt_hash,
        "response_hash": response_hash,
        "trust_score": entry_data.trust_score,
        "intervention": entry_data.intervention,
        "cost_usd": entry_data.cost_usd,
        "latency_ms": entry_data.latency_ms,
        "prev_hash": prev_hash,
        "metadata": entry_data.metadata,
    }

    canonical = _canonical_json(entry_dict)
    entry_hash = _compute_hash(prev_hash, canonical)
    entry_dict["entry_hash"] = entry_hash

    await db.execute(
        "INSERT INTO audit_log "
        "(entry_id, tenant_id, request_id, timestamp, prompt_hash, "
        "response_hash, trust_score, intervention, cost_usd, latency_ms, "
        "prev_hash, entry_hash, metadata) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
        uuid.UUID(entry_id),
        entry_data.tenant_id,
        entry_data.request_id,
        now,
        prompt_hash,
        response_hash,
        entry_data.trust_score,
        entry_data.intervention,
        entry_data.cost_usd,
        entry_data.latency_ms,
        prev_hash,
        entry_hash,
        json.dumps(entry_data.metadata, default=str),
    )

    logger.info(
        "Audit entry %s logged for tenant %s (trust=%.4f, intervention=%d)",
        entry_id,
        entry_data.tenant_id,
        entry_data.trust_score,
        entry_data.intervention,
    )

    return AuditEntry(
        entry_id=entry_id,
        tenant_id=entry_data.tenant_id,
        request_id=entry_data.request_id,
        timestamp=now,
        prompt_hash=prompt_hash,
        response_hash=response_hash,
        trust_score=entry_data.trust_score,
        intervention=entry_data.intervention,
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
    """Walk the entire audit chain for a tenant and verify every hash link.

    Streams rows ordered by timestamp ASC and recomputes each entry's expected
    hash from (prev_hash + canonical_json). Compares against the stored
    entry_hash. Reports ALL broken links — does not stop on the first failure
    because a compliance auditor needs the complete picture.

    This is O(n) in the number of entries and streams rows one at a time to
    avoid loading the full audit history into memory. Designed to work on
    6+ months of data without memory pressure.

    Args:
        tenant_id: The tenant whose chain to verify.
        db: An asyncpg connection from the pool.

    Returns:
        IntegrityReport with intact=True if every link is valid, or
        intact=False with a list of broken entry_ids.
    """
    broken_links: list[str] = []
    total_entries = 0
    expected_prev_hash = _genesis_hash(tenant_id)

    async with db.transaction():
        async for row in db.cursor(
            "SELECT entry_id, tenant_id, request_id, timestamp, prompt_hash, "
            "response_hash, trust_score, intervention, cost_usd, latency_ms, "
            "prev_hash, entry_hash, metadata "
            "FROM audit_log WHERE tenant_id = $1 ORDER BY timestamp ASC",
            tenant_id,
        ):
            total_entries += 1
            row_dict: dict[str, Any] = {
                "entry_id": str(row["entry_id"]),
                "tenant_id": row["tenant_id"],
                "request_id": row["request_id"],
                "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
                "prompt_hash": row["prompt_hash"],
                "response_hash": row["response_hash"],
                "trust_score": float(row["trust_score"]),
                "intervention": int(row["intervention"]),
                "cost_usd": float(row["cost_usd"]),
                "latency_ms": float(row["latency_ms"]),
                "prev_hash": row["prev_hash"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
            }

            if row["prev_hash"] != expected_prev_hash:
                broken_links.append(str(row["entry_id"]))

            canonical = _canonical_json(row_dict)
            expected_hash = _compute_hash(row["prev_hash"], canonical)

            if expected_hash != row["entry_hash"]:
                if str(row["entry_id"]) not in broken_links:
                    broken_links.append(str(row["entry_id"]))

            expected_prev_hash = row["entry_hash"]

    intact = len(broken_links) == 0
    logger.info(
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
        checked_at=datetime.now(tz=timezone.utc),
    )


async def get_entries(
    tenant_id: str,
    db: asyncpg.Connection,
    limit: int = 50,
    offset: int = 0,
) -> list[AuditEntry]:
    """Retrieve paginated audit entries for a tenant, newest first.

    Uses the (tenant_id, timestamp DESC) index for efficient pagination.
    Default page size is 50 entries, matching the dashboard's ring buffer.

    Args:
        tenant_id: Tenant to query.
        db: asyncpg connection.
        limit: Maximum entries to return (1–500).
        offset: Number of entries to skip for pagination.

    Returns:
        List of AuditEntry objects ordered by timestamp descending.
    """
    clamped_limit = max(1, min(limit, 500))
    rows = await db.fetch(
        "SELECT entry_id, tenant_id, request_id, timestamp, prompt_hash, "
        "response_hash, trust_score, intervention, cost_usd, latency_ms, "
        "prev_hash, entry_hash, metadata "
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
            metadata = json.loads(metadata)
        entries.append(
            AuditEntry(
                entry_id=str(row["entry_id"]),
                tenant_id=row["tenant_id"],
                request_id=row["request_id"],
                timestamp=row["timestamp"],
                prompt_hash=row["prompt_hash"],
                response_hash=row["response_hash"],
                trust_score=float(row["trust_score"]),
                intervention=int(row["intervention"]),
                cost_usd=float(row["cost_usd"]),
                latency_ms=float(row["latency_ms"]),
                prev_hash=row["prev_hash"],
                entry_hash=row["entry_hash"],
                metadata=metadata if metadata else {},
            )
        )
    return entries


async def export_to_csv(
    tenant_id: str,
    db: asyncpg.Connection,
) -> str:
    """Export the full audit log for a tenant as a CSV string.

    Streams all entries ordered by timestamp ASC to produce a chronological
    export suitable for compliance review. The CSV includes all fields except
    encrypted metadata (which would be meaningless to an external reviewer).

    Returns:
        UTF-8 CSV string with headers.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "entry_id", "tenant_id", "request_id", "timestamp",
        "prompt_hash", "response_hash", "trust_score", "intervention",
        "cost_usd", "latency_ms", "prev_hash", "entry_hash",
    ])

    async with db.transaction():
        async for row in db.cursor(
            "SELECT entry_id, tenant_id, request_id, timestamp, prompt_hash, "
            "response_hash, trust_score, intervention, cost_usd, latency_ms, "
            "prev_hash, entry_hash "
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
                row["intervention"],
                f"{row['cost_usd']:.6f}",
                f"{row['latency_ms']:.1f}",
                row["prev_hash"],
                row["entry_hash"],
            ])

    return output.getvalue()


async def get_summary_stats(
    tenant_id: str,
    db: asyncpg.Connection,
) -> dict[str, Any]:
    """Compute aggregate statistics for the dashboard metrics panel.

    Runs a single SQL aggregation query rather than pulling rows into Python.
    Returns counts, averages, and distributions used by the Overview page.
    """
    row = await db.fetchrow(
        "SELECT "
        "  COUNT(*) as total_entries, "
        "  AVG(trust_score) as avg_trust_score, "
        "  AVG(cost_usd) as avg_cost_usd, "
        "  AVG(latency_ms) as avg_latency_ms, "
        "  SUM(cost_usd) as total_cost_usd, "
        "  COUNT(*) FILTER (WHERE intervention > 0) as intervention_count, "
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
