"""End-to-end tests for the Sentinel proxy (POST /v1/chat/completions).

Tests the full pipeline: Auth -> Sanitize -> LLM -> Verify -> Deliver -> Audit.
Uses FastAPI TestClient in async mode.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from sentinel.proxy import app


@pytest.fixture
def valid_auth_headers():
    """Bearer token that resolves to the test tenant."""
    return {"Authorization": "Bearer test-api-key-sentinel"}


@pytest.fixture
def mock_pipeline_passing():
    """Mock all pipeline layers to return a passing result."""
    from sentinel.models import VerificationResult, CircuitBreakerResult, InterventionLevel

    verification = VerificationResult(
        trust_score=0.92,
        claims=[],
        cross_check_agreement=0.92,
        rag_entailment_score=0.92,
    )
    cb_result = CircuitBreakerResult(
        final_response="The Acme Medical API uses OAuth 2.0 with PKCE.",
        intervention=InterventionLevel.NONE,
        attempts=1,
        trust_score=0.92,
        cost_usd=0.0002,
    )
    return verification, cb_result


class TestHealthEndpoint:
    """GET /health must return 200 with status and version."""

    async def test_health_returns_ok(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert "version" in body


class TestChatCompletionsEndpoint:
    """POST /v1/chat/completions: full pipeline integration."""

    async def test_passing_request_returns_200(
        self, valid_auth_headers, mock_pipeline_passing, tenant_config
    ):
        verification, cb_result = mock_pipeline_passing
        with (
            patch("sentinel.proxy._resolve_tenant", return_value=tenant_config),
            patch("sentinel.proxy._check_rate_limit", return_value=None),
            patch("sentinel.layers.sanitizer.sanitize") as mock_sanitize,
            patch("sentinel.proxy._call_llm_provider") as mock_llm,
            patch("sentinel.layers.verifier.verify", return_value=verification),
            patch("sentinel.layers.circuit_breaker.evaluate", return_value=cb_result),
            patch("sentinel.layers.auditor.log", return_value=None),
        ):
            from sentinel.layers.sanitizer import SanitizationResult

            mock_sanitize.return_value = SanitizationResult(
                clean_prompt="What auth method does Acme Medical API use?",
                redaction_map={},
                blocked=False,
                injection_score=0.05,
                detected_entities=[],
                latency_ms=12.0,
            )
            mock_llm.return_value = "The Acme Medical API uses OAuth 2.0 with PKCE."
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post(
                    "/v1/chat/completions",
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "user", "content": "What auth method does Acme use?"}
                        ],
                    },
                    headers=valid_auth_headers,
                )
        assert resp.status_code == 200
        body = resp.json()
        assert "choices" in body
        assert body["choices"][0]["message"]["content"]

    async def test_trust_score_header_present(
        self, valid_auth_headers, mock_pipeline_passing, tenant_config
    ):
        verification, cb_result = mock_pipeline_passing
        with (
            patch("sentinel.proxy._resolve_tenant", return_value=tenant_config),
            patch("sentinel.proxy._check_rate_limit", return_value=None),
            patch("sentinel.layers.sanitizer.sanitize") as mock_sanitize,
            patch("sentinel.proxy._call_llm_provider", return_value="Response text."),
            patch("sentinel.layers.verifier.verify", return_value=verification),
            patch("sentinel.layers.circuit_breaker.evaluate", return_value=cb_result),
            patch("sentinel.layers.auditor.log", return_value=None),
        ):
            from sentinel.layers.sanitizer import SanitizationResult

            mock_sanitize.return_value = SanitizationResult(
                clean_prompt="test", redaction_map={}, blocked=False,
                injection_score=0.01, detected_entities=[], latency_ms=5.0,
            )
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post(
                    "/v1/chat/completions",
                    json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}]},
                    headers=valid_auth_headers,
                )
        assert "x-sentinel-trust-score" in resp.headers

    async def test_blocked_injection_returns_400(
        self, valid_auth_headers, tenant_config, injection_prompt
    ):
        with (
            patch("sentinel.proxy._resolve_tenant", return_value=tenant_config),
            patch("sentinel.proxy._check_rate_limit", return_value=None),
            patch("sentinel.layers.sanitizer.sanitize") as mock_sanitize,
        ):
            from sentinel.layers.sanitizer import SanitizationResult

            mock_sanitize.return_value = SanitizationResult(
                clean_prompt=injection_prompt,
                redaction_map={},
                blocked=True,
                injection_score=0.95,
                detected_entities=[],
                latency_ms=15.0,
            )
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post(
                    "/v1/chat/completions",
                    json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": injection_prompt}]},
                    headers=valid_auth_headers,
                )
        assert resp.status_code == 400

    async def test_missing_auth_returns_401(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/v1/chat/completions",
                json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}]},
            )
        assert resp.status_code == 401


class TestModelsEndpoint:
    async def test_models_returns_200(self, valid_auth_headers, tenant_config):
        with patch("sentinel.proxy._resolve_tenant", return_value=tenant_config):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/v1/models", headers=valid_auth_headers)
        assert resp.status_code == 200


class TestMetricsEndpoint:
    async def test_metrics_endpoint_returns_prometheus_format(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/metrics")
        assert resp.status_code == 200
        assert "sentinel_" in resp.text or "# HELP" in resp.text
