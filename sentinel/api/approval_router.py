"""
sentinel/api/approval_router.py
Certifyi Sentinel - Model Approval Flow API
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from sentinel.models.approval_engine import ApprovalEngine, STAGE_ROLES, ROLE_LABELS

router = APIRouter(tags=["approvals"])
_engine = ApprovalEngine()


class ApprovalRequestBody(BaseModel):
    model_id: str
    model_name: str
    from_stage: str
    to_stage: str
    notes: Optional[str] = None
    ai_engineer_id: str = Field(..., description="User ID for Stage 1 reviewer")
    developer_id: str = Field(..., description="User ID for Stage 2 reviewer")
    compliance_id: str = Field(..., description="User ID for Stage 3 reviewer")
    gov_board_id: str = Field(..., description="User ID for Stage 4 reviewer")


class ChecklistUpdateBody(BaseModel):
    item_id: str
    checked: bool


class DecisionBody(BaseModel):
    note: str = Field(..., min_length=5)


class ReassignBody(BaseModel):
    new_assignee_id: str
    reason: str = Field(..., min_length=5)


class WithdrawBody(BaseModel):
    reason: str = Field(..., min_length=5)


async def _get_db():
    from sentinel.proxy import db_pool
    async with db_pool.acquire() as conn:
        yield conn


async def _get_tenant(request=None) -> dict:
    from sentinel.api.auth_router import get_current_tenant
    return await get_current_tenant(request)


@router.post("/request", status_code=201)
async def request_approval(
    body: ApprovalRequestBody,
    tenant: dict = Depends(_get_tenant),
    db=Depends(_get_db),
) -> dict:
    try:
        return await _engine.request_approval(
            tenant_id=tenant["tenant_id"],
            model_id=body.model_id,
            model_name=body.model_name,
            from_stage=body.from_stage.upper(),
            to_stage=body.to_stage.upper(),
            requested_by=tenant["user_id"],
            notes=body.notes,
            assignees={
                "AI_ENGINEER": body.ai_engineer_id,
                "DEVELOPER": body.developer_id,
                "COMPLIANCE": body.compliance_id,
                "AI_GOV_BOARD": body.gov_board_id,
            },
            db=db,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("")
async def list_approvals(
    status: Optional[str] = Query(None),
    model_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    tenant: dict = Depends(_get_tenant),
    db=Depends(_get_db),
) -> dict:
    tid = tenant["tenant_id"]
    conditions = ["tenant_id = $1"]
    params: list = [tid]
    i = 2
    if status:
        conditions.append(f"status = ${i}")
        params.append(status.upper())
        i += 1
    if model_id:
        conditions.append(f"model_id = ${i}")
        params.append(model_id)
        i += 1
    where = " AND ".join(conditions)
    offset = (page - 1) * limit
    rows = await db.fetch(
        f"SELECT * FROM v_approval_summary WHERE {where} "
        f"ORDER BY requested_at DESC LIMIT ${i} OFFSET ${i+1}",
        *params, limit, offset,
    )
    total = await db.fetchrow(
        f"SELECT COUNT(*) AS cnt FROM model_approvals WHERE {where}", *params
    )
    return {
        "items": [_row_to_dict(r) for r in rows],
        "total": int(total["cnt"]) if total else 0,
        "page": page,
        "limit": limit,
    }


@router.get("/mine")
async def get_my_pending_reviews(
    tenant: dict = Depends(_get_tenant),
    db=Depends(_get_db),
) -> dict:
    rows = await db.fetch(
        "SELECT * FROM v_my_pending_reviews WHERE assigned_to = $1 AND tenant_id = $2",
        tenant["user_id"], tenant["tenant_id"],
    )
    items = []
    for r in rows:
        d = dict(r)
        for k, v in d.items():
            if hasattr(v, "isoformat"):
                d[k] = v.isoformat()
        d["role_label"] = ROLE_LABELS.get(d.get("role", ""), d.get("role", ""))
        items.append(d)
    return {"items": items, "total": len(items)}


@router.get("/summary")
async def get_approval_summary(
    tenant: dict = Depends(_get_tenant),
    db=Depends(_get_db),
) -> dict:
    tid = tenant["tenant_id"]
    uid = tenant["user_id"]
    summary = await db.fetchrow(
        "SELECT "
        "COUNT(*) FILTER (WHERE status = 'PENDING') AS pending, "
        "COUNT(*) FILTER (WHERE status = 'IN_REVIEW') AS in_review, "
        "COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved, "
        "COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected, "
        "COUNT(*) FILTER (WHERE status = 'WITHDRAWN') AS withdrawn, "
        "COUNT(*) FILTER (WHERE status NOT IN ('APPROVED','REJECTED','WITHDRAWN')) AS open_total "
        "FROM model_approvals WHERE tenant_id = $1",
        tid,
    )
    mine = await db.fetchrow(
        "SELECT COUNT(*) AS cnt FROM v_my_pending_reviews "
        "WHERE assigned_to = $1 AND tenant_id = $2",
        uid, tid,
    )
    return {**dict(summary), "awaiting_my_review": int(mine["cnt"]) if mine else 0}


@router.get("/checklist-items")
async def get_checklist_items(
    transition_type: str = Query(...),
    role: Optional[str] = Query(None),
    tenant: dict = Depends(_get_tenant),
    db=Depends(_get_db),
) -> dict:
    tid = tenant["tenant_id"]
    conditions = ["(tenant_id = 'system' OR tenant_id = $1)", "transition_type = $2"]
    params: list = [tid, transition_type]
    if role:
        conditions.append("role = $3")
        params.append(role.upper())
    rows = await db.fetch(
        f"SELECT * FROM approval_checklist_items WHERE {' AND '.join(conditions)} "
        f"ORDER BY role, sort_order",
        *params,
    )
    by_role: dict[str, list] = {}
    for r in rows:
        d = dict(r)
        d["role_label"] = ROLE_LABELS.get(d["role"], d["role"])
        by_role.setdefault(d["role"], []).append(d)
    return {"transition_type": transition_type, "by_role": by_role, "total": len(rows)}


@router.get("/{approval_id}")
async def get_approval_detail(
  approval_id: str,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  tid = tenant["tenant_id"]
  row = await db.fetchrow(
    "SELECT * FROM model_approvals WHERE id = $1 AND tenant_id = $2",
    approval_id, tid,
  )
  if not row:
    raise HTTPException(404, "Approval not found")
  approval = _row_to_dict(row)
  stages = await db.fetch(
    "SELECT * FROM approval_stage_reviews "
    "WHERE approval_id = $1 AND tenant_id = $2 ORDER BY stage_index",
    approval_id, tid,
  )
  approval["stages"] = []
  for s in stages:
    d = _row_to_dict(s)
    d["role_label"] = ROLE_LABELS.get(d.get("role", ""), d.get("role", ""))
    approval["stages"].append(d)
  comments = await db.fetch(
    "SELECT * FROM approval_comments "
    "WHERE approval_id = $1 AND tenant_id = $2 ORDER BY created_at",
    approval_id, tid,
  )
  approval["comments"] = [_row_to_dict(c) for c in comments]
  return approval


@router.get("/{approval_id}/stages")
async def get_approval_stages(
  approval_id: str,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  tid = tenant["tenant_id"]
  rows = await db.fetch(
    "SELECT * FROM approval_stage_reviews "
    "WHERE approval_id = $1 AND tenant_id = $2 ORDER BY stage_index",
    approval_id, tid,
  )
  items = []
  for r in rows:
    d = _row_to_dict(r)
    d["role_label"] = ROLE_LABELS.get(d.get("role", ""), d.get("role", ""))
    items.append(d)
  return {"approval_id": approval_id, "stages": items}


@router.put("/{approval_id}/stages/{stage_index}/checklist")
async def update_checklist(
  approval_id: str,
  stage_index: int,
  body: ChecklistUpdateBody,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  try:
    state = await _engine.update_checklist(
      approval_id=approval_id,
      stage_index=stage_index,
      item_id=body.item_id,
      checked=body.checked,
      actor_id=tenant["user_id"],
      tenant_id=tenant["tenant_id"],
      db=db,
    )
    return {"checklist_state": state}
  except (ValueError, PermissionError) as e:
    raise HTTPException(400, str(e))


@router.post("/{approval_id}/stages/{stage_index}/approve")
async def approve_stage(
  approval_id: str,
  stage_index: int,
  body: DecisionBody,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  try:
    return await _engine.approve_stage(
      approval_id=approval_id,
      stage_index=stage_index,
      note=body.note,
      actor_id=tenant["user_id"],
      tenant_id=tenant["tenant_id"],
      db=db,
    )
  except ValueError as e:
    raise HTTPException(400, str(e))
  except PermissionError as e:
    raise HTTPException(403, str(e))


@router.post("/{approval_id}/stages/{stage_index}/reject")
async def reject_stage(
  approval_id: str,
  stage_index: int,
  body: DecisionBody,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  try:
    return await _engine.reject_stage(
      approval_id=approval_id,
      stage_index=stage_index,
      reason=body.note,
      actor_id=tenant["user_id"],
      tenant_id=tenant["tenant_id"],
      db=db,
    )
  except ValueError as e:
    raise HTTPException(400, str(e))
  except PermissionError as e:
    raise HTTPException(403, str(e))


@router.post("/{approval_id}/stages/{stage_index}/request-changes")
async def request_changes(
  approval_id: str,
  stage_index: int,
  body: DecisionBody,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  try:
    return await _engine.request_changes(
      approval_id=approval_id,
      stage_index=stage_index,
      note=body.note,
      actor_id=tenant["user_id"],
      tenant_id=tenant["tenant_id"],
      db=db,
    )
  except ValueError as e:
    raise HTTPException(400, str(e))
  except PermissionError as e:
    raise HTTPException(403, str(e))


@router.post("/{approval_id}/stages/{stage_index}/reassign")
async def reassign_stage(
  approval_id: str,
  stage_index: int,
  body: ReassignBody,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  try:
    await _engine.reassign_stage(
      approval_id=approval_id,
      stage_index=stage_index,
      new_assignee_id=body.new_assignee_id,
      reason=body.reason,
      actor_id=tenant["user_id"],
      tenant_id=tenant["tenant_id"],
      db=db,
    )
    return {"status": "reassigned"}
  except ValueError as e:
    raise HTTPException(400, str(e))


@router.post("/{approval_id}/withdraw")
async def withdraw_approval(
  approval_id: str,
  body: WithdrawBody,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  try:
    return await _engine.withdraw(
      approval_id=approval_id,
      reason=body.reason,
      actor_id=tenant["user_id"],
      tenant_id=tenant["tenant_id"],
      db=db,
    )
  except ValueError as e:
    raise HTTPException(400, str(e))


@router.get("/{approval_id}/comments")
async def get_comments(
  approval_id: str,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  tid = tenant["tenant_id"]
  rows = await db.fetch(
    "SELECT * FROM approval_comments "
    "WHERE approval_id = $1 AND tenant_id = $2 ORDER BY created_at",
    approval_id, tid,
  )
  return {"approval_id": approval_id, "comments": [_row_to_dict(r) for r in rows]}


@router.post("/{approval_id}/comments")
async def add_comment(
  approval_id: str,
  body: DecisionBody,
  tenant: dict = Depends(_get_tenant),
  db=Depends(_get_db),
) -> dict:
  tid = tenant["tenant_id"]
  uid = tenant["user_id"]
  # Verify approval exists
  exists = await db.fetchrow(
    "SELECT id FROM model_approvals WHERE id = $1 AND tenant_id = $2",
    approval_id, tid,
  )
  if not exists:
    raise HTTPException(404, "Approval not found")
  await db.execute(
    "INSERT INTO approval_comments (tenant_id, approval_id, author_id, body) "
    "VALUES ($1, $2, $3, $4)",
    tid, approval_id, uid, body.note,
  )
  return {"status": "comment_added"}

