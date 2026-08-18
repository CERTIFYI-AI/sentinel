# Trust Engine (Runtime Trust)

**Routes:** `/trust-engine`, `/trust-engine/guardrails`, `/trust-engine/traces`, `/trust-engine/costs`, `/trust-engine/fallback`, `/trust-engine/tools`, `/trust-engine/config`
**Status:** Production (dashboard views over real tables) — runtime data-plane gateway is hosted separately (`sentinel.proxy:app`); span-level trace instrumentation is **not yet ingested** and is labelled as such in the UI.
**Owner:** Platform / Trust · **Backing table(s):** `trust_policies`, `live_traces`, `guardrail_events`, `guardrail_rules`, `cost_token_usage`, `fallback_logs`, `tool_call_logs`, `model_trust_configs`, `trust_config` (all org-scoped, RLS; scoping column filled by the `current_user_org_id()` DB default)

## Purpose
The Trust Engine is Sentinel's runtime trust layer: the inline enforcement point that sits between an application's LLM calls and the model provider, plus the dashboard that visualises what that enforcement did. It exists in two halves that share one id-space — a **data-plane gateway** that rate-limits, sanitizes, circuit-breaks, proxies and audits every inference in real time, and a set of **dashboard screens** that render the tables the gateway (and its batch/telemetry feeds) write: trust policies, live inference traces, guardrail events, cost and token usage, fallback failovers, agent tool calls, and the configuration that governs all of it.

## Why it exists
This is the product's core value proposition. A governance platform that only documents models after the fact cannot *stop* a bad inference; the Trust Engine is the control that acts while the request is in flight. The runtime obligations it discharges:

- **EU AI Act Art. 9 (risk management)** — the circuit breaker and trust-scoring cascade keep a failing or unsafe model from serving traffic unchecked.
- **EU AI Act Art. 10 (data governance)** — the prompt sanitizer strips PII and detects prompt injection *before* anything is logged or sent to the provider (data minimisation, Art. 10.3).
- **EU AI Act Art. 12 (record-keeping)** — every request produces an append-only, SHA-256 hash-chained audit entry, so an auditor can walk the chain from genesis and prove no record was altered.
- **EU AI Act Art. 14 (human oversight)** — guardrail events can be acknowledged by a named user and escalated into a real incident; the `route_hitl` policy action routes to human review.
- **EU AI Act Art. 15 (accuracy/robustness)** — fallback failovers keep the service answering when a primary model times out, rate-limits or errors, and the fact is recorded rather than hidden.

If the Trust Engine is absent, the platform can describe risk but cannot enforce against it: injection reaches the provider, spend is unbounded, a provider outage is a hard failure, and there is no tamper-evident record of what the model was asked or answered. Operationally that is an outage and a data-leak surface; for an auditor it is a missing Art. 12 record and an unmet Art. 9 control.

## How it works

### Runtime data-plane — `POST /v1/chat/completions` (`sentinel/proxy.py`)
The gateway is an always-on FastAPI process (it cannot be serverless — it holds a warm Redis pool, runs a Python policy stack, streams responses, and calls providers; see [`docs/architecture/deployment-topology.md`](../architecture/deployment-topology.md)). Each inference walks a fixed pipeline:

