# Getting Started with Sentinel

Get Sentinel running in under 5 minutes.

## What is Sentinel?

Sentinel is a real-time AI reliability and governance middleware. It sits between your LLM and your users, verifying every response against configurable safety guardrails and compliance policies before delivery.

## Prerequisites

- Python 3.11+
- PostgreSQL 15+ (or SQLite for quick testing)
- Redis 7+
- An OpenAI API key (or compatible LLM provider)

## Installation

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

docker-compose up -d
```

Sentinel API will be available at `http://localhost:8000` and the dashboard at `http://localhost:3000`.

### Option 2: Local Development

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel

python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env
# Edit .env with your settings

alembic upgrade head
python -m sentinel.scripts.seed_policies
uvicorn sentinel.main:app --reload --port 8000
```

## Your First Verification

### 1. Get an Auth Token

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sentinel.local", "password": "admin"}'
```

Save the `access_token` from the response.

### 2. Verify an LLM Response

```bash
curl -X POST http://localhost:8000/api/v1/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the capital of France?",
    "response": "The capital of France is Paris.",
    "model": "gpt-4o"
  }'
```

### 3. Review the Result

The response includes:
- **verdict**: `PASS` or `FAIL`
- **guardrail_results**: Individual scores for each guardrail
- **policy_evaluation**: Which policies were checked and any violations
- **total_latency_ms**: End-to-end processing time

## Using the Python SDK

```python
from sentinel import SentinelClient

client = SentinelClient(
    base_url="http://localhost:8000",
    api_key="your-api-key"
)

# Verify a response
result = client.verify(
    prompt="Is ibuprofen safe with blood thinners?",
    response="You should consult your doctor before combining medications.",
    model="gpt-4o",
    policy_ids=["pol_medical_safety"]
)

print(f"Verdict: {result.verdict}")
print(f"Latency: {result.total_latency_ms}ms")

if result.verdict == "FAIL":
    for v in result.policy_evaluation.violations:
        print(f"Violation: {v.message}")
```

## Integration Patterns

### Middleware Pattern

Insert Sentinel between your application and LLM provider:

```python
import openai
from sentinel import SentinelClient

sentinel = SentinelClient(base_url="http://localhost:8000", api_key="key")

def safe_completion(prompt: str) -> str:
    # Get LLM response
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    llm_text = response.choices[0].message.content

    # Verify with Sentinel
    result = sentinel.verify(
        prompt=prompt,
        response=llm_text,
        model="gpt-4o"
    )

    if result.verdict == "PASS":
        return llm_text
    else:
        return "I cannot provide that response due to safety policies."
```

### Async Pattern

```python
import asyncio
from sentinel import AsyncSentinelClient

async def verify_responses():
    client = AsyncSentinelClient(
        base_url="http://localhost:8000",
        api_key="key"
    )

    result = await client.verify(
        prompt="...",
        response="...",
        model="gpt-4o"
    )
    return result
```

## Dashboard

Access the Sentinel dashboard at `http://localhost:3000` to:

- Monitor real-time request flow
- View guardrail performance metrics
- Manage policies
- Browse audit logs
- Configure alerts

## Next Steps

- [API Reference](./api-reference.md) — Full endpoint documentation
- [Configuration](./configuration.md) — Environment variables and settings
- [Policy Language](./policy-language.md) — Create custom governance policies
- [Architecture](./architecture.md) — System design and internals
- [Deployment](./deployment.md) — Production deployment guide
- [Troubleshooting](./troubleshooting.md) — Common issues and fixes
