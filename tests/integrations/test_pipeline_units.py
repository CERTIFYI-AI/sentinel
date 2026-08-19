# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Unit tests for the non-adapter pipeline pieces: crypto, mapping, backoff,
registry, and the finding contract."""

from __future__ import annotations

import base64
import os
from unittest.mock import patch

import pytest

from sentinel.integrations.base import CHECK_CATEGORIES, IntegrationFinding
from sentinel.integrations.control_mapping import (
    CATEGORY_TO_CONTROLS, FRAMEWORK_MATCHERS, normalize_ref,
)
from sentinel.integrations.crypto import (
    CredentialKeyMissing, decrypt_credentials, encrypt_credentials,
)
from sentinel.integrations.registry import available_slugs, get_adapter_class
from sentinel.integrations.worker import MAX_BACKOFF_MINUTES, backoff_minutes

TEST_KEY = base64.b64encode(b"0" * 32).decode()


class TestCrypto:
    def test_round_trip(self):
        with patch.dict(os.environ, {"SENTINEL_CREDENTIALS_KEY": TEST_KEY}):
            blob = encrypt_credentials({"token": "ghp_secret", "organization": "acme"})
            assert set(blob) == {"v", "nonce", "ciphertext"}
            assert "ghp_secret" not in str(blob)
            assert decrypt_credentials(blob) == {"token": "ghp_secret", "organization": "acme"}

    def test_missing_key_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(CredentialKeyMissing):
                encrypt_credentials({"token": "x"})

    def test_short_key_rejected(self):
        with patch.dict(os.environ, {"SENTINEL_CREDENTIALS_KEY": base64.b64encode(b"short").decode()}):
            with pytest.raises(CredentialKeyMissing, match="32 bytes"):
                encrypt_credentials({"token": "x"})

    def test_tampered_blob_rejected(self):
        with patch.dict(os.environ, {"SENTINEL_CREDENTIALS_KEY": TEST_KEY}):
            blob = encrypt_credentials({"token": "x"})
            raw = bytearray(base64.b64decode(blob["ciphertext"]))
            raw[0] ^= 0xFF
            blob["ciphertext"] = base64.b64encode(bytes(raw)).decode()
            with pytest.raises(ValueError, match="tampered"):
                decrypt_credentials(blob)

    def test_wrong_key_rejected(self):
        with patch.dict(os.environ, {"SENTINEL_CREDENTIALS_KEY": TEST_KEY}):
            blob = encrypt_credentials({"token": "x"})
        other = base64.b64encode(b"1" * 32).decode()
        with patch.dict(os.environ, {"SENTINEL_CREDENTIALS_KEY": other}):
            with pytest.raises(ValueError):
                decrypt_credentials(blob)


class TestControlMappingTable:
    def test_every_category_has_mappings(self):
        assert set(CATEGORY_TO_CONTROLS) == set(CHECK_CATEGORIES)
        for refs in CATEGORY_TO_CONTROLS.values():
            assert refs, "a category with no targets maps to nothing"

    def test_every_framework_key_has_a_matcher(self):
        used = {fw for refs in CATEGORY_TO_CONTROLS.values() for fw, _ in refs}
        assert used <= set(FRAMEWORK_MATCHERS)

    def test_normalize_ref_bridges_notation_styles(self):
        assert normalize_ref("Art. 32") == normalize_ref("Art.32") == normalize_ref("art 32")
        assert normalize_ref("A.9.4.2") == normalize_ref("A 9.4.2")
        assert normalize_ref("CC6.1") != normalize_ref("CC6.6")


class TestFindingContract:
    def test_unknown_category_is_rejected_at_construction(self):
        with pytest.raises(ValueError, match="unknown check_category"):
            IntegrationFinding(
                check_id="x.y.z", title="t", description="d", remediation="r",
                status="PASSED", severity="INFO", check_category="made_up",
            )


class TestRegistry:
    def test_github_is_available(self):
        adapter_cls, creds_cls = get_adapter_class("github")
        assert adapter_cls.__name__ == "GithubAdapter"
        assert creds_cls.__name__ == "GithubCredentials"
        assert "github" in available_slugs()

    def test_catalogued_only_slug_raises_lookup_error(self):
        # `slack` is catalogued with no adapter. (This was `okta` until its
        # adapter shipped in 20260922000001 — the assertion is about the
        # refusal, not the product.)
        with pytest.raises(LookupError, match="catalogued only"):
            get_adapter_class("slack")


class TestBackoff:
    def test_exponential_with_cap(self):
        assert backoff_minutes(1, rand=lambda: 1.0) == 2
        assert backoff_minutes(3, rand=lambda: 1.0) == 8
        assert backoff_minutes(10, rand=lambda: 1.0) == MAX_BACKOFF_MINUTES

    def test_jitter_spreads_retries(self):
        assert backoff_minutes(5, rand=lambda: 0.0) == 0.0
        assert 0 <= backoff_minutes(5) <= MAX_BACKOFF_MINUTES
