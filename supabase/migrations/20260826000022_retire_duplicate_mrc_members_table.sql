-- ---------------------------------------------------------------------------
-- 20260826000022_retire_duplicate_mrc_members_table.sql
--
-- Retire the duplicate Model Risk Committee roster table.
--
-- WHY. Two sessions working this repo in parallel independently moved the MRC
-- roster off the `modelriskcommittee_table` demo table. This branch created
-- `public.mrc_members`; main shipped `public.mrc_committee_members`
-- (20260825000003), which additionally carries a real `user_id` FK into
-- `user_profiles` — so a committee member is a person in the org directory
-- rather than a typed-in string, and quorum is counted from records that can
-- be traced to real people. main's is canonical and is what the merged UI
-- reads; keeping both would leave two answers to "who is on the committee",
-- which is exactly the drift the one-id-space rule exists to prevent.
--
-- The rows are carried across BEFORE the drop so a tenant's existing roster is
-- preserved rather than silently lost. `user_id` is resolved by matching the
-- directory's full_name; where no person matches it stays NULL and the name
-- survives as the display label. Nothing is invented — an unresolved member
-- renders as a plain name, not a fabricated directory link.
--
-- Idempotent: the INSERT is guarded by NOT EXISTS, and DROP ... IF EXISTS is a
-- no-op once the table is gone.
-- ---------------------------------------------------------------------------

DO $mrc_retire$
BEGIN
  IF to_regclass('public.mrc_members') IS NULL THEN
    RAISE NOTICE 'mrc_members already retired; nothing to carry across';
    RETURN;
  END IF;

  INSERT INTO public.mrc_committee_members
    (org_id, user_id, member_name, committee_role, department, is_chair, counts_toward_quorum)
  SELECT m.org_id,
         up.id,
         m.name,
         coalesce(m.role, 'Committee Member'),
         m.department,
         coalesce(m.is_chair, false),
         coalesce(m.counts_toward_quorum, true)
  FROM public.mrc_members m
  LEFT JOIN public.user_profiles up
         ON up.org_id = m.org_id AND up.full_name = m.name
  WHERE coalesce(m.is_active, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.mrc_committee_members x
       WHERE x.org_id = m.org_id AND x.member_name = m.name
    );

  DROP TABLE public.mrc_members;
END $mrc_retire$;

-- Applied live 2026-08-18: 7 roster rows carried across (1 resolved to the
-- directory, 6 retained as display labels), mrc_members dropped.
