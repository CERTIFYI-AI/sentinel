# Semgrep backlog

CI runs Semgrep in **baseline mode** (`--baseline-commit`): only findings
*introduced by a change* fail the job. The pre-existing backlog below is
tracked here and burned down separately, so the gate stays meaningful instead
of permanently red.

Snapshot: 2026-08-16 — 90 blocking findings across 21 files (run
`semgrep scan --config auto` locally for the live list).

## Fixed already (2026-08-16)

| File | Finding | Resolution |
| :--- | :--- | :--- |
| `sentinel/api/policy_router.py` | asyncpg queries with stripped `$n` placeholders (14 call sites) | Placeholders restored — these queries were genuinely broken, not just flagged |
| `sentinel/tasks/policy_review_scheduler.py` | same (3 call sites) | Placeholders restored |
| `sentinel/storage/vector_store.py` | asyncpg-sqli on pgvector literal | False positive — SQL is parameterized; the vector literal is program-generated floats. Annotated `nosemgrep` with justification |
| `supabase/functions/_shared/agentRunner.ts` | unsafe-formatstring | Constant format string (`'[%s] %s'`) |

## Remaining backlog (by file)

Owners: touch the file → burn its findings in the same PR.

- `sentinel/api/*_router.py` (agent, auth, controls, dataset, incident,
  model, risk, use_case, vendor) — mostly f-string SQL where inputs are
  server-derived; convert to parameterized queries file-by-file.
- `sentinel/auth/refresh_token.py`, `sentinel/evals/scheduler.py`,
  `sentinel/models/approval_engine.py`, `sentinel/plugins/base.py`
- `scripts/create_first_admin.py`
- `dashboard/src/hooks/useRealtimeInvalidation.ts`,
  `dashboard/src/lib/governance/agentHelpers.ts`,
  `dashboard/src/services/evalsCrud.ts`

## Rules of engagement

1. Never silence a finding without either a fix or a written justification
   (`nosemgrep` comments must carry a reason on the line above).
2. New code is held to zero findings by the CI baseline gate.
3. This file shrinks; it never grows — adding a new entry means the baseline
   gate failed at its job, so fix the code instead.
