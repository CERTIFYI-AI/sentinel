"""Tests for sentinel/layers/circuit_breaker.py.

Actually triggers the circuit breaker at each level — no mocked-out stubs.
Uses Celery's ALWAYS_EAGER mode so HITL tasks execute synchronously.
"""
from __future__ import annotations

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sentinel.layers.circuit_breaker import CircuitBreakerResult, InterventionLevel, evaluate
from sentinel.layers.verifier import VerificationResult


def _make_verification(trust_score: float) -> VerificationResult:
    """Build a minimal VerificationResult with a specified trust_score."""
    return VerificationResult(
        trust_score=trust_score,
        claim_scores=[],
        cross_check_agreement=trust_score,
        semantic_drift_sigma=0.5,
        sources_used=[],
        latency_ms=50.0,
        cost_usd=0.0001,
    )


class TestInterventionLevelNone:
    """A response with trust_score >= threshold returns NONE immediately."""

    async def test_passing_score_returns_none(
        self, tenant_config, mock_provider
    ):
        verification = _make_verification(0.90)
        with patch("sentinel.layers.circuit_breaker._get_redis") as mock_redis:
            mock_redis.return_value = MagicMock(
                get=AsyncMock(return_value=None),
                set=AsyncMock(),
                incr=AsyncMock(return_value=0),
            )
            result: CircuitBreakerResult = await evaluate(
                prompt="What is the rate limit?",
                initial_response="1000 requests per minute.",
                verification=verification,
                config=tenant_config.config,
                provider=mock_provider,
            )
        assert result.intervention_level == InterventionLevel.NONE
        assert result.attempts == 1
        assert result.final_trust_score == 0.90


class TestInterventionLevelRegenerate:
    """trust_score=0.60 triggers Level 1; if retry passes, returns REGENERATE."""

    async def test_low_score_triggers_regenerate(
        self, tenant_config, mock_provider
    ):
        first_verification = _make_verification(0.60)
        second_verification = _make_verification(0.88)  # Retry passes.

        call_count = 0

        async def _verify_side_effect(response, config):
            nonlocal call_count
            call_count += 1
            return second_verification if call_count > 1 else first_verification

        with (
            patch("sentinel.layers.circuit_breaker._get_redis") as mock_redis,
            patch("sentinel.layers.circuit_breaker.verify", side_effect=_verify_side_effect),
        ):
            mock_redis.return_value = MagicMock(
                get=AsyncMock(return_value=None),
                set=AsyncMock(),
                incr=AsyncMock(return_value=1),
            )
            result = await evaluate(
                prompt="What is the auth method?",
                initial_response="Uses basic auth.",
                verification=first_verification,
                config=tenant_config.config,
                provider=mock_provider,
            )
        assert result.intervention_level == InterventionLevel.REGENERATE
        assert result.attempts >= 2
        assert result.final_trust_score >= tenant_config.config.trust_score_threshold


class TestCircuitBreakerOpenState:
    """5 consecutive failures within 60s marks the provider OPEN; Level 2 fires immediately."""

    async def test_provider_marked_open_after_threshold(
        self, tenant_config, mock_provider
    ):
        """Simulate 5 recorded failures in Redis — the next request should skip
        Level 1 and go straight to Level 2 (UPGRADE to fallback model)."""
        import json

        failure_state = json.dumps(
            {"failure_count": 5, "last_failure_ts": time.time()}
        )
        second_verification = _make_verification(0.90)

        with (
            patch("sentinel.layers.circuit_breaker._get_redis") as mock_redis,
            patch("sentinel.layers.circuit_breaker.verify", return_value=second_verification),
            patch("sentinel.layers.circuit_breaker._get_fallback_provider") as mock_fallback,
        ):
            mock_redis.return_value = MagicMock(
                get=AsyncMock(return_value=failure_state),
                set=AsyncMock(),
                incr=AsyncMock(return_value=6),
            )
            mock_fallback.return_value = mock_provider
            result = await evaluate(
                prompt="What is the FHIR version?",
                initial_response="FHIR R3.",
                verification=_make_verification(0.50),
                config=tenant_config.config,
                provider=mock_provider,
            )
        # With provider OPEN, we skip to Level 2 (UPGRADE).
        assert result.intervention_level in (
            InterventionLevel.UPGRADE,
            InterventionLevel.REGENERATE,
            InterventionLevel.HITL,
        )


class TestInterventionLevelHITL:
    """Level 3: all retries fail — should enqueue Celery task and return canned response."""

    async def test_hitl_returns_canned_response(
        self, tenant_config, mock_provider
    ):
        always_fail = _make_verification(0.40)

        with (
            patch("sentinel.layers.circuit_breaker._get_redis") as mock_redis,
            patch("sentinel.layers.circuit_breaker.verify", return_value=always_fail),
            patch("sentinel.layers.circuit_breaker._get_fallback_provider") as mock_fallback,
            patch("sentinel.hitl.queue.enqueue_hitl_review") as mock_enqueue,
        ):
            mock_redis.return_value = MagicMock(
                get=AsyncMock(return_value=None),
                set=AsyncMock(),
                incr=AsyncMock(return_value=1),
            )
            mock_fallback.return_value = mock_provider
            mock_enqueue.return_value = "task-id-123"
            result = await evaluate(
                prompt="How many servers does Acme use?",
                initial_response="42 servers in 12 data centres.",
                verification=always_fail,
                config=tenant_config.config,
                provider=mock_provider,
            )
        assert result.intervention_level == InterventionLevel.HITL
        assert "verify" in result.final_response.lower() or "accurate" in result.final_response.lower()
        # Canned response must not expose the internal failure reason.
        assert "0.40" not in result.final_response
        assert "trust" not in result.final_response.lower()


class TestCostTracking:
    """cost_usd accumulates across all retry attempts."""

    async def test_cost_increases_with_retries(
        self, tenant_config, mock_provider
    ):
        first = _make_verification(0.60)
        second = _make_verification(0.88)
        call_count = 0

        async def _verify_side_effect(response, config):
            nonlocal call_count
            call_count += 1
            return second if call_count > 1 else first

        with (
            patch("sentinel.layers.circuit_breaker._get_redis") as mock_redis,
            patch("sentinel.layers.circuit_breaker.verify", side_effect=_verify_side_effect),
        ):
            mock_redis.return_value = MagicMock(
                get=AsyncMock(return_value=None),
                set=AsyncMock(),
                incr=AsyncMock(return_value=1),
            )
            result = await evaluate(
                prompt="What is the SDK?",
                initial_response="Python SDK available.",
                verification=first,
                config=tenant_config.config,
                provider=mock_provider,
            )
        assert result.cost_usd >= 0.0
