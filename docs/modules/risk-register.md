# Risk Register

**Routes:** `/risks` (primary), `/risk/matrix`, `/risk-intelligence`
**Status:** Production
**Owner:** Risk & Compliance · **Backing table(s):** `risks` (org-scoped by `tenant_id`, RLS `risks_org_scoped`)

> The Risk Register lives at `/risks`. It shares the **Risk & Incidents** area with
> two sibling views: **Risk Matrix** (`/risk/matrix`) and **Risk Intelligence**
> (`/risk-intelligence`). The register itself also embeds a 5×5 heat map, so the
> matrix on this page and the standalone Risk Matrix page read the *same* `risks`
> rows — there is no parallel register. Legacy paths `/risk`, `/risk/register` and
> `/risk/:id` redirect/deep-link here (`App.tsx`).

## Purpose
The Risk Register is the central inventory of AI, model, data, operational,
compliance, security and third-party risks for one organisation. It is the
platform's primary risk artefact: every risk carries a likelihood, an impact, a
derived score with a band, a treatment/mitigation state, an owner and a review
cadence, and links out to the models, controls, incidents, remediation plans,
human-oversight reviews and financial quantifications that surround it.

## Why it exists
This module discharges **EU AI Act Article 9 — the risk management system**: the
obligation to establish, document, and *maintain over the lifecycle* a continuous
process that identifies, analyses, evaluates and treats the risks a high-risk AI
system poses, with the results kept as an auditable record. It also supports
**ISO/IEC 42001 clauses 6.1.2 (AI risk assessment) and 6.1.3 (AI risk
treatment)** and the **NIST AI RMF MAP / MEASURE / MANAGE** functions.

Without a live register there is no evidence that risks were ever identified,
scored, assigned to an owner, or driven to closure — the first thing an assessor
asks to see under Art. 9, and the record that makes the platform's autonomous
containment decisions (see *How it works*) reviewable rather than opaque.

## How it works

**A risk enters the register two ways.**

1. **Manually.** A user clicks **Add Risk**, fills the dialog (title, category,
   owner, likelihood, impact, description are required), and saves. The write
   goes through `useRisksData.saveRisk → riskService.upsertRisk`, which upserts
   the `risks` table. The service **dual-writes** canonical + legacy column pairs
   (`title`/`name`, `category`/`categories`, `impact`/`severity`,
   `status`/`mitigation_status`, `owner`/`action_owner`, `mitigation`/
   `mitigation_plan`) so every reader era sees the same value, and mints a
   business code `RSK-<year>-<nnnnn>` for new rows so the register never shows a
   raw id as identity. `tenant_id` is **never set by the client** — the DB
   default `current_user_org_id()::text` scopes the row
   (`20260814000008_risks_tenant_default.sql`).

2. **Autonomously, by the governance mesh** (`source = 'auto-agent'`,
   `auto_generated = true`). When a model is registered, `emitEvent` fires
   `MODEL_REGISTERED`; **`riskAssessmentAgent`** computes an initial
   likelihood/impact/severity from model type, data sensitivity and deployment
   scope (`calculateInitialRiskScore`) and inserts a risk titled
   `Auto: <model> — Initial AI Model Risk`, stamping provenance
   (`related_entity_type='model'`, `related_entity_id=<model uuid>`,
   `source_event_id`) and `linked_model_ids=[modelId]`, then emits
   `RISK_CREATED`. On a `RISK_DETECTED`/high-severity path, **`autoPauseAgent`**
   pauses the affected `ai_models` (`status='PAUSED'`), opens a
   `workflow_instances` containment row keyed to the risk, and emits
   `MODEL_PAUSED` with `reviewRequired: true`. `RISK_CREATED`/`RISK_DETECTED`
   fan out to further agents (`impactAnalysisAgent`, `remediationPlannerAgent`,
   `knowledgeGraphAgent`, `hitlAgent`, `evidenceCollectionAgent`) — see
   `agents/index.ts`.

