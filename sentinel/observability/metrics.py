"""Prometheus metrics for Sentinel pipeline observability.

Exposes counters, histograms, and gauges for trust scores, intervention
rates, request latency, and cost-per-truth. Scraped by Prometheus via
the /metrics endpoint and visualized in the Grafana dashboard.
"""

from __future__ import annotations

import logging

from prometheus_client import Counter, Gauge, Histogram, generate_latest

logger = logging.getLogger(__name__)

# Request counters
REQUESTS_TOTAL = Counter(
    "sentinel_requests_total",
    "Total requests processed through the Sentinel pipeline",
    ["tenant_id", "intervention_level"],
)

REQUESTS_BLOCKED = Counter(
    "sentinel_requests_blocked_total",
    "Requests blocked by sanitizer (injection detection or policy)",
    ["tenant_id", "reason"],
)

# Trust score distribution
TRUST_SCORE = Histogram(
    "sentinel_trust_score",
    "Distribution of trust scores across all verified responses",
    ["tenant_id"],
    buckets=[0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
)

# Intervention counters
INTERVENTIONS = Counter(
    "sentinel_interventions_total",
    "Count of circuit breaker interventions by level",
    ["tenant_id", "level"],
)

# Latency histograms (in milliseconds)
SANITIZATION_LATENCY = Histogram(
    "sentinel_sanitization_latency_ms",
    "Sanitization layer latency in milliseconds",
    ["tenant_id"],
    buckets=[1, 5, 10, 25, 50, 100, 250, 500, 1000],
)

VERIFICATION_LATENCY = Histogram(
    "sentinel_verification_latency_ms",
    "Verification layer latency in milliseconds (includes NLI + RAG)",
    ["tenant_id"],
    buckets=[10, 50, 100, 200, 300, 500, 1000, 2000, 5000],
)

TOTAL_LATENCY = Histogram(
    "sentinel_total_latency_ms",
    "Total end-to-end pipeline latency in milliseconds",
    ["tenant_id"],
    buckets=[50, 100, 200, 500, 1000, 2000, 5000, 10000],
)

# Cost tracking
COST_PER_REQUEST = Histogram(
    "sentinel_cost_per_request_usd",
    "LLM API cost per request in USD (includes verification calls)",
    ["tenant_id"],
    buckets=[0.0001, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
)

TOTAL_COST = Counter(
    "sentinel_total_cost_usd",
    "Cumulative LLM API cost in USD",
    ["tenant_id"],
)

# Provider health
PROVIDER_CIRCUIT_STATE = Gauge(
    "sentinel_provider_circuit_state",
    "Circuit breaker state per provider (0=closed, 1=open)",
    ["provider_id"],
)

PROVIDER_FAILURES = Counter(
    "sentinel_provider_failures_total",
    "Provider failure count for circuit breaker tracking",
    ["provider_id"],
)

# Active connections
ACTIVE_WEBSOCKETS = Gauge(
    "sentinel_active_websockets",
    "Number of active WebSocket connections to the dashboard",
)


def record_request(
    tenant_id: str,
    trust_score: float,
    intervention_level: int,
    sanitization_ms: float,
    verification_ms: float,
    total_ms: float,
    cost_usd: float,
) -> None:
    """Record metrics for a completed pipeline request.

    Called as a fire-and-forget background task from the proxy layer.
    All prometheus_client operations are thread-safe.
    """
    level_name = ["NONE", "REGENERATE", "UPGRADE", "HITL"][min(intervention_level, 3)]

    REQUESTS_TOTAL.labels(tenant_id=tenant_id, intervention_level=level_name).inc()
    TRUST_SCORE.labels(tenant_id=tenant_id).observe(trust_score)

    if intervention_level > 0:
        INTERVENTIONS.labels(tenant_id=tenant_id, level=level_name).inc()

    SANITIZATION_LATENCY.labels(tenant_id=tenant_id).observe(sanitization_ms)
    VERIFICATION_LATENCY.labels(tenant_id=tenant_id).observe(verification_ms)
    TOTAL_LATENCY.labels(tenant_id=tenant_id).observe(total_ms)

    COST_PER_REQUEST.labels(tenant_id=tenant_id).observe(cost_usd)
    TOTAL_COST.labels(tenant_id=tenant_id).inc(cost_usd)


def record_blocked(tenant_id: str, reason: str) -> None:
    """Record a blocked request (injection detected or policy violation)."""
    REQUESTS_BLOCKED.labels(tenant_id=tenant_id, reason=reason).inc()


def get_metrics_text() -> bytes:
    """Generate Prometheus exposition format text for the /metrics endpoint."""
    return generate_latest()



class MetricsCollector:
    """Facade used by the proxy layer."""

    def export(self) -> bytes:
        return generate_latest()

    def increment_requests(
        self,
        tenant_id: str,
        model: str,
        intervention: str,
    ) -> None:
        REQUESTS_TOTAL.labels(
            tenant_id=tenant_id,
            intervention_level=intervention,
        ).inc()


metrics_collector = MetricsCollector()