-- ---------------------------------------------------------------------------
-- Unify the model id-space: retire the shadow ids and make them unrepresentable.
--
-- WHY. A resolution sweep of every `*_id` column against its target table found
-- that model references across the platform live in a PARALLEL id-space that
-- resolves to nothing:
--
--     mrc_agenda_items.model_id -> ai_models   total=4   resolves=0
--     metric_profiles.model_id  -> ai_models   total=5   resolves=0
--     validation_runs.model_id  -> ai_models   total=6   resolves=0
--     model_performance_metrics -> ai_models   total=16  resolves=0
--     ... 12 tables, ~72 references, none of which resolve.
--
-- Three distinct illegal id shapes were in use:
--   1. Fabricated uuids (83a20820-… "Credit Risk Scorer", e61f991b-… "Fraud
--      Detection Engine") — well-formed, internally CONSISTENT across modules,
--      and belonging to no row in `ai_models`.
--   2. Business codes — `MDL-001`, `MDL-002`, `NEP-001` — the exact shape
--      CLAUDE.md First principle #2 names as forbidden.
--   3. Version slugs — `credit-scoring-v3-2-1`, `nlp-sentiment-v1-5`.
--
-- This survived six audit waves precisely BECAUSE it is internally coherent:
-- 83a20820-… means "Credit Risk Scorer" in all nine tables that cite it, so
-- every module looks correct in isolation and even joins to its siblings. It
-- only breaks on the one join that matters — to `ai_models`. Several tables
-- also carry a denormalised `model_name`, so the UI renders a plausible model
-- label while the deep link behind it points at nothing.
--
-- The root cause is structural, not editorial: 14 of the 15 `model_id` columns
-- are `text` with no foreign key. A text column with no referent accepts a
-- slug, a business code, or a typo in silence. Remapping the rows without
-- fixing the column type would let the shadow space grow straight back.
--
-- WHAT THIS DOES.
--   §1 Builds a shadow -> real mapping from the `model_name` labels the seeds
--      already carry, resolved against `ai_models.name` at apply time.
--   §2 Rewrites every reference through that mapping.
--   §3 NULLs whatever still does not resolve. A null renders "Unavailable";
--      a dangling pointer renders a lie. We do not invent a model to point at.
--   §4 Converts `text` -> `uuid` and adds `REFERENCES ai_models(id)`, so shape
--      (2) and (3) become unrepresentable and shape (1) is rejected on write.
--   §5 Same treatment for `ai_apps.vendor_id`, which held `vendor-001` codes.
--   §6 Re-runs the resolution proof and RAISEs the counts.
--
-- Idempotent; safe to re-run. Tolerant of column types changing underneath it
-- (a concurrent change converts `mrc_agenda_items.model_id` to uuid), so every
-- step is driven off information_schema rather than an assumed shape.
-- ---------------------------------------------------------------------------

-- §1. Shadow -> real mapping, resolved by the name labels the seeds carry.
--     Built as a temp table so §2 can join it from dynamic SQL.
DROP TABLE IF EXISTS _model_id_map;
CREATE TEMP TABLE _model_id_map (shadow text PRIMARY KEY, real_id uuid NOT NULL);

DO $map$
BEGIN
  -- 1a. Tables that carry BOTH the shadow id and a human name: the name is the
  --     bridge back to the real row. Only exact, unambiguous name matches are
  --     accepted — a name matching two models maps to neither.
  INSERT INTO _model_id_map (shadow, real_id)
  SELECT s.sid, m.id
  FROM (
    SELECT model_id::text AS sid, model_name AS nm FROM public.mrc_agenda_items          WHERE model_name IS NOT NULL
    UNION ALL
    SELECT model_id::text,        model_name      FROM public.model_dna                  WHERE model_name IS NOT NULL
    UNION ALL
    SELECT model_id::text,        model_name      FROM public.model_lifecycle_stages      WHERE model_name IS NOT NULL
    UNION ALL
    SELECT model_id::text,        model_name      FROM public.model_performance_metrics   WHERE model_name IS NOT NULL
  ) s
  JOIN public.ai_models m ON m.name = s.nm
  WHERE s.sid IS NOT NULL
    -- already a real id: nothing to map
    AND NOT EXISTS (SELECT 1 FROM public.ai_models r WHERE r.id::text = s.sid)
    -- the name must identify exactly one model
    AND (SELECT count(*) FROM public.ai_models d WHERE d.name = s.nm) = 1
  GROUP BY s.sid, m.id
  ON CONFLICT (shadow) DO NOTHING;

  -- 1b. Version slugs (`nlp-sentiment-v1-5`) carry no name column. Strip the
  --     trailing -vN[-N…] and prefix-match against the slugified model name.
  --     A slug that matches zero or several models is deliberately left out of
  --     the map and will be NULLed in §3 rather than guessed at.
  INSERT INTO _model_id_map (shadow, real_id)
  SELECT s.sid, m.id
  FROM (
    SELECT DISTINCT model_id::text AS sid FROM public.bias_audits WHERE model_id IS NOT NULL
  ) s
  CROSS JOIN LATERAL (
    SELECT regexp_replace(lower(s.sid), '-v[0-9]+([-.][0-9]+)*$', '') AS stem
  ) t
  JOIN public.ai_models m
    ON  regexp_replace(lower(m.name), '[^a-z0-9]+', '-', 'g') LIKE t.stem || '%'
  WHERE NOT EXISTS (SELECT 1 FROM public.ai_models r WHERE r.id::text = s.sid)
    AND (
      SELECT count(*) FROM public.ai_models d
      WHERE regexp_replace(lower(d.name), '[^a-z0-9]+', '-', 'g') LIKE t.stem || '%'
    ) = 1
  ON CONFLICT (shadow) DO NOTHING;

  RAISE NOTICE 'model id-space: % shadow ids mapped to real models',
    (SELECT count(*) FROM _model_id_map);
END $map$;

-- §2-§4. Remap, NULL the unresolvable, then constrain so it cannot regress.
DO $fix$
DECLARE
  t text;
  dtype text;
  n_remapped bigint;
  n_nulled bigint;
  uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  targets constant text[] := ARRAY[
    'agent_gov_registry','bias_audits','dataset_catalog_entries','explainability_profiles',
    'metric_profiles','model_dna','model_explanations','model_lifecycle_stages',
    'model_performance_metrics','mrc_agenda_items','mrc_votes','scenario_campaigns',
    'scenario_templates','session_traces','validation_runs'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    SELECT data_type INTO dtype
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name=t AND column_name='model_id';
    CONTINUE WHEN dtype IS NULL;   -- table absent in this era; nothing to do

    -- §2. Rewrite shadow -> real. Comparison is on ::text so this works whether
    --     the column is still text or has already been converted to uuid.
    EXECUTE format(
      'UPDATE public.%I x SET model_id = m.real_id::text::%s
         FROM _model_id_map m WHERE x.model_id::text = m.shadow', t,
      CASE WHEN dtype = 'uuid' THEN 'uuid' ELSE 'text' END);
    GET DIAGNOSTICS n_remapped = ROW_COUNT;

    -- §3. Anything still not resolving is set to NULL. "Unavailable" is honest;
    --     a pointer to a model that does not exist is not.
    EXECUTE format(
      'UPDATE public.%I x SET model_id = NULL
        WHERE x.model_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.ai_models r WHERE r.id::text = x.model_id::text)', t);
    GET DIAGNOSTICS n_nulled = ROW_COUNT;

    -- §4. Convert text -> uuid. Every surviving value is a real model id or
    --     NULL, so the cast cannot fail; the guard is belt-and-braces.
    IF dtype = 'text' THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN model_id TYPE uuid
           USING (CASE WHEN model_id ~ %L THEN model_id::uuid ELSE NULL END)', t, uuid_re);
    END IF;

    -- ... and give it a referent, so a slug or a business code is now a write
    -- error rather than a silently broken link.
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conrelid = format('public.%I', t)::regclass
         AND conname  = t || '_model_id_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (model_id)
           REFERENCES public.ai_models(id) ON DELETE SET NULL', t, t || '_model_id_fkey');
    END IF;

    IF n_remapped > 0 OR n_nulled > 0 THEN
      RAISE NOTICE '  %: % remapped, % nulled', t, n_remapped, n_nulled;
    END IF;
  END LOOP;
END $fix$;

-- §5. `ai_apps.vendor_id` held `vendor-001`-style codes against a `vendors`
--     table that has no such code column — the same defect in the vendor
--     id-space. The app name is the only honest bridge: "ChatGPT Enterprise"
--     names its supplier, so map where a vendor name appears in the app name
--     and NULL where it does not (GitHub Copilot has no GitHub vendor row —
--     mapping it to "Microsoft Azure AI" would be a guess, so it goes NULL).
DO $apps$
DECLARE
  dtype text;
  n bigint;
BEGIN
  SELECT data_type INTO dtype FROM information_schema.columns
   WHERE table_schema='public' AND table_name='ai_apps' AND column_name='vendor_id';
  IF dtype IS NULL THEN RETURN; END IF;

  UPDATE public.ai_apps a
     SET vendor_id = v.id::text::uuid
    FROM public.vendors v
   WHERE a.org_id = v.org_id
     AND a.vendor_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vendors r WHERE r.id::text = a.vendor_id::text)
     AND a.name ILIKE '%' || split_part(v.name, ' ', 1) || '%'
     AND (SELECT count(*) FROM public.vendors d
           WHERE d.org_id = a.org_id
             AND a.name ILIKE '%' || split_part(d.name, ' ', 1) || '%') = 1;
  GET DIAGNOSTICS n = ROW_COUNT;

  UPDATE public.ai_apps a SET vendor_id = NULL
   WHERE a.vendor_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vendors r WHERE r.id::text = a.vendor_id::text);

  IF dtype = 'text' THEN
    ALTER TABLE public.ai_apps ALTER COLUMN vendor_id TYPE uuid
      USING (CASE WHEN vendor_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                  THEN vendor_id::uuid ELSE NULL END);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid='public.ai_apps'::regclass AND conname='ai_apps_vendor_id_fkey') THEN
    ALTER TABLE public.ai_apps
      ADD CONSTRAINT ai_apps_vendor_id_fkey FOREIGN KEY (vendor_id)
      REFERENCES public.vendors(id) ON DELETE SET NULL;
  END IF;

  RAISE NOTICE 'ai_apps.vendor_id: % remapped by app name', n;
