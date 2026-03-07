"""Circuit breaker — L1 regeneration, L2 provider upgrade, L3 HITL."""
from __future__ import annotations

import logging
from typing import Any, Callable, Awaitable

import redis.asyncio as redis

from sentinel.config import settings
from sentinel.models import TenantConfig

logger = logging.getLogger(__name__)


def _get_redis() -> redis.Redis | None:
    """
    Returns a Redis client if REDIS_URL is configured, else None.
    Includes a 2-second connection timeout so startup is not delayed if
    Redis is temporarily unavailable.
    """
    if not settings.REDIS_URL:
        logger.warning(
            "REDIS_URL not set. Circuit breaker using in-memory state. "
            "State will be lost on process restart."
        )
        return None
    try:
        client = redis.from_url(
            str(settings.REDIS_URL),
            socket_connect_timeout=2,
            decode_responses=True,
        )
        return client
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis unavailable: %s. Using in-memory fallback.", exc)
        return None


def _get_fallback_provider(
    config: TenantConfig,
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
