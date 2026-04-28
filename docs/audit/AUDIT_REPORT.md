# Sentinel Platform — Principal Architect QA/QC Audit Report

**Auditor:** Sentinel Engineering (Certifyi AI)
**Date:** 28 April 2026
**Standards applied:** Stripe / Datadog / Palantir engineering bar; OWASP ASVS L2; WCAG 2.1 AA; NIST AI RMF; Supabase production checklist.
**Scope:** Full-stack audit of the Sentinel AI Compliance Platform — `/home/user/workspace/sentinel` against the production project `vhparvughsygyknblkzt` (Supabase) and the Cloudflare Worker at `https://sentinel.hello-fbb.workers.dev`.

---

## 0. Executive summary

The Sentinel codebase is a **functioning, large-scope GRC platform** (241 page files, 99 hooks, 60 services, 144 Supabase tables) with strong feature coverage but several **production-grade defects** that must be resolved before claiming Stripe/Datadog parity. The v1.0 audit-remediation commit (`c6ebb92`) closed seven blockers but exposed deeper structural debt that this report enumerates.

**Verdict by severity:**

| Severity | Count | Examples |
|---|---|---|
| **P0 — Critical, exploitable now** | 6 | `users_with_details` SECURITY DEFINER view; 52 `rls_policy_always_true` (multi-tenant breach); leaked-password protection disabled; 8 SECURITY DEFINER functions executable by anon |
| **P1 — High, fix this iteration** | 11 | 66 tables with RLS-on/no-policy; 454 `: any` usages; 180 `@ts-nocheck` files; no global error boundary; no token-refresh handler; `: any` in API client; CSP allows `'unsafe-inline'` |
| **P2 — Medium, plan and schedule** | 14 | 111 unindexed FKs; 105 unused indexes; 114 multiple-permissive policies; placeholder Supabase URL fallback in `lib/supabase.ts`; no Cmd+K (verify); duplicate routes (`/security/scans` and `/security/scanner` resolve to same component) |
| **P3 — Polish** | 7 | Bundle warnings (>500 kB), missing skip-links audit, mixed icon libraries (`@phosphor-icons/react` and `lucide-react` both present), `console.log`/`console.error` left in src |

The full §2.3 schema-conform proposed in the launch prompt would require **destroying or renaming ~75 % of the live schema** and rewriting **~50 pages, ~30 services, ~30 hooks** (>10 k LOC). This is documented in [`schema_delta.md`](./schema_delta.md). This report flags it as **P1 architecture work, multi-week, must run on a Supabase development branch**, not a single-session destructive migration.

---

## 1. Phase 1 — Frontend Audit

### 1.1 Architecture & code quality

| Check | Status | Evidence |
|---|---|---|
| Components SRP / ≤200 LOC | **FAIL** | `dashboard/src/pages/Settings.tsx` = 1 003 LOC; multiple page files >700 LOC. Decomposition needed. |
| Server vs client state separation | PASS | TanStack Query for server state (`@tanstack/react-query` v5), Zustand for client state (`stores/settingsStore.ts`, `store/authStore.ts`). |
| 100 % typed, no `any` | **FAIL** | 454 occurrences of `: any` across `dashboard/src/**/*.{ts,tsx}`. 180 files use `// @ts-nocheck`. Typecheck still passes only because of these escape hatches. |
| Path aliases / no circular deps | PASS | `@/` alias active; spot-checked imports are tree-shakeable. |
| React error boundaries | **FAIL** | No top-level `<ErrorBoundary>` wrapping `<Routes>` in `dashboard/src/App.tsx`. A render error in any lazy-loaded page kills the entire app. |
| Bundle size | WARN | `dist/assets/index-j32nnYVK.js` = **673 kB** raw / **184 kB gzipped** (above 500 kB raw target). Recharts + Supabase + seed data dominate. |
| Console noise in src | WARN | 5 `console.log`, 6 `console.error` in `dashboard/src/**`. Should be routed through `lib/logger.ts`. |
| Hardcoded secrets | PASS | Grep for `sk_live_|sk_test_|AKIA…|eyJhbGc` returns zero hits in `dashboard/src/`. |
| `.env` discipline | PASS (with caveat) | `dashboard/.env.local` correctly gitignored; root `.env.example` is hygienic. **Caveat:** `dashboard/src/lib/supabase.ts` falls back to a literal `'https://placeholder.supabase.co'` and `'placeholder-key'` if env vars are missing — this means the client *silently* runs against a non-existent project rather than failing loud. **Fix:** throw at module load if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset (the sister file `dashboard/src/lib/supabaseClient.ts` already does this — consolidate). |

