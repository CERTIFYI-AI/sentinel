# Configuration

> **Level**: 10-minute read. Covers every setting Sentinel accepts and how to override defaults.

Sentinel uses [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) for configuration. Every setting can be provided as an **environment variable** (highest priority), in a **`.env` file**, or left at its validated default.

## How Configuration Loads

```text
Environment variable   ->  .env file  ->  Default value
(highest priority)                        (lowest priority)
```

The central class is `SentinelSettings` in `sentinel/config.py`. At startup, `load_settings()` builds and validates the config, logs a redacted summary, and fails fast on missing required values.

All environment variables use the prefix `SENTINEL_`. For example, the field `database_url` maps to the environment variable `SENTINEL_DATABASE_URL`.

## Required Settings

These two settings have **no defaults** and the application will refuse to start without them:

| Environment Variable | Type | Description |
|---|---|---|
| `SENTINEL_DATABASE_URL` | PostgresDsn | asyncpg connection string, e.g. `postgresql+asyncpg://user:pass@host:5432/sentinel` |
| `SENTINEL_SECRET_KEY` | str (min 32 chars) | Secret used for JWT signing. Generate with `openssl rand -hex 32` |

## Core Settings

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_VERSION` | str | `0.2.0` | Application version label |
| `SENTINEL_HOST` | str | `0.0.0.0` | Server bind address |
| `SENTINEL_PORT` | int | `8000` | Server bind port |
| `SENTINEL_ALLOWED_ORIGINS` | list[str] | `["*"]` | CORS allowed origins |
| `SENTINEL_RATE_LIMIT_RPM` | int | `60` | Max requests per minute per tenant |

## Redis

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_REDIS_URL` | RedisDsn or None | `None` | Redis connection URL. If absent, circuit breaker and rate limiting run in-memory (not shared across instances) |

> **Warning**: Without Redis, circuit breaker state is lost on restart and not shared across instances. Always set `SENTINEL_REDIS_URL` in production.

## Trust Thresholds

These control when Sentinel intervenes on LLM responses:

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_TRUST_SCORE_BLOCK_THRESHOLD` | float (0.0-1.0) | `0.85` | Responses below this score trigger the circuit breaker cascade |
| `SENTINEL_INJECTION_BLOCK_THRESHOLD` | float (0.0-1.0) | `0.78` | Prompts with injection similarity above this score are blocked |
| `SENTINEL_CROSS_CHECK_TRIGGER_THRESHOLD` | float (0.0-1.0) | `0.80` | Below this score, a second LLM provider is queried for cross-checking |
| `SENTINEL_GOLDEN_SOURCE_SIMILARITY_THRESHOLD` | float (0.0-1.0) | `0.72` | Minimum cosine similarity for a Golden Source chunk to count as evidence |

## ML Models

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_FALLBACK_MODEL` | str | `gpt-4o` | LLM model used when the circuit breaker upgrades |
| `SENTINEL_SPACY_MODEL` | str | `en_core_web_lg` | spaCy model for NLP (used by Presidio PII detection) |
| `SENTINEL_EMBEDDING_MODEL` | str | `all-MiniLM-L6-v2` | Sentence-transformers model for vector embeddings |
| `SENTINEL_NLI_MODEL` | str | `cross-encoder/nli-deberta-v3-large` | CrossEncoder model for natural language inference |
| `SENTINEL_MAX_NLI_BATCH_SIZE` | int | `32` | Max batch size for NLI inference |

## Circuit Breaker

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_CB_OPEN_THRESHOLD` | int | `5` | Number of failures before a provider circuit opens |
| `SENTINEL_CB_WINDOW_SECONDS` | int | `60` | Rolling window for counting failures |
| `SENTINEL_CB_RESET_SECONDS` | int | `300` | Time before an open circuit transitions to half-open |

## Human-in-the-Loop (HITL)

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_HITL_QUEUE_NAME` | str | `sentinel-hitl` | Name of the HITL review queue |
| `SENTINEL_HITL_CANNED_RESPONSE` | str | (see below) | Response returned to the user while a HITL review is pending |

Default canned response:

```text
I want to make sure I give you accurate information on this.
Let me verify the details and get back to you shortly.
```

## Sub-Module Configuration

Sentinel also defines separate settings classes with their own env prefixes:

### Policy Engine (`SENTINEL_POLICY_` prefix)

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_POLICY_MAX_PROMPT_LENGTH` | int | `10000` | Max prompt length in characters before rejection |
| `SENTINEL_POLICY_BLOCKED_TOPICS` | list[str] | `[]` | List of blocked topic strings |
| `SENTINEL_POLICY_CONTENT_POLICY_ENABLED` | bool | `true` | Enable content policy evaluation |

### Audit (`SENTINEL_AUDIT_` prefix)

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_AUDIT_ENABLED` | bool | `true` | Enable audit logging |
| `SENTINEL_AUDIT_RETENTION_DAYS` | int | `180` | Days to retain audit entries before archival |
| `SENTINEL_AUDIT_EXPORT_FORMAT` | str | `csv` | Default export format (`csv` or `json`) |

### Fact Checking (`SENTINEL_FACTCHECK_` prefix)

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_FACTCHECK_ENABLED` | bool | `true` | Enable fact-checking on responses |
| `SENTINEL_FACTCHECK_MIN_CONFIDENCE` | float (0.0-1.0) | `0.7` | Minimum confidence for a claim verdict |
| `SENTINEL_FACTCHECK_MAX_CLAIMS_PER_RESPONSE` | int | `20` | Max claims extracted per response |

### Dashboard (`SENTINEL_DASHBOARD_` prefix)

| Environment Variable | Type | Default | Description |
|---|---|---|---|
| `SENTINEL_DASHBOARD_ENABLED` | bool | `true` | Enable the dashboard API |
| `SENTINEL_DASHBOARD_REFRESH_INTERVAL_SECONDS` | int | `5` | WebSocket metrics push interval |
| `SENTINEL_DASHBOARD_MAX_AUDIT_ENTRIES` | int | `500` | Max audit entries returned in dashboard queries |

## Example `.env` File

```bash
# Required
SENTINEL_DATABASE_URL=postgresql+asyncpg://sentinel:password@localhost:5432/sentinel
SENTINEL_SECRET_KEY=change-me-to-a-64-char-hex-string-generated-by-openssl

# Redis (recommended for production)
SENTINEL_REDIS_URL=redis://localhost:6379/0

# Server
SENTINEL_HOST=0.0.0.0
SENTINEL_PORT=8000

# Trust thresholds
SENTINEL_TRUST_SCORE_BLOCK_THRESHOLD=0.85
SENTINEL_INJECTION_BLOCK_THRESHOLD=0.78

# Models
SENTINEL_FALLBACK_MODEL=gpt-4o
SENTINEL_NLI_MODEL=cross-encoder/nli-deberta-v3-large

# Circuit breaker
SENTINEL_CB_OPEN_THRESHOLD=5
SENTINEL_CB_RESET_SECONDS=300

# Audit
SENTINEL_AUDIT_RETENTION_DAYS=365
```

## Configuration in Docker

```bash
# Pass env file
docker run --env-file .env certifyi/sentinel:latest

# Pass individual variables
docker run \
  -e SENTINEL_DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/sentinel \
  -e SENTINEL_SECRET_KEY=$(openssl rand -hex 32) \
  -e SENTINEL_REDIS_URL=redis://redis:6379/0 \
  certifyi/sentinel:latest
```

## Validating Configuration

Sentinel validates all configuration at startup using Pydantic. If any required value is missing or a value fails validation (for example, a threshold outside 0.0-1.0), the process exits immediately with a descriptive error.

At startup, the `log_summary()` method prints every setting with secrets redacted:

```text
config: database_url = ***
config: host = 0.0.0.0
config: port = 8000
config: secret_key = ***
config: trust_score_block_threshold = 0.85
...
```

## Per-Tenant Overrides

Tenants can override a subset of global settings. These are stored in the `sentinel_tenants` PostgreSQL table and loaded per-request. See the `TenantConfig` model in `sentinel/models.py` for the full list:

- `trust_score_block_threshold`
- `injection_block_threshold`
- `primary_model` and `fallback_model`
- `pii_entity_types` (e.g. `["EMAIL_ADDRESS", "PHONE_NUMBER", "US_SSN"]`)
- `custom_pii_patterns`
- `hitl_canned_response`

## Related Documentation

- [Environment Variables Reference](../reference/environment-variables.md) -- canonical table of every env var
- [Getting Started](installation.md) -- minimal config to run locally
- [Deployment Guide](../operations/deployment.md) -- production configuration patterns