**Lifecycle / state.** `status` (aliased `mitigation_status`) moves through
`open → assessed → in_progress → mitigated / accepted / closed`. A separate
`treatment` field records the ISO strategy (`accept | mitigate | transfer |
avoid`). A risk is treated as *settled* when its status matches
`mitigated|closed|resolved|accepted`; an unsettled risk past its `deadline`
renders **Overdue**, and past its `next_review_date` renders **Review overdue**
(both derived at render, not stored). Delete is a **soft delete**
(`is_deleted=true`), so a removed risk leaves the register but the row survives.

**Derived vs stored.** `likelihood`, `impact`, `residual_*`, `risk_score`,
`status`, `treatment`, `is_escalated`, KRI fields and the link arrays are stored.
The **score band** (Critical ≥20 / High 12–19 / Medium 6–11 / Low <6) is derived
everywhere from the single source of truth `riskService.scoreBand` — never
duplicated. `overdue` / `reviewOverdue` are derived. The score itself is stored
in `risk_score`; the base table also carries a generated `score` column
(`likelihood * GREATEST(impact, severity)`). The **History** tab is derived from
real `created_at` / `updated_at` timestamps only (no fabricated timeline) and
points to the Audit Trail for detailed change history.

**Human oversight (Art. 14).** Because agents auto-create risks and can auto-pause
models, every auto-created row is flagged `auto_generated=true` with a source and
a back-link so a human can *see and override* the machine decision. The detail
drawer's **HITL** tab surfaces `hitl_reviews` linked to the risk (blocking
reviews are badged), which is where that override is exercised.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| **Add Risk** | button | Opens the Register dialog (empty form) | On save → `upsertRisk` inserts into `risks`; success toast fires only after the write resolves; write throws → error toast, dialog stays open |
| **Export CSV** | button | Exports the **filtered** rows | Real `.csv` download `risk-register-<date>.csv`; disabled when nothing to export; toasts "Exported N risks" |
| **Total Risks** tile | KPI | Count of filtered rows | Relabelled `(filtered)` when any filter is active |
| **Critical / High** tile | KPI | Count where band is Critical or High | Static tile |
| **Mitigated** tile | KPI | Count of mitigated/closed/resolved | Static tile |
| **Open** tile | KPI | Count with status "open" | Static tile |
| **Escalated** tile | KPI toggle | Click toggles an **escalated-only** filter | `aria-pressed`; relabels "Escalated (filtering)"; narrows table, heat map and other tiles |
| **Risk Heat Map** | 5×5 grid | Plots each risk at (likelihood × impact); cell colour = band | Clicking a single-risk cell or a risk chip opens that risk's detail drawer |
| **Search** | filter | Matches title, uuid `id`, or business code `risk_id` | Narrows table + KPIs + heat map |
| **Category** | filter (select) | Narrows to one category (options derived from data) | — |
| **Model filter chip** | deep-link chip | Shown when `?model=<uuid>`; resolves to model **name** | Dismissible **✕** clears the filter; unresolved id shows "Unavailable" |
| **Row click / Eye** | table action | Opens the detail drawer (Sheet) | Sets `?open=<id>` is *not* written on click; `?open=` deep-link opens it on load |
| **Pencil** | row/drawer action | Opens the dialog pre-filled for edit | Save → `upsertRisk` with `id` (update) |
| **Trash** | row/drawer action | Opens `ConfirmDialog` | Confirm → `deleteRisk` soft-deletes; dialog stays open if the service throws |
| **Detail tabs** | tabs | Overview · Assessment · Treatment · Controls · Remediation · HITL · Financial · History | Each reads real, org-scoped rows filtered to this risk (see Interlinks) |

**Table columns** (`RiskRegisterNew.tsx`): Risk ID (`risk_id`, falls back to a
truncated `id`; a red flag marks escalated), Title (`title`), Category
(`category`), Models (`linked_model_ids` → model-name pill; **—** when none),
Likelihood, Impact, Risk Score (`risk_score` + band), Residual (`residual_l ×
residual_i` + band; **—** when unassessed), Owner (`owner`, "Unassigned" when
blank), Treatment Status (status/Overdue + optional "Review overdue"), Framework
Mapping (`applicable_frameworks`; **—** when none), and a row-actions cell.
Empty states are distinct: "No risks recorded yet" vs. "No risks match your
filters".

