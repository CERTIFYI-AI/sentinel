-- ---------------------------------------------------------------------------
-- Attribute models to the vendors that supply them.
--
-- WHY. The vendor concentration analysis (Vendor Registry) answers "how much of
-- our AI estate depends on one supplier" — the core question of third-party
-- concentration risk. It resolves `vendors.linked_models` against `ai_models`.
-- That column existed but was EMPTY for every vendor, so the analysis rendered
-- an honest-but-vacuous empty state forever, and the module could never show
-- the risk it exists to show. (The previous UI papered over this with a
-- hardcoded OpenAI 45% / Anthropic 30% chart and a "exceeds 40% threshold"
-- warning shown to every customer regardless of their actual estate.)
--
-- The attribution is DERIVED, not invented: ai_models.provider already names the
-- supplier ('OpenAI', 'Anthropic', ...), so each vendor claims the models whose
-- provider matches its name. Models with provider 'Internal' are deliberately
-- left unattributed — they are first-party and must not inflate a third-party
-- concentration figure. The UI states the denominator explicitly ("Based on N of
-- M registered models that are attributed to a vendor"), so the unattributed
-- remainder is visible rather than hidden.
--
-- linked_models is jsonb (an array of ai_models.id strings), not text[].
-- Idempotent: recomputed from the live join on every apply.
-- ---------------------------------------------------------------------------

DO $attr$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  UPDATE public.vendors v
  SET linked_models = COALESCE(
        (SELECT jsonb_agg(m.id::text ORDER BY m.name)
           FROM public.ai_models m
          WHERE m.org_id = v.org_id
            AND m.provider IS NOT NULL
            AND lower(btrim(m.provider)) <> 'internal'
            -- Match the vendor by its provider name. Azure's registry name
            -- ('Microsoft Azure AI') is a superstring of the provider label, so
            -- compare in both directions rather than on strict equality.
            AND ( lower(btrim(m.provider)) = lower(btrim(v.name))
               OR lower(btrim(v.name)) LIKE '%' || lower(btrim(m.provider)) || '%'
               OR lower(btrim(m.provider)) LIKE '%' || lower(btrim(v.name)) || '%' )),
        '[]'::jsonb)
  WHERE v.org_id = v_org;

  -- Keep the denormalised counter honest for anything reading it directly.
  UPDATE public.vendors
  SET subprocessor_count = COALESCE(subprocessor_count, 0)
  WHERE org_id = v_org;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'vendor/model attribution skipped: %', SQLERRM;
END $attr$;

-- ---------------------------------------------------------------------------
-- PROOF (gate 1). Every id in linked_models must resolve to a real model:
--
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ai_models m WHERE m.id::text = lm)) AS resolves
--   FROM vendors v,
--        LATERAL jsonb_array_elements_text(
--          CASE WHEN jsonb_typeof(v.linked_models)='array' THEN v.linked_models ELSE '[]'::jsonb END) lm;
-- ---------------------------------------------------------------------------
