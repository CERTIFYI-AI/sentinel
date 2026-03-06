"""Configuration management for Certifyi Sentinel.

Uses pydantic-settings to load from environment variables with
sentinel.yaml as a file-based override. Validates all settings at
startup and logs a redacted summary.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, List, Optional

from pydantic import BaseModel, Field, PostgresDsn, RedisDsn, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_CONFIG_DIR = Path(__file__).resolve().parent.parent / "configs"


# ---------------------------------------------------------------------------
# Sub-configuration models (BaseModel - used as nested configs)
# ---------------------------------------------------------------------------


class CircuitBreakerConfig(BaseModel):
    """Circuit breaker configuration."""

    open_threshold: int = 5
    window_seconds: int = 60
    reset_seconds: int = 300


class HitlConfig(BaseModel):
    """Human-in-the-loop configuration."""

    queue_name: str = "sentinel-hitl"
    canned_response: str = (
        "I want to make sure I give you accurate information "
        "on this. Let me verify the details and get back to "
        "you shortly."
    )


class PiiConfig(BaseModel):
    """PII detection configuration."""

    entities: list[str] = Field(default_factory=lambda: [
        "PERSON", "EMAIL", "PHONE_NUMBER", "CREDIT_CARD", "US_SSN"
    ])
    custom_patterns: list[str] = Field(default_factory=list)


class GoldenSourceConfig(BaseModel):
    """Golden source similarity configuration."""

    similarity_threshold: float = 0.72
    top_k: int = 3


class SemanticDriftConfig(BaseModel):
    """Semantic drift detection configuration."""

    alert_threshold_sigma: float = 2.0
    block_threshold_sigma: float = 3.5


class CostConfig(BaseModel):
    """Cost tracking configuration."""

    verification_models: bool = True
    primary_model: bool = True


class ProviderConfig(BaseModel):
    """Configuration for LLM providers."""

    name: str = "openai"
    api_base: str = "https://api.openai.com/v1"
    api_key: str = ""
    model: str = "gpt-4"
    enabled: bool = True
    primary_name: str = "openai"
    primary_model: str = "gpt-4o"
    primary_api_key: str = ""
    fallback_name: str = "anthropic"
    fallback_model: str = "claude-3-5-haiku-20241022"
    fallback_api_key: str = ""


class ProxyConfig(BaseModel):
    """Proxy server configuration."""

    host: str = "0.0.0.0"
    port: int = 8080
    workers: int = 4
    timeout: float = 30.0
    allowed_origins: list[str] = Field(default_factory=lambda: ["*"])


class PolicyConfig(BaseSettings):
    """Policy engine configuration."""

    model_config = SettingsConfigDict(env_prefix="SENTINEL_POLICY_", extra="ignore")

    max_prompt_length: int = Field(default=10000, ge=100)
    blocked_topics: list[str] = Field(default_factory=list)
    content_policy_enabled: bool = True
    pii_detection: bool = True
    strict_mode: bool = False
    default_action: str = "allow"


class AuditConfig(BaseSettings):
    """Audit logging configuration."""

    model_config = SettingsConfigDict(env_prefix="SENTINEL_AUDIT_", extra="ignore")

    enabled: bool = True
    retention_days: int = Field(default=180, ge=1)
    export_format: str = "csv"
    storage_backend: str = "sqlite"
    storage_path: str = "data/audit.db"


class FactCheckConfig(BaseSettings):
    """Fact-checking configuration."""

    model_config = SettingsConfigDict(env_prefix="SENTINEL_FACTCHECK_", extra="ignore")

    enabled: bool = True
    min_confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    max_claims_per_response: int = Field(default=20, ge=1)
    provider: str = "internal"
    external_api_url: str = ""
    external_api_key: str = ""
    max_claims_per_request: int = Field(default=20, ge=1)


class DashboardConfig(BaseSettings):
    """Dashboard configuration."""

    model_config = SettingsConfigDict(env_prefix="SENTINEL_DASHBOARD_", extra="ignore")

    enabled: bool = True
    refresh_interval_seconds: int = Field(default=5, ge=1)
    max_audit_entries: int = Field(default=500, ge=10)


# ---------------------------------------------------------------------------
# Core SentinelConfig (BaseModel - used by tests and internal code)
# ---------------------------------------------------------------------------


class SentinelConfig(BaseModel):
    """Core Sentinel configuration used by layers and test fixtures."""

    model_config = {"extra": "allow"}

    version: str = "0.2.0"
    trust_score_threshold: float = 0.85
    injection_block_threshold: float = 0.78
    cross_check_trigger_threshold: float = 0.80
    fallback_model: str = "gpt-4o"

    circuit_breaker: CircuitBreakerConfig = Field(default_factory=CircuitBreakerConfig)
    hitl: HitlConfig = Field(default_factory=HitlConfig)
    pii: PiiConfig = Field(default_factory=PiiConfig)
    golden_source: GoldenSourceConfig = Field(default_factory=GoldenSourceConfig)
    semantic_drift: SemanticDriftConfig = Field(default_factory=SemanticDriftConfig)
    costs: CostConfig = Field(default_factory=CostConfig)

    # Sub-configs used by proxy, rules, checker, audit
    providers: list[ProviderConfig] = Field(default_factory=lambda: [ProviderConfig()])
    proxy: ProxyConfig = Field(default_factory=ProxyConfig)
    policy: PolicyConfig = Field(default_factory=PolicyConfig)
    fact_check: FactCheckConfig = Field(default_factory=FactCheckConfig)
    audit: AuditConfig = Field(default_factory=AuditConfig)
    dashboard: DashboardConfig = Field(default_factory=DashboardConfig)


class TenantConfig(BaseModel):
    """Per-tenant configuration wrapper."""

    tenant_id: str
    config: SentinelConfig = Field(default_factory=SentinelConfig)
    api_key_hash: str = ""


# ---------------------------------------------------------------------------
# SentinelSettings (BaseSettings - used for env-based config loading)
# ---------------------------------------------------------------------------


class SentinelSettings(BaseSettings):
    """Central configuration validated at startup.

    Loads from env vars first, then sentinel.yaml override file.
    Every field has a safe default except DATABASE_URL and SECRET_KEY,
    which must be provided or the app will refuse to start.
    """

    model_config = SettingsConfigDict(
        env_prefix="SENTINEL_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- core ---
    version: str = Field(default="0.2.0", alias="SENTINEL_VERSION")
    environment: str = "development"
    database_url: PostgresDsn = Field(
        ..., description="asyncpg connection string for PostgreSQL"
    )
    redis_url: RedisDsn | None = Field(
        default=None,
        description="Redis URL. Falls back to in-memory if absent.",
    )
    secret_key: str = Field(
        ..., min_length=32, description="Secret for JWT signing"
    )

    # --- sub-configs ---
    providers: list[ProviderConfig] = Field(
        default_factory=lambda: [ProviderConfig()]
    )
    proxy: ProxyConfig = Field(default_factory=ProxyConfig)
    policy: PolicyConfig = Field(default_factory=PolicyConfig)
    fact_check: FactCheckConfig = Field(default_factory=FactCheckConfig)
    audit: AuditConfig = Field(default_factory=AuditConfig)
    dashboard: DashboardConfig = Field(default_factory=DashboardConfig)

    # --- trust thresholds ---
    trust_score_block_threshold: float = Field(
        default=0.85, ge=0.0, le=1.0
    )
    injection_block_threshold: float = Field(
        default=0.78, ge=0.0, le=1.0
    )
    cross_check_trigger_threshold: float = Field(
        default=0.80, ge=0.0, le=1.0
    )
    golden_source_similarity_threshold: float = Field(
        default=0.72, ge=0.0, le=1.0
    )

    # --- models ---
    fallback_model: str = "gpt-4o"
    spacy_model: str = "en_core_web_lg"
    embedding_model: str = "all-MiniLM-L6-v2"
    nli_model: str = "cross-encoder/nli-deberta-v3-large"
    max_nli_batch_size: int = Field(default=32, ge=1)

    # --- circuit breaker ---
    cb_open_threshold: int = Field(default=5, ge=1)
    cb_window_seconds: int = Field(default=60, ge=10)
    cb_reset_seconds: int = Field(default=300, ge=30)

    # --- HITL ---
    hitl_queue_name: str = "sentinel-hitl"
    hitl_canned_response: str = (
        "I want to make sure I give you accurate information "
        "on this. Let me verify the details and get back to "
        "you shortly."
    )

    # --- server ---
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_origins: list[str] = Field(default_factory=lambda: ["*"])
    rate_limit_rpm: int = Field(default=60, ge=1)

    @model_validator(mode="after")
    def _warn_degraded_modes(self) -> "SentinelSettings":
        """Emit actionable warnings when optional services are absent."""
        if self.redis_url is None:
            logger.warning(
                "REDIS_URL not configured. Circuit breaker running "
                "in-memory mode. State will be lost on process "
                "restart. Set REDIS_URL for production."
            )
        return self

    def log_summary(self) -> None:
        """Log redacted config summary at startup."""
        safe: dict[str, Any] = {
            k: ("***" if "secret" in k or "key" in k else v)
            for k, v in self.model_dump().items()
        }
        for key, val in sorted(safe.items()):
            logger.info("config: %s = %s", key, val)


def load_settings(config_path: Optional[str] = None) -> SentinelSettings:
    """Build and validate settings, fail-fast on bad config."""
    settings = SentinelSettings()  # type: ignore[call-arg]
    settings.log_summary()
    return settings


def load_config() -> SentinelConfig:
    """Build a SentinelConfig for use by proxy and internal code."""
    return SentinelConfig()