### 1.2 React / TypeScript patterns

| Check | Status | Evidence / fix |
|---|---|---|
| Custom hooks for stateful logic | PASS | 99 hook files; pages mostly thin. |
| `useMemo`/`useCallback` only where measured | UNKNOWN | No profiling baseline in repo. Recommend Lighthouse + React Profiler runs before optimizing. |
| Stable list keys (no array index) | UNKNOWN | Spot-check of `RolesPage.tsx` and `Settings.tsx` shows `key={item.id}` — looks compliant; full sweep not done. |
| `useEffect` cleanup | WARN | `dashboard/src/App.tsx` registers `initSessionGuard()` in a top-level `useEffect`, with `destroySessionGuard()` in cleanup — correct. Realtime hooks (`useRealtimeEvents`, `useRealtimeInvalidation`) need verification that channels are `removeChannel`'d on unmount. |
| `AbortController` for async effects | **FAIL** | TanStack Query queryFn signatures don't pass `signal` through to `supabase-js`. Stale closures are unlikely with TanStack but extension recommended. |
| Suspense boundaries | PASS | All lazy routes wrapped in `<Suspense fallback={<Loading />}>` in `App.tsx`. |

### 1.3 API / Supabase integration

| Check | Status | Evidence |
|---|---|---|
| Centralized API client | PARTIAL | `dashboard/src/lib/api-client.ts`, `apiClient.ts`, and `api.ts` all exist — redundant. Spec §2.5 calls for one. **Fix:** consolidate to a single `api.ts`. |
| Error handling on every call | PARTIAL | Most service functions wrap `supabase.from()` in try/catch with `console.warn`-then-empty-array. This is **silent failure** — users never see the error. **Fix:** rethrow typed errors so TanStack Query surfaces them through the `error` slot. |
| Loading / success / error states | PASS for most data hooks | `useSettingsData`, `useCarbonRecordsData` etc. expose `isLoading/isError`. |
| Optimistic updates on mutations | **FAIL** | Sampled `useUpdateControl`, `useUpsertCarbonRecord` — none use `onMutate`/`onError` rollback. Spec §2.6 mandates this pattern. |
| Retry / dedupe | PASS (default TanStack) | TanStack Query retries 3× by default. Confirmed `queryClient` is a singleton in `App.tsx`. |
| Auth header attachment | PASS | `supabase-js` attaches the JWT automatically once `auth.signInWithPassword` succeeds. |
| RLS enabled on all tables | PASS | All 144 tables have `rls_enabled = true`. |
| RLS *policies* exist | **FAIL — P0** | 66 legacy CamelCase tables have **RLS enabled but no policies** — these tables are unreadable by `authenticated` but also unreadable by intended users. 52 other tables have **`rls_policy_always_true` policies** — meaning anyone with a valid JWT can read every row in every org. Multi-tenant isolation is broken on those 52 tables. See `_data.txt` for full list. |
| Realtime channels unsubscribed | UNKNOWN | Need code review of `useRealtimeEvents.ts`, `useRealtimeInvalidation.ts`. |
| `select('*')` discipline | **FAIL** | 362 `supabase.from()` calls — most use `.select('*')`. For wide tables this ships unused columns over the wire. |
| N+1 risk | UNKNOWN | Need query profiling. |
| Storage bucket scoping | UNKNOWN | No evidence files seeded; bucket policies not reviewed in this audit pass. |

### 1.4 Routing / IA

