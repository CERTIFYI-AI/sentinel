-- ---------------------------------------------------------------------------
-- 20260825000001_last_demo_table_retirement.sql
--
-- TD-001, final wave. The last five modules reading a generic
-- `<name>_table (id, doc jsonb)` demo table — Asset Registry, Business Impact
-- Analysis, Identity Governance, Model Risk Committee and Reporting — are
-- repointed at the real, org-scoped tables that already existed and had never
-- been read:
--
--   pages/AssetManagement.tsx    assetmanagement_table    -> assets
--   pages/BIA.tsx                bia_table                -> bia_records
--   pages/IGA.tsx                iga_table                -> access_reviews
--   pages/ModelRiskCommittee.tsx modelriskcommittee_table -> mrc_meetings /
--                                                           mrc_agenda_items /
--                                                           mrc_votes
--   pages/reporting/Reporting.tsx reporting_table         -> security_reports /
--                                                           security_report_runs
--
-- WHY THIS MIGRATION EXISTS AT ALL. The core of every one of those five is
-- already in the schema; nothing here creates a competing table for data that
-- has a home. What is genuinely missing is the *interlink* surface — the
-- columns that let a record say which governed entity it is about — plus one
-- table for MRC committee membership, which has never had a real home and was
-- being kept in the demo table's jsonb.
--
-- The demo `*_table` rows are NOT dropped here: other environments may still
-- hold rows, and dropping them would destroy data a tenant could still want to
-- export. They simply stop being read. Their retirement is recorded in
-- docs/reference/technical-debt.md (TD-001).
--
-- Idempotent; safe to re-run. Every new object carries RLS and an explicit
-- GRANT — see 20260823000001_grant_default_privileges.sql for why grants are
-- written out rather than assumed.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. assets -> vendors.
--
-- WHY. `assets.vendor` is free text. An asset register whose supplier is a
-- string cannot answer "which assets does this vendor touch?", which is the
-- question a third-party incident actually asks. The id column makes the link
-- resolvable in both directions; the legacy text column is left in place so no
-- existing row loses its value.
-- ---------------------------------------------------------------------------
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS assets_vendor_idx ON public.assets(vendor_id);
CREATE INDEX IF NOT EXISTS assets_entity_idx ON public.assets(entity_type, entity_id);

COMMENT ON COLUMN public.assets.vendor_id IS
  'vendors.id of the supplier. Resolved to the vendor name at render time; the legacy free-text `vendor` column is display-only.';

-- ---------------------------------------------------------------------------
-- 2. access_reviews -> the system under review.
--
-- WHY. `access_reviews` records who reviewed whom (reviewer_id,
-- subject_user_id) but never what access was being certified. A SOC 2 CC6.3 /
-- ISO 27001 A.5.18 review that cannot name the system it certified is not
-- evidence of anything. Both links are nullable: an org-wide certification
-- legitimately names no single system, and NULL is the honest state there.
-- ---------------------------------------------------------------------------
ALTER TABLE public.access_reviews
  ADD COLUMN IF NOT EXISTS linked_model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS access_reviews_model_idx ON public.access_reviews(linked_model_id);
CREATE INDEX IF NOT EXISTS access_reviews_asset_idx ON public.access_reviews(linked_asset_id);

COMMENT ON COLUMN public.access_reviews.linked_model_id IS
  'ai_models.id of the AI system whose access this review certifies. NULL when the review is not system-specific.';
COMMENT ON COLUMN public.access_reviews.linked_asset_id IS
  'assets.id of the asset whose access this review certifies. NULL when the review is not asset-specific.';

-- ---------------------------------------------------------------------------
-- 3. security_reports -> the governed entity a report covers.
--
-- WHY. A report definition names the registers it snapshots (`sections`) but
-- could not be scoped to one model, so a model detail page had no way to reach
-- the reports written about it. `linked_model_id` closes that loop and drives
-- the `?model=<uuid>` deep link on /reporting.
-- ---------------------------------------------------------------------------
ALTER TABLE public.security_reports
  ADD COLUMN IF NOT EXISTS linked_model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS security_reports_model_idx ON public.security_reports(linked_model_id);

COMMENT ON COLUMN public.security_reports.linked_model_id IS
  'ai_models.id this report definition is scoped to. NULL for org-wide reports.';

-- ---------------------------------------------------------------------------
-- 4. mrc_committee_members — the one genuinely missing table.
--
-- WHY. Quorum is the only thing that makes an MRC vote binding under SR 11-7
-- §IV.C, and quorum is computed from the committee roster. That roster lived
-- in `modelriskcommittee_table (id, doc jsonb)`: no tenant column, no RLS, no
-- link to the user directory, seeded from seven hardcoded names in the page
-- file. Every quorum badge the product has ever rendered was therefore
-- computed from fiction.
--
-- `user_id` is the link into `user_profiles`, so a member is a real person in
-- the org directory rather than a typed-in string. `member_name` is a
-- denormalised display label kept only so a roster survives a directory row
-- being removed; the id is the source of truth.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mrc_committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  member_name text NOT NULL,
  committee_role text NOT NULL DEFAULT 'Committee Member',
  department text,
  is_chair boolean NOT NULL DEFAULT false,
  counts_toward_quorum boolean NOT NULL DEFAULT true,
  appointed_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mrc_committee_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mrc_committee_members_org_all ON public.mrc_committee_members;
CREATE POLICY mrc_committee_members_org_all ON public.mrc_committee_members
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

