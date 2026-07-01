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


# ── Persistence adapter (fill against the real asyncpg cycle) ─────────────────
# async def detect_and_store_drift(control_id, control_code, tenant_id, current_status,
#                                  current_metric, frameworks, db) -> DriftResult:
#     rows = await db.fetch(
#         "SELECT status, metric_value FROM control_evaluation_history "
#         "WHERE control_id = $1 ORDER BY evaluated_at DESC LIMIT 5", control_id)
#     prev_status = rows[0]["status"] if rows else None
#     trend = [r["metric_value"] for r in reversed(rows) if r["metric_value"] is not None]
#     if current_metric is not None:
#         trend.append(current_metric)
#     result = classify_drift(prev_status, current_status, trend, frameworks, control_code)
#     await db.execute(
#         "INSERT INTO control_evaluation_history (control_id, tenant_id, status, metric_value, "
#         "frameworks, drift_severity, drift_delta_pct) VALUES ($1,$2,$3,$4,$5,$6,$7)",
#         control_id, tenant_id, current_status, current_metric, frameworks,
#         result.drift_severity.value, result.delta_pct)
#     if result.drift_severity in (DriftSeverity.CRITICAL, DriftSeverity.WARNING):
#         await db.execute(
#             "INSERT INTO realtime_alerts (tenant_id, alert_type, title, message, payload) "
#             "VALUES ($1,$2,$3,$4,$5)", tenant_id,
#             f"control_drift_{result.drift_severity.value.lower()}",
#             f"{control_code}", result.message, {...})
#     return result