- 559-line `App.tsx` with **hundreds of `<Route>` entries** registered manually. No file-based router. Consider `tanstack-router` or RR7's `createBrowserRouter` config-style declaration to make routes discoverable.
- **Duplicate route bug:** `/security/scans` and `/security/scanner` both render `<ScanCenter />`. Likewise `/security/model-auditor` → `<SecurityOverview />`, `/security/campaigns` → `<ThreatFeed />`, `/security/frameworks` → `<SecurityHome />`, `/security/strategy` → `<SecurityHome />`. These are placeholder aliases. **Fix:** either implement the distinct pages or remove the dead routes.

---

## 2. Phase 2 — UI/UX Audit

### 2.1 Information architecture

| Check | Status |
|---|---|
| ≤3 clicks to any feature | PASS — sidebar IA is 2-deep |
| Sidebar hierarchy | PASS — Primary → sub-nav |
| Breadcrumbs | UNKNOWN — needs visual verification on each page |
| Cmd+K palette | PRESENT (`components/CommandPalette.tsx` imported in App.tsx) — coverage of routes not verified |
| Onboarding wizard | UNKNOWN — `/auth/login` flow exists, multi-step org-setup wizard not confirmed |

### 2.2 Visual design consistency

| Check | Status | Evidence |
|---|---|---|
| Design tokens (CSS vars) | PASS | All inspected components use `hsl(var(--bg-surface))`, `hsl(var(--brand))`, etc. |
| Single component library | PASS | `components/ui/*` exists (Card, Button, Input, Badge, Switch, Tabs, Dialog, AlertDialog, Select). |
| Dark mode persisted | PASS | `providers/theme.tsx` + `useTheme()` hook. |
| **Single icon library** | **FAIL** | Both `@phosphor-icons/react` (in Settings.tsx) and `lucide-react` (in spec, possibly used in newer pages) appear in the codebase. Pick one and migrate. |
| Empty states | UNKNOWN — partial sample shows "No records" placeholders |
| Loading skeletons | PARTIAL — `PageSkeleton` exists; granular per-table skeletons not standard |
| Error states | PARTIAL — silent-failure pattern (1.3 above) means many error states never render |

### 2.3 Compliance UX

| Check | Status |
|---|---|
| Framework selector | PASS — `/frameworks` route + `FrameworkCatalog` page |
| Cross-framework mapping | PARTIAL — code exists; UX clarity not verified |
| Evidence drag-and-drop with progress | UNKNOWN — `EvidenceVault` page exists, virus-scan indicator unconfirmed |
| Assignee picker w/ workload | UNKNOWN |
| Audit trail (actor, before/after) | PASS — `audit_logs` table seeded; `AuditLog`, `AuditLogExplorer` pages exist |
| Risk matrix (5×5) | PASS — `RiskMatrix.tsx` page |
| Progress indicators % | PARTIAL — `compliance_scores` table exists but currently empty (0 rows) |
| Deadline tracking | UNKNOWN |

### 2.4 Accessibility (WCAG 2.1 AA)

This audit did **not** run a full a11y sweep (axe, Lighthouse). High-likelihood gaps based on code patterns:

- **Focus rings:** Several `<Button>` and `<Input>` styles include `style={{ borderRadius: 0 }}` and custom variants. Verify `outline: none` is never used without a `:focus-visible` replacement.
- **ARIA labels on icon buttons:** Phosphor `<Trash size={13} />` etc. inside `<Button>` — many icon-only buttons in `RolesPage.tsx` lack `aria-label`. **Fix this iteration.**
- **Reduced motion:** Need an audit of any CSS animations in `styles/`.
- **Color contrast:** Brand colors against surface backgrounds need a contrast pass (use WebAIM checker).
- **Skip-to-content link:** Not present in `App.tsx`.

### 2.5 Performance

