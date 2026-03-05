# API Reference

Sentinel exposes a RESTful API for AI governance middleware operations. All endpoints are served at `http://localhost:8000` by default.

## Authentication

All API requests (except `/health` and `/auth/login`) require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

### Obtain Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response** `200 OK`:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

## Core Endpoints

### Verify LLM Response

The primary endpoint. Runs an LLM response through the configured guardrail pipeline.

```http
POST /api/v1/verify
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "prompt": "What medications interact with warfarin?",
  "response": "Aspirin, ibuprofen, and certain antibiotics can interact with warfarin.",
  "model": "gpt-4o",
  "context": {
    "user_id": "usr_123",
    "session_id": "sess_456",
    "domain": "healthcare"
  },
  "policy_ids": ["pol_medical_safety", "pol_factuality"]
}
```

**Response** `200 OK`:
```json
{
  "request_id": "req_abc123",
  "verdict": "PASS",
  "confidence": 0.94,
  "guardrail_results": [
    {
      "guardrail": "toxicity",
      "passed": true,
      "score": 0.02,
      "latency_ms": 45
    },
    {
      "guardrail": "factuality",
      "passed": true,
      "score": 0.91,
      "latency_ms": 320
    },
    {
      "guardrail": "pii_detection",
      "passed": true,
      "score": 0.0,
      "latency_ms": 12
    }
  ],
  "policy_evaluation": {
    "policies_checked": 2,
    "policies_passed": 2,
    "violations": []
  },
  "total_latency_ms": 412,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response with violations** `200 OK`:
```json
{
  "request_id": "req_def456",
  "verdict": "FAIL",
  "confidence": 0.87,
  "guardrail_results": [
    {
      "guardrail": "toxicity",
      "passed": false,
      "score": 0.82,
      "latency_ms": 38,
      "details": "High toxicity detected in response"
    }
  ],
  "policy_evaluation": {
    "policies_checked": 1,
    "policies_passed": 0,
    "violations": [
      {
        "policy_id": "pol_safe_content",
        "rule": "toxicity_threshold",
        "message": "Toxicity score 0.82 exceeds threshold 0.3"
      }
    ]
  },
  "suggested_action": "BLOCK",
  "total_latency_ms": 156,
  "timestamp": "2024-01-15T10:31:00Z"
}
```

---

### Batch Verify

```http
POST /api/v1/verify/batch
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "requests": [
    {
      "prompt": "...",
      "response": "...",
      "model": "gpt-4o"
    }
  ],
  "policy_ids": ["pol_default"]
}
```

**Response** `200 OK`:
```json
{
  "batch_id": "batch_789",
  "results": [],
  "summary": {
    "total": 10,
    "passed": 8,
    "failed": 2
  }
}
```

---

## Policy Management

### List Policies

```http
GET /api/v1/policies
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 20)
- `domain` (string): Filter by domain
- `active` (bool): Filter by active status

### Create Policy

```http
POST /api/v1/policies
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "name": "Financial Compliance",
  "domain": "finance",
  "rules": [
    {
      "guardrail": "factuality",
      "threshold": 0.9,
      "action": "BLOCK"
    },
    {
      "guardrail": "pii_detection",
      "threshold": 0.0,
      "action": "REDACT"
    }
  ]
}
```

### Update Policy

```http
PUT /api/v1/policies/{policy_id}
```

### Delete Policy

```http
DELETE /api/v1/policies/{policy_id}
```

---

## Guardrails

### List Available Guardrails

```http
GET /api/v1/guardrails
Authorization: Bearer <token>
```

Returns all registered guardrails with their type, description, and default thresholds.

---

## Audit Logs

### Query Audit Logs

```http
GET /api/v1/audit
Authorization: Bearer <token>
```

**Query Parameters**:
- `start` (datetime): Start timestamp
- `end` (datetime): End timestamp
- `verdict` (string): Filter by verdict (PASS/FAIL/ERROR)
- `policy_id` (string): Filter by policy
- `page` (int): Page number
- `per_page` (int): Items per page

### Get Single Audit Entry

```http
GET /api/v1/audit/{request_id}
```

### Verify Audit Log Integrity

```http
POST /api/v1/audit/verify
```

Verifies the hash chain integrity of audit logs.

---

## Dashboard Data

### Get Dashboard Summary

```http
GET /api/v1/dashboard/summary?period=24h
Authorization: Bearer <token>
```

### Get Guardrail Stats

```http
GET /api/v1/dashboard/guardrails
Authorization: Bearer <token>
```

---

## Health & System

### Health Check

```http
GET /health
```

No authentication required.

### Detailed Health

```http
GET /health/detailed
Authorization: Bearer <token>
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": []
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

## Rate Limiting

Default: 60 requests/minute per API key. Rate limit headers included in all responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705312800
```

## Python SDK

```python
from sentinel import SentinelClient

client = SentinelClient(
    base_url="http://localhost:8000",
    api_key="your-api-key"
)

result = client.verify(
    prompt="What is aspirin used for?",
    response="Aspirin is used for pain relief and blood thinning.",
    model="gpt-4o",
    policy_ids=["pol_medical_safety"]
)

if result.verdict == "PASS":
    print("Response is safe")
else:
    print(f"Blocked: {result.violations}")
```
