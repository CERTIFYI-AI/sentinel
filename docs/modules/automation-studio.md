# Automation Studio

**Route:** `/automation-studio` · **Service:** `oversightService.ts` · **Tables:** `public.automation_rules`, `public.automation_runs`

## Purpose
Governance automation rules: a trigger (incident created, model drift, approval required, schedule) plus an ordered action list (create HITL review, hold deployments, create approval, notify). Rules are definitions; every run is a recorded fact.

## Honesty contract
- "Validate" checks the rule's configuration and records a `validated`/`failed` run — nothing is executed and no synthetic outcome is invented (the previous Math.random test engine is gone).
- Run history (`automation_runs`) is the only source of execution claims.
- Multi-agent orchestration lives in Choreography (`/multi-agent`, `agent_workflows`) — Automation Studio links there rather than duplicating it.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 42001 8.2 | Operational planning and control |
| EU AI Act Art. 14 | Human oversight gates in automated flows |
