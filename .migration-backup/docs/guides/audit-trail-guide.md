# Audit Trail Guide

Sentinel's audit trail is an append-only, SHA-256 hash-chained log of every event in the system. This guide explains how it works, how to query it, and how to use it as compliance evidence.

## How It Works

Every request processed by Sentinel generates one or more audit entries. Each entry:

1. Is assigned a unique `sentinel_request_id` (UUID v4)
2. Records the full event payload (sanitized — no raw PII)
3. Contains a `previous_hash` field pointing to the SHA-256 hash of the previous entry
4. Is itself hashed and stored as `entry_hash`

This creates a chain: modifying any historical entry changes its hash, breaking the chain at that point and making tampering immediately detectable.

## Entry Types

| Event | Description |
|-------|-------------|
| `request.received` | New request arrived at proxy |
| `pii.detected` | PII entities found and masked |
| `pii.clean` | No PII detected |
| `verification.started` | Verifier layer started |
| `verification.completed` | Trust score computed |
| `circuit_breaker.l0_pass` | Response passed threshold |
| `circuit_breaker.l1_cross_check` | L1 cross-check triggered |
| `circuit_breaker.l2_regenerate` | L2 regeneration triggered |
| `circuit_breaker.l3_hitl_escalation` | Escalated to human review |
| `hitl.approved` | Human operator approved response |
| `hitl.rejected` | Human operator rejected response |
| `response.delivered` | Response sent to caller |
| `chain.integrity_verified` | Hash chain integrity check passed |

## Querying the Audit Log

### Via Dashboard

Navigate to **Audit Log** in the dashboard sidebar. Filter by:
- Date range
- Trust score range (e.g., `< 0.70` to find all escalations)
- Event type
- Sentinel request ID

### Via API

```bash
# Get entries for a specific request
curl http://localhost:8000/api/v1/audit/{sentinel_request_id}

# Get all HITL escalations in the last 7 days
curl "http://localhost:8000/api/v1/audit?event=circuit_breaker.l3_hitl_escalation&days=7"

# Verify hash chain integrity
curl http://localhost:8000/api/v1/audit/verify-chain
```

### Via Script

```bash
# Export last 30 days as JSON
python scripts/export_audit_evidence.py --format json --days 30 --output audit_export.json

# Export as CSV for Excel
python scripts/export_audit_evidence.py --format csv --days 30 --output audit_export.csv

# Verify chain integrity
python scripts/export_audit_evidence.py --verify-chain
```

## Chain Integrity Verification

```python
# Programmatic verification
from sentinel.auditor import AuditChainVerifier

verifier = AuditChainVerifier(db_url=settings.DATABASE_URL)
result = await verifier.verify_chain(from_date="2025-01-01")

print(f"Chain intact: {result.is_intact}")
print(f"Entries verified: {result.entries_checked}")
print(f"First broken entry: {result.first_violation}")  # None if intact
```

## Compliance Evidence Packages

For SOC 2 or ISO 42001 audits, generate a complete evidence package:

```bash
# Q4 2025 SOC 2 evidence package
python scripts/export_audit_evidence.py \
  --format json \
  --from 2025-10-01 \
  --to 2025-12-31 \
  --include chain-verification \
  --include trust-score-summary \
  --include pii-detection-summary \
  --include hitl-resolution-log \
  --output evidence/soc2-q4-2025.zip
```

## Retention Policy

By default, audit entries are retained indefinitely. Configure retention in:

```yaml
# configs/sentinel.yaml
audit:
  retention_days: 2555  # 7 years (SOC 2 recommendation)
  compress_after_days: 90
  archive_to_s3: false  # Set true with s3_bucket config for archival
```

## Related Documents

- [Audit Log Schema](../compliance/audit-log-schema.md)
- [Evidence Export](../compliance/evidence-export.md)
- [SOC 2 Mapping](../compliance/soc2-mapping.md)
- [ISO 42001 Mapping](../compliance/iso-42001-mapping.md)
