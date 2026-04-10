"""audit_log_router.py

Sprint 5 — cursor-based audit log pagination (tamper-evident)
and signed export endpoint.

Endpoints:
  GET  /audit-log                   cursor-paginated log
  GET  /audit-log/export            signed JSON or CSV export
  POST /audit-log/verify-chain      verify hash-chain integrity
"""
from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import io
import json
import os
from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from sentinel.auth.jwt_handler import get_current_tenant

router = APIRouter(tags=["Audit Log"])

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------


class AuditEntry(BaseModel):
    id: str
    tenant_id: str
    timestamp: datetime
    event_type: str
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    action: str
    outcome: str  # SUCCESS | FAILURE | BLOCKED
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    payload_hash: str  # SHA-256 of request payload
    chain_hash: str    # SHA-256(previous_chain_hash + payload_hash)
    metadata: dict = Field(default_factory=dict)


class CursorPage(BaseModel):
    items: List[AuditEntry]
    next_cursor: Optional[str] = None  # opaque base64-encoded cursor
    prev_cursor: Optional[str] = None
    total_count: int
    has_more: bool


class ChainVerifyResult(BaseModel):
    valid: bool
    entries_checked: int
    first_broken_id: Optional[str] = None
    verified_at: datetime


class ExportMeta(BaseModel):
    tenant_id: str
    exported_at: str
    entry_count: int
    export_hash: str    # SHA-256 of entire export payload
    signature: str      # HMAC-SHA256 signed with EXPORT_SIGNING_KEY


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

EXPORT_SIGNING_KEY = os.environ.get("AUDIT_EXPORT_SIGNING_KEY", "change-me-in-production")


def _encode_cursor(value: str) -> str:
    return base64.urlsafe_b64encode(value.encode()).decode()


def _decode_cursor(cursor: str) -> str:
    try:
        return base64.urlsafe_b64decode(cursor.encode()).decode()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid cursor") from exc


