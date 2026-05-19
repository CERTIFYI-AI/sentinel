# Sentinel Module Interlinks

How every Sentinel module connects to the rest of the platform. This is the canonical data-flow reference. Every arrow below corresponds to a concrete Supabase table relationship, event, or edge-function invocation (see `SUPABASE_INTEGRATION.md` and `FUNCTIONAL_ACTIVATION.md`).

## Design principles
1. **Single source of truth per entity** — one table owns the canonical record; all other modules reference it via foreign key.
2. **Event-driven fan-out** — state changes emit `audit_log` rows and NOTIFY events; dependent modules subscribe via Supabase Realtime.
3. **Evidence is universal** — every module writes to the shared `evidence` table with polymorphic `entity_type`/`entity_id` so the Evidence Vault sees everything.
4. **Policy is upstream** — `policies`, `controls`, and `frameworks` drive every downstream check (guardrails, approvals, audits).
5. **Additive only** — new modules reference existing tables; they never fork schema.

## Core backbone (every module depends on these)
| Table | Owner module | Consumers |
|---|---|---|
| `orgs`, `users`, `roles`, `rbac_bindings` | RBAC & Org | ALL |
| `frameworks`, `controls` | Compliance Programs | Policy, Controls Testing, Audits, Evidence, Reporting |
| `policies` | Policy Management | Policy Firewall, Guardrails, Approvals, Controls |
| `audit_log` | Audit Log & Trail | ALL (write), Forensics/Reporting (read) |
| `evidence` | Evidence Management | ALL (write), Regulator Filings, Reporting (read) |
| `notifications` | Platform | ALL |

## Interlink matrix (producer → consumer)

### AI Governance cluster
```
Model Inventory ──► AI Risk Tiering ──► DPIA/FRIA ──► Approval Workflows
      │                   │                │                 │
      ▼                   ▼                ▼                 ▼
   AIBOM            Risk Register     Evidence         Audit Log
      │
      ├──► Explainability ──► AI Advisor
      ├──► Bias & Fairness Audits ──► Risk Register
      ├──► Red Team & Evals ──► Incidents (on fail) ──► Remediation Tasks
      ├──► Benchmarking ──► Reporting
      └──► Kill-Switch ◄── Incidents (auto-trigger on P0)
```
- `models.id` is referenced by: `aibom_components`, `risk_tiers`, `dpia_assessments`, `approvals`, `bias_audits`, `red_team_runs`, `evals`, `benchmarks`, `kill_switch_actions`, `explainability_reports`.
- **Agent Platform** writes agent registrations → triggers AI Risk Tiering auto-assessment via edge function `fn_tier_on_register`.
- **Prompt Registry** versions are linked to `models.id` and evaluated by Policy Firewall + Guardrails at runtime.

### Compliance & Policy cluster
```
Frameworks ──► Controls ──► Control Testing ──► Evidence
     │            │               │                │
     ▼            ▼               ▼                ▼
Compliance    Policy Mgmt    Approvals        Regulator Filings
Programs          │               │                │
     │            ▼               ▼                ▼
     └────► Policy Firewall ──► Guardrails (runtime)
                                    │
                                    ▼
                              Incidents ──► Forensics
```
- `controls.framework_id → frameworks.id` (already seeded in `all_controls_seed.sql`).
- `policy_evaluations` joins `policies`, `models`, and `prompt_versions` at inference time.
- **Regulatory Intelligence** pushes new obligations → opens Compliance Program gaps → creates Remediation Tasks.

### Risk & Response cluster
```
Risk Register ◄── Bias Audits, Vendor Risk, DPIA, Red Team, BIA
      │
      ▼
  Incidents ──► Forensics Log ──► Remediation Tasks ──► Evidence
      │              │                    │
      ▼              ▼                    ▼
  Kill-Switch   Audit Log           Tabletop Exercises
```
- `incidents.risk_id → risks.id`; `remediation_tasks.incident_id → incidents.id`.
- **BIA** reads `models` + `vendors` and writes `bia_scenarios` consumed by Risk Register for inherent-risk scoring.

### Data, Privacy & Vendors cluster
```
Data Governance ──► RoPA ──► TIA ──► DSR/Consent
       │             │        │           │
       ▼             ▼        ▼           ▼
   Datasets      Processing  Transfers  Subject Requests
       │           Activities              │
       └──► Models (training lineage) ◄────┘

Vendor Risk ──► Risk Register, Approvals, Evidence
```
- `datasets.id` is FK'd by `models.training_dataset_ids[]` (array) for full lineage.
- **DSR/Consent** triggers deletion cascades through `dsr_actions` → `audit_log` + `evidence`.

### Cross-cutting utilities
| Module | Interlinks into |
|---|---|
| Trust Engine | Aggregates scores from Bias, Red Team, Evals, Incidents → writes `trust_scores` |
| AI Advisor / Narrative | Reads ALL tables (RLS-scoped), writes `narratives` |
| Executive Intelligence | Materialized views over Risk, Incidents, Compliance, Trust |
| Knowledge Graph / Marketplace | Graph edges derived from FK relationships above |
| Integrations Platform | Source + sink for every module via `integration_events` |
| Training & Awareness | Consumes `users`, `policies`, writes `training_completions` |
| Ethics Reporting, ESG | Read-only aggregators over Risk, Incidents, Trust |
| Security Intelligence | Writes `security_signals` → Incidents pipeline |
| Approval Workflows | Referenced by: Models, Policies, DPIA, Vendors, Filings, Kill-Switch |

## Canonical entity graph (summary)
```
orgs ─┬─ users ─ rbac_bindings
      ├─ frameworks ─ controls ─ control_tests ─ evidence
      ├─ policies ─ policy_versions ─ policy_evaluations
      ├─ models ─┬─ aibom_components
      │          ├─ risk_tiers ─ dpia_assessments
      │          ├─ bias_audits ─ red_team_runs ─ evals ─ benchmarks
      │          ├─ explainability_reports
      │          └─ prompt_versions
      ├─ agents ─ agent_events
      ├─ datasets ─ ropa_records ─ tia_records ─ dsr_actions
      ├─ vendors ─ vendor_assessments
      ├─ risks ─ incidents ─ forensics_entries ─ remediation_tasks
      ├─ approvals (polymorphic target)
      ├─ evidence (polymorphic target)
      ├─ audit_log (append-only, polymorphic)
      ├─ trust_scores, narratives, notifications
      └─ integration_events, training_completions
```

See `SUPABASE_INTEGRATION.md` for the DDL and `FUNCTIONAL_ACTIVATION.md` for how each edge in the graph becomes a running feature.
