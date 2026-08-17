# TPRM Workspace

**Route:** `/vendors/tprm` ·
**Backing:** aggregates `vendors`, `vendor_assessments`, `vendor_slas`,
`vendor_documents` and `vendor_questionnaires` (all org-scoped RLS) — it owns no
table of its own ·
**Code:** `dashboard/src/pages/vendors/TPRMWorkspace.tsx`, reading through
`useVendorsData.ts`, `useVendorAssessments.ts`, `useVendorSlas.ts`,
`useVendorDocuments.ts` and `useVendorQuestionnaires.ts`

## Purpose

The programme-level view of third-party risk: portfolio concentration, tiering,
reassessments falling due, open assessment findings, document gaps and SLA
breaches — in one place, over the same records the individual modules govern.

## Why it exists

A third-party programme is judged on coverage, not on individual records: how
much of the estate is unassessed, how many reassessments are overdue, where
spend is concentrated. Those questions cross four tables, so they need a view
that joins them.

Before the rebuild this page made **zero backend calls** — it imported the seed
arrays directly. All six executive KPIs and all three red alert cards were
counts over mock data, the reassessment calendar ran on fields that had no
persisted home, and its four navigations went to `/vendors/<seed-code>`, every
one a dead end.

## How it works

- Every figure is a count or aggregate over rows fetched from the real
  org-scoped tables through the module hooks. Nothing on this page is a literal.
- **Concentration** comes from `vendorService.fetchVendorConcentration` over
  real `annual_spend`, not the previous hardcoded 45/30/25 split.
- **Reassessments due** derive from `vendors.reassessment_due_at` against the
  current date; **document gaps** from `vendor_documents.expires_at` and
  missing `doc_type` coverage; **SLA breaches** from `derived_status` in
  `vendor_sla_status` — the workspace never re-implements the derivation, it
  reads the view.
- A missing value is `—`, not `0`, and an unknown criticality is shown as
  unknown rather than silently downgraded to `moderate`.
- Loading renders skeletons per panel; a failed source renders a real error for
  that panel rather than a zero.
- Row actions deep-link into the owning module rather than duplicating its
  editing surface, so there is a single write path per record type.

## Fields

This module has no table. Its inputs and their owning docs:

| Source table | Used for | Module doc |
| --- | --- | --- |
| `vendors` | Portfolio, criticality tiering, concentration, reassessment calendar, exit-plan readiness | [Vendor Registry](vendor-registry.md) |
| `vendor_assessments` | Open findings, assessments in flight, overdue reviews | [Vendor Assessments](vendor-assessments.md) |
| `vendor_slas` (via `vendor_sla_status`) | Breach and at-risk counts, unmeasured coverage gap | [Vendor SLA](vendor-sla.md) |
| `vendor_documents` | Document gaps and expiring evidence | [Vendor Upload](vendor-upload.md) |
| `vendor_questionnaires` | Questionnaire coverage and outstanding responses | [Vendor Questionnaire](vendor-questionnaire.md) |

## Interlinks

Outbound (all by uuid):
- **Vendor** → `/vendors/<vendors.id>` from every portfolio and alert row.
- **Assessment** → `/vendors/assessments?open=<vendor_assessments.id>`.
- **SLA** → `/vendors/sla?open=<vendor_slas.id>`.
- **Documents** → `/vendor-upload?vendor=<vendors.id>`.
- **Questionnaire** → `/vendors/<vendors.id>/questionnaire`.

Inbound:
- Reached from the Vendors area navigation and from
  [Vendor Registry](vendor-registry.md).
- Because it deep-links with `?vendor=` / `?open=`, every module it aggregates
  is reachable from it and links back to the vendor record, closing the loop.

## Compliance

Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 27 | Fundamental-rights impact of third-party dependencies — criticality tiering and reassessment cadence over real vendor records |
| EU AI Act Art. 25 | Programme-level view of value-chain responsibilities |
| ISO/IEC 42001 A.10.2 | Third parties and suppliers — coverage and gaps |
| ISO/IEC 42001 A.10.4 | Supplier performance monitoring, read from the derived SLA view |

The workspace is read-only: it changes no state, so it emits no `logAction`
entries of its own — the modules it links into do. Org isolation is inherited
from the RLS on each source table.

## Operations

- No service of its own. Every read goes through the module hooks listed above,
  so a fix to a derivation lands here automatically.
- Because it holds no table, there is no migration for this module; its inputs
  are created by
  `supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql`.
