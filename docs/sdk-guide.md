# SDK & Integration Guide

Sentinel provides a Python SDK and supports integration via REST API with any language.

## Python SDK

### Installation

```bash
pip install sentinel-ai
# Or from source
pip install -e ".[sdk]"
```

### Quick Start

```python
from sentinel import SentinelClient

client = SentinelClient(
    base_url="http://localhost:8000",
    api_key="your-api-key"
)

# Simple verification
result = client.verify(
    prompt="What causes headaches?",
    response="Headaches can be caused by stress, dehydration, or tension.",
    model="gpt-4o"
)

print(result.verdict)          # "PASS" or "FAIL"
print(result.confidence)       # 0.94
print(result.total_latency_ms) # 287
```

### Async Client

```python
from sentinel import AsyncSentinelClient
import asyncio

async def main():
    client = AsyncSentinelClient(
        base_url="http://localhost:8000",
        api_key="your-api-key"
    )

    result = await client.verify(
        prompt="Tell me about Python",
        response="Python is a programming language.",
        model="gpt-4o"
    )
    print(result.verdict)

asyncio.run(main())
```

### With Policies

```python
result = client.verify(
    prompt="Is this medication safe?",
    response="Consult your doctor before taking any medication.",
    model="gpt-4o",
    policy_ids=["pol_medical_safety", "pol_factuality"],
    context={
        "user_id": "usr_123",
        "domain": "healthcare"
    }
)

if result.verdict == "FAIL":
    for violation in result.policy_evaluation.violations:
        print(f"Policy: {violation.policy_id}")
        print(f"Rule: {violation.rule}")
        print(f"Message: {violation.message}")
```

### Batch Verification

```python
results = client.verify_batch(
    requests=[
        {"prompt": "Q1", "response": "A1", "model": "gpt-4o"},
        {"prompt": "Q2", "response": "A2", "model": "gpt-4o"},
    ],
    policy_ids=["pol_default"]
)

print(f"Passed: {results.summary.passed}/{results.summary.total}")
```

### Error Handling

```python
from sentinel.exceptions import (
    SentinelError,
    AuthenticationError,
    RateLimitError,
    ValidationError
)

try:
    result = client.verify(
        prompt="test",
        response="test",
        model="gpt-4o"
    )
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except ValidationError as e:
    print(f"Invalid request: {e.details}")
except SentinelError as e:
    print(f"Sentinel error: {e}")
```

---

## Framework Integrations

### OpenAI Integration

```python
import openai
from sentinel import SentinelClient

sentinel = SentinelClient(base_url="http://localhost:8000", api_key="key")

def safe_chat(prompt: str) -> str:
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content

    result = sentinel.verify(
        prompt=prompt,
        response=text,
        model="gpt-4o"
    )

    if result.verdict == "PASS":
        return text
    return "Response blocked by safety policy."
```

### LangChain Integration

```python
from langchain.callbacks import BaseCallbackHandler
from sentinel import SentinelClient

class SentinelCallback(BaseCallbackHandler):
    def __init__(self):
        self.client = SentinelClient(
            base_url="http://localhost:8000",
            api_key="key"
        )

    def on_llm_end(self, response, **kwargs):
        text = response.generations[0][0].text
        result = self.client.verify(
            prompt=kwargs.get("prompts", [""])[0],
            response=text,
            model="gpt-4o"
        )
        if result.verdict == "FAIL":
            raise ValueError(f"Response blocked: {result.policy_evaluation.violations}")
```

### FastAPI Middleware

```python
from fastapi import FastAPI, Request, Response
from sentinel import AsyncSentinelClient

app = FastAPI()
sentinel = AsyncSentinelClient(base_url="http://localhost:8000", api_key="key")

@app.middleware("http")
async def sentinel_middleware(request: Request, call_next):
    response = await call_next(request)

    if request.url.path.startswith("/api/chat"):
        body = await response.body()
        result = await sentinel.verify(
            prompt=request.state.prompt,
            response=body.decode(),
            model="gpt-4o"
        )
        if result.verdict == "FAIL":
            return Response(
                content="Response blocked by policy",
                status_code=422
            )
    return response
```

---

## REST API (Any Language)

### cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sentinel.local","password":"admin"}' \
  | jq -r '.access_token')

# Verify
curl -X POST http://localhost:8000/api/v1/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is AI?",
    "response": "AI is artificial intelligence.",
    "model": "gpt-4o"
  }'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:8000/api/v1/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'What is AI?',
    response: 'AI is artificial intelligence.',
    model: 'gpt-4o'
  })
});

const result = await response.json();
console.log(result.verdict);
```

### Go

```go
type VerifyRequest struct {
    Prompt   string `json:"prompt"`
    Response string `json:"response"`
    Model    string `json:"model"`
}

req := VerifyRequest{
    Prompt:   "What is AI?",
    Response: "AI is artificial intelligence.",
    Model:    "gpt-4o",
}

body, _ := json.Marshal(req)
httpReq, _ := http.NewRequest("POST", "http://localhost:8000/api/v1/verify", bytes.NewBuffer(body))
httpReq.Header.Set("Authorization", "Bearer "+token)
httpReq.Header.Set("Content-Type", "application/json")

client := &http.Client{}
resp, _ := client.Do(httpReq)
```

---

## Webhook Integration

Configure webhooks to receive real-time alerts on policy violations:

```bash
# .env
WEBHOOK_URL=https://your-app.com/sentinel/webhook
WEBHOOK_SECRET=your-hmac-secret
ALERT_ON_VIOLATION=true
```

Webhook payload:
```json
{
  "event": "policy_violation",
  "request_id": "req_abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "violations": [
    {
      "policy_id": "pol_safe_content",
      "guardrail": "toxicity",
      "score": 0.82
    }
  ]
}
```

Verify webhook signature:
```python
import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```
