# Third-Party / Vendor Risk Management (TPRM) — overview

**Scope:** the umbrella page for the vendor and AI supply-chain cluster. Each
module below has its own doc with the field table, both directions of interlink
and its compliance mapping; this page covers the programme those modules add up
to. · **Agent:** `vendorRiskAgent.ts` (concentration and risk flags)

> This page previously named `attestationsService.ts`, which does not exist, and
> documented only three routes. The cluster is seven modules with real service
> layers; use the per-module docs below.

## Purpose

Onboard, assess and continuously monitor third parties — SaaS providers, model
vendors, data processors, cloud platforms and sub-processors — including the
AI-specific supply-chain risks: model provenance, training-data origin,
fine-tune chain and component vulnerability exposure.

## The modules

| Module | Route | Backing table |
|---|---|---|
| [Vendor Registry](vendor-registry.md) | `/vendors`, `/vendors/:id` | `vendors` |
| [Vendor Assessments](vendor-assessments.md) | `/vendors/assessments` | `vendor_assessments` |
| [Vendor SLA](vendor-sla.md) | `/vendors/sla` | `vendor_slas` + view `vendor_sla_status` |
| [TPRM Workspace](tprm-workspace.md) | `/vendors/tprm` | *(aggregates the above)* |
| [Vendor Questionnaire](vendor-questionnaire.md) | `/vendors/:id/questionnaire` | `vendor_questionnaires` |
| [Vendor Upload](vendor-upload.md) | `/vendor-upload` | `vendor_documents` |
| [Supply Chain Attestations](supply-chain-attestations.md) | `/supply-chain` | `supply_chain_attestations` + view `supply_chain_attestation_status` |
| [Supply Chain Graph](supply-chain-graph.md) | `/supply-chain/graph` | derived from `provenance_*` + registers |
| [AIBOM](aibom.md) | `/aibom` | `aibom_records`, `aibom_components`, `aibom_vulnerabilities` |
| [Provenance](provenance.md) | `/provenance` | `provenance_nodes`, `provenance_edges` |

## Standards Alignment

| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.19–A.5.23 | Supplier relationships, ICT supply chain |
| ISO/IEC 42001 A.10.2–A.10.4 | Third parties, supplier agreements, performance monitoring |
| SOC 2 CC9.2 | Vendor and business partner risk |
| NIST SP 800-161 | C-SCRM |
| EU AI Act Art. 25 | Obligations along the value chain |
| EU AI Act Art. 72 | Post-market monitoring of supplier performance |
| DORA Art. 28–30 | ICT third-party risk, register of information |
| GDPR Art. 28 | Processor agreements |

The row-level mapping lives in
[`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md) and
[`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
section "Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

## Lifecycle

Intake → tiering (criticality + data classification + AI involvement) → due
diligence [questionnaire](vendor-questionnaire.md) (SIG, CAIQ, ISO 42001
addendum) → [assessment](vendor-assessments.md) with an approver distinct from
the owner → contract controls (DPA, SCC, [SLA](vendor-sla.md), security
addendum) → onboarding → continuous monitoring
([documents](vendor-upload.md), [attestations](supply-chain-attestations.md),
SLA measurement, breach signal) → reassessment on cadence → offboarding against
the recorded exit plan.

## What the cluster does not claim

- **Verification is not performed.** Across AIBOM, provenance and attestations,
  `declared_digest` is self-declared and is evidence of nothing;
  `verification_status` / `verified_at` / `verified_by` /
  `verification_method` are written only by a verifier, and nothing verifies
  anything today — every record reads `unverified`. See TD-011 in
  [`../reference/technical-debt.md`](../reference/technical-debt.md).
- **Derived states are computed, never authored.** SLA breach comes from numeric
  thresholds via `vendor_sla_status` (an unmeasured SLA reports `unmeasured`,
  never `healthy`); attestation validity comes from `valid_until` via
  `supply_chain_attestation_status`.
- **Absence is visible.** Null renders as an em-dash, never `0`: a never-scanned
  AIBOM is not "0 CVEs" and an unscored vendor is not "Score 0".

## Cross-cutting operations

- Every module in the cluster calls `logAction` on state-changing writes
  (EU AI Act Art. 12) — before the 2026-08-16 rollout, none did.
- `org_id` is filled by the DB default `current_user_org_id()` on every table;
  the client never sends a scoping column, and RLS is org-scoped.
- Demo data is fictional and belongs to the "Acme Financial Services" demo
  tenant. Owners, reviewers and attestors are role labels, never named
  individuals.
- Migrations:
  `supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql`,
  `…20260822000002_supply_chain_esg_canonical.sql`,
  `…20260822000003_seed_tprm_supply_esg.sql`.
