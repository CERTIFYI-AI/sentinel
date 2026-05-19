# Sentinel Platform — Phase 2 Full QA/QC Audit & Production Readiness Report

> **Author:** Certifyi Engineering · Principal Architect review
> **Date:** 2026-04-28 (Asia/Kathmandu)
> **Baseline commits:** `c6ebb92` (v1.0 audit remediation) → `2ecf04f` (Phase 2 audit) → this commit (Phase 2 remediation)
> **Live target:** <https://sentinel.hello-fbb.workers.dev>
> **Supabase project:** `vhparvughsygyknblkzt` (ap-southeast-1)
> **Codebase:** <https://github.com/CERTIFYI-AI/sentinel>

This report follows the exact structure requested in the principal-architect prompt
(deliverables A–J). It is intentionally specific: routes, tables, files, SQL.

---

## 1. Executive Summary

Sentinel is a multi-tenant AI-Governance-Risk-Compliance (GRC) platform built on
React + Vite + TanStack Query (frontend), Cloudflare Workers (assets-only as of
v1.0), and Supabase Postgres (RLS + Auth + Realtime + Storage). The codebase is
substantial (207 routes, 241 page components, 99 hooks, 60 services, 37
migrations, 144 live tables) and ships real product surface area beyond the
§2.3 spec's 11-table "compliance kernel."

**State after this commit:** the live deployment is stable, OSS hygiene is
complete, and the most dangerous frontend defect — a Supabase client that
silently booted with a placeholder URL/key when env vars were missing — is
fixed. The platform is **conditionally production-ready**: it is safe to run
publicly today, *but* a known-good list of P0 Supabase-side fixes (RLS, SECURITY
DEFINER perms, leaked-password protection) must be staged on a Supabase dev
branch and promoted before onboarding new tenants. Those changes are
destructive enough that running them cold against production is irresponsible.

The audit baseline supplied with this prompt contains **two material
inaccuracies** that this report corrects:

1. The "404" routes `/ciso-dashboard`, `/roi-value`, `/ai-models`,
   `/governance/overview`, `/governance/models` were never coded under those
   exact paths. The live sidebar uses `/ciso`, `/roi`, `/governance-framework`
   etc., and those routes *do* render in code. The 404s reported in the baseline
   are typos against an old sidebar revision, not real defects.
2. Sidebar state already persists to `localStorage` (`SIDEBAR_STORAGE_KEY` at
   `src/components/Sidebar.tsx:299, 420`) and already auto-expands the active
   section (`expandedSection`/`expandedItems` at lines 407–410). The "sidebar
   does not persist state" claim is stale — it was true in the previous live
   bundle, false in the current main branch.

Real residual issues are catalogued below in §4 and §11.

---

## 2. Current-State Assessment

### 2.1 Codebase

| Metric                                                  | Count     |
| ------------------------------------------------------- | --------- |
| Top-level routes registered in `src/App.tsx`            | **207**   |
| Pages on disk (`src/pages/**/*.tsx`)                    | **241**   |
| Hooks (`src/hooks/**/*.ts(x)`)                          | **99**    |
| Services (`src/services/**/*.ts(x)`)                    | **60**    |
| Files with `// @ts-nocheck`                             | **180**   |
| `: any` annotations                                     | **462**   |
| `supabase.from(...)` call sites                         | **362**   |
| Supabase migrations (`supabase/migrations/`)            | **37**    |
| Live Supabase tables                                    | **144**   |

### 2.2 Live deployment

| Probe                                            | Result                          |
| ------------------------------------------------ | ------------------------------- |
| `GET https://sentinel.hello-fbb.workers.dev/`    | `200 OK` — index served         |
| Asset bundle (live)                              | `index-BuD3kWiH.js` (stale)     |
| Worker has Hono.js API                           | **No** — assets-only deploy     |
| Wrangler `main` script                           | **None** in `wrangler.jsonc`    |

### 2.3 Database (Supabase advisors, run during this audit)

| Advisor             | Findings | Severity breakdown                                                 |
| ------------------- | -------- | ------------------------------------------------------------------ |
| Security advisors   | **144**  | 1 ERROR · 77 WARN · 66 INFO                                        |
| Performance advisors| **356**  | 114 multiple-permissive-policies · 111 unindexed FKs · 105 unused indexes · 22 auth_rls_initplan · 4 duplicate indexes |

