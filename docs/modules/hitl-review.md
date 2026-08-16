# Human-in-the-Loop (HITL) Review

**Route:** `/hitl`, `/hitl-queue`, `/hitl-reviews` · **Service:** `hitlService.ts` · **Agent:** `hitlAgent.ts`

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
FIFO with priority (policy criticality, data class, user impact, SLA). Each case carries inputs, model output, policy hits, risk scoring, and recommended action.

## SLA Tiers
| Tier | SLA | Example |
|---|---|---|
| P0 | 15 min | Safety block, minor-impact content |
| P1 | 1 hour | PII exfiltration risk, jailbreak |
| P2 | 8 hours | Policy ambiguity |
| P3 | 24 hours | User appeal / Art.22 challenge |

Overdue cases escalate via `sla-enforcer`.

## Reviewer Integrity
- Four-eyes for P0/P1.
- SoD enforced against policy authoring via IGA.
- Every decision records reviewer, rationale, and reason code; written to `evidence_chain`.

## Feedback Loop
Reviewer corrections flow to the Evals module (golden-set candidates) and Policy Management (rule refinement).

## Data backing (wired 2026-08)
- `public.hitl_reviews` (uuid PK, org + tenant scoped) is ONE queue shared by the UI and the agent mesh: `hitlAgent.ts` and the governance-dispatcher edge function write the same table the Review Center reads (`oversightService.ts`, `useHitlReviews`).
- Decisions (`approve` / `reject` / `request info`) persist with decider + timestamp and write an audit event (`withAudit` → `audit_events`), satisfying EU AI Act Art. 14 human-oversight evidence.
- `blocks_deployment` marks reviews that gate a release; SLA fields (`sla_hours`, `sla_deadline`) drive real overdue computation.
