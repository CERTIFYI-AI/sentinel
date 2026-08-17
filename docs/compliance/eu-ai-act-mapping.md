# EU AI Act Compliance Mapping

This document maps Certifyi Sentinel features to EU AI Act requirements for high-risk AI systems.

## Classification

Sentinel is designed to help organisations deploying high-risk AI systems comply with the EU AI Act
(Regulation 2024/1689). Sentinel acts as a governance middleware layer.

## Article Mapping

| EU AI Act Article | Requirement | Sentinel Feature | Status |
|---|---|---|---|
| Article 9 | Risk management system | Trust score + circuit breaker | Implemented |
| Article 10 | Data governance | PII sanitizer + verifier | Implemented |
| Article 11 | Technical documentation | Audit chain + evidence export | Implemented |
| Article 12 | Record-keeping | Immutable audit log | Implemented |
| Article 13 | Transparency | Audit trail + trust scores | Implemented |
| Article 14 | Human oversight | HITL queue + review UI | Implemented |
| Article 15 | Accuracy, robustness | Fact-checker + NLI verifier | Implemented |
| Article 62 | Post-market monitoring | Continuous audit logging | Implemented |

## High-Risk AI System Support

Sentinel provides automated compliance controls for AI systems in the following high-risk categories:

- Healthcare AI (FHIR, medical decision support)
- Employment and workforce management
- Critical infrastructure management
- Education and vocational training

## Evidence Generation

```bash
sentinel compliance export --framework eu-ai-act --output evidence/
```

## Conformity Assessment

The following Sentinel features map to Article 43 conformity assessment procedures:

1. **Audit chain integrity** — tamper-evident SHA-256 hash chain
2. **Trust score** — quantified confidence metric per response
3. **HITL escalation** — mandatory human review for low-trust outputs
4. **PII sanitizer** — data minimisation (Article 10.3)

---

## Module Coverage — Connectivity, Agent Tooling, Evaluation & Workforce

Added with the connectivity and gateway build-out (August 2026). Each row states
the module that produces the evidence, not merely the capability that exists.

| Article | Requirement | Evidence-producing module | Status |
|---|---|---|---|
| Art. 4 | AI literacy of staff dealing with AI systems | [AI Literacy](../modules/ai-literacy.md) — programmes, enrolment, completion | Implemented |
| Art. 4 / 26 | Deployer awareness of AI systems in use | [AI Apps](../modules/ai-apps.md) — incl. shadow-AI discovery via SSO | Implemented |
| Art. 9 | Continuous risk management, findings managed to closure | [Tasks](../modules/tasks.md) — owner, SLA, entity link | Implemented |
| Art. 9 | Defined, risk-proportionate testing regime | [Eval Techniques](../modules/eval-techniques.md) — cadence, currency, coverage | Implemented |
| Art. 9 | Blast-radius sizing of agent capabilities | [MCP Gateway](../modules/mcp-gateway.md) — risk tier, side effects, data ceiling | Implemented |
| Art. 10 | Data governance — provenance of data crossing boundaries | [Integrations](../modules/integrations.md) — `data_flows`, direction, source system | Implemented |
| Art. 12 | Record-keeping across governance actions | All modules above via `logAction`; soft-delete preserves evidence | Implemented |
| Art. 13 | Transparency — simulated vs measured output distinguishable | [Playground](../modules/playground.md) — explicit simulation labelling | Implemented |
| Art. 13 / 50 | Outward transparency and subprocessor disclosure | [Trust Center](../modules/trust-center.md) | Implemented |
| Art. 14 | Human oversight over autonomous action | [MCP Gateway](../modules/mcp-gateway.md) — `requires_hitl`, agent allow-lists; [Tasks](../modules/tasks.md) — HITL reviews | Implemented |
| Art. 15 | Accuracy, robustness — pipeline and tool-surface health | [Integrations](../modules/integrations.md) health/sync; [MCP Gateway](../modules/mcp-gateway.md) server health | Implemented |

### Notes for assessors

- **Human oversight is enforced at the capability layer, not only the prompt
  layer.** An MCP tool with an empty `allowed_agent_ids` array permits *no*
  agent; the interface states this rather than treating empty as unrestricted.
