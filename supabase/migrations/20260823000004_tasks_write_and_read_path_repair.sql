-- ---------------------------------------------------------------------------
-- Tasks — repair the read and write paths.
--
-- WHY. The Tasks module is non-functional against the repo's own replayed
-- schema, in both directions, and both failures are invisible to the user.
--
--   READ: taskService.fetchAllTasks filters `.eq('is_deleted', false)`, but no
--   migration ever adds `is_deleted` to `tasks`. PostgREST returns
--   `42703 column tasks.is_deleted does not exist` and the service correctly
--   throws — but neither caller reads the hook's `error`, so Tasks.tsx renders
--   its "No tasks found" EmptyState and Overview.tsx renders every task KPI as
--   0 with a green "No overdue gaps" tick. A hard backend failure is presented
--   to the customer as a clean, zero-work governance queue on the front page.
--   (The UI half of this is fixed alongside; a thrown query must render an
--   error state, never an empty one.)
--
--   WRITE: `tasks.org_id` was made NOT NULL by the ws01 tenancy unify
--   (20260421000008) with no DB-side default, and the ws01 RLS template
--   installs `WITH CHECK (org_id = ...)`. taskService deliberately omits the
--   scoping column — correctly, per CLAUDE.md #3 — so every create, edit, bulk
--   status change and Kanban drag fails on the NOT NULL constraint. This is the
--   same defect class already fixed for `vendors` in 20260822000001.
--
-- Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

-- Write path: let the DB fill the scoping column, as ai_models has always done.
ALTER TABLE public.tasks ALTER COLUMN org_id SET DEFAULT current_user_org_id();

-- Read path: the soft-delete flag the service has always assumed. Tasks are
-- never hard-deleted — a remediation task is the record of how a risk was
-- closed — so the soft-delete column is the correct shape, it was simply never
-- created.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS tasks_is_deleted_idx ON public.tasks (is_deleted)
  WHERE is_deleted = false;

-- Grant explicitly rather than relying on the one-time sweep (see TD-010).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
