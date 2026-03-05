# Deployment Guide

This guide covers deploying Sentinel in various environments.

## Prerequisites

- Python 3.11+
- Docker & Docker Compose (for containerized deployment)
- PostgreSQL 15+ (production)
- Redis 7+ (caching & rate limiting)
- 2GB+ RAM minimum

## Quick Start (Development)

```bash
# Clone and setup
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment config
cp .env.example .env
# Edit .env with your settings

# Run database migrations
alembic upgrade head

# Seed default policies
python -m sentinel.scripts.seed_policies

# Start development server
uvicorn sentinel.main:app --reload --port 8000
```

## Docker Deployment

### Single Container

```bash
# Build image
docker build -t sentinel:latest .

# Run container
docker run -d \
  --name sentinel \
  -p 8000:8000 \
  --env-file .env \
  sentinel:latest
```

### Docker Compose (Recommended)

```bash
# Start all services (API, PostgreSQL, Redis, Dashboard)
docker-compose up -d

# View logs
docker-compose logs -f sentinel-api

# Run migrations
docker-compose exec sentinel-api alembic upgrade head

# Seed policies
docker-compose exec sentinel-api python -m sentinel.scripts.seed_policies
```

The `docker-compose.yml` includes:
- **sentinel-api**: Main API server on port 8000
- **sentinel-dashboard**: React dashboard on port 3000
- **postgres**: PostgreSQL database on port 5432
- **redis**: Redis cache on port 6379

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@localhost/sentinel` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT signing key (min 32 chars) | `your-secret-key-here` |
| `OPENAI_API_KEY` | OpenAI API key for LLM checks | `sk-...` |

### Optional

| Variable | Description | Default |
|----------|-------------|----------|
| `LOG_LEVEL` | Logging verbosity | `INFO` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `RATE_LIMIT_RPM` | Requests per minute | `60` |
| `GUARDRAIL_TIMEOUT_MS` | Max guardrail execution time | `5000` |
| `MODEL_NAME` | Default LLM model | `gpt-4o-mini` |
| `ENABLE_AUDIT_LOG` | Enable audit logging | `true` |
| `WEBHOOK_URL` | Alert webhook endpoint | `""` |
| `MAX_WORKERS` | Uvicorn worker count | `4` |

## Production Deployment

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 2 GB | 8+ GB |
| Disk | 20 GB | 100+ GB (for audit logs) |
| Network | 100 Mbps | 1 Gbps |

### Gunicorn/Uvicorn Configuration

```bash
# Production startup
gunicorn sentinel.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers 4 \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name sentinel.yourdomain.com;

    ssl_certificate /etc/ssl/certs/sentinel.crt;
    ssl_certificate_key /etc/ssl/private/sentinel.key;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Database Setup

```bash
# Create PostgreSQL database
createdb sentinel

# Run migrations
alembic upgrade head

# Create initial admin user
python -m sentinel.scripts.create_admin \
  --email admin@yourdomain.com \
  --password <secure-password>
```

### SSL/TLS

Sentinel requires HTTPS in production. Use Let's Encrypt or your certificate provider:

```bash
# Let's Encrypt with certbot
certbot --nginx -d sentinel.yourdomain.com
```

## Cloud Deployment

### AWS (ECS/Fargate)

1. Push image to ECR
2. Create ECS task definition with the Sentinel container
3. Configure ALB with HTTPS listener
4. Set environment variables in task definition
5. Use RDS for PostgreSQL, ElastiCache for Redis

### Google Cloud (Cloud Run)

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/sentinel

# Deploy
gcloud run deploy sentinel \
  --image gcr.io/PROJECT_ID/sentinel \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=...,REDIS_URL=..."
```

### Azure (Container Apps)

```bash
az containerapp create \
  --name sentinel \
  --resource-group sentinel-rg \
  --image sentinel:latest \
  --target-port 8000 \
  --env-vars "DATABASE_URL=..." "REDIS_URL=..."
```

## Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentinel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sentinel
  template:
    metadata:
      labels:
        app: sentinel
    spec:
      containers:
      - name: sentinel
        image: sentinel:latest
        ports:
        - containerPort: 8000
        envFrom:
        - secretRef:
            name: sentinel-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: sentinel
spec:
  selector:
    app: sentinel
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
```

## Health Checks

Sentinel exposes health endpoints:

- `GET /health` — Basic liveness check
- `GET /health/ready` — Readiness (includes DB and Redis connectivity)
- `GET /health/detailed` — Full system status (requires auth)

## Monitoring

### Prometheus Metrics

Sentinel exports metrics at `/metrics`:

- `sentinel_requests_total` — Total requests processed
- `sentinel_guardrail_duration_seconds` — Guardrail execution latency
- `sentinel_policy_violations_total` — Policy violations detected
- `sentinel_llm_latency_seconds` — LLM call latency

### Logging

Structured JSON logs are written to stdout. Configure log aggregation with your preferred tool (ELK, Datadog, CloudWatch).

## Backup & Recovery

```bash
# Database backup
pg_dump sentinel > backup_$(date +%Y%m%d).sql

# Restore
psql sentinel < backup_20240101.sql

# Audit log export
python -m sentinel.scripts.export_audit \
  --start 2024-01-01 \
  --end 2024-12-31 \
  --output audit_2024.json
```

## Upgrading

```bash
# Pull latest
git pull origin main

# Update dependencies
pip install -e ".[dev]"

# Run migrations
alembic upgrade head

# Restart service
systemctl restart sentinel
```

## Troubleshooting

See [troubleshooting.md](./troubleshooting.md) for common deployment issues.