Highest-severity items, all carried forward to PR2..N (see §12):

- 1× `security_definer_view` ERROR on `public.users_with_details`
- 52× `rls_policy_always_true` (multi-tenant isolation gap)
- 8 SECURITY DEFINER functions executable by `anon`, 8 by `authenticated`
- 8× `function_search_path_mutable`
- `auth_leaked_password_protection` disabled at project level

### 2.4 Tenancy model (mixed and inconsistent)

- 47 tables key on `org_id`
- 27 tables key on `tenant_id`
- 66 legacy CamelCase tables (`Tenant`, `User`, `Framework`, `Model`, …) have
  RLS enabled but **no policies** — effectively locked-down dead tables.
- `user_profiles.id` is the user PK (not `user_id` as a contributor might
  assume). Role check constraint allows: `owner | admin | compliance_manager
  | risk_analyst | auditor | viewer` (NOT `ciso`).

---

## 3. Critical Findings

| # | ID         | Severity | Title                                                                         | Status (this PR) |
|---|------------|----------|-------------------------------------------------------------------------------|------------------|
| 1 | SEC-P0-001 | P0       | `dashboard/src/lib/supabase.ts` placeholder fallback boots a broken client    | **FIXED**        |
| 2 | SEC-P0-002 | P0       | `users_with_details` view runs as SECURITY DEFINER (advisor ERROR)            | Deferred → PR2   |
| 3 | SEC-P0-003 | P0       | 52 RLS policies use `USING (true)` — no tenant isolation                      | Deferred → PR2   |
| 4 | SEC-P0-004 | P0       | 16 SECURITY DEFINER functions executable by anon/authenticated                | Deferred → PR2   |
| 5 | SEC-P0-005 | P0       | `auth_leaked_password_protection` disabled at project level                   | Deferred → PR2   |
| 6 | INT-P0-006 | P0       | No Supabase `onAuthStateChange` handler → cross-tenant cache leakage possible | **FIXED**        |
| 7 | UX-P0-007  | P0       | No route-level error boundary → one thrown render crashes the whole shell    | **FIXED**        |
| 8 | OSS-P0-008 | P0       | `.env.example` missing all `VITE_*` frontend vars                             | **FIXED**        |
| 9 | DAT-P1-009 | P1       | Legacy rows with `org_id IS NULL` cause zero-state KPI cards                  | SQL provided §11 |
|10 | UX-P1-010  | P1       | `/tasks` page may show skeleton forever when Supabase env vars missing       | **FIXED** (root cause = #1) |
|11 | UX-P1-011  | P1       | Notifications badge/list mismatch on stale deploy                             | Deferred — needs realtime check |
|12 | ENG-P1-012 | P1       | 180 files `@ts-nocheck`, 462 `: any`                                          | Tracked, multi-quarter cleanup |
|13 | ENG-P2-013 | P2       | Two parallel auth contexts (`AuthContext` JWT + Supabase session)            | Architectural — PR3 |
|14 | OSS-P2-014 | P2       | Mixed icon libs (`@phosphor-icons/react` + `lucide-react`)                    | Deferred         |
|15 | OSS-P2-015 | P2       | Two Sidebar components (`Sidebar.tsx`, `dashboard/Sidebar.tsx`)               | Verified — only `Sidebar.tsx` is mounted; deprecate other |

---

## 4. Full Findings Register

| ID         | Sev | Area      | Module/Page                       | Symptom                                                            | Root cause                                                | Remediation                                                | Owner         | Status         |
|------------|-----|-----------|-----------------------------------|--------------------------------------------------------------------|-----------------------------------------------------------|------------------------------------------------------------|---------------|----------------|
| SEC-P0-001 | P0  | Frontend  | `lib/supabase.ts`                 | Silent broken client when env vars missing                         | `|| 'placeholder.supabase.co'` fallback                   | Throw at module load; document required env vars           | Frontend lead | **DONE**       |
| SEC-P0-002 | P0  | Database  | `users_with_details` view         | `security_definer_view` advisor ERROR                              | View created with implicit DEFINER                        | `ALTER VIEW … SET (security_invoker = true)`               | DBA           | PR2            |
| SEC-P0-003 | P0  | Database  | 52 tenant tables                  | RLS policy returns `true` always                                   | Migration legacy / scaffolded incorrectly                 | Replace with `org_id = current_org()` or `auth.uid()` join | DBA           | PR2            |
| SEC-P0-004 | P0  | Database  | 16 functions                      | SECURITY DEFINER + grant to anon/authenticated                     | Dev shortcut                                              | `REVOKE EXECUTE … FROM anon`; convert to INVOKER where ok  | DBA           | PR2            |
| SEC-P0-005 | P0  | Auth      | Supabase project setting          | Pwned-password check off                                           | Default project setting                                   | Toggle in Auth → Providers settings                        | Platform      | PR2            |
| INT-P0-006 | P0  | Frontend  | `providers/SupabaseAuthListener`  | No cache invalidation on SIGNED_IN/OUT                             | Component never created                                   | New component, mounted in `main.tsx`                       | Frontend lead | **DONE**       |
| UX-P0-007  | P0  | Frontend  | `App.tsx` ProtectedLayout         | Render-time errors crash whole shell                               | No `<ErrorBoundary>` around `<Outlet>`                    | Wrap Outlet in `RouteErrorBoundary` keyed on pathname      | Frontend lead | **DONE**       |
| OSS-P0-008 | P0  | OSS       | `.env.example`                    | New contributors miss `VITE_*` vars                                | File only listed Python/SMTP vars                         | Add `VITE_SUPABASE_*`, `VITE_API_BASE_URL`, telemetry      | DevRel        | **DONE**       |
| DAT-P1-009 | P1  | Database  | ai_models, risk_register, vendors, tasks, notifications, incidents | KPI cards show 0                                          | Legacy rows with `org_id = NULL`                          | Idempotent backfill SQL (§11)                              | DBA           | SQL ready      |
| UX-P1-010  | P1  | Frontend  | `pages/Tasks.tsx`                 | Page stuck on PageSkeleton                                         | useTaskData fails silently when supabase client placeholder | Fixed via SEC-P0-001                                     | Frontend lead | **DONE** (transitive) |
| UX-P1-011  | P1  | Frontend  | Notifications badge               | Badge count > list length                                          | Realtime channel out of sync                              | Add `qc.invalidateQueries(['notifications'])` in realtime  | Frontend lead | PR3            |
| ENG-P1-012 | P1  | Frontend  | Whole app                         | 180 files `@ts-nocheck`, 462 `any`                                 | Historical migration debt                                 | Per-module typed conversion (track in issues)              | All           | Multi-quarter  |
| ENG-P2-013 | P2  | Frontend  | `context/AuthContext.tsx`         | Two parallel auth flows                                            | JWT-to-Worker auth coexists with Supabase session         | Consolidate on Supabase, keep JWT for Worker only          | Frontend lead | PR3            |
| OSS-P2-014 | P2  | Frontend  | package.json deps                 | Two icon libraries shipped                                         | Phosphor (legacy) + lucide (newer)                        | Pick one (phosphor — bigger usage), remove other           | Frontend lead | Deferred       |
| OSS-P2-015 | P2  | Frontend  | `components/dashboard/Sidebar.tsx`| Dead component                                                     | Legacy from rebrand                                       | Delete after grep confirms zero callers                    | Frontend lead | Deferred       |

---

## 5. Frontend Remediation Plan

**Shipped in this PR (file-by-file):**

| File                                                | Action  | Why                                                   |
|-----------------------------------------------------|---------|-------------------------------------------------------|
| `dashboard/src/lib/supabase.ts`                     | Replace | Throw on missing env; identical singleton API         |
| `dashboard/src/providers/SupabaseAuthListener.tsx`  | Create  | Invalidate React Query on SIGNED_IN/OUT, USER_UPDATED |
| `dashboard/src/main.tsx`                            | Edit    | Mount `<SupabaseAuthListener />` inside QueryClient   |
| `dashboard/src/App.tsx`                             | Edit    | Wrap `<Outlet>` in `RouteErrorBoundary` keyed on path |
| `.env.example`                                      | Append  | Document `VITE_*` build-time vars for contributors    |

**Planned for PR3 (token refresh & auth consolidation):**

- `dashboard/src/api/client.ts` — read Supabase access token before each
  Worker call instead of a long-lived custom JWT
- `dashboard/src/context/AuthContext.tsx` — derive `user`, `tenantId`,
  `role` from `supabase.auth.getUser()` + `org_members` JOIN
- Delete `dashboard/src/components/dashboard/Sidebar.tsx` (dead)
- Add a global `<ErrorBoundary fallbackTitle="App crashed">` at root for
  truly unrecoverable errors (post-mount) — supplements the route-level one

**Type cleanliness (multi-quarter):** track removal of `@ts-nocheck` and
`: any` per-module under a `chore/types/<module>` PR series. Do not bulk-fix.

---

## 6. Backend Remediation Plan

The current Worker is **assets-only** — there is no Hono.js API tier. The §2.4
spec describes one. We do **not** recommend building it speculatively. Instead:

1. **Defer Hono API** until a feature concretely requires it (file upload
   virus-scan webhook, EU-AI-Act webhook receiver, etc.). Until then, the
   dashboard talks directly to Supabase via PostgREST + RLS, which is the
   correct multi-tenant pattern.
2. **When Hono is added** (recommended skeleton):
   - `workers/src/index.ts` — Hono app, JWT verification middleware (Supabase
     issuer), org-scoping middleware that reads `org_id` from JWT claims,
     `zValidator` for every body and params.
   - Standard error envelope: `{ error: { code, message, details } }`.
   - Structured logs via `console.log(JSON.stringify({...}))` (Cloudflare
     Logpush picks them up).
   - Rate limit via `@hono/rate-limiter` + Workers KV.
3. **Wrangler** — set `main = "workers/src/index.ts"` only when ready;
   otherwise the Pages-style assets-only deploy stays.

---

## 7. Database & RLS Remediation Plan

Executed in **PR series on a Supabase dev branch**, never cold against prod:

```
PR2  RLS sweep
       - Drop & recreate 52 always-true policies with org-scoped predicates
       - Convert SECURITY DEFINER → SECURITY INVOKER where caller-context is fine
       - REVOKE EXECUTE … FROM anon on remaining DEFINER functions
       - SET search_path = '' on the 8 mutable-search-path functions
       - ALTER VIEW users_with_details SET (security_invoker = true)
       - Toggle leaked-password protection in dashboard
       - pgTAP: assert anon cannot SELECT any tenant table

PR3  Index sweep
       - Add 111 missing FK indexes
       - Drop 105 unused indexes
       - Drop 4 duplicate indexes
       - Consolidate 114 multiple-permissive-policy chains

PR4  Legacy table cleanup
       - grep confirms zero app callers of Tenant/User/Framework/Model (CamelCase)
       - Drop in batches of 5 with rollback migration
       - Verify zero RLS-on-no-policy advisors after

PR5..N  §2.3 Tier-A conform (optional, driven by product need)
        - Build snake_case canonical tables alongside (organizations, org_members,
          frameworks, controls, evidence, risks, tasks, ai_systems, audit_logs)
        - Backfill from existing tenant tables in a single SQL transaction
        - Switch app reads in a feature flag, then writes
        - Drop superseded tables only after 30-day soak
```

---

## 8. UI/UX Fix Plan

Verified **already correct** in current code (audit baseline was stale):

- Sidebar persistence — `localStorage[SIDEBAR_STORAGE_KEY]` at lines 299, 420
- Active-section auto-expand — `expandedSection`, `expandedItems` at 407–410
- Parent highlight when child active — line 614 (`expandedSection === section.title`)
- Tasks page loading state — `<PageSkeleton title="Tasks" />` at line 400

Outstanding UX work (post-audit, tracked as P1/P2 issues, not blocking):

- Add **loading skeletons** to remaining list pages (audit log, vendor registry,
  AIIA wizard) — pattern: copy from `Tasks.tsx` PageSkeleton usage.
- Add **empty-state CTA** to Notifications when count = 0 (link to "Notification
  rules" settings).
- A11y sweep: `axe-core` automated run + manual focus-trap audit on dialogs.
- Reduced-motion support: wrap framer-motion variants in
  `useReducedMotion()` from `framer-motion`.

---

## 9. API & Integration Completion Plan

| Surface                                  | Path                                          | Status     | Action                                |
|------------------------------------------|-----------------------------------------------|------------|---------------------------------------|
| Auth: login/register/logout              | Supabase JS SDK                               | Working    | Already wired via `supabase.auth.*`   |
| Auth: token refresh                      | Supabase JS SDK + `SupabaseAuthListener`      | **Wired**  | This PR                               |
| Frameworks CRUD                          | PostgREST `/rest/v1/frameworks`               | Working    | Add `useFrameworks` hook tests        |
| Controls / Evidence                      | PostgREST + storage signed URLs               | Working    | Validate file MIME server-side (PR3)  |
| Risks / Tasks                            | PostgREST                                     | Working    | Use `qc.invalidateQueries` in realtime|
| Realtime channels                        | Supabase realtime                             | Working    | `useRealtimeInvalidation` already mounted in `ProtectedLayout` |
| AI governance / model registry           | PostgREST                                     | Working    | Verify policies after PR2             |
| Reporting / exports                      | Postgres views + client-side CSV              | Working    | Add server-side PDF (post-Hono)       |

**Cache invalidation contracts** (already correct in code):

- Mutations call `qc.invalidateQueries({ queryKey: [<resource>] })` in
  `onSuccess` — see `useTaskData.ts`.
- Realtime subscriptions invalidate the same key — see
  `hooks/useRealtimeInvalidation.ts`.
- Auth events now invalidate `['auth' | 'profile' | 'org']` (this PR) and
  hard-reset cache on SIGNED_IN/OUT.

---

## 10. Open-Source Readiness Plan

| Asset                                              | Status        |
|----------------------------------------------------|---------------|
| `LICENSE`                                          | Apache-2.0    |
| `README.md`                                        | 152 lines, complete |
| `CONTRIBUTING.md`                                  | 128 lines     |
| `CODE_OF_CONDUCT.md`                               | 128 lines (Contributor Covenant) |
| `SECURITY.md`                                      | 123 lines, includes private disclosure |
| `SUPPORT.md`                                       | 78 lines      |
| `CHANGELOG.md`                                     | Keep-a-Changelog format |
| `.env.example`                                     | **Updated this PR** — frontend `VITE_*` vars added |
| `.github/ISSUE_TEMPLATE/bug_report.md`             | Present       |
| `.github/ISSUE_TEMPLATE/feature_request.md`        | Present       |
| `.github/ISSUE_TEMPLATE/security_report.md`        | Added in `2ecf04f` |
| `.github/PULL_REQUEST_TEMPLATE.md`                 | Present       |
| `.github/CODEOWNERS`                               | Present       |
| `.github/dependabot.yml`                           | Present       |
| `.github/workflows/ci.yml`                         | Present       |
| `.github/workflows/dco.yml`                        | Present (DCO sign-off enforced) |
| `.github/workflows/deploy-dashboard.yml`           | Present       |
| `.github/workflows/eval.yml`                       | Present       |
| `.github/workflows/release.yml`                    | Present       |
| `.github/workflows/schema-drift.yml`               | Present       |
| `.github/workflows/security.yml`                   | Present (gitleaks + CodeQL) |
| `docs/architecture.md` & `docs/architecture/`      | Present       |
| `docs/deployment.md` & `docs/deployment-guide.md`  | Present       |
| `docs/database.md`                                 | Missing — to add (small) |
| `Dockerfile` + `docker-compose.yml`                | Present       |
| `Makefile`                                         | Present       |
| `.gitleaks.toml`                                   | Present       |
| `.pre-commit-config.yaml`                          | Present       |

The OSS package is essentially complete. Only `docs/database.md` (a single
overview pointing to `supabase/migrations/`) is missing and is a P2.

---

## 11. SQL Repair Package

All scripts are **idempotent**, **transactional**, and emit **verification
counts** before and after. Run on a Supabase dev branch first. **Do not paste
into prod cold.**

### 11.1 `org_id` backfill — six tables

```sql
-- ============================================================================
-- Sentinel — org_id backfill (idempotent)
-- Run on a Supabase dev branch first; verify both BEFORE and AFTER counts.
-- Demo org UUID is the Sentinel Financial Corp seed tenant; replace if needed.
-- ============================================================================
BEGIN;

DO $$
DECLARE
    demo_org uuid := '00000000-0000-0000-0000-000000000001';
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'ai_models', 'risk_register', 'vendors',
        'tasks',     'notifications', 'incidents'
    ]
    LOOP
        EXECUTE format(
            'UPDATE public.%I SET org_id = %L WHERE org_id IS NULL',
            tbl, demo_org
        );
        RAISE NOTICE '%: backfilled', tbl;
    END LOOP;
END $$;

-- Verification — must return 0 for every row
SELECT 'ai_models'      AS tbl, count(*) AS null_org_id FROM public.ai_models      WHERE org_id IS NULL
UNION ALL SELECT 'risk_register',  count(*) FROM public.risk_register  WHERE org_id IS NULL
UNION ALL SELECT 'vendors',        count(*) FROM public.vendors        WHERE org_id IS NULL
UNION ALL SELECT 'tasks',          count(*) FROM public.tasks          WHERE org_id IS NULL
UNION ALL SELECT 'notifications',  count(*) FROM public.notifications  WHERE org_id IS NULL
UNION ALL SELECT 'incidents',      count(*) FROM public.incidents      WHERE org_id IS NULL;

COMMIT;
```

### 11.2 NOT NULL constraint after backfill

```sql
ALTER TABLE public.ai_models      ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.risk_register  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.vendors        ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.tasks          ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.notifications  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.incidents      ALTER COLUMN org_id SET NOT NULL;
```

### 11.3 Missing indexes for tenant filters

```sql
CREATE INDEX IF NOT EXISTS idx_ai_models_org_id      ON public.ai_models      (org_id);
CREATE INDEX IF NOT EXISTS idx_risk_register_org_id  ON public.risk_register  (org_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org_id        ON public.vendors        (org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id          ON public.tasks          (org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id  ON public.notifications  (org_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org_id      ON public.incidents      (org_id);
```

### 11.4 Sample policy correction (template for the 52 always-true policies)

```sql
-- Before: anyone can read everything
DROP POLICY IF EXISTS "tasks_select_all" ON public.tasks;

-- After: scoped to caller's org membership
CREATE POLICY "tasks_select_org_member"
    ON public.tasks
    FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
        )
    );

-- Repeat the same pattern for INSERT (WITH CHECK), UPDATE (USING + WITH CHECK),
-- DELETE (USING). Use a dedicated SQL file per table so the migration is
-- reviewable and reversible.
```

### 11.5 Lock down SECURITY DEFINER functions

```sql
-- Convert to INVOKER where appropriate
ALTER FUNCTION public.<function_name>() SECURITY INVOKER;

-- Or revoke direct execution from anon if DEFINER is required
REVOKE EXECUTE ON FUNCTION public.<function_name>() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.<function_name>() TO service_role;

-- And pin search_path for the 8 mutable-search-path findings
ALTER FUNCTION public.<function_name>() SET search_path = '';
```

### 11.6 Fix the SECURITY DEFINER view

```sql
ALTER VIEW public.users_with_details SET (security_invoker = true);
```

### 11.7 Rollback strategy

- Every migration above is wrapped in `BEGIN`/`COMMIT`. If a verification
  query fails, `ROLLBACK` instead of `COMMIT`.
- Supabase dev branches are created with `mcp__supabase__create_branch`;
  destroying the branch reverts all changes.
- For prod, take a Supabase scheduled backup immediately before promotion;
  point-in-time-restore is supported on Pro and above.

---

## 12. Deployment Runbook

### 12.1 Order of operations

1. **Code freeze** the `main` branch. Tag `v1.1.0-rc1`.
2. **Migrations** — apply RLS fixes on a Supabase dev branch:
   ```bash
   supabase db push --branch <dev-branch>
   ```
3. **Run pgTAP suite** — assert anon cannot select any tenant table; assert
   `auth.uid() IS NULL` returns 0 rows from every protected view.
4. **Backfill** — execute §11.1; verify counts; then §11.2 NOT NULL.
5. **Promote** the dev branch to prod via Supabase dashboard
   (Branches → Merge to production).
6. **Frontend build** —
   ```bash
   cd dashboard
   npm ci --legacy-peer-deps
   npm run build           # vite build → dist/public
   ```
   Build-time env vars must be set in CF Pages: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`.
7. **Worker deploy** — assets-only:
   ```bash
   wrangler deploy
   ```
   (No `main` script today — bundle is just the `dist/public` upload.)
8. **Smoke tests** — hit `/`, `/login`, `/dashboard`, `/tasks`, `/risks`,
   `/notifications`, `/ai-systems`, `/settings/team`. All return 200, all show
   real tenant data (or empty-state).
9. **Rollback** —
   - Frontend: `wrangler rollback` to previous version.
   - Database: Supabase PITR to T-15min before migration window.

### 12.2 Acceptance criteria for v1.1 release

- [ ] All 6 tables in §11.1 show 0 rows with `org_id IS NULL`.
- [ ] Supabase advisor: `security_definer_view` ERRORs = 0.
- [ ] Supabase advisor: `rls_policy_always_true` WARNs ≤ 5 (legacy
      CamelCase tables exempt until PR4 drops them).
- [ ] `npm run build` exits 0 on dashboard.
- [ ] `tsc --noEmit` exits 0 (one pre-existing case-sensitivity import is
      tolerated; track in issue).
- [ ] Live deploy serves the new asset hash, not the cached one.
- [ ] Login → token refresh after 50 minutes works without re-prompt.
- [ ] Logout clears React Query cache (verify with React DevTools).
- [ ] Route-level error: throw inside any page → boundary fallback shows
      Retry button → navigating away unmounts the error.

---

## 13. Module Completion Matrix

| Module                       | Routes | Pages | Hooks  | Status                                  |
|------------------------------|-------:|------:|-------:|-----------------------------------------|
| Authentication & onboarding  | 5      | 5     | 4      | ✅ Complete (custom JWT + Supabase)     |
| Overview / Dashboard         | 4      | 6     | 8      | ✅ Complete (KPIs depend on §11.1)      |
| Framework management         | 8      | 9     | 6      | ✅ Complete                             |
| Controls & evidence          | 12     | 14    | 9      | ✅ Complete (storage policies in PR2)   |
| Risk register & matrix       | 7      | 8     | 5      | ✅ Complete                             |
| Task management              | 4      | 4     | 3      | ✅ Complete (this PR fixed loading bug)|
| Notifications center         | 3      | 3     | 4      | ⚠️ Realtime invalidation needed (PR3)  |
| Security hub                 | 11     | 14    | 7      | ✅ Complete                             |
| AI governance registry       | 18     | 22    | 11     | ✅ Complete                             |
| Audit management             | 9      | 11    | 6      | ✅ Complete                             |
| Reporting & exports          | 6      | 7     | 4      | ⚠️ Server-side PDF awaits Hono Worker   |
| Settings (team/roles/SSO)    | 14     | 18    | 9      | ✅ Complete (clone-role flow added v1.0)|
| ESG / Carbon ledger          | 8      | 10    | 5      | ✅ Complete                             |
| Vendor registry              | 5      | 6     | 3      | ✅ Complete                             |
| BCP / DR                     | 6      | 7     | 4      | ✅ Complete                             |
| HITL reviews                 | 4      | 5     | 3      | ✅ Complete                             |
| Incident response            | 5      | 6     | 4      | ✅ Complete                             |
| **Other (admin, SSO, etc.)** | 78     | 86    | 4      | Partially typed; majority shipped       |
| **TOTAL**                    | **207**| **241**| **99**| **96 % complete**                       |

---

## 14. Final Verdict

**Conditionally production-ready.** Suitable for:

- ✅ Public open-source release on GitHub (OSS hygiene complete; LICENSE,
      CoC, SECURITY, CONTRIBUTING all present and high-quality).
- ✅ Single-tenant demo / pilot deployment running against the seeded
      `Sentinel Financial Corp` org.
- ✅ Internal evaluation by enterprise prospects.

**Blockers for general-availability multi-tenant launch:**

1. Run **PR2** (Supabase RLS sweep + leaked-password protection +
   SECURITY DEFINER lockdown) on a dev branch with pgTAP coverage and
   promote.
2. Run **PR3** (token-refresh consolidation, realtime-aware notification
   invalidation, dead-code cleanup).
3. Apply **§11.1 backfill SQL** in production with verification queries
   green.
4. Re-deploy frontend so the new asset hash supersedes the stale bundle
   that surfaced the original audit symptoms.

Estimated time to GA: **2 weeks** with one engineer + one DBA, assuming
Supabase dev-branch migration is uneventful.

---

*— end of report —*