1. **Tenant resolve** — the Bearer JWT is decoded and verified against `SECRET_KEY`; the `tenant_id` claim loads a `TenantConfig` from the tenants store. Any failure is a 401.
2. **Rate limit** — a 60-second sliding window in Redis (`sentinel:ratelimit:<tenant>`, sorted-set + `zcard`), default 1000 req/min. Over the limit is a 429. If Redis is unreachable the gateway **fails open** (allow-all) rather than dropping traffic.
3. **Sanitize** — `sanitizer.sanitize(prompt, tenant)` strips PII and runs embedding-based prompt-injection detection against seeded injection vectors. If it blocks, the request returns HTTP 400 `INJECTION_DETECTED` and a blocked audit entry is written (trust_score 0, intervention BLOCKED) *before* returning. Otherwise the last user message is replaced with the sanitized text — so raw PII never reaches the provider or the logs.
4. **Circuit breaker / provider routing** — `circuit_breaker.call(...)` wraps the provider call (`litellm.acompletion` against `tenant.primary_model`, so OpenAI / Anthropic / local models share one code path). A provider exception returns HTTP 502 and writes an error audit entry.
5. **Audit** — a hash-chained `AuditEntryInput` (prompt hash, response hash, trust_score, intervention_level, cost_usd, latency_ms) is appended via `auditor.log` as a background task. The chain is append-only by design; this is the Art. 12 / ISO 9.1 record.
6. **Compliance evaluation** — `ComplianceEngine.evaluate(...)` runs against the audit entry as a background task.
7. **Metrics + telemetry** — Prometheus counters increment, and a best-effort background task writes per-inference telemetry to `model_performance_metrics` (feeds the Model Detail "Performance" tab). Telemetry failures are swallowed so they can never affect request handling.

Prompt and response are stored **only as SHA-256 digests**, never plaintext.

### Dashboard control-plane
The seven screens are React Query views over the real org-scoped tables, following the `modelService` conventions: direct Supabase calls, camelCase↔snake_case mapping, **reads and writes throw on failure** so the UI renders a real error state and a success toast fires only after the write resolves. Models, policies and agents are keyed by uuid and resolved to display names at render time (`Unavailable` when a name cannot be resolved, never a raw uuid). The Live Traces screen additionally opens a Supabase Realtime INSERT subscription and shows a "Live"/"Not connected" badge reflecting the *actual* channel state.

Two things are honestly labelled as gaps rather than faked: **span-level trace instrumentation is not yet ingested** (the trace detail sheet says so — traces carry aggregate metrics only), and **HITL review escalation from a failed fallback** is disabled with a tooltip explaining it is not wired to a backend yet. Guardrail-event escalation, by contrast, is real: it creates an `incidents` row.

## Features — full breakdown

### Runtime Trust — `/trust-engine` (`TrustEngineDashboard.tsx`)
The overview. KPIs and the 14-day trend are **derived from `live_traces` outcomes** (not fabricated); policies are the real `trust_policies` rows.

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Trust Index / Traces (14d) / Violations (7d) / Active Policies | KPI cards | Computed from `live_traces` over 14d + policy rows | Trust Index is `null` → `—` when there are no traces (never `0`) |
| Trace Outcomes — Last 14 Days | stacked bar chart | Success/blocked/error per day, zero-filled buckets | Honest empty state when `total14d === 0` |
| Recent Blocked & Error Traces | list | Newest ≤8 incidents, model + policy resolved | "View all inference traces" → `/trust-engine/traces` |
| Create Policy | button → dialog | New `trust_policies` row (name, type, action, severity, threshold, framework ref, linked models) | Insert; throws on failure; `logAction('create')`; ref auto-assigned `TP-###` |
| Edit / Clone / Activate / Deactivate / Delete | row actions | Mutate the policy row | Writes throw; clone lands **inactive**; delete blocked (friendly message) if referenced by traces/events — deactivate instead |
| Alert Config | button → dialog | Trust-index alert threshold + channels (email/slack/pagerduty) | Persists to the `trust_config` doc (`alertNotifications`); throws on failure |
| Search / Status / Type filters | filter bar | Narrow the policy table | Client-side over fetched rows |
| `?model=<uuid>` chip | deep-link | Scopes KPIs, trend and policies to one model | Dismissible chip; label resolves to model name or "Unavailable" |

Policy table columns: Ref (`policy_ref`), Policy (`name` + `framework_ref`), Type, Action, Severity, Linked Models (uuid pills → model detail), Triggers (7d) `triggers_7d`, Block Rate `block_rate`%, Status, Actions.

