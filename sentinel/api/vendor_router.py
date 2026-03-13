from sentinel.api.db import get_db, AsyncSessionLocal
from sentinel.api.event_helpers import emit
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt
import os
from sentinel.events.compliance_events import emit_vendor_status_changed

router = APIRouter()

def get_tenant(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("tenant_id") or "unknown"
    except: raise HTTPException(401,"Invalid token")
def get_user(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try: p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"]); return p.get("sub") or "unknown"
    except: raise HTTPException(401,"Invalid token")

class VendorCreate(BaseModel):
    name: str
    category: Optional[str]=None
    risk_tier: int=2
    status: str="active"
    contract_expiry: Optional[str]=None
    data_sharing_agreement: bool=False
    soc2_certified: bool=False
    iso_certified: bool=False
    contact_name: Optional[str]=None
    contact_email: Optional[str]=None

class VendorUpdate(BaseModel):
    name: Optional[str]=None
    category: Optional[str]=None
    risk_tier: Optional[int]=None
    status: Optional[str]=None
    soc2_certified: Optional[bool]=None
    iso_certified: Optional[bool]=None
    contact_name: Optional[str]=None
    contact_email: Optional[str]=None

@router.get("")
async def list_vendors(req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    rows=await db.fetch("SELECT * FROM vendors WHERE tenant_id=$1 ORDER BY name",tenant_id)
    return [dict(r) for r in rows]

@router.get("/{vendor_id}")
async def get_vendor(vendor_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    row=await db.fetchrow("SELECT * FROM vendors WHERE id=$1 AND tenant_id=$2",vendor_id,tenant_id)
    if not row: raise HTTPException(404,"Not found")
    result=dict(row)
    result["models"]=[dict(r) for r in await db.fetch("SELECT id,name,status,compliance_status FROM model_inventory WHERE vendor_id=$1 AND tenant_id=$2",vendor_id,tenant_id)]
    result["agents"]=[dict(r) for r in await db.fetch("SELECT id,name,discovery_status FROM agents WHERE vendor_id=$1 AND tenant_id=$2",vendor_id,tenant_id)]
    return result

@router.post("")
async def create_vendor(req: Request, body: VendorCreate, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    row=await db.fetchrow("""
        INSERT INTO vendors(tenant_id,name,category,risk_tier,status,data_sharing_agreement,
            soc2_certified,iso_certified,contact_name,contact_email)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    """,tenant_id,body.name,body.category,body.risk_tier,body.status,body.data_sharing_agreement,
        body.soc2_certified,body.iso_certified,body.contact_name,body.contact_email)
    return dict(row)

@router.patch("/{vendor_id}")
async def update_vendor(vendor_id: str, req: Request, body: VendorUpdate, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    old=await db.fetchrow("SELECT * FROM vendors WHERE id=$1 AND tenant_id=$2",vendor_id,tenant_id)
    if not old: raise HTTPException(404,"Not found")
    updates={k:v for k,v in body.dict().items() if v is not None}
    if updates:
        sets=", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
        await db.execute(f"UPDATE vendors SET {sets},updated_at=NOW() WHERE id=$1",vendor_id,*updates.values())
    if body.status and body.status!=old["status"]:
        await emit_vendor_status_changed(tenant_id,vendor_id,old["name"],old["status"],body.status)
    return await db.fetchrow("SELECT * FROM vendors WHERE id=$1",vendor_id)

@router.delete("/{vendor_id}")
async def delete_vendor(vendor_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    await db.execute("DELETE FROM vendors WHERE id=$1 AND tenant_id=$2",vendor_id,tenant_id)
    return {"deleted":True}
