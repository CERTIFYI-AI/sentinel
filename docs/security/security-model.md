# Security Model

> **Audience**: Security engineers, compliance officers, and InfoSec teams evaluating Sentinel for adoption.

This document describes Sentinel's security architecture, threat model, and the specific implementations that back each security claim.

## Threat Model

### Assets

| Asset | Value | Storage Location |
|-------|-------|------------------|
| LLM prompts (user input) | Contains business logic, user queries | Hashed (SHA-256) in audit log. Not stored verbatim by default. |
| LLM responses | May contain sensitive generated content | Hashed in audit log. |
| PII redaction maps | Maps `[EMAIL_ADDRESS_1]` back to original values | Fernet-encrypted in `SanitizationResult.redaction_map_encrypted` |
| Golden Source documents | Verified facts for your domain | PostgreSQL with pgvector extension |
| Audit log hash chain | Tamper-proof compliance evidence | PostgreSQL (TimescaleDB) |
| API keys and JWT secrets | Authentication credentials | Environment variables. Never stored in database. |
| Tenant configuration | Per-tenant thresholds and settings | PostgreSQL |

### Threat Actors

**External attacker**: Targets the API endpoint to exfiltrate data or disrupt service.

**Prompt injection from end users**: Crafts prompts that attempt to bypass sanitization, extract system prompts, or manipulate LLM behaviour.

**Compromised LLM provider**: A provider returns manipulated responses, either through compromise or intentional behaviour.

**Malicious insider**: Has legitimate access but attempts to tamper with audit logs or bypass controls.

### Attack Vectors and Mitigations

| Vector | Threat | Mitigation | Implementation |
|--------|--------|------------|----------------|
| API endpoint | Unauthenticated access | JWT Bearer token on all endpoints except `/health` | `sentinel/proxy.py` middleware |
| API endpoint | Brute-force attacks | Rate limiting per tenant (`rate_limit_rpm`, default: 60) | `SentinelSettings.rate_limit_rpm` |
| Prompt content | PII exfiltration via LLM | Presidio + spaCy PII detection and masking before LLM call | `sentinel/layers/sanitizer.py` |
| Prompt content | Prompt injection | Cosine similarity against injection seed embeddings | `sanitizer._compute_injection_score()` |
| LLM response | Hallucinated facts | RAG + NLI verification against Golden Source | `sentinel/layers/verifier.py` |
| LLM response | Toxic or policy-violating content | Policy engine evaluation on response | `sentinel/rules.py` |
| Audit log | Tampering or deletion | Append-only hash chain (SHA-256) | `sentinel/audit.py` |
| Audit log | Integrity verification bypass | Chain integrity check via `/api/audit/integrity` | `AuditLogger.verify_integrity()` |
| Database | Unauthorized access | Connection via `DATABASE_URL` with credentials. No public exposure. | Network isolation |
| Redis | State manipulation | Internal network only. No authentication by default (configure `REDIS_URL` with auth). | Network isolation |
| Configuration | Secret exposure | Config redaction in logs (`***` for any key containing "secret" or "key") | `SentinelSettings.log_summary()` |

## Authentication and Authorisation

### JWT Token Structure

Sentinel uses JWT Bearer tokens for API authentication. Tokens contain these claims:

```json
{
  "tenant_id": "tenant_abc",
  "key_id": "key_123",
  "scopes": ["read", "write"],
  "exp": 1704067200
}
```

Tokens are signed with `SECRET_KEY` (minimum 32 characters, required at startup). Sentinel validates the signature, expiration, and tenant_id on every request.

### Tenant Isolation

Every database query includes a `tenant_id` filter. A tenant cannot access another tenant's:
- Audit log entries
- Golden Source documents
- Configuration settings
- HITL review queue

This is enforced at the query level, not the application level. Even if application code has a bug, the database queries scope by `tenant_id`.

### Scopes

| Scope | Permissions |
|-------|-------------|
| `read` | Query audit logs, view metrics, search Golden Source |
| `write` | Send chat completions, ingest Golden Source documents |
| `admin` | Update tenant config, manage API keys, export audit logs |
| `reviewer` | Access HITL queue, submit reviews |

### API Key Rotation

1. Generate a new API key via `POST /api/auth/keys`
2. Update your application to use the new key
3. Revoke the old key via `DELETE /api/auth/keys/{key_id}`
4. Verify the old key returns 401

There is no downtime during rotation. Both keys work simultaneously until the old one is revoked.

## Data Protection

### What Sentinel Stores

| Data | Stored? | Format | Location |
|------|---------|--------|----------|
| Original prompts | No (by default) | SHA-256 hash only | `AuditEntry.prompt_hash` |
| Original responses | No (by default) | SHA-256 hash only | `AuditEntry.response_hash` |
| PII redaction maps | Yes | Fernet-encrypted bytes | `SanitizationResult.redaction_map_encrypted` |
| Trust Scores | Yes | Float 0.0–1.0 | `AuditEntry.trust_score` |
| Intervention decisions | Yes | Integer 0–3 | `AuditEntry.intervention` |
| Golden Source documents | Yes | Plain text chunks + embeddings | PostgreSQL (pgvector) |
| Tenant configuration | Yes | JSON | PostgreSQL |

