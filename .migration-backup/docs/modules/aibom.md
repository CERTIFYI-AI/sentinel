# AI Bill of Materials (AIBOM)

**Route:** `/aibom-registry` · **Service:** referenced by `modelService.ts`

## Purpose
SBOM-equivalent manifest for AI systems: base model, weights, datasets, libraries, licences, fine-tunes, tools, and vulnerability posture.

## Standards Alignment
| Control | Requirement |
|---|---|
| US EO 14028 / NTIA minimum SBOM elements | Supply-chain transparency |
| CISA AIBOM guidance | AI-specific BOM elements |
| CycloneDX ML-BOM | Machine-readable format |
| EU AI Act Art.11 + Annex IV | Technical documentation |
| SPDX 3.0 AI profile | Licence + provenance |

## Record
Components (model, dataset, package, tool) with version, licence, hash, origin, known CVEs, and downstream deployments.

## Automation
Build-time ingestion from training pipelines; runtime attestation via vendor feeds; drift alert when unapproved components appear.
