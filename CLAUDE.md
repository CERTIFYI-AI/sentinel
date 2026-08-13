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

## Conventions

- Model detail route: `/models/inventory/:id` (canonical). Use cases:
  `/use-cases/:id`.
- Migrations live in `supabase/migrations/` — write idempotent SQL and keep the
  file in the repo even when applied live.
- Typecheck before shipping: `cd dashboard && npx tsc --noEmit`.
