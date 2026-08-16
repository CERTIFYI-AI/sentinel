# Risk Register & Risk Matrix

**Route:** `/risk`, `/risk-register`, `/risk-matrix`, `/risk-intelligence` · **Service:** `riskService.ts` · **Agents:** `riskAgent.ts`, `riskAssessmentAgent.ts`

## Purpose
Central register of enterprise, information-security, privacy, operational, AI, and third-party risks with inherent/residual scoring, treatment plans, ownership, and review cadence.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO 31000:2018 | Risk management principles and process |
| ISO/IEC 27005:2022 | Information security risk management |
| ISO/IEC 23894:2023 | AI risk management |
| ISO/IEC 42001 6.1 | AI risk assessment + treatment |
| NIST AI RMF MAP + MEASURE + MANAGE | Identify, assess, manage |
| COSO ERM | Enterprise risk |

## Scoring
Configurable qualitative (5x5) and quantitative (FAIR-style LEF × LM) scoring; separate inherent and residual scores with mitigating-control traceability.

## Lifecycle
Identify → Analyse → Evaluate → Treat (Accept / Mitigate / Transfer / Avoid) → Monitor → Review. Risks linked to Assets, Models, Vendors, Findings, Incidents, and Controls.

## Evidence
Versioned snapshots of the register (risk, score, owner, treatment, approver) are hashed into `evidence_chain` at every review cycle.

## Data backing (wired 2026-08)
- Register: `public.risks` (uuid PK, tenant-scoped RLS `risks_org_scoped`); service `riskService.ts`, hook `useRisksData`. The live-only columns (`categories`, `deadline`, `risk_score`) are now versioned in `20260819000001_risk_incidents_canonical.sql`.
- Risk Matrix reads the SAME rows (no parallel register); Financial Risk quantifications live in `public.financial_risks` (see financial-risk.md).
- Interlinks: `linked_model_ids` → model chips (`/models/inventory/:id`), `linked_incident_ids` → `/risk/incidents?open=`, `linked_control_ids` → `/controls/:id`; `?model=<uuid>` deep-link filter.
