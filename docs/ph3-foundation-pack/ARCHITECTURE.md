# Phase 3 — Foundation Pack (WS0.4 + WS0.5 + WS0.6 + WS0.10)

_Consolidated PR covering audit chain app layer, form framework, observability, and CI/test harness._

## Scope

| WS     | Deliverable                                                | Status   |
|--------|------------------------------------------------------------|----------|
| WS0.4  | `withAudit()` middleware, typed audit service, exporters, verifier script | shipped |
| WS0.5  | Shared zod schema package + `useFormWithSchema()` hook     | shipped |
| WS0.6  | Structured logger, `<ErrorBoundary>`, edge `withLogging()` | shipped |
| WS0.10 | CI workflow, coverage gate, Playwright a11y smoke, MSW stub | shipped |

## WS0.4 — Audit layer

Postgres infrastructure (`audit_log`, `audit_log_head`,
`audit_log_append()`, `audit_log_verify_chain()`) was already landed in
`20260421_ws03_audit_log.sql`. This PR delivers the app layer:

- **`workers/middleware/withAudit.ts`** — HOC wrapping a Worker handler.
  Emits one audit row per request, fire-and-forget, outcome derived
  from the response status (`200-399` → success, `401/403` → denied,
  `≥400` → failure). Audit-write failures never flip a 2xx to 5xx.
- **`dashboard/src/services/auditService.ts`** — typed read-only service
  using cursor pagination (`sequence_no` as cursor — monotonic per org,
  stable under inserts). Throws `ServiceError` on the rare read
  failure. No update/delete surface — RLS forbids it.
- **Exporters** — CSV (RFC 4180 escaping), JSON (pretty), NDJSON
  (line-delimited). Mime type map via `formatExport()`.
- **`scripts/verify-audit-chain.mjs`** — standalone Node script; prefers
  the in-DB verifier and falls back to JS walk. Exits 0/1/2.
- **Legacy `auditLogService.ts`** — shimmed to the typed service. Old
  mutation helpers are no-ops (RLS blocks them anyway).

## WS0.5 — Forms

- **`packages/schemas/common.ts`** — the single zod source of truth.
  `riskInput`, `controlInput`, `vendorInput`, `money`, `isoDate`, `uuid`,
  `serverManagedKeys` list. Both dashboard forms and Worker validators
  import from here.
- **`dashboard/src/lib/forms/useFormWithSchema.ts`** — custom zod
  resolver (avoids coupling to `@hookform/resolvers/zod` whose generics
  churn across zod 3/4 + rhf 7 majors). Returns a typed rhf handle.

## WS0.6 — Observability

- **`dashboard/src/lib/observability/logger.ts`** — structured
  `log.info/warn/error/debug`. Pipes to console only when
  `VITE_LOG_CONSOLE=1`; POSTs to `VITE_LOG_ENDPOINT` otherwise.
- **`ErrorBoundary.tsx`** — catches render errors, logs to the
  structured logger with the boundary name + component stack. Ships
  with a default recoverable fallback.
- **`workers/middleware/withLogging.ts`** — edge request logger,
  pino-compatible JSON line per request. Propagates `x-trace-id` back
  to the client so the dashboard can correlate.

## WS0.10 — Test harness & CI

- **`.github/workflows/ci.yml`** — jobs: typecheck (both packages),
  vitest (both), Gitleaks secret scan, Semgrep OSS ruleset. Optional
  Playwright a11y smoke gated on `vars.RUN_A11Y`.
- **`scripts/check-coverage.mjs`** — fails the build below 70% line /
  60% branch coverage on the dashboard.
- **`dashboard/tests-e2e/a11y.spec.ts`** — 10 highest-traffic routes,
  axe-core with `wcag2a/wcag2aa/wcag22aa` tags, zero serious/critical.
- **`dashboard/playwright.config.ts`** — base URL from env, Chromium
  only, retries in CI.
- **`dashboard/src/test/msw-handlers.ts`** — documentation scaffold for
  when msw@2 is added as a dev dep.

## Gherkin acceptance (representative)

```gherkin
Feature: Foundation pack
  Scenario: withAudit never flips a 2xx response to 5xx
    Given a handler that returns 200 OK
    And the audit RPC is unreachable
    When the wrapped handler runs
    Then the response is still 200 OK
    And the failure is recorded via onError

  Scenario: Audit service paginates by sequence_no
    Given 1,000 audit rows in the current org
    When listAuditEntries is called with limit 50
    Then it returns 50 rows and a nextCursor
    And passing that cursor returns the next 50

  Scenario: CI rejects a PR that drops coverage
    Given a PR where line coverage drops to 69%
    When the coverage gate runs
    Then it exits 1 and blocks the PR
```

## Rollback

All of this is additive. To roll back:
```bash
git revert <merge-commit>
# no DB changes; no secret rotations required
```
