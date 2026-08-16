-- 2026-08-14 · Evidence & Conformity consolidation wiring (idempotent)
--
-- Context: the Evidence surface (/evidence-vault) and Conformity Assessment
-- (/conformity) pages are being rewired from demo `<name>_table` doc-jsonb
-- tables to the real org-scoped tables (`evidence`, `evidence_chain`,
-- `conformity_assessments`, `frameworks`, `controls`).
--
-- NOTE on seeding: the `evidence` table already contains 10 realistic rows
-- for org 00000000-0000-0000-0000-000000000001 (policy docs, test results,
-- certificates, log files linked to control refs), so the conditional seed
-- ("seed only if empty") is intentionally a no-op and no rows are inserted.

-- 1) Let the DB default fill the tenant/org scoping column, as ai_models does.
--    RLS on these tables checks tenant_id = current_user_org_id()::text, so a
--    client-side insert that omits the column now passes without the client
--    ever choosing its own tenant.
-- REPLAY NOTE: April-era unify loops strip tenant_id on a from-zero replay;
-- this file encodes the canonical model, so heal the scoping columns first
-- (no-op on the live database).
ALTER TABLE IF EXISTS public.evidence ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.conformity_assessments ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='evidence' AND column_name='org_id' AND is_nullable='NO') THEN
    ALTER TABLE public.evidence ALTER COLUMN org_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.evidence
  ALTER COLUMN tenant_id SET DEFAULT (public.current_user_org_id())::text;

ALTER TABLE public.conformity_assessments
  ALTER COLUMN tenant_id SET DEFAULT (public.current_user_org_id())::text;

-- frameworks.org_id had no default; its RLS WITH CHECK requires
-- org_id = current_user_org_id(), so inserts from the app would fail.
ALTER TABLE public.frameworks
  ALTER COLUMN org_id SET DEFAULT public.get_org_id();

-- 2) conformity_assessments still carried FKs to the legacy Prisma-era
--    "Tenant"/"Framework" tables, which pinned it to the retired id-space
--    ('TNT-001' / 'FW-xxx') and blocked re-homing to the real org and the
--    real frameworks uuids. Drop them; scoping is enforced by RLS
--    (tenant_id = current_user_org_id()::text), same as `evidence`.
ALTER TABLE public.conformity_assessments
  DROP CONSTRAINT IF EXISTS conformity_assessments_tenant_id_fkey;
ALTER TABLE public.conformity_assessments
  DROP CONSTRAINT IF EXISTS conformity_assessments_framework_id_fkey;

-- 3) Re-home the legacy demo-tenant conformity assessments ('TNT-001') to the
--    real org so RLS exposes them to the org's users. No-op once applied.
UPDATE public.conformity_assessments
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id = 'TNT-001';

-- 4) One id-space: replace legacy 'FW-xxx' business codes in
--    conformity_assessments.framework_id with the real frameworks.id (uuid).
--    The legacy codes followed a different numbering than frameworks.code, so
--    resolution is by the framework named in the assessment title (each title
--    names exactly one framework). Guarded by LIKE 'FW-%' so it is a no-op
--    after the first run.
UPDATE public.conformity_assessments ca
SET framework_id = f.id::text
FROM public.frameworks f
WHERE ca.framework_id LIKE 'FW-%'
  AND (
    (ca.title ILIKE '%EU AI Act%'  AND f.name = 'EU AI Act') OR
    (ca.title ILIKE '%ISO 42001%'  AND f.name = 'ISO/IEC 42001') OR
    (ca.title ILIKE '%NIST%'       AND f.name = 'NIST AI RMF 1.0')
  );

-- 5) One id-space: resolve the single unambiguous legacy model slug to
--    ai_models.id. The remaining legacy slugs ('fraud-detection-v2.8',
--    'credit-scoring-v3.2.1', 'mortgage-approval-model') match zero or
--    multiple ai_models rows and are intentionally left untouched — the UI
--    renders them as "Unavailable" rather than guessing a link.
UPDATE public.conformity_assessments ca
SET model_id = m.id::text
FROM public.ai_models m
WHERE ca.model_id = 'kyc-image-classifier-v4.1'
  AND m.slug = 'kyc-image-classifier';
