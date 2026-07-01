# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
"""Control drift classification.

Distinct from model *data* drift: this detects when a compliance control's own
status trends adversely over its last N evaluations.

The classification core (:func:`classify_drift`) is pure and dependency-free so
it is unit-testable with no database. The persistence adapter that reads the
last-N history and writes alerts belongs in the background runner and MUST use
this project's real ``asyncpg`` ``db`` connection (``db.fetch`` / ``db.execute``
with ``$1`` params and ``tenant_id``) — NOT a supabase-py client. A reference
adapter signature is provided at the bottom (commented) to be filled in against
the real ``run_compliance_evaluation`` cycle after reading it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class DriftSeverity(str, Enum):
    NONE = "NONE"
    WATCH = "WATCH"          # single adverse move, still passing
    WARNING = "WARNING"      # 3+ consecutive degradations, still passing
    CRITICAL = "CRITICAL"    # status flipped PASS -> FAIL (or already failing)


@dataclass
class DriftResult:
    drift_severity: DriftSeverity
    previous_status: str | None
    current_status: str
    metric_trend: list[float]
    delta_pct: float
    message: str
    frameworks_impacted: list[str] = field(default_factory=list)


def classify_drift(
    previous_status: str | None,
    current_status: str,
    metric_trend: list[float],
    frameworks_impacted: list[str] | None = None,
    control_code: str = "",
) -> DriftResult:
    """Pure three-tier drift classification (no I/O).

    ``metric_trend`` is oldest → newest, INCLUDING the current value. Higher
    metric values are "better" (further from failure); an adverse move is a
    decrease. Mirrors the frontend ControlDrift view exactly.
    """
    fw = frameworks_impacted or []
    delta_pct = 0.0
    if len(metric_trend) >= 2 and metric_trend[0]:
        delta_pct = (metric_trend[-1] - metric_trend[0]) / metric_trend[0] * 100

    if not metric_trend:
        return DriftResult(DriftSeverity.NONE, previous_status, current_status, [], 0.0,
                           "First evaluation — no drift history yet", fw)

    # Tier 1 — status flip / already failing = CRITICAL
    if current_status == "FAIL":
        msg = (f"Control flipped PASS → FAIL — immediate review required ({control_code})".strip()
               if previous_status == "PASS" else "Control failing — remediation required")
        return DriftResult(DriftSeverity.CRITICAL, previous_status, current_status, metric_trend, delta_pct, msg, fw)

    # Tier 2 — 3+ consecutive degradations while still passing = WARNING
    if len(metric_trend) >= 4:
        last4 = metric_trend[-4:]
        if all(last4[i] < last4[i - 1] for i in range(1, 4)):
            return DriftResult(DriftSeverity.WARNING, previous_status, current_status, metric_trend, delta_pct,
                               f"Metric degrading for 3+ consecutive evaluations ({delta_pct:.1f}%) — approaching threshold", fw)

    # Tier 3 — single adverse move = WATCH
    if len(metric_trend) >= 2 and metric_trend[-1] < metric_trend[-2]:
        return DriftResult(DriftSeverity.WATCH, previous_status, current_status, metric_trend, delta_pct,
                           f"Metric moved adversely since last evaluation ({delta_pct:.1f}%)", fw)

    return DriftResult(DriftSeverity.NONE, previous_status, current_status, metric_trend, delta_pct, "Stable", fw)


# ── Persistence adapter — real asyncpg (this project's DB layer, NOT supabase) ─
import json


async def detect_and_store_drift(
    control_id: str,
    control_code: str,
    tenant_id: str,
    org_id: str,
    current_status: str,
    current_metric: float | None,
    frameworks_impacted: list[str],
    db,
    history_window: int = 5,
) -> DriftResult:
    """Read the last-N evaluations, classify drift, persist the new evaluation,
    and emit a realtime alert on WARNING/CRITICAL.

    ``db`` is this project's asyncpg connection (``db.fetch`` / ``db.execute``
    with ``$1`` params), acquired via ``db_pool.acquire()`` in the runner — the
    same pattern used by ``run_compliance_evaluation``. No supabase-py client.
    """
    rows = await db.fetch(
        "SELECT status, metric_value FROM control_evaluation_history "
        "WHERE control_id = $1 ORDER BY evaluated_at DESC LIMIT $2",
        control_id, history_window,
    )
    prev_status = rows[0]["status"] if rows else None
    trend = [r["metric_value"] for r in reversed(rows) if r["metric_value"] is not None]
    if current_metric is not None:
        trend.append(float(current_metric))

    result = classify_drift(prev_status, current_status, trend, frameworks_impacted, control_code)

    await db.execute(
        """
        INSERT INTO control_evaluation_history
            (id, control_id, tenant_id, control_code, status, metric_value,
             frameworks, drift_severity, drift_delta_pct, evaluated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, now())
        """,
        control_id, tenant_id, control_code, current_status, current_metric,
        json.dumps(frameworks_impacted), result.drift_severity.value, result.delta_pct,
    )

    if result.drift_severity in (DriftSeverity.CRITICAL, DriftSeverity.WARNING):
        await db.execute(
            """
            INSERT INTO realtime_alerts (id, tenant_id, alert_type, title, message, payload, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now())
            """,
            tenant_id,
            f"control_drift_{result.drift_severity.value.lower()}",
            f"{'Critical' if result.drift_severity is DriftSeverity.CRITICAL else 'Warning'}: {control_code}",
            result.message,
            json.dumps({
                "control_id": control_id,
                "control_code": control_code,
                "org_id": org_id,
                "current_status": result.current_status,
                "previous_status": result.previous_status,
                "drift_severity": result.drift_severity.value,
                "metric_trend": result.metric_trend,
                "delta_pct": result.delta_pct,
                "frameworks_impacted": result.frameworks_impacted,
            }),
        )

    return result
