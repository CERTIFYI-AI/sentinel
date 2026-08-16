# supabase/migrations — replay contract

Migrations apply in **lexicographic filename order** (`006_…`, `007_…`, `040_…`,
`050_…`, then `2026….sql`). Four invariants keep `supabase db reset` and the
`schema-drift` CI job green:

0. **Every file needs a unique version prefix** (the digits before the first
   `_`). The Supabase CLI records that prefix in
   `supabase_migrations.schema_migrations`, so two files sharing a bare date
   (`20260417_a.sql`, `20260417_b.sql`) abort the replay with a duplicate-key
   error. Same-day migrations use full 14-digit versions
   (`20260417000001_a.sql`, `20260417000002_b.sql`). Rollback scripts live in
   `_rollbacks/` — never in this directory, or a from-zero replay would apply
   them as forward migrations.

1. **Never reference a table before the file that creates it.** If you must
   extend a table that appears later in the order, guard the statement with
   `to_regclass('public.<table>')` and re-apply it idempotently in a
   later repair migration (pattern: `20260817_replay_repair.sql`).
2. **Everything must be idempotent** (`IF NOT EXISTS`, `CREATE OR REPLACE`,
   `ON CONFLICT DO NOTHING`), because files are also applied to the live
   project out-of-band via the Supabase MCP.

## The baseline gap (read before going public)

Historically, many tables were created directly on the live project and never
committed here. `007_replay_baseline.sql` recreates them (derived from later
migrations + the service layer) so a from-zero replay completes, but it is an
**approximation** of the live schema, not a dump.

Before open-sourcing / when you next have live access, replace it with the
real thing:

```bash
supabase db dump --linked -f supabase/migrations/<ts>_live_baseline.sql
# then delete 007_replay_baseline.sql in the same commit and re-run:
supabase db reset   # must complete cleanly
```

## Verifying a change

```bash
supabase db reset          # full from-zero replay (needs Docker)
# or statically, no Docker:
python3 scripts/check_migration_replay.py
```

`scripts/check_migration_replay.py` simulates the replay order and fails on
forward references — CI runs it as part of the `drift` job.
