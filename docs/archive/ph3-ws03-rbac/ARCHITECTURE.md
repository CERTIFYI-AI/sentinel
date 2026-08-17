# Phase 3 — WS0.3 · RBAC Surface

_Status: Shipped · Branch `feat/ph3-ws03-rbac` · Depends on WS0.1, WS0.2_

## Problem

WS0.4 (`20260421000018_ws04_rbac_depth.sql`) already landed the Postgres RBAC
primitives: `org_role_enum`, `user_role_bindings`, `jit_elevations`,
`rbac_permissions`, `auth.has_role(text)`, `auth.has_permission(text)`,
and a JIT auto-expiry trigger. What was missing:

1. A **single canonical permission catalog** shared by dashboard + Workers
   so TypeScript consumers cannot typo-propagate a permission string that
   does not exist in Postgres.
2. A **client-side `usePermissions()` / `<Can>` / `<ProtectedRoute>`**
   surface so pages can gate UI consistently without each one importing
   its own Supabase client and RPC call.
3. A **Workers `withRBAC()` middleware** that delegates authorisation
   decisions to Postgres (`has_permission()`) under the caller's JWT,
   never trusting JWT claims for authorisation on mutating endpoints.
4. A **dashboard-side RPC (`current_user_permissions`)** returning the
   caller's (grants, roles) so the client cache can populate once per
   session and wildcard matcher can short-circuit subsequent checks.

## Non-goals

- Changing the 12-role taxonomy (done in WS0.4).
- Adding new resources — catalog reflects current modules only.
- Per-record (row-level) authorisation beyond RLS — row filtering is
  enforced by the RLS policies installed in WS0.2.

## Architecture

### Data flow

```
┌─────────────────────────┐            ┌──────────────────────────┐
│ dashboard (React)       │            │ workers (Cloudflare)     │
│                         │            │                          │
│  usePermissions()       │            │  withTenant()            │
│    └─ rpc(              │            │    └─ decodes JWT        │
│        current_user_    │            │                          │
│        permissions)     │            │  withRBAC(required)      │
│           ↓             │            │    └─ POST /rest/v1/rpc/ │
│        (grants, roles)  │            │        has_permission    │
│           ↓             │            │        as caller         │
│  <Can permission="…">   │            │           ↓              │
│  <ProtectedRoute>       │            │      true → handler      │
│                         │            │      false → 403         │
└─────────────────────────┘            └──────────────────────────┘
          ↑                                       ↑
          └──────────── shared catalog ───────────┘
                 packages/rbac/permissions.ts
                 (perm, RESOURCES, permissionMatches)
```

### Trust model

| Layer       | Trusts                                               | Never trusts                          |
|-------------|------------------------------------------------------|---------------------------------------|
| Dashboard   | `current_user_permissions` RPC (scoped to caller)    | JWT app_metadata for authorisation    |
| Worker      | PG `has_permission()` under caller JWT               | Own cache; JWT role claims            |
| Postgres    | `auth.uid()`, `auth.current_org_id()`, RLS           | Anything passed in the function body  |

**Defence in depth.** The dashboard hides UI. The Worker blocks the
request. Postgres RLS blocks the row even if both are bypassed.

## Files

| Path                                                                 | Purpose                                                               |
|----------------------------------------------------------------------|-----------------------------------------------------------------------|
| `packages/rbac/permissions.ts`                                       | Catalog: `RESOURCES`, `PERMISSION_ACTIONS`, `perm()`, `permissionMatches()`, `hasPermission()`, `CANONICAL_ROLES`. |
| `dashboard/src/lib/rbac/index.ts`                                    | Barrel: `usePermissions`, `<Can>`, `<CanAny>`, `<ProtectedRoute>`, `can()`. Re-exports legacy roles matrix from `./roles`. |
| `dashboard/src/lib/rbac/roles.ts`                                    | Legacy static role→permission matrix (preserved for `JitElevation.tsx` + existing tests). |
| `workers/middleware/withRBAC.ts`                                     | `withRBAC()` factory + `authorize()` composition helper. 3s timeout, fail-closed. |
| `supabase/migrations/20260421000016_ws03_current_user_permissions.sql`     | RPC returning (grants, roles) scoped to caller's org.                 |

