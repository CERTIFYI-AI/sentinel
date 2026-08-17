# Guided Setup ("Get started")

**Surfaces:** RightSidebar "Get started" tab (all routes) · dismissible card on
`/overview` · Settings deep link `?tab=demo-data`
**Registry:** `dashboard/src/data/setupChecklists.ts`
**Hook:** `dashboard/src/hooks/useSetupProgress.ts`
**Components:** `dashboard/src/components/setup/SetupChecklist.tsx`,
`dashboard/src/components/setup/SetupCard.tsx`
**Preference store:** `dashboard/src/stores/onboardingStore.ts`
**Tables read:** `ai_models`, `use_cases`, `risks`, `incidents`, `controls`,
`conformity_assessments`, `evidence`, `vendors`, `aibom_records`,
`supply_chain_attestation_status` (view), `provenance_nodes`, `carbon_records`,
`energy_metrics`, `esg_reports`, `tasks` — **read-only**. This module owns no
table of its own.

## Purpose

The platform has ~65 modules. A new user has no idea where to start, or whether
any given module is actually set up. Guided Setup answers both questions with a
single, ordered checklist: *what to do next*, grouped by module area, where every
step also reports *whether it is already done*.

## Why this module exists

The platform already ships reference documentation (`data/moduleGuides.tsx` +
the RightSidebar "User guide"). That explains what a module *is*. It cannot tell
you what to *do next*, and — crucially — it cannot know whether you have done it.

The obvious alternative, a step-highlight product tour, was rejected on purpose:

1. **A tour goes stale.** It points at UI chrome by DOM position or selector;
   the moment a layout changes it points at the wrong thing.
