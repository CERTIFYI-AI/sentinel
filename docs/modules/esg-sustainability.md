# ESG & Sustainability — overview

**Scope:** the umbrella page for the sustainability cluster. Each module below
has its own doc with the field table, both directions of interlink and its
compliance mapping; this page covers what they add up to. ·
**Routes:** `/carbon-ledger`, `/energy-efficiency`, `/esg-reports`,
`/model-efficiency`, `/financial-risk`

> This page previously listed a `/esg` route that does not exist, named
> `carbonRecordsService.ts` as the cluster's only service, and described fields
> (PUE, grid intensity, water usage) that existed in neither the table nor the
> UI. Those fields exist in the schema now — see the per-module docs — and the
> route list above matches `dashboard/src/App.tsx`.

## Purpose

Track the environmental footprint of the AI estate — energy, compute, water and
carbon — with enough provenance on each figure to survive a disclosure review,
and map AI financial exposure for internal risk reporting.

## The modules

| Module | Route | Backing table |
|---|---|---|
| [Carbon Ledger](carbon-ledger.md) | `/carbon-ledger` | `carbon_records` + `emission_factors` |
| [Energy Efficiency](energy-efficiency.md) | `/energy-efficiency` | `energy_metrics` |
| [ESG Reports](esg-reports.md) | `/esg-reports` | `esg_reports` |
| [Financial Risk](financial-risk.md) | `/financial-risk` | `financial_risks` |

`/model-efficiency` is a per-model efficiency view over the same energy
readings.

## What each figure carries

The 2026-08-16 rebuild made the *basis* of every number part of the record,
because the previous implementation derived carbon from bare coefficients (320
kg per billion parameters, 0.00085 kg per inference) with no source, region or
version, and never labelled the result as an estimate.

- **Measurement method** — `carbon_records.measurement_method` is `measured`,
  `calculated` or `estimated`, declared by the recorder and never inferred.
  `energy_metrics.measurement_source` distinguishes a smart meter or cloud
  console reading from a self-declared `Estimated` one, and that distinction
  travels into the table, the KPIs and the CSV export.
- **Emission factor** — `emission_factor_id` cites a row in `emission_factors`
  carrying the factor value, unit, region, **source**, source URL, **published
  year** and **version** (e.g. EPA eGRID 2024, version 2024.1). A derived figure
  is not shown without its citation.
- **GHG scope** — `ghg_scope` is explicit, including the market-based vs
  location-based split for scope 2.
- **PUE, grid intensity and water** — `carbon_records.pue`,
  `carbon_records.water_usage_m3`, `energy_metrics.pue`,
  `energy_metrics.grid_intensity_g_per_kwh` and
  `energy_metrics.water_usage_m3` are real columns read from the row. The
  literal `1.3` PUE that was previously injected into charts, and the invented
  per-region PUE/renewable/score table, are gone.
- **Assurance and offsets** — `assurance_body`, `assurance_date`,
  `offset_registry`, `offset_serial`, `offset_vintage_year` and
  `offset_retired_at` make an offset claim traceable to a retirement.

## What the cluster does not claim

- **Null is not zero.** Nothing is coalesced on read or write. An unmeasured
  carbon figure renders as an em-dash, never "0.0 tCO₂e" — which reads as carbon
  neutral. A legitimate zero remains distinguishable from no-data.
- **No fabricated disclosures.** `esgService` no longer serves seeded published
  reports to an empty tenant; an org with no reports sees the honest empty
  state.
- **No synthesised scores.** Efficiency and ESG scores are stored as recorded
  and null when not computed. The magic denominators and fallback constants
  (`50`, `15000`) are removed.
- **Framework alignment is a data claim, not a certification.** The records
  carry the fields GHG Protocol, ISO 14064-1, CSRD/ESRS E1, TCFD-ISSB and SASB
  require of a disclosure. Sentinel stores and evidences the disclosure; it does
  not certify conformity with any of those frameworks.

## Compliance

Mapped in [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability":
**A.4.6** (environmental impact of AI systems) for the carbon and energy
modules, **A.2.4** (objectives and reporting) for ESG Reports.

**Out of scope for the EU AI Act, with the reason recorded.**
[`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
carries an explicit out-of-scope row for sustainability disclosure: the AI Act
imposes no emissions or energy reporting obligation, and these modules serve
CSRD/ESRS E1, the GHG Protocol and ISO 14064-1, which that document does not
map. The only AI Act obligations that apply are **Art. 12** record-keeping
(every module calls `logAction`) and **Art. 14** human oversight of the ESG
report approval. No article is invented to fill the gap.

## Financial Risk

Maps AI financial exposure (vendor concentration, model-risk capital,
incident-loss forecast) to the Risk Register and the CISO dashboard. Vendor
concentration is computed from real `vendors.annual_spend` — see
[Vendor Registry](vendor-registry.md).

## Cross-cutting operations

- `org_id` is filled by the DB default `current_user_org_id()` on
  `carbon_records`, `energy_metrics` and `esg_reports`; the client never sends a
  scoping column, and RLS is org-scoped. `emission_factors` is a global
  reference catalog with a read-only policy and no tenant data.
- All three services throw on write failure; success toasts fire only after the
  write resolves.
- Every record is keyed to `ai_models.id` (`carbon_records.model_id`,
  `energy_metrics.model_id`, `esg_reports.model_ids`), so
  `useModelBacklinks` surfaces a model's carbon records, energy readings and
  ESG disclosures from the model itself.
- Demo data is fictional and belongs to the "Acme Financial Services" demo
  tenant; authors, approvers and owners are role labels, never named
  individuals.
- Migrations:
  `supabase/migrations/20260822000002_supply_chain_esg_canonical.sql`,
  `…20260822000003_seed_tprm_supply_esg.sql`.