## Fields
Real schema — base table `20260418000002_core_grc_tables.sql`, extended by
`20260819000001_risk_incidents_canonical.sql` and
`20260816000010_autonomous_grc_provenance.sql`. **`risks.id` is `TEXT`, not
`uuid`** (production keys rows `risk-002`-style; see the README drift note), and
org scoping is the **`tenant_id` TEXT** column — this deliberately deviates from
the platform's uuid id-space for shared entities. Columns the UI reads/writes:

| Field | Type | Req. | Notes |
|---|---|---|---|
| id | text | pk | DB default `gen_random_uuid()::text`; **not** a uuid id-space |
| tenant_id | text | auto | Org scope; DB default `current_user_org_id()::text` — never set client-side; RLS `risks_org_scoped` |
| risk_id | text | — | Business code (e.g. `RSK-2026-00042`); display identity, mapped to `RiskItem.riskId` |
| title / name | text | yes | `title` is NOT NULL; service dual-writes both |
| description | text | yes (UI) | UI requires; column nullable |
| category / categories | text · text[] | — | Service writes both; read prefers `category`, falls back to `categories[0]` |
| likelihood | int 1–5 | — | CHECK 1–5, base default 1 |
| impact | int 1–5 | — | Canonical column; base table default 1 |
| severity | int 1–5 | — | Legacy alias of impact; agents write `severity`, service dual-writes |
| score | int | generated | `likelihood * GREATEST(impact, severity)` STORED (base table) |
| risk_score | int | — | Canonical stored score written by the UI (`likelihood × impact`) |
| risk_level | text | — | `critical|high|medium|low`; agents set from severity band |
| status / mitigation_status | text | — | `open|assessed|in_progress|mitigated|accepted|closed` |
| treatment | text | — | `accept|mitigate|transfer|avoid`; null = "Not decided" |
| owner / action_owner | text | yes (UI) | Dual-written; "Unassigned" when blank |
| mitigation_plan | text | — | Treatment plan free text (UI `mitigation`) |
| applicable_frameworks | text[] | — | Framework references; renders **—** when empty |
| residual_likelihood / residual_impact | int 1–5 | — | Nullable; residual score derived as their product |
| deadline | date | — | Treatment deadline; drives **Overdue** |
| next_review_date | date | — | Drives **Review overdue** |
| review_frequency | text | — | `monthly|quarterly|semiannual|annual` |
| is_escalated | bool | — | Default false; red flag + escalated filter |
| escalation_reason | text | — | Shown only when escalated |
| kri_metric / kri_threshold / kri_current_value | text · numeric · numeric | — | Key Risk Indicator; current ≥ threshold renders in destructive colour |
| linked_model_ids | text[] | fk | → `ai_models.id`; resolved to name, "Unavailable" if unresolved; drives `?model=` filter |
| linked_control_ids | text[] | fk | → controls; resolved to ref/name in Controls tab |
| linked_incident_ids | text[] | fk | → `incidents.id`; merged with the reverse `incidents.linked_risk_ids` |
| linked_vendor_ids | text[] | fk | → `vendors.id` (vendor-hub interlink) |
| source | text | — | `'auto-agent'` for mesh-created rows, else null/`manual` |
| auto_generated | bool | — | True for agent-created risks (Art. 14 provenance) |
| related_entity_type / related_entity_id | text · uuid | — | Back-link to the model/dataset/vendor that triggered the cascade |
| source_event_id | uuid | — | The `governance_events` row that caused the risk (replayable chain) |
| metadata | jsonb | — | Provenance / demo-seed marker; partial updates never blank it |
| is_deleted | bool | — | Soft-delete flag; register reads `is_deleted=false` |
| created_at / updated_at | timestamptz | auto | Drive the History tab |

## Interlinks
Both directions, resolved to names at render (raw ids never shown; "Unavailable"
when unresolved).

**Outbound** (from a risk):
- **Models** — `linked_model_ids` → `/models/inventory/:id` pills (table + Overview tab).
- **Incidents** — `linked_incident_ids` → `/risk/incidents?open=<id>`, *merged*
  with `incidents.linked_risk_ids` so the seam works whichever side wrote it.