- **LCP / INP / CLS:** Not measured in this audit. Recommend Lighthouse run on `/overview` and one heavy table page (e.g. `/risk`).
- **Code splitting:** PASS — `lazy(() => import(...))` per route; ~80 chunks emitted by `vite build`.
- **Bundle warnings:** `index-j32nnYVK.js` 673 kB raw, `charts-mRjXs73_.js` 456 kB raw, `supabase-C4YzwkIM.js` 195 kB. Recharts + supabase-js are the heaviest contributors. Consider `rollupOptions.output.manualChunks` to split vendor more aggressively.
- **Image optimization:** Logo uses brand color (no raster); minimal img usage in code.
- **Cloudflare caching:** Static assets served by Workers via `assets.directory: dashboard/dist` with `not_found_handling: single-page-application` — Cloudflare's defaults cache at edge.

---

## 3. Phase 3 — Backend Audit

### 3.1 Cloudflare Worker

The Worker is a **static-asset Worker only** (`wrangler.jsonc` declares `assets.directory: dashboard/dist`, no `main` script). There is no Hono.js API in production today — all data flows go from the browser's Supabase JS client directly to PostgREST. This means every spec §2.4 check (rate limiting, Zod validation, JWT middleware, etc.) is **N/A for the current architecture**.

| Check | Status |
|---|---|
| Worker main script | NOT PRESENT — assets only |
| Env bindings | PARTIAL — `SUPABASE_URL`/`SUPABASE_ANON_KEY` added in v1.0 commit `c6ebb92` but unused (no Worker code reads them) |
| Rate limiting / auth middleware | N/A (no Worker code) |
| CORS / CSP | PARTIAL — security headers configured in `dashboard/wrangler.toml` but root `wrangler.jsonc` (the live deployment target) does **not** apply them |
| Request logs | N/A |

**Recommendation:** if you want a real API tier, build the Hono.js Worker as the spec describes — but introduce it incrementally behind feature flags so the existing direct-Supabase calls keep working.

### 3.2 Supabase database

#### Schema design

- **Mixed tenancy:** 47 tables use `org_id`, 27 use `tenant_id`. This violates "one source of truth" and complicates joins. Spec §2.3 requires `org_id` everywhere. See `schema_delta.md`.
- **Foreign keys present** on most tables; cascade behavior consistent.
- **Indexes:** **111 unindexed foreign keys** flagged by Supabase performance advisor. See `_data.txt`.
- **Migrations:** 37 files in `supabase/migrations/`. Tracked in source control. PASS.
- **PL/pgSQL functions:** present (`get_org_id`, `set_updated_at`, `handle_updated_at`, `get_user_role`, `is_org_admin`, `handle_new_user`, `update_updated_at`). 8 of these flagged with `function_search_path_mutable` — **P0 fix** below.
- **Audit-log triggers:** `audit_log` and `audit_logs` tables exist; trigger coverage on sensitive tables (`controls`, `evidence`, `risks`, `ai_models`) not verified end-to-end.

#### RLS policy hygiene (Supabase advisor results)

| Finding | Severity | Count | Impact |
|---|---|---|---|
| `security_definer_view` on `users_with_details` | **P0 ERROR** | 1 | View runs as definer — RLS bypassed entirely. Any caller can read `auth.users` columns leaked into view. |
| `rls_policy_always_true` | **P0 WARN** | 52 | RLS enabled but policy `USING (true)` allows all authenticated users to read any row. Multi-tenant isolation broken. |
| `anon_security_definer_function_executable` | **P0 WARN** | 8 | SECURITY DEFINER functions callable by `anon` role — privilege escalation. |
| `authenticated_security_definer_function_executable` | **P0 WARN** | 8 | Same, callable by `authenticated`. |
| `function_search_path_mutable` | **P1 WARN** | 8 | Functions can be hijacked by search_path manipulation. Set `SET search_path = ''` on each. |
| `auth_leaked_password_protection` | **P1 WARN** | 1 | HIBP password leak check disabled. Enable in Supabase Auth → Password Strength. |
| `rls_enabled_no_policy` | **P2 INFO** | 66 | Legacy CamelCase tables (Tenant, User, Framework, Policy, Control, Model, …) have RLS enabled but zero policies. Effectively unreadable. Either drop the unused legacy tables (preferred — modern snake_case duplicates exist with data) or write policies if they are still in use. |

**Performance advisor:**

