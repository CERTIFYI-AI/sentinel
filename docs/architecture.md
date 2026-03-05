# Architecture

> **Level**: 30-minute deep dive. Read this before contributing code or making adoption decisions.

## System Overview

Sentinel is a transparent proxy. Any application that calls an OpenAI-compatible API works with Sentinel by changing a single URL. Sentinel intercepts every request, runs it through a governance pipeline, forwards it to the LLM provider, and runs the response through a verification pipeline before returning it to the application.

The key architectural constraint: **Sentinel must never require code changes in the client application.** This means Sentinel implements the full OpenAI Chat Completions API (`POST /v1/chat/completions`) including streaming via SSE.

## The Five Layers

### Layer 1: Sanitizer (`sentinel/layers/sanitizer.py`)

**What it does**: Detects and masks PII in the prompt. Detects prompt injection attacks.

**Why it is a separate layer**: PII masking must happen before the prompt leaves the Sentinel boundary. Injection detection must happen before the prompt reaches the LLM provider.

**Data in**: Raw user prompt (string)
**Data out**: Sanitized prompt (PII tokens replaced), redaction map (Fernet-encrypted), injection_detected flag

**Failure mode**: If Presidio fails, Sentinel falls back to regex-based PII detection. If regex also fails, the prompt passes through with a `pii_detection_degraded: true` flag in the audit log.

### Layer 2: Verifier (`sentinel/layers/verifier.py`)

**What it does**: Computes a Trust Score for the LLM response by checking factual claims against the Golden Source.

**Why it is a separate layer**: Verification requires ML inference (NLI model) and vector search (pgvector). These are the most compute-intensive operations and must be independently scalable.

**Data in**: LLM response (string), sanitized prompt, tenant configuration
**Data out**: Trust Score (0.0-1.0), claim-level breakdown, intervention decision (NONE/REGENERATE/UPGRADE/HITL)

**Failure mode**: If the Golden Source is empty, all factual claims receive a 0.5 fallback score. If the NLI model fails, the system falls back to semantic similarity only (less accurate but functional).

### Layer 3: Circuit Breaker (`sentinel/layers/circuit_breaker.py`)

**What it does**: Manages provider health and implements the fallback cascade when a Trust Score is below threshold.

**Why it is a separate layer**: Fault tolerance logic must be independent of verification logic. The circuit breaker manages provider state across requests.

**Data in**: Trust Score, intervention decision, provider health state
**Data out**: Final response (original, regenerated, or upgraded), provider used, circuit breaker state

**Failure mode**: If all providers are unavailable, the circuit breaker returns a 503 with error code `ALL_PROVIDERS_UNAVAILABLE`. If Redis is unavailable, circuit breaker state falls back to in-memory (not shared across instances).

### Layer 4: Auditor (`sentinel/layers/auditor.py`)

**What it does**: Writes a tamper-evident audit log entry for every request.

**Why it is a separate layer**: Audit logging must happen regardless of whether the response was successful. The audit layer runs after every request, including blocked requests.

**Data in**: Request metadata, response hash, Trust Score, intervention decision, redaction summary
**Data out**: Audit entry ID, hash chain entry

**Failure mode**: If PostgreSQL is unavailable, audit entries are buffered in memory and flushed when the connection recovers. The buffer is bounded (default: 10,000 entries). If the buffer fills, Sentinel returns 503 — it will not serve responses it cannot audit.

### Layer 5: HITL Queue (`sentinel/hitl/queue.py`)

**What it does**: Routes low-trust responses to a human review queue.

**Why it is a separate layer**: Human review is asynchronous. The HITL queue decouples the synchronous request pipeline from the asynchronous review workflow.

**Data in**: Request with Trust Score below HITL threshold, candidate responses from L1/L2 retries
**Data out**: Queue entry with job ID, WebSocket notification to dashboard

**Failure mode**: If the queue is full or the reviewer does not respond within the configured timeout, the highest-scoring candidate response is returned with `intervention: HITL_TIMEOUT` in the audit log.

## Data Flow Diagram

