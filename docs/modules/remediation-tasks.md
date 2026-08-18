# Remediation & Tasks

**Routes:** `/remediation-tracker`, `/remediation`, `/tasks`
**Status:** Production
**Owner:** Risk · **Backing table(s):** `remediation_plans` (org-scoped, RLS), `tasks` (org-scoped, RLS)

## Purpose
Track corrective and preventive actions (CAPA) linked to gaps, findings,
incidents, and exceptions. Enforce SLA and evidence-of-closure with milestone
tracking and Gantt visualisation.

## Why it exists
ISO/IEC 27001:2022 10.1–10.2 requires nonconformity and corrective action.
SOC 2 CC4.2 mandates remediation of deficiencies. NIST AI RMF MANAGE 2, 4
covers risk treatment and continual improvement. Gaps and findings are
worthless without tracked remediation — this module closes the loop from
finding to fix.

## How it works
1. Plans are stored in `remediation_plans` with progress tracking
   (`progress_pct`), milestones (jsonb), owner, priority, and linked
   entities.
2. Lifecycle: Open → Owner → Plan → Execute → Evidence attached →
   Independent verification → Close.
3. Overdue items escalate and degrade Trust Score.
4. Gantt chart and list views provide two perspectives on the same data.
5. Deep-link support: `?open=<id>` opens a specific plan.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | StatCardRow (4) | Open plans, in-progress, overdue, completed | Read-only from `remediation_plans` |
| Gantt view | chart | Timeline visualisation with milestones | Read-only |
| List view | table | Plans with ref, title, status, progress, owner, due date | Read-only |
| Create plan | dialog | Creates a new remediation plan with milestones | Writes to `remediation_plans` |
| Edit plan | dialog | Updates plan details and milestones | Updates `remediation_plans` |
| Delete plan | ConfirmDialog | Removes a plan | Deletes from `remediation_plans` |
| Detail Sheet | panel | Full plan detail with milestone progress | Read/write |
| Incident link | InterlinkChip | Navigate to linked incident | → `/risk/incidents?open=<id>` |
| Risk link | InterlinkChip | Navigate to linked risk | → `/risks?open=<id>` |
| Model link | InterlinkChip | Navigate to linked model | → `/models/inventory/:id` |
| Audit link | InterlinkChip | Navigate to linked audit finding | → `/audits?open=<id>` |
| Control testing link | InterlinkChip | Navigate to control testing | → `/control-testing` |

Nulls: `progress_pct` renders `—` when null. An unresolvable entity ID
shows "Unavailable". An empty plan list shows an honest empty state.

## Interlinks
- **Outbound** — InterlinkChip to `/risk/incidents?open=<id>`,
  `/risks?open=<id>`, `/models/inventory/:id`, `/audits?open=<id>`,
  `/control-testing`.
- **Inbound** — reachable from sidebar nav (Risk & Oversight group);
  incident pages, gap analysis, and audit findings link here via
  `?open=<id>`.

## Compliance
- **ISO/IEC 27001:2022** — 10.1–10.2 (nonconformity and corrective action).
- **ISO 9001** — 10 (improvement).
- **SOC 2** — CC4.2 (remediation of deficiencies).
- **NIST AI RMF** — MANAGE 2, 4 (risk treatment and continual improvement).

## Operations
Empty state: when no plans exist, shows an honest empty state. Full CRUD
via `useRemediations` — writes throw on failure. `incident_id` →
`incidents.id`, `risk_id` → `risks.id`, `linked_model_ids` → models.
Realtime: not realtime; staleTime-based React Query refresh.
