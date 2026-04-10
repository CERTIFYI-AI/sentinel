# Sentinel AI Compliance Platform

A real-time AI governance, risk & compliance (GRC) platform by Certifyi. It sits between your LLM and users, verifying responses and producing audit trails for ISO 42001 and EU AI Act compliance.

## Architecture

- **Backend**: Python FastAPI (`sentinel/` package), running on port 8000
- **Frontend**: React + Vite dashboard (`dashboard/`), running on port 5000
- The Vite dev server proxies `/api` and `/ws` requests to the backend on port 8000

## Running the App

Everything starts with `bash start.sh` via the configured workflow:
1. FastAPI backend starts on port 8000 with auto-reload
2. Vite dev server starts on port 5000 and proxies API calls to the backend

## Environment Variables

Required for full functionality (set via Replit Secrets):
- `DATABASE_URL` — PostgreSQL connection string (falls back to SQLite if absent)
- `REDIS_URL` — Redis connection string (falls back to in-memory if absent)
- `SECRET_KEY` — JWT signing secret, min 32 chars
- `OPENAI_API_KEY` — OpenAI API key (`sk-...`)
- `ANTHROPIC_API_KEY` — Anthropic API key (optional)

Frontend env vars:
- `VITE_API_URL` — API base URL (leave empty for proxied local dev)

## Key Directories

- `sentinel/` — Python FastAPI backend (routers, config, models, auth)
- `sentinel/api/main.py` — FastAPI app entrypoint, all routers registered here
- `sentinel/config.py` — Configuration management via pydantic-settings
- `dashboard/` — React + Vite frontend
- `dashboard/vite.config.ts` — Vite config with proxy to backend
- `configs/sentinel.yaml` — Optional YAML config overrides
- `data/` — Local data files
- `migrations/` — Database migration files

## Notes

- The app runs in degraded mode without DATABASE_URL (uses SQLite) and without REDIS_URL (in-memory circuit breaker)
- Several routers (auth, notifications, dashboard) require asyncpg/PostgreSQL to be available
