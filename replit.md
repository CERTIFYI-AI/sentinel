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

## Recent Changes (April 2026 — Session 4)

### Sidebar Restructure & Deduplication
- **Removed duplicates**: `Conformity` was in both Model Inventory children and Compliance — removed from Model Inventory (kept in Compliance only). `Model DNA` was in both Model Inventory children and Enterprise Intelligence — removed from Enterprise Intelligence (kept in Model Inventory only).
- **Moved Evaluations**: Moved from SECURITY section to AI GOVERNANCE (semantically correct — evals are an AI governance concern).
- **Merged Red Team Findings**: Was a standalone top-level item, now merged as a child of Security → Security > Red Team Findings.
- **Moved Risk Intelligence**: Moved from OVERVIEW to RISK & RESPONSE section.
- **Renamed**: Compliance section "Dashboard" → "Overview" to avoid label collision with OVERVIEW section's "Dashboard".
- **Evidence consolidation**: Moved Evidence Chain from Audits into Evidence children (Hub, Vault, Chain all under one parent).
- **Fixed duplicate icons**: AI Risk Classification now uses `Funnel` (was `Scales`, same as Bias Audits). GenAI Risk Profiles uses `Sparkle`. Compliance Autopilot uses `Rocket`. Consent Mgmt uses `Signature`. Energy Efficiency uses `BatteryCharging`. Gov. Framework uses `Compass`. Data Lineage uses `GitBranch`. Post-Market Surveillance uses `Pulse`. Evaluations uses `Flask`. Compliance Overview uses `ChartDonut`. Transparency Reports uses `Broadcast`. CISO Dashboard icon changed to `ShieldStar`.

## Recent Changes (April 2026 — Session 3)

### Enhanced: GuardrailActivity.tsx (`/trust-engine/guardrails`)
- Visual Rule Builder panel (collapsible) with IF/THEN condition builder
- AND condition chaining, per-field operators, action selector
- 5 pre-seeded rules (BR-001 to BR-005) with toggle/delete
- Auto-escalation toggle, SLA enforcement banner

### Enhanced: CarbonLedger.tsx (`/data/carbon`)
- Inline editable budget threshold with progress bar and over-budget warning
- 5th stat card: "At current rate" projected monthly figure
- Per-model energy efficiency score bars with color coding (green/orange/red)
- Dismissible recommendation chips with CO₂ savings estimates
- Budget reference line on trend chart

### Built: EvalResultsViewer.tsx (`/evals/results`)
- Was a "Coming Soon" placeholder — now a fully featured evaluation viewer
- Run selector (3 runs with score chips)
- Score Breakdown tab: horizontal bar chart + metric table with delta chips vs prior run
- Regression Trends tab: 6-run line chart per metric
- Failure Analysis tab: severity filter/search, failure case drill-down sheet with prompt/output/expected/judge rationale

### Fixed: App.tsx routing
- `/evals/results` was wired to QualityMetrics — now correctly wired to EvalResultsViewer
- Added `/ciso` (CisoDashboard) and `/ciso/report` (BoardReport) routes

### Enhanced: Sidebar.tsx
- Added "CISO Dashboard" with "Board Report" child to OVERVIEW section
- Added "Results Viewer" child under Evaluations section

### Enhanced: BoardReport.tsx
- PDF and PPTX generate buttons now show loading/success toast feedback (were disabled)

### Fixed: Backend
- Installed `wsproto` Python package to fix backend crash on startup

## Recent Changes (April 2026)

### Fixed: RiskDetail page (`/risk/:id`)
- Was: complete stub showing hardcoded data for a single generic risk
- Now: full implementation reading from `RISKS` seed data by ID
- Features: 6 tabs (Overview, Mitigation, Incidents, Controls, Frameworks, Activity), Risk Heat Map visualization, Treatment Progress bar, linked AI model card, Related Bias Audits, linked incidents from `INCIDENTS`, related controls from `CONTROLS`, per-risk framework mapping, per-risk activity timeline, Edit dialog

### Fixed: PolicyDetail page (`/policies/:id`)
- Was: stub with only Details tab functional; all other tabs showed placeholder text
- Now: all 6 tabs fully populated (Details, Versions, Approvals, Controls, Evidence, Audit Trail)
- Features: Framework coverage progress bar, compliance gaps, per-policy version history timeline, full approval workflow chain with statuses/comments, linked controls (with smart framework matching for ISO/IEC 42001 → EU AI Act + ISO 27001), linked evidence items, audit trail with system log entries, Edit dialog

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
- WebSocket events at `/api/events/ws` — now working via wsproto on Replit
- `CHAT_SAMPLES` error in AiAdvisor is a pre-existing issue unrelated to core GRC functionality

## Replit Migration Notes

- Python packages installed via pip (uvicorn[standard], fastapi, wsproto, etc.)
- uvicorn started with `--ws wsproto` to avoid WebSocket origin check issues on Replit's proxy
- Fixed double-prefix issue: router files in `sentinel/api/` had their own `prefix=` which conflicted with the prefix already added in `main.py`; removed the per-file prefixes so routes are correctly at `/api/auth/login`, etc.
- Both servers running: FastAPI on :8000, Vite on :5000; Vite proxies `/api` to the backend
