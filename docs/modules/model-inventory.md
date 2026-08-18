# Model Registry

**Routes:** `/models/inventory`, `/models/inventory/:id` (`/models` redirects to `/models/inventory`)
**Status:** Production — real `ai_models` backend, org-scoped with RLS. Some per-model metrics (fairness, accuracy, latency, drift) default to a neutral value when no telemetry exists yet; those are called out as simulated/unmeasured below.
**Owner:** AI Assets / Platform · **Backing table(s):** `ai_models` (org-scoped, RLS). Per-model detail children: `model_documents`, `model_activity`, `model_alert_configs`.

## Purpose
The Model Registry is Sentinel's system of record for every AI model the organisation builds, fine-tunes, or buys. Each row is one governed model keyed by `ai_models.id` (a uuid) — the single, canonical id-space that every other module in the platform links to. The screen lets a governance owner register, search, filter, export, edit, and retire models, and open any model's full governance passport.

## Why it exists
`ai_models` is the platform's **canonical governed entity**. Risk tiering, impact assessments (AIIA), Model Risk Committee reviews, HITL reviews, incidents, the prompt registry, the Trust Engine runtime, cost/telemetry and performance monitoring all reference a model by its `ai_models.id` and resolve the display name at render time. Without a registry there is no id to link to, and the "one platform, one id-space" invariant (CLAUDE.md First principle #2) collapses into name-matching.

In compliance terms the registry discharges the provider's duty to maintain an inventory of AI systems and their technical documentation:

- **EU AI Act Art. 11 / Annex IV** — technical documentation. The model detail page exports an Annex IV package and a Model Card (JSON) built from the registry record.
- **EU AI Act Art. 12** — record-keeping. The registry is the anchor an auditor walks back from. (See the honest gap in **Compliance**: `ai_models` writes are not yet audit-logged — TD-018.)
- **EU AI Act Art. 9 / Art. 14** — the drift banner surfaces risk-management obligations, and registration captures the human-oversight flag high-risk systems require.

If the registry is absent or wired to a demo table, every downstream link dangles ("Unavailable"), inventory obligations go unmet, and no downstream governance record can prove which model it governs.

## How it works
**Records.** A model is a row in `ai_models`. The list is read by `modelService.fetchAllModels` (ordered by `created_at` desc) through the `useModelsData` React Query hook (`staleTime` 30 s; the cache invalidates on every mutation). The raw row is translated to the rich UI `Model` view-shape by `recordToModel` in `dashboard/src/lib/modelMapping.ts`; writes translate back via `modelToRecord`.

**Create.** "Register Model" opens `RegisterModelForm`. On submit the page calls `saveModel(modelToRecord(newModel))` with **no `id`**, so the database generates the uuid (`gen_random_uuid()`) and fills `org_id` from its `get_org_id()` default — the client never sends a scoping column. A new insert also fires the `MODEL_REGISTERED` governance event on `governanceBus` (source `ai-inventory`): the autonomous mesh opens the initial risk, maps controls, and raises a HITL review where the tier demands it. That cascade is deliberately fire-and-forget and never rethrown — an agent failure must not roll back the user's save; its outcomes are observable in Agent Control / `governance_events`, not in the save result.

**Edit / delete.** "Edit" opens `EditModelForm` and calls `saveModel({ ...modelToRecord(updated), id })` (id present ⇒ update). "Delete" opens a `ConfirmDialog` and calls `deleteModel(id)`. All writes throw on failure; the dialog closes and a toast fires only after the promise resolves — a failed write shows a real error toast ("Failed to register/update/remove model") and no success.

**Lifecycle & status.** The stored `lifecycle_stage` is mapped to a UI `status` of `production | staging | development | retired` (`LIFECYCLE_TO_STATUS`). An unknown or empty stage deliberately defaults to **development**, never production, so the Production KPI is not over-counted. Each row renders a five-step lifecycle stepper (Development → Staging → Production → Deprecated → Retired) with the active stage highlighted.

**Risk tier.** The DB `risk_tier` enum `{critical, high, medium, low, minimal}` maps to the UI tier `{unacceptable, high, limited, minimal}` (`DB_RISK_TO_UI` / `UI_RISK_TO_DB`). Registering as "High-Risk AI System (Annex III)" forces the tier to `high`; an unknown tier defaults to `limited`.

