"""
Certifyi Sentinel — Compliance Background Runner

Entry point called via asyncio.create_task() after every successful audit log write.
Adds ZERO latency to the API response path.

Full pipeline per audit entry (all async, post-hoc):
  1. Evaluate all AUTO/NA/MANUAL controls against entry signals
  2. Persist evaluation results to compliance_evidence (append-only hypertable)
  3. Run NC engine — record failures, raise NCs where thresholds met
  4. Recompute and persist framework aggregate scores
  5. Emit WebSocket posture update if scores changed or NCs raised
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from sentinel.compliance.control_registry import (
    CONTROLS_BY_FRAMEWORK, CONTROLS_BY_ID, EvalType
)
from sentinel.compliance.evaluator import ComplianceEvaluator, ControlStatus
from sentinel.compliance.nc_engine import NCEngine

log = logging.getLogger("sentinel.compliance")

_SEVERITY_WEIGHTS: dict[str, int] = {
    "CRITICAL": 4,
    "HIGH":     3,
    "MEDIUM":   2,
    "LOW":      1,
}


async def run_compliance_evaluation(
    audit_entry: dict[str, Any],
    tenant_id: str,
    db_pool: Any,
) -> None:
    """
    Full compliance pipeline for one audit entry.
    Call with: asyncio.create_task(run_compliance_evaluation(...))
    Never await directly from the API request handler.
    """
    try:
        async with db_pool.acquire() as db:
            evaluator = ComplianceEvaluator()
            nc_engine = NCEngine()

            # 1. Evaluate all controls
            results = evaluator.evaluate_entry(audit_entry, tenant_id)

            # 2. Persist evaluation results (append-only)
            for r in results:
                try:
                    await db.execute(
                        """
                        INSERT INTO compliance_evidence (
                            tenant_id, control_id, framework_id, status,
                            signal_name, signal_value, threshold, delta,
                            evidence_note, remediation, audit_entry_id, evaluated_at
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                        )
                        ON CONFLICT (tenant_id, control_id, audit_entry_id) DO NOTHING
                        """,
                        tenant_id, r.control_id, r.framework_id, r.status.value,
                        r.signal_name, r.signal_value, r.threshold, r.delta,
                        r.evidence_note, r.remediation, r.audit_entry_id, r.evaluated_at,
                    )
                except Exception as exc:
                    log.warning("Evidence persist failed for %s: %s", r.control_id, exc)

            # 3. NC engine — only AUTO FAILs trigger NC evaluation
            auto_fail_results = [
                r for r in results
                if r.status == ControlStatus.FAIL
                and CONTROLS_BY_ID.get(r.control_id)
                and CONTROLS_BY_ID[r.control_id].eval_type == EvalType.AUTO
            ]
            new_ncs = await nc_engine.process_eval_results(auto_fail_results, tenant_id, db)

            # 4. Recompute framework aggregate scores
            changed_frameworks = {r.framework_id for r in results}
            await _update_framework_scores(tenant_id, changed_frameworks, db)

            # 5. Emit events
            if new_ncs:
                try:
                    from sentinel.events.emitters import emit_compliance_gap
                    for nc in new_ncs:
                        asyncio.create_task(emit_compliance_gap(
                            tenant_id=tenant_id, gap_id=nc.id,
                            framework_id=nc.framework_id,
                            control_id=nc.control_id, severity=nc.severity,
                        ))
                except Exception:
                    pass

            critical_or_high = any(
                CONTROLS_BY_ID.get(r.control_id) and
                CONTROLS_BY_ID[r.control_id].severity.value in ("CRITICAL", "HIGH")
                for r in results if r.status == ControlStatus.FAIL
            )
            if critical_or_high:
                try:
                    from sentinel.api.ciso_router import compute_posture_score
                    from sentinel.events.emitters import emit_posture_update
                    score, components = await compute_posture_score(tenant_id)
                    asyncio.create_task(emit_posture_update(
                        tenant_id=tenant_id, score=score, components=components,
                    ))
                except Exception:
                    pass

    except Exception:
        log.exception(
            "Compliance evaluation pipeline failed for audit entry %s (tenant %s)",
            audit_entry.get("id", "unknown"), tenant_id,
        )


async def _update_framework_scores(
    tenant_id: str, framework_ids: set[str], db: Any,
) -> None:
    """Recompute weighted compliance score for each changed framework."""
    for fw_id in framework_ids:
        if fw_id == "custom":
            continue
        fw_controls = CONTROLS_BY_FRAMEWORK.get(fw_id, [])
        auto_controls = [c for c in fw_controls if c.eval_type == EvalType.AUTO]
        if not auto_controls:
            continue
        total_weight = sum(_SEVERITY_WEIGHTS.get(c.severity.value, 1) for c in auto_controls)
        if total_weight == 0:
            continue
        pass_weight = 0
        for control in auto_controls:
            weight = _SEVERITY_WEIGHTS.get(control.severity.value, 1)
            row = await db.fetchrow(
                "SELECT status FROM compliance_evidence "
                "WHERE tenant_id = $1 AND control_id = $2 "
                "ORDER BY evaluated_at DESC LIMIT 1",
                tenant_id, control.id,
            )
            if row and row["status"] in ("PASS", "WARN"):
                pass_weight += weight
        score = round((pass_weight / total_weight) * 100, 1)
        try:
            await db.execute(
                """
                INSERT INTO compliance_framework_scores (tenant_id, framework_id, score, computed_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (tenant_id, framework_id)
                DO UPDATE SET score = $3, computed_at = NOW()
                """,
                tenant_id, fw_id, score,
            )
        except Exception as exc:
            log.warning("Framework score update failed for %s/%s: %s", tenant_id, fw_id, exc)


async def run_attestation_overdue_check(tenant_id: str, db_pool: Any) -> None:
    """Scheduled job (run daily). Marks attestations as OVERDUE and creates tasks."""
    try:
        async with db_pool.acquire() as db:
            overdue_rows = await db.fetch(
                "SELECT tenant_id, control_id, framework_id FROM compliance_attestations "
                "WHERE tenant_id = $1 AND next_due_at < NOW() AND status != 'OVERDUE'",
                tenant_id,
            )
            for row in overdue_rows:
                await db.execute(
                    "UPDATE compliance_attestations SET status = 'OVERDUE' "
                    "WHERE tenant_id = $1 AND control_id = $2",
                    row["tenant_id"], row["control_id"],
                )
                control = CONTROLS_BY_ID.get(row["control_id"])
                if not control:
                    continue
                try:
                    from sentinel.tasks.task_store import TaskStore
                    task_store = TaskStore()
                    await task_store.create(
                        tenant_id=row["tenant_id"],
                        title=f"Overdue attestation: {control.title}",
                        description=(
                            f"Manual attestation for {control.control_code} is overdue. "
                            f"Required every {control.attestation_interval_days} days."
                        ),
                        status="OPEN", priority="HIGH",
                        source_module="proxy", source_type="compliance_gap",
                        source_id=row["control_id"], model_id=None,
                        framework_ref=f"{row['framework_id']} -- {control.control_code}",
                    )
                except Exception:
                    pass
    except Exception:
        log.exception("Attestation overdue check failed for tenant %s", tenant_id)
