"""Middleware proxy for Certifyi Sentinel."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
import uuid
from typing import Any

import asyncpg
import litellm
import redis.asyncio as redis
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from sentinel import __version__
from sentinel.compliance.engine import ComplianceEngine
from sentinel.config import cors_config, settings
from sentinel.layers import auditor
from sentinel.layers import circuit_breaker
from sentinel.layers import sanitizer
from sentinel.models import TenantConfig, AuditEntryInput, InterventionLevel
from sentinel.observability.metrics import metrics_collector
from sentinel.storage import tenant_store

logger = logging.getLogger(__name__)
_bearer = HTTPBearer()


def _sha256(text: str) -> str:
    """Return hex SHA-256 digest of *text*."""
    return hashlib.sha256(text.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_db() -> asyncpg.Connection:  # pragma: no cover
    """Yield a DB connection from the pool."""
    conn = await asyncpg.connect(str(settings.database_url))
    try:
        yield conn
    finally:
        await conn.close()


async def _record_model_metric(
    org_id_text: str,
    model_name: str,
    latency_ms: float,
    cost_usd: float,
) -> None:  # pragma: no cover
    """Best-effort per-inference telemetry → ``model_performance_metrics``.

    Runs as a background task after the response is sent and opens its own
    connection (the request-scoped one is already closed by then). Fully
    guarded: any failure is swallowed so telemetry can never affect request
    handling. Rows are keyed by the model name and the tenant's org id; the
    Model Detail dashboard reads them by registry id OR model name.
    """
    try:
        try:
            org_uuid = str(uuid.UUID(str(org_id_text)))
        except (ValueError, TypeError):
            return  # tenant is not an org uuid — nothing to attribute the row to
        conn = await asyncpg.connect(str(settings.database_url))
        try:
            await conn.execute(
                """
                INSERT INTO model_performance_metrics
                    (org_id, model_id, model_name, recorded_at,
                     latency_p99, cost_per_inference, request_count)
                VALUES ($1::uuid, $2, $3, now(), $4, $5, 1)
                """,
                org_uuid,
                str(model_name),
                str(model_name),
                float(latency_ms),
                float(cost_usd or 0.0),
            )
        finally:
            await conn.close()
    except Exception:  # noqa: BLE001
        logger.debug("model metric emit skipped", exc_info=True)


def _get_redis_client() -> redis.Redis | None:
    """Return a Redis async client, or None if not configured."""
    if not settings.redis_url:
        return None
    try:
        client = redis.from_url(
            str(settings.redis_url),
            socket_connect_timeout=2,
            decode_responses=True,
        )
        return client
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis unavailable: %s", exc)
        return None


async def _check_rate_limit(
    tenant_id: str,
    redis_client: redis.Redis | None,
) -> bool:
    """
    Returns True if the request is allowed, False if rate limited.
    Uses a 60-second sliding window.
    Falls back to allow-all if Redis is unavailable.
    """
    if redis_client is None:
        return True
    key = f"sentinel:ratelimit:{tenant_id}"
    pipe = redis_client.pipeline()
    now = time.time()
    window_start = now - 60
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, 60)
    results = await pipe.execute()
    request_count = results[2]
    limit = getattr(settings, "RATE_LIMIT_PER_MINUTE", 1000)
    return request_count <= limit


async def _resolve_tenant(
    credentials: HTTPAuthorizationCredentials,
    db: asyncpg.Connection,
) -> TenantConfig:
    """
    Decodes the Bearer JWT, verifies against SECRET_KEY, checks expiry,
    then loads TenantConfig from tenants table.
    Raises HTTP 401 on any failure.
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=["HS256"],
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    tenant_id: str | None = payload.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Missing tenant_id claim")
    config = await tenant_store.get_config(db, tenant_id)
    if config is None:
        raise HTTPException(status_code=401, detail="Unknown tenant")
    return config


