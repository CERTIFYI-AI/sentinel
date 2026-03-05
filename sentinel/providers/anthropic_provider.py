"""Anthropic Claude provider.

Routes through litellm which handles the Anthropic Messages API format
translation. Supports Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude
3 Opus. The model name must use litellm's anthropic/ prefix convention
(e.g., 'anthropic/claude-3-5-haiku-20241022').
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


class AnthropicProvider(LLMProvider):
    """Provider for Anthropic's Claude models via litellm.

    LiteLLM translates OpenAI-format messages to Anthropic's Messages
    API format automatically. The model name is prefixed with 'anthropic/'
    if not already present, ensuring litellm routes to the correct backend.
    """

    def __init__(self, config: ProviderConfig) -> None:
        super().__init__(config)
        # litellm requires the anthropic/ prefix for routing
        if not self.config.model.startswith("anthropic/"):
            self.config = ProviderConfig(
                name=config.name,
                model=f"anthropic/{config.model}",
                api_key=config.api_key,
                api_base=config.api_base,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                timeout_seconds=config.timeout_seconds,
                extra_params=config.extra_params,
            )

    async def complete(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Call Anthropic's Messages API via litellm.

        Anthropic requires max_tokens to be set explicitly (no default).
        We use the config value if not overridden.
        """
        start = time.monotonic()
        try:
            response = await litellm.acompletion(
                model=self.config.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.config.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.config.max_tokens,
                api_key=self.config.api_key or None,
                timeout=self.config.timeout_seconds,
            )
        except Exception as exc:
            raise ProviderError(
                provider_id=self.provider_id,
                message=f"Anthropic completion failed: {exc}",
                cause=exc,
            ) from exc

        elapsed_ms = (time.monotonic() - start) * 1000
        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0

        cost = litellm.completion_cost(completion_response=response)
        content = response.choices[0].message.content or ""
        finish_reason = response.choices[0].finish_reason or "stop"

        logger.debug(
            "Anthropic completion: model=%s tokens=%d+%d cost=$%.6f latency=%.0fms",
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
        """Stream response chunks from Anthropic via litellm."""
        try:
            response = await litellm.acompletion(
                model=self.config.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.config.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.config.max_tokens,
                api_key=self.config.api_key or None,
                timeout=self.config.timeout_seconds,
                stream=True,
            )
        except Exception as exc:
            raise ProviderError(
                provider_id=self.provider_id,
                message=f"Anthropic stream failed: {exc}",
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
