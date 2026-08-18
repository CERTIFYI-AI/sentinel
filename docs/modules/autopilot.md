# Compliance Autopilot

**Routes:** `/autopilot`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** `agent_registry`, `agent_executions` (org-scoped, RLS)

## Purpose
A compliance-focused lens over the governance agent fleet and its execution
ledger, showing which agents ran, what they did, and whether they succeeded.

## Why it exists
EU AI Act Art. 14 requires human oversight of automated systems. ISO/IEC 42001
A.9.2 mandates operational controls over autonomous AI. Compliance Autopilot
gives the compliance officer a single view of every governance agent that acts on
their behalf, with an audit trail of every execution — without needing to
understand the full agent platform.

## How it works
The page reads from the same `agent_registry` and `agent_executions` tables that
power the Governance Mesh, but filters to compliance-relevant agents (by
category and target modules). No separate data is stored — this is a view, not a
second id-space.

1. KPI tiles summarise the fleet: agent count, actions in the last 24 h,
   success/failure counts, and time since last action.
2. Agent roster cards show each agent's type, run mode, target modules, owner,
   and last-run status.
3. An action log table lists every execution with timestamp, agent, event,
   status, and summary.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | metric row | Compliance agents, actions 24 h, succeeded, failed, last action | Read-only from `agent_executions` |
| Agent roster | card grid | Shows each agent with type, run mode, targets, owner | Read-only from `agent_registry` |
| Action log | table | Execution history with time/agent/event/status/summary | Read-only from `agent_executions` |
| Full fleet link | InterlinkChip | Navigates to Governance Mesh | → `/governance-mesh` |
| Automation rules link | InterlinkChip | Navigates to Automation Studio | → `/automation-studio` |

Nulls: empty execution history renders an honest empty state. Agent counts show
`—` when no compliance agents are registered.

## Interlinks
- **Outbound** — InterlinkChip to `/governance-mesh` (full fleet), InterlinkChip
  to `/automation-studio` (rules).
- **Inbound** — reachable from sidebar nav (Compliance & Regulatory group).

## Compliance
- **EU AI Act** — Art. 14 (human oversight): provides visibility over autonomous
  agent actions so a human can review and intervene.
- **ISO/IEC 42001** — A.9.2 (operational controls over AI capability): the
  execution ledger is the evidence of what agents did and whether it succeeded.

## Operations
Empty state: when no compliance agents exist, shows an honest empty state with
a link to the Governance Mesh to register agents. Writes: read-only page —
no mutations. Realtime: not realtime; staleTime-based React Query refresh.
