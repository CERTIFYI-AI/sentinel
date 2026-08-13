# Deployment Guide

> **Audience**: Engineers deploying Sentinel to staging or production environments.
> **Level:** 15-minute setup for Docker Compose; longer for cloud targets.

## Prerequisites

- Docker and Docker Compose v2+
- PostgreSQL 15+ with pgvector extension
- Redis 7+ (optional but recommended for production)
- An OpenAI API key (or any OpenAI-compatible provider)
- Python 3.11+ (if running without Docker)

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Python | 3.11+ | Required by `pyproject.toml` |
| PostgreSQL | 15+ | Audit logs, tenant configs, vector embeddings (pgvector) |
| Redis | 7+ | Circuit-breaker state, rate limiting. Optional — falls back to in-memory |
| Docker | 24+ | For containerised deployment |
| RAM | 2 GB | 4 GB+ recommended when loading all ML models |

## Docker Compose (Recommended)

The fastest path to a production-like deployment.

### Step 1: Clone and Configure

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Required
SENTINEL_DATABASE_URL=postgresql+asyncpg://sentinel:sentinel@postgres:5432/sentinel
SENTINEL_SECRET_KEY=your-secret-key-minimum-32-characters-long

# LLM Provider
OPENAI_API_KEY=sk-your-openai-key

# Optional (recommended for production)
SENTINEL_REDIS_URL=redis://redis:6379/0
```

### Step 2: Start Services

```bash
docker compose up -d
```

This starts:
- Sentinel API on port 8000
- PostgreSQL on port 5432
- Redis on port 6379
- Dashboard on port 3000

### Step 3: Verify

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "version": "0.2.0",
  "uptime_seconds": 12.5,
  "checks": {
    "database": true,
    "redis": true
  }
}
```

### Step 4: Seed Golden Source

```bash
python scripts/seed_golden_source.py --input ./docs/ --format md
```

See [Golden Source Setup](../guides/golden-source-setup.md) for details.

## Bare Metal Deployment

### Step 1: System Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3.11 python3.11-venv postgresql-15 redis-server

# Install pgvector extension
sudo apt install -y postgresql-15-pgvector
```

### Step 2: Database Setup

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE sentinel;
CREATE USER sentinel WITH PASSWORD 'your-db-password';
GRANT ALL PRIVILEGES ON DATABASE sentinel TO sentinel;
\c sentinel
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS timescaledb;
EOF
```

### Step 3: Application Setup

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e "."
python -m spacy download en_core_web_lg
```

### Step 4: Configure

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL, SECRET_KEY, and provider API keys
```

### Step 5: Run Database Migrations

```bash
alembic upgrade head
```

### Step 6: Start Sentinel

```bash
uvicorn sentinel.proxy:create_app --factory --host 0.0.0.0 --port 8000 --workers 4
```

For production, use a process manager:

```bash
# systemd service example
sudo tee /etc/systemd/system/sentinel.service <<EOF
[Unit]
Description=Certifyi Sentinel
After=network.target postgresql.service redis.service

[Service]
User=sentinel
WorkingDirectory=/opt/sentinel
EnvironmentFile=/opt/sentinel/.env
ExecStart=/opt/sentinel/.venv/bin/uvicorn sentinel.proxy:create_app --factory --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable sentinel
sudo systemctl start sentinel
```

## AWS Deployment

### Architecture

```
ALB (HTTPS :443)
  └─▶ ECS Fargate (Sentinel containers)
        ├─▶ RDS PostgreSQL (pgvector)
        └─▶ ElastiCache Redis
```

### Key Decisions

| Component | AWS Service | Notes |
|-----------|-------------|-------|
| Compute | ECS Fargate | No GPU needed for basic deployment |
| Database | RDS PostgreSQL 15 | Enable pgvector extension |
| Cache | ElastiCache Redis | Single node for < 10k req/min |
| Load Balancer | ALB | TLS termination, health checks |
| Secrets | Secrets Manager | Store `SECRET_KEY` and API keys |
| Monitoring | CloudWatch | Export via Prometheus endpoint |

### ECS Task Definition (Key Settings)

```json
{
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [{
    "name": "sentinel",
    "image": "ghcr.io/certifyi-ai/sentinel:latest",
    "portMappings": [{"containerPort": 8000}],
    "environment": [
      {"name": "SENTINEL_HOST", "value": "0.0.0.0"},
      {"name": "SENTINEL_PORT", "value": "8000"}
    ],
    "secrets": [
      {"name": "SENTINEL_DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..."}
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
      "interval": 30
    }
  }]
}
```

### RDS Configuration

- Instance: `db.r6g.large` (or larger for > 50k req/min)
- Enable pgvector: `CREATE EXTENSION vector;` after creation
- Enable TimescaleDB: add to `shared_preload_libraries`
- Storage: gp3, start with 100 GB
- Backup: automated daily snapshots, 7-day retention

## GCP Deployment

### Architecture

