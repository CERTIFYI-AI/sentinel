# WS9 — Admin Seed

## Scope
Seed the "Acme Industries" demo tenant with 500+ realistic records across
every major domain, suitable for sales demos, training, and integration
testing. Fully idempotent and safe to run against production.

## Inventory (537 rows + 1 org)
| Table                  | Count |
|------------------------|------:|
| organizations          |     1 |
| demo_users             |    12 |
| user_role_bindings     |    12 |
| framework_bindings     |    22 |
| controls               |   150 |
| evidence_artifacts     |   120 |
| incidents              |    60 |
| risks                  |    80 |
| vendors                |    40 |
| training_assignments   |    40 |
| **Total (non-org)**    | **536** |

## Files
- `scripts/ws9-gen-seed.mjs` — deterministic generator (stable UUIDs)
- `supabase/migrations/20260421_ws09_seed_support.sql` — supporting tables
  (`demo_users`, `framework_bindings`, `training_assignments`) with RLS
- `supabase/migrations/20260421_ws09_seed.sql` — the seed itself

## Idempotency
- UUIDs derived from a namespaced SHA-1 (`ws9:<kind>:<key>`), so re-runs
  do not create duplicates.
- All `INSERT`s use `ON CONFLICT (id) DO NOTHING`.
- Entire file wrapped in `BEGIN; … COMMIT;` so partial failures roll back.

## Regeneration
```bash
node scripts/ws9-gen-seed.mjs
```

## Why the "support" migration
The support migration creates only tables that are purely demo-scoped
(`demo_users`, `framework_bindings`, `training_assignments`) so the seed
can run against any Sentinel environment. Production tables created by
earlier workstreams (`controls`, `evidence_artifacts`, `incidents`,
`risks`, `vendors`, `user_role_bindings`, `organizations`) are NOT
recreated — they continue to be owned by their originating migration.

## Verification
`dashboard/src/lib/__tests__/ws9-seed.test.ts` asserts: file presence,
RLS on support tables, 12 RBAC roles seeded, 22 framework bindings,
≥ 500 INSERTs, ON CONFLICT safety, and transaction wrapper.
