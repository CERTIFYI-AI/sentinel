# Guardrails Reference

> **Level:** 30-minute deep dive. Read this before tuning detection thresholds or writing custom rules.

Sentinel ships with two guardrail layers that operate at different points in the request lifecycle. The **governance pipeline** (`sentinel/layers/sanitizer.py` + `sentinel/rules.py`) inspects requests *before* they reach the LLM. The **verification pipeline** (`sentinel/layers/verifier.py`) inspects responses *after* they return.

---

## Governance Pipeline (Pre-LLM)

Every inbound request passes through two stages in order: the **sanitizer** and the **policy engine**.

### Stage 1 — Sanitizer (`sentinel/layers/sanitizer.py`)

The sanitizer runs two independent checks on the raw prompt text:

#### Prompt-Injection Detection

| Mode | Condition | Method |
|------|-----------|--------|
| **Embedding** | `sentence-transformers` installed | Cosine similarity against seed embeddings in `data/injection_seeds.jsonl` |
| **Keyword fallback** | Library missing | Keyword hit-ratio against the same seed file |

The sanitizer computes an `injection_score` between 0.0 and 1.0. If the score exceeds `INJECTION_BLOCK_THRESHOLD` (default `0.85`), the request is blocked immediately with a `SanitizationResult(blocked=True)` and never reaches the LLM.

#### PII Redaction

If injection passes, the sanitizer detects and redacts PII:

| Mode | Condition | Entities |
|------|-----------|----------|
| **Full** | `spaCy` + `presidio` installed | All Presidio-supported entity types |
| **Regex fallback** | Libraries missing | `EMAIL_ADDRESS`, `PHONE_NUMBER`, `US_SSN`, `CREDIT_CARD`, `IP_ADDRESS` |

Detected spans are replaced with typed tokens (`[REDACTED_EMAIL_ADDRESS_1]`) and the original-to-token mapping is encrypted with the tenant's Fernet key. The encrypted map travels with the request so responses can be de-redacted later.

Configure which entity types to detect per tenant via `TenantConfig.pii_entity_types`.

### Stage 2 — Policy Engine (`sentinel/rules.py`)

After sanitization, the policy engine evaluates the request against a chain of `Rule` instances. Each rule receives the full prompt text and a context dict, and returns either `None` (pass) or a `PolicyViolation`.

#### Built-in Rules

| Rule ID | Class | Severity | What It Does |
|---------|-------|----------|--------------|
| `builtin.prompt_injection` | `PromptInjectionRule` | CRITICAL | Keyword scan for phrases like "ignore previous instructions" |
| `builtin.pii_detection` | `PIIDetectionRule` | HIGH | Regex patterns for email, phone, SSN, credit card |
| `builtin.blocked_topic` | `BlockedTopicRule` | HIGH | Case-insensitive substring match against a configurable topic list |
| `builtin.max_token_guard` | `MaxTokenGuardRule` | MEDIUM | Blocks requests exceeding 50 000 characters |

Rules run sequentially. The engine collects all violations, then determines a final action:

| Condition | Action |
|-----------|--------|
| No violations | `ALLOW` |
| `strict_mode=True` OR any CRITICAL violation | `BLOCK` |
| Highest severity is HIGH | `FLAG` |
| Otherwise | `ALLOW` |

#### Custom Rules

Subclass `Rule` and register it with the engine:

```python
from sentinel.rules import Rule, PolicyEngine
from sentinel.models import PolicyViolation, Severity

class CompetitorMentionRule(Rule):
    rule_id = "custom.competitor_mention"
    rule_name = "Competitor Mention"
    severity = Severity.MEDIUM

    async def evaluate(self, text, context):
        if "competitor-name" in text.lower():
            return PolicyViolation(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                severity=self.severity,
                message="Competitor mentioned in prompt",
                details={"matched": "competitor-name"},
            )
        return None

# Register for the request phase, response phase, or both
engine.register_rule(CompetitorMentionRule(), phase="request")
```

---

## Verification Pipeline (Post-LLM)

The verification pipeline in `sentinel/layers/verifier.py` runs a five-step process on every LLM response.

### Step 1 — Claim Extraction

A cheap LLM call (`gpt-4o-mini`, temperature 0) extracts atomic factual claims from the response as a JSON array. Opinions, questions, and hedged statements are excluded.

### Step 2 — RAG Retrieval

