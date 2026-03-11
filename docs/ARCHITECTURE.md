# Sentinel Architecture

> System design and data-flow reference for the Sentinel AI Reliability & Trust Engine.

## Overview

Sentinel is an OpenAI-compatible reverse proxy that sits between your application and one or more LLM providers. Every request/response pair passes through a pipeline of governance layers before reaching the end user. The architecture is designed around three principles:

1. **Zero-code integration** — change `base_url` to Sentinel; no SDK required.
2. **Auditable by default** — every decision is recorded in a tamper-proof, SHA-256 hash-chained audit log.
3. **Fail-safe escalation** — a multi-level circuit breaker ensures no unverified response reaches production.

## High-Level Data Flow

```
Client App
    |
    | POST /v1/chat/completions
    v
+-------------------------------------------+
|           SENTINEL PROXY                  |
|           (sentinel/proxy.py)             |
|                                           |
|  1. Sanitize  -->  2. Verify  -->  3. CB  |
|     (PII,          (RAG+NLI,     (L0-L3  |
|      injection)     N-cross)      cascade)|
|                                           |
|  4. Audit  (append-only hash chain)       |
+-------------------------------------------+
    |
    v
Upstream LLM Provider(s)
```

## Core Modules

### `sentinel/proxy.py` — Gateway

FastAPI application exposing an OpenAI-compatible `/v1/chat/completions` endpoint. Routes every request through the governance pipeline and attaches Sentinel headers (`sentinel_request_id`, `sentinel_fact_check`) to the response.

### `sentinel/layers/` — Governance Pipeline

Ordered middleware layers that process each request:

| Layer | Responsibility | Latency Budget |
|-------|---------------|----------------|
| **Sanitize** | PII masking (Presidio), prompt-injection detection | 30-80 ms |
| **Verify** | RAG entailment against golden sources, N-cross-check agreement | 150-400 ms |
| **Circuit Breaker** | L0 pass-through, L1 regenerate, L2 model upgrade, L3 human review | 0 ms or +retry |

### `sentinel/providers/` — LLM Abstraction

Provider adapters for OpenAI, Anthropic, and other LLM backends. Each adapter normalises requests/responses to a common internal format, enabling multi-provider failover.

### `sentinel/storage/` — Persistence

Handles connections to TimescaleDB (audit logs), pgvector (golden source embeddings), and data archival with nightly rotation.

### `sentinel/auth/` — Authentication

Token-based authentication with `RefreshTokenStore` supporting rotation, revocation, and cleanup.

### `sentinel/compliance/` — Compliance Engine

7-framework compliance audit engine covering ISO 42001, SOC 2, EU AI Act, NIST AI RMF, OWASP LLM Top 10, OWASP API Security, and MITRE ATLAS. Each framework is implemented as a pluggable auditor registered via `__init__.py`.

### `sentinel/models/` — Domain Models

Pydantic models and a 4-role sequential `ApprovalEngine` with checklist validation for human-in-the-loop workflows.

### `sentinel/hitl/` — Human-in-the-Loop

In-memory `HitlStore` with persistence for managing the review queue when the circuit breaker escalates to L3.

### `sentinel/security/` — Security Intelligence

Campaign scheduler for continuous red-team assurance, attack surface mapping, vulnerability lifecycle management, and policy firewall rules.

### `sentinel/observability/` — Metrics & Monitoring

Prometheus metrics collector exposing request latency, trust score distributions, circuit breaker state, and per-provider cost tracking.

### `sentinel/evals/` — Evaluation Framework

Cron-based evaluation scheduler that runs labelled eval datasets (`data/eval_pairs.jsonl`) against the pipeline and produces hallucination-rate reports.

### `sentinel/events/` — Event Bus

`SentinelEvent` publish/subscribe bus for decoupled communication between layers (e.g., audit writes, alert triggers).

### `sentinel/tasks/` — Background Tasks

Overdue task detector with event bus integration for SLA monitoring and alerting.

### `sentinel/model_inventory/` — Model Registry

Model lifecycle management with versioning, trust scoring, and state tracking (draft, active, deprecated, retired).

### `sentinel/plugins/` — Plugin System

Extensibility point for custom governance layers, providers, and integrations.

## Infrastructure

### Docker & Compose

`docker-compose.yml` orchestrates Sentinel, TimescaleDB, and pgvector. The `Dockerfile` produces a single image running the FastAPI proxy with Uvicorn.

### Kubernetes

`k8s/` contains production manifests: Deployment, Service, HPA (horizontal pod autoscaler), PDB (pod disruption budget), and NetworkPolicy for namespace isolation.

### Database Migrations

`migrations/` holds SQL migration files. `docker/` contains the compliance schema migration (6 tables, 3 views, grants).

### CI/CD

`.github/workflows/ci.yml` runs linting (`ruff`), type checking (`mypy`), and `pytest` on every push. A separate workflow handles Vercel deployment for the dashboard.

## Dashboard

`dashboard/` is a Next.js/TypeScript application deployed to Vercel. It provides:

- Real-time trust score monitoring
- Audit trail explorer
- Circuit breaker state visualisation
- Compliance posture overview (BoardReport)
- Security Intelligence module (threat feed, scanning, red team lab)
- Model inventory and approval workflows

`frontend/src/components/compliance/` contains React components for the 7-framework compliance audit UI.

## Configuration

`configs/` holds YAML/JSON configuration files and data seeds. `sentinel/config.py` defines `TenantConfig` with per-tenant settings including primary model, trust thresholds, and feature flags.

## Trust Score Formula

```
trust_score = 0.40 * rag_entailment
            + 0.30 * n_cross_check
            + 0.15 * pii_cleanliness
            + 0.15 * (1 - semantic_drift)
```

Responses below the configured threshold trigger the circuit breaker cascade.

## Security Model

See [SECURITY.md](../SECURITY.md) and [docs/security-model.md](security-model.md) for the full threat model. Key properties:

- All audit entries are SHA-256 hash-chained; tampering breaks the chain.
- PII is masked before any data leaves the Sentinel boundary.
- Prompt injection detection runs on every inbound request.
- Network policies enforce namespace isolation in Kubernetes deployments.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.11+ (62.6%), TypeScript (36.3%) |
| Web Framework | FastAPI + Uvicorn |
| Dashboard | Next.js + React |
| Database | TimescaleDB + pgvector |
| Package Manager | Poetry |
| Containerisation | Docker, Docker Compose, Kubernetes |
| CI | GitHub Actions |
| Dashboard Hosting | Vercel |
| Metrics | Prometheus |
| License | Apache 2.0 |
