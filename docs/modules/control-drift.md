# Control Drift

**Routes:** `/compliance/drift`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** `control_evaluation_history` (org-scoped, RLS), `realtime_alerts`

## Purpose
Trend analysis of control effectiveness over time, detecting drift from
established baselines and surfacing alerts when controls degrade.

## Why it exists
ISO/IEC 42001 9.1 requires monitoring and measurement of the AI management
system. Controls that pass today may degrade tomorrow — a one-time assessment
is not continuous compliance. Control Drift tracks evaluation results over
time so degradation is caught, not discovered at audit.

## How it works
1. Trends render only from real evaluation rows in
   `control_evaluation_history` — each row carries `drift_severity` and
   `drift_delta_pct`.
2. An empty table shows an honest empty state (no fabricated "live drift").
3. Acknowledge/review actions persist to the database.
4. Raising a non-conformity creates a real audit finding.
5. The Python drift detector (`sentinel/compliance/drift_detector.py`) writes
   the same columns, so both manual and automated evaluations appear.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | metric row | Controls evaluated, drifted count, critical/warning/stable | Read-only from `control_evaluation_history` |
| Drift trend chart | line chart | Metric value over time per control | Read-only from evaluation rows |
| Evaluation table | table | Each evaluation with control, date, value, drift severity | Read-only |
| Acknowledge | button | Marks a drift alert as acknowledged | Updates `control_evaluation_history` |
| Raise finding | button | Creates an audit finding from a drift event | Writes to audit findings |
| Real-time alerts | toast strip | Live toasts for critical/warning drift and reg-text changes | Supabase Realtime on `realtime_alerts` |
| Recent alerts | strip | Alerts pushed while page was closed | Read-only from `realtime_alerts` |

Metric convention: `metric_value` stores a 0–1 fraction (`numeric(6,4)`);
the UI renders `value × 100` with `%`, defensively rendering values > 1 raw.
Nulls: an unevaluated control shows `—`.

## Interlinks
- **Outbound** — control links to `/compliance/controls?open=<id>`,
  raised findings to `/audit-management`.
- **Inbound** — reachable from sidebar nav (Compliance & Regulatory group);
  the Python drift detector writes evaluation rows.

## Compliance
- **EU AI Act** — Art. 9 (risk management system): continuous monitoring of
  control effectiveness.
- **ISO/IEC 42001** — 9.1 (monitoring, measurement, analysis and evaluation):
  trend data over control evaluations.

## Operations
Alerts: `useControlDriftAlerts` subscribes to org-scoped `realtime_alerts`
via Supabase Realtime for live toasts. A critical alert refetches the
evaluation history. Alert types: `control_drift_critical`,
`control_drift_warning`, `reg_text_changed`. Writes throw on failure.
