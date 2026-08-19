# SPDX-License-Identifier: Apache-2.0
# Tenant-scoped CRUD for ObservabilityMetric.
#
# Every query is filtered by the caller's tenant (resolved from the verified
# JWT via get_current_tenant_id); writes bind tenant_id server-side and
# whitelist columns to the model's own fields. A caller can neither read,
# mutate nor delete another tenant's rows, nor mass-assign protected columns
# (TD-025 / audit H2).
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sentinel.api.db import get_db, ObservabilityMetric, new_id
from sentinel.api.deps import get_current_tenant_id
from sentinel.api.event_helpers import emit

router = APIRouter()

# Columns a client may set; id/tenant_id/timestamps are server-owned.
_WRITABLE = {c.name for c in ObservabilityMetric.__table__.columns} - {"id", "tenant_id", "created_at", "updated_at"}


def _clean(data: dict) -> dict:
    return {k: v for k, v in (data or {}).items() if k in _WRITABLE}


def _dump(item) -> dict:
    return {k: v for k, v in item.__dict__.items() if not k.startswith("_")}


@router.get("")
async def list_items(skip: int = 0, limit: int = 100,
                     tenant: str = Depends(get_current_tenant_id),
                     db: AsyncSession = Depends(get_db)):
    limit = max(1, min(limit, 500))
    skip = max(0, skip)
    r = await db.execute(
        select(ObservabilityMetric).where(ObservabilityMetric.tenant_id == tenant)
        .order_by(desc(ObservabilityMetric.created_at)).offset(skip).limit(limit)
    )
    return [_dump(i) for i in r.scalars().all()]


@router.post("")
async def create_item(data: dict,
                      tenant: str = Depends(get_current_tenant_id),
                      db: AsyncSession = Depends(get_db)):
    item = ObservabilityMetric(id=new_id(), tenant_id=tenant, **_clean(data))
    db.add(item)
    await db.flush()
    await emit("observability.alert", "observability", payload={"id": item.id})
    return _dump(item)


@router.get("/{item_id}")
async def get_item(item_id: str,
                   tenant: str = Depends(get_current_tenant_id),
                   db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(ObservabilityMetric).where(ObservabilityMetric.id == item_id, ObservabilityMetric.tenant_id == tenant))
    item = r.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "ObservabilityMetric not found")
    return _dump(item)


@router.patch("/{item_id}")
async def update_item(item_id: str, data: dict,
                      tenant: str = Depends(get_current_tenant_id),
                      db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(ObservabilityMetric).where(ObservabilityMetric.id == item_id, ObservabilityMetric.tenant_id == tenant))
    item = r.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "ObservabilityMetric not found")
    for k, v in _clean(data).items():
        setattr(item, k, v)
    await db.flush()
    pass  # no event
    return _dump(item)


@router.delete("/{item_id}")
async def delete_item(item_id: str,
                      tenant: str = Depends(get_current_tenant_id),
                      db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(ObservabilityMetric).where(ObservabilityMetric.id == item_id, ObservabilityMetric.tenant_id == tenant))
    item = r.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "ObservabilityMetric not found")
    await db.delete(item)
    return {"deleted": item_id}
