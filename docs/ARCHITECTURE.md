# Architecture

## System Overview

Sentinel is a multi-layer web application with a React frontend, Supabase PostgreSQL backend, Cloudflare Workers edge deployment, and a Python microservice layer for compute-intensive operations.

```
Browser -> Cloudflare Workers -> React SPA
                              -> Supabase (auth, data, realtime)
                              -> Python Backend (bias analysis, ML ops)
                              -> Node.js Server (webhook relay, integrations)
```

## Frontend Architecture

### State Management

Two distinct concerns, two tools:

- **Server state:** TanStack Query. All Supabase data. Automatic background refresh, optimistic updates, cache invalidation.
- **Client state:** Zustand. UI state, auth session, user preferences. Never use Zustand for server data.

### Data Layer

```
Page Component
    -> React Query Hook (hooks/queries/*.ts)
    -> API Service (api/*.ts)
    -> Supabase Client (lib/supabase.ts)
    -> Mock Data (data/*.ts) [fallback]
```

Every API function implements the fallback pattern: if Supabase is unavailable, mock data is returned seamlessly.

### Component Structure

```
src/
  components/
    ui/              # Primitive: Button, Badge, Card, Modal, DataTable
    layout/          # AppLayout, Sidebar, TopBar
    {module}/        # Module-specific: VendorScorecard, RiskMatrix
  pages/             # Route-level components (thin orchestrators)
  hooks/
    queries/         # React Query hooks (one per entity type)
  api/               # Supabase service layer (one file per table group)
  stores/            # Zustand stores (one per domain)
  lib/               # Supabase client, utilities, type helpers
  data/              # Mock/seed data (used as fallback)
  types/             # TypeScript interfaces and type aliases
```

## Database Architecture

### Multi-Tenancy

Every table includes `org_id`. Row Level Security enforces isolation at the database layer. No application-layer org filtering is trusted as a security control.

### Immutable Records

`audit_log` and `evidence_chain` have insert-only RLS policies. No UPDATE or DELETE policy exists.

### Evidence Chain

Each compliance action creates a chained hash entry:

```
entry[n].chain_hash = SHA256(entry[n].payload_hash + entry[n-1].chain_hash)
```

Chain integrity can be verified offline with the exported manifest.

### Realtime

Supabase Realtime subscriptions are active on: `notifications`, `guardrail_events`, `hitl_reviews`, `live_traces`. React Query cache is invalidated via `useRealtimeInvalidation()` mounted at the app root.

## Deployment

The frontend is deployed as a static site via Cloudflare Workers. The `wrangler.jsonc` configures routes, KV bindings, and environment variables.

| Variable | Required | Description |
|----------|----------|------------|
| VITE_SUPABASE_URL | Yes | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Yes | Supabase anonymous key (public) |

The service role key is never exposed to the frontend.
