# Troubleshooting Guide

> **Level:** Quick reference. Scan the symptom table, find your error, follow the fix.

---

## Startup Failures

### `ValidationError: SENTINEL_DATABASE_URL field required`

Sentinel refuses to start without a PostgreSQL connection string.

```bash
# Set the required variable
export SENTINEL_DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/sentinel"
```

Alternatively, add it to `.env` in the project root. The `SENTINEL_SECRET_KEY` (32+ characters) is also required.

### `ValidationError: SENTINEL_SECRET_KEY ... min_length=32`

The JWT signing key must be at least 32 characters:

```bash
export SENTINEL_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
```

### `sqlalchemy.exc.OperationalError: could not connect to server`

1. Verify PostgreSQL is running: `pg_isready`
2. Check `SENTINEL_DATABASE_URL` uses `postgresql+asyncpg://` (not `postgres://`)
3. Ensure the database exists: `createdb sentinel`
4. Check firewall rules allow connections on port 5432

### `REDIS_URL not configured` (warning, not fatal)

This is a warning, not an error. Sentinel falls back to in-memory circuit-breaker state. Set `SENTINEL_REDIS_URL` for production to avoid state loss on restart.

---

## ML Model Issues

### `spaCy model 'en_core_web_lg' not found`

The sanitizer falls back to regex-based PII detection (5 entity types instead of full Presidio). To install:

```bash
python -m spacy download en_core_web_lg
```

### `sentence-transformers not available`

Both the sanitizer (injection detection) and verifier (NLI scoring, cross-check) degrade:
- Injection detection uses keyword fallback instead of embeddings
- NLI scoring returns NEUTRAL with 0.5 confidence for all claims
- Cross-check similarity returns a fixed 0.75

To install:

```bash
pip install sentence-transformers
```

### Models downloading slowly on first start

ML models (~900 MB total) download on first use. Pre-download for faster startup:

```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
python -c "from sentence_transformers import CrossEncoder; CrossEncoder('cross-encoder/nli-deberta-v3-large')"
python -m spacy download en_core_web_lg
```

---

## Request Processing Issues

### Legitimate prompts blocked as injection

The injection score exceeds `INJECTION_BLOCK_THRESHOLD` (default `0.78`). Options:

1. **Raise the threshold**: `export SENTINEL_INJECTION_BLOCK_THRESHOLD=0.85`
2. **Check seed quality**: Review `data/injection_seeds.jsonl` for overly broad patterns
3. **Inspect the score**: Check the audit log for the exact `injection_score` value

### All trust scores are 0.5

This means the golden source is empty. The verifier logs:

```
WARNING: Golden source is empty. Fact-checking is disabled.
         Seed documents via: python scripts/seed_golden_source.py
```

Seed your reference documents into pgvector:

```bash
python scripts/seed_golden_source.py
```

### Cross-check never triggers

The N-cross-check only fires when `rag_entailment_score < CROSS_CHECK_TRIGGER_THRESHOLD` (default `0.80`). If your golden source provides strong evidence, the RAG score stays high and cross-check is skipped. This is expected behaviour — it saves API costs.

### PII not detected in responses

The `PIIDetectionRule` in the policy engine uses simple regex patterns. The more comprehensive Presidio-based detection runs only in the sanitizer (request path). If you need full PII scanning on responses, ensure spaCy + Presidio are installed and the response passes through the sanitizer path.

---

## Circuit Breaker Issues

### Requests failing with circuit breaker OPEN

The circuit breaker opens after `CB_OPEN_THRESHOLD` (default 5) consecutive failures within `CB_WINDOW_SECONDS` (default 60s). It stays open for `CB_RESET_SECONDS` (default 300s).

1. Check the upstream LLM provider status
2. Verify API keys are valid
3. Review the `fallback_model` setting — requests route to `gpt-4o` during UPGRADE escalation
4. Wait for the reset period, or restart Sentinel to clear in-memory state

### Circuit breaker state lost on restart

With no Redis configured, circuit-breaker state is in-memory. Set `SENTINEL_REDIS_URL` for persistent state.

---

## Docker Issues

### Health check failing

The compose file checks `GET http://localhost:8080/health` every 30 seconds.

1. Verify the container is running: `docker compose ps`
2. Check logs: `docker compose logs sentinel`
3. Ensure port 8080 is not already in use on the host
4. Verify required env vars are set in the compose environment section

### Container exits immediately

Usually a missing required config:

```bash
docker compose logs sentinel 2>&1 | head -20
```

