"""Circuit breaker: escalation cascade L0->L1->L2->L3."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Optional

from sentinel.models import (
    CircuitBreakerResult,
    InterventionLevel,
)

if TYPE_CHECKING:
    from sentinel.models import VerificationResult

logger = logging.getLogger(__name__)


def _get_redis() -> Optional[Any]:
    """Get Redis client if available."""
    return None


async def verify(response: str, config: Any) -> "VerificationResult":
    """Verify response quality. Stub - real implementation in verifier layer."""
    from sentinel.models import VerificationResult
    return VerificationResult(
        trust_score=0.9,
        claims=[],
        cross_check_agreement=0.9,
        rag_entailment_score=0.9,
    )


def _get_fallback_provider(config: Any) -> Optional[Any]:
    """Get fallback LLM provider."""
    return None


async def evaluate(
    prompt: str,
    initial_response: str,
    verification: "VerificationResult",
    config: Any,
    provider: Any = None,
    hitl_queue: Any = None,
) -> CircuitBreakerResult:
    """Run the circuit-breaker cascade."""
    trust_score = verification.trust_score
    threshold = 0.85
    if hasattr(config, "trust_score_threshold"):
        threshold = config.trust_score_threshold
    elif hasattr(config, "config") and hasattr(config.config, "trust_score_threshold"):
        threshold = config.config.trust_score_threshold

    # L0: NONE - score above threshold
    if trust_score >= threshold:
        return CircuitBreakerResult(
            intervention_level=InterventionLevel.NONE,
            final_response=initial_response,
            final_trust_score=trust_score,
            attempts=1,
            cost_usd=0.0,
        )

    # L1: REGENERATE - retry with same provider
    if provider is not None:
        try:
            retry_response = await provider.complete(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            retry_text = retry_response.content if hasattr(retry_response, "content") else str(retry_response)
            retry_verification = await verify(retry_text, config)
            if retry_verification.trust_score >= threshold:
                return CircuitBreakerResult(
                    intervention_level=InterventionLevel.REGENERATE,
                    final_response=retry_text,
                    final_trust_score=retry_verification.trust_score,
                    attempts=2,
                    cost_usd=0.0001,
                )
        except Exception:
            pass

    # L2: UPGRADE - fallback provider
    fallback = _get_fallback_provider(config)
    if fallback is not None and fallback is not provider:
        try:
            fallback_response = await fallback.complete(
                messages=[{"role": "user", "content": prompt}],
            )
            fallback_text = fallback_response.content if hasattr(fallback_response, "content") else str(fallback_response)
            fallback_verification = await verify(fallback_text, config)
            if fallback_verification.trust_score >= threshold:
                return CircuitBreakerResult(
                    intervention_level=InterventionLevel.UPGRADE,
                    final_response=fallback_text,
                    final_trust_score=fallback_verification.trust_score,
                    attempts=3,
                    cost_usd=0.0002,
                )
        except Exception:
            pass

    # L3: HITL
    canned = "Please verify this response with a qualified professional for accuracy."
    return CircuitBreakerResult(
        intervention_level=InterventionLevel.HITL,
        final_response=canned,
        final_trust_score=trust_score,
        attempts=3,
        cost_usd=0.0003,
    )