2. **A tour lies about state.** It can only say "you have been shown this
   screen", never "this is configured". Marking a step done because the user
   clicked *Next* is exactly the "fake success" the platform forbids
   (CLAUDE.md, First principle #4).

So step state here is **derived from real data, never stored**. Each step
declares a query-backed predicate; the checklist is therefore also an honest
completeness indicator that cannot drift out of sync with the tables. This is
the same discipline the rest of the platform holds itself to (First principle
#5: no invented data; honest empty states).

## How it works

### The `isDone` contract

Every step in the registry declares:

```ts
isDone: (ctx: SetupContext) => boolean | null
```

- `true`  — the query **proves** the step is done.
- `false` — the query **proves** it is not.
- `null`  — the source **could not be checked** ("Unknown").

A `null` is load-bearing. It **never** renders as done and **never** renders as
not-done — it renders as a distinct neutral "Unknown" marker. This is what stops
a broken connection from nagging a correctly-configured org (falsely "not
started") or congratulating an empty one (falsely "done"). A real, empty org
returns `0` from its query, which is an honest "Not started" — visually and
semantically separate from "Unknown".

`detail(ctx)` returns a factual sub-line (e.g. *"3 of 7 models have an owner"*)
or `null`, in which case the line is **omitted** — a fraction of 0 is never
fabricated (CLAUDE.md UI/UX gate: null renders `—`/omitted, never `0`).

### Deriving state — the `safeSource` pattern

`useSetupProgress` resolves the whole checklist in one batched `Promise.all`
pass, following the `safeSource` contract of `hooks/useModelBacklinks.ts`
exactly: **each source is queried independently and tolerates failure.** A
source whose query errors or throws yields `null` — it never rejects the hook,
and never silently degrades to `0`. Two helpers enforce this:

- `safeCount(...)` — a `head:true` `count:'exact'` probe for steps that only
  need presence; error → `null`.
- `safeRows(...)` — a bounded projection (id/link columns only, capped at 2000
  rows) for steps that need an N-of-M fraction; error → `null`.

A `null` from any source stays `null` through every aggregate it feeds — the
"Unknown" signal is never laundered into a `0`. When Supabase is not configured
(e.g. demo mode) the whole context is `null` (everything "Unknown"), which is the
honest answer: we cannot tell.

### How each step's done-state is derived

| Group | Step | Done when |
|---|---|---|
| Start here | Import demo data | `ai_models` has ≥1 row carrying `metadata->demo_seed` |
| Start here / AI inventory | Register your first AI model | `ai_models` count ≥ 1 |
| AI inventory | Give every model an owner | every `ai_models` row has `business_owner` or `technical_owner` |
| AI inventory | Classify models under the EU AI Act risk tier | every `ai_models` row has `risk_tier` |
| AI inventory | Link a use case to its model | any `use_cases` row has non-empty `linked_model_ids` |
| Risk & incidents | Record a risk against a model | any `risks` row has non-empty `linked_model_ids` |
| Risk & incidents | Log an incident | `incidents` count ≥ 1 |
| Compliance & controls | Define your control library | `controls` count ≥ 1 |
| Compliance & controls / Evidence | Attach evidence to a control | any `evidence` row has non-empty `linked_controls` |
| Compliance & controls | Run a conformity assessment | `conformity_assessments` count ≥ 1 |
| Vendors & TPRM | Add your first vendor | `vendors` count ≥ 1 |
| Vendors & TPRM | Link models to their supplier | any `vendors` row has non-empty `linked_models` |
| Vendors & TPRM | Set a reassessment date on critical vendors | every `vendors` row with `criticality` in {critical, high} has `reassessment_due_at` |
| AI supply chain | Generate an AI bill of materials | `aibom_records` count ≥ 1 |
| AI supply chain | Record a supply-chain attestation | `supply_chain_attestation_status` count ≥ 1 |
| AI supply chain | Map model provenance | `provenance_nodes` count ≥ 1 |
| Sustainability & ESG | Record a carbon footprint | `carbon_records` count ≥ 1 |
| Sustainability & ESG | Log an energy reading | `energy_metrics` count ≥ 1 |
| Sustainability & ESG | Draft an ESG disclosure | `esg_reports` count ≥ 1 |
| Tasks | Create a governance task | `tasks` count ≥ 1 |
| Tasks | Link tasks to the records they resolve | any `tasks` row has `linked_entity_id` |
| Evidence | Add evidence to the vault | `evidence` count ≥ 1 |
| Evidence | Link evidence to a control | any `evidence` row has non-empty `linked_controls` |

"Link models to their supplier" is deliberately the same `vendors.linked_models`
control whose absence left vendor **concentration risk** permanently empty — the
checklist points the user straight at it.

### Where it surfaces

1. **RightSidebar "Get started" tab** — sits alongside the reference "User
   guide" so there is one help surface, not two competing ones. It shows the
   checklist for the **current route's group** (`groupForRoute` matches the
   longest route prefix), falling back to the whole-platform view when the route
   maps to no group. Activating a step link closes the drawer and navigates.
2. **Dismissible card on `/overview`** — shown **only while overall setup is
   incomplete** (at least one "Not started" step). It renders nothing while
   loading, on error, once dismissed, or when there is no remaining work — so it
   never appears for a fully set-up org. "Don't show this again" persists via
   `onboardingStore` (localStorage, key `sentinel-onboarding`).

The Overview card stores **only** the dismissal preference — never step state.
Whether a step is done is always re-derived from the tables.

## Interlinks

- **Guided Setup → every governed module** — each step deep-links to the exact
  route where the work is done (`/models/inventory`, `/ai-risk-tiering`,
  `/use-cases`, `/risks`, `/risk/incidents`, `/compliance/controls`,
  `/evidence-vault`, `/conformity`, `/vendors`, `/aibom`, `/supply-chain`,
  `/provenance`, `/carbon-ledger`, `/energy-efficiency`, `/esg-reports`,
  `/tasks`, `/settings?tab=demo-data`).
- **Demo import → Guided Setup** — the first step is marked done by the same
  `metadata->demo_seed` marker that `services/demoImportService.ts` writes and
  `fetchDemoDataStatus` probes; the link opens the Settings demo-data tab.
- **Every route → Guided Setup** — `groupForRoute(pathname)` maps the current
  page back to its checklist group, so the sidebar is context-aware.

This module is intentionally read-only: it never writes to the tables it reads,
so it cannot weaken any evidence chain or introduce a write path of its own.

## Compliance

| Control | How this module relates |
|---|---|
| EU AI Act Art. 9 | Surfaces "record a risk", "create a task" as first-class setup steps — nudging the continuous risk-management loop into existence |
| EU AI Act Art. 11 / 12 | Steps for model registration, evidence, conformity and provenance point the user at the record-keeping obligations |
| EU AI Act Art. 25 | The vendor-linking steps make value-chain obligations visible early |
| ISO/IEC 42001 Clause 8 / A.10 | Control library and third-party reassessment steps map to operational planning and supplier management |
| EU AI Act Art. 12 (audit) | **N/A — read-only.** This module takes no state-changing action, so it has nothing to audit-log. It reads existing rows and derives display state; it never writes. |
| EU AI Act Art. 14 (human oversight) | **N/A — non-autonomous.** Every step is advisory and skippable; the module never acts on the user's behalf. |
| Data minimisation / org isolation | Reads only through the tenant-scoped tables under RLS; the bounded projections select id/link columns only, no personal data. |

## Operations

- **Never blocking.** Steps are guidance, not a wizard — any step can be skipped
  and returned to later. There is no "next" gate.
- **Caching.** `useSetupProgress` caches under React Query key `setup-progress`
  with a 60s `staleTime`; it re-derives on the next fetch, so completing a step
  in another module updates the checklist without a manual reset.
- **Failure surfacing.** A per-source failure degrades that step to "Unknown";
  only a catastrophic failure of the whole pass renders `ErrorState` with a
  retry. The panel also shows a skeleton (reduced-motion aware) while loading
  and an `EmptyState` when a requested group has no steps.
- **Accessibility.** Steps are keyboard-reachable links with visible focus;
  the dismissal persists; the skeleton respects `prefers-reduced-motion`; state
  is conveyed by a text chip ("Done" / "Not started" / "Unknown") as well as by
  icon and colour.

## History

New module (2026-08). Introduced to replace the absence of any onboarding path
without adding a stale, state-blind product tour. Chosen design: a data-driven
checklist whose every step is verified against the real tables, consistent with
the platform's "no fake success / no invented data" contract.
