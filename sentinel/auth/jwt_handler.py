"""JWT authentication handler."""
from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from sentinel.config import settings
from sentinel.models import TenantConfig

_bearer = HTTPBearer()


async def get_current_tenant(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> TenantConfig:
    """Decode JWT and return the authenticated tenant."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    tenant_id: str | None = payload.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Missing tenant_id")
    return TenantConfig(tenant_id=tenant_id, primary_model=payload.get("model", "gpt-4o"))


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Decode JWT and return the current user record from Supabase users table."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    user_id: str | None = payload.get("user_id") or payload.get("sub")
    tenant_id: str | None = payload.get("tenant_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user_id in token")
    return {
        "user_id": user_id,
        "tenant_id": tenant_id or "",
        "email": payload.get("email", ""),
        "role": payload.get("role", "viewer"),
    }


def create_access_token(data: dict, expires_delta: int = 3600) -> str:
    """Create a JWT access token."""
    import time
    to_encode = data.copy()
    to_encode["exp"] = int(time.time()) + expires_delta
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
