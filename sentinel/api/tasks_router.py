"""Tasks API Router — CRUD endpoints for cross-module task management.

Endpoints:
  GET    /tasks
  POST   /tasks
  GET    /tasks/{id}
  PATCH  /tasks/{id}
  POST   /tasks/bulk-update
"""
from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from sentinel.tasks.task_store import TaskStore

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tasks"])

_task_store = TaskStore()


def _get_tenant_id() -> str:
    """Placeholder: extract from JWT in production."""
    return "default-tenant"


class CreateTaskRequest(BaseModel):
    title: str
    description: str
    status: str = "OPEN"
    priority: str = "MEDIUM"
    source_module: str = "manual"
    source_type: str = "manual"
    source_id: str = ""
    model_id: str | None = None
    framework_ref: str | None = None
    assignee_id: str | None = None
    due_date: str | None = None


class UpdateTaskRequest(BaseModel):
    status: str | None = None
    priority: str | None = None
    assignee_id: str | None = None
    due_date: str | None = None
    title: str | None = None
    description: str | None = None


class BulkUpdateRequest(BaseModel):
    task_ids: list[str]
    patch: dict[str, Any]


@router.get("")
async def list_tasks(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    source_module: str | None = Query(None),
):
    tenant_id = _get_tenant_id()
    filters: dict[str, Any] = {}
    if status:
        filters["status"] = status
    if priority:
        filters["priority"] = priority
    if source_module:
        filters["source_module"] = source_module
    tasks = await _task_store.get_all(tenant_id, filters=filters if filters else None)
    return {"tasks": [asdict(t) for t in tasks], "total": len(tasks)}


@router.post("", status_code=201)
async def create_task(req: CreateTaskRequest):
    tenant_id = _get_tenant_id()
    task = await _task_store.create(
        tenant_id=tenant_id,
        title=req.title,
        description=req.description,
        status=req.status,
        priority=req.priority,
        source_module=req.source_module,
        source_type=req.source_type,
        source_id=req.source_id,
        model_id=req.model_id,
        framework_ref=req.framework_ref,
    )
    return asdict(task)


@router.get("/{task_id}")
async def get_task(task_id: str):
    tenant_id = _get_tenant_id()
    tasks = await _task_store.get_all(tenant_id)
    for t in tasks:
        if t.id == task_id:
            return asdict(t)
    raise HTTPException(status_code=404, detail="Task not found")


@router.patch("/{task_id}")
async def update_task(task_id: str, req: UpdateTaskRequest):
    tenant_id = _get_tenant_id()
    patch = {k: v for k, v in req.model_dump().items() if v is not None}
    task = await _task_store.update(tenant_id, task_id, patch)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return asdict(task)


@router.post("/bulk-update")
async def bulk_update(req: BulkUpdateRequest):
    tenant_id = _get_tenant_id()
    updated = []
    for task_id in req.task_ids:
        task = await _task_store.update(tenant_id, task_id, req.patch)
        if task:
            updated.append(asdict(task))
    return {"updated": len(updated), "tasks": updated}
