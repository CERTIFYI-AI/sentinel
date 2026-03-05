# Changelog

All notable changes to Sentinel are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GPU acceleration support for NLI model inference (docs/ops/scaling-guide.md)
- Helm chart for Kubernetes deployment
- WebSocket real-time metrics endpoint (`WS /ws/metrics`)

### Changed
- Nothing yet

## [0.1.0] - 2025-03-05

Initial release of Certifyi Sentinel.

### Added

**Proxy Layer**
- OpenAI-compatible proxy endpoint (`POST /v1/chat/completions`)
- Streaming and non-streaming response support
- `X-Sentinel-Trust-Score`, `X-Sentinel-Intervention`, `X-Sentinel-Request-Id`, `X-Sentinel-Latency-Ms` response headers
- Multi-tenant request routing via JWT `tenant_id` claim

**Sanitizer Layer**
- PII detection using Microsoft Presidio with spaCy NLP backend
- Regex-based PII fallback when spaCy is unavailable
- Fernet-encrypted redaction maps for PII re-identification
- Prompt injection detection via cosine similarity against known attack embeddings
- Configurable injection similarity threshold (default: 0.85)
- 18 HIPAA Safe Harbour identifier types supported

**Verifier Layer**
- Trust Score computation with four weighted components: semantic similarity, NLI entailment, PII/injection cleanliness, and source coverage
- Golden Source ingestion from PDF, Markdown, JSONL, and URL
- pgvector HNSW index for vector similarity search
- DeBERTa-v3-small NLI model for factual entailment checking
- N-cross-check with configurable number of golden source retrievals
- Claim extraction via sentence segmentation

**Circuit Breaker**
- Four-level fallback cascade: L0 (pass) → L1 (regenerate) → L2 (provider upgrade) → L3 (HITL)
- Redis-backed circuit breaker state (CLOSED → OPEN → HALF_OPEN)
- In-memory fallback when Redis is unavailable
- Configurable failure threshold and reset timeout
- Provider health monitoring

**Auditor Layer**
- Append-only audit log with SHA-256 hash chain
- PostgreSQL-backed storage with TimescaleDB time-series partitioning
- Audit chain integrity verification endpoint (`GET /api/audit/integrity`)
- Prompt hashing (SHA-256) instead of verbatim storage
- Configurable audit log retention

**Human-in-the-Loop (HITL)**
- HITL review queue for low-trust responses
- Dashboard UI for reviewing candidate responses
- Reviewer resolution workflow with audit trail
- Configurable HITL threshold and queue timeout

**Dashboard**
- React 18 + TypeScript + Vite frontend
- shadcn/ui component library with dark mode
- Trust Score gauge and histogram visualisations (Recharts)
- Intervention breakdown pie chart
- Audit log table with search and filtering
- HITL queue management interface
- Settings page for configuration management
- API key management
- Real-time WebSocket event stream

**Providers**
- OpenAI provider via LiteLLM
- Anthropic provider via LiteLLM
- Google (Gemini) provider via LiteLLM
- Custom provider interface for self-hosted models

**Infrastructure**
- Docker Compose stack (PostgreSQL, Redis, Sentinel, Dashboard)
- Dockerfile with non-root user, pinned base image
- GitHub Actions CI (pytest, ruff, mypy)
- Makefile for common development tasks
- `.env.example` with all configuration variables

**Configuration**
- Pydantic-settings with environment variable and YAML file override
- Per-tenant configuration stored in PostgreSQL
- Configuration profiles: development, staging, healthcare, general SaaS

**Documentation**
- Architecture documentation with ASCII diagrams
- API reference for all endpoints
- Compliance framework mappings (ISO 42001, SOC 2, EU AI Act, NIST AI RMF)
- GDPR and HIPAA PII handling guide
- Production deployment checklist
- Troubleshooting guide (20 common issues)

### Security
- JWT-based authentication with tenant isolation
- Fernet encryption for PII redaction maps
- SHA-256 hash chain for audit log tamper detection
- Rate limiting per tenant
- All provider credentials stored in environment variables
- Non-root Docker container

[Unreleased]: https://github.com/CERTIFYI-AI/sentinel/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/CERTIFYI-AI/sentinel/releases/tag/v0.1.0