END $apps$;

-- §6. `transfer_impact_assessments.vendor_id` carried the same `vendor-00N`
--     codes but the table holds no name or app label to bridge from, so there
--     is nothing to map it by. NULL them and constrain the column; authoring
--     meaningful demo linkage here is tracked as follow-up rather than guessed
--     at now (see docs/reference/technical-debt.md).
DO $tia$
DECLARE dtype text;
BEGIN
  SELECT data_type INTO dtype FROM information_schema.columns
   WHERE table_schema='public' AND table_name='transfer_impact_assessments' AND column_name='vendor_id';
  IF dtype IS NULL THEN RETURN; END IF;

  UPDATE public.transfer_impact_assessments a SET vendor_id = NULL
   WHERE a.vendor_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vendors r WHERE r.id::text = a.vendor_id::text);

  IF dtype = 'text' THEN
    ALTER TABLE public.transfer_impact_assessments ALTER COLUMN vendor_id TYPE uuid
      USING (CASE WHEN vendor_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                  THEN vendor_id::uuid ELSE NULL END);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid='public.transfer_impact_assessments'::regclass
                    AND conname='transfer_impact_assessments_vendor_id_fkey') THEN
    ALTER TABLE public.transfer_impact_assessments
      ADD CONSTRAINT transfer_impact_assessments_vendor_id_fkey FOREIGN KEY (vendor_id)
      REFERENCES public.vendors(id) ON DELETE SET NULL;
  END IF;