### Prompt Hashing

Sentinel hashes prompts with SHA-256 before writing to the audit log. The hash allows you to verify that a specific prompt was processed (by hashing the prompt and searching for it) without storing the prompt itself.

This is a deliberate data minimisation decision for GDPR Article 25 (Data Protection by Design).

### PII Encryption

When the sanitizer redacts PII, it creates a mapping like `{"[EMAIL_ADDRESS_1]": "user@example.com"}`. This mapping is encrypted with Fernet symmetric encryption using a key derived from `SECRET_KEY`.

The encrypted map is stored in the `SanitizationResult` so that responses can be de-redacted before delivery. The plain-text PII is never written to the audit log or any persistent storage.

### Audit Log Tamper Detection

Each audit entry contains:
- `prev_hash`: SHA-256 hash of the previous entry
- `entry_hash`: SHA-256 hash of all fields in the current entry concatenated with `prev_hash`

This creates a hash chain. To verify integrity:

```bash
curl http://localhost:8000/api/audit/integrity
```

The response includes `intact: true/false` and `broken_at: []` (list of entry IDs where the chain broke).

If someone modifies a historical audit entry, every subsequent hash will be invalid. If someone deletes an entry, the chain has a gap. Both are detectable.

> **NOTE**: The hash chain detects tampering. It does not prevent it. A database administrator with direct access can modify entries. For environments requiring prevention, use an external immutable ledger as a secondary sink.

## Network Security

### Port Exposure

| Service | Port | Public? | Notes |
|---------|------|---------|-------|
| Sentinel API | 8000 | Yes | Only port that should be exposed |
| PostgreSQL | 5432 | No | Internal only |
| Redis | 6379 | No | Internal only |
| Dashboard | 3000 | No | Internal or VPN only |
| Grafana | 3001 | No | Internal or VPN only |

### TLS

Sentinel does not terminate TLS itself. Place a reverse proxy (nginx, Caddy, or cloud load balancer) in front of Sentinel for TLS termination.

```
Client ──HTTPS──▶ Reverse Proxy ──HTTP──▶ Sentinel (:8000)
```

> **WARNING**: Do not expose Sentinel directly to the internet without TLS termination. API keys and prompts will be transmitted in plain text.

### LLM Provider Calls

Sentinel communicates with LLM providers over HTTPS using `httpx.AsyncClient`. API keys are sent in the `Authorization` header over the encrypted connection.

## Supply Chain Security

### Dependency Management

Dependencies are pinned in `pyproject.toml` with exact versions. The `pip install -e ".[dev]"` command installs from the lock file.

### Docker Security

- Base image: `python:3.11-slim` (minimal attack surface)
- Non-root user: The Dockerfile creates and runs as a non-root user
- No build secrets in the image: API keys are injected via environment variables at runtime

### ML Model Provenance

| Model | Source | Purpose |
|-------|--------|---------|
| `en_core_web_lg` | spaCy / HuggingFace | PII entity recognition |
| `all-MiniLM-L6-v2` | sentence-transformers / HuggingFace | Embedding for injection detection + RAG |
| `cross-encoder/nli-deberta-v3-large` | HuggingFace | NLI fact-checking |

Models are downloaded at build time or first startup. Pin model versions in your Dockerfile for reproducible builds.

## Incident Response

### Detecting a Compromised Audit Log

```bash
# Check chain integrity
curl http://localhost:8000/api/audit/integrity

# If broken_at is non-empty, the chain has been tampered with
```

Export the audit log immediately for forensic analysis. Compare against any external backup.

### Rotating Secrets Without Downtime

1. Generate a new `SECRET_KEY`
2. Deploy a new instance with the new key
3. Route traffic to the new instance
4. Shut down the old instance

Existing JWT tokens signed with the old key will be invalid. Clients must re-authenticate.

### Revoking a Compromised API Key

```bash
# Revoke immediately
curl -X DELETE http://localhost:8000/api/auth/keys/{key_id} \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

The key is invalidated immediately. Any in-flight requests using that key will complete, but subsequent requests will return 401.

## Known Limitations

- **NLI model accuracy**: The DeBERTa NLI model is probabilistic. It can misclassify claims as ENTAILMENT when they are not. Sentinel is a defence-in-depth layer, not a guarantee of correctness.
- **Injection detection coverage**: Cosine similarity catches known injection patterns. Novel injection techniques may bypass detection. Keep injection seeds updated.
- **In-memory circuit breaker**: Without Redis, circuit breaker state is lost on restart. A process restart resets all circuit breakers to CLOSED.
- **Hash chain is detective, not preventive**: The audit hash chain detects tampering after the fact. It does not prevent a database administrator from modifying records.
- **Single SECRET_KEY**: All tenants share one signing key. A compromised key affects all tenants. Key-per-tenant support is planned for v0.3.

## Security Contacts

Report vulnerabilities through [GitHub's private vulnerability reporting](https://github.com/CERTIFYI-AI/sentinel/security/advisories/new). Do not open a public issue.

Expected response time: 48 hours for acknowledgement, 14 days for triage.

See [SECURITY.md](../../SECURITY.md) for the full vulnerability disclosure policy.