**Derived vs. stored.** The four metric tiles (Total, Production, Drift Alerts, High-Risk) and the filtered count are computed client-side from the loaded rows — they are not stored aggregates. Per-model `fairnessScore`, `accuracy`, `latencyMs`, `monthlyInferences` and `driftStatus` are **not** part of the registry list's stored telemetry: `recordToModel` defaults `fairnessScore` to `0`, `accuracy`/`latencyMs` to `0`, `monthlyInferences` to `—`, and `driftStatus` to `stable` when the columns are null. On the detail page these are replaced by live analytics (`useModelAnalytics`, realtime) where telemetry exists. Treat a `0`/`stable` on a freshly-registered model as **unmeasured, not measured** (see the gap in **Operations**).

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Register Model | button (header) | Opens `RegisterModelForm` dialog | On submit → `saveModel(modelToRecord(model))` with no id → DB generates uuid, fills `org_id`; fires `MODEL_REGISTERED` cascade; success toast after write resolves |
| Export CSV | button (header) | Exports the **current filtered view** to a real CSV file | Client-side `Blob` download `model-registry-<yyyy-mm-dd>.csv` (columns: ID, Name, Type, Version, Risk Tier, Fairness %, Drift, Status, Owner, Last Validated); disabled when the filtered list is empty; toast reports the exported count |
| Total Models | metric tile | Count of all loaded models | Read-only, computed client-side |
| Production | metric tile | Count where UI status = `production` | Read-only, computed client-side |
| Drift Alerts | metric tile | Count where `driftStatus` is `warning` or `critical` | Read-only; drives the Art. 9 banner |
| High-Risk (EU AI Act) | metric tile | Count where risk tier is `high` or `unacceptable` | Read-only, computed client-side |
| Critical Drift Banner | conditional banner | Shows when Drift Alerts > 0 | Static advisory citing EU AI Act Art. 9; no write |
| Search | text filter | Case-insensitive match on model **id, name, or owner** | Narrows the table live |
| Risk Tier | select filter | `all` / `high` / `limited` / `minimal` | Narrows the table (note: no explicit `unacceptable` option) |
| Status | select filter | `all` / `production` / `staging` / `development` / `retired` | Narrows the table |
| `{n} models` | label | Live count of the filtered rows | Read-only |
| Table row | row | Displays one model; hover highlight; a `critical` drift row gets a red left border | Row action buttons below |
| View (eye) | row button | Navigates to the detail passport | `navigate('/models/inventory/<uuid>')` |
| Edit (pencil) | row button | Opens `EditModelForm` | On save → `saveModel({...record, id})`; toast after resolve |
| Delete (trash) | row button | Opens `ConfirmDialog` | On confirm → `deleteModel(id)`; toast after resolve; irreversible |
| Initiate Review | row button (only when drift = `critical`) | Logs a compliance-review event then opens the model | Writes `model_activity` row `event: 'Compliance review initiated'` with the real actor, kind `warning`; then navigates to detail |

**List table columns** (source field → render):

| Column | Source (UI `Model` → DB) | Null / empty render |
|---|---|---|
| ID | `id` ← `ai_models.id` (uuid) | shown as a monospace uuid in the list |
| Name | `name` ← `name` | — |
| Type | `type` ← `model_type` (enum → label) | `—` when `model_type` is null |
| Version | `version` ← `version` | `—` |
| Risk Tier | `riskTier` ← `risk_tier` (enum map) | defaults to `limited` if unmapped |
| Fairness % | `fairnessScore` ← `fairness_score` | **renders `0%` when null** — a known deviation from the "null → —" rule (see Operations) |
| Drift | `driftStatus` ← `drift_status` | defaults to `stable` when null |
| Status | `status` ← `lifecycle_stage` (map) + lifecycle stepper | unknown stage → `development` |
| Owner | `owner` ← `business_owner` ?? `technical_owner` | `—` |
| Actions | View / Edit / Delete (+ Initiate Review if critical) | — |

**Empty & loading states.** Loading shows header/tile/row skeletons. When no models exist at all: "No models registered yet" + a Register button. When models exist but filters match none: "No models match your filters." (Honest empty states — no fabricated rows.)

**Register / Edit form fields.** The register dialog collects Name*, Version*, Provider, Type, Risk Classification*, Intended Use (≤256 chars), Known Limitations, Training Data Sources, Business Owner*, Technical Owner, Department / Business Unit, Fairness Threshold, Data Classification, Deployment Environment, plus two governance checkboxes: "EU AI Act High-Risk AI System (Annex III)" and "Human oversight in place (Art. 14)" — the oversight box is forced on and disabled when High-Risk is checked. Submit is enabled only with Name, Version, Risk Classification and Business Owner. Fields without a dedicated column (department, data classification, intended purpose, known limitations, training-data sources, human-oversight, EU AI Act article) are folded into `ai_models.metadata` (jsonb) by `modelToRecord`.

**Detail page (`/models/inventory/:id`).** Tabs: Model Card, Risk & Security, Performance, Bias History, Explainability, Data Lineage, Technical Docs, Activity. The Model Card exports a Model Card (JSON) and an EU AI Act Annex IV package, configures drift alerts (`model_alert_configs`), links/removes technical documents (`model_documents`), and logs actions to `model_activity`. It carries the outbound governance links and reverse-interlink backlink cards described under **Interlinks**.

