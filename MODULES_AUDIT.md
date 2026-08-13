# Sentinel AI GRC — Full Module Audit

**Date:** 2026-08-13
**Scope:** Code quality & architecture + completeness & gaps, across all modules
(Python backend `sentinel/`, React dashboard `dashboard/`, Cloudflare `workers/`,
shared `packages/`, root `src/`, build/CI/migrations/infra).
**Method:** Static analysis of ~22.1K LOC Python + ~130K LOC TypeScript + ~1.4K LOC
Workers TS. Dependencies were **not installed** in the audit environment, so
`tsc`/`eslint`/`vitest`/`pytest` could not be executed; findings are from source
reading and cross-referencing. Every "quick win" applied in this branch was
independently verified before change.

---

## 1. Executive Summary

Sentinel is a **substantial, genuinely-implemented** platform — not vaporware. It
contains a working LLM reliability proxy, real compliance-framework catalogs, a
weighted trust-scoring engine, an event bus, and a large React GRC dashboard.

The dominant finding is that the repository is effectively **two products fused
under one roof**, each with its own persistence, plus a third (partially-built)
edge layer:

1. **`dashboard/` (React SPA)** — talks **directly to Supabase**; this is the
   primary, most-complete product (~130K LOC, ~196 page components).
2. **`sentinel/` (Python)** — actually **two FastAPI apps** (an LLM proxy and a
   GRC API), defaulting to **ephemeral `/tmp` SQLite**, only partially consumed by
   the frontend.
3. **`workers/` (Cloudflare)** — well-written but **entirely undeployed** (no
   entrypoint, no bindings); all 22 integrations are empty stubs.

