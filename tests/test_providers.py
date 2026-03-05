"""Tests for sentinel/providers — OpenAI, Anthropic, Local providers.

All tests mock the underlying HTTP calls; no real API calls are made.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sentinel.providers.base import LLMProvider, LLMResponse
from sentinel.providers.openai_provider import OpenAIProvider
from sentinel.providers.anthropic_provider import AnthropicProvider
from sentinel.providers.local_provider import LocalProvider


class TestLLMProviderInterface:
    """All providers must implement the LLMProvider abstract interface."""

    def test_openai_is_llm_provider_subclass(self):
        assert issubclass(OpenAIProvider, LLMProvider)

    def test_anthropic_is_llm_provider_subclass(self):
        assert issubclass(AnthropicProvider, LLMProvider)

    def test_local_is_llm_provider_subclass(self):
        assert issubclass(LocalProvider, LLMProvider)

    def test_providers_have_required_methods(self):
        for cls in (OpenAIProvider, AnthropicProvider, LocalProvider):
            assert hasattr(cls, "complete")
            assert hasattr(cls, "stream")
            assert hasattr(cls, "provider_id")


class TestOpenAIProvider:
    """Unit tests for the OpenAI provider wrapper."""

    @pytest.fixture
    def provider(self):
        return OpenAIProvider(
            api_key="test-key",
            model="gpt-4o-mini",
            base_url=None,
        )

    async def test_complete_returns_llm_response(self, provider):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Test response"))]
        mock_response.usage = MagicMock(prompt_tokens=10, completion_tokens=20)

        with patch.object(provider._client.chat.completions, "create", new=AsyncMock(return_value=mock_response)):
            result = await provider.complete(
                messages=[{"role": "user", "content": "Hello"}]
            )
        assert isinstance(result, LLMResponse)
        assert result.content == "Test response"
        assert result.cost_usd >= 0

    async def test_provider_id_is_openai(self, provider):
        assert "openai" in provider.provider_id.lower()

    async def test_model_attribute_set(self, provider):
        assert provider.model == "gpt-4o-mini"


class TestAnthropicProvider:
    """Unit tests for the Anthropic Claude provider wrapper."""

    @pytest.fixture
    def provider(self):
        return AnthropicProvider(
            api_key="test-key",
            model="claude-3-5-haiku-20241022",
        )

    async def test_complete_returns_llm_response(self, provider):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Claude response")]
        mock_response.usage = MagicMock(input_tokens=10, output_tokens=15)

        with patch.object(provider._client.messages, "create", new=AsyncMock(return_value=mock_response)):
            result = await provider.complete(
                messages=[{"role": "user", "content": "Hello"}]
            )
        assert isinstance(result, LLMResponse)
        assert result.content == "Claude response"

    async def test_provider_id_is_anthropic(self, provider):
        assert "anthropic" in provider.provider_id.lower()


class TestLocalProvider:
    """Unit tests for the local/Ollama provider wrapper."""

    @pytest.fixture
    def provider(self):
        return LocalProvider(
            base_url="http://localhost:11434/v1",
            model="llama3.2",
            api_key="ollama",
        )

    async def test_complete_returns_llm_response(self, provider):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Local LLM response"))]
        mock_response.usage = MagicMock(prompt_tokens=5, completion_tokens=10)

        with patch.object(provider._client.chat.completions, "create", new=AsyncMock(return_value=mock_response)):
            result = await provider.complete(
                messages=[{"role": "user", "content": "Hello"}]
            )
        assert isinstance(result, LLMResponse)
        assert result.content == "Local LLM response"
        # Local provider has zero API cost.
        assert result.cost_usd == 0.0

    async def test_provider_id_is_local(self, provider):
        assert "local" in provider.provider_id.lower() or "ollama" in provider.provider_id.lower()


class TestLLMResponseModel:
    """Verify LLMResponse field validation."""

    def test_cost_usd_cannot_be_negative(self):
        with pytest.raises(ValueError):
            LLMResponse(content="ok", cost_usd=-0.01, model="test")

    def test_valid_response_instantiates(self):
        r = LLMResponse(content="Hello", cost_usd=0.0, model="gpt-4o-mini")
        assert r.content == "Hello"
        assert r.cost_usd == 0.0
