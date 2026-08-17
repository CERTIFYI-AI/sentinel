<!--
  SPDX-License-Identifier: Apache-2.0
  Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

  AI Assets group audit — generated 2026-08-14
  Branch: claude/modules-audit-akm64k
-->

# AI Assets Group — UI/UX + QA/QC Audit

**Date:** 2026-08-14
**Branch:** `claude/modules-audit-akm64k`
**Scope:** the AI ASSETS sidebar group (13 modules): Model Registry, Model
Lifecycle, Model DNA & Lineage, Use Cases, Agents, Agent Permissions, Agent
Choreography, Kill Switch, Datasets (Registry), Data Governance, Data Lineage,
Data Quality, Prompt Registry — plus Knowledge Graph.

Assessed against the five platform principles in `CLAUDE.md`: interlinked,
one id-space, real org-scoped backend, no fake success, no invented data.

---

## Verdict per module

| Module | Route | Backend | Verdict |
|---|---|---|---|
| Model Registry | `/models/inventory` | `ai_models` (uuid, RLS) | ✅ compliant (fixed in earlier phase) |
| Model Lifecycle | `/models/lifecycle` | `ai_models.lifecycle_stage` | ✅ compliant |
| Model DNA & Lineage | `/models/dna` | `ai_models` + relations | ✅ compliant |
| Use Cases | `/use-cases` | `use_cases` (RLS, 5 policies) | ✅ compliant |
| Agents | `/agents` | `agents`/`agent_registry` (RLS) | ✅ compliant (Agent Control phase) |
| Agent Permissions | `/agent-iam` | agent tables (RLS) | ✅ compliant |
| Agent Choreography | `/multi-agent` | `agent_workflows` (RLS, 6 policies) | ✅ compliant |
| Kill Switch | `/kill-switch` | `kill_switch_events` (RLS, 6 policies) | ✅ compliant |
| **Datasets (Registry)** | `/datasets` | was `datasetregistry_table` demo | 🔴 **was non-compliant — fixed this phase** |
| **Dataset Detail** | `/datasets/:id` | was static seed only | 🔴 **was non-compliant — fixed this phase** |
| **Data Lineage** | `/data-lineage` | was `datalineage_table` demo | 🔴 **was non-compliant — fixed this phase** |
| **Data Quality** | `/data-quality` | was `dataquality_table` demo | 🔴 **was non-compliant — fixed this phase** |
| Data Governance | `/data-governance` | `datasets` + `dsar_requests` | ✅ compliant (F-6 fixed) |
| Prompt Registry | `/prompt-registry` | `prompt_registry` (RLS, 5 policies) | ✅ compliant |
| Knowledge Graph | `/knowledge-graph` | live entity tables | ✅ compliant (F-7 fixed) |

## Findings

### F-1 (P0) — Dataset Registry ran entirely on a doc-jsonb demo table  **FIXED**
`DatasetRegistry.tsx` used `useSupabaseTable('datasetregistry_table', DATASETS)`:
un-scoped `(id, doc jsonb)` storage with `USING (true)` RLS, fabricated seed
rows written back to the DB, fire-and-forget writes (`.then(() => {}, () => {})`)
behind success toasts, `DS-00x`/`MDL-00x` business codes instead of uuids, and a
detail sheet with **invented** schema fields, GDPR checklist and audit history.
**Fix:** rewired to the canonical `datasets` table (the consolidation target per
`docs/architecture/db/schema_consolidation_plan.sql`) via a proper service +
React Query hooks; model links are `ai_models.id` uuids rendered as name pills
deep-linking to `/models/inventory/:id`; honors `?model=<uuid>` chip and
`?open=<id>`; writes throw and toasts fire only after the write resolves; all
invented content removed in favor of honest empty states.

### F-2 (P0) — Dataset Detail was 100 % static seed  **FIXED**
`DatasetDetail.tsx` read from `data/seed` `DATASETS`, with hardcoded per-dataset
schemas and a fabricated audit-history tab shown as fact.
**Fix:** loads the real record by id; Schema tab renders `schema_definition`
(honest empty state when undocumented); Linked Models resolves uuids to pills;
the invented audit tab is replaced by a Quality tab showing real
`data_quality_assessments` for the dataset.

### F-3 (P0) — Data Lineage was a demo table with invented flows  **FIXED**
`DataLineage.tsx` used `datalineage_table` with five fabricated lineage records
(fake source systems, SLAs, row counts) and free-text "downstream models".
**Fix:** rebuilt as a flow view over canonical `datasets`: upstream sources →
dataset (ingestion, transformations, SLA) → downstream models resolved from
`used_in_models` uuids. Lineage edits persist to the dataset record. Honors
`?model=<uuid>`.

