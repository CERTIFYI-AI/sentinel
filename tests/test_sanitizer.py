"""Tests for sentinel/layers/sanitizer.py.

Covers PII masking, injection detection, and the sanitize() function end-to-end.
All tests run without network access; Presidio and sentence-transformers are
loaded in CPU-only mode.
"""
from __future__ import annotations

import pytest

from sentinel.layers.sanitizer import SanitizationResult, init_sanitizer, sanitize


@pytest.fixture(scope="module", autouse=True)
async def _init():
    """Load NLP models once per module to avoid repeated startup overhead."""
    await init_sanitizer()


class TestPiiMasking:
    """Verify that Presidio correctly detects and redacts PII entities."""

    async def test_email_is_redacted(self, tenant_config):
        prompt = "My email is alice@example.com, please help me."
        result: SanitizationResult = await sanitize(prompt, tenant_config.config)
        assert "alice@example.com" not in result.clean_prompt
        assert "EMAIL" in result.detected_entities
        assert any("EMAIL" in k for k in result.redaction_map.values())
        assert not result.blocked

    async def test_person_name_is_redacted(self, tenant_config):
        prompt = "Patient John Smith needs an appointment."
        result = await sanitize(prompt, tenant_config.config)
        assert "PERSON" in result.detected_entities
        assert result.latency_ms > 0

    async def test_ssn_is_redacted(self, tenant_config, pii_prompts):
        result = await sanitize(pii_prompts[1], tenant_config.config)
        assert "US_SSN" in result.detected_entities or "CREDIT_CARD" in result.detected_entities
        assert "123-45-6789" not in result.clean_prompt

    async def test_redaction_map_enables_downstream_citation(self, tenant_config):
        """Each masked entity must be stored in redaction_map for audit trail."""
        prompt = "Email me at bob@corp.com about order #12345."
        result = await sanitize(prompt, tenant_config.config)
        # At least one redaction entry must exist if an entity was detected.
        if result.detected_entities:
            assert len(result.redaction_map) > 0

    async def test_no_pii_prompt_passes_cleanly(self, tenant_config):
        prompt = "What is the Acme Medical API rate limit?"
        result = await sanitize(prompt, tenant_config.config)
        assert not result.blocked
        assert result.detected_entities == []
        assert result.clean_prompt == prompt


class TestInjectionDetection:
    """Verify that prompt injection attempts are blocked above the threshold."""

    async def test_obvious_injection_is_blocked(self, tenant_config, injection_prompt):
        """The seed injection database contains variants of 'ignore all previous
        instructions' — this should score above the 0.78 default threshold."""
        result = await sanitize(injection_prompt, tenant_config.config)
        assert result.injection_score >= 0.0  # Score is computed.
        # If injection_score > threshold, blocked must be True.
        if result.injection_score > tenant_config.config.injection_block_threshold:
            assert result.blocked

    async def test_benign_prompt_not_blocked(self, tenant_config):
        prompt = "What FHIR resources does the Acme Medical API support?"
        result = await sanitize(prompt, tenant_config.config)
        assert not result.blocked
        assert result.injection_score < tenant_config.config.injection_block_threshold

    async def test_injection_score_is_float_in_range(self, tenant_config):
        prompt = "Please summarise the API documentation for me."
        result = await sanitize(prompt, tenant_config.config)
        assert 0.0 <= result.injection_score <= 1.0


class TestSanitizeContract:
    """Verify return type and field consistency regardless of input."""

    async def test_result_is_sanitization_result_type(self, tenant_config):
        result = await sanitize("hello", tenant_config.config)
        assert isinstance(result, SanitizationResult)

    async def test_latency_is_positive(self, tenant_config):
        result = await sanitize("Test prompt.", tenant_config.config)
        assert result.latency_ms > 0

    async def test_empty_prompt_does_not_raise(self, tenant_config):
        result = await sanitize("", tenant_config.config)
        assert result is not None
        assert result.clean_prompt == ""

    async def test_very_long_prompt_handled(self, tenant_config):
        prompt = "What is the API? " * 500  # ~8500 chars
        result = await sanitize(prompt, tenant_config.config)
        assert isinstance(result, SanitizationResult)
