# Approval Workflows

**Route:** `/workflows` (supports `?open=<approval-id>` deep links) · **Service:** `oversightService.ts` · **Hooks:** `useApprovalWorkflows` / `useApprovals` (`hooks/useRiskIncidents.ts`)

## Purpose
Configurable multi-stage approvals for high-impact actions: model deployment, exceptions, incident reports, policy changes.

## Standards Alignment
| Control | Requirement |
|---|---|
| SOC 2 CC5.2, CC8.1 | Policy and change management |
| ISO/IEC 27001:2022 A.8.32 | Change management |
| NIST SP 800-53 CM-3 | Configuration change control |
| ISO/IEC 42001 A.6.2.7 | Deployment |

## Features (implemented)
- **Multi-step decisions (implemented 2026-08):** `oversightService.decideApproval`
  advances `step_index` through the bound workflow's `steps`; each decision is
  appended to the per-step `approvals.decisions` ledger (`{step, name, approver,
  decision, at}`). The request reaches `approved` only after the final step; a
  rejection at any step is terminal. Workflow-less requests decide in one step.
- **Due dates / SLA (implemented 2026-08):** `approvals.due_at` is set on create
  from the chosen workflow's first step `sla_hours`, and re-armed for the next
  step on each non-final approval. The UI shows a due badge that turns red
  (overdue) once `due_at` passes; the CISO Dashboard counts overdue approvals.
- **Exception sync:** a final decision on an `exception` entity updates the
  exception row's status and `approval_chain`, so the two surfaces never disagree.
- **Escalation config** (`escalation_hours`, `notify_on_escalation`) is stored on
  the definition and displayed; there is no background escalation job yet.
- **MFA — configured, not enforced:** `requires_mfa` is stored and shown as
  "MFA (configured — enforcement pending IGA)". Decisions are **not** yet
  re-challenged for a second factor; enforcement lands with the IGA integration.
  Do not represent step-up MFA as an active control to auditors.
- SoD enforcement via IGA remains roadmap.

## Data backing (wired 2026-08)
- Definitions: `public.approval_workflows` (steps jsonb — `{name, approver_role, required, sla_hours}` — MFA + escalation config).
- Requests: `public.approvals` — entity-linked (`entity_type` + `entity_id`), org-scoped, with `step_index`, `decisions` jsonb ledger and `due_at` (migration `20260820000005_risk_criticality.sql`).
- Entity types: `model` (→ `/models/inventory/:id`), `exception` (→ `/exceptions?open=`), `incident` (→ `/risk/incidents?open=`), `policy` (→ `/policies?open=`, name resolved from the policies register).
- Decisions are audited via `withAudit` → `audit_client_event` RPC into the hash-chained `audit_log`, with `entity_name` in the audit metadata so the Audit Trail shows a readable label; the trail links `approval` entities back to `/workflows?open=<id>`.
- Realtime: `approvals` and `approval_workflows` changes invalidate the `ri-approvals` / `ri-approval-workflows` query namespaces (`useRealtimeInvalidation`).

## Interlinks
- Outbound: model / exception / incident / policy chips per request.
- Inbound: Audit Trail (`approval` → `/workflows?open=`), CISO Dashboard "Pending approvals" tile, Exception Management (shared decision state).