### Active Guardrails — `/trust-engine/guardrails` (`GuardrailActivity.tsx`)
Three tabs over `guardrail_events` and `guardrail_rules`.

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Events table | table | Real `guardrail_events`, policy/model resolved by uuid | Row → detail sheet with the evaluated policy's `condition_json` |
| Ack | dialog | Records `ack_by` / `ack_at` / `ack_reason` against the signed-in user | Write throws; requires a signed-in user; ack_by resolved to a name |
| Escalate | dialog | Creates a **real** incident in Incident Response, linked to the event | `guardrailService` → `incidents` row; toast links to `/risk/incidents`; throws if the write doesn't persist |
| Visual Rule Builder | tab / form | CRUD over `guardrail_rules` (name, type, action, priority, condition JSON); 5 prefill templates | Create/enable-disable/delete are real writes that throw; templates create nothing by themselves |
| Linked Models | tab | Distinct models referenced by loaded events | "Filter events" sets `?model=<uuid>` |
| Deep links | chips | `?model=<uuid>` and `?policy=<uuid>` | Both dismissible; labels resolve to names or "Unavailable" |

### Live Inference Traces — `/trust-engine/traces` (`LiveTraceFeed.tsx`)
Real `live_traces`, streamed by a Supabase Realtime INSERT subscription.

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Live / Not connected badge | indicator | Reflects the real channel state — never claims "Live" without an open channel | — |
| 24h KPIs | cards | Traces / Blocked / Error rate / Avg latency over 24h | `null` → `—` (never NaN or 0) |
| Status / Model / Period filters | filter bar | Server-side status/model/date; `?model=<uuid>` deep-link wins | Fetches most-recent 100 |
| Export CSV | button | Exports the filtered page | Real `text/csv` blob download |
| Trace row → detail sheet | table | Model, agent, action, latency, tokens in/out, cost, evaluated policy | Cost `null` → `—`; policy → `/trust-engine/guardrails?policy=<uuid>` |
| Span waterfall panel | placeholder | States span-level instrumentation is **not yet ingested** | No fabricated spans or I/O payloads |

### Trust Costs & Tokens — `/trust-engine/costs` (`CostTokenDashboard.tsx`)
Aggregates over `cost_token_usage` (**daily batch data**, one row per model per day — not per-request).

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Range 7d/14d/30d | select | Window for all aggregates | — |
| Total Cost / Tokens / Active Models / Cost per 1K | KPIs | Computed; WoW deltas only when two full weeks exist | Cost per 1K `null` → `—` |
| Daily Cost / Daily Tokens / Cost by Model / Tokens by Model | charts | All computed from fetched rows | Bars click through to `/models/inventory/:id` |
| Set Model Budget | dialog | Persists `budget_limit_usd` on the model's ledger rows | Throwing write; empty clears the budget |
| Budget callout | derived banner | Shown when latest-day spend ≥80% of budget | Computed, not asserted |
| Export CSV | button | Filtered usage ledger | Real CSV download |

### Fallback Failovers — `/trust-engine/fallback` (`FallbackLog.tsx`)
Real `fallback_logs` (primary → fallback routing).

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPIs | cards | Total / Success rate / Failed / Avg latency | `null` → `—` when no data |
| Elevated-activity callout | derived banner | Only when last-24h ≥2× daily avg **and** ≥3 events | Honest wording, real computation |
| Trigger / Outcome filters + search | filter bar | Narrow the table | Client-side |
| Primary/Fallback model pills | links | Resolve uuid → model detail; snapshot text is fallback | "Unavailable" when unresolved |
| Trace ref copy | button | Copies `trace_ref` to look up on Live Traces | Clipboard |
| Detail sheet → Create HITL Review | button | **Disabled** with a tooltip — not wired to a backend, so not simulated | No write |
| Export CSV | button | Filtered failovers | Real CSV download |

