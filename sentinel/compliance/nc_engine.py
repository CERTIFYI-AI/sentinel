"""
Certifyi Sentinel — Non-Conformance (NC) Engine

NC lifecycle:
  OPEN -> ASSIGNED -> IN_PROGRESS -> PENDING_VERIFICATION -> CLOSED
                                                           -> REJECTED -> IN_PROGRESS

NC auto-creation thresholds (consecutive FAIL evaluations within 24 hours):
  CRITICAL control -> 1  consecutive failure  (raised immediately)
  HIGH control     -> 3  consecutive failures
  MEDIUM control   -> 10 consecutive failures
  LOW control      -> never auto-created (use tasks)
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional

from sentinel.compliance.evaluator import ControlEvalResult, ControlStatus
from sentinel.compliance.control_registry import CONTROLS_BY_ID, ControlSeverity


class NCStatus(str, Enum):
    OPEN                 = "OPEN"
    ASSIGNED             = "ASSIGNED"
    IN_PROGRESS          = "IN_PROGRESS"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    CLOSED               = "CLOSED"
    REJECTED             = "REJECTED"


NC_TRANSITIONS: dict[NCStatus, set[NCStatus]] = {
    NCStatus.OPEN:                 {NCStatus.ASSIGNED},
    NCStatus.ASSIGNED:             {NCStatus.IN_PROGRESS},
    NCStatus.IN_PROGRESS:          {NCStatus.PENDING_VERIFICATION},
    NCStatus.PENDING_VERIFICATION: {NCStatus.CLOSED, NCStatus.REJECTED},
    NCStatus.REJECTED:             {NCStatus.IN_PROGRESS},
    NCStatus.CLOSED:               set(),
}


class NCRecommendationType(str, Enum):
    IMMEDIATE_ACTION  = "IMMEDIATE_ACTION"
    CORRECTIVE_ACTION = "CORRECTIVE_ACTION"
    PREVENTIVE_ACTION = "PREVENTIVE_ACTION"
    OBSERVATION       = "OBSERVATION"


@dataclass
class NonConformance:
    id:                   str
    tenant_id:            str
    control_id:           str
    framework_id:         str
    severity:             str
    status:               NCStatus
    title:                str
    description:          str
    recommendation_type:  NCRecommendationType
    recommendation:       str
    signal_name:          Optional[str]
    signal_value:         Optional[float]
    threshold:            Optional[float]
    delta:                Optional[float]
    consecutive_failures: int
    first_detected_at:    str
    last_detected_at:     str
    due_date:             Optional[str] = None
    assigned_to:          Optional[str] = None
    response:             Optional[str] = None
    verification_note:    Optional[str] = None
    closed_at:            Optional[str] = None
    task_id:              Optional[str] = None


NC_THRESHOLDS: dict[str, int] = {
    "CRITICAL": 1,
    "HIGH":     3,
    "MEDIUM":  10,
}

NC_DUE_DAYS: dict[str, int] = {
    "CRITICAL": 7,
    "HIGH":     30,
    "MEDIUM":   90,
}


class NCEngine:
    """Manages the full NC lifecycle from creation through closure."""

    async def process_eval_results(
        self,
        results: list[ControlEvalResult],
        tenant_id: str,
        db: Any,
    ) -> list[NonConformance]:
        new_ncs: list[NonConformance] = []
        for result in results:
            if result.status != ControlStatus.FAIL:
                continue
            control = CONTROLS_BY_ID.get(result.control_id)
            if not control:
                continue
            threshold = NC_THRESHOLDS.get(control.severity.value)
            if threshold is None:
                continue
            await self._record_failure(tenant_id, result, db)
            consecutive = await self._count_recent_failures(tenant_id, result.control_id, db)
            if consecutive < threshold:
                continue
            existing_nc_id = await self._get_open_nc_id(tenant_id, result.control_id, db)
            if existing_nc_id:
                await db.execute(
                    "UPDATE compliance_ncs SET last_detected_at = NOW(), "
                    "consecutive_failures = $2 WHERE id = $1",
                    existing_nc_id, consecutive,
                )
                continue
            nc = await self._create_nc(tenant_id, result, control, consecutive, db)
            new_ncs.append(nc)
        return new_ncs

    async def _create_nc(self, tenant_id, result, control, consecutive, db):
        now = datetime.now(timezone.utc)
        nc_id = str(uuid.uuid4())
        rec_type_map = {
            "CRITICAL": NCRecommendationType.IMMEDIATE_ACTION,
            "HIGH":     NCRecommendationType.CORRECTIVE_ACTION,
            "MEDIUM":   NCRecommendationType.PREVENTIVE_ACTION,
        }
        rec_type = rec_type_map.get(control.severity.value, NCRecommendationType.OBSERVATION)
        due_days = NC_DUE_DAYS.get(control.severity.value, 30)
        due_date = (now + timedelta(days=due_days)).isoformat()
        description = (
            f"Control {control.control_code} ({control.title}) has failed "
            f"{consecutive} consecutive evaluation(s) within 24 hours. "
            f"Signal: {result.signal_name} = "
            f"{f'{result.signal_value:.4f}' if result.signal_value is not None else 'N/A'}"
            f" (threshold: "
            f"{f'{result.threshold:.4f}' if result.threshold is not None else 'N/A'}"
            f", delta {f'{result.delta:+.4f}' if result.delta is not None else 'N/A'}). "
            f"{result.evidence_note}"
        )
        recommendation = control.remediation or "Review control implementation and signal configuration."
        nc = NonConformance(
            id=nc_id, tenant_id=tenant_id, control_id=control.id,
            framework_id=control.framework_id, severity=control.severity.value,
            status=NCStatus.OPEN,
            title=f"NC-{control.framework_id.upper()}: {control.title}",
            description=description, recommendation_type=rec_type,
            recommendation=recommendation, signal_name=result.signal_name,
            signal_value=result.signal_value, threshold=result.threshold,
            delta=result.delta, consecutive_failures=consecutive,
            first_detected_at=now.isoformat(), last_detected_at=now.isoformat(),
            due_date=due_date,
        )
        await db.execute(
            """
            INSERT INTO compliance_ncs (
                id, tenant_id, control_id, framework_id, severity, status,
                title, description, recommendation_type, recommendation,
                signal_name, signal_value, threshold, delta,
                consecutive_failures, first_detected_at, last_detected_at, due_date
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18
            )
            """,
            nc.id, nc.tenant_id, nc.control_id, nc.framework_id,
            nc.severity, nc.status.value,
            nc.title, nc.description, nc.recommendation_type.value, nc.recommendation,
            nc.signal_name, nc.signal_value, nc.threshold, nc.delta,
            nc.consecutive_failures, nc.first_detected_at, nc.last_detected_at, nc.due_date,
        )
        try:
            from sentinel.tasks.task_store import TaskStore
            task_store = TaskStore()
            task = await task_store.create(
                tenant_id=tenant_id,
                title=f"Remediate NC: {control.title}",
                description=description, status="OPEN",
                priority=control.severity.value, source_module="proxy",
                source_type="compliance_gap", source_id=nc_id,
                model_id=None,
                framework_ref=f"{control.framework_id} -- {control.control_code}",
            )
            if task and task.get("id"):
                await db.execute(
                    "UPDATE compliance_ncs SET task_id = $1 WHERE id = $2",
                    task["id"], nc_id,
                )
                nc.task_id = str(task["id"])
        except Exception:
            pass
        try:
            from sentinel.events.emitters import emit_compliance_gap
            import asyncio
            asyncio.create_task(emit_compliance_gap(
                tenant_id=tenant_id, gap_id=nc_id,
                framework_id=control.framework_id,
                control_id=control.id, severity=control.severity.value,
            ))
        except Exception:
            pass
        return nc

    async def assign(self, nc_id, assignee_id, due_date, actor_id, db):
        await self._transition(nc_id, NCStatus.ASSIGNED, actor_id, db)
        await db.execute(
            "UPDATE compliance_ncs SET assigned_to = $2, due_date = COALESCE($3, due_date) WHERE id = $1",
            nc_id, assignee_id, due_date,
        )
        await self._write_history(nc_id, "ASSIGNED", actor_id, f"Assigned to {assignee_id}.", db)

    async def reassign(self, nc_id, new_assignee_id, reason, actor_id, db):
        row = await db.fetchrow("SELECT status FROM compliance_ncs WHERE id = $1", nc_id)
        if not row:
            raise ValueError(f"NC {nc_id} not found")
        if row["status"] not in (NCStatus.ASSIGNED.value, NCStatus.IN_PROGRESS.value):
            raise ValueError(f"NC {nc_id} in status {row['status']} cannot be reassigned.")
        await db.execute("UPDATE compliance_ncs SET assigned_to = $2 WHERE id = $1", nc_id, new_assignee_id)
        await self._write_history(nc_id, row["status"], actor_id,
            f"Reassigned to {new_assignee_id}. Reason: {reason}", db)

    async def start_progress(self, nc_id, actor_id, db):
        await self._transition(nc_id, NCStatus.IN_PROGRESS, actor_id, db)
        await self._write_history(nc_id, "IN_PROGRESS", actor_id, "Work started.", db)

    async def submit_response(self, nc_id, response, actor_id, db):
        await self._transition(nc_id, NCStatus.PENDING_VERIFICATION, actor_id, db)
        await db.execute("UPDATE compliance_ncs SET response = $2 WHERE id = $1", nc_id, response)
        await self._write_history(nc_id, "PENDING_VERIFICATION", actor_id,
            f"Response submitted: {response[:200]}", db)

    async def close(self, nc_id, verification_note, verifier_id, db):
        await self._transition(nc_id, NCStatus.CLOSED, verifier_id, db)
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "UPDATE compliance_ncs SET verification_note = $2, closed_at = $3 WHERE id = $1",
            nc_id, verification_note, now,
        )
        await self._write_history(nc_id, "CLOSED", verifier_id,
            f"Verified and closed: {verification_note[:200]}", db)

    async def reject(self, nc_id, rejection_note, verifier_id, db):
        await self._transition(nc_id, NCStatus.REJECTED, verifier_id, db)
        await db.execute("UPDATE compliance_ncs SET verification_note = $2 WHERE id = $1", nc_id, rejection_note)
        await self._write_history(nc_id, "REJECTED", verifier_id,
            f"Verification rejected: {rejection_note[:200]}", db)
        await db.execute("UPDATE compliance_ncs SET status = $2 WHERE id = $1", nc_id, NCStatus.IN_PROGRESS.value)
        await self._write_history(nc_id, "IN_PROGRESS", verifier_id,
            "Auto-reverted to IN_PROGRESS after rejection.", db)

    async def _transition(self, nc_id, new_status, actor_id, db):
        row = await db.fetchrow("SELECT status FROM compliance_ncs WHERE id = $1", nc_id)
        if not row:
            raise ValueError(f"NC {nc_id} not found")
        current = NCStatus(row["status"])
        allowed = NC_TRANSITIONS.get(current, set())
        if new_status not in allowed:
            raise ValueError(
                f"Invalid NC transition: {current.value} -> {new_status.value}. "
                f"Allowed: {[s.value for s in allowed] or 'none (terminal)'}"
            )
        await db.execute("UPDATE compliance_ncs SET status = $2 WHERE id = $1", nc_id, new_status.value)

    async def _write_history(self, nc_id, status, actor_id, note, db):
        await db.execute(
            "INSERT INTO compliance_nc_history (id, nc_id, status, actor_id, note, occurred_at) "
            "VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())",
            nc_id, status, actor_id, note,
        )

    async def _record_failure(self, tenant_id, result, db):
        await db.execute(
            "INSERT INTO compliance_control_failures "
            "(id, tenant_id, control_id, signal_value, threshold, delta, detected_at) "
            "VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())",
            tenant_id, result.control_id, result.signal_value, result.threshold, result.delta,
        )

    async def _count_recent_failures(self, tenant_id, control_id, db):
        row = await db.fetchrow(
            "SELECT COUNT(*) AS cnt FROM compliance_control_failures "
            "WHERE tenant_id = $1 AND control_id = $2 AND detected_at > NOW() - INTERVAL '24 hours'",
            tenant_id, control_id,
        )
        return int(row["cnt"]) if row else 0

    async def _get_open_nc_id(self, tenant_id, control_id, db):
        row = await db.fetchrow(
            "SELECT id FROM compliance_ncs WHERE tenant_id = $1 AND control_id = $2 "
            "AND status != 'CLOSED' ORDER BY first_detected_at DESC LIMIT 1",
            tenant_id, control_id,
        )
        return str(row["id"]) if row else None
