-- Why: the tenant row for the main company carried `sentinel-financial.com`,
-- a leftover from the demo-company era. Dignep Group Pvt. Ltd. is the
-- company; certifyi.ai is its product domain, and that is what the tenant
-- should resolve to.
--
-- The seed that created this row (20260420160002_functional_seed.sql) inserts
-- ON CONFLICT DO NOTHING, so editing the seed could not correct an existing
-- row -- the org name had already been updated to the real company while the
-- domain stayed stale. This forward migration fixes the row that is actually
-- there.
--
-- Idempotent: matches only the stale value, so re-running is a no-op once
-- applied, and it will not overwrite a domain an admin has since set.
-- `organizations.domain` is UNIQUE; verified no other row holds certifyi.ai.

update public.organizations
   set domain = 'certifyi.ai'
 where id = '00000000-0000-0000-0000-000000000001'
   and domain is distinct from 'certifyi.ai'
   and domain = 'sentinel-financial.com';
