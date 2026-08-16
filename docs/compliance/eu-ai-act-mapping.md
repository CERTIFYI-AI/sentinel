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
