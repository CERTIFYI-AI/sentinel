# Security Policy

## Supported Versions

| Version | Supported |
|---------|----------|
| 0.1.x | ✓ Active support |
| < 0.1.0 | ✗ No support |

## Reporting a Vulnerability

Use [GitHub's private vulnerability reporting](https://github.com/CERTIFYI-AI/sentinel/security/advisories/new) to report security vulnerabilities. Do NOT open a public GitHub Issue for security vulnerabilities. Public disclosure of unpatched vulnerabilities puts every Sentinel deployment at risk.

When you submit a report, include:

- A description of the vulnerability and its potential impact
- The Sentinel version affected
- Step-by-step reproduction instructions
- Your assessment of severity (Critical/High/Medium/Low)
- Any proof-of-concept code or payloads (for our eyes only)

**Response timeline:**
- 48 hours: Acknowledgement of your report
- 7 days: Initial triage and severity assessment
- 14 days: A fix or a documented workaround
- 90 days: Public disclosure (coordinated with you)

If you do not receive acknowledgement within 72 hours, email security@certifyi.ai directly.

## Security Design Principles

**1. Audit logs are append-only and hash-chained.**
No code path modifies or deletes audit entries. Each entry includes the SHA-256 hash of the previous entry. `GET /api/audit/integrity` verifies the full chain. Any tampering breaks the chain and is detectable.

**2. PII never leaves the Sentinel boundary in plaintext.**
Promptsare hashed (SHA-256) before storage. Redacted PII tokens are encrypted with Fernet (AES-128-CBC + HMAC-SHA256) before storage. The encryption key is derived from `SECRET_KEY` and never stored in the database.

**3. Tenant isolation is enforced at the database query level.**
Every query that touches audit logs, metrics, or HITL items includes a `tenant_id` scope. There is no endpoint that returns data across tenant boundaries.

**4. The proxy never stores the raw LLM response.**
Sentinel stores a SHA-256 hash of the response content alongside the trust score and intervention decision. The full response is only available to the calling application.

**5. All ML models are loaded from pinned checksums.**
The `sentence-transformers/cross-encoder/nli-deberta-v3-small` model is loaded from HuggingFace with a pinned commit SHA. `scripts/generate_keys.py` verifies model checksums on startup.

## Threat Model

### Assets Being Protected

- **Audit log integrity**: Evidence that AI controls are working, required for compliance
- **PII in prompts**: User data submitted to the LLM
- **Tenant configuration**: Trust thresholds, provider credentials, golden source content
- **Provider API keys**: Credentials for OpenAI, Anthropic, and other providers

### Threat Actors

**External attacker with API access**: Mitigated by JWT authentication, rate limiting, and tenant-scoped queries. Sentinel exposes port 8000 only. PostgreSQL and Redis are internal-only.

**Malicious insider with database access**: The audit log hash chain detects modification. PII is encrypted at rest. Provider keys are stored encrypted. Breaking tenant isolation requires modifying application code.

**Compromised LLM provider**: Sentinel logs every request and response hash. If a provider returns unexpected content, the trust score drops and the circuit breaker activates. The audit trail shows exactly what was sent and what was returned.

**Prompt injection by end users**: The sanitizer layer checks every incoming prompt against known injection seed embeddings using cosine similarity. Prompts with similarity > 0.85 to known attacks are blocked and logged.

### Attack Surfaces

| Surface | Exposure | Mitigation |
|---------|----------|------------|
| Port 8000 (API) | Public (required) | JWT auth, rate limiting, input validation |
| PostgreSQL port 5432 | Internal only | Network policy, TLS, strong password |
| Redis port 6379 | Internal only | Network policy, AUTH password |
| Dashboard port 3000 | Internal or VPN | JWT auth, admin role required |
| LLM provider calls | Outbound only | Credentials in env vars, never in logs |

## Known Limitations

- **N-cross-check is probabilistic.** The NLI model can be wrong. A Trust Score of 0.90 means Sentinel is confident, not certain. Do not treat Sentinel as the sole control for life-critical decisions.
- **Injection detection has false positives.** Cosine similarity thresholds can block legitimate prompts that happen to resemble known attacks. Tune `injection_similarity_threshold` in `sentinel.yaml` if you see false positives.
- **The golden source is only as good as what you put in it.** An empty golden source causes Sentinel to fall back to a 0.5 score for all factual claims. Populate it before trusting the trust scores.
- **Sentinel is a defence-in-depth layer.** It does not replace model evaluation, red-teaming, data governance policies, or vendor management processes. It enforces runtime controls. It is one layer of a complete AI governance program.

## Hall of Fame

Sentinel is a new project. We will credit security researchers here for responsibly disclosed vulnerabilities once they are patched.

| Researcher | Vulnerability | Disclosed | CVE |
|------------|--------------|-----------|-----|
| *(first researcher gets their name here)* | - | - | - |
