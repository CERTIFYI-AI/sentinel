# Data Protection Impact Assessment (DPIA)

**Route:** `/dpia` · **Service:** `aiImpactService.ts`

## Purpose
Structured assessment of privacy risk for high-risk processing, including AI-specific uses, with mitigation planning and DPO sign-off.

## Standards Alignment
| Control | Requirement |
|---|---|
| GDPR Art.35 | DPIA for high-risk processing |
| GDPR Art.36 | Prior consultation |
| ICO/CNIL/EDPB guidance | Methodology |
| ISO/IEC 29134 | PIA guidance |
| EU AI Act Art.27 | Fundamental Rights Impact Assessment (FRIA) linkage |

## Workflow
Screening → Full DPIA (necessity, proportionality, risks to rights, mitigations) → Consultation (DPO, stakeholders, data subjects where feasible) → Approval → Periodic review. Evidence hashed into `evidence_chain`.

## Linkages
RoPA record, Asset, Model Inventory, TIA, Vendor, Risk Register.
