"""Base plugin interface and plugin manager for Certifyi Sentinel."""

from __future__ import annotations

import importlib
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from sentinel.models import LLMRequest, LLMResponse

logger = logging.getLogger(__name__)


class PluginBase(ABC):
    """Abstract base class for Sentinel plugins."""

    name: str = ""
    version: str = "0.1.0"
    description: str = ""

    @abstractmethod
    async def on_request(self, request: LLMRequest) -> LLMRequest:
        """Hook called before forwarding to the LLM provider."""
        return request

    @abstractmethod
    async def on_response(
        self, request: LLMRequest, response: LLMResponse
    ) -> LLMResponse:
        """Hook called after receiving the LLM response."""
        return response

    async def setup(self) -> None:
        """Called when the plugin is loaded."""

    async def teardown(self) -> None:
        """Called when the plugin is unloaded."""


class PluginManager:
    """Discover, load, and manage plugins."""

    def __init__(self) -> None:
        self._plugins: List[PluginBase] = []

    def register(self, plugin: PluginBase) -> None:
        """Register a plugin instance."""
        self._plugins.append(plugin)
        logger.info("Registered plugin: %s v%s", plugin.name, plugin.version)

    def load_from_module(self, module_path: str) -> None:
        """Load a plugin from a dotted module path."""
        try:
            module = importlib.import_module(module_path)
            if hasattr(module, "plugin"):
                self.register(module.plugin)
            else:
                logger.warning("Module %s has no 'plugin' attribute", module_path)
        except Exception:
            logger.exception("Failed to load plugin from %s", module_path)

    async def run_on_request(self, request: LLMRequest) -> LLMRequest:
        """Run all plugin on_request hooks."""
        for plugin in self._plugins:
            try:
                request = await plugin.on_request(request)
            except Exception:
                logger.exception("Plugin %s on_request failed", plugin.name)
        return request

    async def run_on_response(
        self, request: LLMRequest, response: LLMResponse
    ) -> LLMResponse:
        """Run all plugin on_response hooks."""
        for plugin in self._plugins:
            try:
                response = await plugin.on_response(request, response)
            except Exception:
                logger.exception("Plugin %s on_response failed", plugin.name)
        return response

    async def setup_all(self) -> None:
        """Setup all registered plugins."""
        for plugin in self._plugins:
            await plugin.setup()

    async def teardown_all(self) -> None:
        """Teardown all registered plugins."""
        for plugin in self._plugins:
            await plugin.teardown()

    @property
    def loaded(self) -> List[str]:
        """List loaded plugin names."""
        return [p.name for p in self._plugins]
