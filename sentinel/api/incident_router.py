from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from sentinel.database import get_db

router = APIRouter()

def get_tenant(req):
    user = getattr(req.state, "user", None)
    return (user or {}).get("tenant_id", "default") if isinstance(user, dict) else "default"

class IncidentCreate(BaseModel):
    ai_use_case: Optional[str] = None
    framework_id: Optional[str] = None
    incident_type: str = "model_failure"
    severity: str = "medium"
    status: str = "open"
    occurred_date: Optional[str] = None
    detected_date: Optional[str] = None
    reporter: Optional[str] = None
    model_system_version: Optional[str] = None
    categories_of_harm: List[str] = []
    affected_persons: Optional[str] = None
    description: Optional[str] = None
    relationship_causality: Optional[str] = None
    immediate_mitigations: Optional[str] = None
    planned_corrective_actions: Optional[str] = None

class IncidentUpdate(BaseModel):
    severity: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    immediate_mitigations: Optional[str] = None
    planned_corrective_actions: Optional[str] = None
    approval_status: Optional[str] = None
    approved_by: Optional[str] = None
    has_interim_report: Optional[bool] = None
    interim_report_content: Optional[str] = None

@router.get("")
async def list_incidents(req: Request, severity: Optional[str] = None, status: Optional[str] = None, page: int = 1, page_size: int = 20, db=Depends(get_db)):
    tid = get_tenant(req)
    w = ["tenant_id=$1", "(is_deleted IS NULL OR is_deleted=false)"]; p = [tid]; i = 2
    if severity: w.append(f"severity=${i}"); p.append(severity); i += 1
    if status: w.append(f"status=${i}"); p.append(status); i += 1
    wc = " AND ".join(w); off = (page-1)*page_size
    rows = await db.fetch(f"SELECT * FROM incidents WHERE {wc} ORDER BY created_at DESC LIMIT {page_size} OFFSET {off}", *p)
    total = await db.fetchval(f"SELECT COUNT(*) FROM incidents WHERE {wc}", *p)
    return {"success": True, "data": [dict(r) for r in rows], "meta": {"total": total, "page": page}}

@router.get("/{inc_id}")
async def get_incident(inc_id: str, req: Request, db=Depends(get_db)):
    tid = get_tenant(req)
    row = await db.fetchrow("SELECT * FROM incidents WHERE id=$1 AND tenant_id=$2", inc_id, tid)
    if not row: raise HTTPException(404, "Not found")
    result = dict(row)
    result["linked_risk"] = None
    if row.get("linked_risk_id"):
        r = await db.fetchrow("SELECT * FROM risk_entries WHERE id=$1", row["linked_risk_id"])
        if r: result["linked_risk"] = dict(r)
    return {"success": True, "data": result}

@router.post("")
async def create_incident(req: Request, body: IncidentCreate, db=Depends(get_db)):
    tid = get_tenant(req); iid = str(uuid.uuid4()); now = datetime.now(timezone.utc)
    await db.execute("""INSERT INTO incidents (id,tenant_id,ai_use_case,framework_id,incident_type,severity,status,
        occurred_date,detected_date,reporter,model_system_version,categories_of_harm,affected_persons,
        description,relationship_causality,immediate_mitigations,planned_corrective_actions,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)""",
        iid, tid, body.ai_use_case, body.framework_id, body.incident_type, body.severity, body.status,
        body.occurred_date, body.detected_date, body.reporter, body.model_system_version,
        body.categories_of_harm, body.affected_persons, body.description, body.relationship_causality,
        body.immediate_mitigations, body.planned_corrective_actions, now, now)
    row = await db.fetchrow("SELECT * FROM incidents WHERE id=$1", iid)
    return {"success": True, "data": dict(row), "message": "Incident created"}

@router.patch("/{inc_id}")
async def update_incident(inc_id: str, req: Request, body: IncidentUpdate, db=Depends(get_db)):
    tid = get_tenant(req)
    row = await db.fetchrow("SELECT * FROM incidents WHERE id=$1 AND tenant_id=$2", inc_id, tid)
    if not row: raise HTTPException(404, "Not found")
    updates = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    if not updates: return {"success": True, "data": dict(row)}
    sc = []; pp = []
    for i, (k, v) in enumerate(updates.items(), 1): sc.append(f"{k}=${i}"); pp.append(v)
    pp.extend([datetime.now(timezone.utc), inc_id, tid])
    n = len(pp)
    await db.execute(f"UPDATE incidents SET {', '.join(sc)}, updated_at=${n-2} WHERE id=${n-1} AND tenant_id=${n}", *pp)
    updated = await db.fetchrow("SELECT * FROM incidents WHERE id=$1", inc_id)
    return {"success": True, "data": dict(updated)}

@router.delete("/{inc_id}")
async def delete_incident(inc_id: str, req: Request, db=Depends(get_db)):
    tid = get_tenant(req)
    await db.execute("UPDATE incidents SET is_deleted=true WHERE id=$1 AND tenant_id=$2", inc_id, tid)
    return {"success": True, "message": "Deleted"}

@router.get("/{inc_id}/activity")
async def get_incident_activity(inc_id: str, req: Request, db=Depends(get_db)):
    tid = get_tenant(req)
    rows = await db.fetch("SELECT * FROM activity_log WHERE entity_id=$1 AND tenant_id=$2 ORDER BY timestamp DESC LIMIT 50", inc_id, tid)
    return {"success": True, "data": [dict(r) for r in rows]}
