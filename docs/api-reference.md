# API Reference

> **Level**: Reference. Bookmark this page and consult it when integrating with Sentinel.

Sentinel is an OpenAI-compatible proxy. All endpoints are served at `http://localhost:8000` by default (configurable via `SENTINEL_HOST` and `SENTINEL_PORT`).

## Authentication

All API requests (except `GET /health`) require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are JWTs signed with `SENTINEL_SECRET_KEY` using HS256. The JWT payload follows the `APIKeyPayload` model:

```json
{
  "tenant_id": "tenant_abc",
  "key_id": "key_001",
  "scopes": ["read", "write"]
}
```

---

## Chat Completions

The primary endpoint. Drop-in replacement for the OpenAI Chat Completions API.

### `POST /v1/chat/completions`

Sentinel intercepts the request, runs it through the governance pipeline (sanitizer, policy engine, fact-checker), forwards it to the upstream LLM provider, verifies the response, and returns the result with additional Sentinel metadata.

**Request Body** (OpenAI-compatible):

```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What medications interact with warfarin?"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false,
  "provider": "openai",
  "metadata": {
    "session_id": "sess_456"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string | No | Model name (defaults to provider config) |
| `messages` | array | Yes | Array of `{role, content}` message objects |
| `temperature` | float | No | Sampling temperature, 0.0-2.0 (default: 0.7) |
| `max_tokens` | int | No | Maximum tokens in the response |
| `stream` | bool | No | Enable streaming via SSE (default: false) |
| `provider` | string | No | Provider name. If omitted, uses the first enabled provider |
| `metadata` | object | No | Arbitrary metadata passed through to audit logs |

**Response** `200 OK`:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Several medications can interact with warfarin..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 156,
    "total_tokens": 198
  },
  "sentinel_request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sentinel_fact_check": {
    "claims": [
      {
        "claim": {"text": "Aspirin interacts with warfarin", "claim_id": "..."},
        "verdict": "supported",
        "confidence": 0.94,
        "evidence": ["doc_pharma_001"]
      }
    ],
    "overall_verdict": "supported",
    "trust_score": 0.91
  }
}
```

**Response** `403 Forbidden` (policy blocked):

```json
{
  "error": "Request blocked by policy",
  "violations": [
    {
      "rule_id": "injection_detection",
      "description": "Prompt injection detected",
      "severity": "critical",
      "action": "block"
    }
  ]
}
```

**Response** `502 Bad Gateway` (upstream provider failure):

```json
{
  "detail": "Connection refused: upstream provider unavailable"
}
```

---

## Health

### `GET /health`

No authentication required. Returns system health status.

**Response** `200 OK`:

```json
{
  "status": "healthy",
  "version": "0.2.0",
  "uptime_seconds": 3621.4,
  "providers_connected": 2,
  "audit_backend_ok": true
}
```

---

## Dashboard

All dashboard endpoints are under the `/dashboard` prefix.

### `GET /dashboard/`

Returns an HTML dashboard page with links to API endpoints.

### `GET /dashboard/stats`

Returns request statistics for a configurable time window.

**Query Parameters**:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `hours` | int (1-720) | `24` | Look-back window in hours |

**Response** `200 OK`:

```json
{
  "total_requests": 1547,
  "requests_per_minute": 2.3,
  "avg_latency_ms": 412.5,
  "error_rate": 0.02
}
```

### `GET /dashboard/events`

Query audit events with optional filters.

**Query Parameters**:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `request_id` | string | None | Filter by request ID |
| `event_type` | string | None | Filter by event type (see below) |
| `limit` | int (1-1000) | `50` | Maximum number of events to return |

**Event Types**: `request_received`, `policy_evaluated`, `fact_check_run`, `response_sent`, `error_occurred`

**Response** `200 OK`:

```json
[
  {
    "event_id": "evt_123",
    "event_type": "request_received",
    "tenant_id": "tenant_abc",
    "request_id": "req_456",
    "timestamp": "2025-03-05T10:30:00Z",
    "data": {"model": "gpt-4o", "provider": "openai"}
  }
]
```

### `GET /dashboard/events/{request_id}`

Returns all audit events for a specific request. Returns `404` if the request ID is not found.

---

## WebSocket

### `WS /ws/metrics`

Real-time metrics stream. Pushes `WebSocketMessage` objects:

```json
{
  "type": "metrics",
  "payload": {
    "avg_trust_score": 0.89,
    "requests_per_minute": 12.3,
    "intervention_rate": 0.04,
    "error_rate": 0.01,
    "p50_latency_ms": 280.0,
    "p95_latency_ms": 890.0,
    "active_providers": 2
  }
}
```

---

## Error Format

All error responses follow a consistent structure:

```json
{
  "detail": "Human-readable error message"
}
```

For policy violations, the format is:

```json
{
  "error": "Request blocked by policy",
  "violations": [{"rule_id": "...", "description": "...", "severity": "...", "action": "..."}]
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `403` | Request blocked by policy |
| `404` | Resource not found |
| `422` | Request validation error |
| `429` | Rate limit exceeded |
| `502` | Upstream provider error |
| `503` | All providers unavailable or audit backend down |

## Rate Limiting

Default: 60 requests per minute per tenant (configurable via `SENTINEL_RATE_LIMIT_RPM`). When Redis is configured, rate limiting is shared across instances. Without Redis, limits are per-instance.

## Related Documentation

- [SDK Guide](sdk-guide.md) -- Python client for the API
- [Error Codes Reference](reference/error-codes.md) -- full list of error codes
- [Configuration](configuration.md) -- server and provider settings
