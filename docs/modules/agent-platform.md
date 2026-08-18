# Agent Platform

**Routes:** `/agents`, `/agent-registry`, `/agent-discovery`, `/agent-iam`, `/multi-agent-choreography`, `/governance-mesh`
**Status:** Production
**Owner:** Agent Control · **Backing table(s):** `agent_gov_registry`, `agent_executions`, `agent_workflows` (org-scoped, RLS)

## Purpose
Govern autonomous and human-in-the-loop agents: registration, capability
declaration, identity and entitlements (non-human identity), orchestration,
and safety rails. The Governance Mesh is the fleet-wide view of the 10
built-in governance sentinels.

## Why it exists
OWASP LLM Top 10 (Agentic) identifies excessive agency and tool misuse.
EU AI Act Art. 14 and 15 require oversight and robustness. ISO/IEC 42001
A.9 covers use of AI systems and oversight. Autonomous agents that can
create records, pause models, or file reports need the same governance as
human operators — registration, capability scoping, and kill-switch binding.

## How it works
1. Agents are registered in `agent_gov_registry` with identity (workload ID),
   declared tools, permissions (least-privilege), policy set, HITL
   checkpoints, kill-switch binding, owner, and lifecycle state.
2. The Governance Mesh renders the 10 built-in sentinels (ComplianceImpact,
   DriftWatcher, AutoPause, etc.) with their execution history and event
   stream.
3. Client-side sweep runs all sentinels that have browser-executable logic;
   server-side sweep triggers the Python evaluator.
4. Agent Inspector panel shows per-sentinel execution detail, findings, and
   links to affected entities.
5. Choreography handles deterministic routing of multi-agent workflows with
   observable span-level traces.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | StatCardRow (5) | Agent count, active, paused, executions today, findings | Read-only |
| Sentinel fleet | card grid | Each governance sentinel with status, last run, finding count | Read-only |
| Run sweep (client) | button | Executes browser-side sentinels | Writes executions + events |
| Run sweep (server) | button | Triggers Python evaluator | Writes executions + events |
| Toggle sentinel | button | Pause/resume a sentinel | Updates `agent_gov_registry` |
| Agent Inspector | expandable panel | Execution detail, findings, entity links | Read-only |
| Live Event Stream | panel | Real-time governance events | Read-only from events |
| Execution Ledger | panel | Execution history with status and summary | Read-only from `agent_executions` |
| Entity links | InterlinkChip | Navigate to affected models, incidents, datasets | → entity detail pages |

Nulls: a sentinel with no executions shows `—` for last run. An empty fleet
shows a message directing to the mesh migration.

## Interlinks
- **Outbound** — InterlinkChip to `/models/inventory/:id`,
  `/risk/incidents?open=<id>`, `/datasets/:id`, `/agents/:id` via
  `findingLink()`.
- **Inbound** — reachable from sidebar nav (Agent Control group);
  Compliance Autopilot links here; kill-switch events reference agents.

## Compliance
- **OWASP LLM Top 10 (Agentic)** — excessive agency, tool misuse.
- **EU AI Act** — Art. 14 (oversight), Art. 15 (robustness).
- **ISO/IEC 42001** — A.9 (use of AI system and oversight).
- **NIST AI RMF** — MANAGE 2.1 (risk response tracked post-deployment).
- **NIST SP 800-207** — zero-trust applied to workload identities.

## Operations
Fleet seeding: the 10-sentinel fleet is seeded by migration
`20260816_agentic_mesh_fleet`. Empty state directs user to apply the
migration. Sweep executions write to `agent_executions` and emit governance
events to the event bus. Writes throw on failure. Realtime: event stream
uses live query refresh.
