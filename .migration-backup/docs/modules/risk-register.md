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
