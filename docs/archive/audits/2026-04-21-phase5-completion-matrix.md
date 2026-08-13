{/* SPDX-License-Identifier: Apache-2.0 */}
<!--
  SPDX-License-Identifier: Apache-2.0
  Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

  Phase 5 Completion Matrix — generated 2026-04-21
  Branch: phase-5/audit-ci-uiux-typography-20260421
-->

# Phase 5 Completion Matrix

**Date:** 2026-04-21  
**Branch:** `phase-5/audit-ci-uiux-typography-20260421`  
**Auditor:** Principal Staff Engineer (automated audit)

---

## Artifact Checklist

| # | Artifact | Status | Notes |
|---|----------|--------|-------|
| 1 | `dashboard/src/services/` — per-resource service files | **PASS** | 57 service files present covering all GRC modules (risks, incidents, controls, vendors, evidence, RBAC, etc.). Some duplication: parallel `fooService.ts` and `foo.service.ts` naming conventions exist for incidents, notifications, risks, vendors. |
| 2 | `dashboard/src/hooks/` — TanStack Query wrappers | **PASS** | 75+ hook files present in `hooks/` plus `hooks/queries/` subdirectory. All major modules have corresponding `useFooData` hooks wrapping TanStack Query. |
| 3 | `dashboard/src/components/ui/` — shared UI components | **PASS** | 38 component files present (Button, Badge, DataTable, Dialog, DatePicker, Select, Tabs, etc.). Both custom Sentinel variants (`SentinelButton`, `SentinelInput`) and Radix/shadcn primitives present. |
| 4 | `dashboard/src/styles/tokens.css` | **PASS** | File exists at `dashboard/src/styles/tokens.css`; imported as first line of `index.css`. |
| 5 | `supabase/migrations/` — RLS, audit, RBAC | **PASS** | 35 migration files present. Coverage includes: RLS tenancy sweep (`ws01_tenancy_*`, `ws02_tenancy_sweep`), audit log (`ws03_audit_log`), RBAC depth (`ws04_rbac_depth`), core schema, FTS, settings tables, seed data. |
| 6 | `SECURITY.md` | **PASS** | File exists at repo root. |
| 7 | `CONTRIBUTING.md` | **PASS** | File exists at repo root. |
| 8 | `docs/ops/dr-runbook.md` | **PASS** | File exists at `docs/ops/dr-runbook.md`. |
| 9 | `docs/adr/` directory | **FAIL** | Directory does not exist. No Architecture Decision Records have been created. Must be created with at least a `.gitkeep`. |
| 10 | CI workflow (`.github/workflows/ci.yml`) | **PARTIAL** | File exists and covers typecheck, test-dashboard, test-workers, security (Semgrep + Gitleaks), and a11y-smoke. **Failures:** `npm ci` used without `--legacy-peer-deps` (breaks due to @types/react-dom@18 vs @types/react@19); `returntocorp/semgrep-action@v1` is deprecated; no `NODE_OPTIONS` memory setting for typecheck; no job-level timeouts. |
| 11 | Test files (`src/__tests__/` and `src/lib/__tests__/`) | **PASS** | `src/__tests__/` has 5 test files; `src/lib/__tests__/` has 17 test files covering services, RBAC, audit, tenancy, observability, webhooks, and UI components. |
| 12 | `PROGRESS.md` | **PASS** | File exists at repo root with Phase 4 sprint tracking table. |

---

## Phase 4 Merged Features

The following workstream PRs were merged into `main` before this branch was cut:

| PR | Commit | Feature |
|----|--------|---------|
| #42 | `6026f6c` | Phase 4 backend wire and gap close (merge commit) |
| — | `e59b912` | `chore(deploy)`: add `[env.staging]` block to `wrangler.toml` |
| — | `df03d7c` | `fix(build)`: resolve 3 duplicate-symbol errors blocking Vite build |
| — | `b47725f` | `test(unit+e2e)`: F.1–F.4 Vitest unit tests + Playwright smoke stubs + coverage config |
| — | `df84f0f` | `fix(fts)`: sync local migration to v5 — subquery ORDER BY + verified column names |
| — | `9192d46` | `fix(search)`: update `useGlobalSearch` RPC param `p_org_id→p_tenant_id` |
| — | `e1c9f39` | `fix(ci+fts)`: setup-node v4→v6 in ci.yml; correct FTS indexes + `global_search()` |
| — | `03097f8` | `feat(findings)`: D+E close N-01,N-04,N-05,N-08,N-10,N-11,N-12,N-15 + XC-08,XC-14,D-01 |
| — | `c15790a` | `feat(rbac-sso)`: C.1–C.7 — RBAC seed, demo data seeder, OrgSwitcher, ViewAsRole, JitElevation, SsoAdmin |
| — | `fb95762` | `fix(regression)`: A.1–A.4 — Open Tasks link, /incidents redirect, hardcoded dates, attention banner |
| #41 | `4dda25d` | Phase 3 foundation pack (merge commit) |
| — | `450144c` | `feat(ph3-foundation)`: audit app layer + forms + observability + CI gates |
| — | `357a20c` | `feat(ph3-ws02)`: multi-tenant RLS sweep — idempotent migration + invariants |
| — | `8711fa2` | `feat(ph3-ws01)`: typed data layer — Result<T,AppError> + createService + createResourceQueries |
| — | `bc3e95e` | `feat(ph3-ws03)`: canonical RBAC surface + `<Can>` + `withRBAC` + `current_user_permissions` RPC |
| — | `69e7342` | `feat(ws7)`: UX polish + WCAG 2.2 AA + i18n (7 locales) + white-label theming |
| — | `f9eab60` | `feat(ws9)`: admin seed with 536 demo records for GA |
| — | `8a671fd` | `feat(ws8)`: OpenAPI 3.1 spec + webhooks + 22 integration scaffolds |

---

## Readiness Score

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Data layer (services + hooks) | 95% | Comprehensive coverage; minor naming inconsistency (dual service file convention) |
| UI components | 75% | Core primitives present; missing `PageHeader` shared component; Sidebar lacks collapse/icon-only mode |
| Database migrations | 90% | All critical RLS, audit, and RBAC migrations present; ordering relies on filename timestamps |
| CI pipeline | 60% | Pipeline structure sound but 4 active failures blocking PR merges (coverage crash, TS error, peer deps, deprecated action) |
| Documentation | 85% | SECURITY, CONTRIBUTING, DR runbook all present; `docs/adr/` missing entirely |
| Typography / Design system | 50% | Tokens CSS exists; Google Fonts CDN dependency violates self-host policy; 12+ inline `fontFamily` violations |
| Test coverage | 70% | 22 test files present; coverage collection crashes due to version mismatch |

**Overall Readiness: ~75%** (targeting ≥ 85% at Phase 5 gate)

### Blockers to ≥85%
1. CI must be green (WS2 fixes required — see `2026-04-21-phase5-new-findings.md`)
2. Typography self-hosting must be implemented (WS3/WS4)
3. `docs/adr/` directory must be created
4. `PageHeader` shared component needed (WS3)
