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
| Art. 26 | Deployer obligations — knowing what the system does with personal data | [DSR](../modules/dsr-consent.md) — `ai_systems_affected` makes a rights request actionable against real systems | Implemented |
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
- **Rights requests resolve to real systems.** `ai_systems_affected` and
  `linked_model_ids` mean an erasure request names the models that hold the
  data, rather than a free-text note.
