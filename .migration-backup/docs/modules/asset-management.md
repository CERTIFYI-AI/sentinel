# Asset Management Module

**Route:** `/asset-management` · **Service:** `assetService.ts` · **Agent:** n/a

## Purpose
Maintain an authoritative inventory of all information and AI assets (models, datasets, endpoints, infrastructure, data stores, applications) with ownership, classification, and lifecycle state. The asset inventory is the **anchor object** for risk, control, vulnerability, and evidence linkage across Sentinel.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.9 | Inventory of information and associated assets |
| ISO/IEC 27001:2022 A.5.10 | Acceptable use |
| ISO/IEC 27001:2022 A.5.12 | Classification of information |
| ISO/IEC 42001:2023 6.1.2 / A.4.3 | AI system assets and resources |
| NIST SP 800-53 CM-8 | System component inventory |
| NIST AI RMF MAP 1.1 | AI system context and components cataloged |
| SOC 2 CC6.1 | Logical access over protected assets |
| EU AI Act Art.11 + Annex IV §1(a) | Technical documentation of the AI system |

## Data Model (logical)
- `assets(id, org_id, name, type, classification, owner_id, environment, criticality, tags[], status, created_at, updated_at)`
- `asset_relationships(parent_id, child_id, relationship_type)` — e.g. model → dataset, model → endpoint, service → infra
- `asset_owners(asset_id, user_id, role)` — Business Owner, Technical Owner, DPO liaison

RLS: `org_id` scoped. Immutable change history written to `audit_log`.

## Functional Capabilities
- CRUD with required ownership and classification.
- Bulk import via CSV and API.
- Relationship graph (model ↔ dataset ↔ infra ↔ vendor).
- Cross-module linkage: Risk Register, Control Testing, Vulnerability/Patch, Evidence, Vendor.
- Criticality-driven SLA inheritance for HITL, patching, and incident response.

## Evidence & Audit
Every create/update/delete emits an `audit_log` entry and an `evidence_chain` hash so inventory completeness can be attested at a point in time.

## V2 Roadmap
Auto-discovery connectors (cloud posture, CMDB, registry sync), drift detection, and end-of-life automation.
