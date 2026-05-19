# Records of Processing Activities (RoPA)

**Route:** `/ropa` · **Service:** `dataGovernanceService.ts`

## Purpose
Maintain the GDPR Article 30 register of processing activities for controllers and processors, extended to cover AI-specific processing (training, inference, fine-tuning, evaluation) and cross-border transfers.

## Standards Alignment
| Control | Requirement |
|---|---|
| GDPR Art. 30(1)/(2) | Controller and processor RoPA content |
| GDPR Art. 35 | DPIA linkage for high-risk processing |
| UK GDPR / Swiss FADP | Equivalent RoPA obligations |
| EU AI Act Art.10 | Data governance for training/validation/test sets |
| ISO/IEC 27701 6.15 | Records of PII processing |

## Record Schema
- Processing name, purpose, lawful basis (Art.6), special-category basis (Art.9)
- Data subject categories and personal data categories
- Recipients and processors
- International transfers (with mechanism: SCC, BCR, Adequacy, DPF) → linked to TIA
- Retention schedule and erasure trigger
- Technical and organisational measures (TOMs)
- Linked assets, DPIAs, DPAs, and DSR procedures

## Workflow
Draft → DPO review → Publish → Scheduled revalidation (annual or on change). State transitions are audit-logged and the published snapshot is hashed into `evidence_chain`.

## Exports
Supervisory-authority-ready PDF/CSV export. Optional annex: system diagrams from Asset Management graph.
