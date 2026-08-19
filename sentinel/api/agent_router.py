from sentinel.api.db import get_db, AsyncSessionLocal
from sentinel.api.event_helpers import emit
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt
import os
from sentinel.events.compliance_events import emit_agent_discovered

router = APIRouter()

def get_tenant(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try: p=jwt.decode(token,os.environ["JWT_SECRET"],algorithms=["HS256"]); return p.get("tenant_id") or "unknown"
    except: raise HTTPException(401,"Invalid token")
def get_user(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try: p=jwt.decode(token,os.environ["JWT_SECRET"],algorithms=["HS256"]); return p.get("sub") or "unknown"
    except: raise HTTPException(401,"Invalid token")

class AgentDiscover(BaseModel):
    name: str
    source: str="logs"
    agent_type: Optional[str]=None
    risk_level: str="medium"
    discovery_metadata: dict={}

class AgentConfirm(BaseModel):
    linked_model_id: Optional[str]=None
    owner: Optional[str]=None
    linked_policy_id: Optional[str]=None
    vendor_id: Optional[str]=None
    risk_level: Optional[str]=None

class AgentReject(BaseModel):
    reason: str

@router.get("")
async def list_agents(req: Request, status: Optional[str]=None, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    q="SELECT * FROM agents WHERE tenant_id=$1"
    params=[tenant_id]
    if status: q+=f" AND discovery_status=${len(params)+1}"; params.append(status)
    q+=" ORDER BY discovered_at DESC"
    rows=await db.fetch(q,*params)
    return [dict(r) for r in rows]

@router.get("/{agent_id}")
async def get_agent(agent_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    row=await db.fetchrow("SELECT * FROM agents WHERE id=$1 AND tenant_id=$2",agent_id,tenant_id)
    if not row: raise HTTPException(404,"Not found")
    result=dict(row)
    if row["linked_model_id"]:
        model=await db.fetchrow("SELECT id,name,status,compliance_status FROM model_inventory WHERE id=$1",row["linked_model_id"])
        result["linked_model"]=dict(model) if model else None
    return result

@router.post("/discover")
async def discover_agent(req: Request, body: AgentDiscover, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    row=await db.fetchrow("""
        INSERT INTO agents(tenant_id,name,source,agent_type,risk_level,discovery_metadata)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING *
    """,tenant_id,body.name,body.source,body.agent_type,body.risk_level,body.discovery_metadata)
    agent=dict(row)
    await emit_agent_discovered(tenant_id,agent["id"],body.source,body.agent_type or "unknown",body.risk_level)
    return agent

@router.post("/{agent_id}/confirm")
async def confirm_agent(agent_id: str, req: Request, body: AgentConfirm, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    from datetime import datetime,timezone
    updates={k:v for k,v in body.dict().items() if v is not None}
    updates["discovery_status"]="confirmed"
    updates["governance_status"]="active" if body.linked_policy_id else "no_policy"
    updates["confirmed_at"]=datetime.now(timezone.utc)
    sets=", ".join(f"{k}=${i+2}" for i,k in enumerate(updates))
    await db.execute(f"UPDATE agents SET {sets},updated_at=NOW() WHERE id=$1 AND tenant_id=${len(updates)+2}",agent_id,*updates.values(),tenant_id)
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id) VALUES($1,$2,'AGENT_CONFIRMED','agent',$3)",tenant_id,user_id,agent_id)
    # Flag if no policy
    if not body.linked_policy_id:
        await db.execute("""
            INSERT INTO hitl_items(tenant_id,entity_type,entity_id,trigger_reason,risk_level,status,sla_hours)
            VALUES($1,'agent',$2,'AGENT_NO_POLICY','medium','pending',120)
            ON CONFLICT DO NOTHING
        """,tenant_id,agent_id)
    return await db.fetchrow("SELECT * FROM agents WHERE id=$1",agent_id)

@router.post("/{agent_id}/reject")
async def reject_agent(agent_id: str, req: Request, body: AgentReject, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    user_id=get_user(req)
    await db.execute("UPDATE agents SET discovery_status='rejected',rejection_reason=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3",body.reason,agent_id,tenant_id)
    await db.execute("INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id) VALUES($1,$2,'AGENT_REJECTED','agent',$3)",tenant_id,user_id,agent_id)
    return {"rejected":True}

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    await db.execute("DELETE FROM agents WHERE id=$1 AND tenant_id=$2",agent_id,tenant_id)
    return {"deleted":True}
