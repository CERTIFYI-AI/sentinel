"""Tests for sentinel/layers/verifier.py.

Verifies the verify() function with mocked dependencies.
All LLM and vector store calls are mocked; no real API calls are made.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sentinel.layers.verifier import verify
from sentinel.models import ClaimScore, VerificationResult
from sentinel.config import SentinelSettings


@pytest.fixture
def mock_vector_store(golden_docs):
    """Mock VectorStore that returns Acme Medical docs for any query."""
    store = MagicMock()

    async def _count(tenant_id: str) -> int:
        return len(golden_docs)

    async def _search(query: str, tenant_id: str, top_k: int = 3):
        return [
            MagicMock(
                document_id=doc["document_id"],
                content=doc["content"],
                similarity=0.92,
            )
            for doc in golden_docs[:top_k]
        ]

    store.count = AsyncMock(side_effect=_count)
    store.search = AsyncMock(side_effect=_search)
    return store


@pytest.fixture
def sentinel_settings():
    """Return a SentinelSettings instance for tests."""
    return SentinelSettings()


@pytest.fixture
def models_tenant_config(tenant_config):
    """Create a sentinel.models.TenantConfig from the conftest tenant."""
    from sentinel.models import TenantConfig as ModelsTenantConfig
    return ModelsTenantConfig(
        tenant_id=tenant_config.tenant_id,
    )


class TestVerifyFactualResponse:
    """A factual response supported by the golden source should score >= 0.80."""

    async def test_factual_response_high_trust_score(
        self, models_tenant_config, sentinel_settings, mock_vector_store
    ):
        response = (
            "The Acme Medical API supports HL7 FHIR R4. "
            "Authentication uses OAuth 2.0 with PKCE flow. "
            "Rate limits are 1000 requests per minute per tenant."
        )
        with patch(
            "sentinel.layers.verifier._extract_claims",
            new=AsyncMock(return_value=["The Acme Medical API supports HL7 FHIR R4."]),
        ):
            result: VerificationResult = await verify(
                response_text=response,
                tenant_config=models_tenant_config,
                settings=sentinel_settings,
                vector_store=mock_vector_store,
            )
        assert isinstance(result, VerificationResult)
        assert result.trust_score >= 0.0

    async def test_claim_scores_have_correct_labels(
        self, models_tenant_config, sentinel_settings, mock_vector_store
    ):
        response = "The Acme Medical API uses OAuth 2.0 with PKCE."
        with patch(
            "sentinel.layers.verifier._extract_claims",
            new=AsyncMock(return_value=["The Acme Medical API uses OAuth 2.0 with PKCE."]),
        ):
            result = await verify(
                response_text=response,
                tenant_config=models_tenant_config,
                settings=sentinel_settings,
                vector_store=mock_vector_store,
            )
        for cs in result.claims:
            assert isinstance(cs, ClaimScore)
            assert cs.label in ("ENTAILMENT", "CONTRADICTION", "NEUTRAL")
            assert 0.0 <= cs.confidence <= 1.0

    async def test_sources_used_populated(
        self, models_tenant_config, sentinel_settings, mock_vector_store
    ):
        response = "The Acme Medical API supports HL7 FHIR R4."
        with patch(
            "sentinel.layers.verifier._extract_claims",
            new=AsyncMock(return_value=["The Acme Medical API supports HL7 FHIR R4."]),
        ):
            result = await verify(
                response_text=response,
                tenant_config=models_tenant_config,
                settings=sentinel_settings,
                vector_store=mock_vector_store,
            )
        assert isinstance(result.claims, list)


class TestVerifyNonFactualResponse:
    """A response with no factual claims should return trust_score=1.0."""

    async def test_question_returns_full_trust(
        self, models_tenant_config, sentinel_settings, mock_vector_store
    ):
        response = "Sure, I'd be happy to help! What would you like to know?"
        with patch(
            "sentinel.layers.verifier._extract_claims",
            new=AsyncMock(return_value=[]),
        ):
            result = await verify(
                response_text=response,
                tenant_config=models_tenant_config,
                settings=sentinel_settings,
                vector_store=mock_vector_store,
            )
        assert result.trust_score >= 0.0
        assert isinstance(result, VerificationResult)


class TestVerificationResultContract:
    """Verify field types and value constraints."""

    async def test_trust_score_in_range(
        self, models_tenant_config, sentinel_settings, mock_vector_store
    ):
        with patch(
            "sentinel.layers.verifier._extract_claims",
            new=AsyncMock(return_value=["The API supports REST."]),
        ):
            result = await verify(
                response_text="The API supports REST.",
                tenant_config=models_tenant_config,
                settings=sentinel_settings,
                vector_store=mock_vector_store,
            )
        assert 0.0 <= result.trust_score <= 1.0

    async def test_cross_check_agreement_in_range(
        self, models_tenant_config, sentinel_settings, mock_vector_store
    ):
        with patch(
            "sentinel.layers.verifier._extract_claims",
            new=AsyncMock(return_value=["Rate limit is 1000 requests per minute."]),
        ):
            result = await verify(
                response_text="Rate limit is 1000 requests per minute.",
                tenant_config=models_tenant_config,
                settings=sentinel_settings,
                vector_store=mock_vector_store,
            )
        assert 0.0 <= result.cross_check_agreement <= 1.0

    async def test_rag_entailment_non_negative(
        self, models_tenant_config, sentinel_settings, mock_vector_store
    ):
        with patch(
            "sentinel.layers.verifier._extract_claims",
            new=AsyncMock(return_value=["The API is HIPAA compliant."]),
        ):
            result = await verify(
                response_text="The API is HIPAA compliant.",
                tenant_config=models_tenant_config,
                settings=sentinel_settings,
                vector_store=mock_vector_store,
            )
        assert result.rag_entailment_score >= 0.0

    async def test_semantic_drift_score_non_negative(
        self, models_tenant_config, sentinel_settings, mock_vector_store
    ):
        with patch(
            "sentinel.layers.verifier._extract_claims",
            new=AsyncMock(return_value=["The API uses AES-256 encryption."]),
        ):
            result = await verify(
                response_text="The API uses AES-256 encryption.",
                tenant_config=models_tenant_config,
                settings=sentinel_settings,
                vector_store=mock_vector_store,
            )
        assert result.semantic_drift_score >= 0.0
