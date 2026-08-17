# Energy Efficiency

**Route:** `/energy-efficiency` ·
**Backing:** `energy_metrics` (org-scoped RLS), citing `emission_factors` ·
**Code:** `dashboard/src/pages/EnergyEfficiency.tsx`,
`dashboard/src/services/energyService.ts`,
`dashboard/src/hooks/useEnergyData.ts`

## Purpose

Per-model electricity, accelerator and water draw for a period, with the
provenance of each reading attached: whether it came from a smart meter, a cloud
console, an API usage report, a third-party audit, or is a self-declared
estimate.

## Why it exists

kWh is the input the carbon figure is built on. If metered and estimated
readings are averaged together with nothing to tell them apart, the tonnage
downstream inherits an unstated uncertainty — and the efficiency conclusions
drawn from it are not defensible.

Before the rebuild the page wrote a `model` column that does not exist (the real
one is `model_name`), so every insert failed — and the service returned `null`
on error, so the page toasted a success anyway. The real `pue` column was never
read while a literal `1.3` was injected into the charts, and a `REGIONS` array
of invented PUE, renewable and score values (GCP 1.08 / 97 / 96 and similar) was
rendered as a scored panel with progress bars, with a recommendation telling the
user to migrate region on the strength of it. Efficiency was
`(tokens / kWh / 15000) × 100` — a magic denominator that gave every non-token
workload a red `0/100` which was then persisted and dragged into the average.
Seeds used two different scales (87.3 and 0.74) with no constraint, so half the
rows rendered as catastrophic in a `/100` UI.

## How it works

- Writes go through `energyService` and **throw** on failure; the success toast
  fires only after the write resolves. `org_id` is filled by the DB default
  `current_user_org_id()`.
- `model_id` is `ai_models.id`. `model_name` is kept only as the legacy display
  label and is never a uuid; a row with no `model_id` renders "Unavailable".
- **PUE is read from the column.** `pue` is the only PUE the UI may show. The
  injected literal and the invented per-region table are gone.
- **Measurement provenance travels with the reading.** `measurement_source` is
  one of `Smart Meter`, `Cloud Console`, `API Usage Report`,
  `Third-party Audit`, `Estimated`; `ESTIMATED_SOURCES` marks which are
  self-declared. The source is shown in the table, in the KPIs and in CSV
  export, so a metered aggregate is never silently mixed with estimates.
- **CO₂e is cited.** `co2e_kg` is accompanied by `emission_factor_id` and
  `grid_intensity_g_per_kwh`, so the conversion from kWh reconciles with the
  [Carbon Ledger](carbon-ledger.md) rather than sitting on a bare coefficient.
- `efficiency_score` is on a single 0–100 scale enforced by the DB constraint
  `energy_metrics_efficiency_scale_chk`; the migration normalised the legacy
  0–1 rows. It is null when not computed — there is no fallback constant.
- Nothing is coalesced to zero. `NULL` renders as an em-dash.
- Create, update and delete call `logAction` (EU AI Act Art. 12).
- `?model=<ai_models.id>` filters with a dismissible chip; a row click opens the
  reading's detail panel.

## Fields (`energy_metrics`)

Created by `20260421000004` and extended by `20260822000002`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `model_id` | uuid → `ai_models(id)` ON DELETE SET NULL | The canonical model link |
| `model_name` | text | **Legacy** display label only |
| `period` | text | |
| `gpu_hours` | numeric | |
| `kwh` | numeric | |
| `tokens_generated` | bigint | |
| `efficiency_score` | numeric | 0–100, CHECK `energy_metrics_efficiency_scale_chk`; null when not computed |
| `renewable_percent` | numeric | |
| `compute_provider` | text | |
| `measurement_source` | text | `Smart Meter` / `Cloud Console` / `API Usage Report` / `Third-party Audit` / `Estimated` |
| `pue` | numeric | The only PUE the UI shows |
| `accelerator_type` | text | |
| `gpu_utilization_percent` | numeric | |
| `region` | text | |
| `grid_intensity_g_per_kwh` | numeric | |
| `co2e_kg` | numeric | |
| `emission_factor_id` | uuid → `emission_factors(id)` ON DELETE SET NULL | Citation for any derived CO₂e |
| `instance_count` | integer | |
| `deployment_type` | text | `cloud` / `on_prem` / `hybrid` |
| `water_usage_m3` | numeric | |
| `notes` | text | |
| `metadata` | jsonb, default `{}` | |
| `recorded_at` | date, default `CURRENT_DATE` | |
| `created_at` / `updated_at` | timestamptz, default `now()` | |

The `emission_factors` field table is documented in
[`carbon-ledger.md`](carbon-ledger.md).

## Interlinks

Outbound:
- **Model** → `/models/inventory/<model_id>` (pill link; "Unavailable" when the
  id does not resolve).
- **Carbon records** → `/carbon-ledger?model=<model_id>`, so a reading reaches
  the emissions figure it feeds.
- **Emission factor** → the cited factor's source, year, version and region are
  rendered inline.

Inbound:
- `?model=<ai_models.id>` with a dismissible chip, from
  [Carbon Ledger](carbon-ledger.md) and [ESG Reports](esg-reports.md).
- `esg_reports.energy_metric_ids` cites the readings a disclosure reports on.
- `useModelBacklinks` queries `energy_metrics` by `model_id`, so a model's
  readings are reachable from the model. The migration backfilled `model_id`
  from the legacy `model_name`, which had stranded every reading outside the
  id-space.

## Compliance

Mapped in [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| ISO/IEC 42001 A.4.6 | Environmental impact of AI systems — energy, accelerator, PUE, water and grid intensity per model |
| EU AI Act Art. 12 | Reading lifecycle audit-logged via `logAction` |
| GHG Protocol scope 2 | Provides the activity data (kWh, region, grid intensity) the Carbon Ledger converts, with the factor cited |

**Out of scope for the EU AI Act.**
[`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
records sustainability disclosure as out of scope with the reason stated; the AI
Act imposes no energy-reporting obligation. Only Art. 12 record-keeping applies.

Org isolation: RLS on `org_id`, filled by the DB default. Demo readings belong
to the fictional demo tenant.

## Operations

- Service: `energyService.ts` — `fetchEnergyMetrics`, `upsertEnergyMetric`,
  `deleteEnergyMetric`, plus `MEASUREMENT_SOURCES` / `ESTIMATED_SOURCES`. All
  writes throw on error.
- Hook: `useEnergyData.ts`, invalidating `['energy-metrics']`.
- Migrations:
  `supabase/migrations/20260822000002_supply_chain_esg_canonical.sql` adds
  `model_id`, the accelerator/region/water columns, the emission-factor
  reference, the `current_user_org_id()` default and the efficiency-scale
  constraint (normalising the legacy 0–1 rows first);
  `…000003_seed_tprm_supply_esg.sql` backfills `model_id` from `model_name`.
