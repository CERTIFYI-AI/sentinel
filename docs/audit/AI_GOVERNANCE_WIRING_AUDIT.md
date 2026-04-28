# AI Governance — Data-Wiring Audit

**Generated:** 2026-04-28  
**Auditor:** Automated read-only audit of `/home/user/workspace/sentinel/dashboard/src`  
**Scope:** 34 AI Governance pages mapped from `App.tsx` route definitions  
**Reference files:**
- Route map: `dashboard/src/App.tsx`
- Realtime subscriptions: `dashboard/src/hooks/useRealtimeInvalidation.ts`
- Services inspected: `modelService`, `modelEfficiencyService`, `agentsService`, `biasAuditService`, `explainabilityService`, `trustTraceService`, `policyFirewallService`, `aiImpactService`, `promptService`

---

## Verdict Key

| Verdict | Meaning |
|---------|---------|
| **WIRED** | Reads from Supabase AND mutations go through a service layer |
| **READ_ONLY** | Reads from Supabase but mutations are absent or only affect local state |
| **MOCK** | Uses hardcoded seed arrays or static imports — no live Supabase reads |
| **BROKEN** | Attempts a real connection but fails (wrong table name, missing import, etc.) |

---

## Full Audit Table

| Page | File Path | Data Source | Has Mutations | Has CRUD UI | Backing Table | Realtime Registered | Verdict |
|------|-----------|-------------|:-------------:|:-----------:|---------------|:-------------------:|:-------:|
| ModelInventory | `pages/ModelInventory.tsx` | TanStack Query → `modelService` → Supabase `ai_models` | ✅ `saveModel` (upsert), `deleteModel` via service | ✅ Register / Edit / Delete — all wired to handlers | `ai_models` | ⚠️ NO — service uses `ai_models`; realtime only covers `model_inventory` + `models` | **WIRED** |
| ModelInventoryPage | `pages/models/ModelInventoryPage.tsx` | TanStack Query (`useModelsData`) + seed fallback | ✅ `saveModel`, `deleteModel` via service | ✅ All wired | `ai_models` | ⚠️ NO — same mismatch as above | **WIRED** |
| ModelDetail | `pages/models/ModelDetail.tsx` | Static seed constants (`MODELS`, `BIAS_AUDITS`, `INCIDENTS`, `EVIDENCE`, `CONTROLS`) | ❌ None | ❌ Read-only display; Configure Alerts modal has no save | `ai_models` | — | **MOCK** |
| ModelLifecycle | `pages/ModelLifecycle.tsx` | Static seed (`MODELS`) | ❌ None | ⚠️ Gate Review / Promote buttons — local state only | `ai_models` / `model_lifecycle` | — | **MOCK** |
| ModelValidationLab | `pages/validation/ModelValidationLab.tsx` | Hardcoded `SEED_REPORTS` array (in-file) | ❌ None | ❌ Run Validation / Export → toast only | `model_validations` | ❌ NO — `model_validations` not registered | **MOCK** |
| ExplainabilityCenter | `pages/explainability/ExplainabilityCenter.tsx` | `useExplainabilityReports` (TanStack → Supabase `explainability_reports`) + `EXPLAINABILITY_REPORTS` seed fallback | ⚠️ Delete calls local `setReports()`; Generate is local only | ⚠️ Generate / Trash buttons — delete is LOCAL state, not service call | `explainability_reports` | ✅ YES | **READ_ONLY** |
| ModelEfficiency | `pages/ModelEfficiency.tsx` | TanStack Query → `modelEfficiencyService` → Supabase `model_efficiency` | ✅ `save` (upsert), `remove` (delete) via service | ✅ Add Benchmark / Delete — fully wired | `model_efficiency` | ✅ YES | **WIRED** |
| ModelDNA | `pages/models/ModelDNA.tsx` | Hardcoded `MODEL_DNA` const array (in-file) | ❌ None | ❌ Download Certificate → toast only | `model_dna` / `ai_models` | ❌ NO | **MOCK** |
| AgentDiscovery | `pages/agents/AgentDiscovery.tsx` | TanStack Query (`useAgentsData`) → `agentsService` → Supabase `agents` | ✅ `saveAgents` (upsert), `removeAgents` (delete) via service | ✅ Edit / Delete — all wired | `agents` | ⚠️ NO — neither `Agent` nor `agents` is registered in realtime | **WIRED** |
| ShadowAI | `pages/agents/ShadowAI.tsx` | Static seed (`AGENTS` from `data/seed`) | ❌ None | ⚠️ Quarantine / Block buttons — local `setAgents()` only | `agents` | ⚠️ NO | **MOCK** |
| AgentRegistry | `pages/AgentRegistry.tsx` | Hardcoded `SEED` array (in-file) | ❌ None | ⚠️ Create / Edit / Delete — local state only | `agent_registry` / `agents` | ❌ NO | **MOCK** |
| AgentIAM | `pages/AgentIAM.tsx` | Hardcoded `SEED` array (in-file) | ❌ None | ⚠️ Revoke / Rotate — local `setIdentities()` only | `agent_iam` / `identities` | ⚠️ `identities` YES — but page doesn't query it | **MOCK** |
| MultiAgentChoreography | `pages/MultiAgentChoreography.tsx` | Hardcoded `SEED` array (in-file) | ❌ None | ⚠️ Create / View — local state only | `agent_workflows` | ❌ NO | **MOCK** |
| KillSwitchEvents | `pages/KillSwitchEvents.tsx` | Hardcoded `SEED` array (in-file) | ❌ None | ⚠️ Plus / Resolve — local `setEvents()` only | `kill_switch_events` | ❌ NO | **MOCK** |
| PerformanceMonitoring | `pages/performance/PerformanceMonitoring.tsx` | Static seed (`MODELS`) + in-file generated history | ❌ None | ❌ Read-only dashboard | `model_performance` / `models` | ⚠️ `models` YES — but page doesn't query it | **MOCK** |
| TrustEngineDashboard | `pages/trust-engine/TrustEngineDashboard.tsx` | `TRUST_POLICIES` (seed) + `useTrustTraceData` (TanStack → Supabase `TrustTrace`) | ✅ `saveTrace`, `removeTrace` via `trustTraceService` — but only for traces; policies are seed | ⚠️ Edit / Delete wired for traces; policy panel is seed-only | `TrustTrace` (service), `trust_traces` (realtime) | ⚠️ `trust_traces` YES — service uses PascalCase `TrustTrace` (case mismatch risk) | **READ_ONLY** |
| GuardrailActivity | `pages/trust-engine/GuardrailActivity.tsx` | `GUARDRAIL_EVENTS` (seed) + `usePolicyFirewallData` (TanStack → Supabase `policy_firewall_rules`) | ✅ `savePolicyFirewall`, `removePolicyFirewall` via service | ✅ Add Guardrail / Delete wired for rules; event list is seed | `policy_firewall_rules` | ✅ YES | **WIRED** |
| LiveTraceFeed | `pages/trust-engine/LiveTraceFeed.tsx` | Static seed (`TRACES`) + simulated traces via `generateTrace()` | ❌ None | ❌ Read-only live feed | `trust_traces` | ✅ YES (table registered, but not queried here) | **MOCK** |
| CostTokenDashboard | `pages/trust-engine/CostTokenDashboard.tsx` | Hardcoded arrays (`DAILY_TOKEN_USAGE`, `DAILY_COST_TREND`, `COST_BY_MODEL`) | ❌ None | ❌ Read-only charts; budget alert dialog is local | `cost_token_usage` | ❌ NO | **MOCK** |
| FallbackLog | `pages/trust-engine/FallbackLog.tsx` | Static seed (`FALLBACK_LOG` from `data/seed`) | ❌ None | ❌ Read-only log | `fallback_logs` | ❌ NO | **MOCK** |
| ToolCallMonitor | `pages/trust-engine/ToolCallMonitor.tsx` | Hardcoded `TOOL_CALLS` array (in-file) | ❌ None | ❌ Read-only monitor | `tool_call_logs` | ❌ NO | **MOCK** |
| TrustConfig | `pages/trust-engine/TrustConfig.tsx` | `TRUST_POLICIES` (seed) for display | ❌ None | ⚠️ Plus / Trash / Save — local state; Save Config → toast only | `trust_policies` / `guardrails` | ⚠️ `guardrails` YES — but page doesn't query it | **MOCK** |
| EvalResultsViewer | `pages/evals/EvalResultsViewer.tsx` | Hardcoded `EVAL_RUNS` array (in-file) | ❌ None | ❌ Read-only viewer | `eval_runs` / `eval_results` | ❌ NO | **MOCK** |
| EvalTechniques | `pages/evals/EvalTechniques.tsx` | Hardcoded `TECHNIQUES_SEED` array (in-file) | ❌ None | ⚠️ Create / Edit / Delete — local state only | `eval_techniques` | ❌ NO | **MOCK** |
| Benchmark | `pages/Benchmark.tsx` | Derives `BENCHMARKS` from seed `MODELS` | ❌ None | ❌ Read-only radar / bar charts | `benchmarks` / `model_efficiency` | ⚠️ `model_efficiency` YES — but page doesn't query it | **MOCK** |
| BiasAuditWizard | `pages/bias-audits/BiasAuditWizard.tsx` | Static seed (`BIAS_AUDITS`, `MODELS`, `DATASETS`) | ❌ None | ⚠️ Create / View / Delete — local `setAudits()` only | `bias_audits` | ✅ YES (table registered, but not queried here) | **MOCK** |
| BiasAuditResults | `pages/bias-audits/BiasAuditResults.tsx` | Seed `BIAS_AUDITS.find()` + `useBiasAudits` hook imported but seed used for record lookup | ❌ None | ❌ Read-only detail view | `bias_audits` | ✅ YES | **READ_ONLY** |
| AIImpactAssessments | `pages/AIImpactAssessments.tsx` | Hardcoded `SEED` array (in-file) | ❌ None | ⚠️ Create / Edit / Delete — local `setRecords()` only | `ai_impact_assessments` | ✅ YES | **MOCK** |
| UseCasePage | `pages/use-cases/UseCasePage.tsx` | Static seed (`USE_CASES`, `MODELS`, `RISKS`) | ❌ None | ⚠️ Create / Edit / Delete — local `setUseCases()` only | `use_cases` | ❌ NO | **MOCK** |
| PromptRegistry | `pages/PromptRegistry.tsx` | Static seed (`PROMPT_REGISTRY` from `data/seed`) | ❌ None | ⚠️ Create / Edit / Delete — local state only (`promptService` exists but **not imported**) | `prompt_registry` | ✅ YES | **MOCK** |
| AIRiskTiering | `pages/AIRiskTiering.tsx` | Hardcoded `SEED` array (in-file) | ❌ None | ⚠️ Plus / Trash / Eye — local `setItems()` only | `ai_risk_tiering` | ❌ NO | **MOCK** |
| PostMarket | `pages/PostMarket.tsx` | Hardcoded `SEED_PLANS` / `SEED_EVENTS` arrays (in-file) | ❌ None | ⚠️ Plus / Trash — local state only | `post_market_surveillance` | ❌ NO | **MOCK** |
| GenAIRisks | `pages/GenAIRisks.tsx` | Hardcoded `SEED` array (in-file) | ❌ None | ⚠️ Plus / Trash / Eye — local `setProfiles()` only | `genai_risks` | ❌ NO | **MOCK** |
| ModelRiskCommittee | `pages/ModelRiskCommittee.tsx` | Static seed (`MODELS`, `USERS`) + hardcoded `MRC_MEMBERS` / `AGENDA_ITEMS` | ❌ None | ⚠️ Vote buttons — local state only | `model_risk_committee` / `committees` | ⚠️ `committees` YES — but page doesn't query it | **MOCK** |

