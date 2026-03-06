# Production Checklist

Complete every item on this list before deploying Sentinel to a production environment.

## Infrastructure

- [ ] TimescaleDB running with `timescaledb` extension enabled
- [ ] pgvector extension installed: `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] Redis running (required for HITL queue in production)
- [ ] All services pass `docker compose ps` showing `healthy` state
- [ ] TLS termination configured at load balancer or reverse proxy
- [ ] Secrets stored in environment variables or secrets manager (never in code)

## Configuration

- [ ] `OPENAI_API_KEY` (or equivalent provider key) set in environment
- [ ] `SENTINEL_DATABASE_URL` pointing to production TimescaleDB instance
- [ ] `SENTINEL_SECRET_KEY` set to a 32+ character random string
- [ ] `trust_score_block_threshold` tuned for your use case (default: 0.85)
- [ ] PII detection enabled: `pii_detection.enabled: true`
- [ ] HITL queue enabled: `circuit_breaker.hitl.enabled: true`
- [ ] Audit retention configured: `audit.retention_days: 2555`

## Security

- [ ] `.env` file is in `.gitignore` and not committed
- [ ] API keys rotated from any development/test values
- [ ] Network policies restrict database access to Sentinel containers only
- [ ] Dashboard access protected (reverse proxy auth or VPN)
- [ ] `SENTINEL_SECRET_KEY` is unique to this deployment

## Functional Verification

- [ ] `curl http://localhost:8000/health` returns `{"status": "healthy"}`
- [ ] `curl http://localhost:8000/health/db` returns healthy
- [ ] `curl http://localhost:8000/health/pgvector` returns healthy
- [ ] Test request returns `sentinel_trust_score` in response
- [ ] PII test: send `"My email is test@example.com"` — verify no email in LLM request logs
- [ ] Audit chain verify: `python scripts/export_audit_evidence.py --verify-chain` passes
- [ ] Dashboard accessible at port 3000 (or configured port)
- [ ] HITL queue visible in dashboard

## Golden Source

- [ ] Knowledge base documents loaded: `python scripts/seed_golden_source.py`
- [ ] At least one document in pgvector: `python scripts/run_eval.py --check-golden-source`
- [ ] Embedding model configured and reachable

## Monitoring

- [ ] Prometheus metrics endpoint responding: `curl http://localhost:8000/metrics`
- [ ] Grafana dashboards imported (see [Monitoring Guide](./monitoring-guide.md))
- [ ] Alerts configured for trust score drops below threshold
- [ ] Alerts configured for HITL queue depth > 10
- [ ] Log aggregation configured (stdout → your log platform)

## Compliance

- [ ] Audit log retention policy applied in TimescaleDB
- [ ] Initial hash chain integrity verified (baseline for future comparisons)
- [ ] Evidence export script tested: `python scripts/export_audit_evidence.py --format json --days 1`
- [ ] PII masking verified for all entity types relevant to your use case

## Load Testing

- [ ] Run load test at expected peak QPS before go-live
- [ ] Verify latency at P95 is acceptable (typically < 500ms for L0, < 1s for L1)
- [ ] Confirm circuit breaker behaves correctly under load
- [ ] Database connection pool sized correctly for concurrent requests

## Sign-off

| Check | Owner | Date |
|-------|-------|------|
| Infrastructure verified | | |
| Security review passed | | |
| Functional testing complete | | |
| Compliance requirements met | | |
| Load test passed | | |

## Related Documents

- [Deployment Guide](../deployment-guide.md)
- [Monitoring Guide](./monitoring-guide.md)
- [Troubleshooting](./troubleshooting.md)
- [Scaling Guide](./scaling-guide.md)
