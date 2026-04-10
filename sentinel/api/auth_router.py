# sentinel/api/auth_router.py
from __future__ import annotations

import hashlib
import logging
import secrets
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional

import asyncpg
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, field_validator

from sentinel.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])
_bearer = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Rate limiter (in-memory sliding window, no Redis dependency)
# ---------------------------------------------------------------------------
_login_attempts: dict[str, deque] = defaultdict(lambda: deque(maxlen=20))
_RATE_LIMIT_MAX = 10
_RATE_LIMIT_WINDOW = 60  # seconds


def _check_login_rate(ip: str) -> None:
    now = time.time()
    window = _login_attempts[ip]
    # purge old entries
    while window and window[0] < now - _RATE_LIMIT_WINDOW:
        window.popleft()
    if len(window) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts \u2014 try again in 60 seconds",
            headers={"Retry-After": str(_RATE_LIMIT_WINDOW)},
        )
    window.append(now)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    organization_name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


class TokenRequest(BaseModel):
    api_key: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def _create_jwt(user_id: str, email: str, role: str, tenant_id: str) -> tuple[str, str]:
    settings = settings
    now = datetime.now(timezone.utc)
    access_payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "iat": now,
        "exp": now + timedelta(hours=1),
        "type": "access",
    }
    refresh_payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "iat": now,
        "exp": now + timedelta(days=7),
        "type": "refresh",
    }
    key = getattr(settings, "SECRET_KEY", getattr(settings, "secret_key", "dev-secret"))
    access = jwt.encode(access_payload, key, algorithm="HS256")
    refresh = jwt.encode(refresh_payload, key, algorithm="HS256")
    return access, refresh


async def _get_db():
    settings = settings
    pool = getattr(settings, "db_pool", None)
    if pool is None:
        raise HTTPException(503, "Database unavailable")
    async with pool.acquire() as conn:
        yield conn


async def _get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
):
    if credentials is None:
        raise HTTPException(401, "Not authenticated")
    settings = settings
    key = getattr(settings, "SECRET_KEY", getattr(settings, "secret_key", "dev-secret"))
    try:
        payload = jwt.decode(credentials.credentials, key, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token type")
    return {
        "id": payload["sub"],
        "email": payload.get("email", ""),
        "role": payload.get("role", "viewer"),
        "tenant_id": payload.get("tenant_id", ""),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: asyncpg.Connection = Depends(_get_db),
) -> TokenResponse:
    ip = request.client.host if request.client else "unknown"
    _check_login_rate(ip)

    row = await db.fetchrow(
        "SELECT id, email, password_hash, password_salt, role, tenant_id FROM users WHERE email = $1",
        body.email,
    )
    if not row:
        raise HTTPException(401, "Invalid email or password")

    expected = _hash_password(body.password, row["password_salt"])
    if not secrets.compare_digest(expected, row["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    access, refresh = _create_jwt(
        str(row["id"]), row["email"], row["role"], row["tenant_id"]
    )
    user = {
        "id": str(row["id"]),
        "email": row["email"],
        "role": row["role"],
        "tenant_id": row["tenant_id"],
    }
    return TokenResponse(access_token=access, refresh_token=refresh, user=user)


@router.post("/register", response_model=TokenResponse)
async def register(
    body: RegisterRequest,
    db: asyncpg.Connection = Depends(_get_db),
) -> TokenResponse:
    existing = await db.fetchval(
        "SELECT 1 FROM users WHERE email = $1", body.email
    )
    if existing:
        raise HTTPException(409, "An account with this email already exists")

    tenant_id = f"tenant-{secrets.token_hex(8)}"
    user_id = str(uuid.uuid4())
    salt = secrets.token_hex(16)
    password_hash = _hash_password(body.password, salt)

    await db.execute(
        "INSERT INTO tenants (tenant_id, name, plan) VALUES ($1, $2, $3)",
        tenant_id, body.organization_name, "free",
    )
    await db.execute(
        """INSERT INTO users (id, email, password_hash, password_salt, role, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        user_id, body.email, password_hash, salt, "admin", tenant_id,
    )

    # Post-signup side effects (non-blocking)
    import asyncio
    try:
        from sentinel.events.emitters import (
            create_default_tenant_settings,
            seed_default_frameworks,
            create_welcome_notification,
        )
        asyncio.create_task(create_default_tenant_settings(tenant_id, db))
        asyncio.create_task(seed_default_frameworks(tenant_id, db))
        asyncio.create_task(create_welcome_notification(user_id, tenant_id, db))
    except ImportError:
        logger.warning("emitters module not available for post-signup tasks")

    access, refresh = _create_jwt(user_id, body.email, "admin", tenant_id)
    user = {
        "id": user_id,
        "email": body.email,
        "role": "admin",
        "tenant_id": tenant_id,
    }
    return TokenResponse(access_token=access, refresh_token=refresh, user=user)


@router.post("/refresh")
async def refresh_token(
    body: dict,
) -> dict:
    settings = settings
    key = getattr(settings, "SECRET_KEY", getattr(settings, "secret_key", "dev-secret"))
    token = body.get("refresh_token", "")
    try:
        payload = jwt.decode(token, key, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    access, refresh = _create_jwt(
        payload["sub"], payload.get("email", ""),
        payload.get("role", "viewer"), payload["tenant_id"]
    )
    return {"access_token": access, "refresh_token": refresh}


@router.get("/me")
async def get_me(
    user: dict = Depends(_get_current_user),
) -> dict:
    return user


@router.post("/token")
async def get_token(body: TokenRequest, db: asyncpg.Connection = Depends(_get_db)) -> dict:
    key_hash = hashlib.sha256(body.api_key.encode()).hexdigest()
    row = await db.fetchrow(
        "SELECT tenant_id, scopes FROM api_keys WHERE key_hash = $1 AND revoked = FALSE",
        key_hash,
    )
    if not row:
        raise HTTPException(401, "Invalid API key")
    access, refresh = _create_jwt(
        row["tenant_id"], "", "api", row["tenant_id"]
    )
    return {"access_token": access, "token_type": "bearer", "expires_in": 3600}
