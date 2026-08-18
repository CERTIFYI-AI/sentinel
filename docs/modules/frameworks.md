# Frameworks

**Route:** `/frameworks` (`?tab=portfolio|catalog|mapping`; `?open=<framework_id>`
opens a framework's detail; legacy `/compliance/frameworks` and
`/framework-mapping` redirect here) ·
**Backing:** `frameworks` + `framework_controls` (published catalog) + `controls`
(org register), all org-scoped RLS ·
**Code:** `dashboard/src/pages/Frameworks.tsx`,
`dashboard/src/services/frameworkService.ts`,
`dashboard/src/services/frameworkCatalogService.ts`,
`dashboard/src/hooks/useFrameworksData.ts`,
`dashboard/src/hooks/useFrameworkCatalog.ts`

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

The detail sheet has three tabs:

- **Overview** — score, target, next audit, plus two deliberately separate
  counts: *Published Controls (catalog)* — the size of the framework's
  authoritative `framework_controls` catalog (reference material) — and
  *Controls Implemented* — the live `implemented/total` from the org register.
- **Requirements** — the framework's **published catalog** (`framework_controls`)
  grouped by `domain`, each control showing `control_ref`, `title`,
  `description` and `control_type`. Every catalog control surfaces the org
  `controls` that implement it as pill links to `/compliance/controls?open=<id>`,
  or an honest **"Not yet implemented"** when none resolve. Reads via
  `useFrameworkCatalog`; renders skeleton / empty / error states. When the org
  register cannot be read the row shows **"Implementation status unavailable"**
  rather than a fabricated zero.
- **Implemented** — the matched org `controls` for the framework; each row
  navigates to `/compliance/controls?open=<id>`.

**Catalog ↔ register matching** (the interlink, in
`frameworkCatalogService.ts`, pure/testable): an org control implements a
catalog control when (a) it belongs to the same framework — `framework_id`
match, or its free-text `framework` label equals the framework's
name/short_name/code allowing a version suffix — **and** (b) the catalog
`control_ref` (e.g. `A.5.2`, `Art. 10`) appears as a **boundary-delimited
token** inside the org control's clause reference (`clause_ref` /
`clause_reference` / `clause`), so `A.5.2` never matches `A.5.24`. Anything
that does not match cleanly is left "not yet implemented" — never guessed.

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
framework_id, clause, clause_ref, clause_reference, status,
implementation_status)`.

## Fields (`framework_controls`, the published catalog)

Read-only here (seeded by migration, never written by this module).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key |
| `org_id` | uuid, default `current_user_org_id()` | Tenant scope (DB-filled); RLS read-scoped |
| `framework_id` | text → `frameworks.id` | The owning framework (e.g. `iso-42001`, `eu-ai-act`) |
| `control_ref` | text | The published clause/article ref (e.g. `A.5.2`, `Art. 10`) — the token matched against org `controls` clause references |
| `domain` | text, nullable | Grouping bucket in the Requirements tab; null → "Uncategorised" |
| `title` | text | Control name |
| `description` | text, nullable | Renders `—` when absent |
| `control_type` | text, nullable | Badge on each row |
| `priority` / `status` / `owner` | text | Catalog metadata |
| `evidence_count` / `maturity_level` | integer | Catalog metadata (**null renders `—`, never `0`**) |
| `last_assessed` | date, nullable | |
| `created_at` | timestamptz | |

## Interlinks

Outbound:
- Framework detail **Requirements** tab → each *published catalog control*
  (`framework_controls`) surfaces the org `controls` implementing it, as pill
  links to `/compliance/controls?open=<controls.id>`.
- Framework detail **Implemented** tab → each matched control opens in
  `/compliance/controls?open=<controls.id>`.
- Catalog (bundled reference) entries → issuing-authority URLs.

Inbound:
- **Control → catalog backlink**: `ControlDetail` (`/compliance/controls/:id`,
  Interlinks tab) resolves the published catalog entry a control satisfies via
  `useControlCatalogEntry` and deep-links back to `/frameworks?open=<framework_id>`.
  This is the reverse of the Requirements-tab edge, so the catalog ↔ register
  link is reachable **both ways**.
- Overview: the Regulatory Compliance Scorecard, CISO view and the
  "Compliance Score by Framework" chart read this portfolio via
  `useFrameworksData`.
- Conformity Assessment resolves `framework_id` to these rows.
- Legacy routes `/compliance/frameworks` and `/framework-mapping` redirect in.
- Realtime: `frameworks` invalidates `['frameworks']`; `controls` changes
  invalidate `['controls']`-prefixed queries, refreshing the live coverage
  counts.

**Interlink proof** (replay DB; catalog is a global reference at the system org
`0000…0000`, readable by every tenant via RLS): 936 catalog controls total;
12 resolve to an implementing org control (eu-ai-act 6/34, iso-42001 6/38) —
the rest honestly show "Not yet implemented". Reverse: 13 org controls in
catalogued frameworks all 13 resolve back to a catalog entry (total == resolves).

## Compliance

- **ISO/IEC 42001:** Clause 4.1/6.1 (determining applicable requirements and
  planning against them); the portfolio is the AIMS statement of applicability
  anchor. The `framework_controls` catalog + the Requirements↔register interlink
  make the **Statement of Applicability** auditable — for each published control
  it is now visible whether an org control implements it, or it is explicitly
  outstanding.
- **EU AI Act:** the adopted-framework record underpins Art. 43 conformity
  routes and Annex IV documentation; EU AI Act appears both as catalog
  reference and as an adoptable portfolio row. The published EU AI Act catalog
  (Art. 5–73) with its implementation backlinks supports Art. 11/Annex IV
  technical-documentation traceability of which requirements are met.
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