### F-4 (P0) — Data Quality was a demo table with invented Art. 10 scores  **FIXED**
`DataQuality.tsx` used `dataquality_table` seeded with six fabricated
assessments displayed as measured compliance data.
**Fix:** new org-scoped `data_quality_assessments` table (migration
`20260814000001_datasets_canonical.sql`) with FKs to `datasets.id` and
`ai_models.id`, tenant default `current_user_org_id()`, and a real RLS policy.
Page records real assessments (dataset required, model optional), radar and
tiles compute from stored rows, derived overall/Art. 10 status is labeled
*derived*, and the empty state is honest. Honors `?dataset=<id>`.

### F-5 (P1) — `datasets.tenant_id` defaulted to `'default'`  **FIXED**
Inserts through RLS (`tenant_id = current_user_org_id()`) would have been
rejected or mis-scoped. The migration sets the column default to
`(current_user_org_id())::text` so the DB fills the scoping column, per the
`ai_models` discipline. Also added the missing governance columns
(record_count, encryption, retention_policy, last_audit_date, pii_types,
upstream_sources, ingestion_method, sla, schema_definition).

### F-6 (P1) — Data Governance DSAR creation was local-state only  **FIXED**
`handleCreateDSAR` appended to React state with a success toast and never
persisted; the asset delete handler and the "Register Data Asset" dialog were
no-op toasts, and consent-tab actions faked success.
**Fix:** DSARs persist to `dsar_requests` (migration
`20260814000003_dsar_requests_org_default.sql`, applied live, gives the table its
missing `org_id` DB default and a `dataset_id` FK to `datasets`); the DSAR
list maps real rows with overdue derived from `due_date`; per-dataset DSAR
counts are computed from the real link; asset delete soft-deletes the dataset;
"Register Data Asset" routes to the real Dataset Registry; fake consent
buttons are replaced by a link to the dataset record.

### F-7 (P2) — Knowledge Graph was hardcoded  **FIXED**
`KnowledgeGraph.tsx` rendered a fixed node/edge set, fabricated entity counts
(e.g. "847 controls"), invented causal-path "insights" and marketing copy
("1,200+ semantic relationships").
**Fix:** rebuilt from live entities — `ai_models`, `use_cases`, `datasets`,
`agent_gov_registry` — with edges derived only from stored link columns
(`used_in_models`, `used_in_use_cases`, `linked_model_ids`, `model_id`).
Nodes deep-link to their detail routes; counts are real; the paths tab shows
factual dataset→model→use-case chains with PII flags from `contains_pii`;
drawn-graph truncation is disclosed; honest empty states throughout.

### F-8 (P2) — Legacy dataset tables consolidated  **FIXED**
Code side: `dataGovernanceAgent.ts` repointed to canonical `datasets`
(links via `used_in_models`; consent reported UNKNOWN rather than asserted);
the dead `data_assets` service functions and hooks were removed.
DB side (migration `20260814000002_drop_legacy_dataset_tables.sql`, applied live
after the consolidation plan's verify step — repo-wide reference grep, live
row counts, inbound-FK check): dropped `"Dataset"`, `dataset_registry`,
`datasetregistry_table`, `datalineage_table`, `dataquality_table`,
`model_dataset_links`, `data_assets`. The two seed-only tables were archived
to `legacy_archive.*` first (revoked from API roles); the empty-table FKs
`"Model".datasetId` and `"BiasAudit".datasetId` were released.
`dataset_catalog_entries` is kept — actively used by the evals Dataset
Wizard / Data Explorer. Note: `sentinel/api/dataset_router.py` targets the
Python backend's own schema (column-incompatible with the dropped Supabase
table) and is unaffected.

## Changes shipped this phase

- `supabase/migrations/20260814000001_datasets_canonical.sql` — applied live:
  `datasets` org-default + governance columns; new `data_quality_assessments`
  (RLS org policy, FKs to `datasets`/`ai_models`).
- `dashboard/src/services/datasetService.ts` — rewritten for canonical tables;
  camelCase↔snake_case mapping; writes throw.
- `dashboard/src/hooks/useDatasetData.ts` — React Query hooks
  (`useDatasets`, `useDataset`, `useQualityAssessments`) with invalidation.
- Pages rewritten: `datasets/DatasetRegistry.tsx`, `datasets/DatasetDetail.tsx`,
  `DataLineage.tsx`, `DataQuality.tsx`; `data-governance/DataGovernancePage.tsx`
  repointed to the new hook with real field mapping.
- `npx tsc --noEmit` clean.
