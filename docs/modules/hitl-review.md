# Human-in-the-Loop (HITL) Review

**Route:** `/hitl` (queue) · `/hitl/:id` (detail) · **Service:** `oversightService.ts` · **Hooks:** `useHitlReviews` / `useHitlReview` (`hooks/useRiskIncidents.ts`) · **Agent:** `hitlAgent.ts`

## Purpose
Route AI outputs flagged by policy, risk, or user challenge to qualified human reviewers; capture decisions as auditable, reason-coded evidence; feed corrections back to policy and evals.

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.14 | Human oversight |
| EU AI Act Art.26(2) | Deployer oversight duties |
| ISO/IEC 42001:2023 A.9.3 | Human oversight |
| NIST AI RMF MANAGE 2.3 | Post-deployment override mechanisms |
| GDPR Art.22 | Right not to be subject to solely automated decision |

## Queue Semantics
One shared queue (`public.hitl_reviews`) ordered newest-first, filtered and triaged by
`priority` (`critical` / `high` / `medium` / `low`), entity type, and assignee. Each
review carries the governed entity link (`entity_type` + `entity_id`), the trigger
reason, and an optional linked risk (`linked_risk_id` → risk register). Supported
entity types include `model`, `incident`, `deployment`, `agent`, `dataset`, `vendor`
and `risk` — model, incident and risk entities deep-link to their canonical records.

## SLA Semantics
SLAs are per-review, not fixed tiers: each review stores `sla_hours` and the derived
`sla_deadline`. Overdue state is computed live against `sla_deadline` (a pending
review past its deadline shows `Nh overdue` and a red row marker). There is no
automated `sla-enforcer` escalation job today — overdue reviews are surfaced in the
Review Center's Overdue tab and on the CISO Dashboard's "Pending HITL reviews" tile.

## Reviewer Integrity
- Every decision records the real decider (`decided_by`), timestamp, and remarks;
  approval/rejection requires minimum-length remarks in the UI.
- **Roadmap (not yet enforced):** four-eyes review for critical/high priority and
  separation-of-duties against policy authoring (planned via the IGA integration).
  Do not represent these as active controls to auditors.

## Feedback Loop
Reviewer corrections flow to the Evals module (golden-set candidates) and Policy Management (rule refinement).

## Data backing (wired 2026-08)
- `public.hitl_reviews` (uuid PK, org + tenant scoped) is ONE queue shared by the UI and the agent mesh: `hitlAgent.ts` and the governance-dispatcher edge function write the same table the Review Center reads (`oversightService.ts`, `useHitlReviews`).
- Decisions (`approve` / `reject` / `request info`) persist with decider + timestamp and append an audit event to the hash-chained `audit_log` via `withAudit` → the `audit_client_event` RPC (SECURITY DEFINER; org and actor resolved server-side). The audit metadata carries `entity_name` (the review title) so the Audit Trail renders a real label. This satisfies EU AI Act Art. 14 human-oversight evidence. (Decisions are **not** written to `evidence_chain` — evidence artifacts are a separate module.)
- `blocks_deployment` marks reviews that gate a release; SLA fields (`sla_hours`, `sla_deadline`) drive real overdue computation.
- Realtime: `hitl_reviews` inserts/updates invalidate the `ri-hitl` query namespace (`useRealtimeInvalidation`), so mesh-queued reviews appear without a reload.

## Interlinks
- Outbound: model (`/models/inventory/:id`), incident (`/risk/incidents?open=`), risk (`/risks?open=`), linked risk chip.
- Inbound: Audit Trail (`hitl_review` → `/hitl/:id`), CISO Dashboard tile (`/hitl`), Overview digest, notifications (`url_path`).
