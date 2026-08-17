# Vendor Registry

**Route:** `/vendors` (list) and `/vendors/:id` (detail) ·
**Backing:** `vendors` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/vendors/VendorRegistry.tsx`,
`dashboard/src/pages/vendors/VendorDetail.tsx`,
`dashboard/src/services/vendorService.ts`, `dashboard/src/hooks/useVendorsData.ts`

## Purpose

The governed inventory of third parties — model providers, cloud and hosting
platforms, data processors and sub-processors — and the single record each
vendor assessment, SLA, questionnaire, document and attestation hangs off.

## Why it exists

Third-party risk is the largest uncontrolled surface in most AI estates: the
organisation is accountable under EU AI Act Art. 25 and GDPR Art. 28 for what its
suppliers do with its data and models, and can only demonstrate that with a
record per vendor carrying inherent vs residual risk, the state of the DPA, the
certification expiries and the exit plan.

Before the 2026-08-16 rebuild this module was structurally incapable of that.
`vendors.org_id` was `NOT NULL` with no DB default, so every client insert died
on `23502`; five columns the service wrote (`criticality`, `score`,
`dpa_status`, `services`, `ai_use`) did not exist; and the detail page resolved
against a seed array keyed `V-001`…`V-012`, so a real record opened as "Vendor
not found". The registry also rendered a hardcoded concentration chart and
accused every vendor of a "GDPR Art. 28 violation" because the missing
`dpa_status` column coalesced to `not_signed`.

## How it works

- The list reads `vendors` through `vendorService.fetchAllVendors`; rows carry
  criticality, inherent/residual risk, DPA state and reassessment due date.
  Reads and writes **throw** on failure; success toasts fire only after the
  write resolves.
- `org_id` is filled by the DB default `current_user_org_id()`. The client never
  sends a scoping column.
- Row click and the view action navigate to `/vendors/<vendors.id>` — the uuid,
  never a business code. `VendorDetail` loads that uuid from the table.
- **Concentration** comes from `vendorService.fetchVendorConcentration`, computed
  over real `annual_spend` and vendor counts. The previous hardcoded
  "OpenAI 45% / Anthropic 30%" chart and its threshold warning are gone.
- **Risk tier**: `risk_tier` is the legacy `integer` column (1/2/3). The service
  reads and writes `risk_tier_label` (`critical`/`high`/`medium`/`low`), which
  the migration backfilled from the integer so the two representations agree.
- Null renders as an em-dash, never `0` — a vendor that has never been scored
  shows `—`, not "Score 0". Unresolvable ids render "Unavailable".
- `?model=<ai_models.id>` filters the list to vendors whose `linked_models`
  contains that uuid, with a dismissible chip naming the model (or
  "Unavailable" if the id does not resolve).
- Every create, update and delete calls `logAction` (EU AI Act Art. 12). The
  previous implementation called it zero times across all six vendor pages.
- Loading renders a skeleton, load failure a real error state with retry, an
  empty org an honest empty state.
- **Edit sheet** (`dashboard/src/pages/vendors/VendorEditSheet.tsx`, opened
  from the detail page's "Edit profile" action) is the write path for the full
  TPRM field model — Risk & Data (inherent/residual risk, classification,
  access level, regions, transfer mechanism), Assurance (DPA status/dates,
  SOC 2 / ISO expiries, last pentest), Lifecycle (reassessment cadence and due
  date, exit plan, criticality), Commercial (contract start, renewal notice,
  spend, insurance) plus sub-processor count and fourth-party exposure. Before
  it existed, 28 of the 36 TPRM columns had no write path at all: `toRow`
  mapped them but no form sent them, so on a real tenant those facts could
  only ever come from the demo seed. Blank inputs are written as NULL — the
  read side keeps rendering `—`, never 0. Writes go through
  `vendorService.updateVendor` (throws); the dialog closes only on success.
- The edit sheet also carries the **model picker for `linked_models`** — a
  multi-select of real registered models storing `ai_models.id` uuids. This is
  the control the concentration analysis (and the `?model=` deep-link filter)
  reads from; unresolvable stored ids show "Unavailable" and are preserved
  unless explicitly unticked.
- **Backlinks** (`dashboard/src/hooks/useVendorBacklinks.ts`): the detail
  page's Linked tab lists every inbound reference — AIBOM records,
  supply-chain attestations (queried through the
  `supply_chain_attestation_status` view so validity is the derived value,
  never an authored label), provenance nodes, risk register entries
  (`risks.linked_vendor_ids`), incidents (`incidents.vendor_id`) and security
  threats (`security_threats.vendor_id`) — with counts, per-record deep links
  and view-all links. Each source is queried independently; a failing source
  reports "Unavailable" instead of blanking the panel, an empty one says "No
  records reference this vendor".

## Fields (`vendors`)

`tenant_id` was dropped by the ws01 tenancy unification
(`20260421000008`); `org_id` is the only scoping column.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key — **the** vendor id used platform-wide |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `name` | text NOT NULL | Display name |
| `vendor_name` | text | Legacy alias column |
| `category` | text, default `Foundation Model` | |
| `description` / `what_does_vendor_provide` | text | |
| `services` | text | What the vendor supplies, in prose |
| `ai_use` | text | e.g. `foundation_model`, `cloud_platform` |
| `website` | text | |
| `status` | text, default `Active` | |
| `risk_tier` | integer, default 2 | **Legacy** numeric tier; kept for back-compat |
| `risk_tier_label` | text | `critical`/`high`/`medium`/`low` — CHECK `vendors_risk_tier_label_chk`; backfilled from `risk_tier` |
| `tier` | text | Legacy free-text tier |
| `criticality` | text | `critical`/`high`/`moderate`/`low` — CHECK `vendors_criticality_chk` |
| `inherent_risk` / `residual_risk` | text | Risk before and after controls |
| `score` | numeric | Assessment score; null renders `—` |
| `risk_score` | numeric | Written by `vendorRiskAgent` |
| `compliance_score` | numeric(5,2) | Legacy |
| `concentration_risk` | numeric | Computed portfolio exposure |
| `risk_flag` | boolean NOT NULL, default false | Agent-set attention flag |
| `data_classification` | text | e.g. `confidential` |
| `data_access_level` | text | e.g. `processes_customer_data`, `hosts_infrastructure` |
| `data_regions` | text[] NOT NULL, default `{}` | Data residency |
| `transfer_mechanism` | text | `SCC` / `BCR` / `adequacy` / `none` |
| `dpa_status` | text | `signed`/`pending`/`not_signed`/`not_required` — CHECK `vendors_dpa_status_chk` |
| `dpa_signed_at` / `dpa_expires_at` | date | |
| `has_data_sharing_agreement` | boolean | Legacy boolean |
| `soc2_certified` / `iso_certified` | boolean | Legacy booleans |
| `soc2_expires_at` / `iso_expires_at` | date | Certification expiry — what actually drives freshness |
| `last_pentest_at` | date | |
| `breach_history_count` | integer NOT NULL, default 0 | |
| `last_breach_summary` | text | |
| `sla_breach_flag` | boolean NOT NULL, default false | Set by `vendorCascadeAgent` |
| `last_breach_at` | timestamptz | |
| `subprocessor_count` | integer | |
| `fourth_party_exposure` | text | |
| `exit_plan_status` / `exit_plan_notes` | text | Offboarding readiness |
| `reassessment_cadence_months` | integer | |
| `reassessment_due_at` | date | Drives the TPRM reassessment calendar |
| `last_assessed_at` | timestamptz | |
| `last_assessment` | date | Legacy |
| `due_diligence_status` | text | |
| `business_owner` / `vendor_manager` | text | Role labels, not named individuals |
| `contract_start` | date | |
| `contract_expiry` | timestamptz | |
| `renewal_notice_days` | integer | |
| `annual_spend` | numeric | |
| `spend_currency` | text NOT NULL, default `USD` | |
| `insurance_coverage` | text | |
| `contact_info` | jsonb | |
| `contact_email` | text | |
| `linked_models` | jsonb, default `[]` | **`ai_models.id` uuids** — the `?model=` filter matches against this |
| `linked_agents` | jsonb, default `[]` | |
| `metadata` | jsonb, default `{}` | |
| `created_by` / `updated_by` | uuid | |
| `created_at` / `updated_at` | timestamptz | |

## Interlinks

Outbound (all by uuid, display name resolved at render time):
- **Vendor detail** → `/vendors/<vendors.id>`.
- **Assessments** → `/vendors/assessments?vendor=<vendors.id>` (and
  `&open=<vendor_assessments.id>` for a specific record).
- **SLAs** → `/vendors/sla?vendor=<vendors.id>` (`&open=<vendor_slas.id>`).
- **Documents** → `/vendor-upload?vendor=<vendors.id>` (`&open=<vendor_documents.id>`).
- **Questionnaire** → `/vendors/<vendors.id>/questionnaire`.
- **Models** → `linked_models` entries resolve to `/models/inventory/<uuid>`.
- **Backlink panels** (Linked tab) → `/aibom?vendor=<id>` and
  `/supply-chain?vendor=<id>` (both pages filter by vendor with a dismissible
  chip), plus per-record deep links `/aibom?open=<id>`,
  `/supply-chain?open=<id>`, `/risks?open=<id>`, `/risk/incidents?open=<id>`
  and `/provenance?open=<id>`.

Inbound:
- `?model=<ai_models.id>` filters the registry to that model's vendors, with a
  dismissible chip.
- [TPRM Workspace](tprm-workspace.md) links every tile and alert row back to
  `/vendors/<id>`.
- `vendor_assessments`, `vendor_slas`, `vendor_documents`,
  `vendor_questionnaires`, `aibom_records`, `aibom_components`,
  `provenance_nodes` and `supply_chain_attestations` all carry
  `vendor_id → vendors.id`.
- The risk/incident/security spine references vendors on the one id-space
  (`20260824000001`): `risks.linked_vendor_ids uuid[]`,
  `incidents.vendor_id` + `incidents.vendor_sla_id`,
  `security_threats.vendor_id`, `security_vulnerabilities.vendor_id`. The
  vendor detail's Linked tab surfaces all of them, and VendorCascadeAgent
  writes `incidents.vendor_id`/`vendor_sla_id` and appends the incident to the
  breached SLA's `linked_incident_ids` when a cascade fires.
- `aiAppsService` (`vendorId`), `privacyRecordsService` (`vendorId`) and
  `trustCenterService` (`subprocessors.vendorIds`) already key on `vendors.id`.

## Compliance

Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 25 | Responsibilities along the value chain — inherent/residual risk, sub-processor count, fourth-party exposure, exit plan |
| EU AI Act Art. 12 | Vendor create/update/delete audit-logged via `logAction` |
| ISO/IEC 42001 A.10.2 | Third parties and suppliers |
| GDPR Art. 28 | DPA status with execution and expiry dates; transfer mechanism |

Org isolation: RLS on `org_id`, filled by the DB default. Demo vendors belong to
the fictional "Acme Financial Services" tenant; owners and managers are role
labels ("Head of AI Platform", "Procurement Lead"), never named individuals.

## Operations

- Service: `vendorService.ts` (`fetchAllVendors`, `fetchVendorById`,
  `fetchVendorOptions`, `fetchVendorConcentration`, `createVendor`,
  `updateVendor`, `upsertVendor`, `deleteVendor`) — all throw on error.
- Hook: `useVendorsData.ts`, invalidating `['vendors']`, `['vendor-options']`
  and `['vendor-concentration']` on mutation.
- Migration: `supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql`
  (scoping default + the TPRM field model);
  `20260822000003_seed_tprm_supply_esg.sql` (demo enrichment).
