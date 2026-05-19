# Sentinel AI GRC

Enterprise AI governance, risk and compliance dashboard — built for teams responsible for safe, compliant AI deployment at scale.

## Run & Operate

- `pnpm --filter @workspace/sentinel run dev` — run the Sentinel dashboard (port 18756, preview at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- Demo login: `admin@sentinel-grc.com` / `Demo@12345` (CISO) or `auditor@sentinel-grc.com` / `Demo@12345` (Auditor)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Tailwind CSS v4, React Router v6
- State: Zustand v4 (with persist middleware)
- DB/Auth: Supabase (optional — demo mode works without it)
- UI: Radix UI primitives, Lucide icons, Recharts, Sonner toasts

## Where things live

- `artifacts/sentinel/src/` — all React source
  - `pages/` — route-level page components (lazy loaded)
  - `components/` — shared UI components
  - `store/` — Zustand stores (authStore, eventStore, etc.)
  - `stores/` — additional Zustand stores (settingsStore, policyStore, etc.)
  - `hooks/` — React hooks
  - `lib/` — utilities, Supabase client, framework catalog loader
  - `providers/` — ThemeProvider, SupabaseAuthListener
  - `context/` — TenantContext
  - `agents/` — 27 autonomous governance agents (registered on boot)
- `artifacts/sentinel/frameworks/` — compliance framework YAML files + manifest.json
- `artifacts/sentinel/src/styles/globals.css` — Tailwind v4 CSS variable tokens

## Architecture decisions

- Login/Signup/ForgotPassword are eagerly imported (not lazy) to avoid Suspense skeleton flash on initial page load
- `loading` state in authStore starts as `false`; `loading === true` guard (not just truthy) prevents skeleton on undefined
- Demo auth bypass in authStore.login() — no Supabase required for CISO/Auditor demo accounts
- `stores/` and `store/` are both present: `store/` has auth/event/rbac stores; `stores/` has settings/policy/useCase stores
- `frameworks/manifest.json` imported via relative path `../../frameworks/manifest.json` from `src/lib/frameworks.ts` (not 3 levels up)

## Product

- AI governance dashboard with 27 autonomous agents
- Compliance automation: EU AI Act, NIST AI RMF, ISO 42001, GDPR, SOC 2
- Risk register, audit log, evidence vault, policy management
- Security scanning, bias auditing, model inventory
- Real-time event streaming via WebSocket (EventStore)
- Multi-tenant architecture (TenantContext, orgId-based)

## Gotchas

- WebSocket errors to `/api/events/ws` are expected in dev — the API server doesn't implement WebSocket, EventStore retries with backoff
- Supabase RLS blocks unauthenticated calls — expected warnings in console when not logged in
- Vite dep optimization may cause full reloads during first load — pages appear as skeleton briefly
- `stores/stores/` nested directory exists (copy artifact) — safe to ignore, not imported anywhere

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
