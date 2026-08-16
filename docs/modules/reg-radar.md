# Reg Radar

**Routes:** `/reg-radar`, `/reg-radar/:id` · **Backing:** `regulation_entries` (shared with Risk Intelligence)

One regulatory register, two lenses: Reg Radar is the horizon/deadline view, Risk Intelligence the risk-mapping view — both on `regulation_entries` (obligations jsonb, `linked_model_ids`). Countdowns are computed from `effective_on` at render, never stored.
