"""API Key Store — in-memory API key management for multi-tenant access.

Production upgrade: replace with PostgreSQL-backed store + Redis cache.
"""
from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ApiKey:
    id: str
    tenant_id: str
    name: str
    key_hash: str  # SHA-256 hash of the actual key
    key_prefix: str  # First 8 chars for identification
    scopes: list[str]  # e.g. ["proxy:read", "proxy:write", "evals:read"]
    status: str  # ACTIVE | REVOKED | EXPIRED
    created_by: str | None = None
    expires_at: str | None = None
    last_used_at: str | None = None
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    revoked_at: str | None = None


class ApiKeyStore:
    """In-memory API key store. Singleton pattern via class-level storage."""

    _keys: dict[str, list[ApiKey]] = {}  # tenant_id -> keys
    _key_lookup: dict[str, ApiKey] = {}  # key_hash -> ApiKey (cross-tenant)

    @staticmethod
    def _hash_key(raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode()).hexdigest()

    async def create(
        self,
        *,
        tenant_id: str,
        name: str,
        scopes: list[str] | None = None,
        created_by: str | None = None,
        expires_at: str | None = None,
    ) -> tuple[ApiKey, str]:
        """Create a new API key. Returns (ApiKey, raw_key).
        The raw key is only returned once at creation time.
        """
        raw_key = f"sk-sentinel-{secrets.token_urlsafe(32)}"
        key_hash = self._hash_key(raw_key)
        key = ApiKey(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            name=name,
            key_hash=key_hash,
            key_prefix=raw_key[:12],
            scopes=scopes or ["proxy:read", "proxy:write"],
            status="ACTIVE",
            created_by=created_by,
            expires_at=expires_at,
        )
        if tenant_id not in self._keys:
            self._keys[tenant_id] = []
        self._keys[tenant_id].append(key)
        self._key_lookup[key_hash] = key
        logger.info("API key created: %s (%s) for tenant %s", key.id, key.name, tenant_id)
        return key, raw_key

    async def validate(self, raw_key: str) -> ApiKey | None:
        """Validate a raw API key. Returns the ApiKey if valid, None otherwise."""
        key_hash = self._hash_key(raw_key)
        key = self._key_lookup.get(key_hash)
        if not key:
            return None
        if key.status != "ACTIVE":
            return None
        if key.expires_at:
            expiry = datetime.fromisoformat(key.expires_at)
            if expiry < datetime.now(timezone.utc):
                key.status = "EXPIRED"
                return None
        key.last_used_at = datetime.now(timezone.utc).isoformat()
        return key

    async def revoke(self, tenant_id: str, key_id: str) -> ApiKey | None:
        for key in self._keys.get(tenant_id, []):
            if key.id == key_id and key.status == "ACTIVE":
                key.status = "REVOKED"
                key.revoked_at = datetime.now(timezone.utc).isoformat()
                logger.info("API key revoked: %s for tenant %s", key_id, tenant_id)
                return key
        return None

    async def get_all(self, tenant_id: str) -> list[ApiKey]:
        return self._keys.get(tenant_id, [])

    async def rotate(
        self, tenant_id: str, key_id: str
    ) -> tuple[ApiKey, str] | None:
        """Rotate an API key: revoke old, create new with same name/scopes."""
        old_key = None
        for key in self._keys.get(tenant_id, []):
            if key.id == key_id:
                old_key = key
                break
        if not old_key:
            return None
        await self.revoke(tenant_id, key_id)
        return await self.create(
            tenant_id=tenant_id,
            name=old_key.name,
            scopes=old_key.scopes,
            created_by=old_key.created_by,
            expires_at=old_key.expires_at,
        )
