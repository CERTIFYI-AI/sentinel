-- 20260923000001_enable_entra_adapters.sql
--
-- WHY: Phase 1 of docs/integrations/connector-rollout-plan.md — the Microsoft
-- Graph family. Entra ID is the access-control system of record for Microsoft-
-- shop orgs, so its evidence carries the weight Okta's does elsewhere: SOC 2
-- CC6.x/CC7.x, ISO 27001 A.9.x/A.12.4, HIPAA 164.308/312, PCI 7/8/10, GDPR
-- Art. 30.
--
-- TWO SLUGS, ONE ADAPTER. `microsoft_entra_id` and
-- `microsoft_entra_id_gcc_high` are the same checks over different sovereign
-- endpoints (login.microsoftonline.us / graph.microsoft.us). The cloud is
-- selected by the credentials class, not hardcoded, so GCC High cannot
-- silently query commercial Graph and report an empty tenant as a clean one.
-- That is the leverage this phase is built on and it starts here.
--
-- Steps 1-3 (adapter, registry, connect forms) ship in the same change; this
-- is step 4, without which a working adapter has no Connect button.
--
-- STATUS IS 'beta': written against the documented Graph v1.0 API and unit-
-- tested against recorded payloads, but not run against a live tenant here.
--
-- Idempotent and guarded: rows absent from this database are skipped.

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
         tier           = 1,
         updated_at     = now()
   WHERE slug IN ('microsoft_entra_id', 'microsoft_entra_id_gcc_high')
     AND adapter_status <> 'beta';
  GET DIAGNOSTICS flipped = ROW_COUNT;

  RAISE NOTICE 'enabled % Entra adapter slug(s)', flipped;
END $$;

-- Every slug that ships an adapter must be connectable, or the UI hides a
-- Connect button the server would accept.
DO $$
DECLARE
  missing text[];
  connectable text[];
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN RETURN; END IF;

  SELECT array_agg(s ORDER BY s) INTO missing
    FROM unnest(ARRAY['aws', 'github', 'microsoft_azure', 'okta',
                      'microsoft_entra_id', 'microsoft_entra_id_gcc_high']) AS s
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
