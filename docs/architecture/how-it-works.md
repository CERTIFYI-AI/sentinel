# How It Works

> **Level**: 5-minute read. Understand the full request lifecycle before diving into code.

Sentinel sits between your application and the LLM provider. Your application sends requests to Sentinel instead of directly to OpenAI (or any other provider). Sentinel intercepts every request, runs it through a governance pipeline, and returns the response with trust metadata attached.

The only change in your application: replace the base URL.

```python
# Before
client = OpenAI(base_url="https://api.openai.com/v1")

# After
client = OpenAI(base_url="http://localhost:8000/v1")
```

No SDK changes. No wrapper functions. No new dependencies.

## Request Lifecycle

Every request passes through five stages in order. Each stage has a single responsibility and produces a specific output.

```
Your App ──POST /v1/chat/completions──▶ Sentinel Proxy
                                           │
                                    ┌──────┴──────┐
                                    │  1. SANITIZE │ (30-80ms)
                                    │  PII + Inject│
                                    └──────┬──────┘
                                           │
                                    ┌──────┴──────┐
                                    │  2. FORWARD  │
                                    │  to LLM      │
                                    └──────┬──────┘
                                           │
                                    ┌──────┴──────┐
                                    │  3. VERIFY   │ (150-400ms)
                                    │  RAG + NLI   │
                                    └──────┬──────┘
                                           │
                                    ┌──────┴──────┐
                                    │ 4. CIRCUIT   │ (0ms or retry)
                                    │    BREAKER   │
                                    └──────┬──────┘
                                           │
                                    ┌──────┴──────┐
                                    │  5. AUDIT    │ (async, ~5ms)
                                    │  hash chain  │
                                    └──────┬──────┘
                                           │
                                    Response + Headers
                                           │
                                    ◀──────┘
```

## Stage 1: Sanitize

**File**: `sentinel/layers/sanitizer.py`
**Latency**: 30–80ms
**Purpose**: Protect the LLM provider from receiving PII and detect prompt injection attacks.

The sanitizer runs two checks in parallel:

### PII Detection and Masking

Sentinel uses Microsoft Presidio with a spaCy NLP backend (`en_core_web_lg`) to detect PII entities in the prompt. Detected entities are replaced with redaction tokens like `[EMAIL_ADDRESS_1]`.

The mapping between tokens and original values is encrypted with Fernet symmetric encryption and stored in the `SanitizationResult`. This allows the response to be de-redacted before delivery if needed.

Supported entity types by default:
- `EMAIL_ADDRESS`
- `PHONE_NUMBER`
- `US_SSN`
- `CREDIT_CARD`
- `IP_ADDRESS`

Per-tenant configuration can add custom entity types and regex patterns through `TenantConfig.pii_entity_types` and `TenantConfig.custom_pii_patterns`.

> **NOTE**: If spaCy is not installed, the sanitizer falls back to regex-based detection. Regex mode catches common patterns but misses context-dependent entities like names. Use spaCy in production.

### Prompt Injection Detection

The sanitizer computes cosine similarity between the prompt embedding and a set of known injection seed embeddings. If the similarity exceeds `injection_block_threshold` (default: 0.78), the request is blocked.

The embedding model (`all-MiniLM-L6-v2`) is loaded once at startup and reused across requests. Inference runs in a `ThreadPoolExecutor` to avoid blocking the async event loop.

**What happens if blocked**: The proxy returns HTTP 400 with error code `INJECTION_DETECTED`. An audit entry is still written so compliance teams can see blocked requests.

## Stage 2: Forward to LLM Provider

**File**: `sentinel/proxy.py` (`_forward_to_provider`)
**Latency**: Depends on provider (typically 500–3000ms)
**Purpose**: Send the sanitized prompt to the configured LLM provider.

Sentinel forwards the request to the first enabled provider in the configuration. The provider is selected by matching `request.provider` against configured provider names. If no provider is specified, Sentinel uses the first enabled provider.

The request is sent using `httpx.AsyncClient` with the provider's API key and base URL. The response is parsed into an `LLMResponse` model.

**What happens on failure**: If the provider returns an error or times out, Sentinel logs an `ERROR_OCCURRED` audit event and returns HTTP 502 to the caller.

## Stage 3: Verify

**File**: `sentinel/layers/verifier.py`
**Latency**: 150–400ms
**Purpose**: Score the factual accuracy of the LLM response against the Golden Source.

Verification runs in three steps:

### Step 3a: Claim Extraction

The verifier splits the LLM response into individual factual claims. Each claim is a standalone assertion that can be independently verified.

### Step 3b: RAG Retrieval

For each claim, the verifier searches the Golden Source (pgvector) for the most similar documents using cosine similarity with HNSW indexing. Documents above `golden_source_similarity_threshold` (default: 0.72) are used as evidence.

### Step 3c: NLI Scoring

Each claim-evidence pair is scored using a cross-encoder NLI model (`cross-encoder/nli-deberta-v3-large`). The model classifies each pair as ENTAILMENT, CONTRADICTION, or NEUTRAL with a confidence score.

Claims are batched into groups of up to `max_nli_batch_size` (default: 32) for a single `CrossEncoder.predict()` call. This cuts NLI latency from O(n * 200ms) to ~200ms total.

### Trust Score Computation

