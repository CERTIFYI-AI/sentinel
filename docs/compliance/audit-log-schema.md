# Audit Log Schema

> **Purpose**: Documents every field in the `sentinel_audit_log` table and the hash chain integrity model.

## Table Definition

The audit log is an append-only table. No `UPDATE` or `DELETE` operations are permitted. The table uses TimescaleDB hypertable partitioning by month.

```sql
CREATE TABLE sentinel_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES sentinel_tenants(id),
  request_id      TEXT NOT NULL UNIQUE,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Request data
  model_requested TEXT NOT NULL,
  model_used      TEXT NOT NULL,
  prompt_hash     TEXT NOT NULL,
  prompt_tokens   INTEGER,
  
  -- Response data
  response_hash   TEXT NOT NULL,
  response_tokens INTEGER,
  
  -- Sanitizer results
  pii_detected    BOOLEAN NOT NULL DEFAULT false,
  pii_entities    JSONB DEFAULT '[]',
  injection_score FLOAT NOT NULL DEFAULT 0.0,
  injection_blocked BOOLEAN NOT NULL DEFAULT false,
  
  -- Verification results
  trust_score     FLOAT,
  claim_scores    JSONB DEFAULT '[]',
  golden_source_hits INTEGER DEFAULT 0,
  nli_entailment_mean FLOAT,
  semantic_similarity_mean FLOAT,
  
  -- Intervention
  intervention    TEXT NOT NULL DEFAULT 'NONE',
  regeneration_count INTEGER DEFAULT 0,
  provider_cascade TEXT[] DEFAULT '{}',
  
  -- HITL
  hitl_queued     BOOLEAN NOT NULL DEFAULT false,
  hitl_job_id     UUID,
  hitl_decision   TEXT,
  hitl_reviewer   TEXT,
  hitl_decided_at TIMESTAMPTZ,
  
  -- Policy
  policy_version  INTEGER NOT NULL,
  
  -- Hash chain
  previous_hash   TEXT,
  entry_hash      TEXT NOT NULL,
  
  -- Performance
  latency_ms      INTEGER,
  sanitizer_ms    INTEGER,
  verification_ms INTEGER,
  provider_ms     INTEGER
);

CREATE INDEX idx_audit_tenant_time ON sentinel_audit_log (tenant_id, timestamp DESC);
CREATE INDEX idx_audit_request_id ON sentinel_audit_log (request_id);
CREATE INDEX idx_audit_trust_score ON sentinel_audit_log (trust_score);
CREATE INDEX idx_audit_intervention ON sentinel_audit_log (intervention);
```

## Field Reference

### Identity Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Auto-generated primary key. |
| `tenant_id` | UUID | Tenant that owns this request. Foreign key to `sentinel_tenants`. |
| `request_id` | TEXT | Unique request identifier. Returned in `X-Sentinel-Request-Id` header. Format: `req_` + 12 alphanumeric characters. |
| `timestamp` | TIMESTAMPTZ | When the request was processed. UTC. |

### Request Fields

| Field | Type | Description |
|---|---|---|
| `model_requested` | TEXT | Model the client requested (e.g., `gpt-4o-mini`). |
| `model_used` | TEXT | Model that actually served the response. Differs from `model_requested` if an upgrade intervention occurred. |
| `prompt_hash` | TEXT | SHA-256 hash of the sanitized prompt. The raw prompt is not stored. |
| `prompt_tokens` | INTEGER | Token count of the prompt. Null if the provider did not return usage data. |

### Response Fields

| Field | Type | Description |
|---|---|---|
| `response_hash` | TEXT | SHA-256 hash of the response content. |
| `response_tokens` | INTEGER | Token count of the response. Null if the provider did not return usage data. |

### Sanitizer Fields

| Field | Type | Description |
|---|---|---|
| `pii_detected` | BOOLEAN | `true` if any PII entity was found in the prompt. |
| `pii_entities` | JSONB | Array of detected entity types. Example: `["PERSON", "EMAIL_ADDRESS"]`. Does not contain the actual PII values. |
| `injection_score` | FLOAT | Cosine similarity between the prompt and known injection patterns. Range: 0.0 to 1.0. |
| `injection_blocked` | BOOLEAN | `true` if `injection_score` exceeded the tenant's `injection_threshold`. |

### Verification Fields

