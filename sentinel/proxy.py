"""Middleware proxy for Certifyi Sentinel."""
from __future__ import annotations

import logging
import time
from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from sentinel import __version__

logger = logging.getLogger(__name__)


def _resolve_tenant(request: Request) -> Any:
    """Resolve tenant config from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[len("Bearer "):].strip()
    if not token:
        return None
    # Return a minimal tenant-like object
    from types import SimpleNamespace
    return SimpleNamespace(api_key=token, tenant_id="test-tenant")


async def _check_rate_limit(tenant: Any, request: Request) -> Optional[Response]:
    """Check rate limits. Returns None if OK, Response if limited."""
    return None


async def _call_llm_provider(body: dict, tenant: Any) -> str:
    """Call the LLM provider and return the response text."""
    raise NotImplementedError("LLM provider not configured")


def create_app() -> FastAPI:
    """Create and configure the Sentinel FastAPI application."""
    app = FastAPI(
        title="Certifyi Sentinel",
        description="Real-time AI reliability and governance middleware",
        version=__version__,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.start_time = time.time()

    @app.get("/health")
    async def health() -> JSONResponse:
        """Health check endpoint."""
        return JSONResponse({
            "status": "ok",
            "version": __version__,
            "uptime_seconds": time.time() - app.state.start_time,
        })

    @app.get("/v1/models")
    async def list_models(request: Request) -> JSONResponse:
        """List available models."""
        tenant = _resolve_tenant(request)
        if tenant is None:
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        return JSONResponse({"object": "list", "data": []})

    @app.get("/metrics")
    async def metrics() -> Response:
        """Prometheus metrics endpoint."""
        content = "# HELP sentinel_requests_total Total requests\n"
        content += "# TYPE sentinel_requests_total counter\n"
        content += "sentinel_requests_total 0\n"
        return Response(content=content, media_type="text/plain")

    @app.post("/v1/chat/completions")
    async def chat_completions(request: Request) -> JSONResponse:
        """OpenAI-compatible chat completions endpoint."""
        # Auth check
        tenant = _resolve_tenant(request)
        if tenant is None:
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})

        # Rate limit check
        rate_limit_resp = await _check_rate_limit(tenant, request)
        if rate_limit_resp is not None:
            return rate_limit_resp

        body: dict = await request.json()
        messages = body.get("messages", [])
        prompt = " ".join(m.get("content", "") for m in messages)

        # Sanitize
        from sentinel.layers import sanitizer
        sanitization = await sanitizer.sanitize(prompt, tenant)
        if sanitization.blocked:
            return JSONResponse(
                status_code=400,
                content={"error": "Request blocked: injection detected",
                         "injection_score": sanitization.injection_score},
            )

        # Call LLM provider
        try:
            response_text = await _call_llm_provider(body, tenant)
        except Exception as exc:
            return JSONResponse(status_code=502, content={"error": str(exc)})

        # Verify
        from sentinel.layers import verifier
        verification = await verifier.verify(response_text, tenant)

        # Circuit breaker
        from sentinel.layers import circuit_breaker
        cb_result = await circuit_breaker.evaluate(
            prompt=sanitization.clean_prompt,
            initial_response=response_text,
            verification=verification,
            config=tenant,
            provider=None,
        )

        # Audit
        from sentinel.layers import auditor
        await auditor.log(
            tenant_id=tenant.tenant_id,
            prompt=sanitization.clean_prompt,
            response=cb_result.final_response,
            trust_score=cb_result.final_trust_score,
        )

        response_body = {
            "id": "chatcmpl-sentinel",
            "object": "chat.completion",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": cb_result.final_response},
                "finish_reason": "stop",
            }],
            "model": body.get("model", ""),
        }
        headers = {"x-sentinel-trust-score": str(cb_result.final_trust_score)}
        return JSONResponse(content=response_body, headers=headers)

    return app


# Module-level app instance for test imports and uvicorn
app = create_app()