```
Client Application
       |
       | POST /v1/chat/completions
       | {model, messages, ...}
       |
       v
+----------------------------------------------+
| SANITIZER                                    |
| 1. Extract prompt text from messages         |
| 2. Run Presidio PII detection (spaCy NLP)    |
| 3. Replace PII tokens, encrypt redaction map |
| 4. Compute injection similarity score        |
| 5. Block if injection_score > 0.85           |
|                                              |
| OUT: sanitized_prompt, redaction_map,        |
|      injection_detected                      |
+----------------------------------------------+
       |
       | sanitized prompt
       v
+----------------------------------------------+
| LLM PROVIDER (via LiteLLM)                   |
| Forward sanitized prompt to provider         |
| Receive response                             |
+----------------------------------------------+
       |
       | raw LLM response
       v
+----------------------------------------------+
| VERIFIER                                     |
| 1. Extract claims from response (sentence    |
|    segmentation)                             |
| 2. For each claim:                           |
|    a. Vector search Golden Source (top-k=5)  |
|    b. Compute semantic similarity            |
|    c. Run NLI entailment (DeBERTa)           |
| 3. Compute weighted Trust Score              |
| 4. Determine intervention level              |
|                                              |
| OUT: trust_score, claim_scores[],            |
|      intervention                            |
+----------------------------------------------+
       |
       | trust_score < threshold?
       v
+----------------------------------------------+
| CIRCUIT BREAKER                              |
| If NONE: pass through                        |
| If REGENERATE: retry same provider           |
| If UPGRADE: try higher-tier provider         |
| If HITL: queue for human review              |
+----------------------------------------------+
       |
       v
+----------------------------------------------+
| AUDITOR                                      |
| 1. Hash response content (SHA-256)           |
| 2. Hash previous audit entry (chain)         |
| 3. Write append-only audit entry             |
| 4. Emit WebSocket event                      |
+----------------------------------------------+
       |
       v
Client Application receives response
with X-Sentinel-* headers
```

## Storage Architecture

### PostgreSQL

**Audit log table** (`sentinel_audit_log`): Append-only, hash-chained. Partitioned by time (monthly) using TimescaleDB hypertable. Indexed by `tenant_id`, `timestamp`, `request_id`.

**Golden Source table** (`sentinel_golden_source`): Document chunks with vector embeddings. pgvector extension with HNSW index for approximate nearest neighbour search. Indexed by `tenant_id` and embedding vector.

**Tenant configuration table** (`sentinel_tenants`): Per-tenant overrides for trust thresholds, provider preferences, and PII entity types.

**HITL queue table** (`sentinel_hitl_queue`): Pending review items with candidate responses and claim-level breakdowns.

### Redis

Redis stores ephemeral state that must be shared across Sentinel instances:

| Key Pattern | TTL | Purpose |
|-------------|-----|--------|
| `sentinel:cb:{provider}:state` | None (explicit) | Circuit breaker state (CLOSED/OPEN/HALF_OPEN) |
| `sentinel:cb:{provider}:failures` | 60s | Rolling failure counter |
| `sentinel:rate:{tenant_id}` | 60s | Rate limit counter per tenant |
| `sentinel:metrics:trust_histogram` | 3600s | Pre-aggregated trust score distribution |

**Without Redis**: Circuit breaker state is in-memory (not shared across instances). Rate limiting is per-instance. Metrics are not pre-aggregated. This is acceptable for development but not production.

## Concurrency Model

Sentinel runs on FastAPI with uvicorn, using Python's asyncio event loop.

**Async I/O (event loop)**: All HTTP calls to LLM providers, PostgreSQL queries, Redis operations, and WebSocket messages use async I/O. The event loop is never blocked by I/O.

**ThreadPoolExecutor (CPU-bound)**: The NLI model (`CrossEncoder.predict()`) and Presidio analysis are CPU-bound. These run in a `ThreadPoolExecutor` via `asyncio.run_in_executor()` to avoid blocking the event loop. Default pool size: 4 threads.

**asyncio.gather()**: When verifying multiple claims, Sentinel runs vector search queries in parallel using `asyncio.gather()`. NLI inference is batched (not parallelised) because the model benefits from batch processing.

## Trust Score Formula

```
Trust Score = w1 * semantic_similarity + w2 * nli_entailment + w3 * pii_injection_clean + w4 * source_coverage
```

Default weights:
- `w1 = 0.25` (semantic similarity between response and Golden Source chunks)
- `w2 = 0.40` (NLI entailment probability from DeBERTa)
- `w3 = 0.15` (1.0 if no PII/injection detected, 0.0 otherwise)
- `w4 = 0.20` (proportion of claims with at least one Golden Source match above similarity threshold)

