"""HITL (Human-in-the-Loop) dashboard router.

Prefix changed from /api/hitl to /dashboard/hitl to match the frontend's
expected URL pattern (C-11).
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from sentinel.auth.jwt_handler import get_current_tenant
from sentinel.models import TenantConfig

# Prefix MUST match what the frontend calls: /dashboard/hitl/...
hitl_router = APIRouter(prefix="/dashboard/hitl", tags=["hitl"])


@hitl_router.get("/queue")
async def get_hitl_queue(
    tenant: TenantConfig = Depends(get_current_tenant),
) -> list[dict]:
    """Returns pending HITL review items for this tenant."""
    from sentinel.hitl.queue import hitl_queue  # noqa: PLC0415
    return await hitl_queue.get_pending(tenant.tenant_id)


@hitl_router.get("/queue/{item_id}")
async def get_hitl_item(
    item_id: str,
    tenant: TenantConfig = Depends(get_current_tenant),
) -> dict[str, Any]:
    """Returns a single HITL review item."""
    from sentinel.hitl.queue import hitl_queue  # noqa: PLC0415
    item = await hitl_queue.get_item(tenant.tenant_id, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@hitl_router.post("/queue/{item_id}/approve")
async def approve_hitl_item(
    item_id: str,
    body: dict[str, Any] | None = None,
    tenant: TenantConfig = Depends(get_current_tenant),
) -> dict[str, str]:
    """Approves a HITL review item and releases the held response."""
    from sentinel.hitl.queue import hitl_queue  # noqa: PLC0415
    await hitl_queue.approve(tenant.tenant_id, item_id, body or {})
    return {"status": "approved", "item_id": item_id}


@hitl_router.post("/queue/{item_id}/reject")
async def reject_hitl_item(
    item_id: str,
    body: dict[str, Any] | None = None,
    tenant: TenantConfig = Depends(get_current_tenant),
) -> dict[str, str]:
    """Rejects a HITL review item."""
    from sentinel.hitl.queue import hitl_queue  # noqa: PLC0415
    await hitl_queue.reject(tenant.tenant_id, item_id, body or {})
    return {"status": "rejected", "item_id": item_id}


@hitl_router.get("/stats")
async def get_hitl_stats(
    tenant: TenantConfig = Depends(get_current_tenant),
) -> dict[str, Any]:
    """Returns HITL queue statistics for the tenant."""
    from sentinel.hitl.queue import hitl_queue  # noqa: PLC0415
    return await hitl_queue.get_stats(tenant.tenant_id)
