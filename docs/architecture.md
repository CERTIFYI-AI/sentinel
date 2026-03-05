# Architecture

> **Level**: 30-minute deep dive. Read this before contributing code or making adoption decisions.

## System Overview

Sentinel is a transparent proxy. Any application that calls an OpenAI-compatible API works with Sentinel by changing a single URL. Sentinel intercepts every request, runs it through a governance pipeline, forwards it to the LLM provider, and runs the response through a verification pipeline before returning it to the application.

The key architectural constraint: **Sentinel must never require code changes in the client application.** This means Sentinel implements the full OpenAI Chat Completions API (`POST /v1/chat/completions`) including streaming via SSE.

## Dual Pipeline Architecture

Sentinel processes requests through two complementary systems that operate at different layers:

### Proxy Pipeline (`sentinel/proxy.py`)

The main FastAPI application handles the HTTP request lifecycle:

1. **PolicyEngine** (`sentinel/rules.py`) — Evaluates request against registered `Rule` instances (PII detection, blocked topics, max token guard, prompt injection). Returns `PolicyResult` with action `ALLOW`, `BLOCK`, or `FLAG`.
2. **Provider Forward** — Uses `httpx.AsyncClient` to forward the sanitized request to the upstream LLM provider. Provider selection is based on `SentinelConfig.providers` configuration.
3. **Post-Response Policy** — Runs response-phase rules. If `PolicyAction.MODIFY`, replaces response content.
4. **FactChecker** (`sentinel/checker.py`) — Optional claim-level fact checking. Appends `sentinel_fact_check` to the response body.
5. **AuditLogger** (`sentinel/audit.py`) — Logs `AuditEvent` entries for every stage (`REQUEST_RECEIVED`, `POLICY_EVALUATED`, `FACT_CHECK_RUN`, `RESPONSE_SENT`, `ERROR_OCCURRED`).

### Governance Layers (`sentinel/layers/`)

The layers package implements the full trust-scoring and intervention pipeline:

#### Layer 1: Sanitizer (`sentinel/layers/sanitizer.py`)

**What it does**: Detects and masks PII in the prompt. Detects prompt injection attacks via cosine similarity against known seed embeddings.

**Two-mode operation**:
- **FULL**: Presidio + spaCy NLP pipeline (`en_core_web_lg`) for PII detection across 18+ entity types
- **FALLBACK**: Regex-based detection (5 entity types: `EMAIL_ADDRESS`, `PHONE_NUMBER`, `US_SSN`, `CREDIT_CARD`, `IP_ADDRESS`) when spaCy is unavailable

**Injection detection**: Computes cosine similarity between the input and pre-computed embeddings of known injection patterns stored in `data/injection_seeds.jsonl`. Uses `SentenceTransformer` (`all-MiniLM-L6-v2` by default). Falls back to keyword matching if sentence-transformers is not installed.

**Data in**: Raw user prompt (string), `TenantConfig`, `SentinelSettings`
**Data out**: `SanitizationResult` — sanitized text, blocked flag, injection score, PII entity types found, Fernet-encrypted redaction map

**Concurrency**: All CPU-bound work (`_sanitize_sync`) runs in a `ThreadPoolExecutor(max_workers=2)` via `asyncio.run_in_executor()`.

**Failure mode**: If Presidio fails, falls back to regex detection. If injection seeds file is missing, injection detection is disabled.

#### Layer 2: Verifier (`sentinel/layers/verifier.py`)

**What it does**: Computes a Trust Score for the LLM response through a five-step verification pipeline.

**Five-step pipeline**:
1. **Claim extraction** — Uses `litellm.acompletion()` with `gpt-4o-mini` to extract verifiable factual claims as a JSON array
2. **RAG retrieval** — Vector search against the Golden Source via `VectorStore.search()` (pgvector). Top-k=3 per claim, filtered by `golden_source_similarity_threshold` (default: 0.72)
3. **NLI scoring** — `CrossEncoder` (`cross-encoder/nli-deberta-v3-large`) scores each claim against retrieved evidence. Labels: `ENTAILMENT`, `CONTRADICTION`, `NEUTRAL`. Runs in `ThreadPoolExecutor(max_workers=2)`.
4. **N-cross-check** — Conditional. Triggered when RAG entailment score < `cross_check_trigger_threshold` (default: 0.80). Queries two independent models (`gpt-4o-mini`, `claude-3-haiku`) and computes semantic similarity of their responses.
5. **Semantic drift detection** — Default score 0.75 (baseline comparison placeholder).

**Trust Score formula**:

```
trust_score = 0.40 * rag_entailment
            + 0.30 * cross_check_agreement
            + 0.15 * pii_clean_factor
            + 0.15 * semantic_drift_score
```

- `rag_entailment` (weight 0.40): Average NLI confidence across all claims. Falls back to 0.5 if Golden Source is empty.
- `cross_check_agreement` (weight 0.30): Cosine similarity between two independent model responses. Default 0.75 if not triggered.
- `pii_clean_factor` (weight 0.15): 1.0 if no PII/injection detected, 0.0 otherwise.
- `semantic_drift_score` (weight 0.15): Behavioural stability signal. Default 0.75.

**Failure mode**: If claim extraction fails, returns trust_score=1.0 (no claims to verify). If NLI model is not loaded, all claims score 0.5 with label `NEUTRAL`.

#### Layer 3: Circuit Breaker (`sentinel/layers/circuit_breaker.py`)

**What it does**: Implements a four-level escalation cascade (L0→L1→L2→L3) when Trust Score falls below threshold.

**Cascade levels**:
- **L0 NONE**: Trust score ≥ `trust_score_block_threshold` (default: 0.85). Pass through.
- **L1 REGENERATE**: Trust score below threshold. Records failure in circuit breaker state. If failure count within `cb_window_seconds` (60s) reaches `cb_open_threshold` (5), opens the circuit.
- **L2 UPGRADE**: Circuit is OPEN. Routes to `fallback_model` (default: `gpt-4o`).
- **L3 HITL**: Enqueues a `HitlJob` to the `HitlQueue`. Returns `hitl_canned_response` to the client.

**State backend**: Auto-selected at startup:
- **Redis** (production): Persisted across restarts. Uses `redis.from_url()`.
- **In-memory** (`_InMemoryBackend`): Thread-safe with `threading.Lock`. State lost on restart. Logs warning.

**Circuit reset**: OPEN circuits auto-reset after `cb_reset_seconds` (default: 300s).

#### Layer 4: Auditor (`sentinel/layers/auditor.py`)

**What it does**: Writes a tamper-evident audit log entry for every request. Each `AuditEntry` includes SHA-256 hashes creating a hash chain (`prev_hash` → `entry_hash`).

**Data stored per entry**: `entry_id`, `tenant_id`, `request_id`, `timestamp`, `prompt_hash` (SHA-256), `response_hash` (SHA-256), `trust_score`, `intervention` level, `cost_usd`, `latency_ms`, `prev_hash`, `entry_hash`, metadata dict.

**Integrity verification**: `IntegrityReport` model walks the chain and reports `intact` status with `broken_at` list.

#### Layer 5: HITL Queue (`sentinel/hitl/queue.py`)

**What it does**: Routes low-trust responses to a human review queue. Accepts `HitlJob` objects containing the prompt, candidate responses, and scores. Publishes `HitlReview` submissions from human reviewers.

## Domain Models (`sentinel/models.py`)

All data structures that cross boundaries are Pydantic v2 `BaseModel` instances:

| Model | Purpose |
|---|---|
| `SanitizationResult` | Output of sanitizer (frozen) |
| `ClaimScore` | NLI score for one factual claim |
| `VerificationResult` | Full verifier output with trust score |
| `CircuitBreakerResult` | Circuit breaker decision with intervention level |
| `AuditEntry` | Immutable audit hash chain row |
| `HitlJob` / `HitlReview` | HITL queue job and reviewer submission |
| `TenantConfig` | Per-tenant threshold and model overrides |
| `LLMRequest` / `LLMResponse` | Proxy request/response models |
| `PolicyResult` / `PolicyViolation` | Policy engine output |
| `FactCheckResult` / `ClaimResult` | Fact checker output |

Key enums: `InterventionLevel` (NONE=0, REGENERATE=1, UPGRADE=2, HITL=3), `PolicyAction` (ALLOW, WARN, BLOCK, REVIEW, FLAG), `Severity` (LOW, MEDIUM, HIGH, CRITICAL), `FactCheckVerdict` (SUPPORTED, REFUTED, INCONCLUSIVE, UNCERTAIN).

## Configuration (`sentinel/config.py`)

Configuration uses `pydantic-settings` with `SENTINEL_` env prefix. Loads from environment variables first, then `.env` file. Key settings:

| Setting | Default | Description |
|---|---|---|
| `database_url` | **required** | PostgreSQL asyncpg connection string |
| `secret_key` | **required** | JWT signing key (min 32 chars) |
| `redis_url` | `None` | Redis URL. In-memory fallback if absent |
| `trust_score_block_threshold` | 0.85 | Below this triggers circuit breaker |
| `injection_block_threshold` | 0.78 | Above this blocks the request |
| `cross_check_trigger_threshold` | 0.80 | Below this triggers N-cross-check |
| `golden_source_similarity_threshold` | 0.72 | Minimum similarity for RAG hits |
| `spacy_model` | `en_core_web_lg` | spaCy model for Presidio |
| `embedding_model` | `all-MiniLM-L6-v2` | Sentence-transformers model |
| `nli_model` | `cross-encoder/nli-deberta-v3-large` | NLI cross-encoder |
| `fallback_model` | `gpt-4o` | Circuit breaker L2 model |
| `cb_open_threshold` | 5 | Failures before circuit opens |
| `cb_window_seconds` | 60 | Rolling failure window |
| `cb_reset_seconds` | 300 | Seconds before OPEN→CLOSED |

Sub-configs: `PolicyConfig` (`SENTINEL_POLICY_` prefix), `AuditConfig` (`SENTINEL_AUDIT_` prefix), `FactCheckConfig` (`SENTINEL_FACTCHECK_` prefix), `DashboardConfig` (`SENTINEL_DASHBOARD_` prefix).

## Storage Architecture

### PostgreSQL

- **Audit log** (`AuditEntry`): Append-only, hash-chained. Uses TimescaleDB hypertable for time-partitioned storage.
- **Golden Source** (`VectorStore`): Document chunks with vector embeddings via pgvector. HNSW index for approximate nearest neighbour search.
- **Tenant configuration** (`TenantConfig`): Per-tenant overrides for thresholds, models, PII entity types.
- **HITL queue** (`HitlJob`): Pending review items with candidate responses and scores.

### Redis (optional)

Circuit breaker state persistence. Without Redis, circuit breaker runs in-memory (thread-safe but not shared across instances).

## Concurrency Model

Sentinel runs on FastAPI with uvicorn, using Python's asyncio event loop.

- **Async I/O**: All HTTP calls (`httpx`), database queries, Redis operations, and WebSocket messages use async I/O.
- **ThreadPoolExecutor**: NLI inference (`CrossEncoder.predict()`) and Presidio analysis run in `ThreadPoolExecutor(max_workers=2)` via `asyncio.run_in_executor()`.
- **asyncio.gather()**: RAG search queries for multiple claims run in parallel. N-cross-check queries two models simultaneously.

## Design Decisions

### ADR-001: Python over Go for the proxy layer

**Decision**: Use Python with FastAPI and uvicorn.
**Reasoning**: The ML pipeline (spaCy, Presidio, sentence-transformers, CrossEncoder) is Python-native. Wrapping in Go via gRPC would add complexity. Python asyncio provides sufficient concurrency for expected throughput.

### ADR-002: pgvector over standalone vector database

**Decision**: Use pgvector extension for PostgreSQL.
**Reasoning**: Single database for audit logs, tenant config, HITL queue, and vectors. HNSW index provides sub-10ms search for up to 1M vectors.

### ADR-003: httpx for provider forwarding

**Decision**: Use `httpx.AsyncClient` for forwarding requests to LLM providers. LiteLLM is used selectively in the verifier layer for claim extraction and cross-checking.
**Reasoning**: Direct httpx forwarding keeps the proxy path simple and dependency-light. LiteLLM is only needed where multi-provider access is required (verifier cross-check).

### ADR-004: Models loaded at startup

**Decision**: Load NLI model (~400MB) and embedding model once at startup via `startup()` functions in each layer module.
**Reasoning**: Per-request loading would take 3-5s. Memory cost ~800MB but provides consistent ~200ms inference.

### ADR-005: Append-only audit log with hash chain

**Decision**: Each `AuditEntry` includes SHA-256 hash of the previous entry.
**Reasoning**: Cryptographic proof that no entries have been inserted, modified, or deleted. `IntegrityReport` walks the chain to verify.

## Extension Points

### Adding a new policy rule

Subclass `Rule` in `sentinel/rules.py`. Implement `async evaluate(text, context) -> PolicyViolation | None`. Register with `PolicyEngine.register_rule(rule, phase="both")`.

### Adding a new pipeline layer

Create a module in `sentinel/layers/` with `startup(settings)` and an async function matching the layer's purpose. Wire it into the pipeline in `sentinel/proxy.py`.

### Adding Golden Source documents

Use `scripts/seed_golden_source.py`. Documents are chunked (512 tokens, 50-token overlap) and embedded via `SentenceTransformer`.
