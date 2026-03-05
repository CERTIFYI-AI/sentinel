# Configuration Guide

Sentinel is configured through environment variables and YAML configuration files.

## Environment Variables

All environment variables can be set in a `.env` file at the project root. See `.env.example` for a complete template.

### Core Settings

```bash
# Application
APP_NAME=sentinel
APP_ENV=production          # development, staging, production
DEBUG=false
LOG_LEVEL=INFO              # DEBUG, INFO, WARNING, ERROR, CRITICAL
SECRET_KEY=your-secret-key  # Min 32 characters, used for JWT signing

# Server
HOST=0.0.0.0
PORT=8000
MAX_WORKERS=4               # Uvicorn worker count
REQUEST_TIMEOUT=30          # Seconds
```

### Database

```bash
# PostgreSQL (required for production)
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/sentinel
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30

# SQLite (development only)
# DATABASE_URL=sqlite+aiosqlite:///./sentinel.db
```

### Redis

```bash
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=
REDIS_MAX_CONNECTIONS=50
CACHE_TTL=300               # Cache TTL in seconds
```

### LLM Provider

```bash
# OpenAI (default)
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-4o-mini
MODEL_TEMPERATURE=0.0
MODEL_MAX_TOKENS=1024

# Azure OpenAI
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=2024-02-01

# Anthropic
ANTHROPIC_API_KEY=

# Custom/Self-hosted (via LiteLLM)
LITELLM_API_BASE=http://localhost:4000
LITELLM_API_KEY=
```

### Authentication

```bash
JWT_SECRET_KEY=${SECRET_KEY}
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
API_KEY_HEADER=X-API-Key
```

### Guardrail Settings

```bash
GUARDRAIL_TIMEOUT_MS=5000        # Max execution time per guardrail
GUARDRAIL_PARALLEL=true          # Run guardrails in parallel
TOXICITY_MODEL=unitary/toxic-bert
TOXICITY_THRESHOLD=0.3
FACTUALITY_THRESHOLD=0.7
PII_DETECTION_ENABLED=true
BIAS_DETECTION_ENABLED=true
HALLUCINATION_THRESHOLD=0.5
PROMPT_INJECTION_THRESHOLD=0.5
```

### Rate Limiting

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_RPM=60                # Requests per minute
RATE_LIMIT_STRATEGY=sliding_window
```

### Audit Logging

```bash
ENABLE_AUDIT_LOG=true
AUDIT_LOG_RETENTION_DAYS=365
AUDIT_HASH_ALGORITHM=sha256
AUDIT_EXPORT_FORMAT=json         # json, csv
```

### Webhooks & Alerts

```bash
WEBHOOK_URL=                     # Alert webhook endpoint
WEBHOOK_SECRET=                  # HMAC signing secret
ALERT_ON_VIOLATION=true
ALERT_ON_ERROR=true
SLACK_WEBHOOK_URL=               # Optional Slack integration
```

### CORS

```bash
CORS_ORIGINS=http://localhost:3000,https://dashboard.yourdomain.com
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE
CORS_ALLOW_HEADERS=*
```

---

## YAML Configuration

Policy and guardrail configurations can also be defined in YAML files under `configs/`.

### Policy Configuration

```yaml
# configs/policies/medical_safety.yaml
name: Medical Safety Policy
version: "1.0.0"
domain: healthcare
description: Safety guardrails for medical AI applications
active: true

rules:
  - guardrail: toxicity
    threshold: 0.1
    action: BLOCK
    
  - guardrail: factuality
    threshold: 0.9
    action: FLAG
    
  - guardrail: pii_detection
    threshold: 0.0
    action: REDACT
    
  - guardrail: hallucination
    threshold: 0.3
    action: BLOCK

metadata:
  compliance: ["HIPAA", "FDA"]
  owner: compliance-team
  review_date: "2024-06-01"
```

### Guardrail Pipeline Configuration

```yaml
# configs/pipeline.yaml
pipeline:
  - name: prompt_injection
    enabled: true
    order: 1
    timeout_ms: 1000
    
  - name: toxicity
    enabled: true
    order: 2
    timeout_ms: 2000
    
  - name: pii_detection
    enabled: true
    order: 3
    timeout_ms: 500
    
  - name: factuality
    enabled: true
    order: 4
    timeout_ms: 5000
    
  - name: hallucination
    enabled: true
    order: 5
    timeout_ms: 5000
    
  - name: bias
    enabled: true
    order: 6
    timeout_ms: 2000

defaults:
  parallel: true
  fail_fast: false
  timeout_ms: 10000
```

---

## Configuration Precedence

1. Environment variables (highest priority)
2. `.env` file
3. YAML configuration files
4. Default values (lowest priority)

## Validating Configuration

```bash
# Validate all configuration
python -m sentinel.scripts.validate_config

# Check specific config file
python -m sentinel.scripts.validate_config --file configs/policies/medical_safety.yaml
```

## Configuration in Docker

```bash
# Pass env file
docker run --env-file .env sentinel:latest

# Pass individual variables
docker run -e DATABASE_URL=... -e REDIS_URL=... sentinel:latest

# Mount config directory
docker run -v ./configs:/app/configs sentinel:latest
```
