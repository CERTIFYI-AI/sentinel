# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Credential encryption for integration connections.

AES-256-GCM. The key comes from ``SENTINEL_CREDENTIALS_KEY`` (base64, exactly
32 bytes decoded) and exists only in the backend environment — the browser
stores and sees ciphertext blobs, never plaintext and never the key. Fail
closed: no key, no crypto, no silent fallback.

Blob shape (jsonb in ``integrations.credentials_encrypted``)::

    {"v": 1, "nonce": "<b64>", "ciphertext": "<b64>"}
"""

from __future__ import annotations

import base64
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_ENV_KEY = "SENTINEL_CREDENTIALS_KEY"
_VERSION = 1
_AAD = b"sentinel:integration_credentials:v1"


class CredentialKeyMissing(RuntimeError):
    """Raised when the environment carries no usable encryption key."""


def _load_key() -> bytes:
    raw = os.environ.get(_ENV_KEY, "")
    if not raw:
        raise CredentialKeyMissing(
            f"{_ENV_KEY} is not set — integration credentials cannot be "
            "encrypted or decrypted. Generate one with: "
            "python -c \"import os,base64;print(base64.b64encode(os.urandom(32)).decode())\""
        )
    try:
        key = base64.b64decode(raw, validate=True)
    except Exception as exc:  # noqa: BLE001 — normalize to one error type
        raise CredentialKeyMissing(f"{_ENV_KEY} is not valid base64") from exc
    if len(key) != 32:
        raise CredentialKeyMissing(
            f"{_ENV_KEY} must decode to exactly 32 bytes (got {len(key)})"
        )
    return key


def encrypt_credentials(credentials: dict) -> dict:
    """Encrypt a credentials dict into the storable blob."""
    key = _load_key()
    nonce = os.urandom(12)
    plaintext = json.dumps(credentials, separators=(",", ":")).encode()
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, _AAD)
    return {
        "v": _VERSION,
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
    }


def decrypt_credentials(blob: dict) -> dict:
    """Decrypt a stored blob back into the credentials dict.

    Raises ``ValueError`` on tampered or wrong-key blobs — the worker surfaces
    that as a sync error rather than retrying forever.
    """
    if not isinstance(blob, dict) or blob.get("v") != _VERSION:
        raise ValueError("unrecognized credential blob version")
    key = _load_key()
    try:
        nonce = base64.b64decode(blob["nonce"])
        ciphertext = base64.b64decode(blob["ciphertext"])
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, _AAD)
    except KeyError as exc:
        raise ValueError(f"credential blob missing field: {exc}") from exc
    except Exception as exc:  # InvalidTag and friends
        raise ValueError("credential blob failed decryption (wrong key or tampered)") from exc
    return json.loads(plaintext)
