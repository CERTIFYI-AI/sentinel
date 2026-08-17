# WS4 — RBAC Depth, JIT Elevation, MFA

## Problem

The baseline RBAC had six flat roles and no concept of temporary,
audited privilege. Enterprise buyers require:

- Separation of duties across 10+ named functions (SOC 2 CC6.1).
- Time-bounded privileged access with approver trail (NIST AC-6(5)).
- MFA enrollment inventory with factor-type coverage reporting
  (FFIEC, ISO 27001 A.9.4).

## Solution

### Server (`supabase/migrations/20260421000018_ws04_rbac_depth.sql`)

- **`org_role_enum`** — 12 canonical roles:
  `org_admin`, `security_admin`, `compliance_officer`, `risk_manager`,
  `privacy_officer`, `auditor_internal`, `auditor_external`,
  `incident_responder`, `control_owner`, `policy_author`,
  `vendor_manager`, `viewer`.
- **`user_role_bindings`** — many-to-many (users × roles × org). All
  the WS0.1 table conventions (org_id, soft-delete, created_at, RLS,
  indexes) are present.
- **`jit_elevations`** — time-bounded privilege grants with hard
  server-side cap of 8 hours (`CHECK (expires_at <= requested_at + interval '8 hours')`).
  Statement-level trigger `ws04_jit_auto_revoke_trg` revokes expired
  grants on every write.
- **`mfa_enrollments`** — factor registry mirroring Supabase Auth
  factors. Secrets stay in Supabase Auth; this table only carries
  labels, timestamps, and factor refs for admin visibility.
- **`rbac_permissions`** — seeded permission matrix; wildcard patterns
  (`*`, `iam.*`, `read.*`) collapse the grant list.
- **`auth.has_role(text)`** and **`auth.has_permission(text)`** are
  SECURITY DEFINER helpers usable from any RLS policy. Both
  transparently honour JIT elevations.

### Client (`dashboard/src/lib/rbac.ts`)

Mirrors the server matrix. Used only for **UI gating** (hiding buttons
users cannot use). All real enforcement is server-side.

Key functions:

```ts
roleHasPermission(role, permission)
anyRoleHasPermission(roles, permission)
matchesWildcard(pattern, candidate)
```

The matrix must stay in sync with `20260421000018_ws04_rbac_depth.sql`;
tests in `dashboard/src/lib/__tests__/rbac.test.ts` cover the core
semantics.

### UI

- **`/security/jit`** → `JitElevation.tsx` — request form (react-hook-form
  + zod resolver, max 8h, min 20-char reason, ticket ref), list of
  recent requests + their state, auto-refresh after submit.
- **`/security/mfa`** → `MfaEnrollment.tsx` — factor list, coverage
  KPIs. Secrets never leave Supabase Auth.

Both pages compose `ModuleScaffold` for the uniform loading / error /
empty contract introduced in WS2.

## Audit trail

Every JIT request, approval, revocation, and MFA enrollment writes
into the `audit_log` via the WS0.3 hash-chained `*_append()` RPC
pattern. Hash drift on these rows is a breaking migration.

## Non-goals

- Pushing individual permissions onto `user_role_bindings` — users
  compose permissions by accumulating roles, not by overriding.
- Inheritance / hierarchy — intentionally flat (Fortune 500 auditors
  prefer flat maps over tree diffs).

## Integration with later workstreams

- **WS5** — Framework catalog tags controls with the roles that can
  approve evidence.
- **WS6** — `telemetry` sink will push RBAC decisions to Sentry +
  OTEL for anomaly detection on privilege spikes.
- **WS9** — Seed data will bind 12 demo users to all 12 roles for QA.
