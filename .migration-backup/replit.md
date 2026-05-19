# Sentinel AI GRC — Local Development Setup

## Overview

Enterprise AI Governance, Risk, and Compliance (GRC) platform by Certifyi AI.

## Architecture

- **Frontend**: React 18 + Vite dashboard (`dashboard/`) — runs on port 5173 (dev) or 5000 (production preview)
- **Backend**: Python FastAPI (`sentinel/`) — runs on port 8000
- **Database**: Supabase (PostgreSQL with RLS) — production; SQLite (`aiosqlite`) available for offline development

The Vite dev server proxies `/api` requests to the FastAPI backend on port 8000.
The FastAPI backend also reverse-proxies all non-API GET requests to the Vite server.

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
```

### 2. Frontend setup

```bash
cd dashboard
npm install
cp .env.example .env.local
# Add your Supabase URL and anon key to .env.local
npm run dev        # http://localhost:5173
```

### 3. Backend setup (optional — required for proxy/fact-check features)

```bash
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn sentinel.api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Workflows

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript strict validation |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |

## Key Files

| File | Purpose |
|------|---------|
| `sentinel/api/main.py` | FastAPI app entry point, all routers registered |
| `sentinel/api/db.py` | SQLAlchemy async models + database engine |
| `sentinel/config.py` | Pydantic settings (env prefix: `SENTINEL_`) |
| `dashboard/vite.config.ts` | Vite config with `/api` proxy to backend |
| `dashboard/src/lib/supabaseClient.ts` | Supabase singleton client |
| `dashboard/package.json` | Frontend dependencies |
| `pyproject.toml` | Python backend dependencies |

## Environment Variables

### Frontend (`dashboard/.env.local`)

| Key | Description |
|-----|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

### Backend (`.env`)

| Key | Description |
|-----|-------------|
| `SENTINEL_DATABASE_URL` | PostgreSQL asyncpg connection string (or leave unset for SQLite) |
| `SENTINEL_SECRET_KEY` | JWT signing secret — minimum 32 characters. Generate: `openssl rand -hex 32` |
| `OPENAI_API_KEY` | Optional — required for AI advisor and fact-check features |

## Optional Services

| Service | Environment Variable | Purpose |
|---------|---------------------|---------|
| Redis | `SENTINEL_REDIS_URL` | Production circuit breaker (falls back to in-memory) |
| S3-compatible storage | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` | Evidence file uploads |

## Demo Credentials

After running `npm run seed` against a Supabase-connected instance:

- **Email:** admin@sentinel-financial.com
- **Password:** Sentinel2026!
