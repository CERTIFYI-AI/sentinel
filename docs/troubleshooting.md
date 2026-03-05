# Troubleshooting Guide

Common issues and solutions when running Sentinel.

## Startup Issues

### Database Connection Failed

**Error**: `sqlalchemy.exc.OperationalError: could not connect to server`

**Solutions**:
1. Verify PostgreSQL is running: `pg_isready`
2. Check `DATABASE_URL` in `.env` matches your database credentials
3. Ensure the database exists: `createdb sentinel`
4. Check firewall rules allow connections on port 5432

### Redis Connection Refused

**Error**: `redis.exceptions.ConnectionError: Error connecting to redis://localhost:6379`

**Solutions**:
1. Verify Redis is running: `redis-cli ping`
2. Check `REDIS_URL` in `.env`
3. If using Docker: `docker-compose up -d redis`

### Migration Errors

**Error**: `alembic.util.exc.CommandError: Target database is not up to date`

**Solutions**:
```bash
# Check current revision
alembic current

# Run pending migrations
alembic upgrade head

# If corrupted, stamp current and retry
alembic stamp head
alembic upgrade head
```

### Port Already in Use

**Error**: `OSError: [Errno 98] Address already in use`

**Solutions**:
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use a different port
uvicorn sentinel.main:app --port 8001
```

---

## API Issues

### 401 Unauthorized

**Cause**: Missing or expired JWT token.

**Solutions**:
1. Obtain a fresh token: `POST /auth/login`
2. Include the token in the Authorization header: `Bearer <token>`
3. Check `JWT_EXPIRY_HOURS` setting (default: 24 hours)

### 429 Rate Limited

**Cause**: Too many requests in the rate limit window.

**Solutions**:
1. Check rate limit headers in response: `X-RateLimit-Remaining`
2. Increase `RATE_LIMIT_RPM` in configuration
3. Implement exponential backoff in your client

### 422 Validation Error

**Cause**: Invalid request body.

**Solutions**:
1. Check the `details` field in the error response for specific field errors
2. Ensure `prompt` and `response` fields are provided for `/verify`
3. Verify JSON content type header: `Content-Type: application/json`

### Slow Response Times

**Cause**: Guardrails taking too long to execute.

**Solutions**:
1. Check individual guardrail latencies in the response
2. Reduce `GUARDRAIL_TIMEOUT_MS` to fail faster
3. Disable expensive guardrails (factuality, hallucination) if not needed
4. Enable parallel execution: `GUARDRAIL_PARALLEL=true`
5. Scale horizontally with more workers: `MAX_WORKERS=8`

---

## Guardrail Issues

### LLM Provider Errors

**Error**: `openai.error.RateLimitError` or `openai.error.APIError`

**Solutions**:
1. Check your API key is valid and has sufficient quota
2. Configure retry logic (built-in with exponential backoff)
3. Use a fallback model: set `MODEL_NAME` to a cheaper model
4. Check provider status page for outages

### Toxicity Model Not Loading

**Error**: `OSError: Can't load tokenizer for 'unitary/toxic-bert'`

**Solutions**:
```bash
# Download model manually
python -c "from transformers import AutoTokenizer; AutoTokenizer.from_pretrained('unitary/toxic-bert')"

# Or use a different model
export TOXICITY_MODEL=unitary/toxic-bert
```

### PII Detection False Positives

**Solutions**:
1. Adjust the threshold: increase from 0.0 to 0.3
2. Limit entity types in policy config
3. Add allowlist patterns in configuration

### High Memory Usage

**Cause**: ML models loaded in memory (~800MB for toxicity model).

**Solutions**:
1. Use API-based guardrails instead of local models
2. Reduce number of active guardrails
3. Increase container memory limits
4. Use model quantization where supported

---

## Docker Issues

### Container Exits Immediately

**Solutions**:
```bash
# Check logs
docker-compose logs sentinel-api

# Common causes:
# - Missing environment variables
# - Database not ready yet (use depends_on with healthcheck)
# - Port conflicts
```

### Build Failures

**Solutions**:
```bash
# Clean build
docker-compose build --no-cache

# Check Dockerfile for missing dependencies
# Ensure Python version matches pyproject.toml
```

---

## Audit Log Issues

### Hash Chain Verification Failed

**Cause**: Audit log entries may have been tampered with or database was restored from backup.

**Solutions**:
1. Run integrity check: `POST /api/v1/audit/verify`
2. Check the response for which entries failed verification
3. If caused by backup restore, re-stamp the hash chain
4. Investigate potential unauthorized database access

### Audit Logs Growing Too Large

**Solutions**:
1. Set retention: `AUDIT_LOG_RETENTION_DAYS=365`
2. Archive old logs: `python -m sentinel.scripts.export_audit --archive`
3. Use log rotation for file-based exports

---

## Dashboard Issues

### Dashboard Not Loading

**Solutions**:
1. Verify the dashboard is running: `docker-compose ps`
2. Check CORS settings: `CORS_ORIGINS` must include dashboard URL
3. Verify API URL in dashboard config matches the API server
4. Check browser console for JavaScript errors

### WebSocket Connection Failed

**Solutions**:
1. Check nginx configuration for WebSocket upgrade headers
2. Verify the `/ws` endpoint is accessible
3. Check for proxy timeout settings

---

## Getting Help

1. Check [GitHub Issues](https://github.com/CERTIFYI-AI/sentinel/issues)
2. Search existing discussions
3. File a new issue with:
   - Sentinel version (`GET /health`)
   - Error messages and stack traces
   - Steps to reproduce
   - Environment details (OS, Python version, Docker version)