```
Cloud Load Balancer (HTTPS)
  └─▶ Cloud Run (Sentinel containers)
        ├─▶ Cloud SQL PostgreSQL
        └─▶ Memorystore Redis
```

### Cloud Run Service

```bash
gcloud run deploy sentinel \
  --image ghcr.io/certifyi-ai/sentinel:latest \
  --port 8000 \
  --cpu 2 \
  --memory 2Gi \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars "SENTINEL_HOST=0.0.0.0" \
  --set-secrets "SENTINEL_DATABASE_URL=sentinel-db-url:latest,SENTINEL_SECRET_KEY=sentinel-secret:latest"
```

## Reverse Proxy Configuration

Sentinel does not terminate TLS. Place a reverse proxy in front.

### Nginx Example

```nginx
server {
    listen 443 ssl;
    server_name sentinel.yourdomain.com;

    ssl_certificate /etc/ssl/certs/sentinel.crt;
    ssl_certificate_key /etc/ssl/private/sentinel.key;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for dashboard
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTINEL_DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SENTINEL_SECRET_KEY` | Yes | — | JWT signing key (min 32 chars) |
| `SENTINEL_REDIS_URL` | No | None | Redis URL. In-memory fallback if absent. |
| `SENTINEL_HOST` | No | `0.0.0.0` | Bind address |
| `SENTINEL_PORT` | No | `8000` | Bind port |
| `SENTINEL_TRUST_SCORE_BLOCK_THRESHOLD` | No | `0.85` | Block responses below this score |
| `SENTINEL_INJECTION_BLOCK_THRESHOLD` | No | `0.78` | Block prompts above this injection score |
| `SENTINEL_FALLBACK_MODEL` | No | `gpt-4o` | Model for L2 circuit breaker escalation |
| `SENTINEL_RATE_LIMIT_RPM` | No | `60` | Requests per minute per tenant |
| `SENTINEL_CB_OPEN_THRESHOLD` | No | `5` | Failures before circuit opens |
| `SENTINEL_CB_WINDOW_SECONDS` | No | `60` | Circuit breaker failure window |
| `SENTINEL_CB_RESET_SECONDS` | No | `300` | Time before half-open retry |
| `SENTINEL_CROSS_CHECK_TRIGGER_THRESHOLD` | No | `0.80` | RAG score below which N-cross-check fires |
| `SENTINEL_GOLDEN_SOURCE_SIMILARITY_THRESHOLD` | No | `0.72` | Minimum cosine similarity for RAG hits |
| `SENTINEL_SPACY_MODEL` | No | `en_core_web_lg` | spaCy model for Presidio NER |
| `SENTINEL_EMBEDDING_MODEL` | No | `all-MiniLM-L6-v2` | Sentence embeddings for injection + verification |
| `SENTINEL_NLI_MODEL` | No | `cross-encoder/nli-deberta-v3-large` | NLI cross-encoder for claim verification |
| `SENTINEL_ALLOWED_ORIGINS` | No | `["*"]` | CORS allowed origins |
| `OPENAI_API_KEY` | Yes* | — | Required if using OpenAI provider |

Sentinel uses `pydantic-settings` with the prefix `SENTINEL_`. Variables can be
set in the shell, in a `.env` file, or overridden in `sentinel.yaml`. See
[Configuration](../getting-started/configuration.md) for the complete reference.

## Pre-Downloading ML Models

ML models are downloaded on first startup. To pre-download them for air-gapped
environments or to keep first-request latency down:

```bash
# Sentence embeddings (used by sanitizer + verifier)
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# NLI cross-encoder (used by verifier)
python -c "from sentence_transformers import CrossEncoder; CrossEncoder('cross-encoder/nli-deberta-v3-large')"

# spaCy NER model (used by sanitizer)
python -m spacy download en_core_web_lg
```

Total download size is approximately 900 MB. Models are cached in
`~/.cache/huggingface/` and `~/.cache/torch/`.

## Smoke Test

After the health check passes, proxy a real request:

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $YOUR_OPENAI_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

The response should include the standard OpenAI fields plus Sentinel metadata
with the trust score and audit id.

## Post-Deployment Checklist

Run through the [Production Checklist](production-checklist.md) before serving traffic.

Key items:
- [ ] TLS termination configured
- [ ] `SECRET_KEY` is unique and not in version control
- [ ] Redis is connected (check `/health`)
- [ ] Golden Source is seeded
- [ ] Audit chain integrity verified
- [ ] Rate limiting is configured
- [ ] Dashboard is not publicly accessible
- [ ] Monitoring and alerting configured

## Upgrading

```bash
# Pull latest
git pull origin main

# Rebuild
docker compose build

# Run migrations
docker compose exec sentinel alembic upgrade head

# Restart
docker compose up -d
```

> **WARNING**: Always run database migrations before starting the new version. Schema changes without migrations will cause startup failures.

## Troubleshooting

See [Troubleshooting](../getting-started/troubleshooting.md) for the 20 most common deployment issues.