END $tia$;

-- §7. `guardrail_events.policy_id` / `live_traces.policy_id` hold fabricated
--     uuids against a real `policies` table (52 references, none resolving).
--     Neither table carries a policy name to bridge from. NULL and constrain:
--     the guardrail event itself is real telemetry and stays; only the false
--     claim about WHICH policy it enforced is removed.
DO $pol$
DECLARE
  t text;
  dtype text;
BEGIN
  FOREACH t IN ARRAY ARRAY['guardrail_events','live_traces'] LOOP
    SELECT data_type INTO dtype FROM information_schema.columns
     WHERE table_schema='public' AND table_name=t AND column_name='policy_id';
    CONTINUE WHEN dtype IS NULL;

    EXECUTE format(
      'UPDATE public.%I x SET policy_id = NULL
        WHERE x.policy_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.policies r WHERE r.id::text = x.policy_id::text)', t);

    IF dtype = 'text' THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN policy_id TYPE uuid
           USING (CASE WHEN policy_id ~ %L THEN policy_id::uuid ELSE NULL END)',
        t, '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conrelid = format('public.%I', t)::regclass
                      AND conname = t || '_policy_id_fkey') THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (policy_id)
           REFERENCES public.policies(id) ON DELETE SET NULL', t, t || '_policy_id_fkey');
    END IF;
  END LOOP;
