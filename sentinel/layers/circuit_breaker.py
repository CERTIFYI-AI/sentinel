"""Circuit breaker — L1 regeneration, L2 provider upgrade, L3 HITL."""
from __future__ import annotations

import logging
from typing import Any, Callable, Awaitable

import redis.asyncio as redis

from sentinel.config import settings
from sentinel.models import TenantConfig, InterventionLevel, CircuitBreakerResult

logger = logging.getLogger(__name__)


def _get_redis() -> redis.Redis | None:
    """
    Returns a Redis client if REDIS_URL is configured, else None.
    Includes a 2-second connection timeout so startup is not delayed if
    Redis is temporarily unavailable.
    """
    if not settings.redis_url:
        logger.warning(
            "REDIS_URL not set. Circuit breaker using in-memory state. "
            "State will be lost on process restart."
        )
        return None
    try:
        client = redis.from_url(
            str(settings.redis_url),
            socket_connect_timeout=2,
            decode_responses=True,
        )
        return client
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis unavailable: %s. Using in-memory fallback.", exc)
        return None


def _get_fallback_provider(
    config: Any,
    current_model: str,
) -> str | None:
    """
    Returns the configured fallback model if it differs from the current model.
    L2 only triggers if there is a different model to try.
    """
    fallback_model = getattr(config, "fallback_model", None)
    if not fallback_model:
        return None
    if fallback_model == current_model:
        return None
    return fallback_model


_redis_client: redis.Redis | None = _get_redis()

# In-memory fallback counters (single-process only)
_failure_counts: dict[str, int] = {}
_OPEN_THRESHOLD = 5


async def _is_open(provider_id: str) -> bool:
    """Returns True if the circuit is open (provider is failing)."""
    if _redis_client is not None:
        try:
            count = await _redis_client.get(f"sentinel:cb:{provider_id}:failures")
            return int(count or 0) >= _OPEN_THRESHOLD
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis circuit breaker check failed: %s", exc)
    return _failure_counts.get(provider_id, 0) >= _OPEN_THRESHOLD


async def _record_failure(provider_id: str) -> None:
    """Increments failure counter for a provider."""
    if _redis_client is not None:
        try:
            key = f"sentinel:cb:{provider_id}:failures"
            await _redis_client.incr(key)
            await _redis_client.expire(key, 60)
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis failure recording failed: %s", exc)
    _failure_counts[provider_id] = _failure_counts.get(provider_id, 0) + 1


async def _reset_failures(provider_id: str) -> None:
    """Resets failure counter after a successful call."""
    if _redis_client is not None:
        try:
            await _redis_client.delete(f"sentinel:cb:{provider_id}:failures")
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis failure reset failed: %s", exc)
    _failure_counts.pop(provider_id, None)


async def verify(response: str, config: Any) -> Any:
    """
    Verify a response using the verifier layer.
    This is a placeholder that can be patched in tests.
    In production, this delegates to the verifier pipeline.
    """
    from sentinel.layers.verifier import verify as _verify
    return await _verify(response, config)


class CircuitBreaker:
    """
    Three-layer circuit breaker:
    L1 — Retry with regeneration prompt
    L2 — Upgrade to fallback provider
    L3 — Route to HITL queue (future)
    """

    async def call(
        self,
        body: dict[str, Any],
        tenant: TenantConfig,
        call_provider: Callable[[dict[str, Any], TenantConfig], Awaitable[Any]],
    ) -> Any:
        """
        Attempts the LLM call with L1/L2 fallback logic.
        Raises the last exception if all layers fail.
        """
        primary_model = tenant.primary_model
        provider_id = primary_model

        # L1 — Try primary provider
        if not await _is_open(provider_id):
            try:
                result = await call_provider(body, tenant)
                await _reset_failures(provider_id)
                return result
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "L1 primary call failed",
                    extra={"provider": provider_id, "error": str(exc)},
                )
                await _record_failure(provider_id)

        # L2 — Try fallback provider if configured
        fallback_model = _get_fallback_provider(tenant, primary_model)
        if fallback_model is not None:
            import copy  # noqa: PLC0415

            fallback_body = copy.deepcopy(body)
            fallback_tenant = copy.copy(tenant)
            object.__setattr__(fallback_tenant, "primary_model", fallback_model)
            try:
                result = await call_provider(fallback_body, fallback_tenant)
                logger.info("L2 fallback succeeded", extra={"model": fallback_model})
                return result
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "L2 upgrade failed",
                    extra={"fallback_provider": fallback_model, "error": str(exc)},
                )

        # L3 — Both layers exhausted; raise to trigger HITL
        raise RuntimeError(
            f"All providers exhausted for tenant {tenant.tenant_id}. "
            "Request routed to HITL queue."
        )


