# Frameworks

**Route:** `/frameworks` (`?tab=portfolio|catalog|mapping`; legacy
`/compliance/frameworks` and `/framework-mapping` redirect here) ·
**Backing:** `frameworks` + `controls` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/Frameworks.tsx`,
`dashboard/src/services/frameworkService.ts`, `dashboard/src/hooks/useFrameworksData.ts`

## Purpose

The single frameworks surface for the platform: the org's adopted framework
portfolio (real rows, real scores, real control coverage), the bundled
reference catalog, and the static cross-framework reference crosswalk.

## Why it exists

Every compliance view ultimately keys off "which frameworks do we govern
against, and how far along are we?". Keeping one governed `frameworks` table —
instead of per-page framework lists — lets scores, controls, conformity
assessments and the executive Overview all read the same portfolio.

## How it works

Three tabs:

- **Portfolio** — org-scoped `frameworks` rows with full CRUD
  (writes throw; toasts only after the write resolves). Each card shows:
  - *Compliance Score*: the recorded `score`. A **null score renders "—"
    with "No score recorded yet"** and neutral styling — never `0%` and never
    the red `<65%` treatment.
  - *Controls*: `implemented/total` **derived live from the org `controls`
    table** (statuses `implemented`/`effective` count as implemented). A
    control belongs to a framework when its `framework_id` matches or its
    free-text `framework` label equals the framework's name/code (allowing a
    versioned suffix, e.g. "ISO/IEC 42001" ↔ "ISO/IEC 42001:2023"). When no
    controls reference the framework the line reads "— no controls linked
    yet". The catalog's `control_count` (reference material) is **never**
    mixed into this measured count.
- **Catalog** — the authoritative reference library bundled with Sentinel
  (`lib/frameworks`, from `/frameworks/*.yaml`), searchable, each entry
  linking to its issuing authority. Clearly reference data, not org state.
- **Mapping** — static reference crosswalk of commonly cited control-domain
  equivalences, explicitly labelled as reference material; org-specific
  control mappings are honestly declared "not wired up yet".

The detail sheet lists the framework's matched controls; each row navigates
to `/compliance/controls?open=<id>`.

## Fields (`frameworks`, columns the module uses)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text (uuid default) | Primary key; referenced by `conformity_assessments.framework_id`, `tasks.linked_framework_id`, `policy_framework_mapping` |
| `org_id` | uuid, default `get_org_id()` | Tenant scope (DB-filled) |
| `name` / `version` / `code` | text | Display identity |
| `category` / `jurisdiction` / `description` | text | |
| `score` | numeric, nullable | Recorded compliance score; **null = unscored → renders "—"** |
| `target_score` | numeric, nullable | Optional target |
| `controls_total` / `controls_implemented` | integer, nullable | Legacy stored counters — the UI derives live counts from `controls` instead |
| `control_count` | integer | Catalog seed metadata (reference size), not org coverage |
| `next_audit_at` | date | Overdue/due-soon badges on the card |
| `is_active` | boolean | Inactive badge |
| `created_at` / `updated_at` | timestamptz | |

Control matching uses `controls (id, control_id, control_ref, name, framework,
framework_id, clause_ref, status)`.

## Interlinks

Outbound:
- Framework detail sheet → each matched control opens in
  `/compliance/controls?open=<controls.id>`.
- Catalog entries → issuing-authority URLs.

Inbound:
- Overview: the Regulatory Compliance Scorecard, CISO view and the
  "Compliance Score by Framework" chart read this portfolio via
  `useFrameworksData`.
- Conformity Assessment resolves `framework_id` to these rows.
- Legacy routes `/compliance/frameworks` and `/framework-mapping` redirect in.
- Realtime: `frameworks` invalidates `['frameworks']`; `controls` changes
  invalidate `['controls']`-prefixed queries, refreshing the live coverage
  counts.

## Compliance

- **ISO/IEC 42001:** Clause 4.1/6.1 (determining applicable requirements and
  planning against them); the portfolio is the AIMS statement of applicability
  anchor.
- **EU AI Act:** the adopted-framework record underpins Art. 43 conformity
  routes and Annex IV documentation; EU AI Act appears both as catalog
  reference and as an adoptable portfolio row.
- Honesty rules enforced here: null scores are never rendered as measured
  zeros; catalog control counts are never presented as org implementation;
  the crosswalk is labelled static reference material.
- Known gap: `frameworkService` writes do not yet emit `logAction`
  audit-trail entries (EU AI Act Art. 12). Needs an entry with an owner in
  `docs/reference/technical-debt.md`.

## Operations

- CRUD via `frameworkService` (throw-on-failure) and `useFrameworksData`
  (React Query; invalidates `['frameworks']` on mutation).
- Deleting a framework leaves its controls without a framework reference
  (warned in the confirm dialog).
- Seeded portfolio rows (10 frameworks) currently carry `score = null` —
  the UI shows the unscored state until scores are actually recorded.
