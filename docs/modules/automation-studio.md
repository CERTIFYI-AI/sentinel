# Automation Studio

**Routes:** `/automation-studio`
**Status:** Production
**Owner:** Operations · **Backing table(s):** `automation_rules`, `automation_runs` (org-scoped, RLS)

## Purpose
Governance automation rules: a trigger (incident created, model drift,
approval required, schedule) plus an ordered action list (create HITL review,
hold deployments, create approval, notify). Rules are definitions; every run
is a recorded fact.

## Why it exists
ISO/IEC 42001 8.2 requires operational planning and control. EU AI Act
Art. 14 mandates human oversight gates in automated flows. Manual governance
tasks (create a review when drift exceeds threshold, notify when an incident
is critical) should be codified as auditable rules, not ad-hoc and
undocumented.

## How it works
1. Rules are stored in `automation_rules` with trigger type, conditions,
   and an ordered action list.
2. Each rule execution creates a row in `automation_runs` — the only source
   of execution claims.
3. "Validate" checks the rule's configuration and records a
   `validated`/`failed` run — nothing is executed and no synthetic outcome
   is invented.
4. Multi-agent orchestration lives in Choreography (`/multi-agent`) —
   Automation Studio links there rather than duplicating it.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | StatCardRow | Total rules, active, triggered today, avg response time | Read-only from `automation_rules` + `automation_runs` |
| Rule list | filterable list | Rules with name, trigger, status, last run | Read-only |
| Create rule | button + dialog | Creates a new automation rule | Writes to `automation_rules` |
| Edit rule | detail drawer | Modifies rule builder (trigger + actions) | Updates `automation_rules` |
| Delete rule | button | Removes a rule | Deletes from `automation_rules` |
| Validate | button | Tests rule configuration | Writes a `validated`/`failed` run to `automation_runs` |
| Run history tab | table | Execution records with timestamp, status, summary | Read-only from `automation_runs` |
| Choreography link | link | Cross-link to multi-agent orchestration | → `/multi-agent` |

Nulls: a rule with no runs shows `—` for last-run date. An empty rule list
shows an honest empty state.

## Interlinks
- **Outbound** — link to `/multi-agent` (agent choreography).
- **Inbound** — reachable from sidebar nav (Agent Control group);
  Compliance Autopilot links here for rule configuration.

## Compliance
- **ISO/IEC 42001** — 8.2 (operational planning and control).
- **EU AI Act** — Art. 14 (human oversight gates in automated flows).

## Operations
Honesty contract: "Validate" checks configuration only — no execution, no
synthetic outcomes. Run history is append-only evidence of what rules
actually did. Writes throw on failure; success toasts fire only after the
write resolves. Realtime: not realtime; staleTime-based React Query refresh.
