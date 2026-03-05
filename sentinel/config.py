"""Configuration management for Certifyi Sentinel.

Handles loading, validation, and access to all configuration
settings from environment variables, YAML files, and defaults.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml


@dataclass
class ProxyConfig:
    """Configuration for the LLM proxy layer."""

    host: str = "0.0.0.0"
    port: int = 8080
    workers: int = 4
    timeout: int = 30
    max_retries: int = 3
    allowed_origins: List[str] = field(default_factory=lambda: ["*"])
    rate_limit_rpm: int = 60
    rate_limit_burst: int = 10


@dataclass
class LLMProviderConfig:
    """Configuration for an upstream LLM provider."""

    name: str = ""
    api_base: str = ""
    api_key: str = ""
    model: str = ""
    max_tokens: int = 4096
    temperature: float = 0.0
    timeout: int = 30
    enabled: bool = True


@dataclass
class PolicyConfig:
    """Configuration for the policy/rules engine."""

    rules_dir: str = "rules/"
    default_action: str = "allow"
    strict_mode: bool = False
    custom_rules: List[Dict[str, Any]] = field(default_factory=list)
    blocked_topics: List[str] = field(default_factory=list)
    pii_detection: bool = True
    toxicity_threshold: float = 0.7


@dataclass
class FactCheckConfig:
    """Configuration for the fact-checking module."""

    enabled: bool = True
    provider: str = "internal"
    confidence_threshold: float = 0.8
    cache_ttl: int = 3600
    max_claims_per_request: int = 10
    external_api_url: str = ""
    external_api_key: str = ""


@dataclass
class AuditConfig:
    """Configuration for audit logging and traceability."""

    enabled: bool = True
    log_level: str = "INFO"
    log_format: str = "json"
    storage_backend: str = "sqlite"
    storage_path: str = "data/audit.db"
    retention_days: int = 90
    include_request_body: bool = True
    include_response_body: bool = True
    redact_pii: bool = True


@dataclass
class DashboardConfig:
    """Configuration for the monitoring dashboard."""

    enabled: bool = True
    host: str = "0.0.0.0"
    port: int = 8081
    auth_enabled: bool = True
    secret_key: str = ""
    session_ttl: int = 3600


@dataclass
class PluginConfig:
    """Configuration for the plugin system."""

    enabled: bool = True
    plugins_dir: str = "plugins/"
    auto_discover: bool = True
    allowed_plugins: List[str] = field(default_factory=list)
    blocked_plugins: List[str] = field(default_factory=list)


@dataclass
class SentinelConfig:
    """Root configuration for Certifyi Sentinel."""

    app_name: str = "certifyi-sentinel"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"

    proxy: ProxyConfig = field(default_factory=ProxyConfig)
    providers: List[LLMProviderConfig] = field(default_factory=list)
    policy: PolicyConfig = field(default_factory=PolicyConfig)
    fact_check: FactCheckConfig = field(default_factory=FactCheckConfig)
    audit: AuditConfig = field(default_factory=AuditConfig)
    dashboard: DashboardConfig = field(default_factory=DashboardConfig)
    plugins: PluginConfig = field(default_factory=PluginConfig)


def _deep_merge(base: Dict, override: Dict) -> Dict:
    """Deep merge two dictionaries."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _apply_env_overrides(config_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Apply environment variable overrides.

    Environment variables follow the pattern:
    SENTINEL_<SECTION>_<KEY>=value
    e.g. SENTINEL_PROXY_PORT=9090
    """
    prefix = "SENTINEL_"
    for env_key, env_value in os.environ.items():
        if not env_key.startswith(prefix):
            continue
        parts = env_key[len(prefix):].lower().split("_", 1)
        if len(parts) == 2:
            section, key = parts
            if section in config_dict and isinstance(config_dict[section], dict):
                config_dict[section][key] = env_value
        elif len(parts) == 1:
            config_dict[parts[0]] = env_value
    return config_dict


def _dict_to_config(data: Dict[str, Any]) -> SentinelConfig:
    """Convert a dictionary to a SentinelConfig instance."""
    proxy = ProxyConfig(**data.get("proxy", {}))
    providers = [
        LLMProviderConfig(**p) for p in data.get("providers", [])
    ]
    policy = PolicyConfig(**data.get("policy", {}))
    fact_check = FactCheckConfig(**data.get("fact_check", {}))
    audit = AuditConfig(**data.get("audit", {}))
    dashboard = DashboardConfig(**data.get("dashboard", {}))
    plugins = PluginConfig(**data.get("plugins", {}))

    return SentinelConfig(
        app_name=data.get("app_name", "certifyi-sentinel"),
        environment=data.get("environment", "development"),
        debug=data.get("debug", False),
        log_level=data.get("log_level", "INFO"),
        proxy=proxy,
        providers=providers,
        policy=policy,
        fact_check=fact_check,
        audit=audit,
        dashboard=dashboard,
        plugins=plugins,
    )


def load_config(
    config_path: Optional[str] = None,
    overrides: Optional[Dict[str, Any]] = None,
) -> SentinelConfig:
    """Load configuration from file, env vars, and overrides.

    Priority (highest to lowest):
    1. Explicit overrides dict
    2. Environment variables (SENTINEL_*)
    3. Config file (YAML)
    4. Defaults

    Args:
        config_path: Path to a YAML configuration file.
        overrides: Dictionary of override values.

    Returns:
        Fully resolved SentinelConfig instance.
    """
    config_dict: Dict[str, Any] = {}

    # Load from file
    if config_path is None:
        config_path = os.environ.get("SENTINEL_CONFIG_PATH")
    if config_path and Path(config_path).exists():
        with open(config_path, "r") as fh:
            file_config = yaml.safe_load(fh) or {}
        config_dict = _deep_merge(config_dict, file_config)

    # Apply env overrides
    config_dict = _apply_env_overrides(config_dict)

    # Apply explicit overrides
    if overrides:
        config_dict = _deep_merge(config_dict, overrides)

    return _dict_to_config(config_dict)