### Tool Monitor — `/trust-engine/tools` (`ToolCallMonitor.tsx`)
Real `tool_call_logs` (agent tool invocations).

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPIs | cards | Total / Success rate / Errors / Blocked | `null` → `—` |
| Blocked-calls callout | derived banner | When blocked calls exist in last 7d; links to Agent IAM | Computed |
| Tool Calls tab | table | Agent, tool, args preview, status, latency, model, trace | Row → detail sheet (args/result JSON) |
| Escalate | button | Creates a **real** incident via `incidentService` for blocked/error calls | Write throws; invalidates incident queries; toast → `/risk/incidents` |
| Observed Usage tab | derived table | Agent × tool status mix from the logs; **read-only observation, not a policy** | Directs permission management to Agent IAM |
| Export CSV | button | Filtered calls | Real CSV download |

### Trust Configuration — `/trust-engine/config` (`TrustConfig.tsx`)
Two real backends, four tabs. Global sections persist to the single `trust_config` `default` doc; Per-Model edits the `model_trust_configs` table.

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Global Settings tab | forms | PII, toxicity, hallucination, cost limits, default guardrails, fallback chains (registry-keyed) | Saved to `trust_config` doc; save throws; dirty state kept on failure; `logAction` recorded |
| Per-Model Config tab | table + dialog | Real `model_trust_configs` CRUD, keyed to `ai_models` | Throwing writes; linked policies shown; fallback model resolves to a name |
| Thresholds tab | tables | Policy thresholds + alert thresholds | Persist in the config doc on Save |
| Integrations tab | forms | Slack/Jira/PagerDuty non-secret config | **Secrets never stored here** — directed to the Keys Vault; Test Connection disabled/labelled |
| Save / Reset | buttons | Commit or revert the whole doc | Success toast only after upsert resolves; recorded in the Audit Log |

> **Simulated / preset labelling:** the Global Settings, Thresholds and Alert-threshold defaults are **configuration presets for a fresh org** (starting values you edit and save), not measured metrics. They are not presented as telemetry. All measured numbers on the other six screens derive from queries; `cost_token_usage` is explicitly a **daily batch ledger** ("Data through …" badge), not per-request live data.

## Fields

`trust_policies` (org-scoped, RLS):

| Field | Type | Req. | Notes |
|---|---|---|---|
| id | uuid | pk | the only key |
| org_id | uuid | auto | DB default `current_user_org_id()` |
| policy_ref | text | — | display ref (`POL-…` seeds, `TP-###` UI-created); never a key |
| name / type / action / severity | text | — | action ∈ block/warn/redact/route_hitl/log |
| condition_json | jsonb | — | policy condition; `null` → not shown |
| threshold | numeric | — | `null` → `—` |
| is_active | boolean | — | active policies evaluate live traffic |
| linked_models | text[] | — | canonical `ai_models.id` uuids; resolved at render; "Unavailable" if unresolved |
| framework_ref | text | — | e.g. "GDPR Art. 5"; `null` → `—` |
| triggers_7d / block_rate / avg_latency_ms | numeric | — | telemetry aggregates; `avg_latency_ms` null → `—` |

