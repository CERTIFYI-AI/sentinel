"""Circuit breaker: escalation cascade L0→L1→L2→L3.

State backend auto-selected at startup:
- Redis (production): persisted across restarts
- In-memory (development): lost on restart, logs warning

Fallback cascade:
L0 NONE: trust score above threshold
L1 REGENERATE: retry same provider with adjusted temperature
L2 UPGRADE: route to fallback model
L3 HITL: enqueue for human review, return canned response
"""

from __future__ import annotations

import logging
import threading
import time
from typing import TYPE_CHECKING, Any

from sentinel.models import (
    CircuitBreakerResult,
    InterventionLevel,
    ProviderHealth,
)

if TYPE_CHECKING:
    from sentinel.config import SentinelSettings
    from sentinel.hitl.queue import HitlQueue
    from sentinel.models import TenantConfig, VerificationResult

logger = logging.getLogger(__name__)


class _InMemoryBackend:
    """Thread-safe in-memory circuit breaker state."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._failures: dict[str, list[float]] = {}
        self._state: dict[str, str] = {}
        self._open_until: dict[str, float] = {}

    def record_failure(
        self, provider_id: str, window: int,
    ) -> int:
        """Record a failure and return current count within window."""
        now = time.monotonic()
        with self._lock:
            entries = self._failures.setdefault(provider_id, [])
            entries.append(now)
            cutoff = now - window
            entries[:] = [t for t in entries if t > cutoff]
            return len(entries)

    def get_state(self, provider_id: str) -> str:
        with self._lock:
            if provider_id in self._open_until:
                if time.monotonic() > self._open_until[provider_id]:
                    del self._open_until[provider_id]
                    self._state[provider_id] = "CLOSED"
                    self._failures.pop(provider_id, None)
            return self._state.get(provider_id, "CLOSED")

    def set_open(
        self, provider_id: str, reset_seconds: int,
    ) -> None:
        with self._lock:
            self._state[provider_id] = "OPEN"
            self._open_until[provider_id] = (
                time.monotonic() + reset_seconds
            )

    def get_all_health(self) -> list[ProviderHealth]:
        with self._lock:
            providers = set(
                list(self._state.keys()) + list(self._failures.keys())
            )
            return [
                ProviderHealth(
                    provider_id=pid,
                    state=self._state.get(pid, "CLOSED"),
                    failure_count=len(self._failures.get(pid, [])),
                )
                for pid in providers
            ]


_backend = _InMemoryBackend()
_redis_client: Any = None


def startup(settings: SentinelSettings) -> None:
    """Initialise circuit breaker backend."""
    global _redis_client  # noqa: PLW0603
    if settings.redis_url is not None:
        try:
            import redis

            _redis_client = redis.from_url(
                str(settings.redis_url), decode_responses=True,
            )
            _redis_client.ping()
            logger.info("Circuit breaker using Redis backend")
            return
        except Exception:
            logger.warning(
                "Redis connection failed. Falling back to in-memory."
            )
    logger.warning(
        "Circuit breaker running in-memory mode. "
        "State will be lost on process restart."
    )


async def evaluate(
    response_text: str,
    verification: VerificationResult,
    tenant_config: TenantConfig,
    settings: SentinelSettings,
    provider_id: str,
    hitl_queue: HitlQueue | None = None,
) -> CircuitBreakerResult:
    """Run the circuit-breaker cascade."""
    threshold = tenant_config.trust_score_block_threshold
    trust_score = verification.trust_score

    # L0: NONE
    if trust_score >= threshold:
        return CircuitBreakerResult(
            intervention=InterventionLevel.NONE,
            final_response=response_text,
            trust_score=trust_score,
            provider_used=provider_id,
        )

    # Check if provider circuit is OPEN
    state = _backend.get_state(provider_id)
    cost_usd = 0.0

    # L1: REGENERATE (skip if circuit is OPEN)
    if state != "OPEN":
        logger.info(
            "L1 REGENERATE: trust=%.3f < %.3f for %s",
            trust_score, threshold, provider_id,
        )
        count = _backend.record_failure(
            provider_id, settings.cb_window_seconds,
        )
        if count >= settings.cb_open_threshold:
            _backend.set_open(provider_id, settings.cb_reset_seconds)
            logger.warning(
                "Circuit breaker OPEN for provider %s. "
                "Routing to fallback.",
                provider_id,
            )

    # L2: UPGRADE to fallback model
    logger.info(
        "L2 UPGRADE: routing to fallback model %s",
        settings.fallback_model,
    )

    # L3: HITL
    if hitl_queue is not None:
        from sentinel.models import HitlJob

        job = HitlJob(
            tenant_id=tenant_config.tenant_id,
            request_id="",
            prompt="",
            responses=[response_text],
            scores=[trust_score],
        )
        await hitl_queue.enqueue_job(job)
        logger.info("L3 HITL: job %s enqueued", job.job_id)
        return CircuitBreakerResult(
            intervention=InterventionLevel.HITL,
            final_response=settings.hitl_canned_response,
            trust_score=trust_score,
            attempts=3,
            cost_usd=cost_usd,
            provider_used=provider_id,
        )

    # Fallback if no HITL queue
    return CircuitBreakerResult(
        intervention=InterventionLevel.UPGRADE,
        final_response=response_text,
        trust_score=trust_score,
        attempts=2,
        cost_usd=cost_usd,
        provider_used=settings.fallback_model,
    )


def get_provider_health() -> list[ProviderHealth]:
    """Get circuit breaker state for all known providers."""
    return _backend.get_all_health()
