# Compliance Programs

**Routes:** `/compliance`, `/compliance-dashboard`, `/compliance-autopilot`, `/compliance-frameworks`, `/framework-mapping`, `/frameworks`, `/gap-analysis`, `/maturity`, `/conformity-assessment`
**Status:** Production
**Owner:** Compliance · **Backing table(s):** `frameworks`, `controls`, `compliance_scores`, `framework_controls`, `conformity_assessments`, `maturity_assessments`, `control_assignments`, `control_comments`, `control_links` (org-scoped, RLS)

## Purpose
Single control universe mapped to multiple frameworks, with live posture,
gap analysis, maturity scoring, conformity assessment, and framework
crosswalk. Compliance Autopilot automates evidence refresh, task assignment,
and reviewer routing.

## Why it exists
Organisations are subject to multiple overlapping frameworks (SOC 2, ISO
27001, EU AI Act, NIST AI RMF, etc.). Implementing each independently
duplicates effort and evidence. A unified control universe with many-to-many
framework mapping lets one control and one piece of evidence satisfy
multiple requirements simultaneously.

## How it works
1. Frameworks are registered with their control requirements.
2. Controls are mapped to one or more frameworks via `framework_controls`.
3. Compliance scores are computed and stored in `compliance_scores` — the
   mesh's ComplianceImpact agent writes here.
4. Conformity assessment follows EU AI Act Art. 43 — internal control with
   notified-body track-switch for Annex III high-risk systems.
5. Maturity scoring benchmarks governance capability across dimensions.
6. Gap analysis is derived from the control library (see `gap-analysis.md`).

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | StatCardRow (5) | Frameworks tracked, avg coverage, controls mapped, recent scores, risk posture | Read-only |
| Framework cards | card grid | Each framework with score, control count, last scored | Read-only |
| Controls coverage | bar | Implemented vs total controls | Read-only derived |
| Framework catalog | tab | Browse and add frameworks | Reads/writes `frameworks` |
| Framework mapping | crosswalk table | Many-to-many control ↔ framework mapping | Read-only from `framework_controls` |
| Mesh recalculations | table | Recent `compliance_scores` with timestamp and source | Read-only |
| Gap Analysis link | InterlinkChip | Navigate to derived gap view | → `/compliance/gap-analysis` |
| Controls link | InterlinkChip | Navigate to control library | → `/compliance/controls` |
| Risk posture | strip | Risk metrics linking to risk register | → `/risks` |
| JSON export | button | Downloads compliance snapshot | Real file |
| List / Board toggle | view switch | Control library as a table or a kanban board (one column per implementation status, quick status change on card) | Writes `controls.status` |
| Framework filter | select | Scopes the control library to one of the 15 frameworks, with per-framework counts | Read-only filter |
| Assignees | panel | Multi-user assignment per control (owner / reviewer / approver / contributor); reassign = add/remove | Reads/writes `control_assignments`, audit-logged |
| Comments & recommendations | panel | Threaded discussion; recommendations carry open/resolved | Reads/writes `control_comments`, audit-logged |
| Evidence | panel | Link/unlink Evidence Vault records to the control | Writes `evidence.linked_controls`, audit-logged |
| Cross-framework mappings | panel | Crosswalk this control to its counterparts in other frameworks (equivalent / supports / overlaps) | Reads/writes `control_links`, audit-logged |

Nulls: a framework with no scored controls shows `—`. An empty framework
list shows an honest empty state.

## Interlinks
- **Outbound** — InterlinkChip to `/compliance/gap-analysis`,
  `/compliance/controls`, `/risks`, `/frameworks?open=<id>`,
  `/frameworks?tab=catalog`; from a control: linked models
  (`/models/inventory/:id`), risks, policies, evidence
  (`/evidence-vault?open=<id>`), and crosswalked controls
  (`/compliance/controls?open=<id>`).
- **Inbound** — serves as the Compliance & Regulatory group landing page;
  mesh agents write `compliance_scores`; sidebar nav; Evidence Vault records
  reach their controls through `evidence.linked_controls`.
- **Crosswalk** — `control_links` maps controls across frameworks
  (equivalent / supports / overlaps). Seeded with 21 published
  EU AI Act ↔ ISO/IEC 42001 ↔ NIST AI RMF correspondences, every one
  verified to resolve on both ends (21/21); users extend it per control.
- **Coverage** — all 15 frameworks carry posture controls (1,017 total);
  the 6 security frameworks were backfilled from the catalog at
  'not_implemented' — posture is evidenced, never imported.

## Compliance
- **EU AI Act** — Art. 43 (conformity assessment), Art. 9 (risk management
  system).
- **ISO/IEC 42001** — 9.2 (internal audit), 10.1 (nonconformity).
- **SOC 2, NIST CSF, ISO 27001, HIPAA, GDPR, DORA, NIS2** — all mapped
  via the framework crosswalk.

## Operations
Frameworks supported out-of-box: SOC 2, ISO/IEC 27001, ISO/IEC 27701,
ISO/IEC 42001, NIST CSF 2.0, NIST AI RMF, NIST SP 800-53, PCI DSS 4.0,
HIPAA, GDPR, EU AI Act, DORA, NIS2, HITRUST CSF, FedRAMP, CIS Controls,
and others. Framework catalog is extensible. Writes throw on failure.
Realtime: not realtime; staleTime-based React Query refresh.
