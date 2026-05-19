# Test Harness — Architecture (WS0.5)

## Goal

Fortune 500 buyers require proof that shipped code is tested, not
merely type-checked. WS0.5 installs the test harness and CI gates so
every subsequent workstream lands with executable tests that block
regressions.

## Layers

| Layer | Tool | Scope | Where |
|---|---|---|---|
| Unit | Vitest | Pure functions, hooks, helpers | `dashboard/src/**/*.test.{ts,tsx}` |
| Component | Vitest + RTL | Rendered components, a11y, ARIA | `dashboard/src/**/__tests__/*.test.tsx` |
| E2E | Playwright | Auth guard, smoke flows, a11y landmarks | `dashboard/e2e/*.spec.ts` |
| Contract | `vitest` tests for exporter/canonicaliser formats | `dashboard/src/lib/__tests__/audit-canonicalise.test.ts`, `evidence-chain-verify.test.ts` |
| Infra | Supabase pgTAP (follow-up) | RLS policies, RPC guards | pending WS4 |

## Coverage floor

v8 coverage with a **70%** floor on lines, branches, functions, and
statements, enforced by `vitest run --coverage`. Excludes generated
UI primitives (`src/components/ui/**`) and wiring-only files
(`main.tsx`).

Lifting the floor is a separate PR each time (70% → 80% in WS3,
→ 85% in WS6).

## CI gate matrix

| Gate | Workflow | Blocks merge? |
|---|---|---|
| Typecheck | `ci.yml / typecheck` | yes |
| Build | `ci.yml / build` | yes |
| Unit + coverage (70%) | `ci.yml / unit-tests` | yes |
| Playwright smoke (@smoke) | `ci.yml / e2e-tests` | yes |
| Gitleaks | `security.yml / secrets` | yes |
| npm audit (high+) | `security.yml / dependencies` | yes |
| Semgrep OWASP+TS+React+Node | `security.yml / semgrep` | yes |
| CodeQL JS/TS | `security.yml / codeql` | yes |
| Trivy fs + config (HIGH,CRITICAL) | `security.yml / trivy` | yes |

Branch protection on `main` must require these checks. The repo
admin runbook (follow-up in WS0.6) documents the GitHub settings
toggles.

## Conventions for new code

- Every new page or helper ships at least one co-located Vitest spec.
- Every new protected route has a `@smoke` Playwright test that
  asserts the auth guard enforces `/login` redirection.
- Every append-only chain / canonicaliser ships a contract test
  (`audit-canonicalise.test.ts` is the reference).
- Keep e2e tests deterministic — no reliance on live Supabase data.

## Local workflow

```bash
cd dashboard
npm ci

# watch-mode unit tests
npm run test:watch

# single run + coverage
npm run test:coverage

# end-to-end
npx playwright install --with-deps chromium
npm run test:e2e
```

## Known carryover

- `AgentDiscovery.tsx` and `Settings.tsx` still have pre-existing TS
  parse errors (WS1 scope). Their typecheck job is not currently
  green; the CI gate is installed but will start passing once WS1
  lands.
- Coverage will be < 70% on main until WS2/WS3 ship page-level tests
  alongside the 25+ new pages. The floor is set; CI will enforce
  from the first workstream PR that adds tested code paths.
