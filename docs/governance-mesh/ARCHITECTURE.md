# Autonomous Governance Mesh — Architecture

**Status:** Production-ready (Fortune 500 grade) · **Version:** 1.0 · **Last reviewed:** April 2026

The Autonomous Governance Mesh is Sentinel's event-driven agent fabric. It
converts three top-level business events — `MODEL_REGISTERED`,
`RISK_DETECTED`, `INCIDENT_CREATED` — into a transparent, idempotent cascade
of 27 specialised agents that write authoritative rows into the 135+ tables
Sentinel uses to satisfy EU AI Act, GDPR, SEC, FCA, ICO and NIST AI RMF.

---

## 1. Component Map

```
                    ┌────────────────────────────────────────────────┐
  UI / API ───▶ emit │  governance_events (durable, idempotent log) │
                    └───────────────┬────────────────────────────────┘
                                    │ AFTER INSERT trigger
                                    ▼
                 ┌──────────────────────────────────────────┐
                 │  fn_dispatch_governance_event (pg_net)   │
                 └───────────────┬──────────────────────────┘
                                 ▼
              POST /functions/v1/governance-dispatcher
                                 │
                 ┌───────────────▼───────────────┐
                 │  agentRunner.ts (server)      │
                 │  • idempotency check          │
                 │  • circuit breaker            │
                 │  • retry with backoff         │
                 │  • writes agent_executions    │
                 │  • emits cascade children     │
                 └───────────────┬───────────────┘
                                 ▼
   ┌────────────┬────────────┬─────────────┬─────────────┬────────────┐
   │ Risk       │ Compliance │ Fairness    │ Carbon      │ HITL ...   │
   │ (27 agents registered in `agent_registry`)                       │
   └────────────┴────────────┴─────────────┴─────────────┴────────────┘
                                 ▼
          Dedicated domain tables (risks, incidents, evidence,
          conformity_assessments, carbon_records, hitl_reviews, ...)
```

---

## 2. Guarantees

| Guarantee             | How it is enforced                                                    |
|-----------------------|-----------------------------------------------------------------------|
| **Idempotency**       | Unique index `(org_id, idempotency_key)` on `governance_events`.       |
| **Causation**         | Every child event carries `correlation_id` + `causation_id`.           |
| **Cascade safety**    | Hard depth limit (10) inside `emitEvent` prevents infinite fan-out.    |
| **Fault tolerance**   | In-memory circuit breaker opens after 5 consecutive agent failures.    |
| **Durability**        | Failed events move to `governance_event_dlq` after `MAX_RETRIES` (3).  |
| **Observability**     | `agent_executions` logs every run with p50/p95/error-rate roll-up.     |
| **Real-time UX**      | Supabase Realtime publishes inserts to the Governance Activity Feed.   |
| **Multi-tenant RLS**  | Org-scoped `SELECT`/`INSERT` policies; service_role retains writes.    |

---

## 3. Event Catalogue

### 3.1 `MODEL_REGISTERED` cascade (12 agents)

Triggered when a new model is onboarded (UI → `ModelRegistrationDrawer`).

| # | Agent                         | Table written                  | Purpose                                     |
|---|-------------------------------|--------------------------------|---------------------------------------------|
| 1 | `RiskAssessmentAgent`         | `risks`                        | Inherent-risk scoring                       |
| 2 | `ComplianceMapAgent`          | `compliance_control_mapping`   | Map model to applicable frameworks          |
| 3 | `FairnessScanAgent`           | `bias_audits`                  | Initial fairness baseline                   |
| 4 | `ExplainabilityAgent`         | `explainability_reports`       | SHAP/LIME method registration               |
| 5 | `DataGovernanceAgent`         | `data_lineage`                 | Register training/inference datasets        |
| 6 | `VendorRiskAgent`             | `vendors`, `vendor_risks`      | Third-party TPRM onboarding                 |
| 7 | `CarbonAgent`                 | `carbon_records`               | Estimate CO₂e per inference                 |
| 8 | `HITLAgent`                   | `hitl_reviews`                 | Create reviewer assignments                 |
| 9 | `CICDGateAgent`               | `workflow_instances`           | Conformity-gate workflow                    |
| 10| `KnowledgeGraphAgent`         | `knowledge_graph_nodes/edges`  | Graph connectivity                          |
| 11| `NotificationAgent`           | `notifications`                | Owner + CISO notifications                  |
| 12| `ConformityAssessmentAgent`   | `conformity_assessments`       | EU AI Act Annex IV bootstrap                |

