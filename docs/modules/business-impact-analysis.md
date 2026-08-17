# Business Impact Analysis (BIA)

**Route:** `/bia` ·
**Backing:** `bia_records` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/BIA.tsx`,
`dashboard/src/services/biaService.ts`, `dashboard/src/hooks/useBiaData.ts`

## Purpose

The recovery objectives (RTO / RPO / MTD) and disruption impact of each business
process, linked to the assets the process depends on — so an outage can answer
what it costs and what it breaks.

## Why it exists

ISO 22301 8.2.2 requires a Business Impact Analysis. Before the 2026-08-25
rebuild the page read `bia_table (id, doc jsonb)` — a demo table with no tenant
column — and rendered an eight-row hardcoded `SEED`. Every seeded process
carried a fabricated `financialImpact24h` (e.g. `$5,200,000`), and the "Avg
RTO" KPI was derived from that fiction. AI-system dependencies were free-text
blocks ("model: GPT-4o Risk Scorer v2, fallback: Manual underwriting") that
reached no real model, and the impact-matrix likelihood scoring had no measured
source. All of it was removed, not relabelled.

## How it works

- **Real table, org-scoped.** `biaService` reads/writes `public.bia_records`;
  `org_id` filled by the DB default `get_org_id()`. Writes throw; reads throw
  (a failed query renders an `ErrorState`, not "no work to do").
- **Recovery objectives are entered as hours, and `null` renders `—`.** A
  process whose RTO has not been agreed shows an em-dash, never `0h` and never a
  green figure. Financial impact per hour is only ever a real, entered number.
- **Asset dependencies are the real interlink.** `linked_asset_ids` (uuid[]) is
  a checklist of `assets` in the register; a process is reachable from each
  asset, and each asset is resolvable to its name.
- **Every mutation is audited** via `logAction` (Art. 12).
- `?asset=<assets.id>` filters to the processes depending on that asset with a
  dismissible chip; `?open=<bia_records.id>` opens a record.

## Fields (`bia_records`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid, default `get_org_id()` | Tenant scope (DB-filled) |
| `bia_ref` | text | Human-readable ref (`BIA-001`) |
| `process_name` | text NOT NULL | |
| `department` | text | |
| `owner_id` | uuid → `user_profiles(id)` | Resolved to a name |
| `criticality` | text | `critical` / `high` / `medium` / `low` |
| `rto_hours` / `rpo_hours` / `mtd_hours` | numeric | `—` when null |
| `financial_impact_per_hour` | numeric | Real figure only; `—` when null |
| `reputational_impact` / `regulatory_impact` | text | |
| `dependencies` | text[] | Free-text upstream/downstream notes |
| `linked_asset_ids` | uuid[] → `assets(id)` | **The** dependency interlink |
| `linked_bcp_id` | uuid | Optional BCP plan |
| `last_reviewed_at` | date | |
| `created_at` / `updated_at` | timestamptz | |

## Interlinks (both directions)

- **Outbound:** each `linked_asset_ids` element deep-links to the asset
  (`/assets?open=<id>`).
- **Inbound:** the Asset Registry links here for a given asset
  (`/bia?asset=<id>`); an asset's `bia_rto_hours`/`bia_rpo_hours` are inherited
  from the BIA of its department (`20260817000001_admin_group_asset_bia_
  interlinks.sql`). `?open=<id>` opens a record.

## Compliance

- ISO 22301:2019 8.2.2 (BIA), ISO/IEC 27031 (ICT readiness).
- NIST SP 800-34 (contingency planning); DORA Art. 11–12 (recovery objectives).
- EU AI Act Art. 12 audit logging via `logAction`.

## Operations

CSV export includes the resolved asset names. Impact figures are only present
when entered — the module deliberately shows an em-dash rather than a plausible
default, so a regulator never reads a number that has no provenance.