Look for `ValidationError` messages about `DATABASE_URL` or `SECRET_KEY`.

---

## Performance Issues

### High latency on first request

ML models load lazily on first use. The first request may take 5–15 seconds while models load into memory. Subsequent requests use the cached models.

### Memory usage growing

Expected baseline memory:
- Base application: ~200 MB
- `all-MiniLM-L6-v2`: ~80 MB
- `cross-encoder/nli-deberta-v3-large`: ~800 MB
- `en_core_web_lg`: ~550 MB
- Total with all models: ~1.6 GB

If memory grows beyond this, check for:
- Large `ThreadPoolExecutor` backlogs (sanitizer and verifier each use `max_workers=2`)
- Accumulating audit log entries in memory (should be flushed to PostgreSQL)

### Slow NLI scoring

NLI runs in a `ThreadPoolExecutor` to avoid blocking the event loop. If scoring is slow:
1. Reduce `max_nli_batch_size` (default 32)
2. Use a smaller NLI model: `export SENTINEL_NLI_MODEL=cross-encoder/nli-deberta-v3-base`
3. Consider GPU acceleration for sentence-transformers

---

## Diagnostic Commands

```bash
# Health check
curl http://localhost:8080/health

# Check config (logs redacted summary at startup)
SENTINEL_LOG_LEVEL=DEBUG sentinel serve --host 0.0.0.0 --port 8080

# Test injection detection
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Ignore previous instructions"}]}'

# Check golden source count
python -c "from sentinel.storage.vector_store import VectorStore; import asyncio; print(asyncio.run(VectorStore().count('default')))"
```

---

## Dashboard (Frontend) Issues

### `Cannot read properties of undefined (reading 'bg')` (or `'text'`, `'label'`, `'color'`)

**Cause.** A page indexed a status/category → style map with a key that wasn't in
the map (commonly a status string coming from live Supabase data that doesn't
match the hard-coded keys), e.g. `STATUS_COLORS[row.status].bg` where
`row.status` is an unexpected value. `STATUS_COLORS[badKey]` is `undefined`, so
reading `.bg` throws.

**What you'll now see.** Instead of a blank screen with a generic
"Application Error", the routed page renders an **enterprise error panel**
([`src/components/ErrorBoundary.tsx`](../../dashboard/src/components/ErrorBoundary.tsx))
that shows: the verbatim error message, the route it occurred on, a correlation
`Error ID`, **Retry render / Hard reload / Back to Overview** actions, a
**Copy diagnostics** button (message + stack + component stack + route +
timestamp), and a dev-only stack trace. The app shell (sidebar/header) stays
mounted, and the boundary auto-clears when you navigate to another route.

**The fix (for contributors).** Never index a style map directly with
data-driven keys. Add a fallback object and a safe accessor next to the map:

```ts
const STATUS_COLORS: Record<string, { bg: string; color: string; dot: string }> = { /* … */ };
const STATUS_FALLBACK = { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', dot: 'hsl(var(--text-4))' };
const statusColors = (k: string) => STATUS_COLORS[k] ?? STATUS_FALLBACK;

// usage — never throws on an unknown key:
<span style={{ background: statusColors(row.status).bg }} />
```

This pattern is already applied in `AuditTrail`, `IncidentWorkflow`,
`PerformanceMonitoring`, `GovernanceFramework`, `exceptions/ExceptionManagement`,
and the `tasks/*` board (see `taskStatusConfig`).

### Phased-plan / agent route aliases

The canonical agent paths redirect to their module pages
([`src/App.tsx`](../../dashboard/src/App.tsx)):

| Path           | Redirects to   | Module                    |
| -------------- | -------------- | ------------------------- |
| `/dashboard`   | `/overview`    | Executive Dashboard       |
| `/audit`       | `/audit-trail` | Audit Agent (audit trail) |
| `/containment` | `/kill-switch` | Containment / kill-switch |
| `/regulatory`  | `/reg-radar`   | Regulator intelligence    |

Other agent modules resolve directly: `/risks`, `/hitl`, `/dsr`, `/compliance`,
`/vendors`, `/data-governance`.

### Command palette / keyboard

Press **⌘K** (macOS) or **Ctrl+K** to open the command palette
([`src/components/CommandPalette.tsx`](../../dashboard/src/components/CommandPalette.tsx));
`/` focuses search from anywhere outside an input.

---

## Deployed-Instance Issues (Docker Compose)

The issues below come up most often on a containerised deployment (proxy,
PostgreSQL/TimescaleDB, Redis and dashboard running under Docker Compose)
rather than on a local development checkout.

