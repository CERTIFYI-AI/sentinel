# Monitoring

> **Purpose**: Set up Prometheus, Grafana, and alerting for production Sentinel deployments.

## Architecture

```
Sentinel (/metrics) --> Prometheus --> Grafana --> Alerts (PagerDuty/Slack/Email)
```

Sentinel exposes Prometheus metrics at `GET /metrics`. No authentication is required on this endpoint. Bind it to an internal network in production.

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

## Next Steps

- [Metric Definitions](../reference/metric-definitions.md) — Full list of available metrics.
- [Scaling](scaling.md) — Use monitoring data to make scaling decisions.
- [Backup and Restore](backup-restore.md) — Protect monitoring data.
