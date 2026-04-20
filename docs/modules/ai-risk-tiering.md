# AI Risk Tiering

**Route:** `/ai-risk-tiering` · **Service:** `aiImpactService.ts`

## Purpose
Classify every AI use case by regulatory risk tier to route it to the correct governance pathway.

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.5–7 + Annex III | Prohibited / High-risk classification |
| EU AI Act Art.51–55 | GPAI systemic risk |
| NIST AI RMF MAP 5.1 | AI system impact categorised |
| ISO/IEC 42001 6.1.3 | AI risk assessment |
| Canada AIDA / UK pro-innovation | National tiering |

## Tier Model
Prohibited → High → Limited → Minimal, plus GPAI and GPAI-systemic. Tier drives required controls, HITL SLA, evidence cadence, DPIA/FRIA need, and regulator-filing scope.

## Evidence
Tiering decision, rationale, and reviewer written to `evidence_chain` and attached to Model Inventory record.
