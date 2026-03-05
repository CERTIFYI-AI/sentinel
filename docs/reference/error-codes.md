# Error Codes

> **Purpose**: Complete reference for all HTTP error responses and Sentinel-specific error codes.

## Error Response Format

All errors return JSON with a consistent structure:

```json
{
  "error": {
    "code": "SENTINEL_ERROR_CODE",
    "message": "Human-readable description of the error.",
    "request_id": "req_abc123def456",
    "details": {}
  }
}
```

## HTTP Status Codes

### 400 Bad Request

| Error Code | Description | Resolution |
|---|---|---|
| `INVALID_REQUEST_BODY` | Request body is not valid JSON or missing required fields. | Check the `messages` array and `model` field. |
| `INVALID_MODEL` | Requested model is not supported by any configured provider. | Check `model` value against supported models. |
| `INVALID_TENANT` | Tenant ID in the request is not found. | Verify the tenant exists in `sentinel_tenants`. |
| `INVALID_POLICY` | Policy JSON is malformed or contains invalid threshold values. | Ensure thresholds are ordered: pass > regenerate > upgrade > hitl > block. |

### 401 Unauthorized

| Error Code | Description | Resolution |
|---|---|---|
| `MISSING_AUTH_HEADER` | `Authorization` header is missing. | Include `Authorization: Bearer <token>` header. |
| `INVALID_TOKEN` | JWT token is malformed or expired. | Request a new token via `POST /auth/login`. |
| `TOKEN_EXPIRED` | JWT token has expired. | Request a new token. Default expiry is 24 hours. |

### 403 Forbidden

| Error Code | Description | Resolution |
|---|---|---|
| `TENANT_MISMATCH` | Token tenant does not match the requested resource. | Use a token scoped to the correct tenant. |
| `INSUFFICIENT_PERMISSIONS` | Token does not have permission for this operation. | Check user role and permissions. |

### 422 Unprocessable Entity

| Error Code | Description | Resolution |
|---|---|---|
| `TRUST_SCORE_BELOW_MINIMUM` | Trust Score is below the block threshold. | Review the Golden Source content. Lower the block threshold if appropriate. |
| `INJECTION_DETECTED` | Prompt injection attack detected above threshold. | Review the prompt. Lower `injection_threshold` if false positive. |
| `PII_BLOCK` | PII was detected and the policy requires blocking (not masking). | Remove PII from the prompt or adjust PII policy. |

### 429 Too Many Requests

| Error Code | Description | Resolution |
|---|---|---|
| `RATE_LIMIT_EXCEEDED` | Tenant has exceeded the configured rate limit. | Wait and retry. Check `Retry-After` header for wait time. |

### 500 Internal Server Error

| Error Code | Description | Resolution |
|---|---|---|
| `INTERNAL_ERROR` | Unexpected server error. | Check Sentinel logs. Report the `request_id` in a GitHub issue. |
| `NLI_MODEL_ERROR` | NLI model inference failed. | Check model loading. Restart Sentinel if the model is corrupted. |
| `EMBEDDING_ERROR` | Embedding model failed. | Check model availability and memory. |

### 502 Bad Gateway

| Error Code | Description | Resolution |
|---|---|---|
| `PROVIDER_ERROR` | LLM provider returned an error. | Check provider API key and status. Details in `error.details.provider_error`. |
| `PROVIDER_TIMEOUT` | LLM provider did not respond within timeout. | Increase timeout or check provider latency. |

### 503 Service Unavailable

| Error Code | Description | Resolution |
|---|---|---|
| `ALL_PROVIDERS_UNAVAILABLE` | All configured providers are in circuit breaker OPEN state. | Wait for circuit breaker recovery. Check provider health. |
| `AUDIT_BUFFER_FULL` | Audit buffer is full and PostgreSQL is unavailable. Sentinel refuses to serve unauditable requests. | Restore PostgreSQL connection. |
| `DATABASE_UNAVAILABLE` | PostgreSQL is unreachable. | Check database connection and credentials. |
| `MODEL_NOT_LOADED` | NLI or embedding model is still loading at startup. | Wait for startup to complete (5-10 seconds). |

## Retry Behaviour

| Status Code | Retryable | Notes |
|---|---|---|
| 400 | No | Fix the request. |
| 401 | No | Get a new token, then retry. |
| 403 | No | Permission issue. |
| 422 | No | Content was blocked by policy. |
| 429 | Yes | Respect `Retry-After` header. |
| 500 | Yes | Exponential backoff recommended. |
| 502 | Yes | Provider issue. May resolve on retry. |
| 503 | Yes | Service recovering. Retry with backoff. |

## Response Headers on Error

Error responses include these headers when available:

| Header | Description |
|---|---|
| `X-Sentinel-Request-Id` | Unique request identifier for log correlation. |
| `X-Sentinel-Error-Code` | Machine-readable error code. |
| `Retry-After` | Seconds to wait before retrying (429 only). |

## Next Steps

- [API Reference](../api-reference.md) — Full API documentation.
- [Troubleshooting](../troubleshooting.md) — Common issues and solutions.
- [Monitoring](../ops/monitoring.md) — Set up alerts on error rates.
