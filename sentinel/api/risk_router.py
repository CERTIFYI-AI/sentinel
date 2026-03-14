
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

class RiskCreate(BaseModel):
    name: str
    action_owner: Optional[str] = None
    ai_lifecycle_phase: Optional[str] = None
    description: Optional[str] = None
    categories: List[str] = []
    potential_impact: Optional[str] = None
    likelihood: int = 1
    severity: int = 1
    applicable_use_cases: List[str] = []
    applicable_frameworks: List[str] = []
    mitigation_status: str = "not_started"
    mitigation_plan: Optional[str] = None
    implementation_strategy: Optional[str] = None
    residual_likelihood: int = 1
    residual_severity: int = 1
    approver: Optional[str] = None
    review_notes: Optional[str] = None
    source_incident_id: Optional[str] = None

class RiskUpdate(BaseModel):
    name: Optional[str] = None
    action_owner: Optional[str] = None
    ai_lifecycle_phase: Optional[str] = None
    description: Optional[str] = None
    categories: Optional[List[str]] = None
    potential_impact: Optional[str] = None
    likelihood: Optional[int] = None
    severity: Optional[int] = None
    applicable_use_cases: Optional[List[str]] = None
    mitigation_status: Optional[str] = None
    mitigation_plan: Optional[str] = None
    residual_likelihood: Optional[int] = None
    residual_severity: Optional[int] = None
    approver: Optional[str] = None
    approval_status: Optional[str] = None

def calc_risk_level(likelihood, severity):
    score = likelihood * severity
    if score <= 4: return "low"
    if score <= 9: return "medium"
    if score <= 16: return "high"
    return "critical"

@router.get("")
async def list_risks(req: Request, search: Optional[str] = None, risk_level: Optional[str] = None, page: int = 1, page_size: int = 20, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    where = ["tenant_id=$1", "(is_deleted IS NULL OR is_deleted=false)"]; params = [tenant_id]; i = 2
    if risk_level: where.append(f"risk_level=${i}"); params.append(risk_level); i += 1
    if search: where.append(f"(name ILIKE ${i} OR description ILIKE ${i})"); params.append(f"%{search}%"); i += 1
    w = " AND ".join(where)
    offset = (page-1)*page_size
    rows = await db.fetch(f"SELECT * FROM risk_entries WHERE {w} ORDER BY created_at DESC LIMIT {page_size} OFFSET {offset}", *params)
    total = await db.fetchval(f"SELECT COUNT(*) FROM risk_entries WHERE {w}", *params)
    return {"success": True, "data": [dict(r) for r in rows], "meta": {"total": total, "page": page}}

@router.get("/heatmap")
async def risk_heatmap(req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    rows = await db.fetch("SELECT likelihood, severity, array_agg(id::text) as risk_ids, COUNT(*) as count FROM risk_entries WHERE tenant_id=$1 AND (is_deleted IS NULL OR is_deleted=false) GROUP BY likelihood, severity", tenant_id)
    cells = []
    for r in rows:
        cells.append({"likelihood": r["likelihood"], "severity": r["severity"], "count": r["count"], "risk_ids": r["risk_ids"]})
    return {"success": True, "data": cells}

@router.get("/export")
async def export_risks(req: Request, db=Depends(get_db)):
    import io, csv
    tenant_id = get_tenant(req)
    rows = await db.fetch("SELECT * FROM risk_entries WHERE tenant_id=$1 AND (is_deleted IS NULL OR is_deleted=false) ORDER BY created_at DESC", tenant_id)
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(dict(rows[0]).keys()))
        writer.writeheader()
        for r in rows: writer.writerow(dict(r))
    from fastapi.responses import Response
    return Response(output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=risks.csv"})

@router.get("/{risk_id}")
async def get_risk(risk_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    row = await db.fetchrow("SELECT * FROM risk_entries WHERE id=$1 AND tenant_id=$2", risk_id, tenant_id)
    if not row: raise HTTPException(404, "Not found")
    return {"success": True, "data": dict(row)}

@router.post("")
async def create_risk(req: Request, body: RiskCreate, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    risk_id = str(uuid.uuid4()); now = datetime.now(timezone.utc)
    risk_level = calc_risk_level(body.likelihood, body.severity)
    residual_level = calc_risk_level(body.residual_likelihood, body.residual_severity)
    await db.execute("""INSERT INTO risk_entries (id,tenant_id,name,action_owner,ai_lifecycle_phase,description,categories,
        potential_impact,likelihood,severity,risk_level,applicable_use_cases,applicable_frameworks,
        mitigation_status,mitigation_plan,implementation_strategy,residual_likelihood,residual_severity,
        residual_risk_level,approver,review_notes,source_incident_id,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)""",
        risk_id, tenant_id, body.name, body.action_owner, body.ai_lifecycle_phase, body.description,
        body.categories, body.potential_impact, body.likelihood, body.severity, risk_level,
        body.applicable_use_cases, body.applicable_frameworks, body.mitigation_status, body.mitigation_plan,
        body.implementation_strategy, body.residual_likelihood, body.residual_severity, residual_level,
        body.approver, body.review_notes, body.source_incident_id, now, now)
    row = await db.fetchrow("SELECT * FROM risk_entries WHERE id=$1", risk_id)
    return {"success": True, "data": dict(row), "message": "Risk created"}

@router.patch("/{risk_id}")
async def update_risk(risk_id: str, req: Request, body: RiskUpdate, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    row = await db.fetchrow("SELECT * FROM risk_entries WHERE id=$1 AND tenant_id=$2", risk_id, tenant_id)
    if not row: raise HTTPException(404, "Not found")
    updates = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    if "likelihood" in updates or "severity" in updates:
        l = updates.get("likelihood", row["likelihood"]); s = updates.get("severity", row["severity"])
        updates["risk_level"] = calc_risk_level(l, s)
    if not updates: return {"success": True, "data": dict(row)}
    set_clauses = []; params = []
    for i, (k, v) in enumerate(updates.items(), 1):
        set_clauses.append(f"{k}=${i}"); params.append(v)
    params.extend([datetime.now(timezone.utc), risk_id, tenant_id])
    set_clauses.append(f"updated_at=${len(params)-1}")
    await db.execute(f"UPDATE risk_entries SET {", ".join(set_clauses)} WHERE id=${len(params)-1} AND tenant_id=${len(params)}", *params)
    updated = await db.fetchrow("SELECT * FROM risk_entries WHERE id=$1", risk_id)
    return {"success": True, "data": dict(updated)}

@router.delete("/{risk_id}")
async def delete_risk(risk_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    await db.execute("UPDATE risk_entries SET is_deleted=true WHERE id=$1 AND tenant_id=$2", risk_id, tenant_id)
    return {"success": True, "message": "Deleted"}

@router.get("/{risk_id}/activity")
async def get_risk_activity(risk_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    rows = await db.fetch("SELECT * FROM activity_log WHERE entity_id=$1 AND tenant_id=$2 ORDER BY timestamp DESC LIMIT 50", risk_id, tenant_id)
    return {"success": True, "data": [dict(r) for r in rows]}
