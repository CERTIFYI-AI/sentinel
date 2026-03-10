"""JWT refresh token handler for Sentinel.

Provides refresh token generation, validation, and rotation.
Access tokens are short-lived (15m), refresh tokens are longer (7d).
Refresh tokens are stored server-side for revocation support.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import asyncpg


@dataclass
class RefreshToken:
    """Server-side refresh token record."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = ""
    user_id: str = ""
    token_hash: str = ""
    expires_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7)
    )
    revoked: bool = False
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    user_agent: str = ""
    ip_address: str = ""


def generate_refresh_token() -> str:
    """Generate a cryptographically secure refresh token string."""
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    """Hash a refresh token for storage (never store raw tokens)."""
    return hashlib.sha256(token.encode()).hexdigest()


class RefreshTokenStore:
    """PostgreSQL-backed refresh token storage with rotation."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create(
        self,
        tenant_id: str,
        user_id: str,
        user_agent: str = "",
        ip_address: str = "",
        ttl_days: int = 7,
    ) -> str:
        """Create a new refresh token and return the raw token string."""
        raw_token = generate_refresh_token()
        token_hash = hash_token(raw_token)
        token_id = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)

        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO refresh_tokens (
                    id, tenant_id, user_id, token_hash,
                    expires_at, revoked, created_at,
                    user_agent, ip_address
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                """,
                token_id,
                tenant_id,
                user_id,
                token_hash,
                expires_at,
                False,
                datetime.now(timezone.utc),
                user_agent,
                ip_address,
            )
        return raw_token

    async def validate(self, raw_token: str) -> Optional[RefreshToken]:
        """Validate a refresh token. Returns the record if valid."""
        token_hash = hash_token(raw_token)
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM refresh_tokens
                WHERE token_hash = $1
                  AND revoked = false
                  AND expires_at > $2
                """,
                token_hash,
                datetime.now(timezone.utc),
            )
        if row is None:
            return None
        return RefreshToken(
            id=str(row["id"]),
            tenant_id=str(row["tenant_id"]),
            user_id=str(row["user_id"]),
            token_hash=row["token_hash"],
            expires_at=row["expires_at"],
            revoked=row["revoked"],
            created_at=row["created_at"],
            user_agent=row.get("user_agent", ""),
            ip_address=row.get("ip_address", ""),
        )

    async def rotate(
        self,
        old_raw_token: str,
        user_agent: str = "",
        ip_address: str = "",
    ) -> Optional[str]:
        """Rotate a refresh token: revoke old, issue new.

        Returns the new raw token or None if the old token is invalid.
        """
        record = await self.validate(old_raw_token)
        if record is None:
            return None

        # Revoke old token
        await self.revoke(old_raw_token)

        # Issue new token for the same user
        return await self.create(
            tenant_id=record.tenant_id,
            user_id=record.user_id,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    async def revoke(self, raw_token: str) -> bool:
        """Revoke a refresh token."""
        token_hash = hash_token(raw_token)
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE refresh_tokens
                SET revoked = true
                WHERE token_hash = $1 AND revoked = false
                """,
                token_hash,
            )
        return result != "UPDATE 0"

    async def revoke_all_for_user(
        self, tenant_id: str, user_id: str
    ) -> int:
        """Revoke all refresh tokens for a user (e.g. on password change)."""
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE refresh_tokens
                SET revoked = true
                WHERE tenant_id = $1 AND user_id = $2 AND revoked = false
                """,
                tenant_id,
                user_id,
            )
        count = int(result.split()[-1]) if result else 0
        return count

    async def cleanup_expired(self) -> int:
        """Remove expired tokens older than 30 days (housekeeping)."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM refresh_tokens WHERE expires_at < $1",
                cutoff,
            )
        count = int(result.split()[-1]) if result else 0
        return count