async def _call_llm_provider(
    body: dict[str, Any],
    tenant: TenantConfig,
) -> dict[str, Any]:
    """
    Routes the request to the correct LLM provider based on tenant.primary_model.
    Uses LiteLLM for provider abstraction so the same code handles OpenAI,
    Anthropic, and local models.
    """
    response = await litellm.acompletion(
        model=tenant.primary_model,
        messages=body["messages"],
        temperature=body.get("temperature", 0.7),
        max_tokens=body.get("max_tokens", 2048),
        stream=body.get("stream", False),
    )
    return response


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    app = FastAPI(
        title="Certifyi Sentinel",
        version=__version__,
        docs_url="/docs",
    )
    app.add_middleware(CORSMiddleware, **cors_config())
        # Mount routers
    from sentinel.api.policy_router import router as policy_router
    from sentinel.api.auth_router import router as auth_router  # noqa: PLC0415
    from sentinel.api.dashboard_router import router as dashboard_router  # noqa: PLC0415
    from sentinel.api.compliance_router import router as compliance_router  # noqa: PLC0415
    from sentinel.api.approval_router import router as approval_router  # noqa: PLC0415
    from sentinel.api.audit_log_router import router as audit_log_router  # noqa: PLC0415
    from sentinel.api.ciso_router import router as ciso_router  # noqa: PLC0415
    from sentinel.api.evals_router import router as evals_router  # noqa: PLC0415
    from sentinel.api.events_router import router as events_router  # noqa: PLC0415
    from sentinel.api.health_router import router as health_router  # noqa: PLC0415
    from sentinel.api.security_router import router as security_router  # noqa: PLC0415
    from sentinel.api.tasks_router import router as tasks_router  # noqa: PLC0415
    from sentinel.api.notifications_router import router as notifications_router  # noqa: PLC0415
    from sentinel.hitl.dashboard_router import hitl_router  # noqa: PLC0415

    app.include_router(auth_router)
    app.include_router(policy_router, prefix="/api/v1/policies", tags=["policies"])
    app.include_router(dashboard_router, prefix="/dashboard")
    app.include_router(compliance_router)
    app.include_router(approval_router)
    app.include_router(audit_log_router, prefix="/audit")
    app.include_router(ciso_router)
    app.include_router(evals_router, prefix="/evals")
    app.include_router(events_router)
    app.include_router(health_router)
    app.include_router(security_router)
    app.include_router(tasks_router, prefix="/tasks")
    app.include_router(notifications_router, prefix="/notifications")
    app.include_router(hitl_router)
    import os
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
    if os.path.isdir(static_dir):
        app.mount('/assets', StaticFiles(directory=os.path.join(static_dir, 'assets')), name='static-assets')
        @app.get('/{full_path:path}')
        async def serve_spa(full_path: str):
            index = os.path.join(static_dir, 'index.html')
            if os.path.isfile(index):
                return FileResponse(index)
            return {"detail": "Not Found"}

    return app


app = create_app()
_redis_client: redis.Redis | None = _get_redis_client()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.get("/metrics", response_class=PlainTextResponse)
async def get_metrics() -> PlainTextResponse:
    """Prometheus metrics endpoint. No auth required."""
    return PlainTextResponse(
        content=metrics_collector.export(),
        media_type="text/plain; version=0.0.4",
    )


@app.get("/v1/models")
async def list_models(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: asyncpg.Connection = Depends(_get_db),
) -> dict[str, Any]:
    """OpenAI-compatible model listing endpoint."""
    tenant = await _resolve_tenant(credentials, db)
    providers = getattr(tenant, "config", None)
    models = []
    if providers and hasattr(providers, "providers"):
        for p in providers.providers:
            models.append({"id": p.primary_model, "object": "model", "owned_by": p.primary_name})
            if p.fallback_model:
                models.append({"id": p.fallback_model, "object": "model", "owned_by": p.fallback_name})
    return {"object": "list", "data": models}


