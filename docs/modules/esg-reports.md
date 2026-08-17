# ESG Reports

**Route:** `/esg-reports` ·
**Backing:** `esg_reports` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/EsgReports.tsx`,
`dashboard/src/services/esgService.ts`, `dashboard/src/hooks/useEsgData.ts`

## Purpose

Periodic sustainability disclosures for the AI estate: the framework and its
version, the reporting boundary and consolidation basis, the assurance status,
the approver, and — critically — the carbon records, energy readings and models
the report is built from.

## Why it exists

A disclosure is distinguished from a draft by three things: an approver, an
assurance position, and a citation trail to the records it reports on. Without
those it is a document, not a disclosure.

Before the rebuild `esgService` held three hardcoded **published** reports with
invented author names, scores of 88/92/95 and factual claims ("Reduced average
LLM inference power usage by 18%"), and returned them whenever a tenant's own
query came back empty — so a brand-new tenant saw fabricated published
disclosures as if they were its own. The page already had an honest empty state;
it could never be reached. `handlePublish` wrote nothing at all — no save, no
approver, no audit entry, just a "published successfully" toast that reverted on
reload. "Download Report" downloaded nothing. Three column names were wrong
(`published_date` vs `published_at`, `ai_specific_metrics` vs `ai_metrics`), so
the publication date always read "TBD" and the entire AI-Specific Metrics panel
was dead code hiding a real seeded payload. The status vocabulary existed in
four spellings across seeds and agents, leaving the KPI strip dead against half
the data and badging published reports as drafts.

## How it works

- The service reads only the tenant's own rows. **There is no seed fallback** —
  an empty org renders the honest empty state.
- **Status is a single lowercase vocabulary**: `draft` → `in_review` →
  `approved` → `published`, normalised by `normalizeStatus` on read so legacy
  `Published` / `DRAFT` rows land in the right bucket. The migration lowercased
  the stored values.
- **Transitions are governed writes.** `transitionEsgReport` stamps
  `approved_by` and `approver` from the **signed-in user** (never a hardcoded
  name) plus `approved_at`, and `published_at` on publish. It throws on failure,
  so the drawer stays open and shows the real error.
- **The evidence chain is explicit.** `carbon_record_ids`, `energy_metric_ids`
  and `model_ids` hold real uuids, rendered as resolved names linking to the
  records themselves. A report that cites nothing shows that it cites nothing.
- **Assurance is recorded, not implied**: `assurance_status`
  (`none` / `limited` / `reasonable`), `assurance_provider`, `assurance_date`.
  `framework_version` distinguishes GRI 2021 from GRI 2016 and ESRS E1 from its
  predecessors.
- `is_restatement` and `restatement_reason` make a corrected figure traceable
  rather than a silent overwrite.
- Scores are stored as entered and rendered as entered; null renders `—`, and a
  legitimate `0` is distinguishable from no-data. There is no composite score
  synthesised from free-entry inputs.
- `org_id` is filled by the DB default `current_user_org_id()`.
- Create, update, transition and delete call `logAction`
  (EU AI Act Art. 12).
- `?model=<ai_models.id>` filters to reports citing that model, with a
  dismissible chip; a row click opens the report drawer.

## Fields (`esg_reports`)

Created by `20260421000004` and extended by `20260822000002`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `title` | text NOT NULL | |
| `period` | text NOT NULL | e.g. `FY2026` |
| `period_start` / `period_end` | date | The reporting window |
| `framework` | text | GRI / SASB / CSRD ESRS / TCFD |
| `framework_version` | text | e.g. `GRI 2021` — the version actually applied |
| `status` | text, default `draft` | `draft` / `in_review` / `approved` / `published` (lowercase) |
| `author` | text | |
| `approver` | text | Display name of the signed-in approver |
| `approved_by` | uuid | The authenticated approver |
| `approved_at` | timestamptz | |
| `published_at` | timestamptz | Stamped on publish |
| `assurance_status` | text | `none` / `limited` / `reasonable` |
| `assurance_provider` | text | |
| `assurance_date` | date | |
| `reporting_boundary` | text | What the report covers |
| `consolidation_basis` | text | e.g. `operational_control` |
| `is_restatement` | boolean NOT NULL, default false | |
| `restatement_reason` | text | |
| `materiality_topics` | text[] NOT NULL, default `{}` | |
| `environmental_score` / `social_score` / `governance_score` | numeric | Stored as entered; null renders `—` |
| `overall_score` | numeric | |
| `scope1_tco2e` / `scope2_tco2e` / `scope3_tco2e` | numeric | GHG rollup |
| `carbon_record_ids` | uuid[] NOT NULL, default `{}` | → `carbon_records.id` |
| `energy_metric_ids` | uuid[] NOT NULL, default `{}` | → `energy_metrics.id` |
| `model_ids` | uuid[] NOT NULL, default `{}` | → `ai_models.id` |
| `document_id` | uuid | → `documents.id` (the report artefact) |
| `methodology` | text | |
| `highlights` | jsonb, default `[]` | |
| `ai_metrics` | jsonb, default `{}` | AI-specific metrics payload (the correct column name) |
| `metadata` | jsonb, default `{}` | |
| `created_at` / `updated_at` | timestamptz, default `now()` | |

## Interlinks

Outbound (all by uuid; unresolvable ids render "Unavailable"):
- **Carbon records** → each `carbon_record_ids` entry links to
  `/carbon-ledger?model=<model_id>`, labelled with the record's resolved name.
- **Energy readings** → each `energy_metric_ids` entry links to
  `/energy-efficiency?model=<model_id>`.
- **Models** → each `model_ids` entry links to `/models/inventory/<uuid>`.
- **Document** → `document_id` → `documents.id`.

Inbound:
- `?model=<ai_models.id>` with a dismissible chip; the page also offers chips
  through to that model's carbon records and energy readings.
- `useModelBacklinks` queries `esg_reports` by `model_ids`, so the disclosures
  covering a model are reachable from the model.

## Compliance

Mapped in [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| ISO/IEC 42001 A.2.4 | Objectives and reporting — framework version, boundary, consolidation basis, assurance, approver, restatement flag and the records cited |
| EU AI Act Art. 12 | Report lifecycle and status transitions audit-logged via `logAction` |
| EU AI Act Art. 14 | Approval and publication stamp the signed-in actor, replacing a toast that recorded nothing |
| CSRD / ESRS E1, GRI, TCFD-ISSB, SASB | The record carries the fields these frameworks require of a disclosure. Sentinel stores and evidences the disclosure; it does not itself certify conformity with any of them |

**Out of scope for the EU AI Act.**
[`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
records sustainability disclosure as out of scope with the reason stated. Only
Art. 12 record-keeping and Art. 14 human oversight of the approval apply.

Org isolation: RLS on `org_id`, filled by the DB default. Demo reports belong to
the fictional demo tenant; authors and approvers in seeds are role labels, never
named individuals.

## Operations

- Service: `esgService.ts` — `fetchEsgReports`, `upsertEsgReport`,
  `transitionEsgReport`, `deleteEsgReport`, plus `ESG_STATUSES`,
  `ESG_STATUS_LABEL`, `normalizeStatus`, `ASSURANCE_STATUSES`. All writes throw
  on error.
- Hook: `useEsgData.ts`, invalidating `['esg-reports']`.
- Migrations:
  `supabase/migrations/20260822000002_supply_chain_esg_canonical.sql` adds the
  assurance/approver/boundary columns, the citation arrays, the
  `current_user_org_id()` default and lowercases the stored status;
  `…000003_seed_tprm_supply_esg.sql` populates `carbon_record_ids` and
  `model_ids` for the demo tenant.
