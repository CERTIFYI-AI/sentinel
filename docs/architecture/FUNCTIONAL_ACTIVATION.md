# Functional Activation Plan

How to take each Sentinel module from static UI to a fully functional, Supabase-backed feature. This document lists every trigger, edge function, cron, and Realtime channel needed, ordered by activation priority.

Prerequisites: `SUPABASE_INTEGRATION.md` schema deployed, RLS enabled, seed data loaded.

## Activation tiers
| Tier | Name | SLA | Modules |
|---|---|---|---|
| T0 | Identity & Core | Day 1 | Auth, RBAC, Audit Log, Notifications |
| T1 | Governance spine | Week 1 | Model Inventory, Frameworks/Controls, Policies, Evidence |
| T2 | Risk pipeline | Week 2 | Risk Register, Incidents, Forensics, Remediation, Kill-Switch |
| T3 | AI-specific | Week 3 | AI Risk Tiering, DPIA, AIBOM, Bias, Red Team, Evals, Benchmarking |
| T4 | Privacy & Vendors | Week 4 | Data Gov, RoPA, TIA, DSR, Vendor Risk |
| T5 | Intelligence | Week 5 | Trust Engine, AI Advisor, Executive Intelligence, Regulatory Intel |
| T6 | Platform | Week 6 | Integrations, Training, Ethics, ESG, Knowledge Graph, Marketplace |

## T0: Identity & Core

### Auth activation
1. Wire `supabase.auth.signInWithPassword()` in login page (already scaffolded in `authStore.ts`).
2. Add JWT hook (`supabase/functions/jwt-hook/index.ts`) to inject `org_id`, `roles[]` into token claims.
3. MFA: enable TOTP in Supabase dashboard; add `<MFAEnroll>` component behind `/settings/security`.
4. SSO: configure SAML provider in Supabase Auth settings; no code change.

### RBAC activation
- Replace hardcoded `isAdmin` checks with `has_role(auth.uid(), 'perm')` via `rbac_bindings` table.
- `<RoleGuard permission="models:write">` component already exists in `features/access-control`.
- Trigger: `fn_log_rbac_change` writes to `audit_log` on any `rbac_bindings` INSERT/UPDATE/DELETE.

### Audit Log
- All tables get an `AFTER INSERT OR UPDATE OR DELETE` trigger that appends to `audit_log`.
- Template trigger function:
```sql
create or replace function fn_audit_trigger() returns trigger as $$
begin
  insert into audit_log (org_id, entity_type, entity_id, action, actor_id, diff)
  values (
    coalesce(NEW.org_id, OLD.org_id),
    TG_TABLE_NAME, coalesce(NEW.id, OLD.id), TG_OP,
    auth.uid(), jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  return NEW;
end;
$$ language plpgsql security definer;
```
- Apply: `create trigger trg_<table>_audit after insert or update or delete on <table> for each row execute fn_audit_trigger();`

### Notifications
- Edge function `fn_notify` triggered by DB webhook on `notifications` INSERT.
- Delivers via Supabase Realtime (already wired) + optional email/Slack via `integration_events`.

## T1: Governance Spine

### Model Inventory
- CRUD: wire `fetchDB('models', ...)` / `mutateDB('models', ...)` in existing pages.
- On INSERT: Postgres trigger `fn_auto_tier` calls edge function `fn_tier_on_register` to create initial `risk_tiers` row.
- On UPDATE(status='production'): trigger creates `approval` row requiring sign-off.

### Frameworks & Controls
- Already seeded via `all_controls_seed.sql`.
- Wire `controls` page to `fetchDB('controls', { filter: { framework_id } })`.
- `control_tests` CRUD; on INSERT set `evidence.entity_type='control'`.

### Policies
- `policies` + `policy_versions` CRUD.
- Trigger: `fn_version_policy` auto-creates `policy_versions` row on `policies` UPDATE.
- `policy_evaluations` are written by Policy Firewall at inference time (see T3).

### Evidence
- Universal upload: `supabase.storage.from('evidence').upload(path, file)`.
- After upload, INSERT into `evidence` table with `entity_type`/`entity_id`.
- Evidence chain: each new row references `chain_prev` for tamper-evident append-only log.
- SHA-256 hash computed client-side before upload, stored in `evidence.sha256`.

## T2: Risk Pipeline

### Risk Register
- Aggregates from: Bias Audits, Vendor Risk, DPIA, Red Team, BIA via materialized view.
- Edge function `fn_recalc_risk_score` runs on INSERT to any risk-source table.
- Trigger: on `risks` UPDATE(severity='critical') auto-opens Incident.

### Incidents
- CRUD with status machine: `open -> investigating -> mitigated -> resolved -> closed`.
- Trigger: on INSERT, `fn_auto_assign` checks on-call rotation (from `users` metadata).
- Trigger: on INSERT(severity='P0'), auto-fire `kill_switch_actions` row.
- Realtime: already subscribed in `useRealtimeInvalidation`.

### Forensics & Remediation
- `forensics_entries`: append-only child of `incidents`.
- `remediation_tasks`: CRUD with assignee, due_date, status; linked to `incidents`.
- Trigger: on remediation `status='done'`, auto-collect evidence snapshot.

### Kill-Switch
- Edge function `fn_kill_switch` reads `kill_switch_actions`, calls model provider API to revoke/disable.
- Invoked: (a) manually from UI, (b) auto on P0 incident, (c) on policy breach via Guardrails.
- Writes `audit_log` + `evidence` for every activation.

## T3: AI-Specific Modules

### AI Risk Tiering
- Edge function `fn_tier_on_register`: reads model metadata, applies tiering rubric, writes `risk_tiers`.
- Tiering rubric stored in `configs/risk-tiering-rubric.json` (already exists in repo).

