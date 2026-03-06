# Dashboard Guide

The Sentinel dashboard is a React 18 + TypeScript application that provides real-time visibility into your AI system's reliability and compliance posture.

## Accessing the Dashboard

By default, the dashboard runs on port 3000:

```bash
docker compose up -d
open http://localhost:3000
```

For production, the dashboard is served at `/dashboard` by the Sentinel proxy.

## Navigation

### Overview (Home)

The home page shows:
- **Trust Score Trend** — 7-day rolling average trust score with per-model breakdown
- **Request Volume** — Requests per hour with circuit breaker level distribution
- **Active Alerts** — Any trust score anomalies or HITL queue backlog
- **Cost Summary** — Total spend today vs. yesterday

### Monitoring

**Trust Score Distribution**
Histogram showing the distribution of trust scores across all requests. Use this to identify if your threshold is set appropriately — a bimodal distribution with a gap near your threshold suggests good calibration.

**Circuit Breaker**
- L0/L1/L2/L3 distribution as a stacked bar chart over time
- Escalation rate trend
- Average latency added per level
- HITL queue depth

**PII Detection**
- Entity type breakdown (EMAIL, PERSON, LOCATION, etc.)
- Detection rate over time
- Top endpoints triggering PII detection

### HITL Queue

The Human-in-the-Loop review queue shows all responses pending human review.

For each item:
- The original query
- The LLM response (with PII masked)
- The trust score and which components dragged it down
- The relevant golden source passages
- **Approve** / **Reject** / **Edit and Approve** actions

> Approvals and rejections are logged as audit events and feed back into threshold tuning recommendations.

### Audit Log

Searchable, filterable view of all audit log entries.

- Filter by date range, trust score range, model, endpoint
- Export to JSON or CSV for compliance evidence
- Click any entry for full request/response detail
- Hash chain verification status shown per entry

### Analytics

**Cost per Truth**
Shows the cost breakdown for each trust score level. High L2/L3 rates increase costs significantly — use this to justify threshold tuning.

**Model Comparison**
Side-by-side trust score and cost comparison across providers and models.

**Golden Source Coverage**
Shows which knowledge base documents are being retrieved most frequently and which queries have low retrieval relevance (potential gaps in your golden source).

### Settings

- **Thresholds** — Adjust `trust_score_block_threshold` and `cross_check_trigger_threshold` with live preview of impact on historical data
- **Alerts** — Configure email/Slack notifications for trust score drops, HITL queue depth, and cost spikes
- **PII Entities** — Enable/disable specific PII entity types
- **Dark Mode** — Toggle dark/light theme

## Dark Mode

The dashboard supports full dark mode. Toggle via Settings > Appearance, or it follows your system preference automatically.

## API

All dashboard data is available via the Sentinel API:

```bash
# Trust score summary
GET /api/v1/metrics/trust-score-summary

# HITL queue
GET /api/v1/hitl/queue

# Audit log
GET /api/v1/audit?from=2025-01-01&to=2025-01-31
```

## Related Documents

- [API Reference](../api-reference.md)
- [Monitoring Guide](../ops/monitoring-guide.md)
- [Configuration](../configuration.md)
