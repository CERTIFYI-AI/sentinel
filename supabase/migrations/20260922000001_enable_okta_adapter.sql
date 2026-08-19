-- 20260922000001_enable_okta_adapter.sql
--
-- WHY: `okta` was catalogued only. Okta is the access-control system of record
-- for most orgs, so its evidence (MFA enrolment, password strength, admin
-- assignments, dormant accounts, federated sign-on, System Log) maps to more
-- framework controls than any other single connector — SOC 2 CC6.x, ISO 27001
-- A.9.x, HIPAA 164.308/312, PCI 7/8/10 and GDPR Art. 30 all draw on it. Leaving
-- it uncollected meant the most-cited control family had no automated evidence.
--
-- This migration is step 4 of the four the registry docstring names:
--   1. sentinel/integrations/okta/adapter.py
--   2. registered in sentinel/integrations/registry.py
--   3. dashboard/src/integrations/okta/config.ts (the connect form)
--   4. this row flip, so the catalogue agrees with the code
-- Skipping this step would leave a working adapter no operator can reach.
--
-- STATUS IS 'beta', NOT 'available', for the same reason as aws/microsoft_azure:
-- the adapter is written against the documented Okta Management API v1 and
-- unit-tested against recorded payloads, but has not been run against a live
-- tenant here. 'beta' is the honest label (amber badge, Connect enabled);
-- promoting to 'available' is a separate change backed by a real sync.
--
-- Idempotent: re-running finds the row already flipped and changes nothing.
-- Guarded: a row absent from this database is skipped rather than invented.

DO $$
DECLARE
  flipped int := 0;
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN
    RAISE NOTICE 'integration_catalog absent; nothing to enable';
    RETURN;
  END IF;

  UPDATE public.integration_catalog
     SET adapter_status = 'beta',
         -- tier 1 = adapter shipped or next to ship; this now ships.
         tier           = 1,
         updated_at     = now()
   WHERE slug = 'okta'
     AND adapter_status <> 'beta';
  GET DIAGNOSTICS flipped = ROW_COUNT;

  RAISE NOTICE 'enabled % identity adapter(s) (okta)', flipped;
END $$;

-- Verification: every slug that ships an adapter must be connectable in the
-- catalogue, or the UI hides a Connect button the server would accept. Asserts
-- its own postcondition; a fifth adapter added tomorrow is reported, not fatal.
DO $$
DECLARE
  missing text[];
  connectable text[];
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN RETURN; END IF;

  SELECT array_agg(s ORDER BY s) INTO missing
    FROM unnest(ARRAY['aws', 'github', 'microsoft_azure', 'okta']) AS s
   WHERE NOT EXISTS (
     SELECT 1 FROM public.integration_catalog c
      WHERE c.slug = s AND c.adapter_status IN ('available', 'beta')
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'these slugs ship an adapter in sentinel/integrations/registry.py but are '
      'not connectable in the catalogue: %', missing;
  END IF;

  SELECT array_agg(slug ORDER BY slug) INTO connectable
    FROM public.integration_catalog
   WHERE adapter_status IN ('available', 'beta');

  RAISE NOTICE 'connectable products after this migration: %', connectable;
END $$;
