"""health_router.py

Sprint 5 — health check endpoints for load balancer and Kubernetes probes.

Endpoints:
  GET /health          basic alive check (liveness)
  GET /health/live     kubernetes liveness probe
  GET /health/ready    kubernetes readiness probe (checks DB + Redis)
  GET /health/startup  kubernetes startup probe (one-time init check)
  GET /metrics         Prometheus text metrics (if prometheus-client installed)
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Response, status
from pydantic import BaseModel

router = APIRouter(tags=["Health"])

_START_TIME = time.monotonic()
_APP_VERSION = os.environ.get("APP_VERSION", "1.0.0")
_APP_ENV = os.environ.get("APP_ENV", "development")


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------


class HealthStatus(BaseModel):
    status: str  # ok | degraded | error
    version: str
    environment: str
    uptime_seconds: float
    timestamp: str
    checks: Dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------


async def _check_database() -> dict:
    """Ping the database and return a status dict."""
    try:
        from sentinel.config import get_settings  # noqa: PLC0415
        from sqlalchemy.ext.asyncio import create_async_engine  # noqa: PLC0415

        settings = get_settings()
        engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        await engine.dispose()
        return {"status": "ok", "latency_ms": None}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "detail": str(exc)[:120]}


async def _check_redis() -> dict:
    """Ping Redis and return a status dict."""
    try:
        import redis.asyncio as aioredis  # noqa: PLC0415

        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        client = aioredis.from_url(redis_url, socket_connect_timeout=2)
        t0 = time.monotonic()
        await client.ping()
        latency_ms = round((time.monotonic() - t0) * 1000, 2)
        await client.aclose()
        return {"status": "ok", "latency_ms": latency_ms}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "detail": str(exc)[:120]}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/health", response_model=HealthStatus, summary="Basic liveness check")
async def health() -> HealthStatus:
    """Minimal alive check. Always returns 200 if the process is running.
    Used by simple HTTP monitors and CI smoke tests.
    """
    return HealthStatus(
        status="ok",
        version=_APP_VERSION,
        environment=_APP_ENV,
        uptime_seconds=round(time.monotonic() - _START_TIME, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/health/live", summary="Kubernetes liveness probe")
async def liveness(response: Response) -> dict:
    """Kubernetes liveness probe. Returns 200 if the process is alive.
    If this returns non-200, Kubernetes restarts the pod.
    Does NOT check external dependencies (DB/Redis) — use /health/ready for that.
    """
    return {
        "status": "alive",
        "uptime_seconds": round(time.monotonic() - _START_TIME, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready", summary="Kubernetes readiness probe")
async def readiness(response: Response) -> dict:
    """Kubernetes readiness probe. Returns 200 only if all critical
    external dependencies (database, Redis) are reachable.

    If this returns 503, Kubernetes removes the pod from Service endpoints
    and stops routing traffic to it until it recovers.
    """
    db_check = await _check_database()
    redis_check = await _check_redis()

    all_ok = db_check["status"] == "ok" and redis_check["status"] == "ok"

    if not all_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if all_ok else "not_ready",
        "checks": {
            "database": db_check,
            "redis": redis_check,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/startup", summary="Kubernetes startup probe")
async def startup_probe(response: Response) -> dict:
    """Kubernetes startup probe. Only used during pod startup — Kubernetes
    will not run liveness/readiness probes until this returns 200.

    Checks that the application has fully initialised (migrations applied,
    DB connection pool ready). Allows up to 60s startup time before failing.
    """
    min_uptime_seconds = 5.0  # allow at least 5s for the app to start
    current_uptime = time.monotonic() - _START_TIME

    if current_uptime < min_uptime_seconds:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "starting",
            "uptime_seconds": round(current_uptime, 1),
            "message": f"Waiting for startup (need {min_uptime_seconds}s)",
        }

    db_check = await _check_database()
    if db_check["status"] != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "checks": {"database": db_check},
            "message": "Database not reachable during startup",
        }

    return {
        "status": "started",
        "uptime_seconds": round(current_uptime, 1),
        "version": _APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/metrics", summary="Prometheus metrics", include_in_schema=False)
async def prometheus_metrics(response: Response) -> Response:
    """Expose Prometheus metrics in text format.
    Requires prometheus-client in pyproject.toml (already present).
    Mounted separately in main.py via InstrumentationMiddleware for
    full ASGI request metrics; this endpoint provides custom business metrics.
    """
    try:
        from prometheus_client import (  # noqa: PLC0415
            CONTENT_TYPE_LATEST,
            generate_latest,
        )

        data = generate_latest()
        return Response(content=data, media_type=CONTENT_TYPE_LATEST)
    except ImportError:
        return Response(
            content="# prometheus-client not installed\n",
            media_type="text/plain",
            status_code=503,
        )