DROP POLICY IF EXISTS mrc_committee_members_service_role_all ON public.mrc_committee_members;
CREATE POLICY mrc_committee_members_service_role_all ON public.mrc_committee_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS mrc_committee_members_user_idx ON public.mrc_committee_members(user_id);

-- Explicit grants: the one-time sweep in functional_integration cannot reach a
-- table created here, and the default-privileges rule only holds for roles that
-- existed when it was installed. Stating it is cheaper than debugging
-- "permission denied" on a self-hosted replay.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mrc_committee_members TO authenticated;
GRANT ALL ON public.mrc_committee_members TO service_role;

COMMENT ON TABLE public.mrc_committee_members IS
  'Model Risk Committee roster. Quorum (SR 11-7 §IV.C) is counted from rows with counts_toward_quorum = true. Replaces the modelriskcommittee_table demo table.';

-- ---------------------------------------------------------------------------
-- 5. MRC model interlink: one id-space, enforced.
--
-- WHY (found on the from-zero replay, 2026-08-25). The MRC seed
-- (20260813000015_seed_aiia_modules.sql) wrote model uuids that exist in no
-- `ai_models` row. Measured on the replayed database:
--
--   select 'agenda_items', count(*) total, count(m.id) resolves
--   from mrc_agenda_items a left join ai_models m on m.id = a.model_id::uuid
--   union all select 'votes', count(*), count(m.id)
--   from mrc_votes v left join ai_models m on m.id = v.model_id;
--   -- agenda_items | 4 | 0
--   -- votes        | 8 | 0
--
-- 0 of 12 resolved. The tables also carry denormalised `model_name` /
-- `agenda_item_title`, so the committee page *looked* correct — every model
-- pill rendered a plausible name while the link behind it went nowhere. That
-- is the worst shape a broken interlink can take: it is invisible.
--
-- Two causes, both fixed here:
--   (a) `mrc_agenda_items.model_id` was `text` with no foreign key, so any
--       string at all was a legal model reference. It becomes `uuid` with a
--       real FK, matching `mrc_votes.model_id`. After this, a fabricated id
--       cannot be written again — the database rejects it.
--   (b) the seeded ids themselves. They are re-resolved by model name at apply
--       time (the 20260824000001 pattern) and set to NULL when the name does
--       not resolve. NULL is the honest state; nothing is invented, and the UI
--       renders "Unavailable" rather than a stale label.
--
-- Order matters: convert the type, repair the data, *then* constrain. Adding
-- the FK first would abort on exactly the rows this exists to fix.
-- ---------------------------------------------------------------------------

-- (a) mrc_agenda_items.model_id: text -> uuid. Non-uuid-shaped values become
--     NULL rather than aborting the cast; there is no correct uuid to invent
--     for a free-text model reference.
DO $mrc_type$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mrc_agenda_items'
      AND column_name = 'model_id' AND data_type <> 'uuid'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.mrc_agenda_items
        ALTER COLUMN model_id TYPE uuid
        USING CASE
          WHEN model_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN model_id::uuid ELSE NULL END
    $sql$;
  END IF;
END $mrc_type$;

-- (b) Re-resolve every model reference against the real registry, by the name
--     the row already carries. A name that does not resolve leaves NULL.
DO $mrc_reheal$
BEGIN
  UPDATE public.mrc_agenda_items a
  SET model_id = m.id
  FROM public.ai_models m
  WHERE m.name = a.model_name
    AND (a.org_id IS NULL OR m.org_id IS NULL OR m.org_id = a.org_id)
    AND (a.model_id IS NULL OR a.model_id <> m.id);

  UPDATE public.mrc_agenda_items a
  SET model_id = NULL
  WHERE a.model_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ai_models m WHERE m.id = a.model_id);

  -- Votes carry their own model_id; re-resolve through the agenda item they
  -- belong to, which is the authoritative statement of what was voted on.
  UPDATE public.mrc_votes v
  SET model_id = a.model_id
  FROM public.mrc_agenda_items a
  WHERE a.id = v.agenda_item_id
    AND v.model_id IS DISTINCT FROM a.model_id;

  -- Any vote with no agenda item to inherit from, still pointing at a
  -- non-existent model, is nulled rather than left dangling.
  UPDATE public.mrc_votes v
  SET model_id = NULL
  WHERE v.model_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ai_models m WHERE m.id = v.model_id);
END $mrc_reheal$;

-- (c) Constrain, now that no row can violate it.
DO $mrc_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mrc_agenda_items_model_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.mrc_agenda_items
             ADD CONSTRAINT mrc_agenda_items_model_id_fkey
             FOREIGN KEY (model_id) REFERENCES public.ai_models(id) ON DELETE SET NULL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mrc_votes_model_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.mrc_votes
             ADD CONSTRAINT mrc_votes_model_id_fkey
             FOREIGN KEY (model_id) REFERENCES public.ai_models(id) ON DELETE SET NULL';
  END IF;
END $mrc_fk$;

CREATE INDEX IF NOT EXISTS mrc_votes_agenda_idx ON public.mrc_votes(agenda_item_id);

COMMENT ON COLUMN public.mrc_agenda_items.model_name IS
  'Denormalised display label only. The link is model_id; the UI resolves the name from ai_models and shows "Unavailable" when the id does not resolve.';

-- ---------------------------------------------------------------------------
-- 6. updated_at triggers, guarded so a replay without set_updated_at() still
--    applies the rest of this file.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'mrc_committee_members_updated')
  THEN
    EXECUTE 'CREATE TRIGGER mrc_committee_members_updated BEFORE UPDATE ON public.mrc_committee_members
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;
END $$;
