from sentinel.api.db import get_db, AsyncSessionLocal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from jose import jwt
import os
from sentinel.events.compliance_events import emit_model_registered, emit_hitl_decision

router = APIRouter()


def get_tenant(req: Request) -> str:
    token = req.headers.get("Authorization","").replace("Bearer ","")
    try:
        p = jwt.decode(token,os.environ["JWT_SECRET"],algorithms=["HS256"])
        return p.get("tenant_id") or p.get("org_id") or "unknown"
    except: raise HTTPException(401,"Invalid token")

def get_user(req: Request) -> str:
    token = req.headers.get("Authorization","").replace("Bearer ","")
    try:
        p = jwt.decode(token,os.environ["JWT_SECRET"],algorithms=["HS256"])
        return p.get("sub") or p.get("user_id") or "unknown"
    except: raise HTTPException(401,"Invalid token")

class ModelCreate(BaseModel):
    name: str
    version: str = "1.0.0"
    model_type: Optional[str] = None
    risk_level: str = "medium"
    owner: Optional[str] = None
    vendor_id: Optional[str] = None
    linked_dataset_ids: List[str] = []
    linked_policy_ids: List[str] = []
    notes: Optional[str] = None

class ModelUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    model_type: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    vendor_id: Optional[str] = None
    linked_dataset_ids: Optional[List[str]] = None
    linked_policy_ids: Optional[List[str]] = None
    notes: Optional[str] = None
    change_summary: Optional[str] = ""

