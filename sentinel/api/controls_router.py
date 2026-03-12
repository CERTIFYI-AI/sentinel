from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt
import os
from sentinel.events.compliance_events import emit_control_status_changed

router = APIRouter()

async def get_db():
    import asyncpg
    dsn = os.environ.get("DATABASE_URL","postgresql://sentinel:sentinel@localhost:5432/sentinel")
    if not hasattr(get_db,"_pool") or get_db._pool is None:
        get_db._pool = await asyncpg.create_pool(dsn=dsn,min_size=1,max_size=5)
    return get_db._pool

def get_tenant(req): 
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try:
        p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"])
        return p.get("tenant_id") or "unknown"
    except: raise HTTPException(401,"Invalid token")

def get_user(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try:
        p=jwt.decode(token,os.environ.get("JWT_SECRET","sentinel-secret"),algorithms=["HS256"])
        return p.get("sub") or "unknown"
    except: raise HTTPException(401,"Invalid token")

class ControlCreate(BaseModel):
    name: str
    control_id: Optional[str]=None
    category: Optional[str]=None
    description: Optional[str]=None
    owner: Optional[str]=None
    framework: Optional[str]=None
    linked_policy_ids: List[str]=[]
    frequency: str="monthly"
    risk_level: str="medium"

class ControlUpdate(BaseModel):
    name: Optional[str]=None
    status: Optional[str]=None
    category: Optional[str]=None
    description: Optional[str]=None
    owner: Optional[str]=None
    frequency: Optional[str]=None
    risk_level: Optional[str]=None

class TestResult(BaseModel):
    result: str
    tester: Optional[str]=None
    notes: Optional[str]=None

@router.get("")
async def list_controls(req: Request, framework: Optional[str]=None, status: Optional[str]=None, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    q="SELECT * FROM controls WHERE tenant_id=$1"
    params=[tenant_id]
    if framework: q+=f" AND framework=${len(params)+1}"; params.append(framework)
    if status: q+=f" AND status=${len(params)+1}"; params.append(status)
    q+=" ORDER BY created_at DESC"
    rows=await db.fetch(q,*params)
    return [dict(r) for r in rows]

@router.get("/stats")
async def control_stats(req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    total=await db.fetchval("SELECT COUNT(*) FROM controls WHERE tenant_id=$1",tenant_id)
    implemented=await db.fetchval("SELECT COUNT(*) FROM controls WHERE tenant_id=$1 AND status='implemented'",tenant_id)
    failed=await db.fetchval("SELECT COUNT(*) FROM controls WHERE tenant_id=$1 AND status='failed'",tenant_id)
    return {"total":total,"implemented":implemented,"failed":failed,"score":round((implemented/(total or 1))*100,1)}

@router.get("/{ctrl_id}")
async def get_control(ctrl_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    row=await db.fetchrow("SELECT * FROM controls WHERE id=$1 AND tenant_id=$2",ctrl_id,tenant_id)
    if not row: raise HTTPException(404,"Not found")
    result=dict(row)
    result["tests"]=[dict(r) for r in await db.fetch("SELECT * FROM control_tests WHERE control_id=$1 ORDER BY tested_at DESC LIMIT 20",ctrl_id)]
    result["evidence"]=[dict(r) for r in await db.fetch("SELECT * FROM evidence_items WHERE $1=ANY(linked_control_ids) AND tenant_id=$2 ORDER BY collection_date DESC",ctrl_id,tenant_id)]
    return result

@router.post("")
async def create_control(req: Request, body: ControlCreate, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    row=await db.fetchrow("""
        INSERT INTO controls(tenant_id,name,control_id,category,description,owner,framework,linked_policy_ids,frequency,risk_level)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    """,tenant_id,body.name,body.control_id,body.category,body.description,body.owner,body.framework,body.linked_policy_ids,body.frequency,body.risk_level)
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id) VALUES($1,$2,'CONTROL_CREATED','control',$3)",tenant_id,user_id,row["id"])
    return dict(row)

@router.patch("/{ctrl_id}")
async def update_control(ctrl_id: str, req: Request, body: ControlUpdate, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    old=await db.fetchrow("SELECT * FROM controls WHERE id=$1 AND tenant_id=$2",ctrl_id,tenant_id)
    if not old: raise HTTPException(404,"Not found")
    updates={k:v for k,v in body.dict().items() if v is not None}
    if updates:
        sets=", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
        await db.execute(f"UPDATE controls SET {sets}, updated_at=NOW() WHERE id=$1",ctrl_id,*updates.values())
    if body.status and body.status!=old["status"]:
        await emit_control_status_changed(tenant_id,ctrl_id,old["status"],body.status,old["owner"] or user_id)
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,old_value,new_value) VALUES($1,$2,'CONTROL_UPDATED','control',$3,$4,$5)",tenant_id,user_id,ctrl_id,dict(old),updates)
    return await db.fetchrow("SELECT * FROM controls WHERE id=$1",ctrl_id)

@router.post("/{ctrl_id}/test")
async def add_test_result(ctrl_id: str, req: Request, body: TestResult, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    row=await db.fetchrow("INSERT INTO control_tests(control_id,tenant_id,result,tester,notes) VALUES($1,$2,$3,$4,$5) RETURNING *",ctrl_id,tenant_id,body.result,body.tester or user_id,body.notes)
    # Update effectiveness score based on recent tests
    recent=await db.fetch("SELECT result FROM control_tests WHERE control_id=$1 ORDER BY tested_at DESC LIMIT 10",ctrl_id)
    if recent:
        passed=sum(1 for r in recent if r["result"]=="pass")
        score=round((passed/len(recent))*100,1)
        await db.execute("UPDATE controls SET effectiveness_score=$1,updated_at=NOW() WHERE id=$2",score,ctrl_id)
    return dict(row)

@router.delete("/{ctrl_id}")
async def delete_control(ctrl_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    row=await db.fetchrow("SELECT id FROM controls WHERE id=$1 AND tenant_id=$2",ctrl_id,tenant_id)
    if not row: raise HTTPException(404,"Not found")
    await db.execute("DELETE FROM controls WHERE id=$1",ctrl_id)
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id) VALUES($1,$2,'CONTROL_DELETED','control',$3)",tenant_id,user_id,ctrl_id)
    return {"deleted":True}