`live_traces`: `id` uuid pk, `org_id` uuid (default), `trace_ref` text, `model_id` uuid → `ai_models.id`, `action`, `status` (success/blocked/error), `tokens_in`/`tokens_out`/`latency_ms`/`cost_usd` numeric, `policy_id` text, `created_at`.
`guardrail_events`: `id` uuid pk, `org_id` uuid (default), `policy_id` text, `model_id` uuid → `ai_models.id`, `action`, `severity`, `latency_ms`, `status` (open/acknowledged/resolved), `ack_by`/`ack_at`/`ack_reason`, `created_at`.
`guardrail_rules`: `id` **text** pk (`grl-…` refs), `tenant_id` text default `'default'`, `name`, `rule_type`, `model_id` text, `pattern`, `action`, `severity`, `enabled` boolean, `trigger_count` int, timestamps.
`cost_token_usage`: `id` uuid pk, `org_id` uuid (default), `usage_date` date (default `current_date`), `model_id` uuid → `ai_models.id`, `model_name` text (display snapshot), `prompt_tokens`/`completion_tokens`/`total_tokens`/`cost_usd`/`request_count`/`budget_limit_usd` numeric.
`fallback_logs`: `id` uuid pk, `org_id` uuid (default), `primary_model_id`/`fallback_model_id` uuid → `ai_models.id`, `trace_id` uuid → `live_traces.id`, `primary_model`/`fallback_model` text (display), `trigger_reason` (timeout/rate_limit/error/quality), `request_id`, `latency_ms`, `succeeded` boolean, `error_message`, `occurred_at` (default `now()`).
`tool_call_logs`: `id` uuid pk, `org_id` uuid (default), `model_id` uuid → `ai_models.id`, `trace_id` uuid → `live_traces.id`, `agent_id`/`agent_name` text, `tool_name`, `invocation_id`, `arguments`/`result` jsonb, `status`, `latency_ms`, `error_message`, `invoked_at`.
`model_trust_configs` (org-scoped, RLS; runtime columns added by `20260814000010_trust_runtime_foundation.sql`): `id` uuid pk, `org_id` uuid (default), `model_id` → `ai_models.id`, `toxicity_threshold`, `hallucination_threshold`, `pii_detection_enabled`, `jailbreak_detection`, `output_filtering`, `cost_alert_usd` (null → `—`), `token_limit_per_req`, `rate_limit_rpm`, `fallback_model_id` uuid → `ai_models.id`, `blocked_topics`/`allowed_topics` text[].
`trust_config`: single `default` doc (`id`, `org_id`, `doc` jsonb) holding global settings, guardrails, thresholds, alert thresholds, fallback chains, integrations and `alertNotifications`.

> Schema note: `live_traces.policy_id` and `guardrail_events.policy_id` are **text**, not uuid FKs — the services embed `trust_policies` via the PostgREST relationship at read time. This is worth flagging to an auditor as a place where the one-id-space discipline is looser than the model FKs (which are true uuid references to `ai_models.id`).

## Interlinks
Every relation is keyed by `ai_models.id` (uuid) and resolved to a name at render.

**Outbound**
- Every screen → **Model registry** (`/models/inventory/:id`) via model uuid pills.
- Live Traces → **Guardrails** (`/trust-engine/guardrails?policy=<uuid>`) for the evaluated policy.
- Guardrails → **Incident Response** (`incidents` row created on escalate) and → Live Traces (`/trust-engine/traces?model=<uuid>`).
- Tool Monitor → **Incident Response** (`incidents` on escalate) and → **Agent IAM** (`/agent-iam`).
- Fallback Failovers → Live Traces by `trace_id` / `trace_ref`.
- Runtime gateway → `model_performance_metrics` (per-inference telemetry) → **Model Detail → Performance** tab.
- Config → **Keys Vault** (`/security/keys`) for secrets and **Audit Log** (`/audit-trail`) for every save.

**Inbound**
- **Model Detail** deep-links into these screens with `?model=<uuid>` (traces, guardrails, costs, fallback, tools, policies), each rendering a dismissible filter chip.
- `trust_policies` are referenced by `live_traces.policy_id` and `guardrail_events.policy_id`; a policy referenced by recorded traces/events **cannot be deleted** (deactivate instead) — surfaced as a friendly service error.
- `model_trust_configs` rows list the `trust_policies` linked to the same model (`linked_models` contains the model id).

*Interlink proof:* the `?model=<uuid>` chip resolves to a name or renders "Unavailable" (never a raw uuid); the model-FK relations point at `ai_models.id`, so a `total == resolves` check runs over the resolved-name join. The demo seed (`20260814000011_trust_runtime_seeds.sql`) keys every row to real `ai_models` uuids resolved by name at seed time.

## Compliance

**The audit found this module "mapped loosely," and that is accurate.** Neither [`docs/compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md) nor [`docs/compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md) contains a row naming the Trust Engine / Runtime Trust module or its tables. What the mapping tables cite are the **runtime gateway's layers** described generically, not the dashboard screens:

- **EU AI Act** — Art. 9 "Trust score + circuit breaker", Art. 10 "PII sanitizer + verifier", Art. 12 "Immutable audit log", Art. 14 "HITL queue + review UI", Art. 15 "Fact-checker + NLI verifier", Art. 62 "Continuous audit logging" — all marked *Implemented*, but attributed to `sentinel/proxy.py` layers, with no link back to `/trust-engine/*` or to `live_traces` / `guardrail_events` / `trust_policies`.
- **ISO/IEC 42001** — 6.1.2 "Trust score pipeline", 6.1.3 "Circuit breaker cascade", 8.4 "Proxy middleware", 9.1 "Audit hash chain", A.8.3 "PII sanitizer", A.8.4 "Immutable audit chain" — again the gateway layers, not the module.
- **NIST AI RMF** — the previous thin doc asserted MEASURE 3.1–3.3; **no NIST mapping document exists in `docs/compliance/`**, so that citation is unbacked and should be treated as a claim, not a mapping.

**Real, defensible coverage today:** the runtime pipeline genuinely implements Art. 10 (sanitize before log/provider), Art. 12 / ISO 9.1 (SHA-256 hash-chained append-only audit via `auditor.log`), Art. 9 (rate-limit + circuit breaker), and the dashboard genuinely implements the Art. 14 human-oversight path (guardrail ack by a named user; escalation to a real `incidents` record; the `route_hitl` policy action). Config saves and policy/rule CRUD write to the platform Audit Log via `logAction` (Art. 12 attributability). Secrets are stored as digests (Art. 15 / GDPR Art. 32), never plaintext.

**Gap to close (recommended):** add explicit rows to both mapping documents that name this module and its tables — e.g. Art. 9 → `trust_policies` + circuit breaker; Art. 12 → `live_traces` + hash chain; Art. 14 → `guardrail_events` ack/escalate; ISO A.6.2.6 (operation monitoring) → the Live Traces / Cost / Fallback screens — and either add a NIST AI RMF mapping doc or drop the MEASURE 3.x claim. Until then the module's compliance posture is **implemented in code but under-documented in the mapping** — mark it *Partial* on the mapping line, not *Implemented*.

## Operations
- **Seeding / backfill.** `20260814000011_trust_runtime_seeds.sql` provides coherent demo rows for the demo org (`00000000-…-0001`), all keyed to real `ai_models` uuids, idempotent. The `agents` table is empty (Agent Control not seeded), so `agent_id` is left null and only `agent_name` is populated on tool/trace/event rows.
- **Empty states.** Every screen has an honest empty state (no traces, no events, no usage, no policies, no fallbacks, no tool calls). Trust Index and all rate/latency KPIs render `—` (not `0`) when there is nothing to measure.
- **Realtime.** Only Live Traces subscribes (Supabase Realtime INSERT); the badge reflects the true channel state. The other screens are React Query reads that invalidate on mutation.
- **Common errors (writes throw).** Deleting a referenced policy → "This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead." Ack without a session → "Sign in required to acknowledge events." Invalid rule condition → "Condition is not valid JSON: …". Provider failure at the gateway → HTTP 502; injection → HTTP 400 `INJECTION_DETECTED`; over rate limit → HTTP 429.
- **Fail-open rate limit.** If Redis is down the gateway allows all traffic (availability over throttling) — a deliberate posture worth noting for a threat model.
- **Retention.** `live_traces` shows most-recent 100 per query; `cost_token_usage` is a daily ledger; audit entries are append-only and never deleted.
- **Known debt.** Span-level trace instrumentation is not yet ingested (labelled in the trace sheet). Fallback → HITL review is disabled pending a backend. `live_traces.policy_id` / `guardrail_events.policy_id` are text, not uuid FKs. Three partially-overlapping Python surfaces (`proxy:app`, `main:app`, the connect edge function) can drift — **TD-019** in [`docs/reference/technical-debt.md`](../reference/technical-debt.md). The compliance-mapping gap above should be recorded there with an owner.
