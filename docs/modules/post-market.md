# Post-Market Monitoring

**Route:** `/post-market` · **Backing:** `post_market_plans` + `post_market_events` (EU AI Act Art. 72)

Surveillance plans keyed to `ai_models.id` with metric/threshold configs; events log breaches, complaints and drift observations, and can escalate to a real incident (via the incident service — the escalation emits `INCIDENT_CREATED`, so the mesh cascade fires). No fabricated metric charts.

- **Plan deletion keeps the ledger:** `post_market_events.plan_id` is `ON DELETE SET NULL` — deleting a plan leaves its logged events in place (they lose plan context only), and the delete-dialog copy says exactly that.
- **Art. 73 prompt:** an escalated critical/high event with a linked incident surfaces an "Assess for Art. 73 reporting" chip routing to `/risk/incidents?open=<incidentId>` — the incident page owns the actual filing-draft flow (which counts the statutory window from `detected_at`, see `lib/statutoryWindows.ts`).
- **Art. 12 audit logging:** plan and event writes log to `audit_log` via `logAction` (module `post-market`); an escalation logs an `escalate` action carrying the created incident uuid.