- **Simulated values never enter the evidence record.** The Playground labels its
  output on screen and directs users to Live Inference Traces for measured
  telemetry.
- **Secrets are never recoverable.** Webhook signing secrets are stored as sha256
  digests with a display prefix only (Art. 15 robustness; GDPR Art. 32).
- **"Not measured" is distinguishable from "measured zero"** throughout the UI —
  a null metric renders as `—`. This matters when a figure is cited as evidence.

---

## Module Coverage — Privacy & Statutory Records

Added 2026-08-16 with the PRIVACY group and TD-001 Tier 1 migrations. These
modules are primarily GDPR artefacts, but each carries an AI Act dependency
because the processing they document is performed *by* the governed AI systems.

| Article | Requirement | Evidence-producing module | Status |
|---|---|---|---|
| Art. 10 | Data governance — provenance and lawfulness of training/operational data | [RoPA](../modules/ropa.md) — legal basis, categories, retention per activity | Implemented |
| Art. 10 | Cross-border data handling | [TIA](../modules/transfer-impact-assessment.md) — mechanism and supplementary measures per transfer | Implemented |
| Art. 9 | Risk management for high-risk processing | [DPIA](../modules/dpia.md) — inherent vs residual risk, mitigations | Implemented |
| Art. 12 | Record-keeping | All privacy modules audit-logged via `logAction`; DPIA soft-deleted so superseded assessments survive | Implemented |
| Art. 14 | Human oversight over automated decisions | [DPIA](../modules/dpia.md) — DPIA-2026-001 records mandatory human review of every decline as the mitigation that makes residual risk acceptable | Implemented |
| Art. 26 | Deployer obligations — knowing what the system does with personal data | [DSR](../modules/dsr-consent.md) — `linked_model_ids` makes a rights request actionable against real systems | Implemented |
| Art. 9 / 15 | Control effectiveness and testing currency | [Compliance Controls](../modules/controls-control-testing.md) — status, test currency, evidence counts | Implemented |

### GDPR articles carried by these modules

| Article | Module | Note |
|---|---|---|
| Art. 6 / 7 | Consent | Legal basis per activity; consent evidence with the AI systems it covers |
| Art. 12(3) | DSR | One-month clock derived from `due_date`; null renders "no deadline set", never 0 |
| Arts. 15–22 | DSR | Access, rectification, erasure, restriction, portability, objection |
| Art. 22 | DPIA | Automated decisions with legal effect assessed before processing |
| Art. 30 | RoPA | The register a supervisory authority can demand on request |
| Art. 35 | DPIA | Assessment before high-risk processing begins |
| Art. 36 | DPIA | Prior consultation **computed** from residual risk, not asserted |
| Chapter V | TIA | Transfer mechanism; a missing mechanism is flagged as unlawful |

### Notes for assessors

- **The Art. 36 trigger is derived, not declared.** An assessment with residual
  `high`/`critical` risk and no consultation date is flagged until one or the
  other changes. The register cannot quietly disagree with the obligation.
- **A missing transfer mechanism is represented by absence, not by a "none"
  option.** The vocabulary has no `none` member, so an unlawful transfer cannot
  be recorded as a deliberate choice — it shows as unset and is counted.
- **Rights requests resolve to real systems.** `dsar_requests.linked_model_ids`
  and `consent_records.linked_model_ids` mean an erasure request names the
  models that hold the data, rather than a free-text note. The parallel
  name-array columns that once sat beside them were dropped in
  `20260816_privacy_retire_denormalised_system_names.sql` — they had drifted
  from the model registry and were mislabelling links.

---

## Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability

Added 2026-08-16 with the TPRM / supply-chain / ESG rollout. Before that date
none of these twelve modules appeared in this mapping, and none was capable of
supporting the obligations below: they rendered from in-file mocks keyed by
business codes, so no supply-chain or third-party claim could be attached to the
model it described.

