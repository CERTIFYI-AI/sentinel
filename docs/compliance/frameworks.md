# Compliance Framework Mappings

> **Purpose**: Maps Sentinel capabilities to specific requirements in EU AI Act, ISO 42001, SOC 2, and NIST AI RMF.

Sentinel does not make you compliant. Sentinel produces evidence artifacts that auditors need. This document shows which Sentinel function maps to which framework requirement.

## EU AI Act

The EU AI Act classifies AI systems by risk level. Sentinel addresses requirements for high-risk AI systems (Title III, Chapter 2).

| Article | Requirement | Sentinel Function | Evidence Artifact |
|---|---|---|---|
| Art. 9(2) | Risk management — identify and mitigate risks | Trust Score verification pipeline | Audit log with per-claim Trust Scores |
| Art. 10(2) | Data governance — training data quality | Golden Source management | Golden Source document inventory with checksums |
| Art. 11(1) | Technical documentation | Architecture docs, API reference | `docs/` folder, OpenAPI spec |
| Art. 12(1) | Record-keeping — automatic logging | Auditor layer (hash-chained logs) | `GET /api/audit` with integrity verification |
| Art. 13(1) | Transparency — inform users of AI interaction | `X-Sentinel-*` response headers | Response headers in audit log |
| Art. 14(1) | Human oversight — ability to intervene | HITL queue, circuit breaker | HITL review records, intervention audit entries |
| Art. 14(4) | Human oversight — override capability | HITL approve/reject/edit | HITL decision audit entries |
| Art. 15(1) | Accuracy — appropriate levels of accuracy | Trust Score with NLI verification | Per-request Trust Score with claim breakdown |
| Art. 15(3) | Robustness — resilient to errors | Circuit breaker, provider fallback | Circuit breaker state transitions in audit log |
| Art. 15(4) | Cybersecurity — protect against manipulation | Sanitizer (PII masking, injection detection) | PII detection results, injection scores |

### What Sentinel Does Not Cover

- Art. 9(1): Risk management system design. Sentinel provides tooling, not the management system itself.
- Art. 10(1): Training data governance for the underlying LLM. Sentinel governs the application layer, not model training.
- Art. 16-29: Provider and deployer obligations. These are organisational, not technical.

## ISO 42001 (AI Management System)

| Clause | Requirement | Sentinel Function | Evidence Artifact |
|---|---|---|---|
| 6.1.2 | AI risk assessment | Trust Score thresholds per tenant | Policy configuration with threshold justification |
| 6.1.4 | AI risk treatment | Circuit breaker interventions | Intervention audit entries |
| 8.2 | AI risk assessment (operational) | Per-request Trust Score computation | Audit log with trust_score field |
| 8.4 | AI system operation and monitoring | Prometheus metrics, audit log | `/metrics` endpoint, audit log queries |
| 9.1 | Monitoring, measurement, analysis | Trust Score histograms, latency metrics | Grafana dashboards, metric exports |
| 9.2 | Internal audit | Audit log integrity verification | `GET /api/audit/integrity` results |
| A.5.3 | Transparency of AI systems | Response headers, audit log | `X-Sentinel-Trust-Score` header |
| A.6.2.2 | Data quality for AI systems | Golden Source with checksums | Document inventory, embedding coverage |
| A.6.2.6 | AI system testing and validation | CI/CD integration tests | Test results, retrieval quality reports |
| A.8.2 | Logging and monitoring of AI systems | Append-only hash-chained audit log | Full audit trail per request |

## SOC 2 (Trust Services Criteria)

| Criteria | Requirement | Sentinel Function | Evidence Artifact |
|---|---|---|---|
| CC6.1 | Logical access controls | JWT authentication, tenant isolation | Auth configuration, tenant-scoped queries |
| CC6.3 | Role-based access | API key scoping per tenant | Tenant configuration audit |
| CC7.1 | Detect and respond to threats | Injection detection, PII masking | Sanitizer audit entries with threat scores |
| CC7.2 | Monitor system components | Health endpoint, Prometheus metrics | `/health` responses, metric time series |
| CC7.3 | Evaluate detected threats | Trust Score evaluation, intervention decisions | Audit log with intervention field |
| CC8.1 | Change management | CI/CD pipeline, policy versioning | Policy version in audit log, deployment history |
| PI1.1 | Processing integrity — completeness | Hash-chained audit log | Integrity check results |
| PI1.2 | Processing integrity — accuracy | Trust Score verification | Per-claim verification breakdown |
| PI1.4 | Processing integrity — timely processing | Latency metrics | `sentinel_request_duration_seconds` histogram |
| C1.1 | Confidentiality | PII masking, Fernet encryption | Redacted prompts in audit log |

## NIST AI RMF (AI Risk Management Framework)

| Function | Category | Sentinel Function | Evidence Artifact |
|---|---|---|---|
| GOVERN 1.1 | Policies and procedures | Policy configuration per tenant | Policy JSON with version history |
| GOVERN 1.5 | Ongoing monitoring | Prometheus metrics, audit log | Metric exports, audit queries |
| MAP 2.1 | Intended context of use | Tenant-scoped configuration | Per-tenant policy and Golden Source |
| MAP 2.3 | Scientific integrity | NLI-based fact verification | Entailment scores per claim |
| MEASURE 2.3 | AI system performance | Trust Score computation | Trust Score distribution over time |
| MEASURE 2.5 | Bias and fairness testing | Per-claim breakdown by topic | Claim-level audit data |
| MEASURE 2.6 | Reliability testing | Circuit breaker, integration tests | Circuit breaker logs, CI test results |
| MANAGE 1.1 | Risk response | Intervention cascade | Intervention audit entries |
| MANAGE 2.1 | Risk prioritisation | Trust Score thresholds | Policy threshold configuration |
| MANAGE 4.1 | Continuous improvement | Trust Score trend analysis | Metric time series, Grafana dashboards |

## Generating Compliance Reports

Export evidence for a specific framework:

```bash
# Export EU AI Act evidence for a date range
curl "http://localhost:8000/api/audit/export?framework=eu-ai-act&from=2025-01-01&to=2025-01-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o eu-ai-act-evidence-jan-2025.json
```

The export includes:
- Audit log entries with claim-level breakdowns.
- Trust Score statistics (mean, median, p5, p95).
- Intervention counts by type.
- PII detection summary.
- Golden Source coverage metrics.

See [Evidence Export](evidence-export.md) for format details and automation.

## Next Steps

- [Audit Log Schema](audit-log-schema.md) — Understand every field in the audit log.
- [Evidence Export](evidence-export.md) — Automate compliance report generation.
- [Security Model](../security/security-model.md) — Review threat model and data protection.
