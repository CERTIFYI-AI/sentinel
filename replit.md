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

## Dashboard Architecture

### Design System
- **Tokens**: `dashboard/src/styles/tokens.css` — all HSL CSS vars: `--brand`, `--brand-hover`, `--brand-subtle`, status semantics, surface layers
- **Theme System**: 3-way toggle (Dark → Light → System) via `dashboard/src/providers/theme.tsx`
  - `ThemeProvider` exports: `theme`, `setTheme`, `resolved`, `cycleTheme`, `ThemeToggle`
  - Storage key: `sntl-theme`; system preference media query listener active in system mode
  - All components use `useTheme()` from `providers/theme` (canonical — old `ThemeProvider.tsx` and `components/theme-provider.tsx` are stale/unused)
  - Theme toggle visible in: TopHeader (Moon/Sun/Monitor icons), Sidebar footer (cycle button), Settings → Appearance tab
- **Accent Colors**: 6 themes (Emerald/default, Blue, Purple, Teal, Orange, Rose); stored in localStorage via `dashboard/src/store/accentStore.ts`; selectable in TopHeader paint-brush popover AND Settings → Appearance tab
- **Fonts**: Outfit (body), monospace for code/IDs

### Sidebar
- `dashboard/src/components/Sidebar.tsx` — single NAV array drives all sections
- Sections: OVERVIEW, AI GOVERNANCE, SECURITY, COMPLIANCE, RISK & INCIDENTS, EVALUATIONS, OPERATIONS, ORGANIZATION, SYSTEM
- **UX**: Parent items with children use `<button>` (not NavLink) — clicking expands/collapses and navigates on first expand; child subitems use NavLink normally; 3-way theme toggle in footer

### Seed Data (canonical source)
- `dashboard/src/data/seed.ts` — all mock/seed data arrays; every page imports from here
- Key exports: MODELS, AGENTS, DATASETS, VENDORS, RISKS, BIAS_AUDITS, INCIDENTS, EVIDENCE, CONTROLS, FRAMEWORKS, POLICIES, USE_CASES, THREATS, GUARDRAIL_EVENTS, PROMPT_REGISTRY, HITL_ITEMS, TRACES, FALLBACK_LOG, DATA_GOVERNANCE, NOTIFICATION_TEMPLATES, etc.

### Key Pages (all with full CRUD)
| Page | Route | Notes |
|------|-------|-------|
| Overview | `/overview` | Executive dashboard |
| Tasks | `/tasks` | Task board + kanban |
| Prompt Registry | `/prompt-registry` | Version-controlled prompts |
| Vendor Registry | `/vendors` | CRUD + questionnaire + detail |
| Dataset Registry | `/datasets` | CRUD + detail |
| Incident Log | `/risk/incidents` | Full CRUD + workflow |
| Bias Audits | `/bias-audits` | Wizard + results |
| Evidence Sync | `/evidence-sync` | Evidence CRUD |
| Use Cases | `/use-cases` | CRUD |
| Compliance Controls | `/compliance/controls` | CRUD |
| HITL Reviews | `/hitl` | Review center + detail |
| Trust Engine | `/trust-engine` | Guardrails, traces, costs, config |
| Access Control | `/access-control` | RBAC: roles + users |
| Agent Discovery | `/agents` | + Shadow AI |

## Notes

- The app runs in degraded mode without DATABASE_URL (uses SQLite) and without REDIS_URL (in-memory circuit breaker)
- Several routers (auth, notifications, dashboard) require asyncpg/PostgreSQL to be available
- WebSocket events at `ws://localhost:8000/api/events/ws` — requires auth token; connection errors in dev are expected
- `CHAT_SAMPLES` error in AiAdvisor is a pre-existing issue unrelated to core GRC functionality
