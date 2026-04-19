# Sentinel AI GRC — Replit Setup

## Overview
Enterprise AI Governance, Risk, and Compliance (GRC) platform by Certifyi AI.
Migrated from Vercel to Replit.

## Architecture
- **Frontend**: React + Vite dashboard (`dashboard/`) — runs on port 5000
- **Backend**: Python FastAPI (`sentinel/`) — runs on port 8000
- **Database**: SQLite (via aiosqlite) stored at `/tmp/sentinel.db` by default

The Vite dev server proxies `/api` requests to the FastAPI backend on port 8000.
The FastAPI backend also reverse-proxies all non-API GET requests to the Vite server on port 5000.

## Workflows
- **Start application** — `cd dashboard && npm run dev` (port 5000, webview)
- **Backend API** — `uvicorn sentinel.api.main:app --host 0.0.0.0 --port 8000 --reload` (port 8000, console)

## Key Files
- `sentinel/api/main.py` — FastAPI app entry point, all routers registered here
- `sentinel/api/db.py` — SQLAlchemy async models + SQLite engine
- `sentinel/config.py` — Pydantic settings (env prefix: `SENTINEL_`, also reads `SECRET_KEY`)
- `dashboard/vite.config.ts` — Vite config with `/api` proxy to backend
- `dashboard/package.json` — Frontend dependencies (React, Radix UI, TanStack Query, etc.)
- `pyproject.toml` — Python backend dependencies

## Environment Variables / Secrets Required
| Key | Description |
|---|---|
| `SECRET_KEY` | JWT signing secret (min 32 chars). Generate: `openssl rand -hex 32` |
| `JWT_SECRET_KEY` | Additional JWT secret used by auth router |
| `OPENAI_API_KEY` | Optional — needed for AI/LLM features |
| `ANTHROPIC_API_KEY` | Optional — needed for Claude-based features |

## Optional Services
- **Redis**: Set `REDIS_URL` for production circuit breaker (falls back to in-memory)
- **PostgreSQL**: Set `DATABASE_URL` for persistent storage (defaults to SQLite)
- **S3**: Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` for file storage

## CRUD-Enhanced Pages
All pages use local state + mock seed data (no backend API changes). Shared primitives in `dashboard/src/components/ui/crud-helpers.tsx`.

### Previously enhanced (17 pages)
BiasAudits, ComplianceControls, ComplianceFrameworks, AgentDiscovery, Datasets, Incidents, HitQueue, HitlReviews, RegRadar, TrustEngine, EvidenceSync, System, ModelInventory, PolicyManagement, ExplainabilityCenter, ConformityAssessment

### Newly enhanced (7 pages — April 2026)
| Page | Route | Section | Features |
|------|-------|---------|---------|
| RoPA | `/ropa` | COMPLIANCE | GDPR Art.30 register, 8 seed records, TOM checkboxes, DPO review tracking, intl. transfer details |
| TIA | `/tia` | COMPLIANCE | Post-Schrems II transfer assessment, risk scores, 5-step detail panel, supplementary measures |
| Regulator Filings | `/regulator-filings` | RISK & RESPONSE | 72h GDPR breach tracking, red deadline banners, filing timeline, comm log |
| Tabletop Exercises | `/tabletop` | RISK & RESPONSE | 5 exercises, scenario injects timeline, readiness scoring radar, participant management |
| Asset Registry | `/assets` | ORGANIZATION | ISO 27001 CMDB, 10 assets, classification badges, audit history, security controls |
| Identity Governance | `/iga` | ORGANIZATION | Identities + Review Campaigns tabs, entitlement certify/revoke, risk flags, orphaned account detection |
| Business Impact | `/bia` | ORGANIZATION | RTO/RPO/MTPD, 5×5 impact matrix heat map, AI system dependencies, financial impact |

## Package Managers
- Frontend: `npm` (package-lock.json in `dashboard/`)
- Backend: `pip` (pyproject.toml at root, installed as editable package)
