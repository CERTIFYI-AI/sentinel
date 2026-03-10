"""Task Store - in-memory task storage for cross-module task management.

Production upgrade: replace with PostgreSQL-backed store.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class Task:
    id: str
    tenant_id: str
    title: str
    description: str
    status: str  # OPEN | INPROGRESS | REMEDIATED | VERIFIED | WONTFIX
    priority: str  # CRITICAL | HIGH | MEDIUM | LOW
    source_module: str  # proxy | evals | security
    source_type: str  # vulnerability | compliancegap | evalfailure | manual
    source_id: str
    model_id: str | None = None
    framework_ref: str | None = None
    assignee_id: str | None = None
    due_date: str | None = None
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class TaskStore:
    """In-memory task store. Singleton pattern via class-level storage."""

    _tasks: dict[str, list[Task]] = {}  # tenant_id -> tasks

    async def create(
        self,
        *,
        tenant_id: str,
        title: str,
        description: str,
        status: str = "OPEN",
        priority: str = "MEDIUM",
        source_module: str = "proxy",
        source_type: str = "manual",
        source_id: str = "",
        model_id: str | None = None,
        framework_ref: str | None = None,
    ) -> Task:
        task = Task(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            title=title,
            description=description,
            status=status,
            priority=priority,
            source_module=source_module,
            source_type=source_type,
            source_id=source_id,
            model_id=model_id,
            framework_ref=framework_ref,
        )
        if tenant_id not in self._tasks:
            self._tasks[tenant_id] = []
        self._tasks[tenant_id].append(task)
        logger.info("Task created: %s for tenant %s", task.id, tenant_id)
        return task

    async def find_by_source(
        self,
        *,
        tenant_id: str,
        source_type: str,
        source_id: str,
    ) -> list[Task]:
        return [
            t
            for t in self._tasks.get(tenant_id, [])
            if t.source_type == source_type
            and t.source_id == source_id
            and t.status in ("OPEN", "INPROGRESS")
        ]

    async def get_all(
        self, tenant_id: str, filters: dict[str, Any] | None = None
    ) -> list[Task]:
        tasks = self._tasks.get(tenant_id, [])
        if not filters:
            return tasks
        result = tasks
        if "status" in filters:
            result = [t for t in result if t.status == filters["status"]]
        if "priority" in filters:
            result = [t for t in result if t.priority == filters["priority"]]
        if "source_module" in filters:
            result = [t for t in result if t.source_module == filters["source_module"]]
        return result

    async def update(
        self, tenant_id: str, task_id: str, patch: dict[str, Any]
    ) -> Task | None:
        for task in self._tasks.get(tenant_id, []):
            if task.id == task_id:
                for key, value in patch.items():
                    if hasattr(task, key):
                        setattr(task, key, value)
                task.updated_at = datetime.now(timezone.utc).isoformat()
                return task
        return None