@router.get("")
async def list_models(req: Request, status: Optional[str]=None, risk_level: Optional[str]=None,
                      page: int=1, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    q = "SELECT * FROM model_inventory WHERE tenant_id=$1"
    params = [tenant_id]
    if status: q += f" AND status=${len(params)+1}"; params.append(status)
    if risk_level: q += f" AND risk_level=${len(params)+1}"; params.append(risk_level)
    q += f" ORDER BY created_at DESC LIMIT 50 OFFSET ${len(params)+1}"
    params.append((page-1)*50)
    rows = await db.fetch(q, *params)
    return [dict(r) for r in rows]

@router.get("/stats")
async def model_stats(req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    total = await db.fetchval("SELECT COUNT(*) FROM model_inventory WHERE tenant_id=$1", tenant_id)
    compliant = await db.fetchval("SELECT COUNT(*) FROM model_inventory WHERE tenant_id=$1 AND compliance_status='compliant'", tenant_id)
    pending_hitl = await db.fetchval("SELECT COUNT(*) FROM hitl_items WHERE tenant_id=$1 AND entity_type='model' AND status='pending'", tenant_id)
    return {"total": total, "compliant": compliant, "pending_hitl": pending_hitl}

@router.get("/{model_id}")
async def get_model(model_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    row = await db.fetchrow("SELECT * FROM model_inventory WHERE id=$1 AND tenant_id=$2", model_id, tenant_id)
    if not row: raise HTTPException(404,"Not found")
    result = dict(row)
    result["versions"] = [dict(r) for r in await db.fetch("SELECT * FROM model_versions WHERE model_id=$1 ORDER BY created_at DESC LIMIT 20", model_id)]
    result["hitl_items"] = [dict(r) for r in await db.fetch("SELECT * FROM hitl_items WHERE entity_id=$1 AND tenant_id=$2 ORDER BY created_at DESC", model_id, tenant_id)]
    result["bias_audits"] = [dict(r) for r in await db.fetch("SELECT * FROM bias_audits WHERE model_id=$1 AND tenant_id=$2 ORDER BY created_at DESC LIMIT 10", model_id, tenant_id)]
    result["agents"] = [dict(r) for r in await db.fetch("SELECT * FROM agents WHERE linked_model_id=$1 AND tenant_id=$2", model_id, tenant_id)]
    return result

@router.get("/{model_id}/audit-log")
async def model_audit_log(model_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    rows = await db.fetch("SELECT * FROM compliance_audit_log WHERE entity_id=$1 AND tenant_id=$2 ORDER BY created_at DESC LIMIT 100", model_id, tenant_id)
    return [dict(r) for r in rows]

@router.post("")
async def create_model(req: Request, body: ModelCreate, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    user_id = get_user(req)
    row = await db.fetchrow("""
        INSERT INTO model_inventory(tenant_id,name,version,model_type,risk_level,owner,vendor_id,
            linked_dataset_ids,linked_policy_ids,notes)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    """, tenant_id, body.name, body.version, body.model_type, body.risk_level, body.owner,
         body.vendor_id, body.linked_dataset_ids, body.linked_policy_ids, body.notes)
    model = dict(row)
    await db.execute("""
        INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,new_value)
        VALUES($1,$2,'MODEL_CREATED','model',$3,$4)
    """, tenant_id, user_id, model["id"], {"name": body.name})
    # Fire event
    await emit_model_registered(tenant_id, model["id"], body.name, body.risk_level, body.owner or user_id)
    return model

@router.patch("/{model_id}")
async def update_model(model_id: str, req: Request, body: ModelUpdate, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    user_id = get_user(req)
    old = await db.fetchrow("SELECT * FROM model_inventory WHERE id=$1 AND tenant_id=$2", model_id, tenant_id)
    if not old: raise HTTPException(404,"Not found")
    updates = {k:v for k,v in body.dict(exclude={"change_summary"}).items() if v is not None}
    if updates:
        sets = ", ".join(f'"{k}"=${i+2}' for i,k in enumerate(updates))
        vals = list(updates.values())
        await db.execute(f"UPDATE model_inventory SET {sets}, updated_at=NOW() WHERE id=$1 AND tenant_id=${len(vals)+2}", model_id, *vals, tenant_id)
    await db.execute("""
        INSERT INTO model_versions(model_id,tenant_id,version,changed_by,change_summary,snapshot)
        VALUES($1,$2,$3,$4,$5,$6)
    """, model_id, tenant_id, body.version or old["version"], user_id, body.change_summary or "", dict(old))
    await db.execute("""
        INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id,old_value,new_value)
        VALUES($1,$2,'MODEL_UPDATED','model',$3,$4,$5)
    """, tenant_id, user_id, model_id, dict(old), updates)
    return await db.fetchrow("SELECT * FROM model_inventory WHERE id=$1", model_id)

@router.delete("/{model_id}")
async def delete_model(model_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    user_id = get_user(req)
    row = await db.fetchrow("SELECT name FROM model_inventory WHERE id=$1 AND tenant_id=$2", model_id, tenant_id)
    if not row: raise HTTPException(404,"Not found")
    await db.execute("DELETE FROM model_inventory WHERE id=$1 AND tenant_id=$2", model_id, tenant_id)
    await db.execute("""
        INSERT INTO compliance_audit_log(tenant_id,actor,action,entity_type,entity_id)
        VALUES($1,$2,'MODEL_DELETED','model',$3)
    """, tenant_id, user_id, model_id)
    return {"deleted": True, "id": model_id}


class MetricIngest(BaseModel):
    model_id: str
    model_name: Optional[str] = None
    latency_p50: Optional[float] = None
    latency_p99: Optional[float] = None
    throughput: Optional[float] = None
    accuracy: Optional[float] = None
    error_rate: Optional[float] = None
    drift_score: Optional[float] = None
    cost_per_inference: Optional[float] = None
    request_count: Optional[int] = None


@router.post("/metrics")
async def ingest_metric(req: Request, body: MetricIngest, db=Depends(get_db)):
    """Ingest a performance-telemetry rollup for a model.

    Feeds the Model Detail "Performance" tab. Callers (the proxy, a batch
    rollup job, or an external collector) POST one row per interval keyed by
    the registry model id so the dashboard can attribute it to the model.
    org_id is taken from the caller's tenant.
    """
    tenant_id = get_tenant(req)
    await db.execute(
        """
        INSERT INTO model_performance_metrics
            (org_id, model_id, model_name, recorded_at, latency_p50, latency_p99,
             throughput, accuracy, error_rate, drift_score, cost_per_inference, request_count)
        VALUES ($1::uuid, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11)
        """,
        tenant_id, body.model_id, body.model_name,
        body.latency_p50, body.latency_p99, body.throughput, body.accuracy,
        body.error_rate, body.drift_score, body.cost_per_inference, body.request_count,
    )
    return {"ok": True, "model_id": body.model_id}
