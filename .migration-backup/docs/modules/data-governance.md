# Data Governance (Datasets, Quality, Lineage)

**Routes:** `/datasets`, `/data-governance`, `/data-quality`, `/data-lineage` · **Services:** `dataGovernanceService.ts`, `datasetService.ts`

## Purpose
Inventory training/evaluation/production datasets, track quality, lineage, and compliance constraints; enforce data-minimisation and purpose-limitation.

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.10 | Data governance for training/validation/test |
| ISO/IEC 42001 A.7 | Data for AI systems |
| ISO/IEC 25012 / 5259 | Data quality for analytics and ML |
| GDPR Art.5(1)(c)(d) | Data minimisation and accuracy |
| DAMA-DMBOK 2 | Data management body of knowledge |
| BCBS 239 | Risk data aggregation (FS) |

## Dataset Record
Source, licence, collection basis, labelling method, statistics, bias tests, retention, linked models and RoPA entries.

## Lineage
Graph of raw → curated → feature → training set → model version, built from ingestion manifests and model-training runs.
