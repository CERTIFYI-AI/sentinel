# Monitoring Guide

This guide covers Grafana dashboards, Prometheus metrics, and alerting configuration for Sentinel in production.

## Metrics Endpoint

Sentinel exposes Prometheus metrics at `/metrics`:

```bash
curl http://localhost:8000/metrics
```

## Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `sentinel_requests_total` | Counter | Total requests processed, labeled by `level` (l0/l1/l2/l3) |
| `sentinel_trust_score` | Histogram | Trust score distribution |
| `sentinel_request_latency_seconds` | Histogram | End-to-end latency |
| `sentinel_pii_detections_total` | Counter | PII detections by `entity_type` |
| `sentinel_hitl_queue_depth` | Gauge | Current HITL queue size |
| `sentinel_audit_chain_length` | Gauge | Total audit entries |
| `sentinel_cost_usd_total` | Counter | Cumulative cost by `provider` and `model` |
| `sentinel_verifier_latency_seconds` | Histogram | NLI verification latency |

## Grafana Setup

### Docker Compose (Development)

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

### Import Dashboards

Pre-built dashboards are in `configs/grafana/dashboards/`:

```bash
# Import via Grafana API
curl -X POST http://localhost:3001/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d @configs/grafana/dashboards/sentinel-overview.json
```

## Dashboard Panels

### Overview Dashboard

- **Trust Score Over Time** — Time series of average trust score
- **Circuit Breaker Distribution** — Stacked bar: L0/L1/L2/L3 ratio
- **Request Rate** — Requests per second
- **P95 Latency** — 95th percentile end-to-end latency
- **Active HITL Items** — Current queue depth
- **Cost Rate** — USD per hour

### Compliance Dashboard

- **PII Detection Rate** — % of requests with PII
- **Audit Chain Status** — Last integrity check result
- **HITL Resolution Time** — Time from escalation to resolution
- **Trust Score SLA** — % of requests meeting configured threshold

## Alerting

### Prometheus Alert Rules

```yaml
# configs/prometheus-alerts.yml
groups:
  - name: sentinel
    rules:
    - alert: LowTrustScoreAverage
      expr: avg_over_time(sentinel_trust_score[5m]) < 0.75
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: Average trust score below 0.75

    - alert: HighHITLQueueDepth
      expr: sentinel_hitl_queue_depth > 10
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: HITL queue has {{ $value }} items pending

    - alert: HighL3Rate
      expr: rate(sentinel_requests_total{level="l3"}[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: More than 10% of requests escalating to HITL

    - alert: SentinelDown
      expr: up{job="sentinel"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: Sentinel proxy is down
```

### Slack Alerting

Configure Grafana to send alerts to Slack:

1. In Grafana: Alerting > Contact Points > Add Contact Point
2. Choose Slack
3. Provide webhook URL
4. Map alert rules to the contact point

## Log Aggregation

Sentinel logs to stdout in structured JSON format:

```json
{"timestamp": "2025-01-15T10:30:00Z", "level": "INFO", "event": "request.completed", "trust_score": 0.92, "latency_ms": 245, "sentinel_request_id": "uuid-..."}
```

Ship logs to your platform:

```bash
# Loki (Grafana stack)
docker compose logs sentinel | promtail --stdin

# Datadog
docker run -d --name datadog-agent \
  -e DD_API_KEY=<YOUR_KEY> \
  -v /var/run/docker.sock:/var/run/docker.sock \
  datadog/agent
```

## Health Endpoints

```bash
GET /health            # Overall health
GET /health/db         # Database connectivity
GET /health/pgvector   # pgvector availability
GET /health/redis      # Redis connectivity (HITL queue)
GET /health/llm        # LLM provider reachability
```

## Related Documents

- [Production Checklist](./production-checklist.md)
- [Scaling Guide](./scaling-guide.md)
- [Dashboard Guide](../guides/dashboard-guide.md)
