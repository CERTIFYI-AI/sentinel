# Control Drift

**Route:** `/compliance/drift` · **Backing:** `control_evaluation_history` (incl. `drift_severity`, `drift_delta_pct`)

Trends render only from real evaluation rows; an empty table shows an honest empty state (the previous seeded-PRNG "live drift" is gone). Acknowledge/review actions persist; raising a non-conformity creates a real audit finding. The Python drift detector (`sentinel/compliance/drift_detector.py`) writes the same columns.
