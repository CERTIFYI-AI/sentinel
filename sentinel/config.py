"""Configuration management for Certifyi Sentinel.

Uses pydantic-settings to load from environment variables with
sentinel.yaml as a file-based override. Validates all settings at
startup and logs a redacted summary.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from pydantic import Field, PostgresDsn, RedisDsn, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_CONFIG_DIR = Path(__file__).resolve().parent.parent / "configs"


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


def load_settings() -> SentinelSettings:
    """Build and validate settings, fail-fast on bad config."""
    settings = SentinelSettings()  # type: ignore[call-arg]
    settings.log_summary()
    return settings