### DPIA/FRIA
- CRUD on `dpia_assessments`, linked to `models.id` + `risk_tiers.id`.
- On completion, auto-creates `approval` for DPO sign-off.

### AIBOM
- `aibom_components` rows auto-generated on model registration via edge function.
- Reads `models.metadata.dependencies[]` and fans out.

### Bias & Fairness / Red Team / Evals / Benchmarking
- Each has its own table; all link to `models.id`.
- Results flow into Risk Register via `fn_recalc_risk_score`.
- Red Team failures auto-open Incidents.
- Benchmarking scores feed Trust Engine.

### Policy Firewall & Guardrails (runtime)
- Cloudflare Worker (`dashboard/wrangler.toml` already configured) intercepts prompts.
- Evaluates against `policies` + `prompt_versions` via `policy_evaluations` table.
- Breach: writes `guardrails` row (realtime-subscribed) + optional Incident.
- HITL queue: writes `hitl_queue` row; human approves/rejects via dashboard.

### Explainability & AI Advisor
- `explainability_reports` generated per-inference or on-demand.
- AI Advisor: reads all module data (RLS-scoped), generates `narratives` via LLM edge function.

## T4: Privacy & Vendors

### Data Governance / RoPA / TIA / DSR
- CRUD tables; DSR triggers `fn_dsr_cascade` which:
  1. Marks affected `datasets` rows.
  2. Writes `dsr_actions` log.
  3. Creates `evidence` and `audit_log` rows.
  4. Optionally calls model provider delete API via edge function.

### Vendor Risk
- `vendors` + `vendor_assessments` CRUD.
- Trigger: on assessment completion, auto-creates `risks` row + `approval`.

## T5: Intelligence Layer

### Trust Engine
- Materialized view aggregating: bias scores, red team pass rate, incident count, eval scores, compliance gap %.
- Cron edge function `fn_refresh_trust_scores` runs every 15 minutes.
- Writes `trust_scores` (realtime-subscribed once extended).

### Executive Intelligence
- Additional materialized views for C-suite dashboards.
- Refreshed by same cron or on-demand via edge function.

### Regulatory Intelligence
- Edge function `fn_reg_intel_sync` polls external regulatory feeds (RSS/API).
- New obligations create `remediation_tasks` + compliance gap entries.

## T6: Platform

### Integrations
- `integration_events` table; edge functions per provider (Slack, Jira, ServiceNow, email).
- Webhook receiver edge function `fn_inbound_webhook` normalizes events.

### Training & Awareness
- `training_completions` linked to `users` + `policies`.
- Cron: `fn_training_reminders` sends notifications for overdue completions.

### Knowledge Graph / Marketplace
- Graph edges derived from FK relationships (see INTERLINKS.md).
- Materialized view `knowledge_graph_edges` powers the graph visualization.

## Edge Functions registry
| Function | Trigger | Tables touched |
|---|---|---|
| `fn_audit_trigger` | Postgres trigger (all tables) | `audit_log` |
| `fn_tier_on_register` | DB webhook on `models` INSERT | `risk_tiers` |
| `fn_auto_tier` | Postgres trigger on `models` INSERT | calls edge fn |
| `fn_version_policy` | Postgres trigger on `policies` UPDATE | `policy_versions` |
| `fn_recalc_risk_score` | DB webhook on risk-source tables | `risks`, `trust_scores` |
| `fn_kill_switch` | DB webhook on `kill_switch_actions` INSERT | external API, `audit_log`, `evidence` |
| `fn_dsr_cascade` | DB webhook on `dsr_actions` INSERT | `datasets`, `evidence`, `audit_log` |
| `fn_notify` | DB webhook on `notifications` INSERT | email/Slack |
| `fn_refresh_trust_scores` | Cron (15min) | `trust_scores` matview |
| `fn_reg_intel_sync` | Cron (daily) | `remediation_tasks`, compliance tables |
| `fn_training_reminders` | Cron (daily) | `notifications` |
| `fn_inbound_webhook` | HTTP POST | `integration_events` |
| `fn_ai_advisor` | HTTP POST (on-demand) | `narratives` |
| `jwt-hook` | Auth hook | JWT claims |

## Realtime channels (final list)
Extend `useRealtimeInvalidation.ts` REALTIME_TABLES to:
```ts
const REALTIME_TABLES = [
  { table: 'notifications', queryKey: ['notifications'] },
  { table: 'guardrails', queryKey: ['guardrails'] },
  { table: 'hitl_queue', queryKey: ['hitl-queue'] },
  { table: 'risks', queryKey: ['risks'] },
  { table: 'models', queryKey: ['models'] },
  { table: 'incidents', queryKey: ['incidents'] },
  { table: 'controls', queryKey: ['controls'] },
  { table: 'bias_audits', queryKey: ['bias-audits'] },
  { table: 'audit_log', queryKey: ['audit-log'] },
  // new
  { table: 'approvals', queryKey: ['approvals'] },
  { table: 'evidence', queryKey: ['evidence'] },
  { table: 'policies', queryKey: ['policies'] },
  { table: 'dpia_assessments', queryKey: ['dpia'] },
  { table: 'red_team_runs', queryKey: ['red-team'] },
  { table: 'vendor_assessments', queryKey: ['vendor-risk'] },
  { table: 'remediation_tasks', queryKey: ['remediation'] },
  { table: 'trust_scores', queryKey: ['trust-scores'] },
  { table: 'kill_switch_actions', queryKey: ['kill-switch'] },
] as const;
```

## Non-goals
- No UI redesign, color, font (Outfit), or brand changes.
- No new page routes created here — pages already exist in `dashboard/src/pages/`.
- Schema is additive only; existing tables/columns are untouched.