---

## Summary

### Total Pages Audited
**34**

### Count by Verdict

| Verdict | Count | Pages |
|---------|------:|-------|
| **WIRED** | 5 | ModelInventory, ModelInventoryPage, ModelEfficiency, AgentDiscovery, GuardrailActivity |
| **READ_ONLY** | 3 | ExplainabilityCenter, TrustEngineDashboard, BiasAuditResults |
| **MOCK** | 26 | All others (see table above) |
| **BROKEN** | 0 | — |

> **76%** of pages are on mock/seed data and have zero live Supabase connectivity.

---

### Pages Needing the Most Work (MOCK verdict)

These pages have CRUD UI (buttons visible to users) but all mutations operate on local React state only — no data is ever persisted:

| Priority | Page | Gap |
|----------|------|-----|
| 🔴 High | **PromptRegistry** | `promptService` already exists and `prompt_registry` is realtime-registered — just not imported. One-line fix to wire fully. |
| 🔴 High | **AIImpactAssessments** | `aiImpactService` already exists and `ai_impact_assessments` is realtime-registered — same pattern as PromptRegistry. |
| 🔴 High | **BiasAuditWizard** | `bias_audits` is realtime-registered; `biasAuditService` exists — page uses seed instead of hook. |
| 🔴 High | **AgentRegistry** | Has full CRUD UI; no service exists yet; `agents` table used by AgentDiscovery could be reused. |
| 🔴 High | **AgentIAM** | `identities` table is realtime-registered; needs service + hook wiring. |
| 🟡 Medium | **ShadowAI** | Quarantine/Block have no persistence; `agents` table (used by AgentDiscovery) could back this. |
| 🟡 Medium | **ModelLifecycle** | Gate/Promote actions are fire-and-forget; needs lifecycle state table. |
| 🟡 Medium | **KillSwitchEvents** | Safety-critical feature with no persistence — high risk. |
| 🟡 Medium | **EvalTechniques** | Full CRUD UI on local state only. |
| 🟡 Medium | **UseCasePage** | Full CRUD UI on local state only. |
| 🟡 Medium | **AIRiskTiering** | Full CRUD UI on local state only. |
| 🟡 Medium | **PostMarket** | Full CRUD UI on local state only. |
| 🟡 Medium | **GenAIRisks** | Full CRUD UI on local state only. |
| 🟡 Medium | **MultiAgentChoreography** | Full CRUD UI on local state only. |
| 🟡 Medium | **TrustConfig** | Save Config button is toast-only; `guardrails` table is registered. |
| 🟢 Low | **ModelDetail** | Read-only display; needs query hook but no mutations required. |
| 🟢 Low | **ModelValidationLab** | Run/Export actions are toast-only; lower risk than CRUD pages. |
| 🟢 Low | **ModelDNA** | Read-only display; no persistence needed. |
| 🟢 Low | **PerformanceMonitoring** | Read-only dashboard; can be wired to `models` (already registered). |
| 🟢 Low | **LiveTraceFeed** | Read-only feed; `trust_traces` registered; just needs query hook. |
| 🟢 Low | **CostTokenDashboard** | Read-only charts; needs new table + service. |
| 🟢 Low | **FallbackLog** | Read-only log; needs new table + service. |
| 🟢 Low | **ToolCallMonitor** | Read-only monitor; needs new table + service. |
| 🟢 Low | **EvalResultsViewer** | Read-only viewer; needs new table + service. |
| 🟢 Low | **Benchmark** | Read-only; can derive from `model_efficiency` (registered). |
| 🟢 Low | **ModelRiskCommittee** | Vote state not persisted; `committees` registered but not used. |