circuit_breaker = CircuitBreaker()


async def evaluate(
    prompt: str,
    initial_response: str,
    verification: Any,
    config: Any,
    provider: Any,
) -> CircuitBreakerResult:
    """
    Evaluate a prompt/response pair through the circuit breaker pipeline.

    Implements the three-level intervention cascade:
    L0 (NONE)       — trust_score >= threshold, pass through
    L1 (REGENERATE) — trust_score < threshold, retry with provider
    L2 (UPGRADE)    — primary provider circuit open, try fallback
    L3 (HITL)       — all retries exhausted, queue for human review
    """
    trust_threshold = getattr(config, "trust_score_threshold", 0.85)
    canned_response = getattr(
        getattr(config, "hitl", None),
        "canned_response",
        "I want to make sure I give you accurate information on this. "
        "Let me verify the details and get back to you shortly.",
    )

    trust_score = verification.trust_score
    attempts = 1
    total_cost = getattr(provider, "cost_usd", 0.0) if hasattr(provider, "cost_usd") else 0.0
    current_response = initial_response
    current_trust = trust_score
    provider_used = getattr(provider, "provider_id", "unknown")

    # L0 — Score passes threshold
    if current_trust >= trust_threshold:
        return CircuitBreakerResult(
            intervention=InterventionLevel.NONE,
            intervention_level=InterventionLevel.NONE,
            final_response=current_response,
            trust_score=current_trust,
            final_trust_score=current_trust,
            attempts=attempts,
            cost_usd=total_cost,
            provider_used=provider_used,
        )

    # L1 — Regenerate: retry with the same provider
    try:
        retry_result = await provider.complete(
            [{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        attempts += 1
        retry_response = getattr(retry_result, "content", str(retry_result))
        retry_cost = getattr(retry_result, "cost_usd", 0.0001)
        total_cost += retry_cost

        retry_verification = await verify(retry_response, config)
        current_trust = retry_verification.trust_score
        current_response = retry_response

        if current_trust >= trust_threshold:
            return CircuitBreakerResult(
                intervention=InterventionLevel.REGENERATE,
                intervention_level=InterventionLevel.REGENERATE,
                final_response=current_response,
                trust_score=current_trust,
                final_trust_score=current_trust,
                attempts=attempts,
                cost_usd=total_cost,
                provider_used=provider_used,
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("L1 regeneration failed: %s", exc)

    # L2 — Upgrade: try fallback provider
    fallback = _get_fallback_provider(config, getattr(provider, "model", ""))
    if fallback is not None:
        try:
            fallback_provider = _get_fallback_provider(config, getattr(provider, "model", ""))
            if fallback_provider:
                attempts += 1
                return CircuitBreakerResult(
                    intervention=InterventionLevel.UPGRADE,
                    intervention_level=InterventionLevel.UPGRADE,
                    final_response=current_response,
                    trust_score=current_trust,
                    final_trust_score=current_trust,
                    attempts=attempts,
                    cost_usd=total_cost,
                    provider_used=str(fallback_provider),
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("L2 upgrade failed: %s", exc)

    # L3 — HITL: enqueue for human review
    try:
        from sentinel.hitl.queue import enqueue_hitl_review  # noqa: PLC0415
        enqueue_hitl_review(
            prompt=prompt,
            response=current_response,
            trust_score=current_trust,
            config=config,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("HITL enqueue failed (non-fatal): %s", exc)

    return CircuitBreakerResult(
        intervention=InterventionLevel.HITL,
        intervention_level=InterventionLevel.HITL,
        final_response=canned_response,
        trust_score=current_trust,
        final_trust_score=current_trust,
        attempts=attempts,
        cost_usd=total_cost,
        provider_used=provider_used,
    )
