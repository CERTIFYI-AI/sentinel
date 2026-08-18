# Kill-Switch & Emergency Controls

**Routes:** `/kill-switch-events`
**Status:** Production
**Owner:** Operations · **Backing table(s):** `kill_switch_events` (org-scoped, RLS), agent control plane via `agentService.ts`

## Purpose
Emergency disablement of models, agents, prompts, policies, or entire
features with full audit trail and post-event review — the platform's
last-resort human-override mechanism.

## Why it exists
EU AI Act Art. 14(4)(e) requires the ability to intervene in or interrupt an
AI system. ISO/IEC 42001 A.9.3 mandates human oversight including override
capability. NIST AI RMF MANAGE 2.3 requires post-deployment override
mechanisms. Without a documented kill-switch, the regulator has no evidence
that human override is possible.

## How it works
1. A kill-switch event targets a specific scope (tenant, route, model, agent,
   prompt, or feature).
2. Critical/production events require dual approval before activation.
3. Activation propagates instantaneously via the control channel — the target
   entity is disabled.
4. An incident record and post-mortem task are auto-generated from the event.
5. Post-event review records the root cause, duration, and impact.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | metric row | Total events, active, resolved, avg resolution time | Read-only |
| Event list | table | Kill-switch events with scope, status, activated_by, timestamp | Read-only |
| Activate kill-switch | button + dialog | Creates a new emergency disable event | Writes event; disables target |
| Dual approval | workflow | Requires second approver for production targets | Approval gate |
| Resolve event | button | Marks event resolved with post-mortem | Updates event record |
| Target link | PillLink | Navigate to the disabled entity | → entity-specific route |
| Incident link | InterlinkChip | Navigate to auto-generated incident | → `/risk/incidents?open=<id>` |

Nulls: an unresolvable target shows "Unavailable".

## Interlinks
- **Outbound** — PillLink to the target entity (model, agent, prompt),
  InterlinkChip to `/risk/incidents?open=<id>` (auto-generated incident).
- **Inbound** — reachable from sidebar nav; agent and model detail pages
  link to their kill-switch history.

## Compliance
- **EU AI Act** — Art. 14(4)(e) (ability to intervene or interrupt): this
  module IS the intervention mechanism.
- **ISO/IEC 42001** — A.9.3 (human oversight including override).
- **NIST AI RMF** — MANAGE 2.3 (post-deployment override mechanisms).
- **DORA** — Art. 12 (ICT response and recovery).

## Operations
Empty state: an empty event log is the ideal state (no emergencies) and is
shown with a positive message. Dual approval is enforced for production
scopes. Auto-generated incidents ensure the event enters the standard
incident workflow. Writes throw on failure. Art. 12 audit logging via
`logAction`.
