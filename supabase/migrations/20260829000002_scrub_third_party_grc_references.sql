-- 20260829000002_scrub_third_party_grc_references.sql
--
-- WHY: the integration catalogue's `docs_hint` column sends operators to a
-- COMPETITOR'S documentation. 149 of the 219 rows read like:
--
--     Vanta Help Center → Cloud / Infrastructure → search exact product 'AWS'.
--     https://help.vanta.com/en/collections/18953623-cloud-providers
--
-- rendered in the product as "Provider docs: …". That is wrong on three
-- counts: it is not the provider's documentation, it advertises another GRC
-- vendor inside our own product, and it makes our catalogue look derived from
-- theirs.
--
-- FIX: clear every `docs_hint` that points at a third-party GRC platform.
-- Cleared, not rewritten — we do not hold verified per-product documentation
-- URLs for 219 products, and inventing 149 of them would be fabricated data,
-- which is worse than an empty field. The UI already renders `docs_hint` only
-- when present, so a null simply omits the line.
--
-- The genuinely useful operator prose (`why_needed`, `evidence_pull`,
-- `connect_steps`, `evidence_mapping`) is untouched — it describes the
-- provider's own API surface, not anyone's help centre.
--
-- Also removes `drata` and `secureframe` as catalogue ENTRIES: they are
-- competing GRC platforms, and listing a competitor as an evidence source in
-- our own catalogue is a product decision nobody made deliberately. Removing
-- them is reversible — re-add the rows if that is wanted.
--
-- Idempotent: a second run finds nothing left to clear.

-- 1. Clear competitor documentation pointers.
DO $$
DECLARE
  cleared int := 0;
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN
    RAISE NOTICE 'integration_catalog absent; nothing to scrub';
    RETURN;
  END IF;

  UPDATE public.integration_catalog
     SET docs_hint = NULL,
         updated_at = now()
   WHERE docs_hint IS NOT NULL
     AND (
       docs_hint ILIKE '%vanta%'
       OR docs_hint ILIKE '%verifywise%'
       OR docs_hint ILIKE '%drata%'
       OR docs_hint ILIKE '%secureframe%'
       OR docs_hint ILIKE '%tugboat%'
       OR docs_hint ILIKE '%sprinto%'
     );
  GET DIAGNOSTICS cleared = ROW_COUNT;
  RAISE NOTICE 'cleared % third-party documentation pointer(s) from integration_catalog', cleared;
END $$;

-- 2. Drop competing GRC platforms from the catalogue itself.
DO $$
DECLARE
  removed int := 0;
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN RETURN; END IF;

  -- Only remove a row no tenant has connected — never delete a catalogue entry
  -- an org is actively using, which would orphan its `integrations` row.
  DELETE FROM public.integration_catalog c
   WHERE c.slug IN ('drata', 'secureframe', 'vanta', 'verifywise', 'sprinto', 'tugboatlogic')
     AND NOT EXISTS (
       SELECT 1 FROM public.integrations i
        WHERE i.catalog_slug = c.slug AND i.is_deleted = false
     );
  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'removed % competing GRC platform(s) from the catalogue', removed;
END $$;

-- 3. Keep the advertised count honest: `frameworks`-style drift is exactly
--    what this repo has spent several waves removing, so if anything derives a
--    catalogue total it must match the rows that remain.
DO $$
DECLARE
  remaining bigint;
  leftovers bigint;
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO remaining FROM public.integration_catalog;

  SELECT count(*) INTO leftovers
    FROM public.integration_catalog
   WHERE docs_hint ILIKE '%vanta%'
      OR docs_hint ILIKE '%verifywise%'
      OR docs_hint ILIKE '%drata%'
      OR docs_hint ILIKE '%secureframe%';

  IF leftovers > 0 THEN
    RAISE EXCEPTION 'third-party references remain in integration_catalog: % row(s)', leftovers;
  END IF;

  RAISE NOTICE 'integration_catalog clean: % products, no third-party GRC references', remaining;
END $$;
