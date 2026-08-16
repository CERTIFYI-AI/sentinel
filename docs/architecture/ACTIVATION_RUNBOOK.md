# Sentinel Activation Runbook

Step-by-step to go from static UI → fully functional Supabase-backed application.

## Pre-flight
- Supabase project exists (we have `vhparvughsygyknblkzt`)
- `dashboard/.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Supabase CLI installed (`npm i -g supabase`)

## Step 1 — Link and push migrations
```bash
cd ~/sentinel
supabase login
supabase link --project-ref vhparvughsygyknblkzt
supabase db push
```
This applies every migration in `supabase/migrations/` including:
- Prior migrations (core_grc_tables, frameworks_schema, risk_schema_v2, model_schema_v2, task_schema_v2, custom_roles, add_tenant_id)
- New activation migration `20260420160001_functional_integration.sql` (creates 31 missing tables with RLS + realtime + audit triggers)
- New seed `20260420160002_functional_seed.sql` (2 demo rows per table)

## Step 2 — Generate types (optional, already committed)
```bash
supabase gen types typescript --project-id vhparvughsygyknblkzt --schema public > dashboard/src/types/database.ts
```

## Step 3 — Seed additional data (optional)
```bash
supabase db seed --file all_controls_seed.sql
supabase db seed --file data/sentinel-seed-data.sql
```

## Step 4 — Verify in dashboard
1. `cd dashboard && npm install && npm run dev`
2. Visit `/overview`, `/risks`, `/policies`, `/controls`, `/incidents`, `/red-team`, `/vendors`, etc.
3. Every list should render seeded rows.
4. Create/update/delete — watch Realtime update the UI instantly (useRealtimeInvalidation).
5. Every write is auto-audited to `audit_log` via `fn_audit_trigger`.

## Step 5 — Auth onboarding
- Sign up a user in `/auth/register` (uses Supabase Auth).
- After email confirm, insert a row into `user_profiles` linking `auth.users.id` → `organizations.id`.
- `get_org_id()` then returns the correct tenant for every RLS policy.

## Rollback
Each table is additive and guarded by `if not exists`; migrations are idempotent. To roll back a specific table:
```sql
drop table if exists public.<table> cascade;
```

## What this activation enables
- **Model Inventory, Risk Register, Incidents, Policies, Controls, Evidence**: full CRUD, live Realtime, auto-audit.
- **Red Team, Bias, Guardrails, HITL, Approvals**: runtime event capture + UI sync.
- **Privacy (DSR, Consent, RoPA), Vendors, Security (scans/threats/vuln), Compliance Calendar, Training, Ethics, ESG**: persistence + multi-tenant isolation.
- **Universal audit log**: every write on critical tables appends to `audit_log`.
- **Notifications**: `pg_notify('sentinel.incidents', ...)` + Realtime subscription.

## Non-goals
- No UI redesign, color, or Outfit-font changes.
- No breaking schema changes; all DDL is additive.
- No credentials captured here — use `supabase secrets set`.
