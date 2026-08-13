# Monitoring

> **Purpose**: Set up Prometheus, Grafana, and alerting for production Sentinel deployments.

## Architecture

```
Sentinel (/metrics) --> Prometheus --> Grafana --> Alerts (PagerDuty/Slack/Email)
```

Sentinel exposes Prometheus metrics at `GET /metrics`. No authentication is required on this endpoint. Bind it to an internal network in production.

```bash
curl http://localhost:8000/metrics
```

## Key Metrics

The canonical list lives in [Metric Definitions](../reference/metric-definitions.md).
The metrics most dashboards start from:

| Metric | Type | Description |
|--------|------|-------------|
| `sentinel_requests_total` | Counter | Total requests processed, labelled by status and intervention level |
| `sentinel_trust_score` | Histogram | Trust score distribution |
| `sentinel_request_duration_seconds` | Histogram | End-to-end latency |
| `sentinel_pii_detections_total` | Counter | PII detections by entity type |
| `sentinel_hitl_queue_size` | Gauge | Current HITL queue depth |
| `sentinel_circuit_breaker_state` | Gauge | Circuit breaker state per provider |
| `sentinel_audit_buffer_size` | Gauge | Unflushed audit entries |

## Prometheus Configuration

Add Sentinel to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: sentinel
    scrape_interval: 15s
    static_configs:
      - targets:
          - sentinel-1:8000
          - sentinel-2:8000
          - sentinel-3:8000
    metrics_path: /metrics
```

For Kubernetes with service discovery:

```yaml
scrape_configs:
  - job_name: sentinel
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: sentinel
        action: keep
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: ${1}:8000
```

### Local Prometheus + Grafana (development)

```yaml
# docker-compose.yml
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - ./configs/grafana:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=sentinel

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./configs/prometheus.yml:/etc/prometheus/prometheus.yml
```

```yaml
# configs/prometheus.yml
scrape_configs:
  - job_name: sentinel
    static_configs:
      - targets: ['sentinel:8000']
    scrape_interval: 15s
