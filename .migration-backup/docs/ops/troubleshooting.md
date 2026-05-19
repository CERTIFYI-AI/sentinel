# Troubleshooting

The 20 most common Sentinel issues and how to resolve them.

## Startup Issues

### 1. `Connection refused` on `curl http://localhost:8000/health`

**Cause**: Sentinel proxy is not running or failed to start.

```bash
# Check container status
docker compose ps

# View startup logs
docker compose logs sentinel
```

Common causes: missing `OPENAI_API_KEY`, database unreachable, port conflict.

### 2. `sentinel_db` exits immediately

**Cause**: TimescaleDB not installing extension on first boot.

```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Fresh start
```

### 3. `pgvector extension not found`

**Cause**: Using standard PostgreSQL image instead of `pgvector/pgvector`.

Ensure `docker-compose.yml` uses `image: pgvector/pgvector:pg16` not `image: postgres:16`.

## Authentication Issues

### 4. `401 Unauthorized` from LLM provider

**Cause**: Invalid or missing API key.

```bash
# Verify key is set
docker compose exec sentinel env | grep OPENAI_API_KEY

# Test key directly
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

### 5. `403 Forbidden` accessing dashboard

**Cause**: Dashboard auth middleware blocking request.

Check `SENTINEL_DASHBOARD_SECRET` is set in `.env` and that you're including it in requests.

## Trust Score Issues

### 6. All requests returning trust score of 0.0

**Cause**: Golden source is empty — no documents to verify against.

```bash
python scripts/seed_golden_source.py
python scripts/run_eval.py --check-golden-source
```

### 7. Trust score always very low (< 0.5) even for correct responses

**Cause**: Golden source documents don't cover the query domain.

Add domain-specific documents to your golden source. The verifier can only score claims against documents it has retrieved.

### 8. Trust score inconsistent between identical requests

**Cause**: N-cross-check uses temperature > 0 by default.

This is expected — slight variance is normal. If variance is large (> 0.2), reduce `circuit_breaker.cross_check.temperature` to `0.0`.

## PII Issues

### 9. PII not being detected

**Cause**: PII detection disabled or entity type not configured.

```yaml
# configs/sentinel.yaml
pii_detection:
  enabled: true
  entities:
    - EMAIL_ADDRESS
    - PHONE_NUMBER
    # Add missing entity types
```

### 10. False positives — non-PII content being masked

**Cause**: Presidio confidence threshold too low.

Increase `pii_detection.score_threshold` from default `0.7` to `0.85`.

## Circuit Breaker Issues

### 11. All responses going to L3 HITL

**Cause**: `trust_score_block_threshold` set too high, or golden source empty.

Check your threshold setting and ensure golden source is populated.

### 12. HITL queue not draining

**Cause**: No operators logged into dashboard, or Redis queue not running.

```bash
docker compose ps redis
docker compose logs redis
```

### 13. L2 regeneration making requests to wrong model

**Cause**: `circuit_breaker.upgrade_model` not configured.

Add to `configs/sentinel.yaml`:
```yaml
circuit_breaker:
  upgrade_model: gpt-4o
```

## Database Issues

### 14. `too many connections` error

**Cause**: Connection pool exhausted.

Increase pool size: `SENTINEL_DB_POOL_SIZE=20` in `.env`.

### 15. Audit log writes timing out

**Cause**: TimescaleDB under disk pressure or slow I/O.

Check disk usage: `docker compose exec sentinel_db df -h /var/lib/postgresql`

### 16. Hash chain integrity check failing

**Cause**: Database was directly modified or corrupted.

```bash
python scripts/export_audit_evidence.py --verify-chain --verbose
```

The output will show the first entry where the chain breaks.

## Performance Issues

### 17. High latency (> 2s per request)

**Cause**: L1/L2 circuit breaker triggering frequently.

Check dashboard > Monitoring > Circuit Breaker for level distribution. If mostly L1/L2, your trust threshold may be too aggressive or golden source needs expansion.

### 18. Memory usage growing over time

**Cause**: Embedding cache unbounded.

Set `verifier.embedding_cache_size: 1000` in `configs/sentinel.yaml`.

## Dashboard Issues

### 19. Dashboard shows no data

**Cause**: Dashboard connecting to wrong API endpoint.

Verify `VITE_SENTINEL_API_URL` in `dashboard/.env` points to the running Sentinel instance.

### 20. Charts not updating in real-time

**Cause**: WebSocket connection dropped.

Refresh the page. If persistent, check that port 8001 (WebSocket) is not blocked by firewall.

## Getting More Help

- Search [GitHub Issues](https://github.com/CERTIFYI-AI/sentinel/issues)
- Open a [GitHub Discussion](https://github.com/CERTIFYI-AI/sentinel/discussions)
- See [SUPPORT.md](../../SUPPORT.md) for commercial support options