The biggest systemic issues are **duplication** (two page generations, duplicate
services, 3 DB layers, 5 audit implementations, 6–7 migration systems), **drift
between claims and reality** (README/`AGENT_CONTEXT.md` overstate what's wired),
and **type-safety/testing gaps** (66 `@ts-nocheck` files, ~712 `any`, near-zero
page/service test coverage, no CI at all for the Python backend).

None of these are fatal, but together they create a codebase where it is hard to
tell what is live, what is mock, and what is dead. This audit maps that, and the
accompanying branch removes the clearest dead weight.

### Severity snapshot

| # | Finding | Severity | Area |
|---|---------|----------|------|
| A | "Zero hardcoded data" is false — seed fallbacks in hooks/services; ~25–35 mock-only pages | **High** | Frontend / completeness |
| B | Two page generations double-routed at overlapping URLs | **High** | Frontend / architecture |
| C | Python: 3 competing DB layers; GRC API defaults to `/tmp` SQLite, ignoring `DATABASE_URL` | **High** | Backend / architecture |
| D | Python: dead-on-import code (`AuditLogger`, `sentinel.api.routers.*`) → silently missing endpoints/CLI | **High** | Backend / correctness |
| E | 6–7 overlapping SQL migration systems; only `supabase/migrations/` is authoritative | **High** | Infra |
| F | 3–5 deploy definitions for the same artifact across 4 platforms; no root `package.json` | **High** | Infra |
| G | `workers/` complete but undeployed; 22 integration stubs; misleading "durable" claim | **High** | Workers |
| H | `POST /api/migrate` accepts a service-role key over HTTP to run migrations | **High** | Backend / security-adjacent |
| I | CORS `allow_origins=["*"]` + `allow_credentials=True` in both Python apps | **High** | Backend / security-adjacent |
| J | 66 `@ts-nocheck` (incl. `App.tsx`), ~712 `any`; typecheck relies on suppression | **Medium** | Frontend / quality |
| K | Duplicate services/routers/stores (agent, biasAudit, redTeam, vendor, HITL, api_key) | **Medium** | Both |
| L | Near-zero test coverage on pages/services/routers; coverage floor scoped to ~9 lib files | **Medium** | Both |
| M | Version identity contradictory across 5 files (0.1.0-alpha / 0.3.2 / 1.0.0 / 1.44.0) | **Medium** | Infra |
| N | Dead/orphaned files: root `src/`, nested CI workflow, dead services, stale reports, codemod scripts | **Low** | Repo hygiene — *fixed in this branch* |
| O | `ruff` disables real-bug rules (`F821`,`F841`,`F401`,`E722`); security CI is non-gating | **Medium** | Infra / quality |

---

## 2. Repository Topology

```
sentinel/            Python backend — LLM proxy (proxy.py) + GRC API (api/main.py)
dashboard/           React 18 + Vite SPA — the primary product (Supabase-backed)
workers/             Cloudflare Workers — RBAC/tenant/audit middleware + integrations (UNDEPLOYED)
packages/rbac        Shared permission catalog (USED by dashboard via deep relative import)
packages/schemas     Shared zod schemas (ORPHANED — 0 importers)
src/                 [REMOVED in this branch] orphaned 2-file scaffold, non-compiling
migrations/          [legacy] root SQL migrations (orphaned)
supabase/migrations  AUTHORITATIVE schema (47 files; guarded by schema-drift.yml)
docker/, k8s/        Python-backend deploy (docker-compose + k8s manifest)
frameworks/          23 real framework YAML catalogs
docs/                30 subdirs, 134 files — heavy auto-generated doc churn
```

**Key coupling fact:** the dashboard's primary data path is **frontend → Supabase**
(153 files reference Supabase). Only a minority of frontend code targets the Python
backend (`dashboard/src/api/client.ts`, `lib/api.ts` → `localhost:8000`,
`hooks/useComplianceData.ts` → `/api/compliance/...`, `lib/wsManager.ts` → WS). The
README architecture diagram (React ↔ FastAPI ↔ Supabase) **overstates** how central
the Python backend is.

---

## 3. Frontend Audit (`dashboard/`)

### 3.1 Architecture & duplication — two coexisting page generations *(High)*

All 196 page files are routed (`App.tsx` lazy-imports 190; 224 `<Route>` entries) —
so there are **no orphaned pages**, but two generations coexist and were never
reconciled:

| Concern | Old (top-level `pages/*.tsx`) | New (`pages/<feature>/`) | Result |
|---|---|---|---|
| Risk register | `RiskRegister` → `/risk`, `/risk/register` | `risk/RiskRegisterNew` → `/risks` | 3 routes, 2 components |
| Models | `ModelInventory` → `/models` | `models/ModelRegistryPage` → `/models/inventory` | 2 list pages |
| Vendors | `Vendors` → `/risk/vendors` | `vendors/VendorRegistry` → `/vendors` | 2 list pages |
| Datasets | `Datasets` → `/evals/datasets` | `datasets/DatasetRegistry` → `/datasets` | 2 pages |
| Audit log | `AuditLog`, `AuditLogExplorer`, `AuditTrail`, `SystemAuditLog` | — | 4 audit pages |

**Placeholder/duplicate route mappings** (documented, *not* auto-fixed — intended
target is ambiguous):
- `App.tsx:350-351` — `/compliance/drift` and `/compliance/graph` both render
  `<ControlDrift />`. No distinct "compliance graph" component exists.
- `App.tsx:325,334,335` — `/security/model-auditor`, `/security/frameworks`,
  `/security/strategy` all render `<SecurityHome />` (looks like an intentional hub
  pattern, but reads as unfinished routing).

**Layering is otherwise sound:** pages → React-Query hooks (`src/hooks/*`, 79) →
services (`src/services/*`, 55) → `src/lib/supabase.ts`, with every service call
guarded by `isSupabaseConfigured()`.

### 3.2 Completeness — "zero hardcoded data" is FALSE *(High)*

`AGENT_CONTEXT.md:71,76` claims *"Zero hardcoded data … no fallback mock/seed arrays
in hooks"* and *"every list, table, chart, KPI card wired to Supabase."* Both are
contradicted:

- **A 6,300+ line mock seed layer** lives in `src/data/` (`seed.ts` 156KB / 1,162
  lines, `seedData.ts` 139KB / 3,442 lines, plus `riskSeedData.ts`,
  `policySeedData.ts`, `modelSeedData.ts`, `evalsSeed.ts`, `complianceLibrary.ts`,
  …). **91 files import it: 73 pages, 10 hooks, 7 services.**
- **7 hooks fall back to seed arrays** — the exact banned pattern
  (`return rows.length > 0 ? rows : SEED`):
  `useAgentData.ts:5`, `useBiasAuditData.ts:5`, `useRegulationData.ts:5`,
  `useComplianceEventData.ts:6`, `useNotificationData.ts:8,26`,
  `usePromptRecordData.ts:5`, `queries/useEvalsCrud.ts:34`. Several services do the
  same (`controlService.ts`, `incidentService.ts`, `bcpPlansService.ts`,
  `evidenceService.ts`, `remediationService.ts`, `trainingService.ts`,
  `securityScansService.ts`). So even "wired" screens silently show fabricated data
  when Supabase is empty.
- **~25–35 mock-only pages** render hardcoded arrays as primary content, e.g.
  `risk/RiskRegisterNew.tsx:57` (`SEED_RISKS`, the routed `/risks` register is 100%
  mock), `IncidentLog.tsx:17`, `AuditTrail.tsx:37`, `audits/AuditManagement.tsx:75`,
  `exceptions/ExceptionManagement.tsx:85`, `calendar/ComplianceCalendar.tsx:64`,
  plus pages under `vendors/`, `evals/`, `mcp-gateway/`, `documents/`, `ciso/`.

**Rough split of 196 pages:** ~110–120 genuinely wired · ~15–25 partially wired
(fetch + seed fallback) · ~25–35 mock-only. (`ImportSampleData.tsx` legitimately
uses seed — its job is seeding Supabase; `Login/Signup/Settings/RiskMatrix/
ExportCenter/PolicyTemplates` are false positives — form/label configs, not mock
data.)

### 3.3 Type safety *(Medium)*

- **66 `@ts-nocheck` files (~9%)**, including `src/App.tsx:1` — which suppresses all
  router type errors. Worst clusters: `pages/` (11), `hooks/` (11), `lib/hooks/` (7),
  `components/settings/sections/` (6), `components/compliance/` (5).
- **~712 `any`-family usages across 232 files** (`: any`, `as any`, `any[]`,
  `Record<string, any>`, `Promise<any>`).
- `tsc --noEmit` almost certainly does **not** pass cleanly without the suppressions;
  the CI typecheck gate passes only because `@ts-nocheck` hides the errors. (The
  previously-committed `typecheck_*.txt` / `eslint-report.json` were **stale** and
  are removed in this branch — they referenced files and errors that no longer
  exist.)

### 3.4 Services layer — duplication *(Medium)*

| Pair | Status |
|---|---|
| `esgReportsService.ts` | **DEAD (0 refs)** — *removed in this branch* |
| `energyMetricsService.ts` | **DEAD (0 refs)** — *removed in this branch* |
| `typed/consentRecords.ts`, `typed/incidents.ts` | **DEAD (0 refs)** — *removed in this branch* |
| `agentService.ts` vs `agentsService.ts` | Both live — needs consolidation |
| `biasAuditService.ts` vs `biasAuditsService.ts` | Both live — needs consolidation |
| `redTeamService.ts` vs `redTeamFindingsService.ts` | Both live — needs consolidation |
| `auditService.ts` vs `auditLogService.ts` | **Both live** — `auditLogService.ts:10` imports from `auditService.ts`; **do not delete** (an earlier claim that it was test-only was incorrect) |

### 3.5 Tests *(Medium)*

- **30 unit tests + 2 e2e** vs 196 pages / 55 services. **21 of 30** unit tests live
  in `src/lib/__tests__/` (rbac, tenancy, result, frameworks, exporters, webhook,
  observability, seed). Exactly **one** page test exists
  (`pages/evals/__tests__/metricPosture.test.ts`); **zero** service/hook tests.
- The 70% coverage `thresholds` in `vitest.config.ts` are **misleading** —
  `coverage.include` is allowlisted to ~9 lib files, so the floor says nothing about
  pages/hooks/services.

### 3.6 Dead code / leftovers *(Low — fixed)*

- 176 `console.*` — but 158 are `console.warn` / 10 `console.error` inside service
  `catch` blocks (legit error logging); only ~4 stray `console.log`.
- Stale committed reports, 7 leftover codemod scripts (`fix_ts.cjs`, `upgrade.mjs`,
  `upgrade_v2.py`, `write_policies.py`, `migrate_seed.cjs`, `check_page_header.*`),
  and 4 dev screenshots — **all removed in this branch**.
- Config duplication remains (flagged, not touched): both `vite.config.ts` **and**
  `vite.config.js`; both `.eslintrc.json` **and** `eslint.config.js`.

---

## 4. Python Backend Audit (`sentinel/`)

Overwhelmingly **real code, not stubs** (1 legit `NotImplementedError`; no `...`
stubs, no bare-`pass` bodies, no fake-data generators). The gaps are architectural.

### 4.1 Module status

| Module | Status | Notes |
|---|---|---|
| `api/` (35 files) | Complete | ~40 routers mounted; two generations (rich hand-written + thin generic CRUD) |
| `auth/` (5) | Complete | jwt/rbac/refresh/api_key — substantive |
| `compliance/` (32) | Complete | Richest module; `control_registry.py` 1,353 LOC of real control data + 16 framework files |
| `data/` | **Empty (Python)** | SQL + JSON only; not a Python package |
| `database/` | **Empty (Python)** | 1 SQL migration only; not a Python package |
| `evals/` (5) | Complete | runner, bias/fairness, scheduler, store |
| `events/` (9) | Complete | Real event bus + ~6 deterministic automation rules (the "10 autonomous agents" claim is marketing) |
| `governance/` (2) | Complete | `change-log` endpoint doesn't persist (`router.py:126`) |
| `hitl/` (5) | Complete but **duplicated** | `store.py` **and** `hitl_store.py` both exist |
| `layers/` (5) | Complete but **partially orphaned** | `verifier.py` not wired into the proxy path |
| `middleware/` (2) | Partial | only `rate_limit.py` |
| `model_inventory/` (1) | Complete | |
| `models/` (3) | Complete | Pydantic v2 domain models (616 LOC), approval + policy engines |
| `observability/` (3) | Complete | Prometheus + OTel |
| `plugins/` (2) | Complete but **orphaned** | PluginManager never invoked |
| `providers/` (5) | Complete | but proxy calls `litellm` directly, bypassing this abstraction |
| `security/` (5) | Complete | posture calculator, campaign runner/scheduler |
| `storage/` (8) | Complete + **1 broken artifact** | `posture_history_store.py` was a directory shadowing its module — *flattened in this branch* |
| `tasks/` (4) | Complete | |
| `trust_engine/` (3) | Complete but **API-orphaned** | rich `trust_engine/router.py` not mounted; thin `api/trust_engine_router.py` mounted instead and never calls `TrustEngine.compute` |
| `utils/` (1) | Partial | only `policy_pdf.py` |
| `vendor/` (3) | Complete but **duplicated** | `vendor/router.py` vs `api/vendor_router.py` |

### 4.2 Architecture — two FastAPI apps, disagreeing entrypoints *(High)*

- **`proxy.py:create_app()`** is what the packaged CLI launches
  (`pyproject.toml` → `sentinel.cli:main` → `cli.py:44` uvicorn). A **real
  LLM proxy**: OpenAI-compatible `/v1/chat/completions` via `litellm.acompletion`,
  JWT tenant resolution, Redis rate limiting, sanitizer → circuit-breaker → auditor →
  async compliance.
- **`api/main.py:app`** is the GRC platform (~40 routers) plus a catch-all reverse
  proxy to the Vite dev server. Almost certainly what runs under Docker, but the CLI
  never references it. The two apps **re-mount overlapping routers** (auth, policy,
  dashboard, compliance, approval, audit, evals, events, security, tasks…).

**Three DB layers, two SQLite files:**
- `database.py:20` — SQLAlchemy `AsyncSession`, but the repo classes below call
  **asyncpg** methods (`fetchrow`/`fetch`) that don't exist on a session — the two
  halves are mutually incompatible.
- `api/db.py:9` — a **separate** engine hardcoded to
  `sqlite+aiosqlite:////tmp/sentinel.db`, **ignoring `DATABASE_URL`**; this is what
  the mounted routers actually use → the live GRC app runs on **ephemeral `/tmp`
  SQLite**, not Postgres/Supabase.
- `api/deps.py:13` — a third `get_db`.

### 4.3 Correctness bugs *(High)*

- **`AuditLogger` doesn't exist.** `cli.py:86` and `dashboard.py:16` both
  `from sentinel.audit import AuditLogger`, but `audit.py` defines only
  `AuditRecord` / `log_audit`. The CLI `logs` command and the top-level dashboard are
  **dead on import**.
- **Dead router block.** `proxy.py:147-160` imports `sentinel.api.routers.*` — a
  subpackage that **does not exist** (routers are flat `api/*_router.py`).
  `_NEW_ROUTERS_LOADED` is therefore **always False**, so the block at
  `proxy.py:216-225` (incl. `evidence_router`, `hitl_router`) never loads —
  **silently missing endpoints**.
- **Silent audit data loss.** `database.py:52-62` (`AuditLogRepo.append`) builds a
  full `kwargs` dict, then the INSERT writes only `(id, tenant_id)` — every other
  audit field is dropped (in an "immutable audit" product).
- **`config.py` import-time hard-fail.** `settings = load_settings()` at
  `config.py:318` requires `SECRET_KEY` (min_length 32, no default), so importing any
  module that transitively imports `sentinel.config` fails without the env var — a
  real CI/test fragility.

### 4.4 Config & security-adjacent *(High/Medium)*

- **`POST /api/migrate`** (`api/migrations_router.py`, mounted `api/main.py:280`)
  accepts a **service-role key in the request body** and executes migration SQL — a
  service-role-over-HTTP endpoint in the app runtime.
- **CORS `allow_origins=["*"]` + `allow_credentials=True`** in both apps
  (`api/main.py:54`, `proxy.py:170`) — an invalid/unsafe combination (currently
  `# nosemgrep`-suppressed).
- `.env.example` defines `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, SMTP/S3
  vars with **no corresponding `config.py` fields** (dangling config).
- `config.py` is excluded from ruff (`pyproject.toml`).

### 4.5 Quality — duplication *(Medium)*

- **Audit implemented 5 ways:** `audit.py` (in-memory), `layers/auditor.py`
  (hash-chain, the one the proxy uses), `storage/audit_store.py`,
  `database.py:AuditLogRepo`, `api/audit_log_router.py`.
- **Dashboard ×3:** `dashboard.py`, `api/dashboard_router.py`,
  `hitl/dashboard_router.py`.
- Trust-engine router ×2 · vendor router ×2 · HITL store ×2 · api_key_store ×2
  (`auth/` + `storage/`) · DB layer ×3.
- **`ruff` disables real-bug rules** (`F401`, `F841`, `F821`, `B904`, `E722`);
  disabling `F821` hides genuine `NameError`s.
- Every router include in `api/main.py` is wrapped in `try/except → logger.warning`
  (40×), so a broken router **silently disappears** from the API.

### 4.6 Tests

13 test files, all targeting the **proxy/middleware core** (sanitizer, verifier,
circuit_breaker, auditor, providers, proxy, rules, policy_engine, compliance). There
is **essentially no coverage** for the ~40 GRC routers, event bus/automation,
trust_engine, security campaigns, HITL, tasks, or `api/db.py`. Notably
`test_verifier.py` covers a module not wired into any live path. **The Python backend
has no CI job at all** (`ci.yml` only runs dashboard + workers).

---

## 5. Workers, Packages, Infra & Build

### 5.1 `workers/` — good code, undeployed *(High)*

- ~1,400 LOC: `rateLimiter.ts`, `middleware/` (withRBAC/withTenant/withAudit/
  withLogging + tests), `webhooks/delivery.ts` (HMAC-SHA256 + backoff),
  `integrations/`. Core quality is genuinely good — `withRBAC.ts` fails closed and
  never trusts JWT roles; `tsconfig.json` is strict.
- **But nothing is wired:** no `index.ts`/`worker.ts` entrypoint; `wrangler.jsonc`
  has **no `main` and no `durable_objects` binding** — it only serves `dashboard/dist`
  as static assets. `RateLimiter` (a Durable Object) is never bound.
- `rateLimiter.ts:22-24` claims "Backed by a Durable Object so tokens are
  consistent" but stores buckets in an in-memory `Map` (`this.state.storage` only
  `void`-referenced) — **not actually durable**.
- **All 22 integrations are empty stubs** (e.g. `integrations/slack.ts:16-19`:
  `void ctx; void p;`), `integrations/index.ts` marked "Auto-generated scaffold."

### 5.2 `packages/` *(Medium)*

- `packages/rbac/permissions.ts` — real, **used** by `dashboard/src/lib/rbac/
  index.ts:30` via a fragile 4-level relative import (`../../../../packages/rbac/…`).
- `packages/schemas/common.ts` — **orphaned** (0 importers). Neither package has a
  `package.json`; `packages/` implies a monorepo that doesn't exist (no root
  `package.json`, no workspaces).

### 5.3 Deploy story — fragmented *(High)*

Same `dashboard/dist` artifact shipped **3 ways**: `vercel.json` (Vercel),
`wrangler.jsonc` + `deploy-dashboard.yml` (Cloudflare **Workers** assets), and the
dead nested `dashboard/.github/workflows/ci.yml` (Cloudflare **Pages**). Plus the
Python backend's `Dockerfile`/`docker-compose.yml` and `k8s/sentinel-deployment.yaml`
— **5 deploy definitions across 4 platforms**, with no doc naming the canonical one.

### 5.4 Migrations — 6–7 overlapping systems *(High)*

| Location | Files | Status |
|---|---|---|
| `supabase/migrations/` | 47 | **AUTHORITATIVE** (guarded by `schema-drift.yml`; read by `migrations_router.py`; referenced by `packages/rbac`) |
| `migrations/` (root) | 7 | legacy — orphaned |
| `dashboard/supabase/migrations/` | 4 | overlaps supabase numbering — superseded |
| `sentinel/database/migrations/` | 1 | legacy |
| `sentinel/api/migrations/` | 2 | legacy (dup number `004`) |
| `sentinel/data/migrations/` | 1 | legacy |
| `docker/postgres/*.sql` | 4 | separate schema for the docker-compose Postgres |

Two live databases (Supabase for the dashboard; docker-compose Postgres for the
Python API) with **two independent schema sources** that likely define overlapping
tables inconsistently.

### 5.5 CI/CD *(Medium)*

- Root `.github/workflows/`: `ci.yml`, `security.yml`, `release.yml`,
  `deploy-dashboard.yml`, `schema-drift.yml`, `eval.yml`, `dco.yml`.
- The nested `dashboard/.github/workflows/ci.yml` **never runs** (GitHub only
  executes root workflows) — *removed in this branch*.
- `ci.yml` **workers jobs are fragile**: they install deps only in `dashboard/`, then
  run `npx vitest` / `../dashboard/node_modules/.bin/tsc` from `workers/` (works only
  because `workers/` has no `package.json` and borrows dashboard's binaries).
  `workers/tsconfig.json` excludes `__tests__`, so typecheck skips the very files
  vitest runs.
- **Security CI is largely non-gating** (Gitleaks/Semgrep/CodeQL/npm-audit all
  `continue-on-error`; `.semgrep.yml` is empty). Only Trivy fs-scan can fail a build.
- **No Python CI** at all.

### 5.6 Version incoherence *(Medium)*

Five identities for one product: `RELEASE_NOTES.md` **0.1.0-alpha**,
`pyproject.toml` **0.3.2**, `dashboard/package.json` **1.0.0**, CHANGELOG/tags
**1.44.0**, `CHECKPOINT.md` **v1.0.0**. `.releaserc.json` lists
`dashboard/package.json` as a bumped asset, yet it's stuck at 1.0.0 while releases
reached 1.44.0.

### 5.7 Docs & peripheral dirs *(Low)*

- `docs/` — 30 subdirs, 134 files, 980K. `CHANGELOG.md` (123KB, 46 versions) is
  legitimately semantic-release-generated, but recent history is dominated by
  auto-generated "docs: generate detailed articles…" churn that inflates versions.
  `CHECKPOINT.md` and `RELEASE_NOTES.md` are stale and contradict the CHANGELOG.
- `frameworks/` (23 YAML catalogs), `openapi/sentinel.yaml`, `k8s/`, `configs/`,
  `data/`, `docker/postgres/` are **real content** — the concern is that several are
  parallel sources of truth to the Supabase/dashboard reality, not that they're empty.

---

## 6. Cross-Cutting Themes

1. **Two products, one repo.** The React+Supabase app and the Python backend are
   largely parallel implementations of overlapping domains, each with its own
   persistence and audit model. Decide which is the system of record.
2. **Duplication everywhere.** Two page generations, duplicate services, 3 DB layers,
   5 audit implementations, 2 FastAPI apps, 6–7 migration systems, 5 deploy targets.
3. **Claims vs reality drift.** README ("10 autonomous agents", Postgres/RLS,
   immutable audit) and `AGENT_CONTEXT.md` ("zero hardcoded data") overstate what is
   actually wired. Align the docs with the code, or the code with the docs.
4. **Real logic orphaned behind generic CRUD.** `TrustEngine`, `verifier`, `plugins`,
   `trust_engine/router.py`, `vendor/router.py` are implemented but not on any live
   path.
5. **Safety nets are cosmetic.** Type-checking leans on `@ts-nocheck`; the coverage
   floor measures ~9 files; security CI is non-gating; `ruff` disables real-bug rules.

---

## 7. Quick Wins Applied in This Branch

All changes are deletions of **verified-unreferenced** files or a structural fix that
**restores** a broken module — nothing on a live code path was modified.

| Change | Rationale |
|---|---|
| Removed root `src/` (`pages/organization/ModulesIndex.tsx`, `lib/supabase/useOrgModule.ts`) | Orphaned scaffold; imports `@/lib/auth/useOrg` and `./client` that don't exist; no build covers it; 0 inbound refs |
| Removed `dashboard/.github/workflows/ci.yml` | Nested workflow never runs on GitHub; duplicated/contradicted the root `ci.yml` |
| Removed `dashboard/src/services/esgReportsService.ts`, `energyMetricsService.ts` | 0 references (live equivalents are `esgService.ts`, `energyService.ts`) |
| Removed `dashboard/src/services/typed/consentRecords.ts`, `typed/incidents.ts` | 0 importers (empty `typed/` dir auto-pruned) |
| Removed stale `dashboard/typecheck_errors.txt`, `typecheck_output.txt`, `eslint-report.json` | Outdated/misleading — reference files & errors that no longer exist |
| Removed 7 codemod leftovers (`fix_ts.cjs`, `upgrade.mjs`, `upgrade_v2.py`, `write_policies.py`, `migrate_seed.cjs`, `check_page_header.js/.cjs`) | One-off migration scripts, not part of the build |
| Removed 4 dev screenshots (`dashboard/screenshot*.png`) | Committed development artifacts |
| Flattened `sentinel/storage/posture_history_store.py/` → `posture_history_store.py` | It was a directory shadowing its own module (unimportable); now a valid module (verified `py_compile` passes) |

`auditService.ts` was **kept** — it is imported by `auditLogService.ts` (an earlier
"dead" claim was wrong).

### 7.1 P0 correctness / security fixes (second commit)

Applied after the cleanup above. Each was syntax-verified with `py_compile`
(dependencies are not installed in the audit environment, so full import/runtime
tests were not run — see the header note).

| Change | File(s) | Rationale |
|---|---|---|
| Removed the always-dead `sentinel.api.routers.*` import block + its `if _NEW_ROUTERS_LOADED:` usage | `proxy.py` | Subpackage never existed → block always `ImportError` → dead code; the live `hitl_router` from `sentinel.hitl.dashboard_router` (proxy.py:189) is untouched |
| Rewrote the `logs` CLI command to use the real `get_audit_log()` | `cli.py` | It imported a non-existent `AuditLogger` → the command crashed on invocation |
| Removed dead legacy `sentinel/dashboard.py` | (deleted) | Non-importable (`AuditLogger`, `DashboardConfig` don't exist), `get_dashboard_routes` never called; superseded by `api/dashboard_router.py` |
| `api/db.py` now honors `DATABASE_URL` (asyncpg-normalised), falling back to `./sentinel.db` instead of `/tmp/sentinel.db` | `api/db.py` | The GRC API (23 routers) silently ran on ephemeral, world-readable `/tmp` storage |
| Centralised CORS via new `cors_config()`; explicit `CORS_ORIGINS` → credentialed, else non-credentialed wildcard | `config.py`, `api/main.py`, `proxy.py` | `allow_origins=["*"]` + `allow_credentials=True` is browser-rejected and unsafe |
| Gated `POST /api/migrate` behind `SENTINEL_ENABLE_MIGRATION_API` (off by default) | `api/main.py`, `.env.example` | A service-role-key-over-HTTP migration endpoint should not be exposed by default |

**Still NOT auto-fixed** (need a runtime or a design decision): route-mapping
duplicates (ambiguous target); `database.py`'s `AuditLogRepo.append` field-drop —
the whole `*Repo` layer in that file is **dead** (0 callers) *and* structurally
broken (asyncpg calls on a SQLAlchemy `AsyncSession`), so a partial column fix would
falsely imply it works — it should be **removed** wholesale instead; `@ts-nocheck`
removal; seed-fallback removal; live duplicate-service/router consolidation; DB-layer
unification beyond the `api/db.py` default.

---

## 8. Prioritized Backlog (beyond this branch)

**P0 — correctness / integrity** (✅ = addressed in this branch, see §7.1)
1. ⚠️ `AuditLogRepo.append` field-dropping (`database.py:52-62`) — confirmed **dead
   + broken**; retire the whole `*Repo` layer (not fixed here to avoid implying it works).
2. ✅ Locked down `POST /api/migrate` behind `SENTINEL_ENABLE_MIGRATION_API` (off by default).
3. ✅ `api/db.py` now honors `DATABASE_URL`, falling back to `./sentinel.db` (not `/tmp`).
   *(Full 3-layer unification still open.)*
4. ✅ Fixed the `AuditLogger` dead imports (`cli.py` rewritten; dead `dashboard.py` removed).
5. ✅ Removed the always-dead `sentinel.api.routers.*` block in `proxy.py`.
6. ✅ Fixed CORS `*` + credentials in both apps via `cors_config()`.

**P1 — architecture / de-duplication**
7. Choose the system of record (Supabase vs Python) and collapse the duplicate
   domain implementations.
8. Retire one page generation; collapse the overlapping route table.
9. Consolidate duplicate services (`agent`/`agents`, `biasAudit`/`biasAudits`,
   `redTeam`/`redTeamFindings`) and Python routers/stores (trust_engine, vendor,
   HITL, api_key).
10. Pick one dashboard deploy target; consolidate the 6–7 migration systems onto
    `supabase/migrations/`.

**P2 — quality / safety**
11. Remove seed fallbacks from the 7 hooks + 7 services and wire the ~25–35 mock-only
    pages, **or** correct `AGENT_CONTEXT.md`/README to match reality.
12. Add a Python CI job; make security CI gating; re-enable `ruff` real-bug rules.
13. Reduce `@ts-nocheck` (start with `App.tsx`); widen the coverage `include` set and
    add page/service/router tests.
14. Reconcile the version identity across the 5 files; make semantic-release actually
    bump `dashboard/package.json`.
15. Wire or clearly quarantine `workers/` (add `main` + DO bindings, or move to
    `experimental/`); fix the misleading "durable" comment; populate/drop the 22
    integration stubs.

---

*Generated by an automated module audit. Line references are as of commit on branch
`claude/modules-audit-akm64k`.*
