# Sentinel — working guidance

## First principle: this is ONE AI Risk Platform

Sentinel is a single, integrated AI risk & governance platform — **not** a
collection of standalone screens. Every module is a view onto the same governed
entities. Before building or changing anything, ask: *how does this connect to
what already exists?*

Concretely, for any new or edited module:

1. **Interlink it.** A module that cannot be reached from, and cannot reach,
   the rest of the platform is unfinished. Records that reference a model, a
   use case, a dataset or an assessment must link to them (and, where it makes
   sense, be reachable back from them).
2. **One id-space.** Models are keyed by `ai_models.id` (uuid) everywhere —
   never by name, slug, or a business code like `MDL-001`. The same discipline
   applies to other shared entities (`use_cases.id`, etc.). Store the id, and
   resolve the display name at render time.
3. **Real backend, org-scoped.** Read and write the real, tenant-scoped table
   with RLS. Never wire a page to a generic `<name>_table (id, doc jsonb)` demo
   table, and never leave the scoping column to the client — let the DB default
   (`current_user_org_id()`) fill it, as `ai_models` does.
4. **Never fake success.** Service writes throw on failure; the UI shows a real
   error. A success toast fires only after the write resolves.
5. **No invented data.** Don't display fabricated metrics as if measured. If
   there is no data yet, show an honest empty state.

## Established patterns to follow

- **Service layer**: `dashboard/src/services/*.ts` — direct Supabase calls,
  camelCase↔snake_case mapping, writes throw. Canonical example:
  `modelService.ts`.
- **Hooks**: React Query wrappers in `dashboard/src/hooks/*` that invalidate on
  mutation (e.g. `useAiiaData.ts`). Realtime where live data matters
  (`useModelAnalytics.ts`).
- **Cross-module deep links** carry context: `?model=<uuid>` filters a list to
  that model (with a dismissible chip); `?open=<id>` opens that record.
- **Link affordances**: pill-style links with hover states; when an id can't be
  resolved to a name show "Unavailable" — never a raw uuid.

## Mandatory review before merge

**Every change to `main` must pass the four role gates in
[`docs/contributing/review-process.md`](docs/contributing/review-process.md).**
This is binding, not advisory, and applies to one-line changes as much as to
features. Run the gates in order, and let each one re-check the one before it:

1. **Engineering & QA/QC** — typecheck clean; no fake success; no demo
   `<name>_table`; org scoping filled DB-side; RLS on new tables; every
   interlink *proven with a query* (`total` must equal `resolves`); the module
   has real inbound **and** outbound links.
2. **UI/UX** — platform primitives only (`PageHeader`, `DataTable`,
   `FormDialog`, `ConfirmDialog`, and all three of skeleton/empty/error);
   semantic colour tokens; **null renders `—`, never `0`**; simulated values
   labelled as such; unresolvable ids show "Unavailable"; no dead-end records.
3. **Documentation** — `docs/modules/<module>.md` exists and its field table
   matches the actual schema; interlinks documented both ways; README and
   CHANGELOG updated; migration carries a *why* comment. A new module without a
   module doc does not merge.
4. **Compliance** — mapped in `docs/compliance/eu-ai-act-mapping.md` and
   `docs/compliance/iso-42001-mapping.md` (ISO/IEC **42001**), or recorded as
   out of scope with a reason; Art. 12 audit logging via `logAction`; Art. 14
   human-oversight path where the module acts autonomously; evidence chain
   never weakened; secrets stored as digests, never plaintext.

Record the outcome of all four gates in the PR description, with evidence
(query output, counts). A gate that does not apply is marked **N/A with a
reason** — never left blank. Accepted debt goes in
`docs/reference/technical-debt.md` with an owner; undocumented debt does not
exist and will be found by an auditor instead of by us.

## Conventions

- Model detail route: `/models/inventory/:id` (canonical). Use cases:
  `/use-cases/:id`.
- Migrations live in `supabase/migrations/` — write idempotent SQL and keep the
  file in the repo even when applied live. **Never reference a table before
  the migration that creates it** — verify with
  `python3 scripts/check_migration_replay.py` (CI enforces this; see
  `supabase/migrations/README.md`).
- Typecheck before shipping: `cd dashboard && npx tsc --noEmit`.
- Every new module needs a `docs/modules/<module>.md` written to the standard
  shape (purpose → why it exists → how it works → fields → interlinks →
  compliance → operations). Docs are part of the change, not a follow-up.


## Mandatory pre-merge review — the four roles

Every change (human- or agent-authored) passes all four role reviews before
it is committed to `main`. The roles check **each other**: a change one role
approves can still be blocked by another. Multiple teams work this repo in
parallel — these gates are what keep the platform one product. Record the
outcome as a four-line checklist in the PR description.

1. **QA/QC engineer** — *does it work, and is it wired in?*
   - `cd dashboard && npx tsc --noEmit` and `npx vitest run` are green;
     Python changes also pass `ruff check sentinel/` and `pytest tests/`.
   - Migrations replay from zero (`python3 scripts/check_migration_replay.py`).
   - Interlink check: new records link to their model / use case / dataset /
     assessment **and are reachable back** — an unreachable module is
     unfinished (First principle #1).
   - No fake success: writes throw on failure; toasts fire only after the
     write resolves; no fabricated metrics.

2. **UI/UX reviewer** — *does it look and behave like the same product?*
   - Reuses the established components (PageHeader, DataTable, pill links,
     empty/error/loading states) and design tokens — no one-off styles,
     colors, or layouts foreign to the rest of the dashboard.
   - Fortune-500 posture: honest empty states, real loading states, resolved
     display names (never raw uuids — "Unavailable" when unresolvable),
     dismissible filter chips on deep links.
   - Keyboard focus visible; dialogs close only on success.

3. **Documentation expert** — *will the next person know this exists?*
   - New/changed modules, env vars, workflows, or processes update the
     matching docs (`README.md`, `docs/`, `dashboard/docs/`, migration
     READMEs) **in the same change** — documentation is part of the diff,
     not a follow-up.
   - User-facing behavior changes update the getting-started flow if it is
     affected.

4. **Senior compliance officer** — *does it keep us aligned with the
   frameworks we sell alignment to?*
   - New modules and data flows map to the relevant EU AI Act obligations
     (risk classification, human oversight, logging/traceability, incident
     reporting) and ISO/IEC 42001 AIMS clauses; governed entities carry the
     links that make that mapping auditable.
   - Auditability: state-changing actions write to the audit log with a real
     actor; evidence and approvals reference their source records.
   - Data minimisation and org isolation: new tables are org-scoped with RLS
     (DB default fills the scoping column); no personal data in seeds or
     fixtures — demo data stays fictional and labeled as such.

A change that cannot satisfy a gate documents why in the PR and gets an
explicit human sign-off on that line — silence is not a pass.

The full binding process (gate order, cross-checking rules, sign-off record
format) lives in `docs/contributing/review-process.md`.

