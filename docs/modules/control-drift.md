# Control Drift

**Route:** `/compliance/drift` · **Backing:** `control_evaluation_history` (incl. `drift_severity`, `drift_delta_pct`) + `realtime_alerts`

Trends render only from real evaluation rows; an empty table shows an honest
empty state (the previous seeded-PRNG "live drift" is gone). Acknowledge/review
actions persist; raising a non-conformity creates a real audit finding. The
Python drift detector (`sentinel/compliance/drift_detector.py`) writes the same
columns.

**Metric convention (2026-08-16):** `metric_value` stores a **0–1 fraction**
(`numeric(6,4)`, e.g. `0.9321` = 93.21%); the UI renders `value × 100` with a
`%` sign, defensively rendering values `> 1` raw (assumed already-percent from
a non-conforming producer) rather than multiplying them.

**Alerts:** `useControlDriftAlerts` subscribes to the org-scoped
`realtime_alerts` table (columns `alert_type, title, message, payload,
created_at`; types `control_drift_critical | control_drift_warning |
reg_text_changed`) via Supabase Realtime for live toasts, **and** reads the
recent rows so alerts pushed while the page was closed are still shown in a
"Recent Alerts" strip. A critical alert refetches the evaluation history.
Before 2026-08-16 the table did not exist, so the subscription was dead.
