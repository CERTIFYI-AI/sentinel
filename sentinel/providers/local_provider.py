"""Local LLM provider for Ollama and vLLM.

Both Ollama and vLLM expose OpenAI-compatible API endpoints, so this
provider reuses litellm with a custom api_base pointing at the local
server. Cost tracking is set to zero since local inference has no
per-token API cost (hardware cost is out of scope).
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

# Default local endpoints if api_base not specified
_DEFAULT_OLLAMA_BASE = "http://localhost:11434"
_DEFAULT_VLLM_BASE = "http://localhost:8080/v1"


class LocalProvider(LLMProvider):
    """Provider for locally-hosted models via Ollama or vLLM.

    Both services implement OpenAI-compatible chat completion endpoints.
    Set the api_base in ProviderConfig to point at your local server.
    Defaults to Ollama's standard port (11434) if not specified.

    Cost is always reported as 0.0 since local inference has no API cost.
    If you need to track compute cost, add it via sentinel.yaml's
    providers.costs.custom_per_token_usd field.
    """

    def __init__(self, config: ProviderConfig) -> None:
        if not config.api_base:
            config = ProviderConfig(
                name=config.name,
                model=config.model,
                api_key=config.api_key,
                api_base=_DEFAULT_OLLAMA_BASE,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                timeout_seconds=config.timeout_seconds,
                extra_params=config.extra_params,
            )
            logger.info(
                "No api_base set for local provider, defaulting to %s",
                _DEFAULT_OLLAMA_BASE,
            )
        super().__init__(config)
        # Prefix model with ollama/ for litellm routing unless already prefixed
        if not any(
            self.config.model.startswith(p)
            for p in ("ollama/", "openai/", "huggingface/")
        ):
            self.config = ProviderConfig(
                name=config.name,
                model=f"ollama/{config.model}",
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
        """Call the local model's OpenAI-compatible endpoint.

        Local models do not report token usage consistently, so we
        default prompt_tokens and completion_tokens to 0 if not provided.
        Cost is always 0.0 for local inference.
        """
        start = time.monotonic()
        try:
            response = await litellm.acompletion(
                model=self.config.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.config.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.config.max_tokens,
                api_base=self.config.api_base or None,
                api_key=self.config.api_key or "not-needed",
                timeout=self.config.timeout_seconds,
            )
        except Exception as exc:
            raise ProviderError(
                provider_id=self.provider_id,
                message=f"Local completion failed (is the server running at {self.config.api_base}?): {exc}",
                cause=exc,
            ) from exc

        elapsed_ms = (time.monotonic() - start) * 1000
        usage = response.usage
        content = response.choices[0].message.content or ""

        return LLMResponse(
            content=content,
            model=response.model or self.config.model,
            provider_id=self.provider_id,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            cost_usd=0.0,
            latency_ms=elapsed_ms,
            finish_reason=response.choices[0].finish_reason or "stop",
        )

    async def stream(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[StreamChunk]:
        """Stream from the local model's OpenAI-compatible endpoint."""
        try:
            response = await litellm.acompletion(
                model=self.config.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.config.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.config.max_tokens,
                api_base=self.config.api_base or None,
                api_key=self.config.api_key or "not-needed",
                timeout=self.config.timeout_seconds,
                stream=True,
            )
        except Exception as exc:
            raise ProviderError(
                provider_id=self.provider_id,
                message=f"Local stream failed: {exc}",
                cause=exc,
            ) from exc

        async for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            yield StreamChunk(
                content=delta.content or "",
                finish_reason=chunk.choices[0].finish_reason,
                model=chunk.model or self.config.model,
                provider_id=self.provider_id,
            )

    async def health_check(self) -> bool:
        """Check if the local model server is running and responsive."""
        try:
            response = await litellm.acompletion(
                model=self.config.model,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
                api_base=self.config.api_base or None,
                api_key=self.config.api_key or "not-needed",
                timeout=5,
            )
            return bool(response.choices)
        except Exception:
            logger.warning(
                "Local provider health check failed for %s at %s",
                self.provider_id,
                self.config.api_base,
            )
            return False
