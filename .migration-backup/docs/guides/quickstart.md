# Quickstart

Your first verified LLM response in 10 minutes.

## Prerequisites

> Before you start, confirm these are installed:
> - Docker Desktop (running)
> - An OpenAI API key (any tier)
> - Ports 8000, 5432, 6379, and 3000 available

## Step 1: Clone and Configure (2 minutes)

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
cp .env.example .env
```

Open `.env` and set your OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-key-here
```

The other defaults work for local development. Do not change `DATABASE_URL` or `REDIS_URL` unless you are running your own instances.

## Step 2: Start Services (1 minute)

```bash
docker compose up -d
```

Wait for all containers to be healthy:

```bash
docker compose ps
```

Expected output:

```
NAME                STATUS
sentinel-api        Up (healthy)
sentinel-postgres   Up (healthy)
sentinel-redis      Up (healthy)
sentinel-dashboard  Up
```

Verify the API is responding:

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "healthy",
  "version": "0.2.0",
  "uptime_seconds": 5.2,
  "checks": {
    "database": true,
    "redis": true
  }
}
```

## Step 3: Seed a Test Golden Source (2 minutes)

The Golden Source is the database of verified facts Sentinel checks responses against. Seed it with the project's own documentation:

```bash
python scripts/seed_golden_source.py --input ./docs/ --format md
```

This ingests all markdown files in `docs/` as verified facts. In production, you would ingest your own product documentation, API references, or regulatory guidelines.

## Step 4: Send Your First Request (2 minutes)

Send a request through Sentinel exactly as you would to OpenAI. The only difference: the URL points to `localhost:8000`.

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "What is the Trust Score in Sentinel and how is it calculated?"}
    ]
  }'
```

The response includes the standard OpenAI format plus Sentinel metadata:

```json
{
  "id": "chatcmpl-abc123",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "The Trust Score is a weighted combination of four components..."
    }
  }],
  "sentinel_request_id": "req_7f3a2b1c",
  "sentinel_fact_check": {
    "overall_verdict": "supported",
    "trust_score": 0.92,
    "claims": [
      {
        "claim": {"text": "Trust Score is a weighted combination of four components"},
        "verdict": "supported",
        "confidence": 0.94
      }
    ]
  }
}
```

Key fields to look at:
- `sentinel_fact_check.trust_score`: 0.0–1.0. Higher means more factually supported.
- `sentinel_fact_check.overall_verdict`: `supported`, `refuted`, `inconclusive`, or `uncertain`.
- `sentinel_request_id`: Use this to look up the full audit trail.

## Step 5: Open the Dashboard (1 minute)

Open http://localhost:3000 in your browser.

You will see:
- The request you just sent in the audit log
- A Trust Score chart (one data point so far)
- Provider health status showing your OpenAI connection

Send a few more requests to see the dashboard populate with data.

## Troubleshooting

**Container fails to start with "port already in use"**

Another service is using port 8000, 5432, or 6379. Stop the conflicting service or change the port mapping in `docker-compose.yml`.

**`connection refused` on curl**

The API container is still starting. Wait 10 seconds and try again. Check container logs:

```bash
docker compose logs sentinel-api
```

**Trust Score is 0.5 on every response**

Your Golden Source is empty. Run Step 3 again. A Trust Score of 0.5 means Sentinel has no facts to verify against.

## Next Steps

- [Golden Source Setup](golden-source-setup.md) — Populate with your own verified facts.
- [Provider Configuration](provider-configuration.md) — Add multiple LLM providers.
- [Configuration](../configuration.md) — Tune thresholds for your use case.
- [Dashboard Guide](dashboard-guide.md) — Navigate the monitoring interface.
