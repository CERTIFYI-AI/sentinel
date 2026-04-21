# CERTIFYI SENTINEL — ENTERPRISE PLATFORM AUDIT REPORT
**Audit Date:** 2026-03-10  
**Auditor:** Senior Platform Architect, Certifyi AI Engineering  
**Repo:** [CERTIFYI-AI/sentinel](https://github.com/CERTIFYI-AI/sentinel)  
**Stack:** Python 3.11 · FastAPI · React 18 · TypeScript · shadcn/ui · Tailwind CSS  
**Status:** Platform Unification Sprint — Post-Phase Review

---

## Executive Summary

Sentinel is an AI reliability and governance middleware platform serving four persona types: CISO, Security Lead, ML Engineer, and Compliance Officer. Prior to the Platform Unification Sprint, the product was architecturally fragmented — three modules built in isolation with no shared data layer, no event bus, and a CISO dashboard presenting hardcoded values.

This audit documents:
1. The architectural time bombs that existed pre-sprint
2. The current state of each module after the unification sprint
3. What is still missing, broken, or incomplete
4. A prioritised future task plan for each module

**Overall Platform Readiness: 62% — Not production-ready.**  
The connective tissue (event bus, shared data layer) is now specified. The backend stores, frontend route wiring, and several module-level features remain absent or stub-level.

---

## Architecture Overview — What Was Built vs What Exists

### Specified in Unification Sprint (paste.txt)
| File | Status |
|------|--------|
| `dashboard/src/lib/queryClient.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/lib/queryKeys.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/lib/store.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/lib/hooks/useProxyData.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/lib/hooks/useSecurityData.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/lib/hooks/useEvalsData.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/lib/hooks/useTaskData.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/lib/hooks/useCisoData.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/lib/hooks/useEventBus.ts` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/components/auth/RequireAuth.tsx` | **SPECIFIED — not yet verified in repo** |
| `dashboard/src/components/layout/ErrorBoundary.tsx` | **SPECIFIED — not yet verified in repo** |
| `sentinel/events/bus.py` | **SPECIFIED — not yet verified in repo** |
| `sentinel/events/emitters.py` | **SPECIFIED — not yet verified in repo** |
| `sentinel/events/automation.py` | **SPECIFIED — not yet verified in repo** |
| `sentinel/api/events_router.py` | **SPECIFIED — not yet verified in repo** |
| `sentinel/api/ciso_router.py` | **SPECIFIED — not yet verified in repo** |

### Detected in Repo Root (confirmed present)
- `sentinel/` — Backend module directory ✅
- `dashboard/` — Frontend directory ✅
- `frontend/` — **DUPLICATE frontend dir — critical ambiguity** ⚠️
- `migrations/` — Database migrations ✅
- `tests/` — Test suite ✅
- `build_ui.py`, `enterprise_ui.py`, `fix_audit.py`, `ship_final.py` — **Python scripts generating UI/fix files at root level — these are generation scripts, NOT production code. Must be cleaned up before v1.0** ⚠️
- `wiring_fix.py` — **Indicates prior broken wiring was patched with a script, not a proper commit** ⚠️
- `sentinel_ui_gen.py` — **Empty file (0 bytes)** ❌

---

## MODULE 1 — PROXY / TRUST ENGINE

### Purpose
The core middleware layer. Every LLM request/response passes through the proxy. It evaluates trust scores, applies intervention levels (REGENERATE, UPGRADE, HITL, BLOCK), maintains the audit ledger, and routes to HITL queue when required.

### What Is Implemented
- Trust score pipeline (formula: 0.40 safety + 0.30 faithfulness + 0.15 relevance + 0.15 latency)
- Intervention level routing (NONE → REGENERATE → UPGRADE → HITL → BLOCKED)
- Circuit breaker (CLOSED / OPEN states only — HALF_OPEN explicitly prohibited)
- PII detection and redaction
- Audit ledger with hash-chain integrity (append-only)
- HITL queue creation
- `/dashboard/overview` endpoint (referenced in useProxyData.ts)
- `/dashboard/trust-score/history` endpoint
- `/dashboard/hitl` endpoint
- `/dashboard/circuit-breaker` endpoint
- `/dashboard/api-keys` endpoint

### What Is Missing / Broken

| Gap | Severity | Notes |
|-----|----------|-------|
| `HitlStore` — no confirmed `create()` implementation for automation rules | **CRITICAL** | `automation.py` imports `HitlStore` and calls `.create()` — if not implemented, the entire eval→HITL automation cascade fails silently |
| No `postBlob()` method on `apiClient` | **HIGH** | `useCisoData.ts` calls `apiClient.postBlob()` for PDF export — this method is not in the standard API client pattern |
| `auditLog` endpoint missing pagination cursor | **HIGH** | `QK.auditLog(page, filters)` uses page-based pagination but enterprise audit logs need cursor-based for tamper-evidence |
| No audit log export endpoint | **MEDIUM** | CISO needs to export audit records as evidence — no `/audit-log/export` endpoint |
| Circuit breaker state not persisted | **MEDIUM** | If the service restarts, circuit breaker state resets — must be persisted in DB or Redis |
| No rate-limit API for per-tenant token budgets | **MEDIUM** | Multi-tenant token spend control is missing |
| API key rotation endpoint missing | **LOW** | `/dashboard/api-keys` exists for read — no rotation/revoke mutation |

### API Endpoints Required (complete list)
```
GET  /dashboard/overview
GET  /dashboard/trust-score/history?hours=N
GET  /dashboard/hitl?status=PENDING|ALL
POST /dashboard/hitl/{id}/decide
GET  /dashboard/circuit-breaker
POST /dashboard/circuit-breaker/reset
GET  /dashboard/api-keys
POST /dashboard/api-keys
DELETE /dashboard/api-keys/{id}
GET  /audit-log?page=N&filters=...
GET  /audit-log/export
GET  /proxy/models
GET  /proxy/compliance/status
GET  /proxy/compliance/{framework_id}
```

### Future Tasks
- [ ] **P0** Implement `HitlStore.create()`, `count_pending()`, `get_resolution_rate()` with PostgreSQL persistence
- [ ] **P0** Add `postBlob()` to `api-client.ts`
- [ ] **P1** Persist circuit breaker state to Redis with TTL
- [ ] **P1** Implement cursor-based audit log pagination for tamper-evident export
- [ ] **P1** Add `/audit-log/export` endpoint (returns signed JSON or CSV)
- [ ] **P2** Per-tenant token budget rate limiting
- [ ] **P2** API key rotation and revocation
- [ ] **P3** Audit ledger integrity verification cron job (runs every 6h, emits `audit.chain.integrity_fail` on failure)

---

## MODULE 2 — EVALS ENGINE

### Purpose
Automated quality evaluation of LLM outputs. Runs eval suites against datasets, measures metrics (relevance, faithfulness, safety, factuality), compares against thresholds, and triggers automation when thresholds are breached.

### What Is Implemented
- Eval run lifecycle (QUEUED → RUNNING → COMPLETE/FAILED)
- Metric definitions and threshold configuration
- Dataset management
- Arena (model vs model comparison)
- `eval_runner.py` with `emit_eval_failure()` wiring point

### What Is Missing / Broken

| Gap | Severity | Notes |
|-----|----------|-------|
| `EvalStore.get_recent_pass_rate()` not confirmed implemented | **CRITICAL** | Called in `ciso_router.py::compute_posture_score()` — if missing, the CISO posture score silently uses fallback 50% |
| `emit_eval_failure()` not wired into `eval_runner.py` | **CRITICAL** | The specification says to add it — but the actual file modification is not confirmed. Without it, eval failures never cascade to tasks or HITL |
| No streaming eval progress | **HIGH** | Long eval runs block the UI with no feedback — need SSE or WebSocket progress events |
| Eval Arena has no API endpoint defined in QK | **HIGH** | `QK.evalArena()` is in queryKeys but no corresponding API endpoint exists |
| Dataset versioning missing | **MEDIUM** | Editing a dataset breaks historical eval comparisons — need immutable versioned datasets |
| No eval schedule / cron configuration | **MEDIUM** | Evals must be triggerable on a schedule, not just manually |
| `EvalTechniques` API missing | **MEDIUM** | `QK.evalTechniques()` defined but no endpoint |
| No eval result diffing | **LOW** | Can't compare run N vs run N-1 to show regression |

### API Endpoints Required (complete list)
```
GET  /evals/runs?page=N
POST /evals/runs
GET  /evals/runs/{id}
GET  /evals/runs/{id}/results
GET  /evals/datasets
POST /evals/datasets
GET  /evals/datasets/{id}
GET  /evals/metrics
POST /evals/metrics
GET  /evals/metrics/{id}
GET  /evals/techniques
GET  /evals/arena
POST /evals/arena/run
GET  /evals/runs/{id}/progress  (SSE stream)
```

### Future Tasks
- [ ] **P0** Implement `EvalStore.get_recent_pass_rate(tenant_id, days)` 
- [ ] **P0** Wire `emit_eval_failure()` into `eval_runner.py` after metric result is persisted
- [ ] **P1** Add SSE endpoint `/evals/runs/{id}/progress` for streaming eval progress
- [ ] **P1** Implement eval Arena run API
- [ ] **P1** Immutable dataset versioning (copy-on-write)
- [ ] **P2** Eval schedule configuration (cron-based triggers)
- [ ] **P2** Eval result diffing endpoint (run A vs run B)
- [ ] **P3** Eval technique library (built-in prompt injection, hallucination, PII tests)

---

## MODULE 3 — SECURITY / RED TEAM ENGINE

### Purpose
Adversarial testing of AI deployments. Runs red team campaigns (prompt injection, jailbreak, data exfiltration, PII leakage, model inversion, excessive agency, hallucination). Produces vulnerability findings that cascade to compliance gaps and remediation tasks.

### What Is Implemented
- Campaign lifecycle (create, run, results)
- Vulnerability findings with severity grading
- Framework score calculation (OWASP LLM, EU AI Act, NIST AI RMF, etc.)
- Deployment security inventory
- `campaign_runner.py` with `emit_campaign_finding()` wiring point
- `get_security_score()` and `get_open_findings()` referenced in `ciso_router.py`

### What Is Missing / Broken

| Gap | Severity | Notes |
|-----|----------|-------|
| `security.posture_calculator` module — `get_security_score()`, `get_open_findings()`, `get_top_findings()` not confirmed implemented | **CRITICAL** | The entire CISO posture score depends on this. If missing, falls back to hardcoded 50.0 — exact behaviour the sprint was meant to eliminate |
| `emit_campaign_finding()` not confirmed wired in `campaign_runner.py` | **CRITICAL** | Without this wire, no cascade fires: no compliance gaps, no tasks, no posture update |
| `ComplianceRegistry.create_gap()` not confirmed implemented | **CRITICAL** | `automation.py` calls this directly — if missing, the finding→compliance gap automation chain is broken |
| `ComplianceRegistry.get_all_scores()` not confirmed implemented | **CRITICAL** | Called in `compute_posture_score()` — missing implementation breaks the CISO dashboard |
| No MITRE ATLAS attack mapping | **HIGH** | Framework list includes MITRE ATLAS but attack technique→control mapping is missing |
| Model scan job does not feed findings into vulnerability store | **HIGH** | Scan jobs create findings but the persistence path to the vulnerability store is unclear |
| Vulnerability status transitions not enforced | **MEDIUM** | OPEN → IN_PROGRESS → REMEDIATED → VERIFIED requires state machine validation |
| No campaign scheduling | **MEDIUM** | Red team campaigns must be schedulable (daily/weekly) for continuous assurance |
| `frameworkScores` endpoint returns empty until campaigns run | **MEDIUM** | First-run UX broken — no baseline seeding |

### API Endpoints Required (complete list)
```
GET  /security/posture
GET  /security/frameworks/scores
GET  /security/frameworks/{id}
GET  /security/deployments
GET  /security/vulnerabilities?page=N&severity=X
GET  /security/campaigns?page=N
POST /security/campaigns
GET  /security/campaigns/{id}
GET  /security/campaigns/{id}/results
POST /security/campaigns/{id}/run
GET  /security/scans
POST /security/scans
GET  /security/scans/{id}
GET  /security/audits
GET  /security/audits/{id}
```

### Future Tasks
- [ ] **P0** Implement `sentinel/security/posture_calculator.py` with `get_security_score()`, `get_open_findings()`, `get_top_findings()`
- [ ] **P0** Implement `ComplianceRegistry.create_gap()`, `get_all_scores()` in `sentinel/compliance/registry.py`
- [ ] **P0** Wire `emit_campaign_finding()` into `campaign_runner.py`
- [ ] **P1** Campaign scheduling (cron + immediate-run)
- [ ] **P1** MITRE ATLAS attack technique mapping in `automation.py::FINDING_TO_COMPLIANCE`
- [ ] **P1** Vulnerability status state machine with transition validation
- [ ] **P2** Baseline framework score seeding (run on first tenant onboard)
- [ ] **P2** Scan job → findings persistence path validation
- [ ] **P3** Campaign report export (PDF per campaign)

---

## MODULE 4 — TASK BOARD (Cross-Module)

### Purpose
Single pane of glass for all remediation work. Tasks are created automatically by the event automation engine (security findings, eval failures, compliance gaps) and manually by any user. Tasks reference their source module and source record for full traceability.

### What Is Implemented
- `Task` type definition (complete, well-specified)
- `useTaskData.ts` hooks (useTasks, useUpdateTask, useCreateTask)
- `QK.tasks()` query key
- Automation rules that create tasks from findings/failures

### What Is Missing / Broken

| Gap | Severity | Notes |
|-----|----------|-------|
| `TaskStore` backend — `create()`, `find_by_source()` not confirmed implemented | **CRITICAL** | Every automation rule calls `TaskStore` — if not implemented, all auto-task creation fails silently |
| No task board UI page confirmed | **HIGH** | `useTaskData.ts` hook exists but no page that renders it is confirmed in the repo. The task board is the compliance officer's primary view |
| No assignee resolution (user lookup) | **HIGH** | `assigneeId` is stored but there is no user lookup or assignment UI |
| No due date enforcement / overdue detection | **HIGH** | `task.overdue` event type is defined but no cron job emits it |
| No task comment/activity log | **MEDIUM** | Enterprise task management requires activity trail |
| Bulk status update missing | **MEDIUM** | CISO needs to bulk-close/accept tasks |
| No task → compliance gap link-back | **MEDIUM** | Task references `sourceId` but no reverse lookup from compliance gap to task |

### API Endpoints Required (complete list)
```
GET  /tasks?status=X&priority=Y&sourceModule=Z&assigneeId=W
POST /tasks
GET  /tasks/{id}
PATCH /tasks/{id}
GET  /tasks/{id}/activity
POST /tasks/{id}/comments
POST /tasks/bulk-update
```

### Future Tasks
- [ ] **P0** Implement `TaskStore` with PostgreSQL: `create()`, `find_by_source()`, `list()`, `update()`
- [ ] **P0** Build `/tasks` page in dashboard (Kanban or table view, filterable by module/priority/status)
- [ ] **P1** Overdue task detection cron (runs every hour, emits `task.overdue` for tasks past due date)
- [ ] **P1** Assignee lookup — integrate with tenant user directory
- [ ] **P2** Task activity log (comments, status changes, assignee changes)
- [ ] **P2** Bulk status update endpoint
- [ ] **P3** SLA tracking (time-to-remediate by severity)

---

## MODULE 5 — CISO DASHBOARD & BOARD REPORT

### Purpose
Aggregated risk posture view for executive stakeholders. The posture score is a weighted composite of security, compliance, quality, and HITL components. The board report generator produces signed, timestamped evidence packages.

### What Is Implemented
- `compute_posture_score()` with correct formula (40/30/20/10 weighting)
- `GET /ciso/posture` endpoint
- `POST /ciso/board-report/data` endpoint
- `POST /ciso/board-report/export` endpoint referenced
- `SecurityHome.tsx` full rewrite (live data, no hardcoded values)
- `ReportGenerator.tsx` full rewrite (CONFIG → LOADING → PREVIEW states)
- `_generate_recommendations()` (data-driven, not hardcoded)

### What Is Missing / Broken

| Gap | Severity | Notes |
|-----|----------|-------|
| `/ciso/board-report/export` returns a Blob but the export endpoint is not implemented in `ciso_router.py` | **CRITICAL** | The spec shows `useExportBoardReport()` calling `apiClient.postBlob()` but the actual `/export` FastAPI route is missing from the code |
| `riskTrend` is hardcoded `"stable"` | **HIGH** | `GET /ciso/posture` returns `"trend": "stable"` with a `# TODO` comment — violates the immutable constraint against hardcoded values in CISO pages |
| `trendDelta` is hardcoded `0` | **HIGH** | Same as above — requires historical posture score storage |
| Historical posture score store not implemented | **HIGH** | To compute trend, previous scores must be persisted. No `PostureHistory` table or store exists |
| `executiveSummary` field missing from `BoardReportData` response | **MEDIUM** | The TypeScript type defines `executiveSummary: string` but the FastAPI response does not include it |
| Board report PDF generation not implemented | **MEDIUM** | The export endpoint should generate a PDF — no library (WeasyPrint, ReportLab) is configured |
| No CISO deployment overview page separate from `SecurityHome` | **MEDIUM** | `SecurityHome` doubles as CISO view — need a dedicated `/ciso` route |
| No multi-period trend chart | **LOW** | CISO dashboard needs 90-day risk trend line, not just current score |

### API Endpoints Required (complete list)
```
GET  /ciso/posture
GET  /ciso/posture/history?days=90
POST /ciso/board-report/data
POST /ciso/board-report/export   ← MISSING implementation
GET  /ciso/deployments
```

### Future Tasks
- [ ] **P0** Implement `POST /ciso/board-report/export` in `ciso_router.py` (PDF via WeasyPrint or HTML→PDF)
- [ ] **P0** Create `PostureHistory` table — store score + components after every `compute_posture_score()` call
- [ ] **P1** Compute and return `riskTrend` and `trendDelta` from `PostureHistory` (remove hardcoded values)
- [ ] **P1** Add `executiveSummary` to board report response (NLP-generated or template-based)
- [ ] **P1** Add `GET /ciso/posture/history?days=N` for trend chart
- [ ] **P2** Add dedicated `/ciso` route in dashboard (separate from SecurityHome)
- [ ] **P2** 90-day risk trend line chart in CISO dashboard
- [ ] **P3** Signed report (hash + timestamp in PDF footer for regulatory evidence)

---

## MODULE 6 — EVENT BUS & AUTOMATION ENGINE

### Purpose
The nervous system of the platform. Backend: asyncio pub/sub bus in `sentinel/events/bus.py`. Frontend: WebSocket consumer in `useEventBus.ts`. Automation engine in `automation.py` converts events into cross-module cascades.

### What Is Implemented
- `EventBus` class with per-tenant queue management
- `SentinelEvent` dataclass with JSON serialisation
- WebSocket endpoint `/ws/events` with JWT auth
- 30-second heartbeat to keep connections alive
- All 6 automation rules (finding→gap, finding→task, eval→HITL, eval→task, gap→task, posture recalculation)
- Frontend cache invalidation map (`EVENT_INVALIDATIONS`)
- Toast notifications for high-priority events

### What Is Missing / Broken

| Gap | Severity | Notes |
|-----|----------|-------|
| Reconnect exponential backoff bug | **HIGH** | `useEventBus.ts` line: `Math.min(2000 * Math.pow(2, 0), 30_000)` — the exponent is always `0` because there is no retry counter. Always reconnects at 2s. Needs a `retryCount` ref |
| No event persistence / backlog | **HIGH** | The spec mentions "send backlog of last 50 events" in the WebSocket router comment but `events_websocket()` does not implement this — clients that disconnect miss events |
| Bus is in-process only — no multi-worker support | **HIGH** | If FastAPI runs with `--workers 4`, each worker has its own bus instance. Events emitted in worker 1 never reach clients connected to worker 2. Redis Streams upgrade is the documented path |
| `automation.py` circular import risk | **MEDIUM** | `_rule_campaign_finding_to_compliance_gap` imports from `sentinel.events.emitters` which imports `sentinel.events.automation` — potential circular import under certain load orders |
| No dead-letter queue for dropped events | **MEDIUM** | When a subscriber queue is full (100 events), events are silently dropped. No alerting, no persistence |
| `EventType.POSTURE_SCORE_UPDATED` not in frontend `EventType` union | **MEDIUM** | `store.ts` defines `EventType` TypeScript union — `posture.score.updated` is handled in `EVENT_INVALIDATIONS` but not in the TypeScript `EventType` type. TypeScript will not error but type safety is lost |
| No event replay for debugging | **LOW** | Operators cannot replay a specific event to debug automation rule failures |

### Future Tasks
- [ ] **P0** Fix reconnect backoff: add `retryCountRef` to `useEventBus.ts` and increment on each `onclose`
- [ ] **P0** Add `posture.score.updated` to TypeScript `EventType` union in `store.ts`
- [ ] **P1** Implement event backlog in WebSocket handler (store last 50 events in Redis, send on connect)
- [ ] **P1** Upgrade `EventBus` to Redis Streams for multi-worker support (swap `asyncio.Queue` for Redis XADD/XREAD)
- [ ] **P1** Resolve circular import: move emitter calls in automation rules to a task queue pattern
- [ ] **P2** Dead-letter queue: persist dropped events to a `dropped_events` table with alerting
- [ ] **P3** Event replay API for operators

---

## MODULE 7 — AUTH & MULTI-TENANCY

### Purpose
JWT-based authentication with tenant isolation. Every API call is scoped to a `tenant_id`. Every WebSocket connection is validated before upgrade.

### What Is Implemented
- `decode_token()` used in WebSocket auth
- `get_current_tenant()` dependency used in CISO router
- `RequireAuth` React component (specified, not verified in repo)
- Route protection pattern via `<RequireAuth>` wrapper

### What Is Missing / Broken

| Gap | Severity | Notes |
|-----|----------|-------|
| Login page not confirmed | **CRITICAL** | `RequireAuth` redirects to `/login` but no login page component is confirmed in the repo |
| JWT refresh token not implemented | **HIGH** | Access tokens expire — without refresh, users get silently logged out mid-session |
| Role-based access control (RBAC) missing | **HIGH** | CISO, Security Lead, ML Engineer, Compliance Officer have different permissions but there is no role check on any endpoint |
| Token stored in `localStorage` (XSS vulnerable) | **HIGH** | `useEventBus.ts` and `RequireAuth` read from `localStorage`. For enterprise, should use `httpOnly` cookie |
| No SAML/OIDC SSO integration | **MEDIUM** | Enterprise customers require SSO — no OAuth2/OIDC provider integration |
| Tenant onboarding flow missing | **MEDIUM** | No API or UI for creating a new tenant, seeding initial data |
| No audit of auth events | **LOW** | Login, logout, token refresh should be in the audit log |

### Future Tasks
- [ ] **P0** Build `/login` page component in dashboard
- [ ] **P0** Implement JWT refresh token flow (refresh endpoint + interceptor in `api-client.ts`)
- [ ] **P1** Implement RBAC: define roles (admin, ciso, security_lead, ml_engineer, compliance_officer) and enforce on API routes
- [ ] **P1** Migrate token storage from `localStorage` to `httpOnly` cookie
- [ ] **P2** OIDC/SAML SSO integration (Auth0 or Keycloak adapter)
- [ ] **P2** Tenant onboarding wizard (create tenant, invite users, seed baseline data)
- [ ] **P3** Auth event audit logging

---

## MODULE 8 — MODEL INVENTORY

### Purpose
Registry of all AI models deployed by a tenant. Each model has metadata (provider, version, risk level), trust score history, compliance posture, and links to campaigns/evals run against it.

### What Is Implemented
- `QK.modelInventory()` and `QK.model(id)` query keys defined
- `model.registered` and `model.trust_score.updated` event types defined
- Model referenced in Vulnerability, Task, HitlItem types

### What Is Missing / Broken

| Gap | Severity | Notes |
|-----|----------|-------|
| No model inventory page in dashboard confirmed | **CRITICAL** | The ML Engineer's primary workflow (register model → see trust score update) has no UI confirmed |
| No `/proxy/models` endpoint implementation confirmed | **HIGH** | Query key exists but endpoint may not be implemented |
| No model registration form | **HIGH** | ML Engineer must be able to register a new model via UI |
| No model lifecycle states | **MEDIUM** | Models need states: REGISTERED → SCANNING → ACTIVE → DEPRECATED → RETIRED |
| No model version tracking | **MEDIUM** | When a model is updated, the new version must create a new inventory entry, not overwrite |
| No model → eval run link | **MEDIUM** | From the model page, should be able to see all eval runs for that model |
| Model trust score history not exposed in inventory | **LOW** | `QK.trustScore()` exists for the proxy overview but is not linked to individual model records |

### Future Tasks
- [ ] **P0** Build Model Inventory page (`/models`) with registration form
- [ ] **P0** Implement `GET /proxy/models` and `POST /proxy/models` endpoints
- [ ] **P1** Model lifecycle state machine
- [ ] **P1** Model version tracking (immutable versions, not overwrites)
- [ ] **P2** Model detail page: trust score history, eval runs, campaign results, compliance posture
- [ ] **P2** Model risk classification on registration (auto-classify based on use case)
- [ ] **P3** Model comparison view (side-by-side trust/eval scores across versions)

---

## CROSS-CUTTING CONCERNS

### Database & Persistence

| Issue | Severity |
|-------|----------|
| No confirmed ORM model for `Task`, `ComplianceGap`, `PostureHistory` | **CRITICAL** |
| `migrations/` directory exists but migration completeness unverified | **HIGH** |
| No data archival strategy (audit logs grow unbounded) | **MEDIUM** |
| No backup/restore procedure documented | **MEDIUM** |

### Testing

| Issue | Severity |
|-------|----------|
| `tests/` directory exists — test coverage unknown | **HIGH** |
| No integration test for the full cascade (finding → gap → task → posture update) | **CRITICAL** |
| No WebSocket connection test | **HIGH** |
| No frontend component tests confirmed | **MEDIUM** |

### Infrastructure

| Issue | Severity |
|-------|----------|
| `frontend/` and `dashboard/` both exist — dual frontend confusion | **CRITICAL** |
| `build_ui.py`, `enterprise_ui.py`, `fix_audit.py`, `ship_final.py` in root — these are generation artifacts, not production code | **HIGH** |
| `sentinel_ui_gen.py` is 0 bytes — dead file | **MEDIUM** |
| `wiring_fix.py` suggests a patch was applied outside proper commit flow | **MEDIUM** |
| `vercel.json` present — unclear if Vercel is the deployment target or Docker | **LOW** |
| No health check endpoint for load balancer | **MEDIUM** |
| No Kubernetes manifests or Helm chart | **LOW** |

### Documentation

| Issue | Severity |
|-------|----------|
| No API reference docs (OpenAPI schema not confirmed as published) | **HIGH** |
| `AUDIT_REPORT.md` (this file) was the only audit — no prior architecture decision records | **MEDIUM** |
| `CHANGELOG.md` exists — format and completeness unverified | **LOW** |

---

## PRIORITISED FUTURE TASK PLAN

### Sprint 1 — Foundation (Blocks Everything Else)
These items must be done before any other feature work. None of the automation cascade works without them.

1. Implement `TaskStore` (PostgreSQL) — `create`, `find_by_source`, `list`, `update`
2. Implement `HitlStore.create()`, `count_pending()`, `get_resolution_rate()`
3. Implement `ComplianceRegistry.create_gap()`, `get_all_scores()`
4. Implement `sentinel/security/posture_calculator.py` — `get_security_score()`, `get_open_findings()`, `get_top_findings()`
5. Implement `EvalStore.get_recent_pass_rate()`
6. Wire `emit_campaign_finding()` into `campaign_runner.py`
7. Wire `emit_eval_failure()` into `eval_runner.py`
8. Build `/login` page with JWT auth form
9. Resolve `frontend/` vs `dashboard/` ambiguity — pick one, delete the other

### Sprint 2 — Platform Integrity
10. Fix WebSocket reconnect backoff (`retryCountRef`)
11. Add `posture.score.updated` to TypeScript `EventType` union
12. Implement JWT refresh token
13. Create `PostureHistory` table and remove hardcoded `"stable"` trend
14. Implement `POST /ciso/board-report/export` (PDF generation)
15. Add event backlog on WebSocket reconnect (Redis, last 50 events)
16. Add `postBlob()` to `api-client.ts`

### Sprint 3 — UI Completeness
17. Build Task Board page (`/tasks`) — table view, filterable by module/priority/status
18. Build Model Inventory page (`/models`) — list, register, detail view
19. Build dedicated CISO dashboard (`/ciso`) separate from SecurityHome
20. Add overdue task detection cron
21. Add error states to all data-fetching components (not just loading skeletons)
22. Wrap all routes in `<ErrorBoundary>` (confirm in `App.tsx`)

### Sprint 4 — Enterprise Hardening
23. Implement RBAC (roles: admin, ciso, security_lead, ml_engineer, compliance_officer)
24. Upgrade `EventBus` to Redis Streams for multi-worker support
25. Migrate JWT from `localStorage` to `httpOnly` cookie
26. Integration test: full cascade (finding → gap → task → posture update)
27. Model lifecycle state machine
28. Campaign scheduling (cron-based)
29. Eval scheduling (cron-based)
30. Clean up root-level Python scripts (`build_ui.py`, `enterprise_ui.py`, etc.) into `scripts/`

### Sprint 5 — Scale & Compliance
31. OIDC/SAML SSO integration
32. Cursor-based audit log pagination
33. Audit log export (signed JSON/CSV)
34. Data archival strategy (audit log rotation)
35. Kubernetes manifests / Helm chart
36. Published OpenAPI docs (auto-generated from FastAPI)
37. Signed board reports (hash in PDF footer)

---

## Immutable Constraints — Status Check

| Constraint | Status |
|-----------|--------|
| No `Math.random()` in data-facing pages | ✅ Specified correctly |
| No hardcoded data in CISO dashboard | ⚠️ `riskTrend: "stable"` and `trendDelta: 0` are hardcoded — must fix Sprint 2 |
| No `window.print()` on static values | ✅ ReportGenerator rewritten |
| No `ThemeProvider`, `class="dark"`, localStorage theme | ✅ Not present in spec |
| No lucide-react or icon library | ✅ Not used in spec |
| No `update()` or `delete()` on audit records | ✅ Audit store is append-only |
| No `HALF_OPEN` circuit breaker state | ✅ Only CLOSED/OPEN in spec |
| Trust score formula 0.40/0.30/0.15/0.15 | ✅ Specified correctly |
| No TypeScript `any` without `@ts-expect-error` | ⚠️ `any` used in `ciso_router.py` frontend rendering — needs review |
| Every page has loading skeleton | ✅ Skeleton system specified |
| Every API call has error state | ⚠️ Error states confirmed in CISO components only — needs audit across all pages |
| Every route wrapped in ErrorBoundary | ⚠️ Specified in Phase 8 but App.tsx modifications not confirmed |
| Every authenticated route wrapped in RequireAuth | ⚠️ Specified but App.tsx modifications not confirmed |
| `useEventBus` mounted once at app root | ✅ Specified in Phase 3 |
| Zustand for cross-module state only | ✅ Correctly scoped |
| React Query for all server state | ✅ Specified correctly |
| Outfit font everywhere | ✅ Applied in all JSX |
| CSS tokens only — no hardcoded hex | ✅ All colour references use `hsl(var(--...))` |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Store implementations are stubs — automation cascade is silent no-op | High | Critical | Sprint 1 items 1-5 |
| Multi-worker event bus splits events across processes | High | High | Sprint 4 item 24 (Redis Streams) |
| `localStorage` JWT exposed to XSS in enterprise environment | Medium | Critical | Sprint 4 item 25 |
| Dual `frontend/`+`dashboard/` causes CI/CD confusion | High | Medium | Sprint 1 item 9 |
| Circular import in automation.py crashes event emission | Medium | Critical | Sprint 2 — move to task queue pattern |
| CISO presents hardcoded trend data in board meeting | High | High | Sprint 2 items 13 |

---

*This audit report was produced by the Certifyi AI Engineering team.*  
*It will be superseded by the next audit after Sprint 1 completion.*  
*Document version: 1.0.0 — 2026-03-10*

---

## ADDENDUM: Post-Audit Remediation — 2025-03-12

**Remediation Engineer:** Security Architect
**Scope:** OSS security remediation + post-merge infrastructure cleanup

### Resolved Issues (Infrastructure)

The following infrastructure issues identified in this audit have been **fully resolved**:

| Issue | Original Status | Resolution |
|-------|----------------|------------|
| `frontend/` duplicate directory | ⚠️ CRITICAL | ✅ Removed — `dashboard/` is the single frontend |
| `build_ui.py` in repo root | ⚠️ HIGH | ✅ Deleted — codegen artifact removed |
| `enterprise_ui.py` in repo root | ⚠️ HIGH | ✅ Deleted — codegen artifact removed |
| `fix_audit.py` in repo root | ⚠️ HIGH | ✅ Deleted — codegen artifact removed |
| `ship_final.py` in repo root | ⚠️ HIGH | ✅ Deleted — codegen artifact removed |
| `wiring_fix.py` in repo root | ⚠️ MEDIUM | ✅ Deleted — patch script removed |
| `sentinel_ui_gen.py` (0 bytes) | ❌ MEDIUM | ✅ Deleted — empty dead file removed |
| `data/audit.db` tracked binary | ⚠️ HIGH | ✅ Deleted + added to `.gitignore` |
| Dashboard codegen scripts (`fix_*.py`, `gen_*.py`) | ⚠️ HIGH | ✅ 9 scaffolding files removed from `dashboard/` |
| `.gitignore` missing patterns | ⚠️ MEDIUM | ✅ Updated — added `*.db`, `audit.db`, `*.sqlite3`, codegen patterns |
| `.dockerignore` missing patterns | ⚠️ MEDIUM | ✅ Updated — added `*.db`, `data/*.db`, codegen patterns |

### Updated Risk Register

| Risk | Original Status | Current Status |
|------|----------------|----------------|
| Dual `frontend/`+`dashboard/` confusion | High/Medium | ✅ RESOLVED — `frontend/` removed |
| Root-level Python scripts pollute repo | High/Medium | ✅ RESOLVED — all deleted |
| `data/audit.db` binary tracked in Git | High/High | ✅ RESOLVED — deleted + gitignored |
| Dashboard codegen residue | Medium/Medium | ✅ RESOLVED — 9 files removed |

### Remaining Open Items

All items in the Sprint 1-5 future task plan remain open. The remediation addressed **infrastructure hygiene only** — no module-level feature gaps were closed.

**Updated Overall Platform Readiness: 65%** (up from 62% — infrastructure cleanup complete, module gaps unchanged)

*Document version: 1.1.0 — 2025-03-12*
