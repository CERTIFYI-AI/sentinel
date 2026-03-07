# sentinel/api/auth_router.py
from __future__ import annotations
import hashlib, secrets, logging
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sentinel.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

class TokenRequest(BaseModel):
    api_key: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600

class RegisterRequest(BaseModel):
    email: EmailStr
    org_name: str
    plan: str = "free"

def _create_jwt(tenant_id: str, scopes: list[str]) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": tenant_id,
        "scopes": scopes,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

@router.post("/token", response_model=TokenResponse)
async def get_token(body: TokenRequest) -> TokenResponse:
    settings = get_settings()
    key_hash = hashlib.sha256(body.api_key.encode()).hexdigest()
    pool = settings.db_pool
    if pool is None:
        raise HTTPException(503, "Database unavailable")
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT tenant_id, scopes FROM api_keys WHERE key_hash = $1 AND revoked = FALSE",
            key_hash,
        )
    if not row:
        raise HTTPException(401, "Invalid API key")
    token = _create_jwt(row["tenant_id"], row["scopes"])
    return TokenResponse(access_token=token)

@router.post("/register")
async def register(body: RegisterRequest) -> dict[str, str]:
    settings = get_settings()
    pool = settings.db_pool
    if pool is None:
        raise HTTPException(503, "Database unavailable")
    tenant_id = f"tenant-{secrets.token_hex(8)}"
    raw_key = f"sk-sentinel-{secrets.token_hex(20)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:16]
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO tenants (tenant_id, name, plan) VALUES ($1, $2, $3)",
            tenant_id, body.org_name, body.plan,
        )
        await conn.execute(
            "INSERT INTO api_keys (id, tenant_id, key_hash, prefix, name, scopes) VALUES ($1, $2, $3, $4, $5, $6)",
            secrets.token_hex(16), tenant_id, key_hash, prefix, "default", ["proxy", "dashboard"],
        )
    logger.info("Registered tenant %s for %s", tenant_id, body.email)
    return {"tenant_id": tenant_id, "api_key": raw_key, "message": "Store this key securely. It will not be shown again."}
