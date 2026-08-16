# Conformity Assessment

**Route:** `/conformity` (legacy `/governance-framework` redirects here) ·
**Backing:** `conformity_assessments` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/conformity/ConformityAssessment.tsx`,
`dashboard/src/services/conformityService.ts`, `dashboard/src/hooks/useConformityData.ts`

## Purpose

Manage formal conformity assessments of AI systems against adopted
frameworks — the EU AI Act Annex IV / Art. 43 assessment record and the
ISO/IEC 42001 Clause 9 performance-evaluation record for each governed model.

## Why it exists

High-risk AI systems must carry a demonstrable conformity assessment before
(and while) they operate. Scattering that proof across documents makes it
unauditable; this module keeps one governed record per assessment, linked to
the model it covers, the framework it asserts conformity with, and the
evidence that substantiates the conclusion.

## How it works

- The page lists all org assessments (cards) with status
  (`Not Started` / `In Progress` / `Completed`) and compliance level
  (`Conformant` / `Substantially conformant` / `Partial` / `Non-conformant` / `Pending`).
- **Create** captures title, framework, model, assessment body and validity
  date; `id`, `org_id` and `tenant_id` are filled by DB defaults
  (`current_user_org_id()`) — the client never supplies the scoping column.
- **Status updates** are real writes through `conformityService`
  (writes throw; the success toast fires only after the write resolves).
- **Findings** are rendered straight from the record's `findings` jsonb —
  nothing is scored or simulated client-side.
- `?open=<id>` (record `id` or `assessment_id`) deep-links straight into the
  detail sheet — the platform's standard record-addressing pattern.
- Loading renders `PageSkeleton`; load failures render a real error banner;
  an empty org renders an honest empty state.

## Fields (`conformity_assessments`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text (uuid default) | Primary key |
| `org_id` | uuid, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `tenant_id` | text, default `current_user_org_id()::text` | RLS policy column (DB-filled) |
| `assessment_id` | text | Human-readable ref (`CA-<year>-…`) |
| `title` / `description` | text | |
| `status` | text | `Not Started` / `In Progress` / `Completed` |
| `type` / `severity` / `owner` | text | Optional classification |
| `model_id` | text | **`ai_models.id` (uuid) only** — resolved to the model name at render time; unresolvable refs show "Unavailable" |
| `framework_id` | text | `frameworks.id` — resolved to the framework name at render time |
| `assessment_body` | text | Internal team or notified body |
| `compliance_level` | text | Conformant / Substantially conformant / Partial / Non-conformant / Pending |
| `findings` | jsonb | Free-form recorded findings, rendered as key/value |
| `evidence_ids` | text[] | `evidence.id` values — rendered as resolved evidence titles linking to the Evidence Vault, or "Unavailable"; never raw ids |
| `certificate_url` | text | External certificate link |
| `valid_until` | timestamptz | Drives the derived Compliance Calendar deadline |
| `assessor_id` | text | Optional assessor reference |
| `metadata` | jsonb | |
| `created_by` / `updated_by` / `deleted_at` | uuid / uuid / timestamptz | Lifecycle metadata |
| `created_at` / `updated_at` | timestamptz | |

## Interlinks

Outbound:
- **Model** → `/models/inventory/<ai_models.id>` (pill link; name resolved from
  the registry, "Unavailable" when the ref does not resolve).
- **Framework** → resolved name from `frameworks.id` (shown as a labelled pill).
- **Evidence** → each `evidence_ids` entry links to
  `/evidence-vault?open=<id>` with the evidence *title* as the label.

Inbound:
- `?open=<id>` deep links from any module (e.g. audit-trail entity routes,
  reports); legacy `/governance-framework` redirects here.
- Overview quick action "Run Assessment" lands here.
- The **Compliance Calendar** derives deadline events from `valid_until`
  (see `complianceOpsService.fetchCalendarEvents`); realtime changes to this
  table invalidate both `['conformity-assessments']` and `['cg-calendar']`.

## Compliance

- **EU AI Act:** Art. 43 conformity assessment; Annex IV technical
  documentation record; Art. 47 declaration support via `certificate_url`.
- **ISO/IEC 42001:** Clause 9 (performance evaluation), A.6.1.2 lifecycle
  gates (assessment before production).
- Org isolation: RLS on `tenant_id`/`org_id`, both filled by DB defaults.
- Known gap: `conformityService` writes do not yet emit `logAction`
  audit-trail entries (EU AI Act Art. 12). Needs an entry with an owner in
  `docs/reference/technical-debt.md`.

## Operations

- Reads/writes go through `conformityService` (throw-on-failure) and
  `useConformityData` (React Query, invalidates `['conformity-assessments']`
  on mutation). Realtime invalidation is table-level via
  `useRealtimeInvalidation`.
- Seeds (`ca-001`…`ca-004`) carry real `ai_models.id` uuids and framework ids;
  no business-code refs remain.
- Deleting an assessment is a hard delete behind a `ConfirmDialog`.
