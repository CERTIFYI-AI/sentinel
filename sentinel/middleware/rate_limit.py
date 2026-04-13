"""
Rate limiting middleware for Sentinel AI GRC API.

Configures per-route rate limits using SlowAPI backed by Redis.
All limits are enforced per client IP address.

Rate limit tiers:
  - Global: 200 requests/minute
  - Authentication routes (/api/auth/*): 10 requests/minute
  - Admin routes (/api/admin/*): 50 requests/minute
"""
from __future__ import annotations

import logging
import os
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

_MAX_REQUEST_SIZE_MB: int = int(os.environ.get("MAX_REQUEST_SIZE_MB", "10"))
_MAX_REQUEST_SIZE_BYTES: int = _MAX_REQUEST_SIZE_MB * 1024 * 1024


def _get_client_ip(request: Request) -> str:
    """Extract the client IP from a request, respecting reverse proxy headers.

    Args:
        request: The incoming FastAPI request.

    Returns:
        The client IP address string.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=_get_client_ip,
    default_limits=["200/minute"],
    storage_uri=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose body exceeds the configured size limit.

    Protects against request-flooding and memory exhaustion attacks by
    returning HTTP 413 before the request body is read into application memory.

    Args:
        app: The ASGI application to wrap.
        max_bytes: Maximum accepted content-length in bytes.
    """

    def __init__(self, app: ASGIApp, max_bytes: int = _MAX_REQUEST_SIZE_BYTES) -> None:
        super().__init__(app)
        self._max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Enforce the request size limit before delegating to the next handler.

        Args:
            request: The incoming request.
            call_next: The next middleware or route handler.

        Returns:
            The response from downstream handlers, or HTTP 413 if size exceeded.
        """
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self._max_bytes:
            logger.warning(
                "Request rejected: content-length %s exceeds limit %d bytes",
                content_length,
                self._max_bytes,
            )
            return JSONResponse(
                status_code=413,
                content={
                    "error": "request_too_large",
                    "message": f"Request body must not exceed {_MAX_REQUEST_SIZE_MB}MB.",
                },
            )
        return await call_next(request)


def _rate_limit_json_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a structured JSON error for rate-limited requests.

    Replaces SlowAPI default HTML error page with a machine-readable response
    and sets standard rate-limit headers.

    Args:
        request: The rate-limited request.
        exc: The RateLimitExceeded exception containing limit metadata.

    Returns:
        A 429 JSONResponse with rate-limit headers.
    """
    retry_after: int = getattr(exc, "retry_after", 60)
    response = JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after": retry_after,
        },
    )
    response.headers["Retry-After"] = str(retry_after)
    response.headers["X-RateLimit-Limit"] = str(getattr(exc, "limit", ""))
    response.headers["X-RateLimit-Remaining"] = "0"
    response.headers["X-RateLimit-Reset"] = str(retry_after)
    return response


def register_rate_limiting(app: FastAPI) -> None:
    """Attach rate limiting and request size middleware to a FastAPI application.

    Must be called during application factory setup, before any route handlers
    are invoked.

    Args:
        app: The FastAPI application instance to configure.
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_json_handler)  # type: ignore[arg-type]
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(RequestSizeLimitMiddleware, max_bytes=_MAX_REQUEST_SIZE_BYTES)
    logger.info(
        "Rate limiting enabled: global=200/min, auth=10/min, admin=50/min; "
        "max request size=%dMB",
        _MAX_REQUEST_SIZE_MB,
    )


# Convenience decorators for route-level overrides
auth_limit = limiter.limit("10/minute")
admin_limit = limiter.limit("50/minute")