### 3.2 `RISK_DETECTED` cascade (6 agents)

Triggered by risk-scanner, red-team, drift monitor, etc.

| Agent                      | Outcome                                                           |
|----------------------------|-------------------------------------------------------------------|
| `ImpactAnalysisAgent`      | Computes business/regulatory blast radius                         |
| `AutoPauseAgent`           | Pauses model via kill-switch if CRITICAL                          |
| `RemediationPlannerAgent`  | Drafts remediation plan with SLA from severity matrix             |
| `ComplianceImpactAgent`    | Updates control-gap register                                      |
| `NarrativeEngineAgent`     | Writes plain-language narrative for stakeholders                  |
| `ESGAgent`                 | Updates ESG risk rollups                                          |

### 3.3 `INCIDENT_CREATED` cascade (8 agents)

Triggered by SOC, guardrail violation, or manual operator report.

| Agent                          | Outcome                                                        |
|--------------------------------|----------------------------------------------------------------|
| `IncidentClassificationAgent`  | Sets severity / priority (P0-P4)                               |
| `ContainmentAgent`             | Executes containment playbook                                  |
| `RegulatorNotifyAgent`         | Stages SEC 8-K, FCA SUP 15.3, ICO Art 33, EU AI Act Art 62     |
| `DSRImpactAgent`               | Pauses affected DSR/DSAR requests                              |
| `VendorCascadeAgent`           | Notifies downstream vendors                                    |
| `EvidenceCollectionAgent`      | Snapshots telemetry → evidence chain                           |
| `FinancialImpactAgent`         | Worst-case exposure; alerts CFO above $10M                     |
| `TrainingUpdateAgent`          | Queues awareness training                                      |

---

## 4. Database Objects

| Object                          | Role                                             |
|---------------------------------|--------------------------------------------------|
| `governance_events`             | Durable event log (the source of truth)          |
| `agent_registry`                | Declarative registry (27 rows, global org_id=NULL)|
| `agent_executions`              | Per-run ledger w/ duration, status, error        |
| `event_cascade_links`           | Parent→child graph for cascade visualiser        |
| `governance_event_dlq`          | Dead-letter queue (after 3 retries)              |
| `module_health`                 | Hourly health rollup per module                  |
| `fn_notify_governance_event`    | Trigger → `pg_notify` for listeners              |
| `fn_dispatch_governance_event`  | Trigger → `net.http_post` → edge function        |
| `fn_rollup_agent_metrics`       | Scheduled p95/avg/error-rate rollup              |

---

## 5. Operational Runbook

| Symptom                                           | Action                                                |
|---------------------------------------------------|-------------------------------------------------------|
| Agent latency > SLA for > 5 min                   | Check `agent_executions` filter p95; inspect traces   |
| Events stuck in `pending`                         | Inspect `governance_event_dlq`; resubmit after fix    |
| Circuit breaker open                              | Wait 30s (auto half-open) or restart edge function    |
| Webhook 4xx/5xx                                   | Verify `governance_dispatcher_key` in Vault           |

---

## 6. Security Posture

- RLS: org-scoped `SELECT`/`INSERT` on `governance_events` + `agent_registry`.
- `service_role` retains write for trigger + edge function.
- All trigger functions have pinned `search_path` (no search_path injection).
- Edge function is `verify_jwt=false` but authenticated via Vault-stored HMAC.
- Evidence chain uses SHA-256 `prev_hash` (genesis="GENESIS") for tamper-evidence.

---

## 7. Extending the Mesh

1. Add event type to `types/events.ts`.
2. Create agent in `dashboard/src/agents/<name>Agent.ts` following the pattern.
3. `registerAgent(eventType, handler, name)` in `agents/index.ts`.
4. Insert matching row into `agent_registry` via migration.
5. (Optional) Server-side counterpart in `supabase/functions/_shared/agentRunner.ts`.
6. Add Vitest unit test in `dashboard/src/agents/__tests__/`.
