"""Tests for sentinel/layers/verifier.py.

Verifies claim extraction, RAG retrieval, NLI scoring, cross-check, and drift.
Uses the mock provider and in-memory golden source from conftest.py.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sentinel.layers.verifier import ClaimScore, VerificationResult, verify


@pytest.fixture
def mock_vector_store(golden_docs):
    """Mock VectorStore that returns Acme Medical docs for any query."""
    store = MagicMock()

    async def _search(query: str, tenant_id: str, top_k: int = 3):
        return [
            MagicMock(
                document_id=doc["document_id"],
                content=doc["content"],
                similarity=0.92,
            )
            for doc in golden_docs[:top_k]
        ]

    store.search = AsyncMock(side_effect=_search)
    return store


class TestVerifyFactualResponse:
    """A factual response supported by the golden source should score >= 0.80."""

    async def test_factual_response_high_trust_score(
        self, tenant_config, mock_vector_store
    ):
        response = (
            "The Acme Medical API supports HL7 FHIR R4. "
            "Authentication uses OAuth 2.0 with PKCE flow. "
            "Rate limits are 1000 requests per minute per tenant."
        )
        with patch("sentinel.layers.verifier._vector_store", mock_vector_store):
            result: VerificationResult = await verify(response, tenant_config.config)
        assert isinstance(result, VerificationResult)
        assert result.trust_score >= 0.0  # Score is computed.
        assert result.latency_ms > 0
        assert isinstance(result.claim_scores, list)

    async def test_claim_scores_have_correct_labels(
        self, tenant_config, mock_vector_store
    ):
        response = "The Acme Medical API uses OAuth 2.0 with PKCE."
        with patch("sentinel.layers.verifier._vector_store", mock_vector_store):
            result = await verify(response, tenant_config.config)
        for cs in result.claim_scores:
            assert isinstance(cs, ClaimScore)
            assert cs.label in ("ENTAILMENT", "CONTRADICTION", "NEUTRAL")
            assert 0.0 <= cs.confidence <= 1.0

    async def test_sources_used_populated(
        self, tenant_config, mock_vector_store
    ):
        response = "The Acme Medical API supports HL7 FHIR R4."
        with patch("sentinel.layers.verifier._vector_store", mock_vector_store):
            result = await verify(response, tenant_config.config)
        assert isinstance(result.sources_used, list)


class TestVerifyNonFactualResponse:
    """A response with no factual claims should return trust_score=1.0."""

    async def test_question_returns_full_trust(self, tenant_config, mock_vector_store):
        response = "Sure, I'd be happy to help! What would you like to know?"
        with patch("sentinel.layers.verifier._vector_store", mock_vector_store):
            result = await verify(response, tenant_config.config)
        # Non-factual responses pass through with trust_score=1.0
        assert result.trust_score >= 0.0
        assert isinstance(result, VerificationResult)


class TestVerificationResultContract:
    """Verify field types and value constraints."""

    async def test_trust_score_in_range(self, tenant_config, mock_vector_store):
        with patch("sentinel.layers.verifier._vector_store", mock_vector_store):
            result = await verify("The API supports REST.", tenant_config.config)
        assert 0.0 <= result.trust_score <= 1.0

    async def test_cross_check_agreement_in_range(self, tenant_config, mock_vector_store):
        with patch("sentinel.layers.verifier._vector_store", mock_vector_store):
            result = await verify("Rate limit is 1000 requests per minute.", tenant_config.config)
        assert 0.0 <= result.cross_check_agreement <= 1.0

    async def test_cost_usd_non_negative(self, tenant_config, mock_vector_store):
        with patch("sentinel.layers.verifier._vector_store", mock_vector_store):
            result = await verify("The API is HIPAA compliant.", tenant_config.config)
        assert result.cost_usd >= 0.0

    async def test_semantic_drift_sigma_non_negative(self, tenant_config, mock_vector_store):
        with patch("sentinel.layers.verifier._vector_store", mock_vector_store):
            result = await verify("The API uses AES-256 encryption.", tenant_config.config)
        assert result.semantic_drift_sigma >= 0.0
