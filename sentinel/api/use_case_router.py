from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from sentinel.database import get_db
from sentinel.auth import get_current_user

router = APIRouter()

def get_tenant(req: Request) -> str:
    user = getattr(req.state, 'user', None)
    if user and isinstance(user, dict):
        return user.get('tenant_id', 'default')
    return 'default'

class UseCaseCreate(BaseModel):
    title: str
    owner: Optional[str] = None
    status: str = 'draft'
    approval_workflow: str = 'none'
    ai_risk_classification: str = 'minimal'
    high_risk_role: Optional[str] = None
    team_members: List[str] = []
    start_date: Optional[str] = None
    geography: List[str] = []
    applicable_regulations: List[str] = []
    goal: Optional[str] = None
    target_industry: Optional[str] = None
    description: Optional[str] = None
    ai_autofill_enabled: bool = False

class UseCaseUpdate(BaseModel):
    title: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = None
    approval_workflow: Optional[str] = None
    ai_risk_classification: Optional[str] = None
    high_risk_role: Optional[str] = None
    team_members: Optional[List[str]] = None
    start_date: Optional[str] = None
    geography: Optional[List[str]] = None
    applicable_regulations: Optional[List[str]] = None
    goal: Optional[str] = None
    target_industry: Optional[str] = None
    description: Optional[str] = None
    ai_autofill_enabled: Optional[bool] = None

@router.get("")
async def list_use_cases(
    req: Request,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db=Depends(get_db)
):
    tenant_id = get_tenant(req)
    where = ["tenant_id=$1", "(is_deleted IS NULL OR is_deleted=false)"]
    params = [tenant_id]
    i = 2
    if status:
        where.append(f"status=${i}"); params.append(status); i += 1
    if search:
        where.append(f"(title ILIKE ${i} OR description ILIKE ${i})"); params.append(f"%{search}%"); i += 1
    where_clause = " AND ".join(where)
    offset = (page - 1) * page_size
    rows = await db.fetch(f"SELECT * FROM use_cases WHERE {where_clause} ORDER BY created_at DESC LIMIT {page_size} OFFSET {offset}", *params)
    total = await db.fetchval(f"SELECT COUNT(*) FROM use_cases WHERE {where_clause}", *params)
    return {"success": True, "data": [dict(r) for r in rows], "meta": {"total": total, "page": page, "page_size": page_size}}

@router.get("/{uc_id}")
async def get_use_case(uc_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    row = await db.fetchrow("SELECT * FROM use_cases WHERE id=$1 AND tenant_id=$2", uc_id, tenant_id)
    if not row: raise HTTPException(404, "Not found")
    result = dict(row)
    result["risks"] = [dict(r) for r in await db.fetch("SELECT id,name,risk_level,mitigation_status FROM risk_entries WHERE $1=ANY(applicable_use_cases) AND tenant_id=$2", uc_id, tenant_id)]
    result["tasks"] = [dict(r) for r in await db.fetch("SELECT id,title,status,priority,due_date FROM tasks WHERE tenant_id=$1 AND (linked_items @> '[{\"entity_id\": \"' || $2 || '\"}]')::jsonb", tenant_id, uc_id)]
    return {"success": True, "data": result}

@router.post("")
async def create_use_case(req: Request, body: UseCaseCreate, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    import uuid
    uc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    await db.execute(
        """INSERT INTO use_cases (id,tenant_id,title,owner,status,approval_workflow,ai_risk_classification,
        high_risk_role,team_members,start_date,geography,applicable_regulations,goal,target_industry,description,
        ai_autofill_enabled,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)""",
        uc_id, tenant_id, body.title, body.owner, body.status, body.approval_workflow,
        body.ai_risk_classification, body.high_risk_role, body.team_members, body.start_date,
        body.geography, body.applicable_regulations, body.goal, body.target_industry,
        body.description, body.ai_autofill_enabled, now, now
    )
    row = await db.fetchrow("SELECT * FROM use_cases WHERE id=$1", uc_id)
    return {"success": True, "data": dict(row), "message": "Use case created"}

@router.patch("/{uc_id}")
async def update_use_case(uc_id: str, req: Request, body: UseCaseUpdate, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    row = await db.fetchrow("SELECT * FROM use_cases WHERE id=$1 AND tenant_id=$2", uc_id, tenant_id)
    if not row: raise HTTPException(404, "Not found")
    updates = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    if not updates: return {"success": True, "data": dict(row)}
    set_clauses = []
    params = []
    for i, (k, v) in enumerate(updates.items(), 1):
        set_clauses.append(f"{k}=${i}")
        params.append(v)
    params.extend([datetime.now(timezone.utc), uc_id, tenant_id])
    set_clauses.append(f"updated_at=${len(params)-1}")
    await db.execute(f"UPDATE use_cases SET {', '.join(set_clauses)} WHERE id=${len(params)-1} AND tenant_id=${len(params)}", *params)
    updated = await db.fetchrow("SELECT * FROM use_cases WHERE id=$1", uc_id)
    return {"success": True, "data": dict(updated), "message": "Updated"}

@router.delete("/{uc_id}")
async def delete_use_case(uc_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    await db.execute("UPDATE use_cases SET is_deleted=true WHERE id=$1 AND tenant_id=$2", uc_id, tenant_id)
    return {"success": True, "message": "Deleted"}

@router.post("/{uc_id}/submit-for-review")
async def submit_for_review(uc_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    await db.execute("UPDATE use_cases SET status='under_review', updated_at=$1 WHERE id=$2 AND tenant_id=$3", datetime.now(timezone.utc), uc_id, tenant_id)
    return {"success": True, "message": "Submitted for review"}

@router.post("/{uc_id}/approve")
async def approve_use_case(uc_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    await db.execute("UPDATE use_cases SET status='approved', updated_at=$1 WHERE id=$2 AND tenant_id=$3", datetime.now(timezone.utc), uc_id, tenant_id)
    return {"success": True, "message": "Approved"}

@router.post("/{uc_id}/reject")
async def reject_use_case(uc_id: str, req: Request, body: dict = {}, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    await db.execute("UPDATE use_cases SET status='draft', updated_at=$1 WHERE id=$2 AND tenant_id=$3", datetime.now(timezone.utc), uc_id, tenant_id)
    return {"success": True, "message": "Rejected, moved to draft"}

@router.get("/{uc_id}/tasks")
async def get_use_case_tasks(uc_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    rows = await db.fetch("SELECT * FROM tasks WHERE tenant_id=$1 AND linked_items::text LIKE $2", tenant_id, f"%{uc_id}%")
    return {"success": True, "data": [dict(r) for r in rows]}

@router.get("/{uc_id}/activity")
async def get_use_case_activity(uc_id: str, req: Request, db=Depends(get_db)):
    tenant_id = get_tenant(req)
    rows = await db.fetch("SELECT * FROM activity_log WHERE entity_id=$1 AND tenant_id=$2 ORDER BY timestamp DESC LIMIT 50", uc_id, tenant_id)
    return {"success": True, "data": [dict(r) for r in rows]}
