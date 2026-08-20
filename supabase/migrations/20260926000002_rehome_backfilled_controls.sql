-- Why: 20260926000001 backfilled 632 posture controls from the catalog with
-- coalesce(fc.org_id, demo-org), but the catalog rows carried the all-zeros
-- "global" org id (00000000-0000-0000-0000-000000000000) rather than NULL,
-- so the coalesce kept it. RLS on `controls` scopes to the caller's org, so
-- the real tenant still saw only its original 385 controls — the UI count
-- never moved. Re-home those rows to the platform tenant.
--
-- Guarded to touch only the backfilled population (all-zeros org AND status
-- 'not_implemented' — the backfill's fixed status) so a genuine future
-- "global" row, if that pattern is ever introduced deliberately, is not
-- swept up. Idempotent: after the first run the predicate matches nothing.

update public.controls
   set org_id = '00000000-0000-0000-0000-000000000001'::uuid
 where org_id = '00000000-0000-0000-0000-000000000000'::uuid
   and status = 'not_implemented';
