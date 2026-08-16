# Post-Market Monitoring

**Route:** `/post-market` · **Backing:** `post_market_plans` + `post_market_events` (EU AI Act Art. 72)

Surveillance plans keyed to `ai_models.id` with metric/threshold configs; events log breaches, complaints and drift observations, and can escalate to a real incident (via the incident service — the escalation emits `INCIDENT_CREATED`, so the mesh cascade fires). No fabricated metric charts.