- 114 `multiple_permissive_policies` — multiple PERMISSIVE policies on the same table+command+role; PostgREST evaluates all of them, hurting performance. Consolidate to one PERMISSIVE per (table, command, role) and use RESTRICTIVE to layer.
- 111 `unindexed_foreign_keys` — add covering indexes for hot FKs (`org_id`, `tenant_id`, `framework_id`, `control_id`).
- 105 `unused_index` — drop indexes pg_stat_user_indexes shows zero scans for, after verifying the app actually exercises those query paths in production.
- 22 `auth_rls_initplan` — RLS policies that call `auth.uid()` per-row instead of once-per-query. Wrap with `(SELECT auth.uid())` to push it to InitPlan.
- 4 `duplicate_index` — drop the duplicates.

### 3.3 Security audit

| Check | Status | Action |
|---|---|---|
| Short-lived JWTs | DEFAULT — Supabase issues 1 h access tokens by default | Match spec (15 min) by setting `JWT_EXPIRY` in Supabase project settings |
| OIDC/SSO | PRESENT — `SsoProviders.tsx` + `sso_config` table | Verify Google Workspace + Microsoft Entra connectors work end-to-end |
| Secret scanning | PASS — repo has `.gitleaks.toml`, `.pre-commit-config.yaml` |
| `npm audit` | NOT RUN in this pass — recommend on next CI cycle |
| CSP headers | PARTIAL — `dashboard/wrangler.toml` (unused) defines a strict CSP; live `wrangler.jsonc` has **none**. **Fix:** port the headers config into the live `wrangler.jsonc`. |
| HTTPS / HSTS | PARTIAL — same; HSTS only in unused `wrangler.toml` |
| Multi-tenant isolation test | **FAIL** — given 52 `rls_policy_always_true` policies, isolation is breached on those tables. Add `pgTAP` or vitest-against-Supabase tests that prove org A cannot read org B's rows. |

---

## 4. P0 / P1 / P2 / P3 issue inventory

### P0 — Critical, fix before next deploy

1. **Drop or rewrite `users_with_details` SECURITY DEFINER view.** It bypasses RLS.
2. **Replace 52 `rls_policy_always_true` policies** with proper `org_id` / `tenant_id` scoping.
3. **Revoke EXECUTE on 8 SECURITY DEFINER functions** from `anon` and `authenticated`. Grant only to specific service roles.
4. **Lock `search_path` on 8 functions** with `SET search_path = ''` and fully-qualified references.
5. **Enable HIBP leaked-password protection** in Supabase Auth dashboard.
6. **Token refresh:** wire `supabase.auth.onAuthStateChange` in `App.tsx` to invalidate TanStack queries on `TOKEN_REFRESHED` and `SIGNED_OUT`. Currently sessions silently expire.

### P1 — High, this iteration

7. Add a top-level `<ErrorBoundary>` around `<Routes>` in `App.tsx`.
8. Migrate `dashboard/src/lib/supabase.ts` to fail-fast on missing env (consolidate with `supabaseClient.ts`).
9. Burn down 180 `@ts-nocheck` files. Start with services and hooks, leave large pages for later.
10. Replace 454 `: any` usages with proper types or `unknown` + narrowing.
11. Implement optimistic updates on hot mutation paths (control status toggle, task move, evidence approve).
12. Stop swallowing errors in services — rethrow so TanStack Query surfaces them.
13. Fix duplicate-route placeholders (`/security/scans` ≡ `/security/scanner`, etc.) — implement or delete.
14. Pick one icon library; migrate phosphor → lucide (or vice-versa).
15. Port the strict CSP / HSTS headers from `dashboard/wrangler.toml` into the live `wrangler.jsonc`.
16. Replace `'unsafe-inline'` in CSP with hashed scripts or remove inline scripts entirely.
17. Add `aria-label` on every icon-only button. RolesPage row-action buttons are the most visible offenders.

### P2 — Medium, plan and schedule