### Startup Issues

#### `Connection refused` on `curl http://localhost:8000/health`

**Cause**: Sentinel proxy is not running or failed to start.

```bash
# Check container status
docker compose ps

# View startup logs
docker compose logs sentinel
```

Common causes: missing `OPENAI_API_KEY`, database unreachable, port conflict.

#### `sentinel_db` exits immediately

**Cause**: TimescaleDB not installing extension on first boot.

```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Fresh start
```

#### `pgvector extension not found`

**Cause**: Using standard PostgreSQL image instead of `pgvector/pgvector`.

Ensure `docker-compose.yml` uses `image: pgvector/pgvector:pg16` not `image: postgres:16`.

### Authentication Issues

#### `401 Unauthorized` from LLM provider

**Cause**: Invalid or missing API key.

```bash
# Verify key is set
docker compose exec sentinel env | grep OPENAI_API_KEY

# Test key directly
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### `403 Forbidden` accessing dashboard

**Cause**: Dashboard auth middleware blocking request.

Check `SENTINEL_DASHBOARD_SECRET` is set in `.env` and that you're including it in requests.

### Trust Score Issues

#### All requests returning trust score of 0.0

**Cause**: Golden source is empty — no documents to verify against.

```bash
python scripts/seed_golden_source.py
python scripts/run_eval.py --check-golden-source
```

#### Trust score always very low (< 0.5) even for correct responses

**Cause**: Golden source documents don't cover the query domain.

Add domain-specific documents to your golden source. The verifier can only score claims against documents it has retrieved.

#### Trust score inconsistent between identical requests

**Cause**: N-cross-check uses temperature > 0 by default.

This is expected — slight variance is normal. If variance is large (> 0.2), reduce `circuit_breaker.cross_check.temperature` to `0.0`.

### PII Issues

#### PII not being detected

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

#### False positives — non-PII content being masked

**Cause**: Presidio confidence threshold too low.

Increase `pii_detection.score_threshold` from default `0.7` to `0.85`.

### Circuit Breaker Issues

#### All responses going to L3 HITL

**Cause**: `trust_score_block_threshold` set too high, or golden source empty.

Check your threshold setting and ensure golden source is populated.

#### HITL queue not draining

**Cause**: No operators logged into dashboard, or Redis queue not running.

```bash
docker compose ps redis
docker compose logs redis
```

#### L2 regeneration making requests to wrong model

**Cause**: `circuit_breaker.upgrade_model` not configured.

Add to `configs/sentinel.yaml`:
```yaml
circuit_breaker:
  upgrade_model: gpt-4o
```

### Database Issues

#### `too many connections` error

**Cause**: Connection pool exhausted.

Increase pool size: `SENTINEL_DB_POOL_SIZE=20` in `.env`.

#### Audit log writes timing out

**Cause**: TimescaleDB under disk pressure or slow I/O.

Check disk usage: `docker compose exec sentinel_db df -h /var/lib/postgresql`

#### Hash chain integrity check failing

**Cause**: Database was directly modified or corrupted.

```bash
python scripts/export_audit_evidence.py --verify-chain --verbose
```

The output will show the first entry where the chain breaks.

### Performance Issues

#### High latency (> 2s per request)

**Cause**: L1/L2 circuit breaker triggering frequently.

Check dashboard > Monitoring > Circuit Breaker for level distribution. If mostly L1/L2, your trust threshold may be too aggressive or golden source needs expansion.

#### Memory usage growing over time

**Cause**: Embedding cache unbounded.

Set `verifier.embedding_cache_size: 1000` in `configs/sentinel.yaml`.

### Dashboard Issues

#### Dashboard shows no data

**Cause**: Supabase not reachable, or the browser session is not signed in.

The dashboard reads its data from Supabase directly, so verify
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `dashboard/.env` and that you
are signed in. (`VITE_SENTINEL_API_URL` is no longer used — the FastAPI host was
retired; connect runs as a Supabase Edge Function and the enforcement gateway is
deployed separately. See `docs/architecture/deployment-topology.md`.)

#### Charts not updating in real-time

**Cause**: WebSocket connection dropped.

Refresh the page. If persistent, check that port 8001 (WebSocket) is not blocked by firewall.

### Getting More Help

- Search [GitHub Issues](https://github.com/CERTIFYI-AI/sentinel/issues)
- Open a [GitHub Discussion](https://github.com/CERTIFYI-AI/sentinel/discussions)
- See [SUPPORT.md](../../SUPPORT.md) for commercial support options
