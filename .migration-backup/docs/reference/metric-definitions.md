# Metric Definitions

> **Purpose**: Documents every Prometheus metric exposed by Sentinel at `GET /metrics`.

## Endpoint

```
GET /metrics
```

Returns metrics in Prometheus exposition format. No authentication required (bind to internal network in production).

## Request Metrics

### `sentinel_requests_total`

**Type**: Counter

**Description**: Total number of requests processed.

**Labels**:

| Label | Values | Description |
|---|---|---|
| `tenant_id` | UUID | Tenant identifier. |
| `model` | `gpt-4o-mini`, `gpt-4o`, etc. | Model used (not requested). |
| `intervention` | `NONE`, `REGENERATE`, `UPGRADE`, `HITL`, `BLOCK` | Intervention applied. |
| `status` | `success`, `error` | Whether the request completed successfully. |

### `sentinel_request_duration_seconds`

**Type**: Histogram

**Description**: End-to-end request latency in seconds.

**Labels**: `tenant_id`, `model`

**Buckets**: 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0

### `sentinel_request_tokens_total`

**Type**: Counter

**Description**: Total tokens processed (prompt + response).

**Labels**: `tenant_id`, `model`, `direction` (`prompt` or `response`)

## Trust Score Metrics

### `sentinel_trust_score`

**Type**: Histogram

**Description**: Trust Score distribution across all requests.

**Labels**: `tenant_id`

**Buckets**: 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0

### `sentinel_trust_score_by_component`

**Type**: Gauge

**Description**: Latest Trust Score component values.

**Labels**: `tenant_id`, `component` (`semantic_similarity`, `nli_entailment`, `pii_clean`, `source_coverage`)

### `sentinel_claims_total`

**Type**: Counter

**Description**: Total claims extracted and verified.

**Labels**: `tenant_id`, `result` (`supported`, `contradicted`, `neutral`, `no_source`)

## Layer Latency Metrics

### `sentinel_sanitizer_duration_seconds`

**Type**: Histogram

**Description**: Sanitizer layer latency.

**Labels**: `tenant_id`

**Buckets**: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5

### `sentinel_verification_duration_seconds`

**Type**: Histogram

**Description**: Verification layer latency (includes NLI inference and vector search).

**Labels**: `tenant_id`

**Buckets**: 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0

### `sentinel_provider_duration_seconds`

**Type**: Histogram

**Description**: Time waiting for the LLM provider response.

**Labels**: `tenant_id`, `provider` (`openai`, `anthropic`, `google`, `azure`)

**Buckets**: 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0

## Safety Metrics

### `sentinel_pii_detections_total`

**Type**: Counter

**Description**: Total PII entities detected.

**Labels**: `tenant_id`, `entity_type` (`PERSON`, `EMAIL_ADDRESS`, etc.)

### `sentinel_injection_detections_total`

**Type**: Counter

**Description**: Total prompt injection attempts detected.

**Labels**: `tenant_id`, `action` (`blocked`, `flagged`)

### `sentinel_injection_score`

**Type**: Histogram

**Description**: Distribution of injection similarity scores.

**Labels**: `tenant_id`

**Buckets**: 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0

## Circuit Breaker Metrics

### `sentinel_circuit_breaker_state`

**Type**: Gauge

**Description**: Current circuit breaker state per provider. 0 = CLOSED, 1 = HALF_OPEN, 2 = OPEN.

**Labels**: `provider`

### `sentinel_circuit_breaker_transitions_total`

**Type**: Counter

**Description**: Circuit breaker state transitions.

**Labels**: `provider`, `from_state`, `to_state`

### `sentinel_provider_errors_total`

**Type**: Counter

**Description**: Errors from LLM providers.

**Labels**: `provider`, `error_type` (`timeout`, `rate_limit`, `auth`, `server_error`)

## HITL Metrics

### `sentinel_hitl_queue_size`

**Type**: Gauge

**Description**: Current number of items in the HITL queue.

**Labels**: `tenant_id`

### `sentinel_hitl_decisions_total`

**Type**: Counter

**Description**: HITL reviewer decisions.

**Labels**: `tenant_id`, `decision` (`APPROVE`, `REJECT`, `EDIT`, `TIMEOUT`)

### `sentinel_hitl_review_duration_seconds`

**Type**: Histogram

**Description**: Time from queue entry to reviewer decision.

**Labels**: `tenant_id`

**Buckets**: 10, 30, 60, 120, 300, 600

## Golden Source Metrics

### `sentinel_golden_source_documents_total`

**Type**: Gauge

**Description**: Total documents in the Golden Source.

**Labels**: `tenant_id`

### `sentinel_golden_source_chunks_total`

**Type**: Gauge

**Description**: Total chunks in the Golden Source.

**Labels**: `tenant_id`

### `sentinel_vector_search_duration_seconds`

**Type**: Histogram

**Description**: pgvector similarity search latency.

**Labels**: `tenant_id`

**Buckets**: 0.001, 0.005, 0.01, 0.025, 0.05, 0.1

## System Metrics

### `sentinel_audit_buffer_size`

**Type**: Gauge

**Description**: Current number of buffered audit entries (non-zero means PostgreSQL may be degraded).

### `sentinel_model_loaded`

**Type**: Gauge

**Description**: Whether ML models are loaded. 1 = loaded, 0 = loading.

**Labels**: `model` (`nli`, `embedding`, `spacy`)

## Example Prometheus Queries

```promql
# Request rate per minute
rate(sentinel_requests_total[5m]) * 60

# P95 latency
histogram_quantile(0.95, rate(sentinel_request_duration_seconds_bucket[5m]))

# Average Trust Score over last hour
rate(sentinel_trust_score_sum[1h]) / rate(sentinel_trust_score_count[1h])

# Intervention rate
sum(rate(sentinel_requests_total{intervention!="NONE"}[5m])) / sum(rate(sentinel_requests_total[5m]))

# PII detection rate
rate(sentinel_pii_detections_total[5m])
```

## Next Steps

- [Monitoring](../ops/monitoring.md) — Set up Grafana dashboards with these metrics.
- [Scaling](../ops/scaling.md) — Use metrics to determine scaling decisions.
- [Error Codes](error-codes.md) — Error types that appear in error metrics.
