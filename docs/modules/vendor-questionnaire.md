# Vendor Questionnaire

**Route:** `/vendors/:id/questionnaire` ·
**Backing:** `vendor_questionnaires` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/vendors/VendorQuestionnaire.tsx`,
`dashboard/src/services/vendorQuestionnaireService.ts`,
`dashboard/src/hooks/useVendorQuestionnaires.ts`

## Purpose

The vendor security questionnaire (VSQ) as a persisted record: the template
used, the answers given, who answered, who reviewed and what was decided.

## Why it exists

A questionnaire is the primary due-diligence artefact for a third party. If the
answers are not stored, the assessment that cites them has nothing behind it.

Before the rebuild `handleSubmit` did nothing but `setSubmitted(true)` — every
answer was discarded. The page then rendered a decision ("Low Risk — Approved" /
"High Risk — Escalate to CISO") with no record, no actor, no audit entry and no
write-back to the vendor. The `vendor_questionnaires` table had existed since
`20260418000002` and was never written to. The page was also an orphan: nothing
in the repo routed to it.

## How it works

- Submitting writes a real row through
  `vendorQuestionnaireService.submitVendorQuestionnaire`; the write throws on
  failure and the success toast fires only after it resolves.
- **Two id columns, deliberately.** The legacy `vendor_id` is `text NOT NULL`,
  so it is filled with the uuid string for back-compat, while `vendor_uuid`
  carries the real foreign key into `vendors.id`. All queries and links use
  `vendor_uuid` — the one id-space.
- **`max_score` is stored with the response.** The denominator is captured at
  submit time rather than recomputed from the current template, so editing a
  question later cannot silently rescore historical submissions.
- Review is a separate, recorded step: `reviewVendorQuestionnaire` writes
  `reviewer`, `reviewed_at` and `review_decision`
  (`approved` / `approved_with_conditions` / `escalate` / `rejected`). The page
  no longer renders a verdict that nothing recorded.
- Status vocabulary: `draft` → `sent` → `submitted` → `reviewed`, plus
  `expired`.
- `org_id` is filled by the DB default `current_user_org_id()`.
- Submit, review and delete all call `logAction` (EU AI Act Art. 12).
- `?open=<vendor_questionnaires.id>` opens a specific response.
- A never-scored questionnaire renders `—`, not `0`.

## Fields (`vendor_questionnaires`)

The table predates the org-scoping unification and still carries the legacy
`tenant_id`; `org_id` is the scoping column RLS uses.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid, default `current_user_org_id()` | Tenant scope (DB-filled); added `20260822000001` |
| `tenant_id` | text NOT NULL, default `'default'` | Legacy column, not used for scoping |
| `questionnaire_ref` | text | Human-readable ref |
| `vendor_id` | text NOT NULL | **Legacy** text column; holds the uuid as a string |
| `vendor_uuid` | uuid → `vendors(id)` ON DELETE CASCADE | The canonical link |
| `template` | text, default `CAIQ` | |
| `template_version` | text | Which version of the template was answered |
| `questions` | jsonb, default `[]` | Question set as issued |
| `answers` | jsonb, default `{}` | Answers keyed by question id |
| `status` | text, default `Draft` | Service normalises to `draft`/`sent`/`submitted`/`reviewed`/`expired` |
| `score` | numeric(5,2) | Null = not scored → renders `—` |
| `max_score` | numeric | Denominator captured at submit time |
| `respondent` | text | Role label |
| `respondent_email` | text | |
| `reviewer` | text | Role label |
| `reviewed_at` | timestamptz | |
| `review_decision` | text | `approved` / `approved_with_conditions` / `escalate` / `rejected` |
| `sent_date` / `response_date` | timestamptz | |
| `expires_at` | date | Triggers reassessment |
| `assessment_id` | uuid → `vendor_assessments(id)` ON DELETE SET NULL | The assessment this response fed |
| `evidence_ids` | uuid[] NOT NULL, default `{}` | → `evidence.id` |
| `metadata` | jsonb NOT NULL, default `{}` | |
| `created_at` / `updated_at` | timestamptz | |

## Interlinks

Outbound:
- **Vendor** → `/vendors/<vendor_uuid>` (pill link; "Unavailable" when the id
  does not resolve).
- **Assessment** → `assessment_id` links to
  `/vendors/assessments?open=<assessment_id>`.
- **Evidence** → each `evidence_ids` entry links to `/evidence-vault?open=<id>`.

Inbound:
- [Vendor Registry](vendor-registry.md) renders the latest response per vendor
  in its VSQ column and routes to `/vendors/<id>/questionnaire` — the caller
  that was missing before, which is what made this page an orphan.
- [Vendor Detail](vendor-registry.md) and
  [TPRM Workspace](tprm-workspace.md) link here for questionnaire coverage.
- `vendor_assessments.questionnaire_id` references this table, so the assessment
  reaches the response and the response reaches the assessment.

## Compliance

Mapped in [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| ISO/IEC 42001 A.9.3 | Reporting concerns — persisted responses with respondent, reviewer and decision |
| ISO/IEC 42001 A.10.2 | Third-party due diligence evidence |
| EU AI Act Art. 12 | Submit, review and delete audit-logged via `logAction` |
| EU AI Act Art. 14 | The review decision is a human act with a recorded reviewer, replacing a rendered verdict nothing recorded |

Org isolation: RLS policy `vendor_questionnaires_org_all` on `org_id`, filled by
the DB default. Respondents and reviewers in demo data are role labels.

## Operations

- Service: `vendorQuestionnaireService.ts` — `fetchVendorQuestionnaires`,
  `fetchVendorQuestionnaireById`, `submitVendorQuestionnaire`,
  `reviewVendorQuestionnaire`, `deleteVendorQuestionnaire`. All throw on error.
- Hook: `useVendorQuestionnaires.ts`, invalidating `['vendor-questionnaires']`.
- Migration: `supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql`
  adds `org_id`, `vendor_uuid` and the lifecycle columns to the existing table.