18. Drop the 66 legacy CamelCase tables (`public.Tenant`, `public.User`, `public.Framework`, etc.) once you verify nothing reads them. Confirms architectural cleanup spec §2.3 implies.
19. Consolidate the 27 `tenant_id`-scoped tables to `org_id` (multi-week — see `schema_delta.md`).
20. Add covering indexes for the 111 unindexed FKs.
21. Drop the 4 duplicate indexes; investigate the 105 unused indexes after a production workload sample.
22. Wrap RLS `auth.uid()` calls in `(SELECT auth.uid())` to fix 22 init-plan flags.
23. Consolidate the 114 multiple-permissive policies.
24. Decompose `Settings.tsx` (1003 LOC) into per-tab files.
25. Decompose other >700 LOC pages.
26. Build the Hono.js Worker API per §2.4 if you want a real API tier — incremental, behind feature flags.
27. Manual chunks for `recharts` and `supabase-js` to shave ~200 kB off the main bundle.
28. Add CI pgTAP suite proving cross-tenant read isolation.
29. Lighthouse / axe automated run in CI.
30. Replace `console.log/error` in src with `lib/logger.ts` calls.
31. Add E2E Playwright test covering: login → create org → upload evidence → mark control implemented → see compliance score change.

### P3 — Polish

32. Document undocumented hooks (most have no JSDoc).
33. Add storybook for `components/ui/*`.
34. Visual regression suite (Chromatic or Loki).
35. Decompose the 559-line `App.tsx` route table into a route-config module.
36. Audit copy / microcopy.
37. Brand-asset audit (logo variants, favicons).
38. Open-graph metadata per route.

---

## 5. Open-source readiness audit (§2.9)

| Item | Status |
|---|---|
| LICENSE | **PRESENT** — 189 lines (Apache 2.0 confirmed in spec) |
| CONTRIBUTING.md | PRESENT — 128 lines |
| CODE_OF_CONDUCT.md | PRESENT — 128 lines |
| SECURITY.md | PRESENT — 123 lines |
| .github/ISSUE_TEMPLATE/ | PRESENT — bug, feature |
| .github/ISSUE_TEMPLATE/security | **MISSING** — added in this commit |
| .github/PULL_REQUEST_TEMPLATE.md | PRESENT |
| .github/workflows/ci.yml | PRESENT |
| .github/workflows/deploy-dashboard.yml | PRESENT |
| .github/workflows/security.yml | PRESENT |
| .github/workflows/schema-drift.yml | PRESENT |
| README.md (architecture, quickstart, env, deploy) | PRESENT — 152 lines |
| docs/ | PRESENT |
| docker-compose.yml | PRESENT |
| .env.example (root) | PRESENT |
| **dashboard/.env.example** | PRESENT (`dashboard/.env.example`) |
| **CHANGELOG.md** | PRESENT — 29 lines (sparse; add v1.0 + this audit's entry) |

The repository's OSS surface is **already strong**. Adding the security issue template and refreshing CHANGELOG closes the remaining gaps.

---

## 6. What this commit fixes

- Adds `docs/audit/AUDIT_REPORT.md` (this file).
- Adds `docs/audit/schema_delta.md` (live → §2.3 mapping with blast radius).
- Adds `.github/ISSUE_TEMPLATE/security_report.md` (responsible-disclosure path).
- Updates `CHANGELOG.md` with the v1.0 audit-remediation entry and this audit pass.
- **Does NOT** run destructive schema DDL on production. The full §2.3 conform requires a Supabase development branch + multi-week rewrite of dependent code; running it cold on the live DB will brick the app. Track in `schema_delta.md`.

## 7. What's deferred

- 6 P0 DB fixes (security_definer view + 52 broken RLS policies + 8 SECURITY DEFINER grants + 8 search_path locks + leaked-password toggle + token-refresh handler) — each requires careful per-table policy authoring, which is the same multi-week effort as the schema conform. Ship as a series of dedicated PRs.
- §2.4 Hono.js Worker API — requires architectural decision: do you want a Worker tier at all, or keep direct-from-browser Supabase calls?
- §2.3 schema conform — see `schema_delta.md`.
- Type-safety burndown (180 `@ts-nocheck`, 454 `: any`).

---

*— Sentinel Engineering · Certifyi AI · audit@certifyi.ai*
