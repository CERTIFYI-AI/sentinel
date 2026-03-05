"""OpenAI and OpenAI-compatible provider (Groq, Together, etc).

Uses litellm as the SDK layer to handle OpenAI-compatible endpoints
including Groq and Together AI. LiteLLM normalises the response
format and provides built-in cost tracking via cost_per_token().
"""

from __future__ import annotations

import logging
import time
from typing import AsyncIterator

import litellm

from sentinel.providers.base import (
    LLMProvider,
    LLMResponse,
    ProviderConfig,
    ProviderError,
    StreamChunk,
)

logger = logging.getLogger(__name__)

# Suppress litellm's verbose default logging — we handle our own
litellm.suppress_debug_info = True


class OpenAIProvider(LLMProvider):
    """Provider for OpenAI API and OpenAI-compatible endpoints.

    Handles both official OpenAI (gpt-4o, gpt-4o-mini) and third-party
    services that implement the OpenAI chat completions spec (Groq, Together).
    Set api_base in ProviderConfig to point at a non-OpenAI endpoint.
    """

    async def complete(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Call the OpenAI-compatible completions endpoint.

        Uses litellm.acompletion() which handles retry logic, API key
        rotation, and response normalisation across providers. Cost is
        computed from the response usage metadata via litellm's token
        cost tables.

        Args:
            messages: Chat messages in OpenAI format.
            temperature: Override default temperature for this call.
            max_tokens: Override default max_tokens for this call.

        Returns:
            LLMResponse with content, token counts, and cost.

        Raises:
            ProviderError: On API failure, timeout, or rate limit.
        """
        start = time.monotonic()
        try:
            response = await litellm.acompletion(
                model=self.config.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.config.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.config.max_tokens,
                api_key=self.config.api_key or None,
                api_base=self.config.api_base or None,
                timeout=self.config.timeout_seconds,
            )
        except Exception as exc:
            raise ProviderError(
                provider_id=self.provider_id,
                message=f"Completion failed: {exc}",
                cause=exc,
            ) from exc

        elapsed_ms = (time.monotonic() - start) * 1000
        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0

        cost = litellm.completion_cost(
            completion_response=response,
        )

        content = response.choices[0].message.content or ""
        finish_reason = response.choices[0].finish_reason or "stop"

        logger.debug(
            "OpenAI completion: model=%s tokens=%d+%d cost=$%.6f latency=%.0fms",
            self.config.model,
            prompt_tokens,
            completion_tokens,
            cost,
            elapsed_ms,
        )

        return LLMResponse(
            content=content,
            model=response.model or self.config.model,
            provider_id=self.provider_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=float(cost),
            latency_ms=elapsed_ms,
            finish_reason=finish_reason,
        )

    async def stream(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[StreamChunk]:
        """Stream response chunks from the OpenAI-compatible endpoint.

        Yields StreamChunk objects as they arrive from the upstream API.
        The proxy layer buffers all chunks before running verification,
        so this is used primarily for the initial generation phase.
        """
        try:
            response = await litellm.acompletion(
                model=self.config.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.config.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.config.max_tokens,
                api_key=self.config.api_key or None,
                api_base=self.config.api_base or None,
                timeout=self.config.timeout_seconds,
                stream=True,
            )
        except Exception as exc:
            raise ProviderError(
                provider_id=self.provider_id,
                message=f"Stream initiation failed: {exc}",
                cause=exc,
            ) from exc

        async for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            content = delta.content or ""
            finish = chunk.choices[0].finish_reason
            yield StreamChunk(
                content=content,
                finish_reason=finish,
                model=chunk.model or self.config.model,
                provider_id=self.provider_id,
            )

    async def health_check(self) -> bool:
        """Check OpenAI connectivity via the models endpoint.

        Cheaper than sending a completion request — just verifies the
        API key is valid and the service is reachable.
        """
        try:
            response = await litellm.acompletion(
                model=self.config.model,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
                api_key=self.config.api_key or None,
                api_base=self.config.api_base or None,
                timeout=5,
            )
            return bool(response.choices)
        except Exception:
            logger.warning("Health check failed for %s", self.provider_id)
            return False
