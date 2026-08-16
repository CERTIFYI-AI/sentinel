# Vendor Assessments

**Route:** `/vendors/assessments` ·
**Backing:** `vendor_assessments` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/vendors/VendorAssessments.tsx`,
`dashboard/src/services/vendorAssessmentService.ts`,
`dashboard/src/hooks/useVendorAssessments.ts`

## Purpose

The due-diligence record for a third party: what was assessed, against which
framework, what was found, who approved it and on what evidence.

## Why it exists

A vendor tier without an assessment behind it is an opinion. This module holds
the assessment as a governed record so the tier, the residual risk and the
approval can each be traced to a decision with an actor and a date.

Before the rebuild the page sat on `vendorassessments_table`, a generic
`(id, doc jsonb)` demo table whose RLS predicate was `true` for `authenticated`
— any user in any org could read and write every other tenant's vendor
assessments. Writes were fire-and-forget with toasts driven by local state, the
mock array was auto-persisted into Postgres on first load, and one click walked
a record from `draft` to `approved` with no approver identity and no audit
entry. Evidence was stored as a *count*, which broke the evidence chain by
construction.

## How it works

- Reads and writes go through `vendorAssessmentService` against the real
  org-scoped table; `org_id` is filled by the DB default
  `current_user_org_id()`.
- Status vocabulary: `draft` → `in_progress` → `submitted` → `under_review` →
  `approved` / `approved_with_conditions` / `rejected`. A decision is made
  through `decideVendorAssessment`, which records `approver`, `approved_by`
  (the authenticated user), `approved_at` and — for
  `approved_with_conditions` — the required `conditions` text.
- `evidence_ids` holds real `evidence.id` uuids, rendered as resolved evidence
  titles linking to the Evidence Vault; unresolvable ids show "Unavailable".
- Findings are four explicit counts (critical/high/medium/low). A never-scored
  assessment has `score = NULL` and renders `—`, not `0`.
- Every create, update, decision and delete calls `logAction`
  (EU AI Act Art. 12).
- `?vendor=<vendors.id>` filters the list with a dismissible chip naming the
  vendor; `?open=<vendor_assessments.id>` opens that record directly.
- Skeleton while loading, real error state on failure, honest empty state when
  the org has no assessments. The dialog closes only after the write resolves.

## Fields (`vendor_assessments`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `assessment_ref` | text | Human-readable ref (`VA-2026-001`) |
| `vendor_id` | uuid → `vendors(id)` ON DELETE CASCADE | Resolved to the vendor name at render time |
| `assessment_type` | text | `initial` / `periodic` / `targeted` / `incident_driven` |
| `framework` | text | SIG Lite / CAIQ / ISO 42001 addendum / custom |
| `scope` | text | What the assessment covered |
| `status` | text NOT NULL, default `draft` | `draft`/`in_progress`/`submitted`/`under_review`/`approved`/`approved_with_conditions`/`rejected` |
| `conditions` | text | Required when `approved_with_conditions` |
| `score` | numeric | Null = never scored → renders `—` |
| `residual_risk` | text | Risk remaining after remediation |
| `findings_critical` | integer NOT NULL, default 0 | |
| `findings_high` | integer NOT NULL, default 0 | |
| `findings_medium` | integer NOT NULL, default 0 | |
| `findings_low` | integer NOT NULL, default 0 | |
| `owner` | text | Role label |
| `approver` | text | Role label, deliberately distinct from `owner` |
| `approved_by` | uuid | The authenticated approver |
| `due_at` | date | |
| `submitted_at` / `reviewed_at` / `approved_at` | timestamptz | Lifecycle timestamps |
| `next_review_at` | date | Feeds the TPRM reassessment view |
| `recommendation` | text | |
| `questionnaire_id` | uuid | → `vendor_questionnaires.id` |
| `evidence_ids` | uuid[] NOT NULL, default `{}` | → `evidence.id` — real references, not a count |
| `notes` | text | |
| `metadata` | jsonb NOT NULL, default `{}` | |
| `created_at` / `updated_at` | timestamptz NOT NULL, default `now()` | |

## Interlinks

Outbound:
- **Vendor** → `/vendors/<vendor_id>` (pill link, name resolved; "Unavailable"
  when the id does not resolve).
- **Questionnaire** → `questionnaire_id` opens
  `/vendors/<vendor_id>/questionnaire?open=<questionnaire_id>`.
- **Evidence** → each `evidence_ids` entry links to `/evidence-vault?open=<id>`
  with the evidence title as the label.

Inbound:
- `?vendor=<vendors.id>` from [Vendor Registry](vendor-registry.md) and
  [Vendor Detail](vendor-registry.md) with a dismissible chip.
- `?open=<vendor_assessments.id>` from the vendor detail assessments tab and
  from [TPRM Workspace](tprm-workspace.md).
- `vendor_documents.assessment_id` and `vendor_questionnaires.assessment_id`
  both reference this table, so an accepted document or a reviewed
  questionnaire is reachable from the assessment it supports.

## Compliance

Mapped in [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md)
and [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| ISO/IEC 42001 A.5.2 | AI risk assessment — third-party contribution, with approver distinct from owner and real `evidence_ids` |
| ISO/IEC 42001 A.10.2 | Third parties and suppliers |
| EU AI Act Art. 25 | Value-chain responsibilities evidenced per vendor |
| EU AI Act Art. 12 | Assessment lifecycle audit-logged via `logAction` |
| EU AI Act Art. 14 | Approval is a human decision with a recorded actor (`approved_by`) |

Org isolation: RLS policy `vendor_assessments_org_all` on `org_id`, filled by
the DB default. Seeded assessments are fictional; `owner` and `approver` are
role labels ("Third-Party Risk Analyst", "Head of Compliance").

## Operations

- Service: `vendorAssessmentService.ts` — `fetchVendorAssessments`,
  `fetchVendorAssessmentById`, `createVendorAssessment`,
  `updateVendorAssessment`, `decideVendorAssessment`, `deleteVendorAssessment`.
  All throw on error.
- Hook: `useVendorAssessments.ts`, invalidating `['vendor-assessments']`.
- Migration: `supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql`
  creates the table and replaces `vendorassessments_table`.
