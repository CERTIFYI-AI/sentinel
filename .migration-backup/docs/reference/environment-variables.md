# Environment Variables

> **Purpose**: Complete reference for every environment variable Sentinel reads at startup.

## Required Variables

Sentinel will not start without these variables set.

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/sentinel` | PostgreSQL connection string. Must include pgvector extension. |
| `SENTINEL_SECRET_KEY` | `your-secret-key-at-least-32-chars` | Used for JWT signing and Fernet encryption of PII redaction maps. Minimum 32 characters. |

## Provider API Keys

At least one provider key is required.

| Variable | Example | Description |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key. Required for GPT models. |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic API key. Required for Claude models. |
| `GOOGLE_API_KEY` | `AIza...` | Google AI API key. Required for Gemini models. |
| `AZURE_API_KEY` | `...` | Azure OpenAI API key. |
| `AZURE_API_BASE` | `https://your-resource.openai.azure.com` | Azure OpenAI endpoint URL. Required if using Azure. |
| `AZURE_API_VERSION` | `2024-02-01` | Azure OpenAI API version. Default: `2024-02-01`. |

## Optional Variables

### Server

| Variable | Default | Description |
|---|---|---|
| `SENTINEL_HOST` | `0.0.0.0` | Host to bind the HTTP server. |
| `SENTINEL_PORT` | `8000` | Port to bind the HTTP server. |
| `SENTINEL_WORKERS` | `1` | Number of uvicorn worker processes. Set to CPU count for production. |
| `SENTINEL_LOG_LEVEL` | `info` | Log level. Values: `debug`, `info`, `warning`, `error`. |
| `SENTINEL_CORS_ORIGINS` | `*` | Comma-separated list of allowed CORS origins. Use `*` for development only. |

### Redis

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string. Optional but recommended for production. |
| `REDIS_PASSWORD` | (none) | Redis password. Leave unset for no authentication. |
| `REDIS_DB` | `0` | Redis database number. |

### Trust Score

| Variable | Default | Description |
|---|---|---|
| `SENTINEL_DEFAULT_TRUST_PASS` | `0.85` | Default pass-through threshold for new tenants. |
| `SENTINEL_DEFAULT_TRUST_REGENERATE` | `0.60` | Default regeneration threshold. |
| `SENTINEL_DEFAULT_TRUST_UPGRADE` | `0.40` | Default upgrade threshold. |
| `SENTINEL_DEFAULT_TRUST_HITL` | `0.20` | Default HITL threshold. |
| `SENTINEL_DEFAULT_TRUST_BLOCK` | `0.0` | Default block threshold. |
| `SENTINEL_SIMILARITY_THRESHOLD` | `0.75` | Minimum cosine similarity for Golden Source matches. |
| `SENTINEL_NLI_MODEL` | `cross-encoder/nli-deberta-v3-base` | NLI model for entailment scoring. |
| `SENTINEL_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-transformers model for embeddings. |

### Sanitizer

| Variable | Default | Description |
|---|---|---|
| `SENTINEL_INJECTION_THRESHOLD` | `0.85` | Default injection detection threshold. |
| `SENTINEL_PII_ENTITIES` | `PERSON,EMAIL_ADDRESS,PHONE_NUMBER,CREDIT_CARD` | Default PII entity types to detect. Comma-separated. |
| `SENTINEL_SPACY_MODEL` | `en_core_web_lg` | spaCy model for Presidio NER. |

### Circuit Breaker

| Variable | Default | Description |
|---|---|---|
| `SENTINEL_CB_FAILURE_THRESHOLD` | `5` | Failures before circuit opens. |
| `SENTINEL_CB_RECOVERY_TIMEOUT` | `60` | Seconds before half-open state. |
| `SENTINEL_CB_HALF_OPEN_REQUESTS` | `3` | Test requests in half-open state. |
| `SENTINEL_MAX_REGENERATIONS` | `2` | Maximum regeneration attempts per request. |
| `SENTINEL_UPGRADE_MODEL` | `gpt-4o` | Default model for upgrade interventions. |

### HITL

| Variable | Default | Description |
|---|---|---|
| `SENTINEL_HITL_TIMEOUT` | `300` | Seconds before HITL timeout. |
| `SENTINEL_HITL_FALLBACK` | `best_candidate` | Action on HITL timeout. Values: `best_candidate`, `block`. |
| `SENTINEL_HITL_QUEUE_SIZE` | `1000` | Maximum pending HITL items. |

### Audit

| Variable | Default | Description |
|---|---|---|
| `SENTINEL_AUDIT_BUFFER_SIZE` | `10000` | Maximum buffered audit entries when PostgreSQL is unavailable. |
| `SENTINEL_AUDIT_FLUSH_INTERVAL` | `5` | Seconds between audit buffer flush attempts. |

### Performance

| Variable | Default | Description |
|---|---|---|
| `SENTINEL_THREAD_POOL_SIZE` | `4` | ThreadPoolExecutor size for CPU-bound operations (NLI, Presidio). |
| `SENTINEL_VECTOR_TOP_K` | `5` | Number of Golden Source chunks to retrieve per claim. |
| `SENTINEL_CHUNK_SIZE` | `512` | Token size for Golden Source document chunks. |
| `SENTINEL_CHUNK_OVERLAP` | `50` | Token overlap between consecutive chunks. |

## Example `.env` File

```bash
# Required
DATABASE_URL=postgresql://sentinel:password@localhost:5432/sentinel
SENTINEL_SECRET_KEY=change-this-to-a-random-32-char-string

# Provider (at least one required)
OPENAI_API_KEY=sk-your-openai-key

# Optional
REDIS_URL=redis://localhost:6379
SENTINEL_PORT=8000
SENTINEL_LOG_LEVEL=info
SENTINEL_WORKERS=4
```

## Validation

Run configuration validation to check all variables:

```bash
python -m sentinel.config --validate
```

This checks:
- Required variables are set.
- Connection strings are valid format.
- Secret key meets minimum length.
- At least one provider key is configured.
- Numeric values are within expected ranges.

## Next Steps

- [Error Codes](error-codes.md) — HTTP error codes and their meanings.
- [Configuration](../configuration.md) — Runtime configuration via API.
- [Deployment Guide](../deployment-guide.md) — Environment setup for production.
