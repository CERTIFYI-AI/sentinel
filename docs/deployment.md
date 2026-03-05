# Deployment Guide

> **Level:** 15-minute setup. Follow this to go from zero to a running Sentinel instance.

---

## Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Python | 3.11+ | Required by `pyproject.toml` |
| PostgreSQL | 15+ | Stores audit logs, tenant configs, vector embeddings (pgvector) |
| Redis | 7+ | Circuit-breaker state, rate limiting. Optional — falls back to in-memory |
| Docker | 24+ | For containerised deployment |
| RAM | 2 GB | 4 GB+ recommended when loading all ML models |

---

## Environment Variables

Sentinel uses `pydantic-settings` with the prefix `SENTINEL_`. Variables can be set in the shell, in a `.env` file, or overridden in `sentinel.yaml`.

### Required (no defaults)

| Variable | Example | Purpose |
|----------|---------|---------|
| `SENTINEL_DATABASE_URL` | `postgresql+asyncpg://user:pass@localhost:5432/sentinel` | asyncpg connection string |
| `SENTINEL_SECRET_KEY` | 32+ character string | JWT signing key |

### Optional (safe defaults)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SENTINEL_REDIS_URL` | `None` | Redis connection. In-memory fallback if absent |
| `SENTINEL_HOST` | `0.0.0.0` | Bind address |
| `SENTINEL_PORT` | `8000` | HTTP port |
| `SENTINEL_INJECTION_BLOCK_THRESHOLD` | `0.78` | Prompt-injection block score |
| `SENTINEL_TRUST_SCORE_BLOCK_THRESHOLD` | `0.85` | Minimum trust score before HITL escalation |
| `SENTINEL_CROSS_CHECK_TRIGGER_THRESHOLD` | `0.80` | RAG score below which N-cross-check fires |
| `SENTINEL_GOLDEN_SOURCE_SIMILARITY_THRESHOLD` | `0.72` | Minimum cosine similarity for RAG hits |
| `SENTINEL_FALLBACK_MODEL` | `gpt-4o` | Model used when circuit breaker upgrades |
| `SENTINEL_SPACY_MODEL` | `en_core_web_lg` | spaCy model for Presidio NER |
| `SENTINEL_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence embeddings for injection + verification |
| `SENTINEL_NLI_MODEL` | `cross-encoder/nli-deberta-v3-large` | NLI cross-encoder for claim verification |
| `SENTINEL_CB_OPEN_THRESHOLD` | `5` | Failures before circuit opens |
| `SENTINEL_CB_WINDOW_SECONDS` | `60` | Failure counting window |
| `SENTINEL_CB_RESET_SECONDS` | `300` | Seconds before circuit resets to closed |
| `SENTINEL_RATE_LIMIT_RPM` | `60` | Requests per minute per tenant |
| `SENTINEL_ALLOWED_ORIGINS` | `["*"]` | CORS allowed origins |

---

## Option 1 — Docker Compose (Recommended)

The repository ships a `docker-compose.yml` that starts Sentinel with sensible production defaults.

```bash
# 1. Copy and edit your env file
cp .env.example .env
# Edit .env: set SENTINEL_DATABASE_URL and SENTINEL_SECRET_KEY

# 2. Start
docker compose up -d
```

The compose file:
- Builds from the included `Dockerfile` (Python 3.11-slim)
- Exposes ports **8080** (proxy API) and **8081** (dashboard/WebSocket)
- Mounts `sentinel.yaml` as a read-only config override
- Persists data in a `sentinel-data` volume
- Runs a health check against `GET /health` every 30 seconds
- Restarts automatically (`unless-stopped`)

### Dockerfile Summary

```dockerfile
FROM python:3.11-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[dev]"
COPY . .
EXPOSE 8080 8081
ENTRYPOINT ["sentinel"]
CMD ["serve", "--host", "0.0.0.0", "--port", "8080"]
```

---

## Option 2 — Bare-Metal / Virtual Environment

```bash
# Clone
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel

# Virtual environment
python -m venv venv
source venv/bin/activate

# Install (with dev extras for tests and linting)
pip install -e ".[dev]"

# Download spaCy model
python -m spacy download en_core_web_lg

# Set required env vars
export SENTINEL_DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/sentinel"
export SENTINEL_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"

# Start
sentinel serve --host 0.0.0.0 --port 8080
```

The `sentinel` CLI entry point is registered in `pyproject.toml` (`sentinel = "sentinel.cli:main"`).

---

## Post-Deployment Verification

### Health Check

```bash
curl http://localhost:8080/health
# {"status": "ok", "version": "0.2.0"}
```

### Smoke Test — Proxy a Request

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $YOUR_OPENAI_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

The response should include standard OpenAI fields plus Sentinel headers with the trust score and audit ID.

---

## ML Model Downloads

ML models are downloaded on first startup. To pre-download for air-gapped environments:

```bash
# Sentence embeddings (used by sanitizer + verifier)
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# NLI cross-encoder (used by verifier)
python -c "from sentence_transformers import CrossEncoder; CrossEncoder('cross-encoder/nli-deberta-v3-large')"

# spaCy NER model (used by sanitizer)
python -m spacy download en_core_web_lg
```

Total download size is approximately 900 MB. Models are cached in `~/.cache/huggingface/` and `~/.cache/torch/`.

---

## Production Checklist

- [ ] `SENTINEL_SECRET_KEY` is a unique, random 48+ character string
- [ ] `SENTINEL_DATABASE_URL` points to a dedicated PostgreSQL instance with pgvector enabled
- [ ] `SENTINEL_REDIS_URL` is set (avoids in-memory circuit-breaker state loss on restart)
- [ ] `SENTINEL_ALLOWED_ORIGINS` is restricted to your application domains
- [ ] TLS termination is handled by a reverse proxy (nginx, Caddy, ALB)
- [ ] `sentinel.yaml` config file is mounted read-only in the container
- [ ] Golden-source documents are seeded: `python scripts/seed_golden_source.py`
- [ ] Injection seeds exist at `data/injection_seeds.jsonl`
- [ ] Log level is set to `INFO` or `WARNING` in production (`SENTINEL_LOG_LEVEL`)
- [ ] Health check endpoint (`/health`) is monitored by your alerting system
