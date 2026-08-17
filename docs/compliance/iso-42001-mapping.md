# ISO 42001 Control Mapping

This document maps Certifyi Sentinel features to ISO/IEC 42001:2023 AI Management System controls.

## Scope

ISO 42001 is the international standard for AI management systems. The controls below correspond
to Sentinel's automated governance layer.

## Control Mapping Table

| ISO 42001 Control | Control Description | Sentinel Feature | Status |
|---|---|---|---|
| 6.1.2 | AI risk assessment | Trust score pipeline | Implemented |
| 6.1.3 | AI risk treatment | Circuit breaker cascade | Implemented |
| 8.4 | AI system operation | Proxy middleware | Implemented |
| 8.5 | AI system output review | Verifier layer (NLI) | Implemented |
| 9.1 | Monitoring & measurement | Audit hash chain | Implemented |
| 9.2 | Internal audit | Audit logger + export | Implemented |
| A.6.1 | Intended use | Policy engine rules | Implemented |
| A.6.2 | AI system impact assessment | Compliance engine | Implemented |
| A.8.3 | Data governance for AI | PII sanitizer | Implemented |
| A.8.4 | Logging & monitoring | Immutable audit chain | Implemented |

## Audit Evidence

Evidence packages can be exported via the Sentinel CLI:

```bash
sentinel compliance export --framework iso-42001 --output evidence/
```

## Certification Notes

- Sentinel automates evidence collection for ISO 42001 Annex A controls
- The immutable audit chain provides tamper-evident logs required by clause 9.1
- Trust score thresholds map to AI risk treatment plans (clause 6.1.3)

---

## Annex A Coverage — Connectivity, Agent Tooling, Evaluation & Workforce

Added with the connectivity and gateway build-out (August 2026).

| Control | Requirement | Evidence-producing module | Status |
|---|---|---|---|
| A.3.2 | Roles and accountability documented | [Tasks](../modules/tasks.md) (owner per finding); [Eval Techniques](../modules/eval-techniques.md) (owner per method) | Implemented |
| A.4.2 | Competence | [AI Literacy](../modules/ai-literacy.md) — completion evidence per programme | Implemented |
| A.4.3 | Awareness | [AI Literacy](../modules/ai-literacy.md); [AI Apps](../modules/ai-apps.md) sanctioned-tool guidance | Implemented |
| A.6.2.2 | AI system objectives, tested against | [Eval Techniques](../modules/eval-techniques.md) — coverage per model | Implemented |
| A.6.2.4 | Verification and validation planning | [Eval Techniques](../modules/eval-techniques.md) — cadence and due dates; [Playground](../modules/playground.md) — pre-change rehearsal | Implemented |
| A.6.2.6 | Operation monitoring | [Integrations](../modules/integrations.md) health/sync; [MCP Gateway](../modules/mcp-gateway.md) server health | Implemented |
| A.6.2.8 | Corrective action and continual improvement | [Tasks](../modules/tasks.md) — findings tracked to closure | Implemented |
| A.7.2 | Resources documented with owners | [Integrations](../modules/integrations.md) — connector owners | Implemented |
| A.9.2 | Operational controls over AI capability | [MCP Gateway](../modules/mcp-gateway.md) — approval state, data ceiling | Implemented |
| A.9.3 | Access control over AI capability | [MCP Gateway](../modules/mcp-gateway.md) — per-tool agent allow-lists, scopes | Implemented |
| A.10.2 | Third parties and suppliers | [AI Apps](../modules/ai-apps.md) → vendors; [Trust Center](../modules/trust-center.md) subprocessors | Implemented |

### Management-system notes

- Every table above is org-scoped with RLS, and the tenant column is filled by
  the `current_user_org_id()` database default rather than by the client — so
  tenant isolation is a property of the schema, not of application code.
- Records that may constitute evidence are **soft-deleted** (`is_deleted`), never
  hard-deleted, preserving the clause 9.1 monitoring record.

---

## Annex A Coverage — Privacy & Statutory Records

Added 2026-08-16 with the PRIVACY group and TD-001 Tier 1 migrations.

| Control | Requirement | Evidence-producing module | Status |
|---|---|---|---|
| A.5.2 | AI system impact assessment | [DPIA](../modules/dpia.md) — inherent vs residual risk with mitigations | Implemented |
| A.5.4 | Assessing AI system impacts on individuals | [DPIA](../modules/dpia.md); [RoPA](../modules/ropa.md) data-subject records | Implemented |
| A.7.2 | Data for AI systems — provenance and lawful basis | [RoPA](../modules/ropa.md) — legal basis and categories per activity | Implemented |
| A.7.3 | Data quality and acquisition | [TIA](../modules/transfer-impact-assessment.md) — what crosses a border and under which mechanism | Implemented |
| A.8.3 | Data governance for AI | [DSR](../modules/dsr-consent.md) — subject rights actionable against named AI systems | Implemented |
| A.9.2 | Operational controls | [Compliance Controls](../modules/controls-control-testing.md) — implementation status and test currency | Implemented |
| A.9.4 | Third-party data recipients | [TIA](../modules/transfer-impact-assessment.md) — `vendor_id` names the recipient | Implemented |
| A.6.2.8 | Corrective action | Outstanding DPIAs and overdue control tests surface as counts and route to remediation | Implemented |

### Management-system notes

- Every table in this group is org-scoped with RLS and the tenant column filled
  by the `current_user_org_id()` database default — tenant isolation is a
  property of the schema, not of application code.
- Statutory records are **soft-deleted** (`is_deleted`) rather than removed, so
  a superseded DPIA still evidences what was known and decided at the time
  (clause 9.1 monitoring record).
