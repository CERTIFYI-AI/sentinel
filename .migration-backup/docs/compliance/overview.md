# Compliance Overview

Sentinel is designed from the ground up to support AI governance and compliance programs. This document explains how Sentinel maps to major regulatory frameworks and how its runtime controls generate the evidence your auditors need.

## Supported Frameworks

| Framework | Coverage | Mapping Document |
|-----------|----------|------------------|
| ISO 42001 | Full clause mapping | [iso-42001-mapping.md](./iso-42001-mapping.md) |
| EU AI Act | Article-by-article | [eu-ai-act-mapping.md](./eu-ai-act-mapping.md) |
| SOC 2 Type II | Trust Services Criteria | [soc2-mapping.md](./soc2-mapping.md) |
| GDPR / HIPAA | PII handling controls | [gdpr-hipaa-pii.md](./gdpr-hipaa-pii.md) |

## How Sentinel Supports Compliance

### Runtime Evidence Generation

Every request processed by Sentinel produces a tamper-proof audit log entry. The SHA-256 hash chain means any modification to historical records is immediately detectable. This satisfies the "documented evidence" requirements across all supported frameworks.

### Automated Controls

- **PII Sanitization** — Presidio-based detection and masking before data reaches the LLM (GDPR Art. 25, HIPAA §164.514)
- **Factual Verification** — RAG + NLI cross-check with trust score (ISO 42001 Clause 8.4, EU AI Act Art. 9)
- **Human-in-the-Loop** — Escalation queue for responses below threshold (EU AI Act Art. 14)
- **Audit Trail** — Append-only, hash-chained log with full request/response payloads (SOC 2 CC7.2)

### Evidence Export

Sentinel can export audit evidence in formats accepted by auditors. See [evidence-export.md](./evidence-export.md) for export procedures and the [audit-log-schema.md](./audit-log-schema.md) for the full schema.

## Compliance by Use Case

### Healthcare AI (HIPAA)

1. Enable PII masking in `configs/sentinel.yaml` (`pii_detection.enabled: true`)
2. Set `trust_score_block_threshold: 0.90` for clinical applications
3. Export audit logs monthly for BAA documentation

### Financial Services (SOC 2)

1. Configure immutable audit storage (TimescaleDB with append-only policy)
2. Enable cost tracking for CC6.1 evidence
3. Use `scripts/export_audit_evidence.py` for quarterly SOC 2 evidence packages

### EU High-Risk AI (EU AI Act)

1. Register your system in the EU AI Act registry (external)
2. Configure HITL escalation for responses below 0.85 trust score
3. Enable the bias monitoring module in dashboard settings
4. Run `python scripts/run_eval.py` monthly for performance monitoring evidence

## Audit Log Schema

See [audit-log-schema.md](./audit-log-schema.md) for the complete schema definition including all fields, their types, and compliance relevance.

## Related Documents

- [Security Model](../security-model.md)
- [Architecture](../architecture.md)
- [SECURITY.md](../../SECURITY.md)
