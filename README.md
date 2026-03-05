# Certifyi Sentinel

> Real-time AI reliability and governance middleware. The trust engine between your LLM and your users.

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

## Overview

Certifyi Sentinel is a production-grade governance middleware that sits between your AI/LLM providers and your application. It provides real-time trust scoring, PII sanitization, prompt-injection detection, human-in-the-loop (HITL) escalation, and comprehensive audit logging.

## Architecture

```
User Request -> Sentinel Gateway -> Governance Layers -> LLM Provider
                                        |
                              Sanitizer (PII + Injection)
                              Verifier (Trust Scoring)
                              Auditor (Compliance Logging)
                              Circuit Breaker (Fault Tolerance)
                                        |
                              Dashboard (React 18 + TypeScript)
```

## Key Features

- **Trust Scoring Engine** - Real-time 0-100 trust scores for every AI response
- **PII Redaction** - Presidio + spaCy NLP pipeline with regex fallback
- **Prompt Injection Detection** - Cosine similarity against known attack embeddings
- **Human-in-the-Loop (HITL)** - Configurable escalation for low-trust responses
- **Circuit Breaker** - Fault-tolerant provider failover with health monitoring
- **Multi-Provider Support** - OpenAI, Anthropic, Google, and custom providers
- **Audit Logging** - PostgreSQL-backed immutable audit trail
- **Real-time Dashboard** - React 18 + TypeScript monitoring UI with dark mode
- **API Key Management** - Scoped keys with rate limiting and rotation

## Tech Stack

### Backend
- **Python 3.11+** with asyncio
- **FastAPI** for REST + WebSocket endpoints
- **PostgreSQL** via asyncpg + SQLAlchemy
- **Redis** for caching and rate limiting
- **Pydantic v2** for validation and settings
- **spaCy + Presidio** for NLP-based PII detection

### Frontend Dashboard
- **React 18** + **TypeScript** + **Vite**
- **shadcn/ui** component library
- **Recharts** for data visualization
- **TanStack React Query** for data fetching
- **Zustand** for state management
- **Tailwind CSS** with dark mode

### Infrastructure
- **Docker** + **Docker Compose**
- **GitHub Actions** CI/CD
- **Makefile** automation

## Project Structure

```
sentinel/
├── sentinel/                 # Python backend package
│   ├── __init__.py
│   ├── config.py             # Pydantic settings management
│   ├── models.py             # Domain models and Pydantic schemas
│   ├── rules.py              # Governance rule engine
│   ├── dashboard.py          # FastAPI dashboard API endpoints
│   ├── providers/            # LLM provider integrations
│   ├── layers/               # Governance processing layers
│   │   ├── sanitizer.py      # PII redaction + injection detection
│   │   ├── verifier.py       # Trust score computation
│   │   ├── auditor.py        # Audit trail logging
│   │   └── circuit_breaker.py # Fault tolerance
│   └── storage/              # Data persistence
├── dashboard/                # React frontend
│   ├── src/
│   │   ├── api/              # API client and types
│   │   ├── components/       # React components
│   │   │   ├── dashboard/    # Dashboard-specific components
│   │   │   └── ui/           # shadcn/ui primitives
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities
│   │   ├── pages/            # Route pages
│   │   └── store/            # Zustand stores
│   └── package.json
├── tests/                    # Test suite
├── configs/                  # YAML configuration
├── data/                     # Seed data
├── scripts/                  # Utility scripts
├── .github/workflows/        # CI/CD
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── pyproject.toml
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (for dashboard)
- PostgreSQL 15+
- Redis 7+

### 1. Clone and Setup

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
cp .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, SECRET_KEY
```

### 2. Backend Setup

```bash
pip install -e ".[dev]"
python scripts/generate_keys.py
make run
```

### 3. Dashboard Setup

```bash
cd dashboard
npm install
npm run dev
```

### 4. Docker (Recommended)

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, the Sentinel API, and the dashboard.

## Configuration

Sentinel loads configuration from environment variables with `sentinel.yaml` override:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | Encryption key for API keys | Required |
| `TRUST_THRESHOLD` | Minimum trust score (0-100) | `70` |
| `HITL_THRESHOLD` | HITL escalation threshold | `50` |
| `LOG_LEVEL` | Logging verbosity | `INFO` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/evaluate` | Evaluate AI response through governance pipeline |
| `GET` | `/api/v1/audit` | Query audit log entries |
| `GET` | `/api/v1/metrics` | Real-time trust metrics and statistics |
| `GET` | `/api/v1/hitl/queue` | Pending HITL review items |
| `POST` | `/api/v1/hitl/{id}/resolve` | Resolve HITL item |
| `POST` | `/api/v1/keys` | Create scoped API key |
| `GET` | `/api/v1/config` | Current configuration |
| `WS` | `/ws/events` | Real-time event stream |

## Development

```bash
make lint          # Run ruff + mypy
make test          # Run pytest suite
make format        # Auto-format code
make docker-build  # Build Docker image
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

---

Built by [Certifyi.ai](https://certifyi.ai) — AI Governance & Compliance Platform
