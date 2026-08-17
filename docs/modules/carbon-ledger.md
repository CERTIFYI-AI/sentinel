# Carbon Ledger

**Route:** `/carbon-ledger` ·
**Backing:** `carbon_records` (org-scoped RLS) + `emission_factors` (global
reference catalog, read-only to `authenticated`) ·
**Code:** `dashboard/src/pages/CarbonLedger.tsx`,
`dashboard/src/services/carbonRecordsService.ts`,
`dashboard/src/services/emissionFactorService.ts`,
`dashboard/src/hooks/useCarbonRecordsData.ts`,
`dashboard/src/hooks/useEmissionFactors.ts`

## Purpose

Per-model greenhouse-gas accounting for AI workloads: training and inference
emissions for a reporting period, the energy behind them, the GHG Protocol scope
they belong to, and the offset and assurance detail that a disclosure needs.

## Why it exists

CSRD/ESRS E1, the GHG Protocol and ISO 14064-1 all require a figure to carry its
basis: the emission factor used, its source and year, the scope it falls under,
and whether the number was measured, calculated or estimated. A bare tonnage is
not a disclosure.

Before the 2026-08-16 rebuild the ledger could not persist anything. The
`carbon_records` table had only the generic 18-column shell — none of the 13
domain columns the page wrote existed, so PostgREST rejected every insert and
the service swallowed the error and reported success. The service also wrote a
client-supplied `tenant_id`, a column that had been dropped. Every numeric read
coalesced to `0`, so the seeded rows rendered a headline of "Net Emissions 0.0
tCO₂e" and "Budget Utilization 0%" — which reads as carbon neutral. The
efficiency score was `renewable × 0.5 + (1 − total/200) × 50` with a bare
fallback of `50`, persisted and rendered as "{n}/100" beside the verdict
"✓ Efficient — no action required". The underlying coefficients (320 kg per
billion parameters, 0.00085 kg per inference) had no source, region or version.

## How it works

- Writes go through `carbonRecordsService`, which **throws** on failure; the
  success toast fires only after the write resolves. `org_id` is filled by the
  DB default `current_user_org_id()` — the client never sends a scoping column
  and never sends `tenant_id`.
- **Nothing is coalesced to zero.** Numbers are stored as given and read back as
  given; `NULL` means "not reported" and renders as an em-dash. An unmeasured
  carbon figure is not "0.0 tCO₂e".
- **Every figure declares its basis.** `measurement_method` is one of
  `measured` / `calculated` / `estimated` and is declared by the recorder, never
  inferred. `emission_factor_id` cites a row in `emission_factors`, which
  carries the factor value, unit, region, source, source URL, published year and
  version. `emissionFactorService.citeFactor` renders that citation next to the
  figure, and an `estimated` figure is labelled as an estimate wherever it is
  shown, including in CSV export.
- **Scope is explicit**, including the market-based vs location-based split for
  scope 2 (`scope_1` / `scope_2_market` / `scope_2_location` / `scope_3`).
- `model_id` is `ai_models.id`. Legacy rows with a null `model_id` render
  "Unavailable", never a raw uuid.
- Create, update and delete call `logAction` (EU AI Act Art. 12).
- `?model=<ai_models.id>` filters with a dismissible chip; a row click opens the
  record detail panel.
- Loading renders a skeleton, failure a real error state, an empty org an honest
  empty state.

## Fields (`carbon_records`)