The Trust Score is a weighted combination of four components:

```
trust_score = (w1 * rag_entailment) + (w2 * cross_check) + (w3 * semantic_drift) + (w4 * pii_clean)
```

Default weights: w1=0.40, w2=0.25, w3=0.20, w4=0.15

See [Trust Score Reference](../reference/trust-score.md) for the full formula and tuning guide.

> **NOTE**: If the Golden Source is empty, `rag_entailment_score` defaults to 0.5 and `golden_source_empty` is set to `true` in the `VerificationResult`. Sentinel cannot verify facts without a Golden Source. Populate it before deploying to production.

### N-Cross-Check

If the initial Trust Score falls below `cross_check_trigger_threshold` (default: 0.80), Sentinel sends the same prompt to a second provider and compares the two responses for semantic agreement. This increases confidence but adds latency and cost.

## Stage 4: Circuit Breaker

**File**: `sentinel/layers/circuit_breaker.py`
**Latency**: 0ms (pass-through) or variable (retry/escalation)
**Purpose**: Decide what to do when the Trust Score is below the block threshold.

The circuit breaker implements a four-level escalation cascade:

| Level | Name | Action | Added Latency | Added Cost |
|-------|------|--------|---------------|------------|
| L0 | NONE | Trust Score >= threshold. Pass through. | 0ms | $0 |
| L1 | REGENERATE | Re-prompt the same provider with temperature=0. | +500–1500ms | +1x |
| L2 | UPGRADE | Send to a stronger model (e.g., GPT-4o). | +1000–3000ms | +2–5x |
| L3 | HITL | Queue for human review. Return canned response. | 0ms (async) | Staff time |

The circuit breaker also tracks provider health using a state machine (CLOSED → OPEN → HALF_OPEN → CLOSED). If a provider fails `cb_open_threshold` times (default: 5) within `cb_window_seconds` (default: 60), the circuit opens and requests are routed to the fallback provider.

State is stored in Redis. Without Redis, state is kept in-memory and lost on restart.

See [Circuit Breaker Reference](../reference/circuit-breaker.md) for the full state machine diagram.

## Stage 5: Audit

**File**: `sentinel/audit.py`
**Latency**: ~5ms (async, non-blocking)
**Purpose**: Write a tamper-proof record of every request, decision, and response.

Every request generates an `AuditEntry` with:
- SHA-256 hash of the original prompt
- SHA-256 hash of the delivered response
- Trust Score
- Intervention level (L0–L3)
- Cost in USD
- Latency in milliseconds
- A `prev_hash` field linking to the previous entry
- An `entry_hash` field (SHA-256 of all fields + `prev_hash`)

This creates an append-only hash chain. If any entry is modified or deleted, the chain breaks. You can verify chain integrity at any time:

```bash
curl http://localhost:8000/api/audit/integrity
```

The response shows `intact: true` or lists the entries where the chain broke.

> **WARNING**: The audit log stores hashes of prompts, not the prompts themselves. This is a deliberate data minimisation decision for GDPR Article 25 compliance. If you need to store full prompts, enable it explicitly in the configuration and understand the privacy implications.

## Response Headers

Sentinel adds metadata headers to every response:

| Header | Type | Description |
|--------|------|-------------|
| `X-Sentinel-Trust-Score` | float | 0.0–1.0. Higher is more trustworthy. |
| `X-Sentinel-Intervention` | string | NONE, REGENERATE, UPGRADE, or HITL |
| `X-Sentinel-Request-Id` | UUID | Use this to query the audit log. |
| `X-Sentinel-Latency-Ms` | float | Total pipeline latency in milliseconds. |

Your application can use these headers to make decisions. For example, show a disclaimer to users when `X-Sentinel-Trust-Score` is below 0.90.

## What Sentinel Does Not Do

- **Sentinel does not train or fine-tune models.** It works with any OpenAI-compatible provider.
- **Sentinel does not guarantee correctness.** The NLI model is probabilistic. A Trust Score of 0.95 means high confidence, not certainty.
- **Sentinel does not replace human oversight.** The HITL system is an escalation path, not a substitute for review processes.
- **Sentinel does not store prompts by default.** Only hashes are stored. Enable full prompt storage explicitly if your compliance program requires it.

## Latency Budget

Typical end-to-end latency breakdown for a non-cached request:

| Stage | Latency | Notes |
|-------|---------|-------|
| Sanitize | 30–80ms | CPU-bound. Runs in thread pool. |
| LLM Provider | 500–3000ms | Network-bound. Provider dependent. |
| Verify | 150–400ms | CPU-bound (NLI) + I/O (pgvector). |
| Circuit Breaker | 0ms | Pass-through at L0. |
| Audit | ~5ms | Async write. Does not block response. |
| **Total overhead** | **180–485ms** | **Added by Sentinel on top of provider latency.** |

GPU acceleration reduces the Verify stage from 150–400ms to 15–40ms. See [Scaling Guide](../operations/scaling.md).

## Next Steps

- [Quickstart](../guides/quickstart.md) — Send your first verified request in 10 minutes.
- [Architecture](overview.md) — 30-minute deep dive into system design.
- [Trust Score Reference](../reference/trust-score.md) — Understand and tune the scoring formula.
- [Configuration](../getting-started/configuration.md) — Every configuration option explained.