Each claim is searched against the tenant's golden-source vector store (pgvector). The top 3 results per claim are kept, filtered by `GOLDEN_SOURCE_SIMILARITY_THRESHOLD`. If the golden source is empty, fact-checking is skipped and the RAG score defaults to `0.5`.

### Step 3 — NLI Scoring

Claim–evidence pairs are scored with a cross-encoder NLI model (default: `cross-encoder/nli-deberta-v3-base`). Each pair produces probabilities for CONTRADICTION, ENTAILMENT, and NEUTRAL. The highest entailment score per claim is kept. The `rag_entailment_score` is the mean entailment confidence across all claims.

### Step 4 — N-Cross-Check (Conditional)

Triggered only when `rag_entailment_score < CROSS_CHECK_TRIGGER_THRESHOLD`. Two independent models (`gpt-4o-mini` and `claude-3-haiku`) answer the same prompt, and their responses are compared via cosine similarity of sentence embeddings. The resulting `cross_check_agreement` score defaults to `0.75` when not triggered.

### Step 5 — Semantic Drift

Reserved for future use. Currently returns a fixed score of `0.75`.

### Trust Score Formula

```
trust_score = 0.40 * rag_entailment
            + 0.30 * cross_check_agreement
            + 0.15 * pii_factor
            + 0.15 * semantic_drift
```

| Signal | Weight | Range | Notes |
|--------|--------|-------|-------|
| `rag_entailment` | 0.40 | 0.0–1.0 | Mean NLI entailment; 0.5 if golden source empty |
| `cross_check_agreement` | 0.30 | 0.0–1.0 | Cosine similarity of two independent model responses |
| `pii_factor` | 0.15 | 0 or 1 | 1.0 if PII-clean, 0.0 if PII leaked |
| `semantic_drift` | 0.15 | 0.0–1.0 | Fixed 0.75 (placeholder) |

The final `VerificationResult` includes the trust score, per-claim NLI labels, and flags indicating whether the cross-check was triggered and whether the golden source was empty.

---

## Configuration Reference

All thresholds are set via environment variables or `SentinelSettings`:

| Variable | Default | Used By |
|----------|---------|---------|
| `INJECTION_BLOCK_THRESHOLD` | `0.85` | Sanitizer — blocks above this score |
| `GOLDEN_SOURCE_SIMILARITY_THRESHOLD` | `0.7` | Verifier — filters RAG results |
| `CROSS_CHECK_TRIGGER_THRESHOLD` | `0.6` | Verifier — triggers N-cross-check below this |
| `NLI_MODEL` | `cross-encoder/nli-deberta-v3-base` | Verifier — NLI cross-encoder |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sanitizer + Verifier — sentence embeddings |
| `SPACY_MODEL` | `en_core_web_sm` | Sanitizer — Presidio NLP backend |

---

## ML Model Requirements

| Model | Size | Used For | Fallback |
|-------|------|----------|----------|
| `all-MiniLM-L6-v2` | ~80 MB | Injection embeddings, RAG search, cross-check similarity | Keyword hit-ratio (sanitizer), no similarity filter (verifier) |
| `cross-encoder/nli-deberta-v3-base` | ~800 MB | NLI claim scoring | All claims return NEUTRAL with 0.5 confidence |
| `en_core_web_sm` | ~12 MB | spaCy NER for Presidio | Regex patterns for 5 entity types |
| `unitary/toxic-bert` | ~440 MB | Toxicity classification (rules engine) | Not loaded if unavailable |

All ML inference runs in a `ThreadPoolExecutor(max_workers=2)` to avoid blocking the async event loop.

---

## Pipeline Flow Summary

```
Request in
  │
  ├─ Sanitizer
  │   ├─ Injection detection  →  score > 0.85?  →  BLOCK
  │   └─ PII redaction         →  [REDACTED_*] tokens
  │
  ├─ Policy Engine
  │   ├─ PromptInjectionRule   →  CRITICAL
  │   ├─ PIIDetectionRule      →  HIGH
  │   ├─ BlockedTopicRule      →  HIGH
  │   └─ MaxTokenGuardRule     →  MEDIUM
  │   └─ Action: ALLOW / FLAG / BLOCK
  │
  ├─ LLM Provider (forwarded)
  │
  └─ Verifier
      ├─ Claim extraction      →  gpt-4o-mini
      ├─ RAG retrieval         →  pgvector top-3
      ├─ NLI scoring           →  cross-encoder
      ├─ N-cross-check         →  conditional
      └─ Trust score           →  0.0 – 1.0
```