---

### Realtime Registration Gaps (Tables Used in Code but NOT in `useRealtimeInvalidation.ts`)

These tables are referenced by service files or page code but are **absent from the realtime subscription list**, meaning live UI updates will not propagate:

| Missing Table | Used By | Notes |
|---------------|---------|-------|
| `ai_models` | `modelService` (ModelInventory, ModelInventoryPage) | Realtime has `model_inventory` and `models` — unclear which is canonical; **service uses `ai_models`** |
| `agents` / `Agent` | `agentsService` (AgentDiscovery) | Service falls back to `agents`; neither name is registered |
| `model_validations` | ModelValidationLab (implied) | No service or realtime entry exists |
| `model_dna` | ModelDNA (implied) | No service or realtime entry exists |
| `kill_switch_events` | KillSwitchEvents (implied) | Safety-critical; no service or realtime entry exists |
| `agent_workflows` | MultiAgentChoreography (implied) | No service or realtime entry exists |
| `use_cases` | UseCasePage (implied) | No service or realtime entry exists |
| `ai_risk_tiering` | AIRiskTiering (implied) | No service or realtime entry exists |
| `post_market_surveillance` | PostMarket (implied) | No service or realtime entry exists |
| `genai_risks` | GenAIRisks (implied) | No service or realtime entry exists |
| `fallback_logs` | FallbackLog (implied) | No service or realtime entry exists |
| `tool_call_logs` | ToolCallMonitor (implied) | No service or realtime entry exists |
| `eval_runs` / `eval_results` | EvalResultsViewer (implied) | No service or realtime entry exists |
| `eval_techniques` | EvalTechniques (implied) | No service or realtime entry exists |
| `cost_token_usage` | CostTokenDashboard (implied) | No service or realtime entry exists |
| `trust_policies` | TrustConfig (implied) | Realtime has `guardrails` — possible alias, but TrustConfig doesn't query either |
| `model_risk_committee` | ModelRiskCommittee (implied) | Realtime has `committees` — possible alias, but page doesn't query it |
| `model_lifecycle` | ModelLifecycle (implied) | No service or realtime entry exists |
| `model_performance` | PerformanceMonitoring (implied) | Realtime has `models` — may be sufficient if page is wired to it |
| `agent_iam` | AgentIAM (implied) | Realtime has `identities` — likely the correct table; page not wired to it |
| `benchmarks` | Benchmark (implied) | Can likely reuse `model_efficiency` (registered) |

---

### Additional Wiring Notes

1. **PascalCase table name risk** — `trustTraceService` queries table `"TrustTrace"` (PascalCase). Supabase table names are case-sensitive; the realtime hook registers `trust_traces` (snake_case). This inconsistency may silently fail depending on how the Supabase project was created.

2. **`agentsService` double-try pattern** — The service attempts `Agent` first and falls back to `agents`. Neither is in the realtime list. If the Supabase table is `agents`, adding `agents` to `useRealtimeInvalidation.ts` is the only fix needed.

3. **Services exist but are not imported** — `promptService` and `aiImpactService` are fully implemented. The corresponding pages (`PromptRegistry`, `AIImpactAssessments`) import seed data instead. Both backing tables are already realtime-registered. These are the **lowest-effort pages to fully wire**.

4. **`WIRED_BY_PHASE_COMPLETE` comment mismatch** — Several MOCK-verdict pages carry a comment claiming Supabase hooks are available with mock data kept as a fallback. In every case inspected, only the seed path is executed; the hook is either not imported or not called.
