-- 20260829000001_demo_integrations_label_and_deperson.sql
--
-- WHY: the eight seeded connector rows in
-- `20260816000003_integrations_canonical.sql` name individual people as the
-- accountable owner of production-sounding systems — the core banking feed,
-- the credit bureau extract, the Nepal Rastra Bank supervisory return — and
-- carry no marker saying they are demonstration data.
--
-- On screen they are indistinguishable from real records. That fails the
-- platform's own compliance gate two ways (CLAUDE.md, role 4):
--
--   * "no personal data in seeds or fixtures" — a named individual in a
--     fixture is personal data whether or not the person is real;
--   * "demo data stays fictional and labeled as such" — nothing labelled
--     these, so the product asserted named human accountability that does
--     not exist.
--
-- FIX, matching how `demoImportService` already seeds demo content:
--   * owners become ROLE labels, never people;
--   * names carry a "(Demo)" suffix so the label is visible on every screen
--     that renders the row, not just this table;
--   * `config.demo_seed = true` marks them, so they can be identified and
--     removed the same way every other demo record can.
--
-- Scoped to the eight seeded ids and the demo org only. A tenant's own
-- connectors are never touched — this must not rewrite a real customer's
-- owner field.
--
-- Idempotent: re-running finds the rows already labelled and changes nothing.

DO $$
DECLARE
  demo_org constant uuid := '00000000-0000-0000-0000-000000000001';
  -- id -> role label. Derived from what each connector actually does, so the
  -- owner column still communicates accountability, just not a person.
  owners constant text[][] := ARRAY[
    ['44444444-4444-4444-8444-000000000401', 'Credit Risk Lead (demo role)'],
    ['44444444-4444-4444-8444-000000000402', 'Regulatory Reporting Lead (demo role)'],
    ['44444444-4444-4444-8444-000000000403', 'Core Banking Lead (demo role)'],
    ['44444444-4444-4444-8444-000000000404', 'Payment Operations Lead (demo role)'],
    ['44444444-4444-4444-8444-000000000405', 'Security Monitoring Lead (demo role)'],
    ['44444444-4444-4444-8444-000000000406', 'Identity & Access Lead (demo role)'],
    ['44444444-4444-4444-8444-000000000407', 'Remediation Lead (demo role)'],
    ['44444444-4444-4444-8444-000000000408', 'Platform Alerting Lead (demo role)']
  ];
  pair text[];
  touched int := 0;
BEGIN
  IF to_regclass('public.integrations') IS NULL THEN
    RAISE NOTICE 'integrations table absent; nothing to relabel';
    RETURN;
  END IF;

  FOREACH pair SLICE 1 IN ARRAY owners LOOP
    UPDATE public.integrations
       SET owner_name = pair[2],
           -- Visible label, applied once. The guard keeps re-runs idempotent.
           name = CASE WHEN name LIKE '%(Demo)' THEN name ELSE name || ' (Demo)' END,
           config = coalesce(config, '{}'::jsonb) || jsonb_build_object('demo_seed', true),
           updated_at = now()
     WHERE id = pair[1]::uuid
       AND org_id = demo_org;
    touched := touched + 1;
  END LOOP;

  RAISE NOTICE 'relabelled % seeded demo connectors (role owners, (Demo) suffix, demo_seed marker)', touched;
END $$;

-- Proof: no seeded connector may still carry a personal name, and every one
-- must be marked. Fails loudly rather than leaving half-relabelled rows.
DO $$
DECLARE
  demo_org constant uuid := '00000000-0000-0000-0000-000000000001';
  unmarked int;
  personal int;
BEGIN
  IF to_regclass('public.integrations') IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO unmarked
    FROM public.integrations
   WHERE org_id = demo_org
     AND id::text LIKE '44444444-4444-4444-8444-0000000004%'
     AND coalesce(config->>'demo_seed', 'false') <> 'true';

  -- Any owner that is not a labelled role is, by construction, a person.
  SELECT count(*) INTO personal
    FROM public.integrations
   WHERE org_id = demo_org
     AND id::text LIKE '44444444-4444-4444-8444-0000000004%'
     AND owner_name IS NOT NULL
     AND owner_name NOT LIKE '%(demo role)';

  IF unmarked > 0 OR personal > 0 THEN
    RAISE EXCEPTION
      'demo connector relabel incomplete: % unmarked, % still naming a person',
      unmarked, personal;
  END IF;

  RAISE NOTICE 'verified: seeded demo connectors carry role owners and the demo_seed marker';
END $$;
