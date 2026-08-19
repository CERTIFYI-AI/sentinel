from sentinel.api.db import get_db, AsyncSessionLocal
from sentinel.api.event_helpers import emit
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt
import os, random
from sentinel.events.compliance_events import emit_bias_audit_complete

router = APIRouter()

def get_tenant(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try: p=jwt.decode(token,os.environ["JWT_SECRET"],algorithms=["HS256"]); return p.get("tenant_id") or "unknown"
    except: raise HTTPException(401,"Invalid token")
def get_user(req):
    token=req.headers.get("Authorization","").replace("Bearer ","")
    try: p=jwt.decode(token,os.environ["JWT_SECRET"],algorithms=["HS256"]); return p.get("sub") or "unknown"
    except: raise HTTPException(401,"Invalid token")

class AuditCreate(BaseModel):
    model_id: str
    model_name: Optional[str]=None
    dataset_id: Optional[str]=None
    dataset_name: Optional[str]=None
    framework: str="eu_ai_act"
    threshold: float=0.1

@router.get("")
async def list_audits(req: Request, model_id: Optional[str]=None, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    q="SELECT * FROM bias_audits WHERE tenant_id=$1"
    params=[tenant_id]
    if model_id: q+=f" AND model_id=${len(params)+1}"; params.append(model_id)
    q+=" ORDER BY created_at DESC"
    rows=await db.fetch(q,*params)
    return [dict(r) for r in rows]

@router.get("/{audit_id}")
async def get_audit(audit_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    row=await db.fetchrow("SELECT * FROM bias_audits WHERE id=$1 AND tenant_id=$2",audit_id,tenant_id)
    if not row: raise HTTPException(404,"Not found")
    return dict(row)

@router.post("")
async def create_audit(req: Request, body: AuditCreate, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    model_name=body.model_name
    if not model_name:
        m=await db.fetchrow("SELECT name FROM model_inventory WHERE id=$1",body.model_id)
        model_name=m["name"] if m else "Unknown"
    row=await db.fetchrow("""
        INSERT INTO bias_audits(tenant_id,model_id,model_name,dataset_id,dataset_name,framework,threshold,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,'draft') RETURNING *
    """,tenant_id,body.model_id,model_name,body.dataset_id,body.dataset_name,body.framework,body.threshold)
    return dict(row)

@router.post("/{audit_id}/run")
async def run_audit(audit_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    audit=await db.fetchrow("SELECT * FROM bias_audits WHERE id=$1 AND tenant_id=$2",audit_id,tenant_id)
    if not audit: raise HTTPException(404,"Not found")
    await db.execute("UPDATE bias_audits SET status='running',updated_at=NOW() WHERE id=$1",audit_id)
    # Simulate bias score computation
    from datetime import datetime,timezone
    bias_score=round(random.uniform(0.02,0.18),3)
    threshold=float(audit["threshold"] or 0.1)
    passed=bias_score<=threshold
    results={
        "overall_score":bias_score,
        "categories":{
            "gender":{"score":round(random.uniform(0.01,0.15),3),"pass":random.random()>0.3},
            "age":{"score":round(random.uniform(0.01,0.12),3),"pass":random.random()>0.3},
            "ethnicity":{"score":round(random.uniform(0.02,0.20),3),"pass":random.random()>0.3}
        },
        "metrics":{"disparate_impact":round(random.uniform(0.7,1.3),3),"statistical_parity":round(random.uniform(-0.1,0.1),3)}
    }
    recs=[]
    if not passed:
        recs=["Retrain model with balanced dataset","Apply fairness constraints during training","Review feature engineering for proxy variables"]
    await db.execute("""
        UPDATE bias_audits SET status='complete',bias_score=$1,passed=$2,results=$3,
            recommendations=$4,completed_at=$5,updated_at=NOW() WHERE id=$6
    """,bias_score,passed,results,recs,datetime.now(timezone.utc),audit_id)
    await emit_bias_audit_complete(tenant_id,audit_id,audit["model_id"],bias_score,threshold,passed)
    return await db.fetchrow("SELECT * FROM bias_audits WHERE id=$1",audit_id)

@router.delete("/{audit_id}")
async def delete_audit(audit_id: str, req: Request, db=Depends(get_db)):
    tenant_id=get_tenant(req)
    await db.execute("DELETE FROM bias_audits WHERE id=$1 AND tenant_id=$2",audit_id,tenant_id)
    return {"deleted":True}
