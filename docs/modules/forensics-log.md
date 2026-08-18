# Forensics & Incident Log

**Routes:** `/incident-log`, `/incident-workflow`
**Status:** Production
**Owner:** Risk · **Backing table(s):** `incidents`, `incident_evidence`, `incident_workflow_steps` (org-scoped, RLS)

## Purpose
Structured forensic evidence collection, chain-of-custody logging, and
incident response workflow — the investigative layer beneath incident
management.

## Why it exists
EU AI Act Art. 12 requires automatic logs retained appropriately.
ISO/IEC 27035 mandates incident management procedures. ISO/IEC 27037/27041/27042
cover digital evidence handling and investigation. An AI incident needs
more than a ticket — it needs a forensic record of what happened, in what
order, who handled the evidence, and what was concluded.

## How it works
1. Incidents are recorded in `incidents` with severity, status, timeline,
   affected models, and root-cause analysis.
2. Evidence is captured in `incident_evidence` with SHA-256 hashing at
   capture time and custody-handoff logging.
3. Workflow steps in `incident_workflow_steps` track the response process
   through configurable stages.
4. Timeline reconstruction pulls from `audit_log` and `live_traces`.
5. Escalation to regulator filings carries the incident ID forward.
6. Remediation plans are linkable from the incident detail via
   `remediation_plans.incident_id`.

**Note:** There is no separate `ForensicsLog` page component. The forensics
functionality (evidence hashing, custody log, timeline reconstruction) is
integrated into `IncidentLog.tsx` and `IncidentWorkflow.tsx`.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | metric row | Open incidents, critical, resolved, avg resolution time | Read-only from `incidents` |
| Incident list | table | Incidents with severity, status, assigned, created | Read-only |
| Create incident | button + dialog | Records a new incident | Writes to `incidents` |
| Evidence capture | dialog | Attaches evidence with SHA-256 hash | Writes to `incident_evidence` |
| Custody log | section | Chain-of-custody handoffs | Read-only from evidence records |
| Workflow stages | step tracker | Response process stages | Reads/writes `incident_workflow_steps` |
| Remediation links | InterlinkChip | Linked remediation plans with progress bars | → `/remediation-tracker?open=<id>` |
| Model link | PillLink | Navigate to affected model | → `/models/inventory/:id` |
| Filing link | InterlinkChip | Navigate to regulator filing | → `/regulator-filings?incident=<id>` |
| HITL reviews | section | Human-oversight reviews raised against this incident | → `/hitl?open=<id>` |
| Evidence vault link | InterlinkChip | Navigate to evidence vault | → `/evidence` |
| Export | button | Downloads incident report with manifest | Real file |

Nulls: unresolvable model IDs show "Unavailable". `progressPct` on linked
remediations renders `—` when null.

## Interlinks
- **Outbound** — PillLink to `/models/inventory/:id` (affected model),
  InterlinkChip to `/remediation-tracker?open=<id>` (remediation),
  InterlinkChip to `/regulator-filings` (statutory filing),
  InterlinkChip to `/hitl` (human-oversight reviews),
  InterlinkChip to `/evidence` (evidence vault).
- **Inbound** — reachable from sidebar nav (Risk & Oversight group);
  post-market escalation creates incidents here; kill-switch events generate
  incidents; governance mesh findings link here.

## Compliance
- **EU AI Act** — Art. 12 (automatic logs): forensic evidence chain.
  Art. 73 (serious incident reporting): escalation to filing.
- **ISO/IEC 27035** — incident management lifecycle.
- **ISO/IEC 27037/27041/27042** — digital evidence handling and investigation.
- **NIST SP 800-86** — forensic techniques.
- Art. 12 audit logging via `logAction`.

## Operations
Empty state: when no incidents exist, shows an honest empty state.
Evidence hashing (SHA-256) on capture provides tamper evidence. Writes
throw on failure. Realtime: not realtime; staleTime-based React Query
refresh.