END $pol$;

-- §8. Proof. Re-run the resolution sweep over every column this migration
--     touched and RAISE the counts, so a replay log carries the evidence the
--     review gate asks for (`total` must equal `resolves`).
DO $proof$
DECLARE
  r record;
  n_total bigint;
  n_res bigint;
  failures int := 0;
BEGIN
  FOR r IN
    SELECT c.table_name AS t, c.column_name AS col,
           CASE c.column_name WHEN 'model_id'  THEN 'ai_models'
                              WHEN 'vendor_id' THEN 'vendors'
                              WHEN 'policy_id' THEN 'policies' END AS tgt
      FROM information_schema.columns c
      JOIN information_schema.tables tt
        ON tt.table_schema=c.table_schema AND tt.table_name=c.table_name AND tt.table_type='BASE TABLE'
     WHERE c.table_schema='public'
       AND c.column_name IN ('model_id','vendor_id','policy_id')
       AND c.table_name IN (
         'agent_gov_registry','bias_audits','dataset_catalog_entries','explainability_profiles',
         'metric_profiles','model_dna','model_explanations','model_lifecycle_stages',
         'model_performance_metrics','mrc_agenda_items','mrc_votes','scenario_campaigns',
         'scenario_templates','session_traces','validation_runs','ai_apps',
         'transfer_impact_assessments','guardrail_events','live_traces')
     ORDER BY c.table_name, c.column_name
  LOOP
    EXECUTE format(
      'SELECT count(a.%1$I), count(b.id) FROM public.%2$I a
         LEFT JOIN public.%3$I b ON b.id::text = a.%1$I::text WHERE a.%1$I IS NOT NULL',
      r.col, r.t, r.tgt) INTO n_total, n_res;
    CONTINUE WHEN n_total = 0;
    IF n_total <> n_res THEN
      failures := failures + 1;
      RAISE WARNING 'UNRESOLVED %.% -> %: total=% resolves=%', r.t, r.col, r.tgt, n_total, n_res;
    ELSE
      RAISE NOTICE 'ok %.% -> %: total=% resolves=%', r.t, r.col, r.tgt, n_total, n_res;
    END IF;
  END LOOP;

  IF failures > 0 THEN
    RAISE EXCEPTION 'model/vendor/policy id-space still has % unresolved column(s)', failures;
  END IF;
  RAISE NOTICE 'id-space unified: every remaining reference resolves';
END $proof$;
