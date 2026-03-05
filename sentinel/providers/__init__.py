"""LLM provider abstraction layer.

Provides a unified interface for communicating with different LLM backends
(OpenAI, Anthropic, local models via Ollama/vLLM). All providers implement
the same LLMProvider protocol, allowing the circuit breaker to transparently
switch between them during fallback cascades.
"""

from sentinel.providers.base import LLMProvider

__all__ = ["LLMProvider"]
