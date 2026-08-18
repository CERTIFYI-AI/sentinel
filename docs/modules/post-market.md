# Post-Market Monitoring

**Routes:** `/post-market`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** `post_market_plans`, `post_market_events` (org-scoped, RLS)

## Purpose
Surveillance plans and event log for monitoring AI systems after deployment,
as required by EU AI Act Art. 72 — tracking metrics, threshold breaches,
complaints, and drift observations against each model.

## Why it exists
EU AI Act Art. 72 mandates a post-market monitoring system proportionate to
the risk level of the AI system. ISO/IEC 42001 A.9.4 requires continuous
monitoring of AI system performance. This module provides the plan structure
(what to monitor, what thresholds to set) and the event ledger (what actually
happened), with escalation to the incident management workflow.

## How it works
1. A surveillance plan is created in `post_market_plans`, keyed to a model
   (`ai_models.id`), defining metrics to monitor and threshold configurations.
2. Events are logged in `post_market_events` — breaches, complaints, drift
   observations — each linked to a plan (or standalone).
3. Critical/high events can be escalated to an incident: the escalation
   creates a real incident record via the incident service and emits
   `INCIDENT_CREATED`, triggering the mesh cascade.
4. Plan deletion keeps the ledger: `post_market_events.plan_id` is
   `ON DELETE SET NULL` — deleting a plan leaves its logged events in place.
   The delete dialog states this.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Plan list | table | Surveillance plans with model, metric count, status | Read-only from `post_market_plans` |
| Create plan | button + dialog | Creates a new surveillance plan | Writes to `post_market_plans` |
| Event log | table | Events with timestamp, severity, type, summary | Read-only from `post_market_events` |
| Log event | button + dialog | Records a surveillance event | Writes to `post_market_events` |
| Escalate to incident | button | Creates an incident from a critical event | Writes to incidents; emits `INCIDENT_CREATED` |
| Art. 73 chip | InterlinkChip | Routes to incident for serious-incident assessment | → `/risk/incidents?open=<incidentId>` |
| Model link | PillLink | Navigate to the monitored model | → `/models/inventory/:id` |

Nulls: a plan with no events shows `—` for last-event date. An empty event
log shows an honest empty state.

## Interlinks
- **Outbound** — PillLink to `/models/inventory/:id` (monitored model),
  InterlinkChip to `/risk/incidents?open=<id>` (escalated incident),
  Art. 73 chip to incident page for serious-incident assessment.
- **Inbound** — reachable from sidebar nav (Compliance & Regulatory group);
  model detail pages link here via performance/monitoring chips.

## Compliance
- **EU AI Act** — Art. 72 (post-market monitoring system): this module IS
  the post-market monitoring system. Art. 73 (serious incident reporting):
  escalation path surfaces the assessment chip.
- **ISO/IEC 42001** — A.9.4 (monitoring and measuring AI system performance):
  the surveillance plan and event ledger.
- Art. 12 audit logging: plan and event writes log to `audit_log` via
  `logAction` (module `post-market`); escalation logs an `escalate` action
  carrying the created incident uuid.

## Operations
Empty state: when no plans exist, shows an honest empty state with guidance
to create a surveillance plan. Plan deletion is soft — events survive with
null plan_id. Writes throw on failure; success toasts fire only after the
write resolves. Realtime: not realtime; staleTime-based React Query refresh.