- **Controls** — `linked_control_ids` → `/controls/:id` (Controls tab).
- **Remediation** — `remediation_plans.risk_id = this` → `/remediation-tracker?open=<id>` (Remediation tab).
- **HITL** — `hitl_reviews.linked_risk_id = this` → `/hitl/:id` (HITL tab).
- **Financial** — `financial_risks.linked_risk_id = this` (text key) → `/financial-risk?open=<id>` (Financial tab).
- **Audit** — History tab links to `/audit-trail`.

**Inbound** (reaching the register):
- **Model detail** — `ModelDetail.tsx` "Risk Register" BacklinkCard →
  `/risks?model=<uuid>`, which filters the register to that model (dismissible chip).
- **Command palette**, navigation (**Risk & Incidents → Risk Register**),
  setup checklists, and agent-emitted deep links all target `/risks`.

*Interlink proof:* the model→risk edge is provable with
`select count(*) total, count(*) filter (where m.id is not null) resolves
from risks r, unnest(r.linked_model_ids) lm(id) left join ai_models m
on m.id::text = lm.id` — `total` must equal `resolves`. Note the `id::text`
cast: `risks.id`/`linked_*_ids` are text, so cross-table joins to uuid-keyed
tables cast explicitly.

## Compliance
- **EU AI Act — Article 9 (risk management system):** this is the primary Art. 9
  artefact. **Honest gap:** in `docs/compliance/eu-ai-act-mapping.md` the Art. 9
  rows point to *Tasks*, *Eval Techniques*, *MCP Gateway* and *DPIA* — the Risk
  Register is **not** yet its own mapped module row. The 2026-08 compliance audit
  recorded it as **"mapped loosely"** only. This doc should be added as the
  explicit Art. 9 register row; until then the mapping under-represents the
  register's role.
- **EU AI Act — Article 14 (human oversight):** satisfied at the data layer —
  `auto_generated`, `source`, `related_entity_*` and `source_event_id` let a human
  identify and override an agent decision; the HITL tab exposes the review path.
- **EU AI Act — Article 12 (record-keeping / audit logging):** **gap.** The
  register does **not** call `logAction` on create/edit/delete — no `logAction`
  import exists in `RiskRegisterNew.tsx`, `riskService.ts` or `useRisksData.ts`.
  State changes are not written to the audit log from this module; the History tab
  only defers to the Audit Trail. This must be closed to meet Art. 12.
- **ISO/IEC 42001:** clauses **6.1.2** (AI risk assessment) and **6.1.3** (AI risk
  treatment); the register is not yet a named module row in
  `docs/compliance/iso-42001-mapping.md`.
- **NIST AI RMF:** MAP (identify), MEASURE (score/band), MANAGE (treat, escalate).

## Operations
- **Empty state:** honest — "No risks recorded yet" with an Add-Risk prompt;
  filtered-empty is a distinct "No risks match your filters".
- **Seeding:** demo risks are seeded canonically
  (`20260820000006_seed_risk_register_canonical.sql`) and carry a
  `metadata.demo_seed` marker; earlier seeds that populated `org_id` but not
  `tenant_id` are healed in the canonical migration.
- **Errors (writes throw):** Supabase misconfig → `"Supabase is not configured —
  risk data is unavailable"` (a hard error state, never a fake-empty register);
  save/delete failures surface `"Failed to save risk: <message>"` /
  `"Failed to delete risk: <message>"`. RLS rejects any row whose `tenant_id` ≠
  the caller's org.
- **Realtime:** none — React Query with `staleTime` 30s, invalidated on mutation.
  Not a live-subscription page.
- **Retention:** delete is soft (`is_deleted=true`); rows persist.
- **Known debt / gaps to track** (`docs/reference/technical-debt.md`):
  1. Art. 12 audit logging not wired (`logAction` absent from the register).
  2. Register not mapped as its own module row in either compliance doc ("mapped
     loosely").
  3. The Add/Edit dialog cannot set `linked_model_ids` / `linked_control_ids` /
     `linked_incident_ids` — those interlinks are populated only by agents or from
     the model/incident side, so a manually-created risk starts unlinked.
  4. `risks.id` is TEXT and org scope is `tenant_id`, deviating from the
     platform's uuid one-id-space first principle (deliberate, per the README
     drift note) — cross-table joins must cast `::text`.
