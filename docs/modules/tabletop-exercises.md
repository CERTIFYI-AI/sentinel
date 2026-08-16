# Tabletop Exercises

**Route:** `/tabletop` · **Service:** `exercisesService.ts`

## Purpose
Structured scenario simulations for Incident Response, Business Continuity, Disaster Recovery, and AI-specific failure modes (model incident, hallucination cascade, prompt-injection breach, biased decisioning complaint).

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.24–A.5.30 | IR planning, lessons learned, ICT continuity |
| ISO 22301 8.5 | Exercising and testing |
| NIST SP 800-84 | Test, Training, and Exercise Programs |
| EU AI Act Art.9, Art.15 | Risk management throughout lifecycle, accuracy/robustness |
| DORA Art.25–26 | TLPT and scenario testing |

## Exercise Lifecycle
Plan → Invite participants → Launch → Capture injects, decisions, timings → Complete with findings and action items → Link findings to Risk Register / Task Queue.

## Artefacts
- Scenario library (IR, BCP, AI incident, DR, supply-chain, regulatory notification).
- Hot-wash report template.
- Evidence: participant list, transcript, decisions, corrective actions, sign-off.

## Evidence Chain
Completed exercise package is hashed into `evidence_chain` to prove exercise cadence (ISO 22301 clause 8.5 and DORA annual exercise mandate).

## Data backing (wired 2026-08)
- `public.tabletop_exercises` (org-scoped RLS `tte_org`) — the real table, now consumed by the page (`useTabletops`): CHECK-constrained type/status, findings + action items jsonb, `readiness_score`, `linked_playbook_id` → incident_playbooks.
