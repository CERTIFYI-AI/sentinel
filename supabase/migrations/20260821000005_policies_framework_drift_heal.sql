-- ---------------------------------------------------------------------------
-- Policies: heal live schema drift on the framework / interlink columns.
--
-- WHY: public.policies is created by 20260418000002_core_grc_tables.sql, whose
-- CREATE TABLE already lists `framework`, `linked_frameworks` and
-- `linked_control_ids`. But that statement is CREATE TABLE IF NOT EXISTS, and on
-- environments where an older `policies` table already existed those new columns
-- were never added (Postgres skips the whole statement when the table is
-- present). The 20260419_core_grc_live_columns.sql drift-heal patched
-- policy_ref / effective_at / next_review_at onto the live table but omitted
-- these three. Result: the policy editor's write path (policyService.upsertPolicy)
-- sends `framework` and PostgREST rejects it with
--   "Could not find the 'framework' column of 'policies' in the schema cache".
--
-- This migration re-asserts every column upsertPolicy writes with
-- ADD COLUMN IF NOT EXISTS: a no-op on from-zero replay (the CREATE TABLE already
-- has them) and a heal on drifted live databases. Idempotent and safe to re-run.
-- ---------------------------------------------------------------------------

ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS framework text,
  ADD COLUMN IF NOT EXISTS linked_frameworks text[],
  ADD COLUMN IF NOT EXISTS linked_control_ids text[],
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS approver text,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS next_review_date date,
  ADD COLUMN IF NOT EXISTS acknowledgment_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Reload the PostgREST schema cache so the healed columns are visible without a
-- restart (safe no-op where the extension/role is absent).
DO $$
BEGIN
  NOTIFY pgrst, 'reload schema';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
