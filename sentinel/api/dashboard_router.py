"""Dashboard REST and WebSocket router for Certifyi Sentinel.

Mounts at /dashboard. Provides metrics, audit, compliance, config, and key
management endpoints. Also exposes WebSocket streams for real-time updates.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import asyncpg
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from sentinel.auth.jwt_handler import get_current_tenant
from sentinel.compliance.engine import compliance_engine
from sentinel.layers import auditor
from sentinel.models import TenantConfig
from sentinel.observability.metrics import metrics_collector
from sentinel.storage.audit_store import audit_store
from sentinel.storage import api_key_store, tenant_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------------------------------------------------------------------------
# Helper: DB dependency (re-use pattern from proxy.py)
# ---------------------------------------------------------------------------

async def _get_db() -> asyncpg.Connection:  # pragma: no cover
    from sentinel.config import settings  # noqa: PLC0415
    conn = await asyncpg.connect(str(settings.DATABASE_URL))
    try:
        yield conn
    finally:
        await conn.close()


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@router.get("/metrics")
async def get_metrics(
    tenant: TenantConfig = Depends(get_current_tenant),
) -> dict[str, Any]:
    """Returns aggregated metrics summary for the tenant."""
    return await metrics_collector.get_summary(tenant.tenant_id)


@router.get("/audit")
async def get_audit(
    page: int = 1,
    page_size: int = 50,
    tenant: TenantConfig = Depends(get_current_tenant),
    db: asyncpg.Connection = Depends(_get_db),
) -> list[dict]:
    """Returns paginated audit log entries for the tenant."""
    return await audit_store.get_entries(db, tenant.tenant_id, page, page_size)


@router.get("/audit/integrity")
async def check_audit_integrity(
    tenant: TenantConfig = Depends(get_current_tenant),
) -> dict[str, Any]:
    """Verifies the hash chain integrity of the tenant audit log."""
    report = await auditor.verify_chain_integrity(tenant.tenant_id)
    return report


@router.get("/config")
async def get_config(
    tenant: TenantConfig = Depends(get_current_tenant),
) -> TenantConfig:
    """Returns the current tenant configuration."""
    return tenant


@router.patch("/config")
async def update_config(
    update: dict[str, Any],
    tenant: TenantConfig = Depends(get_current_tenant),
    db: asyncpg.Connection = Depends(_get_db),
) -> dict[str, Any]:
    """Updates tenant configuration fields."""
    return await tenant_store.update_config(db, tenant.tenant_id, update)


@router.get("/keys")
async def list_keys(
    tenant: TenantConfig = Depends(get_current_tenant),
    db: asyncpg.Connection = Depends(_get_db),
) -> list[dict]:
    """Lists API keys for the tenant."""
    return await api_key_store.list_keys(db, tenant.tenant_id)


@router.post("/keys")
async def create_key(
    body: dict[str, str],
    tenant: TenantConfig = Depends(get_current_tenant),
    db: asyncpg.Connection = Depends(_get_db),
) -> dict[str, Any]:
    """Creates a new API key for the tenant."""
    return await api_key_store.create_key(db, tenant.tenant_id, body.get("name", ""))


@router.get("/compliance/status")
async def compliance_status(
    tenant: TenantConfig = Depends(get_current_tenant),
) -> dict[str, Any]:
    """Returns rolling compliance scores for all active frameworks."""
    return await compliance_engine.get_rolling_scores(tenant.tenant_id)


@router.get("/compliance/evidence")
async def compliance_evidence(
    framework_id: str | None = None,
    tenant: TenantConfig = Depends(get_current_tenant),
) -> list[dict]:
    """Returns compliance evidence records, optionally filtered by framework."""
    from sentinel.compliance.evidence_store import evidence_store  # noqa: PLC0415
    return await evidence_store.get_evidence(tenant.tenant_id, framework_id)


@router.post("/compliance/report")
async def generate_report(
    body: dict[str, Any],
    tenant: TenantConfig = Depends(get_current_tenant),
) -> dict[str, Any]:
    """Generates a compliance report for the requested frameworks."""
    from sentinel.compliance.report_builder import report_builder  # noqa: PLC0415
    return await report_builder.build(tenant.tenant_id, body)


# ---------------------------------------------------------------------------
# WebSocket endpoints
# ---------------------------------------------------------------------------

_ws_connections: dict[str, list[WebSocket]] = {}


async def _resolve_ws_tenant(token: str) -> TenantConfig:
    """Validates a WebSocket token and returns the tenant config."""
    from sentinel.config import settings  # noqa: PLC0415
    from jose import JWTError, jwt  # noqa: PLC0415
    from sentinel.storage import tenant_store  # noqa: PLC0415
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise ValueError("Missing tenant_id claim")
    import asyncpg  # noqa: PLC0415
    conn = await asyncpg.connect(str(settings.DATABASE_URL))
    try:
        config = await tenant_store.get_config(conn, tenant_id)
    finally:
        await conn.close()
    if config is None:
        raise ValueError("Unknown tenant")
    return config


@router.websocket("/ws/metrics")
async def ws_metrics(websocket: WebSocket, token: str) -> None:
    """Streams metrics updates every 2 seconds to the connected client."""
    try:
        tenant = await _resolve_ws_tenant(token)
    except ValueError:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    tenant_id = tenant.tenant_id
    _ws_connections.setdefault(tenant_id, []).append(websocket)
    try:
        while True:
            summary = await metrics_collector.get_summary(tenant_id)
            await websocket.send_json(summary if isinstance(summary, dict) else summary)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        _ws_connections.get(tenant_id, []).remove(websocket)


@router.websocket("/ws/audit")
async def ws_audit(websocket: WebSocket, token: str) -> None:
    """Keeps an audit-stream WebSocket alive; server pushes on new entries."""
    try:
        tenant = await _resolve_ws_tenant(token)
    except ValueError:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    try:
        await websocket.receive_text()  # keep alive until client disconnects
    except WebSocketDisconnect:
        pass
