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
