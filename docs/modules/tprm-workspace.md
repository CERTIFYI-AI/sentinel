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

## Questionnaire packs (2026-09-28)

`vendor_assessment_templates` holds the 10 built-in TPRM questionnaire packs
(96 questions), grouped by product module: Vendor Intake & Inherent Risk,
CAIQ Cloud Security (CAIQ v4.1-aligned + CAIQ-Lite), Privacy & Data
Protection, Evidence & Document Review, SIG / Security Due Diligence (BC/DR),
AI Vendor Assessment, Subprocessor / Fourth-Party Risk, Vendor Approval &
Renewal, Vendor Exit / Offboarding.

- The pack library renders on `/vendors/assessments`; "Run" picks a vendor
  and deep-links to `/vendors/:id/questionnaire?template=<slug>`.
- The vendor questionnaire page carries a pack picker; switching packs
  clears the draft. Responses snapshot pack name, version, questions, score
  and max score at submit time, so template edits never rescore history.
- The CAIQ packs are domain-level screens aligned to the CSA CCM/CAIQ v4
  domains — not the verbatim licensed CSA instrument; collect the vendor's
  full CAIQ submission as evidence.

## Onboarding questionnaire invitations (2026-09-29)

Registering a vendor now requires a contact email and offers a multi-select
of the questionnaire packs. Each selected pack becomes a row in
`vendor_questionnaire_invites` (org-RLS; pack questions SNAPSHOTTED at send
time; token defaults to 48-hex random; `expires_at` = now() + 24h) and is
emailed to the contact as a tokenized link.

- The vendor fills at `/questionnaire/respond?token=…` — no account. The
  page calls the `vendor-questionnaire-fill` edge function (anon key; the
  token is the capability; the invites table itself is org-RLS'd and only
  the function's service role can resolve a token). Scoring happens
  SERVER-SIDE from the snapshot; the client sends option values only.
- Submissions insert into `vendor_questionnaires` — the same rows the vendor
  profile and /vendors/:id/questionnaire already list — so completed fills
  reflect on the vendor profile with no extra wiring. The invite flips to
  `completed` with the questionnaire id.
- Email delivery is honest: with `RESEND_API_KEY` set (function secret,
  optional `INVITE_FROM`, `PUBLIC_APP_URL`) the email is sent; without it
  the UI says so and offers a copyable link — never a fake "sent". Pending
  invites are listed on the vendor questionnaire page with Copy link /
  Resend; expiry is enforced lazily on every touch.