```

Pre-built dashboards live in `configs/grafana/dashboards/` and can be imported
through the Grafana API:

```bash
curl -X POST http://localhost:3001/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d @configs/grafana/dashboards/sentinel-overview.json
```

## Recommended Dashboards

### Dashboard 1: Operations Overview

| Panel | Query | Type |
|---|---|---|
| Request Rate | `rate(sentinel_requests_total[5m]) * 60` | Graph |
| Error Rate | `rate(sentinel_requests_total{status="error"}[5m]) / rate(sentinel_requests_total[5m])` | Gauge |
| P95 Latency | `histogram_quantile(0.95, rate(sentinel_request_duration_seconds_bucket[5m]))` | Graph |
| Active Instances | `count(up{job="sentinel"})` | Stat |

### Dashboard 2: Trust Score Analysis

| Panel | Query | Type |
|---|---|---|
| Trust Score Distribution | `histogram_quantile(0.5, rate(sentinel_trust_score_bucket[1h]))` | Heatmap |
| Mean Trust Score | `rate(sentinel_trust_score_sum[1h]) / rate(sentinel_trust_score_count[1h])` | Graph |
| Intervention Rate | `sum(rate(sentinel_requests_total{intervention!="NONE"}[5m])) / sum(rate(sentinel_requests_total[5m]))` | Gauge |
| Interventions by Type | `sum by (intervention)(rate(sentinel_requests_total{intervention!="NONE"}[5m]))` | Pie chart |

### Dashboard 3: Safety & Security

| Panel | Query | Type |
|---|---|---|
| PII Detections/min | `rate(sentinel_pii_detections_total[5m]) * 60` | Graph |
| Injection Attempts | `rate(sentinel_injection_detections_total{action="blocked"}[5m]) * 60` | Graph |
| Circuit Breaker State | `sentinel_circuit_breaker_state` | State timeline |
| Provider Errors | `sum by (provider)(rate(sentinel_provider_errors_total[5m]))` | Graph |

### Dashboard 4: HITL Queue

| Panel | Query | Type |
|---|---|---|
| Queue Depth | `sentinel_hitl_queue_size` | Gauge |
| Review Time P50 | `histogram_quantile(0.5, rate(sentinel_hitl_review_duration_seconds_bucket[1h]))` | Stat |
| Decisions by Type | `sum by (decision)(rate(sentinel_hitl_decisions_total[1h]))` | Bar chart |
| Timeout Rate | `rate(sentinel_hitl_decisions_total{decision="TIMEOUT"}[1h]) / rate(sentinel_hitl_decisions_total[1h])` | Gauge |

### Dashboard 5: Compliance

- **PII Detection Rate** — percentage of requests containing PII
- **Audit Chain Status** — result of the last integrity check
- **HITL Resolution Time** — time from escalation to resolution
- **Trust Score SLA** — percentage of requests meeting the configured threshold

## Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: sentinel
    rules:
      - alert: SentinelHighErrorRate
        expr: rate(sentinel_requests_total{status="error"}[5m]) / rate(sentinel_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Sentinel error rate above 5%"

      - alert: SentinelHighLatency
        expr: histogram_quantile(0.95, rate(sentinel_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Sentinel P95 latency above 5 seconds"

      - alert: SentinelCircuitBreakerOpen
        expr: sentinel_circuit_breaker_state == 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker OPEN for {{ $labels.provider }}"

      - alert: SentinelLowTrustScore
        expr: rate(sentinel_trust_score_sum[1h]) / rate(sentinel_trust_score_count[1h]) < 0.6
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Average Trust Score below 0.6 for 30 minutes"

      - alert: SentinelAuditBufferGrowing
        expr: sentinel_audit_buffer_size > 100
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Audit buffer growing. PostgreSQL may be unavailable."

      - alert: SentinelHITLQueueBacklog
        expr: sentinel_hitl_queue_size > 50
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "HITL queue has more than 50 pending items"
```

### Routing Alerts to Slack

1. In Grafana: **Alerting → Contact Points → Add Contact Point**.
2. Choose **Slack**.
3. Provide the incoming-webhook URL.
4. Map the alert rules above to that contact point.

## Health Check

```bash
curl http://localhost:8000/health
```

Response:

```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "models_loaded": true,
  "uptime_seconds": 86400
}
```

Use this endpoint for load balancer health checks and Kubernetes readiness probes.
Component-level probes are also exposed:

```bash
GET /health            # Overall health
GET /health/db         # Database connectivity
GET /health/pgvector   # pgvector availability
GET /health/redis      # Redis connectivity (HITL queue)
GET /health/llm        # LLM provider reachability
```

## Log Aggregation

Sentinel outputs structured JSON logs to stdout. Forward them to your log aggregation system:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "request_id": "req_abc123",
  "tenant_id": "tenant-uuid",
  "event": "request_completed",
  "trust_score": 0.87,
  "intervention": "NONE",
  "latency_ms": 1200
}
```

Filter by `level: error` for incident investigation. Filter by `event: request_completed` for request analytics.

Shipping logs off the host:

```bash
# Loki (Grafana stack)
docker compose logs sentinel | promtail --stdin

# Datadog
docker run -d --name datadog-agent \
  -e DD_API_KEY=<YOUR_KEY> \
  -v /var/run/docker.sock:/var/run/docker.sock \
  datadog/agent
```

## Next Steps

- [Metric Definitions](../reference/metric-definitions.md) — Full list of available metrics.
- [Scaling](scaling.md) — Use monitoring data to make scaling decisions.
- [Backup and Restore](backup-restore.md) — Protect monitoring data.
- [Production Checklist](production-checklist.md) — Pre-launch gate.
- [Dashboard Guide](../guides/dashboard-guide.md) — The in-product dashboard.
- [Observability architecture](observability/ARCHITECTURE.md) — Tracing, rate limits, DR targets.
