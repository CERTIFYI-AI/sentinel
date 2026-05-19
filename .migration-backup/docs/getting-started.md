# Getting Started

Get Sentinel running in under 5 minutes.

## What is Sentinel?

Sentinel is a real-time AI reliability and governance middleware. It sits between your LLM and your users as a transparent proxy, verifying every response against golden-source documents and producing a tamper-proof audit trail for ISO 42001 and EU AI Act compliance.

## Prerequisites

- Python 3.11+
- PostgreSQL 15+ with pgvector extension (or SQLite for development)
- Redis 7+ (optional but recommended for production)
- An OpenAI API key (or compatible LLM provider)

## Installation

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
cp .env.example .env
# Edit .env with your settings (see Required Settings below)
docker compose up -d
```

Sentinel will be available at `http://localhost:8000`.

### Option 2: Local Development

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel

python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env
# Edit .env with your settings
```

## Required Settings

Edit your `.env` file and set these two required values:

```bash
# PostgreSQL connection string (required)
SENTINEL_DATABASE_URL=postgresql+asyncpg://sentinel:password@localhost:5432/sentinel

# JWT signing secret -- min 32 characters (required)
SENTINEL_SECRET_KEY=$(openssl rand -hex 32)
```

Optional but recommended for production:

```bash
SENTINEL_REDIS_URL=redis://localhost:6379/0
```

See [Configuration](configuration.md) for the full list of settings.

## Starting the Server

```bash
# Using the Makefile
make run

# Or directly with uvicorn
uvicorn sentinel.proxy:create_app --factory --reload --port 8000
```

Check the server is running:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "version": "0.2.0",
  "uptime_seconds": 2.1,
  "providers_connected": 1,
  "audit_backend_ok": true
}
```

## Your First Request

Sentinel is a drop-in replacement for the OpenAI API. Point your existing code at Sentinel instead of OpenAI:

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "What is the capital of France?"}
    ]
  }'
```

Sentinel will:
1. Sanitize the prompt (PII detection, injection detection)
2. Evaluate pre-request policies
3. Forward to the upstream LLM provider
4. Fact-check the response against the Golden Source
5. Run post-response policy checks
6. Log everything to the tamper-evident audit trail
7. Return the response with a `sentinel_request_id` and `sentinel_fact_check` field

## Using the Python SDK

```python
import asyncio
from sentinel.sdk import SentinelClient

async def main():
    async with SentinelClient(
        base_url="http://localhost:8000",
        api_key="your-api-key",
    ) as client:
        # Check health
        health = await client.health()
        print(f"Status: {health.status}")

        # Send a chat completion
        result = await client.chat(
            messages=[{"role": "user", "content": "What is aspirin used for?"}],
            model="gpt-4o",
        )
        print(result)

        # Query audit events
        events = await client.get_events(limit=10)
        print(f"Recent events: {len(events)}")

asyncio.run(main())
```

## Seeding the Golden Source

The Golden Source is Sentinel's knowledge base for fact-checking. Seed it with your authoritative documents:

```bash
python scripts/seed_golden_source.py --source-dir ./data/golden_source/
```

See [Golden Source Setup](guides/golden-source-setup.md) for detailed instructions.

## Viewing the Dashboard

Open `http://localhost:8000/dashboard/` in your browser to access the monitoring dashboard. It provides links to:

- `/dashboard/stats` -- request statistics
- `/dashboard/events` -- audit event log
- `/health` -- system health

## Next Steps

- [Architecture](architecture.md) -- understand the five-layer pipeline
- [Configuration](configuration.md) -- tune thresholds and provider settings
- [Guides: Quickstart](guides/quickstart.md) -- end-to-end walkthrough
- [Guides: Writing Policies](guides/writing-policies.md) -- define custom governance rules
- [Deployment Guide](deployment-guide.md) -- production deployment on AWS, GCP, or bare metal
