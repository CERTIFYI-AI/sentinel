
"""
Universal dependencies for all API routers.
Provides get_db that works with both SQLite (dev) and PostgreSQL (prod),
and get_current_user_id which enforces JWT authentication.
"""
import logging
import os
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, Request, status
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Fallback used ONLY when an explicit dev flag is set (SENTINEL_DEV=1 or
# DEBUG=1). In every other environment a real secret MUST be configured or
# the app refuses to start.
_DEV_FALLBACK_SECRET = "changeme-dev-secret-key-32chars!!"


def _is_dev_mode() -> bool:
    """Explicit opt-in dev mode: SENTINEL_DEV=1 or DEBUG=1."""
    for var in ("SENTINEL_DEV", "DEBUG"):
        if os.environ.get(var, "").strip().lower() in ("1", "true", "yes", "on"):
            return True
    return False


def _resolve_secret_key() -> str:
    """Resolve the JWT signing secret from settings/env.

    Order: SENTINEL_SECRET_KEY / SECRET_KEY env vars, then
    sentinel.config settings (which itself loads from env/.env). If no
    secret is configured, fail fast at import/startup — unless an explicit
    dev flag (SENTINEL_DEV=1 / DEBUG=1) is set, in which case a fixed dev
    fallback is used.
    """
    secret = (
        os.environ.get("SENTINEL_SECRET_KEY", "").strip()
        or os.environ.get("SECRET_KEY", "").strip()
    )
    if secret:
        return secret

    try:  # settings may load a secret from a .env file
        from sentinel.config import settings  # noqa: PLC0415

        configured = getattr(settings, "secret_key", None) or getattr(
            settings, "SECRET_KEY", None
        )
        if configured:
            return str(configured)
    except Exception:  # pragma: no cover - settings unavailable/invalid
        pass

    if _is_dev_mode():
        logger.warning(
            "SENTINEL_SECRET_KEY not set — using the built-in DEV fallback "
            "secret because SENTINEL_DEV/DEBUG is enabled. Never use this "
            "in production."
        )
        return _DEV_FALLBACK_SECRET

    raise RuntimeError(
        "SENTINEL_SECRET_KEY (or SECRET_KEY) is not configured. Refusing to "
        "start with an insecure default JWT secret. Set the env var, or set "
        "SENTINEL_DEV=1 explicitly for local development."
    )


# Fail fast: resolved at import time so a misconfigured deployment never
# serves traffic with a known/hardcoded secret.
_SECRET_KEY: str = _resolve_secret_key()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""
    # Imported lazily so importing deps (and its fail-fast secret check)
    # does not require the full settings/database stack at import time.
    from sentinel.database import AsyncSessionLocal  # noqa: PLC0415

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_current_user_id(request: Request) -> str:
    """Extract and verify the user ID from the request's Bearer JWT.

    Raises HTTP 401 when the token is missing, invalid, expired, or does
    not carry a subject claim. Never falls back to an anonymous identity.
    """
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else ""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, _SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has no subject",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return str(user_id)