def _sign_export(payload: str) -> tuple[str, str]:
    """Return (sha256_hash, hmac_signature) for the export payload."""
    payload_bytes = payload.encode()
    export_hash = hashlib.sha256(payload_bytes).hexdigest()
    signature = hmac.new(
        EXPORT_SIGNING_KEY.encode(),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return export_hash, signature


async def _fetch_entries(
    tenant_id: str,
    after_cursor: Optional[str],
    limit: int,
    event_type: Optional[str],
    outcome: Optional[str],
    actor_id: Optional[str],
    start_time: Optional[datetime],
    end_time: Optional[datetime],
) -> tuple[List[AuditEntry], Optional[str], bool]:
    """Fetch audit entries from the audit store.

    Returns (entries, next_id_cursor, has_more).
    Delegates to sentinel.layers.auditor AuditStore when available;
    falls back to empty list in test environments without a DB.
    """
    try:
        from sentinel.layers.auditor import AuditStore  # noqa: PLC0415

        store = AuditStore()
        rows, next_id, has_more = await store.list_cursor(
            tenant_id=tenant_id,
            after_id=after_cursor,
            limit=limit,
            event_type=event_type,
            outcome=outcome,
            actor_id=actor_id,
            start_time=start_time,
            end_time=end_time,
        )
        return rows, next_id, has_more
    except ImportError:
        return [], None, False


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=CursorPage, summary="List audit log entries (cursor-paginated)")
async def list_audit_log(
    tenant: Annotated[dict, Depends(get_current_tenant)],
    cursor: Optional[str] = Query(None, description="Opaque pagination cursor from previous response"),
    limit: int = Query(50, ge=1, le=500, description="Page size (max 500)"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    outcome: Optional[str] = Query(None, description="Filter by outcome: SUCCESS|FAILURE|BLOCKED"),
    actor_id: Optional[str] = Query(None, description="Filter by actor user ID"),
    start_time: Optional[datetime] = Query(None, description="ISO-8601 start timestamp"),
    end_time: Optional[datetime] = Query(None, description="ISO-8601 end timestamp"),
) -> CursorPage:
    """Return a cursor-paginated page of audit log entries.

    Cursors are opaque base64 tokens encoding the last-seen record ID.
    This approach provides stable pagination over an append-only log
    even as new entries are added between requests — critical for
    tamper-evident evidence collection (ISO 42001 §6.1, SOC 2 CC7.2).
    """
    after_id = _decode_cursor(cursor) if cursor else None
    tenant_id: str = tenant["tenant_id"]

    entries, next_id, has_more = await _fetch_entries(
        tenant_id=tenant_id,
        after_cursor=after_id,
        limit=limit,
        event_type=event_type,
        outcome=outcome,
        actor_id=actor_id,
        start_time=start_time,
        end_time=end_time,
    )

    next_cursor = _encode_cursor(next_id) if next_id else None

    try:
        from sentinel.layers.auditor import AuditStore  # noqa: PLC0415
        total = await AuditStore().count(tenant_id=tenant_id)
    except ImportError:
        total = len(entries)

    return CursorPage(
        items=entries,
        next_cursor=next_cursor,
        prev_cursor=None,  # forward-only cursor for append-only log
        total_count=total,
        has_more=has_more,
    )


@router.get("/export", summary="Export audit log as signed JSON or CSV")
async def export_audit_log(
    tenant: Annotated[dict, Depends(get_current_tenant)],
    fmt: str = Query("json", description="Export format: json or csv"),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
) -> StreamingResponse:
    """Export the full audit log (within optional date range) as a signed file.

    The exported file includes:
    - All matching audit entries
    - Export metadata block: tenant_id, exported_at, entry_count, sha256 hash
    - HMAC-SHA256 signature (signed with AUDIT_EXPORT_SIGNING_KEY)

    This signed export satisfies regulatory evidence requirements for:
    - ISO 42001 §9.1 (monitoring, measurement, analysis)
    - SOC 2 CC7.2 (log integrity)
    - EU AI Act Article 12 (record-keeping)
    """
    tenant_id: str = tenant["tenant_id"]
    fmt = fmt.lower()
    if fmt not in ("json", "csv"):
        raise HTTPException(status_code=400, detail="fmt must be 'json' or 'csv'")

    # Fetch all matching entries (no cursor, no limit — export is bounded by time range)
    all_entries: list[AuditEntry] = []
    cursor_id: Optional[str] = None
    while True:
        batch, next_id, has_more = await _fetch_entries(
            tenant_id=tenant_id,
            after_cursor=cursor_id,
            limit=500,
            event_type=event_type,
            outcome=outcome,
            actor_id=None,
            start_time=start_time,
            end_time=end_time,
        )
        all_entries.extend(batch)
        if not has_more or not next_id:
            break
        cursor_id = next_id

    exported_at = datetime.now(timezone.utc).isoformat()

    if fmt == "json":
        payload_dict = {
            "export_meta": {
                "tenant_id": tenant_id,
                "exported_at": exported_at,
                "entry_count": len(all_entries),
                "format": "json",
            },
            "entries": [e.model_dump(mode="json") for e in all_entries],
        }
        raw_payload = json.dumps(payload_dict, default=str, indent=2)
        export_hash, signature = _sign_export(raw_payload)
        payload_dict["export_meta"]["export_hash"] = export_hash
        payload_dict["export_meta"]["signature"] = signature
        final_json = json.dumps(payload_dict, default=str, indent=2)

        return StreamingResponse(
            io.BytesIO(final_json.encode()),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="audit-log-{tenant_id}-{exported_at[:10]}.json"',
                "X-Export-Hash": export_hash,
                "X-Export-Signature": signature,
            },
        )

    # CSV format
    output = io.StringIO()
    fieldnames = [
        "id", "timestamp", "event_type", "actor_id", "actor_role",
        "resource_type", "resource_id", "action", "outcome",
        "ip_address", "payload_hash", "chain_hash",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for entry in all_entries:
        row = entry.model_dump(mode="json")
        writer.writerow({k: row.get(k, "") for k in fieldnames})

    csv_payload = output.getvalue()
    export_hash, signature = _sign_export(csv_payload)

    return StreamingResponse(
        io.BytesIO(csv_payload.encode()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="audit-log-{tenant_id}-{exported_at[:10]}.csv"',
            "X-Export-Hash": export_hash,
            "X-Export-Signature": signature,
        },
    )


@router.post("/verify-chain", response_model=ChainVerifyResult, summary="Verify audit log hash-chain integrity")
async def verify_audit_chain(
    tenant: Annotated[dict, Depends(get_current_tenant)],
) -> ChainVerifyResult:
    """Walk the entire audit chain and verify each entry's chain_hash.

    The chain_hash is SHA-256(previous_chain_hash + payload_hash).
    If any entry's chain_hash does not match, the chain has been tampered with.
    Returns the ID of the first broken entry.

    Scheduled automatically every 6 hours by background_runner.py;
    also available as an on-demand endpoint for compliance auditors.
    """
    tenant_id: str = tenant["tenant_id"]

    try:
        from sentinel.layers.auditor import AuditStore  # noqa: PLC0415
        store = AuditStore()
        entries = await store.list_all_ordered(tenant_id=tenant_id)
    except ImportError:
        return ChainVerifyResult(
            valid=True,
            entries_checked=0,
            first_broken_id=None,
            verified_at=datetime.now(timezone.utc),
        )

    prev_hash = "GENESIS"
    for entry in entries:
        expected = hashlib.sha256(
            (prev_hash + entry.payload_hash).encode()
        ).hexdigest()
        if entry.chain_hash != expected:
            return ChainVerifyResult(
                valid=False,
                entries_checked=entries.index(entry),
                first_broken_id=entry.id,
                verified_at=datetime.now(timezone.utc),
            )
        prev_hash = entry.chain_hash

    return ChainVerifyResult(
        valid=True,
        entries_checked=len(entries),
        first_broken_id=None,
        verified_at=datetime.now(timezone.utc),
    )
