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
- [Error Codes Reference](../reference/error-codes.md) -- full list of error codes
- [Configuration](../getting-started/configuration.md) -- server and provider settings

- [Security Module](../modules/security-intelligence.md) -- security intelligence endpoints

---

## Security Intelligence API Endpoints

The following endpoints power the Security Intelligence dashboard module.

### Threats

#### `GET /api/v1/security/threats`

List all detected threats with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| severity | string | Filter by severity: Critical, High, Medium, Low |
| status | string | Filter by status: Active, Investigating, Mitigated, Resolved |
| source | string | Filter by detection source |
| limit | integer | Results per page (default: 50) |
| offset | integer | Pagination offset |

**Response:** `200 OK`
```json
{
  "threats": [{"id": "THR-001", "title": "...", "severity": "Critical", ...}],
  "total": 42,
  "page": 1
}
```

#### `POST /api/v1/security/threats/:id/investigate`

Trigger investigation workflow for a specific threat.

---

### Scans

#### `GET /api/v1/security/scans`

List scan history with results summary.

#### `POST /api/v1/security/scans`

Trigger a new security scan.

**Request Body:**
```json
{
  "type": "Full Scan | Quick Scan | API Scan | Model Scan",
  "target": "string",
  "config": {}
}
```

---

### Attack Surface

#### `GET /api/v1/security/endpoints`

List all monitored endpoints with risk scores.

#### `POST /api/v1/security/endpoints`

Register a new endpoint for monitoring.

#### `PUT /api/v1/security/endpoints/:id`

Update endpoint configuration or risk assessment.

---

### Vulnerabilities

#### `GET /api/v1/security/vulnerabilities`

List vulnerabilities with CVSS scores and status.

#### `PATCH /api/v1/security/vulnerabilities/:id`

Update vulnerability status or assignment.

---

### Red Team

#### `GET /api/v1/security/redteam/campaigns`

List adversarial test campaigns.

#### `POST /api/v1/security/redteam/campaigns`

Create and launch a new red team campaign.

---

### Policy Rules

#### `GET /api/v1/security/policies`

List all firewall policy rules.

#### `POST /api/v1/security/policies`

Create a new policy rule.

#### `PUT /api/v1/security/policies/:id`

Update rule configuration, priority, or enabled status.

#### `DELETE /api/v1/security/policies/:id`

Remove a policy rule.

---

### Keys Management

#### `GET /api/v1/security/keys`

List API keys (masked) with usage statistics.

#### `POST /api/v1/security/keys`

Generate a new API key.

#### `POST /api/v1/security/keys/:id/rotate`

Rotate an existing API key.

#### `DELETE /api/v1/security/keys/:id`

Revoke an API key.
---

## Dashboard Data Access (Supabase)

The React dashboard does not call the proxy API for governed records — it reads
and writes Supabase directly through a typed service layer. Direct Supabase
client access from components is not permitted.

### Service layer

All data access goes through typed service functions in `dashboard/src/services/`
(historically `dashboard/src/api/`). Every service module exports CRUD methods
built on a small set of helpers:

- `fromDB<T>(query, fallback)` — executes a Supabase query. Returns `fallback` if
  Supabase is unavailable.
- `mutateDB<T>(mutation, fallback)` — executes a Supabase mutation. Calls
  `fallback()` if Supabase is unavailable.
- `logAction(params)` — writes to `audit_log`. Non-blocking.

### Authentication

Dashboard requests use Supabase JWT authentication. The anon key permits
unauthenticated reads only on explicitly public tables; all writes and all reads
of org-scoped data require a valid session. Token refresh is handled
automatically by the Supabase client. Row-level security scopes every query to
the caller's organization.

### Supabase Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `generate-report` | HTTP POST | Compile and format compliance reports |
| `ai-advisor` | HTTP POST + SSE | Stream GRC recommendations |
| `sla-enforcer` | Cron (30 min) | Mark overdue HITL and DSR items |
| `freshness-checker` | Cron (daily) | Update evidence freshness status |
| `auto-task-generator` | DB webhook | Create tasks from new risks/gaps |

See [Supabase Integration](../architecture/SUPABASE_INTEGRATION.md) for the
schema, RLS policies, and storage layout.