The NLI component (`w2`) has the highest weight because it directly measures whether the Golden Source supports the claim. Semantic similarity (`w1`) captures topical relevance. Source coverage (`w4`) penalises responses that make many claims not grounded in any source. PII/injection cleanliness (`w3`) is a binary safety signal.

## Design Decisions

### ADR-001: Python over Go for the proxy layer

**Context**: The proxy must handle concurrent HTTP requests with low latency. Go would provide better raw throughput.

**Decision**: Use Python with FastAPI and uvicorn.

**Reasoning**: The ML inference pipeline (spaCy, Presidio, sentence-transformers, CrossEncoder) is Python-native. Wrapping it in Go via gRPC would add complexity and latency. Python's asyncio provides sufficient concurrency for the expected throughput (< 10,000 req/min). The bottleneck is NLI inference, not the proxy framework.

**Consequences**: Max throughput on CPU is approximately 200 req/min per instance (limited by NLI). GPU acceleration brings this to ~2,000 req/min. Horizontal scaling is required for higher throughput.

### ADR-002: pgvector over standalone vector database

**Context**: The Golden Source requires vector similarity search. Options: pgvector, Weaviate, Pinecone, Qdrant.

**Decision**: Use pgvector extension for PostgreSQL.

**Reasoning**: One fewer service to operate. Audit logs, tenant config, HITL queue, and vectors all live in the same database. HNSW index in pgvector provides sub-10ms search latency for up to 1M vectors. For larger deployments, pgvector can be replaced with a standalone vector database without changing the application code.

**Consequences**: Deployment requires PostgreSQL with pgvector extension. Vector search performance degrades above ~5M vectors without index tuning.

### ADR-003: LiteLLM for provider abstraction

**Context**: Sentinel must support OpenAI, Anthropic, Google, and custom providers.

**Decision**: Use LiteLLM as the provider abstraction layer.

**Reasoning**: LiteLLM provides a unified interface for 100+ LLM providers. It handles API differences, retry logic, and streaming format conversion. Writing custom provider adapters for each would be significant ongoing maintenance.

**Consequences**: LiteLLM is a dependency. If LiteLLM has a bug with a specific provider, Sentinel is affected.

### ADR-004: Sentence-transformers loaded at startup

**Context**: The NLI model (DeBERTa, ~400MB) must be available for every request.

**Decision**: Load the model once at application startup and hold it in memory.

**Reasoning**: Loading the model takes 3-5 seconds. Loading per-request would make Sentinel unusable. Holding it in memory uses ~800MB RAM but provides consistent ~200ms inference latency.

**Consequences**: Sentinel requires at least 2GB RAM. Cold start takes 5-10 seconds. Model updates require a process restart.

### ADR-005: Append-only audit log with hash chain

**Context**: Compliance frameworks require evidence that audit logs have not been modified.

**Decision**: Each audit entry includes the SHA-256 hash of the previous entry, creating a hash chain.

**Reasoning**: A hash chain provides cryptographic proof that no entries have been inserted, modified, or deleted. This is simpler and cheaper to verify than blockchain-based alternatives. The `GET /api/audit/integrity` endpoint walks the chain and verifies every hash.

**Consequences**: Audit entries cannot be deleted (by design). Log rotation requires archiving, not deletion. The integrity check is O(n) in the number of entries.

## Extension Points

### Adding a new pipeline layer

Implement `BaseLayer` in `sentinel/layers/your_layer.py`. Register it in the pipeline ordering in `sentinel/proxy.py`. Layers are called in order; each receives the full request context and previous layer results.

### Adding a new LLM provider

Implement `BaseProvider` in `sentinel/providers/your_provider.py`. Register it in `sentinel/providers/__init__.py`. LiteLLM handles most providers; custom providers are for self-hosted models.

### Adding a new golden source document type

Add a parser in `scripts/seed_golden_source.py`. The parser must output chunks in the format `{"text": str, "metadata": dict, "doc_id": str}`. Chunking strategy: 512 tokens with 50-token overlap.

### Adding a new compliance framework mapping

Create `docs/compliance/your-framework-mapping.md`. Follow the table format in existing mappings. Each row must reference a specific Sentinel function and the evidence artifact it produces.
