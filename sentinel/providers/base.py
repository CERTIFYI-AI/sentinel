"""Abstract base class for LLM providers.

Defines the contract that all provider implementations must satisfy.
The circuit breaker and proxy layer depend on this interface to
transparently switch between providers during fallback cascades
without coupling to any specific LLM vendor's SDK.
"""

from __future__ import annotations

import abc
import logging
from dataclasses import dataclass, field
from typing import AsyncIterator

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LLMResponse:
    """Structured response from an LLM provider.

    Captures both the generated content and metadata needed for cost
    tracking, audit logging, and circuit breaker state management.
    """

    content: str
    model: str
    provider_id: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float = 0.0
    latency_ms: float = 0.0
    finish_reason: str = "stop"


@dataclass(frozen=True)
class StreamChunk:
    """A single chunk from a streaming LLM response.

    The proxy buffers these chunks to assemble the full response for
    verification before streaming the verified content to the client.
    """

    content: str
    finish_reason: str | None = None
    model: str = ""
    provider_id: str = ""


@dataclass
class ProviderConfig:
    """Configuration for an LLM provider instance.

    Loaded from sentinel.yaml and passed to the provider constructor.
    API keys are resolved from environment variables at startup, never
    hardcoded or logged.
    """

    name: str
    model: str
    api_key: str = ""
    api_base: str = ""
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout_seconds: int = 30
    extra_params: dict[str, object] = field(default_factory=dict)


class LLMProvider(abc.ABC):
    provider_id: str = ""
    """Abstract LLM provider interface.

    All providers must implement complete() for non-streaming and
    stream() for streaming responses. The circuit breaker calls
    complete() during retry cascades; the proxy calls stream() for
    the initial request when the client requests streaming.

    Providers are instantiated once at startup and reused across
    requests. They must be thread-safe and async-compatible.
    """

    def __init__(self, config: ProviderConfig) -> None:
        self.config = config
        self.provider_id = f"{config.name}:{config.model}"
        logger.info(
            "Initialized provider %s (model=%s)",
            config.name,
            config.model,
        )

    @abc.abstractmethod
    async def complete(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Generate a complete response synchronously (non-streaming).

        Args:
            messages: OpenAI-format message list with role/content dicts.
            temperature: Override the provider's default temperature.
                Used by circuit breaker to adjust during retry cascades.
            max_tokens: Override the provider's default max_tokens.

        Returns:
            LLMResponse with the full generated content and metadata.

        Raises:
            ProviderError: If the upstream API call fails after retries.
        """

    @abc.abstractmethod
    async def stream(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[StreamChunk]:
        """Generate a streaming response as an async iterator of chunks.

        The proxy buffers all chunks before running verification. This
        means the client's time-to-first-token includes the full upstream
        generation plus verification latency. This trade-off is documented
        in the README.

        Args:
            messages: OpenAI-format message list.
            temperature: Optional temperature override.
            max_tokens: Optional max_tokens override.

        Yields:
            StreamChunk objects with incremental content.

        Raises:
            ProviderError: If the upstream stream fails.
        """
        yield StreamChunk(content="")  # pragma: no cover

    async def health_check(self) -> bool:
        """Check if the provider is reachable and responding.

        Default implementation sends a minimal completion request.
        Providers can override this with a cheaper health check if
        their API supports it (e.g., OpenAI's models endpoint).
        """
        try:
            response = await self.complete(
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            )
            return len(response.content) > 0
        except Exception:
            logger.warning("Health check failed for provider %s", self.provider_id)
            return False


class ProviderError(Exception):
    """Raised when an LLM provider call fails.

    Contains the provider_id and original error for circuit breaker
    state tracking and structured logging.
    """

    def __init__(self, provider_id: str, message: str, cause: Exception | None = None) -> None:
        self.provider_id = provider_id
        self.cause = cause
        super().__init__(f"Provider {provider_id}: {message}")
