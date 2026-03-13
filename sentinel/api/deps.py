
"""
Universal dependencies for all API routers.
Provides get_db that works with both SQLite (dev) and PostgreSQL (prod).
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sentinel.database import AsyncSessionLocal
from fastapi import Depends, HTTPException, Request
from jose import jwt, JWTError
import os

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

def get_current_user_id(request: Request) -> str:
    """Extract user ID from JWT token."""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return "anonymous"
    try:
        secret = os.environ.get("SENTINEL_SECRET_KEY", "changeme-dev-secret-key-32chars!!")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("sub") or payload.get("user_id") or "anonymous"
    except JWTError:
        return "anonymous"