## Semantics

### Wildcard matching

`permissionMatches(granted, required)` — identical in TS and PG:

- `*` → matches anything.
- `<resource>.*` → prefix match with the trailing dot (so `iam.*` matches
  `iam.users.create` but not `iama.read`).
- otherwise exact string equality.

### Permission composition

`perm(RESOURCES.risk, "update")` → `"risk.update"`. Typesafe — TS
rejects references to resources / actions that are not in the catalog.

### Client cache

`usePermissions()` is backed by TanStack Query with:

- `staleTime: 5 min` — grants rarely change mid-session.
- `gcTime: 30 min` — survives route changes.
- `retry: 1` — one retry on transient errors; otherwise fail-closed.

### Worker middleware

`withRBAC({ supabaseUrl, anonKey, timeoutMs?, rpcName? })(request, ctx, required)`:

- Rejects `403 missing_token` when Authorization header absent.
- Calls `POST {supabaseUrl}/rest/v1/rpc/has_permission` with the caller's
  bearer token so PostgREST runs the check under the caller's identity.
- `AbortController` + timeout (default 3000ms). Fails closed on timeout.
- Never echoes the required permission string in any error payload.

## Security invariants

1. **Fail-closed.** Every error path returns `403`. No path returns 2xx
   on missing/expired token or RPC failure.
2. **Opaque codes.** Denial responses include `code` in
   `{missing_token, policy_denied, check_timeout, check_error}` — never
   the name of the required permission.
3. **No client-side authority.** `<Can>` hides UI; the truth lives in
   PG. A user who tampers with client code still hits 403 at the edge
   and RLS in the DB.
4. **Per-org scoping.** `current_user_permissions()` reads
   `auth.current_org_id()` so the returned grants reflect the caller's
   active tenant, not all tenants they may belong to.
5. **JIT-aware.** Active elevations (approved + not expired + not
   revoked) are unioned into the returned role set so just-in-time
   grants take effect immediately.

## Tests

| File                                                              | Covers                                                             |
|-------------------------------------------------------------------|--------------------------------------------------------------------|
| `dashboard/src/lib/__tests__/rbac-catalog.test.ts`                | catalog shape, `perm()`, `permissionMatches()`, `hasPermission()`. |
| `dashboard/src/lib/__tests__/rbac-components.test.tsx`            | `<Can>` / `<CanAny>` / `<ProtectedRoute>` — success, deny, loading, error. |
| `workers/middleware/__tests__/withRBAC.test.ts`                   | 403 missing token, 200 allow, 403 deny/timeout/error, request shape, opacity of error payloads. |

## Gherkin acceptance

```gherkin
Feature: RBAC surface

  Scenario: UI hides buttons a user may not click
    Given a user bound to role "viewer"
    And the current org has their role grants synced
    When the user visits /risk
    Then they see the "Risk Register" list
    But the "Delete" button is not rendered

  Scenario: Worker blocks a forbidden mutation
    Given a user bound to role "viewer"
    When the client sends POST /api/risk with a valid JWT
    Then the edge responds 403 with code "policy_denied"
    And the response body does NOT contain the permission string

  Scenario: JIT elevation is honoured without a session reset
    Given a "risk_manager" with an approved JIT to "incident_responder"
    When usePermissions() refetches
    Then the returned roles include "incident_responder"
    And <Can permission="incidents.update"> renders its children
```

## Rollback

```bash
# 1. Revert the RPC.
supabase db execute <<'SQL'
  DROP FUNCTION IF EXISTS public.current_user_permissions();
SQL

# 2. Revert the code (git).
git revert <WS03-merge-commit>
```

The role bindings, `rbac_permissions` table, and JIT elevation machinery
(all from WS0.4) are untouched by this workstream and do not roll back.

## Follow-ups

- WS0.4 audit chain will wrap every `withRBAC`-gated handler in
  `withAudit()` so permission denials are themselves auditable.
- WS0.6 error boundary will unify the `/403` page with consistent
  telemetry (permission codes are logged; permission strings are not).
