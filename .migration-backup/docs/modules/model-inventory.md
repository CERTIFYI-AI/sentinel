# Model Inventory & Lifecycle

**Route:** `/models`, `/model-inventory`, `/model-lifecycle`, `/model-risk-committee`, `/post-market` · **Service:** `modelService.ts`

## Purpose
The model registry of record: every model (first-party, fine-tuned, third-party) with provenance, intended use, risk tier, owners, approvals, deployments, and post-market monitoring.

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.9, 11, 13, 16–21, 72–73 | Risk management, technical documentation, transparency, provider obligations, post-market monitoring, incident reporting |
| ISO/IEC 42001 6.1.3, A.6, A.8 | AI risk and impact assessment, system lifecycle, data for AI systems |
| NIST AI RMF GOVERN, MAP, MEASURE, MANAGE | Full lifecycle |
| SR 11-7 / OCC 2011-12 | Model risk management (financial services) |
| ISO/IEC 23894 | AI risk management guidance |

## Record Fields
- Provenance: base model, training data sources, fine-tune lineage, licence.
- Intended use, prohibited use, known limitations.
- Risk tier (Minimal / Limited / High / Unacceptable per EU AI Act).
- Owners: Product, Model Owner, Validator, Business Sponsor.
- Deployment environments and routes.
- Linked datasets, evals, policies, DPIAs, and HITL configuration.

## Lifecycle States
Proposed → In development → Internal validation → Model Risk Committee approval → Deployed (shadow) → Deployed (active) → Deprecated → Retired. Each transition is gated by required evidence.

## Post-Market Monitoring
Continuous tracking of performance, drift, incidents, and user complaints. Breach of thresholds triggers HITL review and, if material, regulator filing.