| Article | Obligation | Module & backing | Status |
|---|---|---|---|
| Art. 12 | Record-keeping — state changes carry a real actor | All twelve modules call `logAction` on create/update/delete; the previous code called it **zero** times and attributed attestation signatures to a hardcoded name | Implemented |
| Art. 13 | Transparency — provider information about the system | [AIBOM](../modules/aibom.md) — `aibom_records` with `model_id`, components (PURL/SPDX), and the model-card / Annex IV document reference | Implemented |
| Art. 15 | Accuracy & robustness — known weaknesses in components | [AIBOM](../modules/aibom.md) — `aibom_vulnerabilities` rows (CVE id, CVSS, fixed version, source feed, `scanned_at`); `last_scanned_at IS NULL` renders "never scanned", not zero CVEs | Implemented |
| Art. 10 | Data governance — provenance of training and operational data | [Provenance](../modules/provenance.md) — typed `provenance_edges` (`trained_on`, `derived_from`) with `valid_from`/`valid_to`, so "what fed this model on the date of the incident" is answerable | Implemented |
| Art. 25 | Responsibilities along the AI value chain | [Vendor Registry](../modules/vendor-registry.md) — `vendors` with inherent/residual risk, sub-processor count, fourth-party exposure and exit plan; [Attestations](../modules/supply-chain-attestations.md) resolve to a `subject_id` | Implemented |
| Art. 27 | Fundamental rights impact — third-party dependencies | [TPRM Workspace](../modules/tprm-workspace.md) — criticality tiering and reassessment cadence over real vendor records | Implemented |
| Art. 72 | Post-market monitoring — supplier performance over time | [Vendor SLA](../modules/vendor-sla.md) — numeric thresholds with status **derived** by `vendor_sla_status`; an unmeasured SLA reports `unmeasured`, never `healthy` | Implemented |
| Art. 73 | Serious incident reporting — supplier-caused incidents | `vendor_slas.linked_incident_ids` → `incidents.id` | Implemented |
| — | Sustainability disclosure (not an AI Act obligation) | [Carbon](../modules/carbon-ledger.md) / [Energy](../modules/energy-efficiency.md) / [ESG Reports](../modules/esg-reports.md) — recorded here as **out of scope for the AI Act**; these serve CSRD/ESRS E1, GHG Protocol and ISO 14064-1, which are not mapped in this document | Out of scope (reason recorded) |

### Notes for assessors

- **Verification state is never asserted.** `declared_digest` holds whatever a
  producer supplied and is evidence of nothing; `verification_status`,
  `verified_at`, `verified_by` and `verification_method` are written only by a
  verifier. No verification is performed yet, so every record reads
  `unverified` — see TD-011. The prior implementation rendered "Signature Valid"
  whenever a free-text field was not the literal string `PENDING`, and generated
  its "SHA-256" with `Math.random()`.
- **Validity and breach are computed, not stored.** Attestation validity comes
  from `valid_until` via `supply_chain_attestation_status`; SLA breach comes from
  numeric thresholds via `vendor_sla_status`. Previously both were authored
  literals, so an attestation could report "Within Validity Period: PASS" after
  it had expired.
- **Absence is visible.** A never-scanned AIBOM, an unmeasured SLA and an
  unassessed vendor render as `—`, not as `0` or a green default. A carbon
  figure with no measurement renders as `—` rather than `0.0 tCO₂e`, which would
  read as carbon-neutral.
- **Estimates are labelled and cited.** Every derived carbon figure carries
  `measurement_method` (`measured` / `calculated` / `estimated`) and an
  `emission_factor_id` resolving to a factor with source, publication year,
  version and region.

### Autonomous privacy agents (added 2026-08-16)

| Article | Requirement | Where it is met |
|---|---|---|
| Art. 12 | Record-keeping over automated action | Every agent write carries `source`, `auto_generated`, `created_by_agent` and `source_event_id`, so an auditor can trace a record back to the event that caused it |
| Art. 14 | Human oversight | `PrivacyPostureAgent` and `ConsentWithdrawalAgent` open risks and tasks; neither closes a risk, accepts a residual risk, nor edits a statutory record. Judging a transfer lawful or a residual risk acceptable stays a human decision — the agent only ensures it is asked for |
| Art. 12 | Honest reporting of automated steps | Agents return `failed` when a write does not land. `DSRImpactAgent` previously reported `succeeded` over a rejected insert, so the mesh recorded a completed Art. 34 notification step that had produced no record |

---

## Module Coverage — Executive Surfaces (Dashboard, CISO, Board Report, Peer Benchmarking)

Added 2026-08-17. These four surfaces own no data; they summarise the governed
tables. They appear here because they are what an executive or an assessor reads
first, and because until this date the front page and the board pack rendered
figures that no query produced.

