# AI Governance Module — CRUD + Realtime Wiring Report

**Date:** 2026-04-28
**Scope:** AI Governance module (34 pages, 27 wired, 6 already wired/read-only, 1 skipped)
**Status:** ✅ COMPLETE

## Summary

| Metric | Value |
|---|---|
| Pages wired this session | 27 |
| New Supabase tables created | 16 |
| Existing tables given org-scoped RLS | 7 |
| New TypeScript services scaffolded | 16 |
| New TanStack hooks scaffolded | 16 |
| Realtime subscriptions added | 21 |
| Build status | ✅ PASS (`npm run build` — 22.66s) |
| Security advisors on touched tables | 0 ERRORs, 0 WARNs, 0 INFOs |

## Migrations applied

- `phase2_p1_ai_governance_rls_existing_tables` — added 5 policies × 7 zero-policy tables (`ai_impact_assessments`, `explainability_reports`, `guardrails`, `guardrail_rules`, `model_inventory`, `shadow_ai_findings`, `use_cases`). All use `tenant_id = public.current_user_org_id()::text` for tenant isolation, plus a `service_role` bypass.
- `phase2_p1_ai_governance_create_missing_tables` — created 16 tables with `org_id uuid REFERENCES organizations(id)`, RLS enabled & forced, 4 org-scoped policies + service_role bypass per table, and indexes for `org_id` and date columns.

## Pages wired (27)

### Model Inventory (5)
| Page | Service | Status |
|---|---|---|
| ModelDetail.tsx | modelService | ✅ |
| ModelLifecycle.tsx | modelLifecycleService | ✅ |
| validation/ModelValidationLab.tsx | modelValidationService | ✅ |
| models/ModelDNA.tsx | modelDNAService | ✅ |
| performance/PerformanceMonitoring.tsx | modelPerformanceService | ✅ |

### Agent Discovery (5)
| Page | Service | Status |
|---|---|---|
| agents/ShadowAI.tsx | shadow_ai_findings | ✅ |
| AgentRegistry.tsx | agentsService | ✅ |
| AgentIAM.tsx | identities | ✅ |
| MultiAgentChoreography.tsx | agentWorkflowService | ✅ |
| KillSwitchEvents.tsx | killSwitchService | ✅ |

### Trust Engine (7)
| Page | Service | Status |
|---|---|---|
| trust-engine/LiveTraceFeed.tsx | trustTraceService | ✅ |
| trust-engine/CostTokenDashboard.tsx | costTokenService | ✅ |
| trust-engine/FallbackLog.tsx | fallbackLogsService | ✅ |
| trust-engine/ToolCallMonitor.tsx | toolCallLogsService | ✅ |
| trust-engine/TrustConfig.tsx | policyFirewallService | ✅ |
| trust-engine/TrustEngineDashboard.tsx | trustTrace + costToken (read-only) | ✅ |
| ExplainabilityCenter.tsx | explainabilityService | ✅ |

### Evaluations (3)
| Page | Service | Status |
|---|---|---|
| evals/EvalResultsViewer.tsx | evalRunsService | ✅ |
| evals/EvalTechniques.tsx | evalTechniquesService | ✅ |
| Benchmark.tsx | evalRunsService (filter by `type=benchmark`) | ✅ |

### Standalone (7)
| Page | Service | Status |
|---|---|---|
| PromptRegistry.tsx | promptService | ✅ |
| AIImpactAssessments.tsx | aiImpactService | ✅ |
| bias-audits/BiasAuditWizard.tsx | biasAuditService | ✅ |
| use-cases/UseCasePage.tsx | useCasesService | ✅ |
| AIRiskTiering.tsx | aiRiskTieringService | ✅ |
| PostMarket.tsx | postMarketService | ✅ |
| GenAIRisks.tsx | genaiRisksService | ✅ |
| ModelRiskCommittee.tsx | mrcVotesService | ✅ |

### Skipped (1)
| Page | Reason |
|---|---|
| bias-audits/BiasAuditResults.tsx | Already marked `WIRED_BY_PHASE_COMPLETE`, read-only — no write handlers to wire |

## Wiring pattern (non-destructive)

Every page received the same minimal additions, keeping all existing seed data, types, UI, and handlers intact:

1. **Imports** — added `useEffect` + `fetchAllX` / `upsertX` / `deleteX` from the matching service.
2. **Adapter** — small `rowToX` and `xToRow` helpers (snake_case ↔ camelCase) when the table shape didn't match the in-app type.
3. **Mount loader** — `useEffect` that calls `fetchAllX()` and replaces seed state when Supabase returns data; falls back to seed silently on error.
4. **Mutations** — fire-and-forget `upsertX(...)` / `deleteX(...)` with `.catch()` toasts, **after** existing optimistic local state updates so the UI stays snappy.

Realtime invalidation (via `useRealtimeInvalidation.ts`) reconciles divergence — when another user creates/updates/deletes a row, the affected page re-fetches automatically.

## Build & Security

- **Build:** ✅ `npm run build` succeeded in 22.66s (Vite + TypeScript). All 27 wired pages compiled.
- **Security advisors:** Ran `get_advisors(type=security)` post-migration.
  - Lints on the 23 tables we touched (16 new + 7 fixed): **0**
  - Total ERRORs across the entire project: **0**
  - Total WARNs: 7 (all pre-existing — function-level `SECURITY DEFINER` notes on `current_user_org_id()` etc., which are intentional so RLS policies can call them)
  - Total INFOs: 59 (all on legacy PascalCase tables outside this module — out of scope)

## Realtime subscriptions

Added 21 new channels to `useRealtimeInvalidation.ts`, covering all 16 new tables plus `agents`, `ai_models`, `shadow_ai_findings`, `guardrail_rules`, and `use_cases`. Existing duplicate registrations for `guardrails` and `model_inventory` were deduped.

## Outstanding manual user action

- Toggle Supabase Dashboard → Authentication → Providers → Password → "Breach detection" (cannot be done via MCP).