@app.post("/v1/chat/completions")
async def chat_completions(
    request_body: dict[str, Any],
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: asyncpg.Connection = Depends(_get_db),
) -> dict[str, Any]:
    """Main proxy endpoint. Validates tenant, sanitizes, routes to LLM."""
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    def elapsed_ms() -> float:
        return (time.perf_counter() - start_time) * 1000

    # 1. Resolve tenant from JWT
    tenant = await _resolve_tenant(credentials, db)

    # 2. Rate limit
    allowed = await _check_rate_limit(tenant.tenant_id, _redis_client)
    if not allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    body = dict(request_body)
    original_prompt: str = body.get("messages", [{}])[-1].get("content", "")

    # 3. Sanitize prompt — strip PII before any logging or LLM call
    sanitization = await sanitizer.sanitize(original_prompt, tenant)
    if sanitization.blocked:
        # Log blocked request to audit chain before returning 400.
        background_tasks.add_task(
            auditor.log,
            AuditEntryInput(
                tenant_id=tenant.tenant_id,
                request_id=request_id,
                prompt_hash=_sha256(original_prompt),
                response_hash=_sha256("[BLOCKED: injection detected]"),
                trust_score=0.0,
                intervention_level=int(InterventionLevel.BLOCKED) if hasattr(InterventionLevel, "BLOCKED") else 3,
                cost_usd=0.0,
                latency_ms=elapsed_ms(),
            ),
        )
        raise HTTPException(
            status_code=400,
            detail={
                "error": sanitization.block_reason,
                "code": "INJECTION_DETECTED",
            },
        )

    # Replace the last user message with the sanitized version.
    body["messages"][-1]["content"] = sanitization.sanitized_text

    # 4. Circuit breaker / provider routing
    try:
        circuit_result = await circuit_breaker.circuit_breaker.call(
            body=body,
            tenant=tenant,
            call_provider=_call_llm_provider,
        )
    except Exception as exc:  # noqa: BLE001
        background_tasks.add_task(
            auditor.log,
            AuditEntryInput(
                tenant_id=tenant.tenant_id,
                request_id=request_id,
                prompt_hash=_sha256(original_prompt),
                response_hash=_sha256(f"[ERROR: {type(exc).__name__}]"),
                trust_score=0.0,
                intervention_level=3,
                cost_usd=0.0,
                latency_ms=elapsed_ms(),
            ),
        )
        raise HTTPException(status_code=502, detail="Upstream provider error") from exc

    pipeline_result = circuit_result

    # 5. Audit — append-only hash chain entry
    audit_entry = AuditEntryInput(
        tenant_id=tenant.tenant_id,
        request_id=request_id,
        prompt_hash=_sha256(original_prompt),
        response_hash=_sha256(str(pipeline_result)),
        trust_score=getattr(pipeline_result, "trust_score", 1.0),
        intervention_level=int(
            getattr(pipeline_result, "intervention_level", InterventionLevel.NONE)
        ),
        cost_usd=getattr(pipeline_result, "cost_usd", 0.0),
        latency_ms=elapsed_ms(),
    )
    background_tasks.add_task(auditor.log, audit_entry)

    # 6. Compliance evaluation — runs after audit entry is written
    background_tasks.add_task(
        ComplianceEngine.evaluate,
        audit_entry,
        pipeline_result,
        tenant,
    )

    # 7. Metrics
    metrics_collector.increment_requests(
        tenant_id=tenant.tenant_id,
        model=body.get("model", tenant.primary_model),
        intervention=getattr(
            getattr(pipeline_result, "intervention_level", InterventionLevel.NONE),
            "value",
            "none",
        ),
    )

    # 7b. Per-inference telemetry → model_performance_metrics (best-effort,
    # background). Feeds the Model Detail "Performance" tab in real time.
    background_tasks.add_task(
        _record_model_metric,
        tenant.tenant_id,
        body.get("model", tenant.primary_model),
        elapsed_ms(),
        getattr(pipeline_result, "cost_usd", 0.0),
    )

    return circuit_result
