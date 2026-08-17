# Business Impact Analysis

**Route:** `/bia` · **Table:** `bia_processes` · **Service:** `dashboard/src/services/resilienceService.ts` · **Hook:** `useBiaData` (`useAdminData.ts`)

## Purpose

The recovery objectives the business has agreed per process: RTO (how long it
can be down), RPO (how much data loss is tolerable), MTPD (maximum tolerable
period of disruption), plus the criticality that justifies them. This register
is the **source** of recovery objectives — the Asset Registry displays
RTO/RPO copied from here by department and does not edit them.

## Why it exists

ISO 22301 / ISO 27001 A.5.29-A.5.30 continuity planning, and ISO/IEC 42001's
expectation that the availability impact of AI systems is understood. A BIA
that cannot name what actually stops working is prose, not analysis.

## How it works

The page (`pages/BIA.tsx`) reads and writes the org-scoped `bia_processes`
table through `resilienceService` (writes throw; `logAction` on every
mutation). Until 2026-08-23 it read the `bia_table` demo table with eight
fictional processes and invented "financial impact / 24h" dollar figures;
those fabricated metrics were removed entirely rather than relabelled —
the platform does not display invented numbers as measured.

`criticality` uses the lowercase vocabulary enforced by CHECK constraint
(`20260823000001`). `tenant_id` is filled by the DB default
`current_user_org_id()`.

## Fields

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `tenant_id` | uuid NOT NULL | DB default `current_user_org_id()` |
| `ref_code` | text | Citable reference (`BIA-NNN`) |
| `business_process` | text NOT NULL | |
| `department` | text | Join key used to source assets' RTO/RPO |
| `criticality` | text | CHECK: critical / high / medium / low |
| `rto_hours`, `rpo_hours`, `mtpd_hours` | numeric | |
| `linked_asset_ids` | uuid[] | Assets this process runs on (GIN indexed) |
| `linked_model_ids` | uuid[] | Registry models reached through those assets |

## Interlinks

- **Outbound:** `linked_asset_ids` → `assets.id` (proven 8/8, 2026-08-23);
  `linked_model_ids` → `ai_models.id` (proven 3/3). Chips navigate to the
  Asset Registry and `/models/inventory/:id`.
- **Inbound:** `assets.bia_rto_hours`/`bia_rpo_hours` are copied from this
  table by department (`20260817000001`), so every asset displaying a recovery
  objective traces back here.

## Compliance

ISO 27001 A.5.29–A.5.30; ISO/IEC 42001 6.1 (impact of AI system unavailability).
Mutations audit via `logAction` (module `bia`).

## Operations

No scheduled jobs. Note for reviewers: `bia_processes` is part of the live
baseline gap (created on the live project before the repo's migration
discipline); statements touching it in migrations are guarded with
`to_regclass` per `supabase/migrations/README.md`.
