# SOC 2 Trust Services Criteria Mapping

This document maps Sentinel's runtime controls to the AICPA Trust Services Criteria (TSC) for SOC 2 Type II audits.

## Availability (A Series)

| Criteria | Description | Sentinel Control | Evidence |
|----------|-------------|-----------------|----------|
| A1.1 | Current processing capacity | Health endpoint `/health`, metrics | Dashboard availability charts |
| A1.2 | Environmental protections | Docker + resource limits in `docker-compose.yml` | Container config |
| A1.3 | Recovery from environmental failures | Circuit breaker L3 HITL fallback | Audit log escalation entries |

## Confidentiality (C Series)

| Criteria | Description | Sentinel Control | Evidence |
|----------|-------------|-----------------|----------|
| C1.1 | Identify confidential information | Presidio PII detection in `sentinel/layers/sanitizer.py` | Sanitization audit logs |
| C1.2 | Dispose of confidential information | PII masking before LLM transmission | Masked request logs |

## Processing Integrity (PI Series)

| Criteria | Description | Sentinel Control | Evidence |
|----------|-------------|-----------------|----------|
| PI1.1 | Complete and accurate processing | Trust score verification pipeline | Per-request trust scores |
| PI1.2 | Processing includes authorisation | API key validation in proxy middleware | Auth failure audit logs |
| PI1.3 | Outputs are complete and accurate | RAG + NLI cross-check in `sentinel/layers/verifier.py` | Verification audit entries |
| PI1.4 | Inputs/outputs stored completely | Append-only audit log with SHA-256 chain | Audit log exports |
| PI1.5 | System boundaries maintained | Proxy intercept layer, no direct LLM access | Architecture diagram |

## Common Criteria (CC Series)

| Criteria | Description | Sentinel Control | Evidence |
|----------|-------------|-----------------|----------|
| CC2.1 | COSO — information and communication | README, CHANGELOG, docs/ | Documentation commits |
| CC6.1 | Logical access controls | API key authentication, secret management | `.env.example`, configs |
| CC6.2 | Prior to registration | N/A — no user registration in open-source core | — |
| CC6.6 | Logical access over network | TLS termination at proxy, no plaintext secrets in logs | Sanitizer logs |
| CC7.1 | Detect anomalies | Trust score anomaly alerts in dashboard | Dashboard alert config |
| CC7.2 | Monitor system components | SHA-256 hash chain audit trail | `sentinel/auditor.py` |
| CC7.3 | Evaluate security events | HITL escalation queue for low-trust responses | Escalation audit entries |
| CC8.1 | Change management | GitHub Actions CI/CD with ruff + mypy gates | `.github/workflows/ci.yml` |
| CC9.1 | Risk mitigation | Circuit breaker cascade L0–L3 | `sentinel/layers/circuit_breaker.py` |
| CC9.2 | Vendor risk management | Provider abstraction layer in `sentinel/providers/` | Provider configs |

## Evidence Collection Procedure

1. Export audit logs: `python scripts/export_audit_evidence.py --format json --period Q4-2025`
2. Export cost report: `python scripts/export_audit_evidence.py --format csv --report costs`
3. Export trust score distribution: via dashboard > Reports > Trust Score Distribution
4. Provide Docker config and CI workflow files as system description evidence

## Related Documents

- [Audit Log Schema](audit-log-schema.md)
- [Evidence Export](evidence-export.md)
- [Security Model](../security/security-model.md)
