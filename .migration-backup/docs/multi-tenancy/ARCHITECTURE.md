<!--
  Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
  See LICENSE for details.
-->

# Multi-Tenancy Architecture (WS0.1)

**Status:** GA baseline — landed in `feat/ws01-multitenancy`.
**Owner:** Platform / Foundations.
**Last reviewed:** 2026-04-21.

This document is the source of truth for how Sentinel isolates data
between customer organizations ("orgs"). Every engineer writing a new
table, query, route, or UI must read it.

## 1. Tenancy Model

Sentinel is a **pool model, single database** SaaS. All tenants share
one Postgres instance; rows are scoped by a required `org_id uuid`
column that FK's to `public.organizations(id)`. Isolation is enforced
in **three concentric layers**:

| Layer | Mechanism | Failure mode if omitted |
|-------|-----------|--------------------------|
| **L1 — Network** | Supabase project boundary, VPC, TLS | None (always on) |
| **L2 — Row Level Security** | `auth.current_org_id()` + RLS policies on every tenant-scoped table | **Cross-tenant read/write** — P0 data breach |
| **L3 — Application** | `useTenant()` / `withTenant()` / `assertSameTenant()` | **Wrong-tenant UI**, logic bugs surface to user |

L2 is the authoritative boundary. L3 exists to catch bugs early and
give a clear stack trace when they happen, but a compromise of L3
**does not** compromise L2.

## 2. Canonical Column

Every tenant-scoped table **must** declare:

```sql
org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT
```

- Name: `org_id` (snake_case, singular). Never `organization_id`,
  `tenant_id`, `org`, `tenantId`, `workspace_id`.
- Type: `uuid`. Never `text`.
- Nullability: `NOT NULL`. Orphan rows from before Phase A were moved
  into a sentinel "Default Organization" (`00000000-0000-0000-0000-000000000000`)
  so `NOT NULL` holds universally.
- FK: `organizations(id) ON DELETE RESTRICT`. We never cascade-delete
  tenant data; offboarding is a documented procedure (see
  `DBA_RUNBOOK.md` §4).
- Index: `(org_id, created_at DESC)` minimum; add more composites as
  query patterns emerge.

Global catalogs that intentionally cross tenants keep **no** `org_id`:
`organizations`, `tenants` (legacy), `policy_templates`,
`framework_sections`, `maturity_dimensions`.

## 3. JWT Claim Flow

```
┌─────────────┐   login    ┌──────────────┐   app_metadata   ┌──────────┐
│ Browser     │───────────▶│ Supabase Auth│─────────────────▶│ Postgres │
│ (React)     │◀───────────│  + GoTrue    │◀──  RLS check  ──│  (RLS)   │
└─────────────┘  JWT       └──────────────┘   auth.jwt()     └──────────┘
       │                         ▲
       │  switchOrg()            │ updateUserById()
       ▼                         │
┌──────────────────┐    ┌─────────────────────┐
│ set-active-org   │───▶│  service_role key   │
│ edge function    │    │  (server-only)      │
└──────────────────┘    └─────────────────────┘
```

1. Supabase Auth signs a JWT whose `app_metadata.org_id` is the user's
   active organization.
2. Postgres `auth.current_org_id()` reads that claim:
   - First: `(auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid`
   - Fallback: top-level `org_id` claim
   - Fallback: `user_profiles.org_id` for callers whose JWT was issued
     before the claim existed (legacy sessions — burned off by 14-day
     JWT TTL).
3. Every RLS policy uses `auth.current_org_id()` to scope rows.

## 4. Switching Orgs

A user who belongs to multiple orgs can switch via `<OrgSwitcher/>`:

1. Browser calls `supabase.functions.invoke('set-active-org', { body: { org_id } })`.
2. The edge function (`supabase/functions/set-active-org`) validates
   membership against `user_roles` using the service-role key, then
   writes `app_metadata.org_id`.
3. Browser calls `supabase.auth.refreshSession()` — the new JWT carries
   the new claim.
4. TanStack Query cache is **cleared entirely** (`queryClient.clear()`),
   forcing every visible query to refetch under the new tenant.

**Why not a query param?** A URL-based tenant is trivial to swap and
creates IDOR risk; the JWT is the only source of truth.

## 5. The Five-Policy RLS Template

Every tenant-scoped table receives the same five policies, generated
by `20260421_ws01_tenancy_phase_c_rls_template.sql`:

| Policy name | Operation | Predicate |
|---|---|---|
| `ws01_org_read` | SELECT | `org_id = auth.current_org_id()` |
| `ws01_org_insert` | INSERT (WITH CHECK) | `org_id = auth.current_org_id()` |
| `ws01_org_update` | UPDATE | read/write both scoped |
| `ws01_org_delete` | DELETE | `org_id = auth.current_org_id()` |
| `ws01_service_all` | ALL | `auth.role() = 'service_role'` |

The service-role policy exists so edge functions, cron jobs, and the
governance dispatcher can operate cross-tenant **with explicit intent**.
Service-role code must always set `org_id` explicitly; it is never a
default.

## 6. Frontend Contract

- `<TenantProvider>` is mounted once, inside the active
  `QueryClientProvider` in `App.tsx`. Do not add a second one.
- Components read tenancy via `useTenant()` (safe) or
  `useRequiredOrgId()` (throws if `status !== 'ready'`, use inside
  routes behind `ProtectedLayout`).
- No component should read `user.tenant`, `user.tenantId`, or any
  metadata field directly. `useAuth()` delegates to `useTenant()` for
  backwards compatibility and will be removed in WS4.
- New forms must call `assertSameTenant()` before submitting records
  that reference foreign rows, catching dev-time mistakes before they
  hit the RLS wall.

## 7. Backend (Workers) Contract

- Every Worker route that touches tenant data must wrap its handler
  in `withTenant()` from `workers/middleware/withTenant.ts`.
- The middleware verifies the HS256 JWT signature against
  `env.SUPABASE_JWT_SECRET`, checks `iss`, `exp`, `nbf`, `sub`, and
  `app_metadata.org_id`, and attaches a typed `TenantClaims` object to
  the request.
- Handlers derive the Supabase client from that claims bundle and
  **must not** accept `org_id` from request bodies or query strings.

## 8. Quarantine of Legacy Tables

26 PascalCase Prisma leftover tables (RLS enabled, zero policies, zero
reads in 180 days) have been renamed to `_deprecated_<Name>` and
replaced with empty views. Removing them entirely is tracked as a
follow-up in WS0.6 because they still appear in the automated schema
diff baseline.

## 9. Known Gaps (Tracked)

- **WS0.2 — SSO:** SAML/OIDC identity providers will need to inject
  `app_metadata.org_id` from group claims; the edge function contract
  already supports that.
- **WS4 — RBAC depth:** `user_roles` currently drives membership only;
  per-role row filters within an org are stubbed for WS4.
- **WS6 — Observability:** cross-tenant query counters (to detect
  accidental service-role cross-reads) are a WS6 deliverable.

See `DBA_RUNBOOK.md` for operational procedures.