Created by the `functional_integration` generic shell and extended by
`20260822000002`. `tenant_id` was dropped by the ws01 tenancy unification.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `name` / `title` / `description` | text | Shell columns; the page uses `title` |
| `status` | text, default `active` | Shell column |
| `type` / `severity` / `owner` | text | Shell columns |
| `assignee_id` / `created_by` / `updated_by` | uuid | Shell columns |
| `model_id` | uuid → `ai_models(id)` ON DELETE SET NULL | Resolved to the model name at render time |
| `period` | text | e.g. `2026-Q1` |
| `period_start` / `period_end` | date | The reporting window |
| `training_emissions` | numeric | tCO₂e; null renders `—` |
| `inference_emissions` | numeric | tCO₂e; null renders `—` |
| `total_emissions` | numeric | tCO₂e |
| `energy_kwh` | numeric | |
| `renewable_percent` | numeric | |
| `compute_provider` | text | |
| `region` | text | |
| `offset_tco2e` | numeric | |
| `net_emissions` | numeric | |
| `verified` | boolean NOT NULL, default false | Set only when third-party assurance is recorded |
| `efficiency_score` | numeric | Null when not computed — no fallback constant |
| `measurement_method` | text | `measured` / `calculated` / `estimated` — declared, never inferred |
| `emission_factor_id` | uuid → `emission_factors(id)` ON DELETE SET NULL | Cites the factor behind a derived figure |
| `ghg_scope` | text | `scope_1` / `scope_2_market` / `scope_2_location` / `scope_3` |
| `gpu_hours` | numeric | |
| `tokens_processed` | bigint | |
| `accelerator_type` | text | e.g. `NVIDIA A100` |
| `pue` | numeric | Power Usage Effectiveness of the facility |
| `water_usage_m3` | numeric | |
| `offset_registry` / `offset_serial` | text | Retirement traceability |
| `offset_vintage_year` | integer | |
| `offset_retired_at` | date | |
| `assurance_body` | text | |
| `assurance_date` | date | |
| `methodology` | text | How the figure was arrived at, in prose |
| `metadata` / `payload` | jsonb NOT NULL, default `{}` | Shell columns |
| `tags` | text[], default `{}` | |
| `created_at` / `updated_at` | timestamptz NOT NULL, default `now()` | |

## Fields (`emission_factors`)

A global reference catalog, not tenant data: RLS is enabled with a
`FOR SELECT TO authenticated USING (true)` read policy and no write policy.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `factor_ref` | text UNIQUE | e.g. `EF-GRID-US` |
| `name` | text NOT NULL | |
| `factor_value` | numeric NOT NULL | |
| `factor_unit` | text NOT NULL | `kgCO2e/kWh` / `kgCO2e/1B-params` / `kgCO2e/inference` |
| `region` | text | |
| `grid_intensity_g_per_kwh` | numeric | |
| `source` | text NOT NULL | e.g. `EPA eGRID`, `IEA Emissions Factors` |
| `source_url` | text | |
| `published_year` | integer | |
| `version` | text | e.g. `2024.1` |
| `is_system` | boolean NOT NULL, default true | |
| `created_at` | timestamptz NOT NULL, default `now()` | |

## Interlinks

Outbound:
- **Model** → `/models/inventory/<model_id>` (pill link; "Unavailable" when the
  id does not resolve).
- **Energy readings** → `/energy-efficiency?model=<model_id>`, so the kWh behind
  the tonnage is one click away.
- **Emission factor** → the cited factor's source, year, version and region are
  rendered inline with the figure.

Inbound:
- `?model=<ai_models.id>` with a dismissible chip, from
  [Energy Efficiency](energy-efficiency.md) and [ESG Reports](esg-reports.md).
- `esg_reports.carbon_record_ids` cites the records a disclosure reports on, so
  a published report reaches its underlying ledger rows.
- `useModelBacklinks` queries `carbon_records` by `model_id`, so a model's
  carbon records are reachable from the model.

## Compliance

Mapped in [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| ISO/IEC 42001 A.4.6 | Environmental impact of AI systems — GHG scope, cited emission factor, measurement method, PUE, accelerator type, water usage |
| EU AI Act Art. 12 | Record lifecycle audit-logged via `logAction` |
| GHG Protocol / ISO 14064-1 / CSRD ESRS E1 | Scope tagging, factor citation and offset retirement detail support these disclosures. The platform records the data; it does not itself assert conformity with them |

**Out of scope for the EU AI Act.**
[`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
records sustainability disclosure as *out of scope with the reason stated* —
the AI Act imposes no emissions-disclosure obligation. The only AI Act row that
applies here is Art. 12 record-keeping. No article is invented for it.

Org isolation: RLS on `org_id`, filled by the DB default. Demo records belong to
the fictional demo tenant; `CR-2026-Q2` is deliberately seeded as `estimated` so
the estimate labelling is exercised.

## Operations

- Service: `carbonRecordsService.ts` — `fetchCarbonRecords`,
  `fetchCarbonRecord`, `upsertCarbonRecord`, `deleteCarbonRecord`; all throw on
  error. `emissionFactorService.ts` — `fetchEmissionFactors`, `citeFactor`,
  `factorIndex`.
- Hooks: `useCarbonRecordsData.ts` (invalidates `['carbon-records']`),
  `useEmissionFactors.ts` (`['emission-factors']`).
- Migrations:
  `supabase/migrations/20260822000002_supply_chain_esg_canonical.sql` adds the
  domain columns, the emission-factor catalog and the
  `current_user_org_id()` default;
  `…000003_seed_tprm_supply_esg.sql` seeds the factor catalog and the demo
  records.
