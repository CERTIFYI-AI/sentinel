
from sentinel.api.event_helpers import emit
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sentinel.api.db import get_db, VendorQuestionnaire, new_id, now
from typing import Optional

router = APIRouter()

@router.get("")
async def list_items(skip: int=0, limit: int=100, db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(VendorQuestionnaire).order_by(desc(VendorQuestionnaire.created_at)).offset(skip).limit(limit))
    items = r.scalars().all()
    return [{k:v for k,v in item.__dict__.items() if not k.startswith("_")} for item in items]

@router.post("")
async def create_item(data: dict, db: AsyncSession=Depends(get_db)):
    item = VendorQuestionnaire(id=new_id(), **{k:v for k,v in data.items() if k != "id"})
    db.add(item)
    await db.flush()
    await emit("questionnaire.submitted", "questionnaire", payload={"id": item.id})
    return {k:v for k,v in item.__dict__.items() if not k.startswith("_")}

@router.get("/{item_id}")
async def get_item(item_id: str, db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(VendorQuestionnaire).where(VendorQuestionnaire.id==item_id))
    item = r.scalar_one_or_none()
    if not item: raise HTTPException(404, "VendorQuestionnaire not found")
    return {k:v for k,v in item.__dict__.items() if not k.startswith("_")}

@router.patch("/{item_id}")
async def update_item(item_id: str, data: dict, db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(VendorQuestionnaire).where(VendorQuestionnaire.id==item_id))
    item = r.scalar_one_or_none()
    if not item: raise HTTPException(404, "VendorQuestionnaire not found")
    for k,v in data.items():
        if k not in ("id","created_at"): setattr(item,k,v)
    await db.flush()
    return {k:v for k,v in item.__dict__.items() if not k.startswith("_")}

@router.delete("/{item_id}")
async def delete_item(item_id: str, db: AsyncSession=Depends(get_db)):
    r = await db.execute(select(VendorQuestionnaire).where(VendorQuestionnaire.id==item_id))
    item = r.scalar_one_or_none()
    if not item: raise HTTPException(404, "VendorQuestionnaire not found")
    await db.delete(item)
    return {"deleted": item_id}
