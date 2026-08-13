# Writing Policies

> **Time**: 15 minutes. **Outcome**: A working trust policy that controls how Sentinel handles LLM responses.

## What Is a Policy?

A policy is a set of rules that tells Sentinel what to do when a Trust Score falls within a specific range. Policies control three behaviours:

1. **Pass-through**: Return the response to the client.
2. **Intervention**: Regenerate, upgrade to a better model, or queue for human review.
3. **Blocking**: Reject the response entirely.

Policies are defined per tenant. Each tenant can have one active policy.

## Policy Structure

Policies are stored in the `sentinel_tenants` table as JSON in the `policy` column.

```json
{
  "trust_thresholds": {
    "pass": 0.85,
    "regenerate": 0.60,
    "upgrade": 0.40,
    "hitl": 0.20,
    "block": 0.0
  },
  "max_regenerations": 2,
  "upgrade_model": "gpt-4o",
  "hitl_timeout_seconds": 300,
  "hitl_fallback": "best_candidate",
  "pii_entities": ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD"],
  "injection_threshold": 0.85,
  "blocked_topics": [],
  "require_golden_source": true
}
```

## Threshold Evaluation Order

Sentinel evaluates thresholds from highest to lowest:

| Trust Score Range | Action | Description |
|---|---|---|
| >= 0.85 | `NONE` | Response passes through unchanged. |
| 0.60 - 0.84 | `REGENERATE` | Retry with the same provider. Up to `max_regenerations` attempts. |
| 0.40 - 0.59 | `UPGRADE` | Retry with `upgrade_model`. |
| 0.20 - 0.39 | `HITL` | Queue for human review. |
| < 0.20 | `BLOCK` | Return 422 with error code `TRUST_SCORE_BELOW_MINIMUM`. |

If `require_golden_source` is `true` and the Golden Source is empty, all factual claims receive a 0.5 fallback score. Plan your thresholds accordingly.

## Creating a Policy via API

```bash
curl -X PUT http://localhost:8000/api/tenants/{tenant_id}/policy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trust_thresholds": {
      "pass": 0.85,
      "regenerate": 0.60,
      "upgrade": 0.40,
      "hitl": 0.20,
      "block": 0.0
    },
    "max_regenerations": 2,
    "upgrade_model": "gpt-4o",
    "hitl_timeout_seconds": 300,
    "pii_entities": ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER"]
  }'
```

Expected response:

```json
{
  "tenant_id": "your-tenant-id",
  "policy_version": 2,
  "updated_at": "2025-01-15T10:30:00Z"
}
```

Every policy update increments `policy_version`. The audit log records which policy version was active for each request.

## Policy Examples

### High-Security (Financial Services)

Strict thresholds. No tolerance for unverified claims. Human review for anything below 0.90.

```json
{
  "trust_thresholds": {
    "pass": 0.95,
    "regenerate": 0.90,
    "upgrade": 0.80,
    "hitl": 0.70,
    "block": 0.50
  },
  "max_regenerations": 3,
  "upgrade_model": "gpt-4o",
  "hitl_timeout_seconds": 600,
  "hitl_fallback": "block",
  "pii_entities": ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "IBAN_CODE", "US_SSN"],
  "injection_threshold": 0.70,
  "require_golden_source": true
}
```

Key choices:
- `hitl_fallback` is `block`, not `best_candidate`. If no human reviews within timeout, the response is rejected.
- `injection_threshold` is 0.70, lower than default. This catches more potential injection attempts at the cost of more false positives.
- PII entity list includes financial identifiers.

### Internal Knowledge Base (Low Risk)

Relaxed thresholds. Suitable for internal tools where responses are informational.

```json
{
  "trust_thresholds": {
    "pass": 0.70,
    "regenerate": 0.50,
    "upgrade": 0.30,
    "hitl": 0.10,
    "block": 0.0
  },
  "max_regenerations": 1,
  "upgrade_model": "gpt-4o-mini",
  "hitl_timeout_seconds": 120,
  "hitl_fallback": "best_candidate",
  "pii_entities": ["PERSON", "EMAIL_ADDRESS"],
  "injection_threshold": 0.85,
  "require_golden_source": false
}
```

Key choices:
- `require_golden_source` is `false`. Responses are scored even without golden source documents.
- Lower thresholds reduce unnecessary retries.
- Shorter HITL timeout with `best_candidate` fallback keeps responses fast.

## PII Entity Configuration

The `pii_entities` array controls which entity types Presidio detects and masks. Supported types:

| Entity | Example | Default |
|---|---|---|
| `PERSON` | John Smith | Yes |
| `EMAIL_ADDRESS` | john@example.com | Yes |
| `PHONE_NUMBER` | +1-555-0123 | Yes |
| `CREDIT_CARD` | 4111-1111-1111-1111 | Yes |
| `US_SSN` | 123-45-6789 | No |
| `IBAN_CODE` | DE89370400440532013000 | No |
| `IP_ADDRESS` | 192.168.1.1 | No |
| `LOCATION` | 123 Main St, Springfield | No |
| `DATE_TIME` | January 15, 2025 | No |
| `NRP` | Nationality/Religion/Political | No |

Add entities to the array to enable detection. Remove them to disable. Each additional entity type adds approximately 2ms to sanitizer latency.

## Testing a Policy

After creating a policy, test it with a known prompt:

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "What is our refund policy?"}]
  }'
```

Check the response headers:

```
X-Sentinel-Trust-Score: 0.87
X-Sentinel-Intervention: NONE
X-Sentinel-Policy-Version: 2
X-Sentinel-Request-Id: req_abc123
```

If `X-Sentinel-Intervention` is not `NONE`, the policy triggered an action. Check the audit log for details:

```bash
curl http://localhost:8000/api/audit?request_id=req_abc123 \
  -H "Authorization: Bearer $TOKEN"
```

## Common Mistakes

**Setting `pass` threshold too high (> 0.95)**: Most legitimate responses score between 0.75 and 0.95. A threshold of 0.98 will regenerate almost every response.

**Setting `block` threshold too high**: A block threshold of 0.50 will reject responses that might be partially correct. Use HITL instead of blocking for scores in the 0.30-0.60 range.

**Empty Golden Source with `require_golden_source: true`**: All claims default to 0.5. If your pass threshold is above 0.5, every response will trigger an intervention.

**Too many PII entities**: Each entity adds latency. Only enable entities relevant to your use case.

## Next Steps

- [Golden Source Setup](golden-source-setup.md) — Upload documents for Trust Score verification.
- [CI/CD Integration](ci-cd-integration.md) — Validate policies in your deployment pipeline.
- [Monitoring](../operations/monitoring.md) — Track Trust Score distributions to tune thresholds.