| Article | Obligation | Module & backing | Status |
|---|---|---|---|
| Art. 12 | Record-keeping — traceability of governance reporting | [Board Report](../modules/executive-surfaces.md) export calls `logAction` with the authenticated actor, so the moment a figure leaves the platform is recorded | Implemented |
| Art. 13 | Transparency — the reader can tell what a figure is | Every export carries a provenance block: org, period, `data_as_of` timestamp, source tables, and an explicit statement that figures are point-in-time counts, **not audited**, and carry **no trend because no snapshots are stored** | Implemented |
| — | Reporting surfaces are not themselves a regulated obligation | The underlying obligations are mapped in the module docs of the sources these pages read (`risks`, `incidents`, `ai_models`, `controls`, `frameworks`, attestations) | N/A — derived views |

### Notes for assessors

- **A figure with no backing query is not rendered.** Not greyed, not footnoted,
  not labelled "simulated" — removed, with an honest empty state naming what is
  missing. Anything you see on these pages resolves to records you can open.
- **No trend is claimed anywhere.** The platform stores no posture snapshots, so
  quarter-over-quarter movement cannot be computed and is not approximated. A
  previous version asserted a "↓2.6 pts vs Q4 2025" improvement against a
  baseline the schema has no way to hold.
- **Unmeasured never reads as compliant or as failing.** Averages exclude
  unscored rows and state the true denominator; a null renders `—` in a neutral
  tone with no arc and no bar. Previously an unscored framework was averaged in
  as `0`, producing a 37% figure rendered in the success colour against a
  denominator label that was half the real one.
- **A failed query is an error, never an empty state.** The Dashboard reports
  "N of 11 data sources unavailable" rather than rendering zeros and greens.
- **Peer Benchmarking is inert by design.** There is no peer-contribution
  pipeline, so the module shows no peer figures and says why. Claims about an
  anonymised peer network were removed rather than relabelled — see the module
  doc for what was asserted and why it could not stand.

## Demo Data Import (Settings)

The one-button demo import ([module doc](../modules/demo-import.md)) is a
platform utility, not an AI system, so most obligations are N/A. Two points are
in scope:

| Article | Obligation | Module & backing | Status |
|---|---|---|---|
| Art. 12 | Record-keeping — state changes are attributable | Every underlying service write logs itself, and the overall `import` / `remove` outcome (including failures) writes a `settings`/`demo_import` audit entry via `logAction` | Implemented |
| — | Demo data must never masquerade as real records or measurements | Every row carries `metadata.demo_seed = true`, names are "(Demo)"-labelled with role-label owners and `.example` domains; estimates cite `emission_factors` rows or are skipped; attestations stay `pending`, AIBOMs `draft`, ESG reports `draft` with no approver; no audit events are ever seeded | N/A — utility, honesty constraints enforced in `demoImportService.ts` |

## Guided Setup ("Get started")

The guided-setup checklist ([module doc](../modules/guided-setup.md)) is a
read-only onboarding surface, not an AI system, so it has no obligations of its
own. It is in scope only insofar as it points the user at the modules that carry
the obligations, and it must not itself weaken any control.

| Article | Obligation | How Guided Setup relates | Status |
|---|---|---|---|
| Art. 9 / 11 / 12 / 25 | Make the record-keeping, risk-management, technical-documentation and value-chain duties reachable | Each step deep-links to the module that satisfies the obligation (register a model, record a risk, attach evidence, link a vendor's models, run a conformity assessment) | Supporting surface |
| Art. 12 (audit) | State-changing actions are attributable | **N/A — read-only.** The module writes to no table; it derives display state from existing rows and takes no state-changing action, so there is nothing to audit-log | N/A — read-only |
| Art. 14 (human oversight) | Human control over autonomous action | **N/A — non-autonomous.** Every step is advisory and skippable; the module never acts on the user's behalf | N/A — non-autonomous |
| — | Onboarding must not fake progress | Step done-state is **derived from real queries**, never stored — a step is "done" only when the table proves it; a source that cannot be checked renders "Unknown", never done and never not-done; the Overview card persists only a dismissal preference, never step state | N/A — utility, enforced in `useSetupProgress.ts` |
