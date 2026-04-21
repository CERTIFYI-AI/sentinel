# WS3 — CRUD Completeness & Service Hardening

## Problem

The services layer (`dashboard/src/services/`) ships with a working but
inconsistent CRUD surface:

- 43/53 services use the `any` type in parameter or return positions
- 50/53 use `console.*` directly instead of structured telemetry
- 0/53 call supabase with an `AbortSignal`, causing request leaks on
  navigation
- 33/53 still use the legacy `tenant_id` column instead of the
  `org_id`-driven RLS model
- 0/53 validate input with zod
- 35/53 swallow errors inside `catch {}` blocks with a default return
  value, hiding all diagnostics

Fortune 500 security reviewers read service layer source during vendor
onboarding. Each of the findings above is a first-page audit question.

## Solution — Typed service factory + audit tool

### 1. `scripts/ws3-crud-audit.mjs`

A repeatable audit that grades every file in `services/` against CRUD
completeness and quality red-flags. Output is written to
`docs/crud-audit/REPORT.md` (human) and `REPORT.json` (CI). The script
takes ~50 ms on 53 services and is idempotent, so it lands as a CI
step in WS6.

### 2. `dashboard/src/lib/serviceFactory.ts`

A single `createService<TSchema, TInput>()` factory that emits a
`TypedService<Row, Input>` with this contract:

```ts
interface TypedService<TRow, TInput> {
  list(filters?: ListFilters): Promise<TRow[]>;
  get(id: string, signal?: AbortSignal): Promise<TRow | null>;
  create(input: TInput): Promise<TRow>;
  update(id: string, input: Partial<TInput>): Promise<TRow>;
  remove(id: string): Promise<void>;   // soft-delete by default
  restore(id: string): Promise<TRow>;
}
```

Guarantees:

- Every write is **validated against a zod schema** before it touches
  the DB — no `any` ever reaches Postgres.
- Every read accepts an `AbortSignal` and threads it through
  `supabase.abortSignal(signal)`; navigations no longer leak
  in-flight queries.
- `org_id` scoping is enforced by RLS at the DB — the factory never
  sets tenant ids client-side. Soft-delete is the default path
  (`deleted_at = now()`); hard delete requires `softDeleteColumn: null`.
- Errors are **raised**, not swallowed — every failure becomes a
  `ServiceError(code, message, cause)` that call sites must handle.
- All diagnostic output flows through `@/lib/telemetry`, which is a
  no-op in production until WS6 wires the Sentry + OTEL sinks.

### 3. Reference ports

- `dashboard/src/services/typed/consentRecords.ts` — consent records.
- `dashboard/src/services/typed/incidents.ts` — incidents.

Each is ~45 lines (down from 150+ in the legacy services) and is
covered by the `serviceFactory.test.ts` suite.

### 4. Legacy parity

Existing services under `dashboard/src/services/*.ts` remain in place.
Migrating them to the factory is a WS6 task; doing it in WS3 would
fan out to 40+ components in a single PR and violate the
"one workstream = one PR" rule.

## Append-only allowlist

Services marked append-only in `scripts/ws3-crud-audit.mjs` are
**intentionally** missing U/D. Their backing tables enforce
`RLS UPDATE/DELETE USING (false)` and all writes flow through
SECURITY DEFINER `*_append()` RPCs (WS0.3 hash-chain pattern).

Current allowlist:

- `auditLogService` — tamper-evident audit log.

## Next steps

- WS4 wraps high-risk mutations (`remove`, `restore` on
  policy-attestation, AI model registry, etc.) in RBAC gates.
- WS6 migrates every service to the factory and fails CI on any
  regression caught by `scripts/ws3-crud-audit.mjs`.
- WS8 auto-generates input + output schemas from the OpenAPI 3.1
  spec, collapsing the hand-written zod schemas.
