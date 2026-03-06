"""Middleware proxy for Certifyi Sentinel.

Implements an ASGI application (FastAPI) that sits between callers
and upstream LLM providers, applying policy checks, fact-checking,
and audit logging to every request/response.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sentinel.audit import AuditLogger
from sentinel.checker import FactChecker
from sentinel.config import SentinelConfig, load_config
from sentinel.models import (
    AuditEvent,
    AuditEventType,
    HealthStatus,
    LLMMessage,
    LLMRequest,
    LLMResponse,
    PolicyAction,
)
from sentinel.rules import PolicyEngine

logger = logging.getLogger(__name__)


def create_app(config: Optional[SentinelConfig] = None) -> FastAPI:
    """Create and configure the Sentinel FastAPI application."""
    if config is None:
        config = load_config()

    # config is now guaranteed to be SentinelConfig
    assert config is not None
    cfg: SentinelConfig = config

    app = FastAPI(
        title="Certifyi Sentinel",
        description="Real-time AI reliability and governance middleware",
        version="0.1.0",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.proxy.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Shared state
    app.state.config = cfg
    app.state.policy_engine = PolicyEngine(cfg.policy)
    app.state.fact_checker = FactChecker(cfg.fact_check)
    app.state.audit_logger = AuditLogger(cfg.audit)
    app.state.start_time = time.time()
    app.state.http_client = httpx.AsyncClient(timeout=cfg.proxy.timeout)

    # -------------------------------------------------------------------
    # Routes
    # -------------------------------------------------------------------

    @app.get("/health")
    async def health() -> HealthStatus:
        """Health check endpoint."""
        from sentinel import __version__

        return HealthStatus(
            status="healthy",
            version=__version__,
            uptime_seconds=time.time() - app.state.start_time,
            checks={
                "providers": len(cfg.providers) > 0,
                "audit": app.state.audit_logger.is_healthy(),
            },
        )

    @app.post("/v1/chat/completions")
    async def chat_completions(request: Request) -> JSONResponse:
        """OpenAI-compatible chat completions endpoint."""
        body: Dict[str, Any] = await request.json()
        start = time.time()

        # Build internal request model
        messages = [
            LLMMessage(role=m["role"], content=m["content"])
            for m in body.get("messages", [])
        ]
        llm_request = LLMRequest(
            provider=body.get("provider", ""),
            model=body.get("model", ""),
            messages=messages,
            temperature=body.get("temperature", 0.7),
            max_tokens=body.get("max_tokens"),
            stream=body.get("stream", False),
        )

        # Audit: request received
        await app.state.audit_logger.log(
            AuditEvent(
                event_type=AuditEventType.REQUEST_RECEIVED,
                tenant_id=llm_request.tenant_id,
                request_id=llm_request.request_id,
                data={"model": llm_request.model, "provider": llm_request.provider},
            )
        )

        # Pre-request policy check
        policy_result = await app.state.policy_engine.evaluate_request(llm_request)
        await app.state.audit_logger.log(
            AuditEvent(
                event_type=AuditEventType.POLICY_EVALUATED,
                tenant_id=llm_request.tenant_id,
                request_id=llm_request.request_id,
                policy_result=policy_result.model_dump() if policy_result else None,
            )
        )

        if policy_result.action == PolicyAction.BLOCK:
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Request blocked by policy",
                    "violations": [
                        v.model_dump() for v in policy_result.violations
                    ],
                },
            )

        # Forward to upstream provider
        try:
            upstream_response = await _forward_to_provider(
                app.state.http_client, cfg, llm_request
            )
        except Exception as exc:
            await app.state.audit_logger.log(
                AuditEvent(
                    event_type=AuditEventType.ERROR_OCCURRED,
                    tenant_id=llm_request.tenant_id,
                    request_id=llm_request.request_id,
                    error=str(exc),
                )
            )
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        response_content = (
            upstream_response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        llm_response = LLMResponse(
            content=response_content,
            model=llm_request.model,
            provider_id=llm_request.provider,
            latency_ms=(time.time() - start) * 1000,
        )

        # Post-response policy check
        post_policy = await app.state.policy_engine.evaluate_response(
            llm_request, llm_response
        )
        if post_policy.action == PolicyAction.MODIFY and post_policy.modified_content:
            upstream_response["choices"][0]["message"]["content"] = (
                post_policy.modified_content
            )

        # Fact-check
        if cfg.fact_check.enabled:
            fc_result = await app.state.fact_checker.check(llm_response.content)
            await app.state.audit_logger.log(
                AuditEvent(
                    event_type=AuditEventType.FACT_CHECK_RUN,
                    tenant_id=llm_request.tenant_id,
                    request_id=llm_request.request_id,
                    fact_check_result=fc_result.model_dump() if fc_result else None,
                )
            )
            upstream_response["sentinel_fact_check"] = fc_result.model_dump()

        # Audit: response sent
        await app.state.audit_logger.log(
            AuditEvent(
                event_type=AuditEventType.RESPONSE_SENT,
                tenant_id=llm_request.tenant_id,
                request_id=llm_request.request_id,
                data={"latency_ms": llm_response.latency_ms},
            )
        )

        upstream_response["sentinel_request_id"] = llm_request.request_id
        return JSONResponse(content=upstream_response)

    @app.on_event("shutdown")
    async def shutdown() -> None:
        await app.state.http_client.aclose()
        await app.state.audit_logger.close()

    return app


async def _forward_to_provider(
    client: httpx.AsyncClient,
    config: SentinelConfig,
    request: LLMRequest,
) -> Dict[str, Any]:
    """Forward a request to the appropriate upstream LLM provider."""
    from sentinel.config import ProviderConfig

    provider_cfg: Optional[ProviderConfig] = None
    for p in config.providers:
        if p.name == request.provider or (not request.provider and p.enabled):
            provider_cfg = p
            break

    if provider_cfg is None:
        raise ValueError(f"No provider configured for '{request.provider}'")

    headers = {
        "Authorization": f"Bearer {provider_cfg.api_key}",
        "Content-Type": "application/json",
    }

    payload: Dict[str, Any] = {
        "model": request.model or provider_cfg.model,
        "messages": [m.model_dump() for m in request.messages],
        "temperature": request.temperature,
    }
    if request.max_tokens:
        payload["max_tokens"] = request.max_tokens

    url = f"{provider_cfg.api_base.rstrip('/')}/chat/completions"
    resp = await client.post(url, json=payload, headers=headers)
    resp.raise_for_status()
    return resp.json()  # type: ignore[no-any-return]