## Fields
Grounded in the real `ai_models` DDL: `supabase/migrations/007_replay_baseline.sql` (canonical `CREATE TABLE ai_models`), plus `supabase/migrations/20260813000003_ai_models_registry_ui_columns.sql` (adds the metric columns, sets the `org_id` default) and `supabase/migrations/20260819000004_telemetry_plane_repair.sql` (adds `paused_reason`, `paused_at`). Org scoping/RLS is applied by the tenancy sweep `supabase/migrations/20260421000014_ws02_tenancy_sweep.sql` (org_id NOT NULL + the five `ws01_*` read/insert/update/delete/service policies).

| Field | Type | Req. | Notes |
|---|---|---|---|
| id | uuid | pk | `DEFAULT gen_random_uuid()`; the canonical model id-space — every module stores this, never a name or `MDL-xxx` |
| org_id | uuid | auto | `DEFAULT get_org_id()`; made `NOT NULL` + RLS-scoped by the tenancy sweep — never set by the client |
| name | text | yes (UI) | Display name; resolved at render, never shown as a uuid |
| slug | text | — | Derived by `modelToRecord` (`slugify(name-version)`) |
| description | text | — | Intended-use / description; renders `—`/empty when null |
| model_type | text | — | Enum `{llm, classification, regression, nlp, vision, multimodal, rl, other}` → human label |
| provider | text | — | e.g. OpenAI, Internal |
| version | text | — | `—` when null |
| lifecycle_stage | text | — | Mapped to UI status; empty/unknown → `development` |
| risk_tier | text | — | Enum `{critical, high, medium, low, minimal}` ⇄ UI `{unacceptable, high, limited, minimal}` |
| use_case | text | — | Free-text use-case label on the row |
| business_owner | text | — | Primary owner shown in the list (falls back to `technical_owner`) |
| technical_owner | text | — | ML/eng lead |
| framework | text | — | e.g. "EU AI Act"; `—` when null |
| eu_ai_act_category | text | — | EU AI Act category label |
| is_regulated | boolean | — | Regulated-system flag |
| risk_score | numeric | — | Quantitative risk score |
| trust_score | numeric | — | Trust score |
| fairness_score | numeric | — | Shown as Fairness %; **null currently renders `0`, not `—`** (deviation, see Operations) |
| drift_status | text | — | `DEFAULT 'stable'`; UI maps unknown → `stable` |
| drift_score | numeric | — | Numeric drift measure |
| paused_reason | text | — | Set by the autonomous mesh when a model is paused |
| paused_at | timestamptz | — | When the model was paused |
| tags | text[] | — | Free-form tags |
| metadata | jsonb | — | Holds fields without a dedicated column: `department`, `dataClassification`, `intendedPurpose`, `knownLimitations`, `trainingDataSources`, `humanOversight`, `euAiActArticle` |
| created_at | timestamptz | auto | `DEFAULT now()` |

Honest schema-vs-type note: `dashboard/src/services/modelService.ts`'s `ModelRecord` type also declares `deployment_env`, `updated_at`, `is_active`, `requires_human_oversight`, and `use_case`. Of these, the repo `ai_models` DDL defines **`use_case`** only; `deployment_env`, `updated_at`, `is_active`, and `requires_human_oversight` are **not** in the repo migrations for `ai_models` (they belong to the legacy, code-unused `model_inventory` table). `recordToModel` reads `r.updated_at ?? r.created_at ?? ''` so a missing `updated_at` degrades gracefully, and `modelToRecord` writes `deployment_env`; if the live database lacks that column the upsert would throw. This drift between the TS type and the repo DDL is a real gap flagged in Operations, not asserted away.

## Interlinks
Every interlink uses the `?model=<uuid>` deep-link convention (a filtered list with a dismissible chip) or the `/models/inventory/:id` detail route; ids resolve to a display name, and an unresolvable id shows **"Unavailable"** (never a raw uuid).

**Outbound** — from a model record (mostly on the detail page):
- Governance cards → `/ai-risk-tiering?model=`, `/aiia?model=`, `/mrc?model=`, `/performance-monitoring?model=`, `/model-efficiency?model=`, `/genai-risks?model=`, `/trust-engine?model=`.
- Runtime & Operations rows → `/models/lifecycle?model=`, `/prompt-registry?model=`, `/trust-engine/costs?model=`, `/trust-engine/fallback?model=`, `/trust-engine/tools?model=`, `/ai-gateway/playground?model=`.
- Risk & Security backlink cards (reverse interlinks read live via `useModelBacklinks`) → `/risks?model=`, `/incidents?model=`, plus HITL reviews, financial-risk quantifications, security threats, red-team findings and arena runs that reference the model.
- On **insert**, the `MODEL_REGISTERED` governance event (source `ai-inventory`) fans out to the autonomous mesh (initial risk, control mapping, HITL) — an outbound governance cascade rather than a UI link.

