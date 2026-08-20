# Module Interlink Gap Assessment — 2026-09-28

Full-platform audit of internal module interlinks, with deep dives on the
model-analytics surface and the data family (Datasets, Data Governance, Data
Lineage, Data Quality). Every claim below was verified against code
(file:line) or the live database during the audit; fixes shipped in the same
change are marked **FIXED**.

## 1. How an AI model links into the platform (the canonical flow)

`ai_models.id` (uuid) is the platform's one model id-space. A model enters
via Model Registry (`/models/inventory`), and everything else references it:

| From | Link mechanism | Direction |
|---|---|---|
| Controls | `controls.linked_model_ids uuid[]` + `?model=` filter chip | both |
| Risks | `linked_model_ids` / risk register model links | both |
| Evidence | `evidence.linked_models` | both |
| Use cases | use-case ↔ model links (AIIA group) | both |
| Bias audits | `bias_audits.model_id` (uuid FK) | both |
| Performance | `model_performance_metrics.model_id` (uuid FK) | inbound |
| Explainability | `model_explanations.model_id` (uuid FK) | inbound |
| Lineage/DNA | `model_dna.model_id` (uuid FK) | inbound |
| Datasets | `datasets.used_in_models text[]` (JS-matched, no FK) | dataset→model only |
| Vendors | model↔vendor via registry fields | partial |

Migration `20260825000004_unify_model_id_space` converted the four analytics
tables to hard uuid FKs → `ai_models(id)`.

## 2. Model Detail metrics — how they calculate

All four tabs read REAL tables through one hook (`useModelAnalytics`) over
one service (`modelAnalyticsService`), keyed by `ai_models.id`. None are
hardcoded; each renders an honest empty state when no rows exist.

| Tab | Table | Auto-calculation path |
|---|---|---|
| Performance | `model_performance_metrics` | Rows are pushed by telemetry: `POST /api/models/metrics` (id-keyed) writes them; the tab live-updates via a Supabase Realtime INSERT subscription. |
| Bias History | `bias_audits` | Rows come from the Bias Audits module, the BiasMonitor mesh sentinel (queues audits when coverage is stale/low), and now the Schedule button. Pass/fail derived as `overall_score >= threshold`. |
| Explainability | `model_explanations` | Newest row per model; `shap`/`lime` jsonb arrays rendered as charts. Writer: explainability jobs/agent. |
| Data Lineage | `model_dna` | Newest DNA row's `lineage` jsonb renders the provenance chain. |

**So "auto-calculate" means: the tabs render whatever the pipelines write.**
What exists today for the demo model is a seeded series (tagged
`{"source":"seed"}`); production numbers appear when the ingestion endpoint
receives real telemetry.

Findings:
- **FIXED — "Schedule Bias Audit" was fake.** The button only wrote an
  activity-log line (`model_activity`) and toasted success; no `bias_audits`
  row was ever created, so "No Bias Audits on Record" never changed. It now
  inserts a real `bias_audits` row (`status 'Queued'`, `triggered_by` actor)
  — the same shape the BiasMonitor sentinel queues — and invalidates the
  Bias History query so the tab updates immediately.
- **Open — proxy telemetry cannot land.** `sentinel/proxy.py` inserts
  `model_id` = model *name* into `model_performance_metrics`; since the
  id-unify migration made that a uuid FK, every insert fails and the failure
  is swallowed (debug log only). The id-keyed `POST /api/models/metrics` is
  the only working writer. Needs the proxy to resolve name→uuid before
  emitting.
- **Open — dead backend router.** `sentinel/api/bias_audit_router.py`'s
  "run" endpoint computes scores with `random.uniform()` and writes columns
  (`model_name`, `bias_score`) that don't exist on `bias_audits`. No
  frontend calls it. Retire or rebuild it.
- **Open — Model Card static sections.** "Bias & Fairness Metrics",
  "Framework Compliance" and "Active Guardrails" on the Model Card tab read
  mapper fields that are always empty — honest, but never populated.

## 3. Data family — flow, storage, gaps

**Yes, all four store real data.** No mock arrays; the only demo content is
seeded migration rows.

| Module | Route | Backing tables | Writes |
|---|---|---|---|
| Datasets | `/datasets`, `/datasets/:id` | `datasets` (+ `data_quality_assessments` on detail) | Real, throwing |
| Data Governance | `/data-governance` | `datasets` + `dsar_requests` | Real; DSAR "Delete" was broken — **FIXED** |
| Data Lineage | `/data-lineage` | projection of `datasets` (source, upstream_sources, preprocessing, SLA) | Real, throwing |
| Data Quality | `/data-quality` | `data_quality_assessments` (FK → datasets, FK → ai_models; proper RLS) | Real, throwing |

The clear flow: **register the dataset → link models on it
(`used_in_models`) → lineage edits the same dataset row's provenance fields
→ quality assessments attach to the dataset (and optionally a model) →
governance/DSAR reference the dataset by id.** Data Quality is the
best-wired of the four (hard FKs both ways, org RLS, `?dataset=` deep link
honored end to end).

Fixed in this change:
- **DSAR vocabulary mismatch** — the page wrote `'deletion'` while the DB
  check constraint allows only the six GDPR values; every Delete DSAR failed
  the insert, and legacy `erasure` rows rendered as "Access". Both maps
  corrected.
- **Datasets RLS replay parity** — live DB already scopes `datasets` with
  `datasets_org`, but the repo lineage still created `allow_all_datasets`
  (USING true) and never dropped it, so a from-zero replay shipped
  cross-org access. Migration `20260928000002` drops it and asserts the
  scoped policy.

Open gaps (owner: Platform team):
- Three dead deep links from DatasetDetail: `?dataset=` to
  `/data-governance`, `/data-lineage`, `/knowledge-graph` — none of those
  pages parse the param. Only `/data-quality?dataset=` works.
- Model→dataset direction missing: ModelDetail never lists the datasets that
  feed the model (Lineage tab reads `model_dna`, not `datasets`), even
  though `/datasets?model=` exists.
- `used_in_use_cases` is seeded and mapped but no page reads/writes it
  (KnowledgeGraph only).
- Data Governance Consent tab renders constants (`crossBorder`,
  `consentStatus`, `lawfulBasis` are phantom fields — always "Not
  Required"/"Legitimate Interest"/100%); a real `consent_records` service
  exists and should feed it.
- Data Governance duplicates the DSAR writer that `/dsr-management` already
  owns canonically; consolidate on `dsrRequestsService`.
- `datasets.id` is text and `used_in_models` is text[] — the dataset→model
  edge has no DB referential integrity (JS-matched only).
- DatasetDetail's "N open" quality badge is permanently 0 (`status` field
  doesn't exist on assessments).
- AssetManagement links `/data/datasets?open=` — route doesn't exist
  (should be `/datasets`).
- Data Quality scores are client-derived slider math labeled "Derived" —
  honest, but no automated pipeline writes them.

## 4. Platform-wide interlink status (roll-up)

Strong: model governance group, AIIA group, compliance group (controls ↔
models/risks/policies/evidence + the control crosswalk), privacy group
(RoPA/TIA/DPIA link datasets), TPRM (assessments/questionnaires/SLAs keyed
by vendor id, `?vendor=` chips), analytics tables (hard FKs).

Weak edges, in priority order:
1. Model → datasets (missing back-direction)
2. `used_in_use_cases` (dead column)
3. Dead deep links (3× from DatasetDetail, 1× from AssetManagement)
4. Consent data not feeding Data Governance
5. Proxy telemetry name/uuid mismatch (silent drop)