- Control effectiveness (`score`) and evidence counts are **nullable**: never
  scored renders `—`, distinguishable from scored-and-zero. This matters when a
  figure is cited as conformity evidence.

---

## Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability

Added 2026-08-16 with the TPRM / supply-chain / ESG rollout. Clause A.10.2
(third parties and suppliers) previously pointed only at AI Apps and the Trust
Center, because the vendor modules themselves held no persisted third-party
risk data.

| Control | Control description | Module & backing | Status |
|---|---|---|---|
| A.10.2 | Third parties and suppliers | [Vendor Registry](../modules/vendor-registry.md) — `vendors` carrying inherent vs residual risk, criticality, DPA state with dates, certification expiries, sub-processor count and fourth-party exposure | Implemented |
| A.10.3 | Supplier agreements and obligations | [Vendor SLA](../modules/vendor-sla.md) — `vendor_slas` with contract clause reference, service credits and claim status | Implemented |
| A.10.4 | Supplier performance monitoring | `vendor_sla_status` derives breach from numeric thresholds; `consecutive_breaches` and `last_breach_at` are recorded rather than asserted | Implemented |
| A.7.2 | Data for AI systems — provenance | [Provenance](../modules/provenance.md) — `provenance_nodes`/`_edges` as a typed DAG with artifact digests, build/source refs and SLSA level fields | Implemented |
| A.7.3 | Acquisition of AI components | [AIBOM](../modules/aibom.md) — `aibom_components` with PURL/CPE, SPDX licence identifier and licence-risk classification | Implemented |
| A.6.2.4 | AI system verification and validation | [Attestations](../modules/supply-chain-attestations.md) — attestor identity, independence flag, accreditation, revocation and supersession | Partial — records the attestation; cryptographic verification not yet performed (TD-011) |
| A.5.2 | AI risk assessment — third-party contribution | [Vendor Assessments](../modules/vendor-assessments.md) — `vendor_assessments` with approver distinct from owner, residual risk and real `evidence_ids` | Implemented |
| A.9.3 | Reporting concerns | [Vendor Questionnaire](../modules/vendor-questionnaire.md) — persisted responses with respondent, reviewer and decision | Implemented |
| A.4.6 | Environmental impact of AI systems | [Carbon](../modules/carbon-ledger.md) / [Energy](../modules/energy-efficiency.md) — GHG scope classification, emission factor with source, measurement method, PUE, accelerator type and water usage | Implemented |
| A.2.4 | Objectives and reporting | [ESG Reports](../modules/esg-reports.md) — framework **version**, reporting boundary, consolidation basis, assurance status/provider, approver, restatement flag, and `carbon_record_ids`/`energy_metric_ids` citing the records reported on | Implemented |

### Audit evidence for these modules

- **Org isolation.** Every table added by this rollout is org-scoped with RLS
  where the scoping column is filled by the DB default
  (`current_user_org_id()`), never by the client. Verified by rolled-back
  inserts as role `authenticated` with no scoping column supplied.
- **Interlink integrity.** Each relation was proven with a `total` vs `resolves`
  query; all nine were equal (aibom→models 2/2, attestation→subject 3/3,
  vendor_assessments→vendors 2/2, vendor_slas→vendors 3/3,
  vendor_documents→vendors 2/2, carbon→models 2/2, energy→models 4/4,
  aibom_components→aibom 4/4, provenance_edges→nodes 3/3).
- **Demo data.** All seeded content is fictional and belongs to the demo tenant.
  Owners, reviewers and attestors are **role labels** ("Head of Sustainability",
  "Third-Party Risk Analyst"), never named individuals — the previous mocks
  attributed signed attestations and accepted SOC 2 reports to invented people,
  which is an audit-integrity problem rather than a cosmetic one.

---

## Module Coverage — Executive Surfaces (Dashboard, CISO, Board Report, Peer Benchmarking)

Added 2026-08-17. These surfaces own no data; they summarise the governed
tables. They are mapped because Clause 9 turns on whether management review is
fed by real measurement.

| Control | Control description | Module & backing | Status |
|---|---|---|---|
| 9.1 | Monitoring, measurement, analysis and evaluation | [Dashboard / CISO Dashboard](../modules/executive-surfaces.md) — every KPI derives from an org-scoped query at render; unmeasured renders `—`, never a zero | Implemented |
| 9.3 | Management review | [Board Report](../modules/executive-surfaces.md) — risk, compliance, incident and model sections plus Priority Actions derived from real open records; exportable with provenance | Implemented |
| 9.3.2 | Management review inputs must be factual | Averages exclude unscored rows and state the true denominator; no trend is claimed because no snapshots are stored | Implemented |
| A.2.4 | Reporting and communication | Export via `exportUtils` with a provenance block, audit-logged through `logAction` | Implemented |
| A.9.2 | Performance against objectives — peer/industry comparison | [Peer Benchmarking](../modules/executive-surfaces.md) | **Not implemented** — no peer-contribution pipeline exists. The module renders an honest empty state naming the precondition rather than showing figures. Recorded here explicitly so the gap is visible rather than assumed covered. |

### Audit evidence for these surfaces

- **Traceability of reporting.** Board Report exports write an `audit_log` entry
  naming the authenticated actor, the module and the action, so the point at
  which governance figures left the platform is recoverable.
- **Provenance on the artefact.** Each exported file states the org, the derived
  period, a `data_as_of` timestamp, the source tables, and — in plain words —
  that the figures are point-in-time counts rather than an audited or aggregated
  position.
- **No fabricated inputs to management review.** As of 2026-08-17 no figure on
  any of these surfaces is a literal. Where a source does not exist the section
  is removed and an empty state names what is missing; where a query fails the
  page reports the failure rather than rendering a zero.
