"""OpenTelemetry distributed tracing for the Sentinel pipeline.

Instruments every layer (sanitize, verify, circuit-break, audit) as child
spans under a single root span per request.  Exported via OTLP to any
OpenTelemetry-compatible collector (Jaeger, Tempo, Datadog, etc.).

Setup:
    Call ``init_tracing()`` once at application startup (proxy.py lifespan).
    Each layer function creates child spans via the module-level ``tracer``.
    Span attributes follow OpenTelemetry semantic conventions where applicable.

Environment variables consumed:
    OTEL_SERVICE_NAME          — defaults to "certifyi-sentinel"
    OTEL_EXPORTER_OTLP_ENDPOINT — defaults to "http://localhost:4317" (gRPC)
    OTEL_TRACES_SAMPLER         — defaults to "parentbased_traceidratio"
    OTEL_TRACES_SAMPLER_ARG     — defaults to "1.0" (sample everything)
"""
from __future__ import annotations

import os
from typing import Any

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.trace import StatusCode

# ---------------------------------------------------------------------------
# Module-level tracer — import this in other modules to create child spans.
# The tracer is safe to use before init_tracing() is called; spans will be
# no-ops until a TracerProvider is registered.
# ---------------------------------------------------------------------------
tracer = trace.get_tracer("certifyi-sentinel", "0.1.0")

# Sentinel pipeline span names — centralised here to avoid typo drift.
SPAN_SANITIZE = "sentinel.sanitize"
SPAN_LLM_CALL = "sentinel.llm_call"
SPAN_VERIFY = "sentinel.verify"
SPAN_CLAIM_EXTRACT = "sentinel.verify.claim_extraction"
SPAN_RAG_RETRIEVE = "sentinel.verify.rag_retrieval"
SPAN_NLI_SCORE = "sentinel.verify.nli_scoring"
SPAN_CROSS_CHECK = "sentinel.verify.cross_check"
SPAN_DRIFT_CHECK = "sentinel.verify.drift_check"
SPAN_CIRCUIT_BREAK = "sentinel.circuit_breaker"
SPAN_AUDIT = "sentinel.audit"
SPAN_HITL_ENQUEUE = "sentinel.hitl.enqueue"


def init_tracing(
    service_name: str | None = None,
    otlp_endpoint: str | None = None,
    console_export: bool = False,
    fastapi_app: Any | None = None,
) -> TracerProvider:
    """Initialise the OpenTelemetry TracerProvider and attach span processors.

    Call this exactly once during application startup.  Subsequent calls are
    safe but will log a warning and return the existing provider.

    Args:
        service_name: Override for OTEL_SERVICE_NAME env var.  Defaults to
            ``certifyi-sentinel``.
        otlp_endpoint: Override for OTEL_EXPORTER_OTLP_ENDPOINT env var.
            Defaults to ``http://localhost:4317`` (gRPC).  Set to ``None``
            and enable *console_export* for local development without a
            collector.
        console_export: If True, also export spans to stdout.  Useful for
            local debugging — do NOT enable in production (very noisy).
        fastapi_app: If provided, automatically instruments the FastAPI
            application with request/response spans.  Pass the ``app``
            object from proxy.py.

    Returns:
        The configured TracerProvider instance.
    """
    resolved_name = service_name or os.getenv(
        "OTEL_SERVICE_NAME", "certifyi-sentinel"
    )
    resolved_endpoint = otlp_endpoint or os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"
    )

    resource = Resource.create(
        {
            "service.name": resolved_name,
            "service.version": "0.1.0",
            "deployment.environment": os.getenv("SENTINEL_ENV", "development"),
        }
    )

    provider = TracerProvider(resource=resource)

    # OTLP gRPC exporter — the primary export path for production.
    # BatchSpanProcessor buffers spans and flushes in background threads,
    # keeping the hot path (request handling) fast.
    otlp_exporter = OTLPSpanExporter(endpoint=resolved_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    if console_export:
        # Console exporter for local dev — prints spans as JSON to stdout.
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)

    # Re-bind the module-level tracer so it picks up the new provider.
    global tracer  # noqa: PLW0603
    tracer = trace.get_tracer("certifyi-sentinel", "0.1.0")

    # Auto-instrument FastAPI if the app instance was provided.
    if fastapi_app is not None:
        FastAPIInstrumentor.instrument_app(fastapi_app)

    return provider


def record_exception(span: trace.Span, exc: BaseException) -> None:
    """Record an exception on a span and set its status to ERROR.

    Convenience wrapper used throughout the pipeline layers to ensure
    consistent error recording.  The span is NOT ended — the caller
    is responsible for exiting the ``with tracer.start_as_current_span()``
    context manager.

    Args:
        span: The currently active span.
        exc: The exception instance to record.
    """
    span.set_status(StatusCode.ERROR, str(exc))
    span.record_exception(exc)


def add_sentinel_attributes(
    span: trace.Span,
    *,
    tenant_id: str | None = None,
    request_id: str | None = None,
    trust_score: float | None = None,
    intervention_level: int | None = None,
    cost_usd: float | None = None,
    blocked: bool | None = None,
) -> None:
    """Attach Sentinel-specific attributes to a span.

    Uses the ``sentinel.*`` attribute namespace to avoid collision with
    OpenTelemetry semantic conventions.  These attributes power Grafana
    dashboards and alerting rules.

    Args:
        span: The span to annotate.
        tenant_id: The resolved tenant identifier from the auth layer.
        request_id: The unique request UUID assigned in proxy.py.
        trust_score: Final trust score after verification + cross-check.
        intervention_level: 0=NONE, 1=REGENERATE, 2=UPGRADE, 3=HITL.
        cost_usd: Cumulative LLM API cost for this request.
        blocked: True if the request was blocked by sanitizer or verifier.
    """
    if tenant_id is not None:
        span.set_attribute("sentinel.tenant_id", tenant_id)
    if request_id is not None:
        span.set_attribute("sentinel.request_id", request_id)
    if trust_score is not None:
        span.set_attribute("sentinel.trust_score", trust_score)
    if intervention_level is not None:
        span.set_attribute("sentinel.intervention_level", intervention_level)
    if cost_usd is not None:
        span.set_attribute("sentinel.cost_usd", cost_usd)
    if blocked is not None:
        span.set_attribute("sentinel.blocked", blocked)


def shutdown_tracing() -> None:
    """Flush pending spans and shut down the TracerProvider.

    Call this during application shutdown (proxy.py lifespan teardown)
    to ensure all buffered spans are exported before the process exits.
    """
    provider = trace.get_tracer_provider()
    if isinstance(provider, TracerProvider):
        provider.shutdown()