| Field | Type | Description |
|---|---|---|
| `trust_score` | FLOAT | Weighted Trust Score. Range: 0.0 to 1.0. Null if verification was skipped. |
| `claim_scores` | JSONB | Per-claim breakdown. Each element: `{"claim": "...", "similarity": 0.8, "entailment": 0.9, "source_doc_id": "..."}`. |
| `golden_source_hits` | INTEGER | Number of claims with at least one Golden Source match above similarity threshold. |
| `nli_entailment_mean` | FLOAT | Mean NLI entailment probability across all claims. |
| `semantic_similarity_mean` | FLOAT | Mean semantic similarity across all claims. |

### Intervention Fields

| Field | Type | Description |
|---|---|---|
| `intervention` | TEXT | Action taken. One of: `NONE`, `REGENERATE`, `UPGRADE`, `HITL`, `BLOCK`. |
| `regeneration_count` | INTEGER | Number of regeneration attempts before the final response. |
| `provider_cascade` | TEXT[] | Ordered list of providers attempted. Example: `{"gpt-4o-mini", "gpt-4o"}`. |

### HITL Fields

| Field | Type | Description |
|---|---|---|
| `hitl_queued` | BOOLEAN | `true` if the request was sent to the HITL queue. |
| `hitl_job_id` | UUID | HITL queue job ID. Null if not queued. |
| `hitl_decision` | TEXT | Reviewer decision. One of: `APPROVE`, `REJECT`, `EDIT`, `TIMEOUT`. Null if not reviewed. |
| `hitl_reviewer` | TEXT | Email or ID of the reviewer. Null if not reviewed. |
| `hitl_decided_at` | TIMESTAMPTZ | When the reviewer made a decision. Null if not reviewed. |

### Hash Chain Fields

| Field | Type | Description |
|---|---|---|
| `previous_hash` | TEXT | `entry_hash` of the preceding audit entry. Null for the first entry. |
| `entry_hash` | TEXT | SHA-256 hash of: `previous_hash + request_id + response_hash + trust_score + intervention + timestamp`. |

### Performance Fields

| Field | Type | Description |
|---|---|---|
| `latency_ms` | INTEGER | Total request latency in milliseconds. |
| `sanitizer_ms` | INTEGER | Time spent in the sanitizer layer. |
| `verification_ms` | INTEGER | Time spent in the verification layer. |
| `provider_ms` | INTEGER | Time spent waiting for the LLM provider. |

## Hash Chain Integrity

Each audit entry hashes the previous entry's hash into its own hash. This creates a chain where modifying or deleting any entry breaks the chain from that point forward.

### Computing the Hash

```python
import hashlib

def compute_entry_hash(previous_hash, request_id, response_hash, trust_score, intervention, timestamp):
    payload = f"{previous_hash or ''}|{request_id}|{response_hash}|{trust_score}|{intervention}|{timestamp.isoformat()}"
    return hashlib.sha256(payload.encode()).hexdigest()
```

### Verifying Integrity

```bash
curl http://localhost:8000/api/audit/integrity \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "valid": true,
  "entries_checked": 15234,
  "first_entry": "2025-01-01T00:00:00Z",
  "last_entry": "2025-01-15T14:30:00Z",
  "duration_ms": 450
}
```

If a break is detected:

```json
{
  "valid": false,
  "break_at": "req_abc123def456",
  "break_timestamp": "2025-01-10T08:15:00Z",
  "entries_checked": 8901,
  "expected_hash": "a1b2c3...",
  "actual_hash": "d4e5f6..."
}
```

## Querying the Audit Log

### By Request ID

```bash
curl "http://localhost:8000/api/audit?request_id=req_abc123" \
  -H "Authorization: Bearer $TOKEN"
```

### By Date Range

```bash
curl "http://localhost:8000/api/audit?from=2025-01-01&to=2025-01-31&limit=100" \
  -H "Authorization: Bearer $TOKEN"
```

### By Intervention Type

```bash
curl "http://localhost:8000/api/audit?intervention=HITL&from=2025-01-01" \
  -H "Authorization: Bearer $TOKEN"
```

## Retention

Audit log entries cannot be deleted. For storage management:

- TimescaleDB compression reduces storage by 80-90% for partitions older than 30 days.
- Archive partitions to object storage (S3, GCS) for long-term retention.
- The audit table supports up to 100M entries before query performance degrades without additional index tuning.

## Next Steps

- [Evidence Export](evidence-export.md) — Export audit data for compliance reports.
- [Frameworks](frameworks.md) — Map audit fields to compliance requirements.
- [Monitoring](../ops/monitoring.md) — Set up alerts on audit log patterns.
