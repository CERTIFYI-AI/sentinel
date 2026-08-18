-- 20260830000001_enable_aws_azure_adapters.sql
--
-- WHY: `aws` and `microsoft_azure` were catalogued only — the two most-asked-
-- for evidence sources in the product showed "Catalogued for reference only —
-- no adapter ships for this product yet" and had no Connect affordance. That
-- message was accurate, and the fix is to make it stop being true rather than
-- to soften the wording.
--
-- This migration is step 4 of the four the registry docstring names:
--   1. sentinel/integrations/aws/adapter.py, sentinel/integrations/azure/adapter.py
--   2. registered in sentinel/integrations/registry.py
--   3. dashboard/src/integrations/{aws,azure}/config.ts (the connect form)
--   4. this row flip, so the catalogue agrees with the code
-- Skipping this step would leave a working adapter no operator can reach.
--
-- STATUS IS 'beta', NOT 'available', deliberately. Both adapters are written
-- against the documented AWS and Azure APIs and unit-tested against recorded
-- payloads, but neither has been run against a live tenant here. 'beta' is the
-- honest label the UI already renders (amber badge, Connect enabled), and
-- promoting to 'available' is a separate change backed by a real sync. The
-- alternative — shipping 'available' and hoping — is precisely the fabricated-
-- capability failure this catalogue was built to avoid.
--
-- Idempotent: re-running finds the rows already flipped and changes nothing.
-- Guarded: a row absent from this database (a partial catalogue) is skipped
-- rather than invented, because the seed migration owns the catalogue text and
-- this migration owns only the rollout state.

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
         -- tier 1 = adapter shipped or next to ship; these now ship.
         tier           = 1,
         updated_at     = now()
   WHERE slug IN ('aws', 'microsoft_azure')
     AND adapter_status <> 'beta';
  GET DIAGNOSTICS flipped = ROW_COUNT;

  RAISE NOTICE 'enabled % cloud adapter(s) (aws, microsoft_azure)', flipped;
END $$;

-- Verification: this migration is responsible for three slugs being
-- connectable, and for nothing else. It asserts its own postcondition and
-- merely reports anything a later migration adds, so enabling a fourth adapter
-- tomorrow does not retroactively break this file on replay.
DO $$
DECLARE
  missing text[];
  connectable text[];
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN RETURN; END IF;

  SELECT array_agg(s ORDER BY s) INTO missing
    FROM unnest(ARRAY['aws', 'github', 'microsoft_azure']) AS s
   WHERE NOT EXISTS (
     SELECT 1 FROM public.integration_catalog c
      WHERE c.slug = s AND c.adapter_status IN ('available', 'beta')
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'these slugs ship an adapter in sentinel/integrations/registry.py but are '
      'not connectable in the catalogue: % — the two must agree or the UI hides '
      'a Connect button the server would accept', missing;
  END IF;

  SELECT array_agg(slug ORDER BY slug) INTO connectable
    FROM public.integration_catalog
   WHERE adapter_status IN ('available', 'beta');

  RAISE NOTICE 'connectable products after this migration: %', connectable;
END $$;
