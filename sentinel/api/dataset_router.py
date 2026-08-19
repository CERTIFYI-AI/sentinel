from sentinel.api.db import get_db, AsyncSessionLocal
from sentinel.api.event_helpers import emit
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt
import os
from sentinel.events.compliance_events import emit_dataset_registered

router = APIRouter()

def get_tenant(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try: p=jwt.decode(token,os.environ["JWT_SECRET"],algorithms=["HS256"]); return p.get("tenant_id") or "unknown"
    except: raise HTTPException(401,"Invalid token")
def get_user(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try: p=jwt.decode(token,os.environ["JWT_SECRET"],algorithms=["HS256"]); return p.get("sub") or "unknown"
    except: raise HTTPException(401,"Invalid token")

class DatasetCreate(BaseModel):
    name: str
    version: str="1.0"
    category: Optional[str]=None
    sensitivity: str="internal"
    data_owner: Optional[str]=None
    source: Optional[str]=None
    volume_records: Optional[int]=None
    contains_pii: bool=False
    contains_demographic: bool=False
    linked_model_ids: List[str]=[]
    lineage_notes: Optional[str]=None

class DatasetUpdate(BaseModel):
    name: Optional[str]=None
    sensitivity: Optional[str]=None
    data_owner: Optional[str]=None
    contains_pii: Optional[bool]=None
    contains_demographic: Optional[bool]=None
    linked_model_ids: Optional[List[str]]=None
    lineage_notes: Optional[str]=None

@router.get("")
async def list_datasets(req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    rows=await db.fetch("SELECT * FROM dataset_registry WHERE tenant_id=$1 ORDER BY created_at DESC",tenant_id)
    return [dict(r) for r in rows]

@router.get("/{ds_id}")
async def get_dataset(ds_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    row=await db.fetchrow("SELECT * FROM dataset_registry WHERE id=$1 AND tenant_id=$2",ds_id,tenant_id)
    if not row: raise HTTPException(404,"Not found")
    result=dict(row)
    result["models"]=[dict(r) for r in await db.fetch("SELECT id,name,status,compliance_status FROM model_inventory WHERE $1=ANY(linked_dataset_ids) AND tenant_id=$2",ds_id,tenant_id)]
    result["bias_audits"]=[dict(r) for r in await db.fetch("SELECT * FROM bias_audits WHERE dataset_id=$1 ORDER BY created_at DESC LIMIT 5",ds_id)]
    return result

@router.post("")
async def create_dataset(req: Request, body: DatasetCreate, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    row=await db.fetchrow("""
        INSERT INTO dataset_registry(tenant_id,name,version,category,sensitivity,data_owner,source,
            volume_records,contains_pii,contains_demographic,linked_model_ids,lineage_notes)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    """,tenant_id,body.name,body.version,body.category,body.sensitivity,body.data_owner,body.source,
        body.volume_records,body.contains_pii,body.contains_demographic,body.linked_model_ids,body.lineage_notes)
    ds=dict(row)
    await emit_dataset_registered(tenant_id,ds["id"],body.name,body.contains_pii,body.contains_demographic)
    return ds

@router.patch("/{ds_id}")
async def update_dataset(ds_id: str, req: Request, body: DatasetUpdate, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    updates={k:v for k,v in body.dict().items() if v is not None}
    if updates:
        sets=", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
        await db.execute(f"UPDATE dataset_registry SET {sets},updated_at=NOW() WHERE id=$1 AND tenant_id=${len(updates)+2}",ds_id,*updates.values(),tenant_id)
    return await db.fetchrow("SELECT * FROM dataset_registry WHERE id=$1",ds_id)

@router.delete("/{ds_id}")
async def delete_dataset(ds_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    row=await db.fetchrow("SELECT id FROM dataset_registry WHERE id=$1 AND tenant_id=$2",ds_id,tenant_id)
    if not row: raise HTTPException(404,"Not found")
    await db.execute("DELETE FROM dataset_registry WHERE id=$1",ds_id)
    return {"deleted":True}
