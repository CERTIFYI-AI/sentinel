
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


def decode_request_claims(request: Request) -> dict | None:
    """Best-effort decode of the request's Bearer JWT into its claims.

    Returns the verified claim dict, or None when no valid token is present.
    Never raises — callers that require auth use get_current_user_id; this is
    for the middleware to populate request.state.user for tenant scoping.
    """
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else ""
    if not token:
        return None
    try:
        return jwt.decode(token, _SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None


def get_current_tenant_id(request: Request) -> str:
    """The caller's tenant_id, from the verified JWT. 401 if absent.

    This is the authoritative tenant for isolation — resolved from the signed
    token, never from the request body or a header. A token that carries no
    tenant is rejected rather than silently falling back to a shared tenant
    (which is how the backend leaked across tenants before).
    """
    # Prefer what the auth middleware already put on the request; fall back to
    # decoding directly so the dependency is usable without the middleware.
    user = getattr(request.state, "user", None)
    tenant = None
    if isinstance(user, dict):
        tenant = user.get("tenant_id") or user.get("org_id")
    if not tenant:
        claims = decode_request_claims(request)
        if claims:
            tenant = claims.get("tenant_id") or claims.get("org_id")
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has no tenant",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return str(tenant)


def get_current_user(request: Request) -> dict:
    """The caller's identity claims from the verified JWT (id, tenant_id, role,
    email). 401 if no valid token. Used where a router needs the role as well
    as the tenant (e.g. RBAC administration)."""
    user = getattr(request.state, "user", None)
    if isinstance(user, dict) and user.get("id"):
        return user
    claims = decode_request_claims(request)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "id": claims.get("sub") or claims.get("user_id"),
        "tenant_id": claims.get("tenant_id") or claims.get("org_id"),
        "role": claims.get("role", "viewer"),
        "email": claims.get("email", ""),
    }
