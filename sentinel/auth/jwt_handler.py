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