-- 20260830000002_scrub_connect_steps_vendor_names.sql
--
-- WHY: `20260829000002` cleared competitor references from `docs_hint`, but it
-- only looked at that one column. Verifying it against a real Postgres turned
-- up three rows whose `connect_steps` — the operator walkthrough we render as
-- "Connection steps" — instruct the reader to configure the key **in a
-- competitor's product**:
--
--   openai_azure_openai  … Cognitive Services Reader role in Vanta.
--   anthropic_claude_api Add Anthropic Organization Admin API Token (Read-only) in Vanta.
--   langsmith_langfuse   … configure automated webhook export to Vanta ingestion queue.
--
-- Left alone, our own product tells a user to go and set the integration up
-- somewhere else. That is worse than the docs_hint case, because it is not a
-- reference — it is an instruction the reader may actually follow.
--
-- FIX: substitute the product name in those three phrases. This is a rewrite
-- rather than a clear (unlike the docs_hint scrub) because the sentence is OUR
-- walkthrough describing where the operator enters a credential, and that
-- place is Sentinel. Everything else in the step — which key, which role,
-- which scope — is provider-specific fact from the source workbook and is left
-- exactly as it was. No new claim is introduced.
--
-- Scoped to literal phrases, not a blanket name substitution: a blanket
-- replace would corrupt any row where the word appears in a different sense.
--
-- Idempotent: the phrases are gone after the first run, so a second run
-- matches nothing. Self-verifying: raises if any text column still names a
-- competing GRC platform.

DO $$
DECLARE
  rewritten int := 0;
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN
    RAISE NOTICE 'integration_catalog absent; nothing to scrub';
    RETURN;
  END IF;

  UPDATE public.integration_catalog
     SET connect_steps = replace(
           replace(connect_steps,
                   'webhook export to Vanta ingestion queue',
                   'webhook export to the Sentinel evidence ingestion queue'),
           ' in Vanta.', ' in Sentinel.'),
         updated_at = now()
   WHERE connect_steps ILIKE '%vanta%';
  GET DIAGNOSTICS rewritten = ROW_COUNT;

  RAISE NOTICE 'rewrote % connect_steps that pointed the operator at another product', rewritten;
END $$;

-- Verification across EVERY operator-facing text column, not just the one that
-- prompted this migration — the last scrub was narrow and that is exactly how
-- these three survived it.
DO $$
DECLARE
  leftovers bigint;
  offenders text;
BEGIN
  IF to_regclass('public.integration_catalog') IS NULL THEN RETURN; END IF;

  SELECT count(*), string_agg(slug, ', ' ORDER BY slug)
    INTO leftovers, offenders
    FROM public.integration_catalog
   WHERE (coalesce(why_needed, '') || coalesce(evidence_pull, '')
          || coalesce(connect_steps, '') || coalesce(evidence_mapping, '')
          || coalesce(docs_hint, ''))
         ~* '(vanta|verifywise|drata|secureframe|sprinto|tugboat)';

  IF leftovers > 0 THEN
    RAISE EXCEPTION
      'third-party GRC platform still named in integration_catalog text for: %',
      offenders;
  END IF;

  RAISE NOTICE 'integration_catalog text is clean of third-party GRC product names';
END $$;
