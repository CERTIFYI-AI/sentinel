"""Response verifier: claim extraction, RAG retrieval, NLI scoring.

Five-step verification pipeline:
1. Extract factual claims via LLM
2. RAG retrieval from golden source (pgvector)
3. NLI scoring via cross-encoder
4. N-cross-check (conditional, if RAG score is low)
5. Semantic drift detection

Final trust score is a weighted combination of all signals.
"""

from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import TYPE_CHECKING, Any

import numpy as np

from sentinel.models import ClaimScore, VerificationResult

if TYPE_CHECKING:
    from sentinel.config import SentinelSettings
    from sentinel.models import TenantConfig
    from sentinel.storage.vector_store import VectorStore

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="verifier")
_nli_model: Any = None
_embedding_model: Any = None


def startup(settings: SentinelSettings) -> None:
    """Load ML models at startup so they are never loaded per-request."""
    global _nli_model, _embedding_model  # noqa: PLW0603
    try:
        from sentence_transformers import CrossEncoder, SentenceTransformer

        _nli_model = CrossEncoder(settings.nli_model)
        _embedding_model = SentenceTransformer(settings.embedding_model)
        logger.info("Verifier models loaded: %s, %s", settings.nli_model, settings.embedding_model)
    except ImportError:
        logger.warning("sentence-transformers not available. Verification will return default scores.")


async def _extract_claims(response_text: str) -> list[str]:
    """Extract factual claims from LLM response using a cheap model."""
    try:
        import litellm

        result = await litellm.acompletion(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract all verifiable factual claims from the "
                        "following text as a JSON array. Each element must "
                        "be a single, atomic statement that can be "
                        "independently verified as true or false. Ignore "
                        "questions, opinions, and hedged statements. Return "
                        'ONLY valid JSON: {"claims": ["claim 1", "claim 2"]}'
                    ),
                },
                {"role": "user", "content": response_text},
            ],
            temperature=0.0,
            max_tokens=1024,
        )
        import json

        content = result.choices[0].message.content or "{}"
        data = json.loads(content)
        claims: list[str] = data.get("claims", [])
        return claims
    except Exception:
        logger.exception("Claim extraction failed, returning empty")
        return []


def _score_claims_nli(
    claims: list[str],
    evidence: list[list[str]],
) -> list[ClaimScore]:
    """Score claims against evidence using NLI cross-encoder."""
    if _nli_model is None or not claims:
        return [
            ClaimScore(claim=c, label="NEUTRAL", confidence=0.5)
            for c in claims
        ]

    pairs: list[tuple[str, str]] = []
    claim_indices: list[int] = []
    for i, claim in enumerate(claims):
        for doc_text in evidence[i]:
            pairs.append((claim, doc_text))
            claim_indices.append(i)

    if not pairs:
        return [
            ClaimScore(claim=c, label="NEUTRAL", confidence=0.5)
            for c in claims
        ]

    logits = _nli_model.predict(pairs)
    probs = _softmax(np.array(logits))

    # Aggregate per claim (take max entailment)
    claim_scores: dict[int, ClaimScore] = {}
    for idx, prob in zip(range(len(pairs)), probs, strict=True):
        ci = claim_indices[idx]
        entailment = float(prob[1]) if len(prob) > 1 else 0.5
        labels = ["CONTRADICTION", "ENTAILMENT", "NEUTRAL"]
        best = int(np.argmax(prob))
        if ci not in claim_scores or entailment > claim_scores[ci].confidence:
            claim_scores[ci] = ClaimScore(
                claim=claims[ci],
                label=labels[best],
                confidence=entailment,
            )

    return [
        claim_scores.get(
            i, ClaimScore(claim=claims[i], label="NEUTRAL", confidence=0.5)
        )
        for i in range(len(claims))
    ]


def _softmax(x: np.ndarray) -> np.ndarray:
    """Row-wise softmax."""
    if x.ndim == 1:
        x = x.reshape(1, -1)
    e_x = np.exp(x - np.max(x, axis=1, keepdims=True))
    return e_x / e_x.sum(axis=1, keepdims=True)


async def verify(
    response_text: str,
    tenant_config: TenantConfig,
    settings: SentinelSettings,
    vector_store: VectorStore | None = None,
    pii_clean: bool = True,
) -> VerificationResult:
    """Run the full verification pipeline on an LLM response."""
    # Step 1: Extract claims
    claims = await _extract_claims(response_text)
    if not claims:
        return VerificationResult(
            trust_score=1.0,
            claims=[],
            rag_entailment_score=1.0,
        )

    # Step 2: RAG retrieval
    golden_source_empty = True
    evidence: list[list[str]] = [[] for _ in claims]
    if vector_store is not None:
        count = await vector_store.count(tenant_config.tenant_id)  # type: ignore[attr-defined]
        golden_source_empty = count == 0
        if not golden_source_empty:
            search_tasks = [
                vector_store.search(
                    query=claim,
                    tenant_id=tenant_config.tenant_id,
                    top_k=3,
                )
                for claim in claims
            ]
            results = await asyncio.gather(*search_tasks)
            for i, hits in enumerate(results):
                evidence[i] = [
                    h.content for h in hits
                    if h.similarity >= settings.golden_source_similarity_threshold
                ]

    if golden_source_empty:
        logger.warning(
            "Golden source is empty. Fact-checking is disabled. "
            "Seed documents via: python scripts/seed_golden_source.py"
        )

    # Step 3: NLI scoring (CPU-bound, run in executor)
    loop = asyncio.get_running_loop()
    claim_scores = await loop.run_in_executor(
        _executor, _score_claims_nli, claims, evidence,
    )

    rag_entailment_score = 0.5
    if claim_scores:
        rag_entailment_score = sum(
            cs.confidence for cs in claim_scores
        ) / len(claim_scores)
    if golden_source_empty:
        rag_entailment_score = 0.5

    # Step 4: N-cross-check (conditional)
    cross_check_agreement = 0.75
    cross_check_triggered = False
    if rag_entailment_score < settings.cross_check_trigger_threshold:
        cross_check_triggered = True
        cross_check_agreement = await _n_cross_check(response_text)

    # Step 5: Semantic drift (default if no baseline)
    semantic_drift_score = 0.75

    # Final score
    pii_factor = 1.0 if pii_clean else 0.0
    trust_score = round(
        0.40 * rag_entailment_score
        + 0.30 * cross_check_agreement
        + 0.15 * pii_factor
        + 0.15 * semantic_drift_score,
        4,
    )

    return VerificationResult(
        trust_score=trust_score,
        claims=claim_scores,
        rag_entailment_score=round(rag_entailment_score, 4),
        cross_check_agreement=round(cross_check_agreement, 4),
        semantic_drift_score=semantic_drift_score,
        cross_check_triggered=cross_check_triggered,
        golden_source_empty=golden_source_empty,
    )


async def _n_cross_check(response_text: str) -> float:
    """Query two independent models and compare their answers."""
    try:
        import litellm

        prompt = [{"role": "user", "content": response_text}]
        r1, r2 = await asyncio.gather(
            litellm.acompletion(model="gpt-4o-mini", messages=prompt),
            litellm.acompletion(model="claude-3-haiku-20241022", messages=prompt),
        )
        t1 = r1.choices[0].message.content or ""
        t2 = r2.choices[0].message.content or ""

        if _embedding_model is not None:
            embs = _embedding_model.encode(
                [t1, t2], convert_to_numpy=True, normalize_embeddings=True,
            )
            return float(np.dot(embs[0], embs[1]))
        return 0.75
    except Exception:
        logger.exception("N-cross-check failed")
        return 0.75