**Inbound** — the registry is reachable from:
- Command palette entry "Model Registry" → `/models/inventory`.
- Any module that deep-links a specific model → `/models/inventory/:id` (e.g. `KnowledgeGraph.tsx`, `CisoDashboard.tsx`), and every `?model=` chip elsewhere resolves its label from `ai_models`.
- The list row itself → detail passport.

**Interlink proof.** The reverse-link cards prove `total == resolves` by counting source rows whose `model_id` resolves to an `ai_models.id`. A representative proof query (run per-tenant against the live DB; **not executed in this doc-writing session** — run before merge per Gate 1):
```sql
-- total references vs. those that resolve to a real model
select
  (select count(*) from risks      where model_id is not null) as risks_total,
  (select count(*) from risks r    join ai_models m on m.id = r.model_id) as risks_resolve,
  (select count(*) from incidents  where model_id is not null) as incidents_total,
  (select count(*) from incidents i join ai_models m on m.id = i.model_id) as incidents_resolve;
```
`*_total` must equal `*_resolve` for the module to pass the interlink gate.

## Compliance
- **EU AI Act — Art. 11 / Annex IV** (technical documentation): the detail Model Card exports an Annex IV package and a Model Card (JSON). Maps to `docs/compliance/eu-ai-act-mapping.md` (Art. 11 "Technical documentation → Audit chain + evidence export", Implemented).
- **EU AI Act — Art. 12** (record-keeping): the registry is the anchor for traceability. **Honest gap (TD-018):** `ai_models` has no `fn_audit_trigger` and `modelService.ts` makes no `logAction` call, so **registering, editing, or deleting a model writes no audit record with an actor**. The near-miss is that the legacy `model_inventory` table *is* trigger-audited while `ai_models` — the table the product actually uses — is not. This is an open P1 (`docs/reference/technical-debt.md` TD-018); it must be closed to satisfy the mapping's Art. 12 "Implemented" claim and the repo's own Gate 4. Note: some **detail-page** actions (linking a document, saving an alert config, initiating a review, exporting a package) *do* log to `model_activity` with the real actor — but the core registry writes do not.
- **EU AI Act — Art. 9** (risk management): the Drift Alerts banner surfaces the obligation when a model shows drift.
- **EU AI Act — Art. 14** (human oversight): registration captures the human-oversight flag, forced on for Annex III high-risk systems.
- **ISO/IEC 42001** — the registry is the AI-system lifecycle system of record, aligning with the AIMS lifecycle controls (A.6.2.x in `docs/compliance/iso-42001-mapping.md`). **Honest gap:** there is currently **no dedicated `ai_models` / Model Registry row** in the ISO mapping doc; this module should be added there rather than left implied.
- **NIST AI RMF** — MAP (inventory and context establishment) and GOVERN (accountable owners). **Honest gap:** not yet formally recorded in a compliance mapping doc; mark as to-be-mapped rather than claimed.

## Operations
- **Seeding / backfill.** Demo models are seeded by the `202608xx` demo migrations with fictional, labelled data; no personal data in fixtures. `org_id` is filled DB-side.
- **Empty state.** Honest — "No models registered yet" with a Register CTA; filtered-empty shows "No models match your filters."
- **Writes throw.** `upsertModel` / `deleteModel` throw on config/RLS/CHECK/network failure; the UI shows a real error toast and the dialog stays open. Success toasts fire only after the promise resolves.
- **Realtime.** The list is not realtime — React Query with `staleTime` 30 s, invalidated on mutation. The detail Performance data *is* push-updated via a Supabase Realtime channel (`useModelAnalytics`).
- **Known debt / gaps to track:**
  - **TD-018** — `ai_models` writes are not audit-logged (P1, open). See `docs/reference/technical-debt.md`.
  - **Fairness `0` vs `—`** — `recordToModel` defaults null `fairness_score` to `0`, so an unmeasured model shows `0%` in the list and is flagged "BELOW THRESHOLD" on the detail Model Card. This deviates from the platform rule that null renders `—`; a freshly-registered model with no fairness telemetry should read `—`/"not measured", not `0`. Flagged as a real UI gap.
  - **Unmeasured metrics** — `accuracy`, `latencyMs` default to `0` and `monthlyInferences` to `—` on the list view; the detail page substitutes live analytics where telemetry exists. Do not read these list defaults as measured values.
  - **TS/DDL drift** — `ModelRecord` declares `deployment_env`, `updated_at`, `is_active`, `requires_human_oversight` that are not in the repo `ai_models` DDL (they exist on the legacy `model_inventory` table). Reconcile the type with the schema, or add the columns via migration, before relying on them.
