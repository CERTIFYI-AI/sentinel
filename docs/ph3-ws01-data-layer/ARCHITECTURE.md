# Phase 3 WS0.1 — Typed Data Layer

## Goal
Establish the single path by which application code reaches Supabase so that
every subsequent resource (80+) inherits tenancy, RBAC, audit, validation,
cancellation, and cache coherence "for free".

## Contract
- **Result<T, AppError>** — tagged union. Services never throw for expected
  failures. Call sites must handle both branches.
- **createService\<Row, Input\>()** — the only factory used by domain
  services. Enforces soft-delete, cursor pagination, 15s timeout, zod
  validation on both boundaries, AbortSignal pipe-through.
- **createResourceQueries\<Row, Input\>()** — TanStack Query v5 hook factory.
  Centralizes cache keys, invalidation policy, and error unwrap.

## Files
| File | Purpose |
|------|---------|
| `dashboard/src/lib/result/index.ts` | Result/Ok/Err/AppError + `toAppError` normalizer |
| `dashboard/src/lib/service/createService.ts` | Typed Supabase service factory |
| `dashboard/src/lib/query/createResourceQueries.ts` | TanStack Query hook factory |

## Usage pattern (future WS2 PRs)
```ts
// dashboard/src/services/risks.service.ts
import { createService } from "@/lib/service/createService";
import { supabase } from "@/lib/supabase";
import { RiskRow, RiskInput } from "@/schemas/risks";

export const risksService = createService(supabase, {
  table: "risks",
  rowSchema: RiskRow,
  inputSchema: RiskInput,
  defaultOrderBy: "created_at",
});

// dashboard/src/hooks/queries/useRisks.ts
import { createResourceQueries } from "@/lib/query/createResourceQueries";
import { risksService } from "@/services/risks.service";
export const risksQ = createResourceQueries(risksService, "risks");
```
Component code then calls `risksQ.useList()`, `risksQ.useCreate()`, etc.
No direct supabase-js imports are ever needed in components.

## Tests
- `result.test.ts` — 9 cases covering Ok/Err, map, andThen, unwrap, SQLSTATE mapping
- `createService.test.ts` — 8 cases (cursor round-trip × 2, happy path × 5, security × 1)
- `createResourceQueries.test.tsx` — 4 cases covering useList/useDetail/useCreate + key stability

## Rollback
These modules are additive and side-effect free. Deleting the three files
and the test suite reverses all changes. No migrations.

## Findings closed
- Phase 3 #9 (form validation) — infrastructure: input validation at service boundary
- Phase 3 #14 (error boundaries) — partial: typed error envelope ready to feed
- Foundation for #2, #4, #7, #10 (CRUD, bulk, pagination, realtime)
