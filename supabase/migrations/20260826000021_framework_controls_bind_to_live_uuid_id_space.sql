-- ---------------------------------------------------------------------------
-- 20260826000021_framework_controls_bind_to_live_uuid_id_space.sql
--
-- Bind the published control catalog to the platform's real id-space.
--
-- WHY THIS EXISTS. The 20260826* seed migrations were authored against the
-- text/slug-keyed `frameworks` schema from 20260418000003 (id TEXT, plus
-- short_name / issuing_body / structure / adopted). The live project runs the
-- other, uuid-keyed variant of that table (id uuid DEFAULT gen_random_uuid(),
-- plus code / category / jurisdiction). Two consequences, both invisible from
-- the files alone:
--
--   1. The seeds' own `INSERT INTO public.frameworks` blocks cannot apply here
--      at all — they name columns this schema does not have. The five added
--      frameworks (SOC 2, ISO/IEC 27001, PCI DSS, HIPAA, HITRUST) are instead
--      inserted with live columns by 20260826000001.
--   2. Every `framework_controls.framework_id` is a SLUG ('iso-42001',
--      'soc2', 'pci-dss', …), but the Frameworks catalog tab filters
--      framework_controls by `frameworks.id` — a uuid
--      (services/frameworkCatalogService.ts: .eq('framework_id', fw.id)).
--      Applied verbatim, all 936 catalog rows land and EVERY framework's
--      catalog still renders empty, because the join never matches.
--
-- That is the platform's "one id-space" rule (First principle #2) broken by a
-- schema fork. It cannot be caught by reading the migrations or by replaying
-- them into a scratch database built from those same migrations — only by
-- querying the live project, where `frameworks.id` is a uuid.
--
-- This migration rewrites framework_id from the slug to the live uuid via an
-- explicit slug -> framework-name map. Only exact, unambiguous name matches are
-- used; a slug whose framework is absent is left untouched and RAISEs a NOTICE
-- rather than being guessed at. Idempotent: a re-run maps nothing, because no
-- slugs remain.
-- ---------------------------------------------------------------------------

DO $bind$
DECLARE
  r record;
  v_id uuid;
  v_moved int;
  v_total int := 0;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('iso-42001',        'ISO/IEC 42001'),
      ('nist-ai-rmf',      'NIST AI RMF 1.0'),
      ('eu-ai-act',        'EU AI Act'),
      ('singapore-ai',     'Singapore Model AI Framework'),
      ('owasp-llm',        'OWASP LLM Top 10'),
      ('oecd-ai',          'OECD AI Principles'),
      ('gdpr',             'GDPR'),
      ('unesco-ai-ethics', 'UNESCO Ethics of AI'),
      ('google-saif',      'Google SAIF'),
      ('mitre-atlas',      'MITRE ATLAS'),
      ('soc2',             'SOC 2 - Trust Services Criteria'),
      ('iso-27001',        'ISO/IEC 27001:2022'),
      ('pci-dss',          'Payment Card Industry Data Security Standard'),
      ('hipaa',            'Health Insurance Portability and Accountability Act'),
      ('hitrust',          'HITRUST CSF')
    ) AS m(slug, fw_name)
  LOOP
    SELECT f.id INTO v_id FROM public.frameworks f WHERE f.name = r.fw_name;
    IF v_id IS NULL THEN
      RAISE NOTICE 'no frameworks row named %; leaving slug % unmapped', r.fw_name, r.slug;
      CONTINUE;
    END IF;
    UPDATE public.framework_controls
       SET framework_id = v_id::text
     WHERE framework_id = r.slug;
    GET DIAGNOSTICS v_moved = ROW_COUNT;
    v_total := v_total + v_moved;
  END LOOP;
  RAISE NOTICE 'framework_controls bound to live uuids: % rows', v_total;
END $bind$;

-- Keep the advertised control_count honest: after this it is a MEASURED count
-- of real catalog rows, not metadata with nothing behind it.
UPDATE public.frameworks f
SET control_count  = c.n,
    controls_total = c.n
FROM (
  SELECT framework_id, count(*) AS n
  FROM public.framework_controls GROUP BY framework_id
) c
WHERE c.framework_id = f.id::text;

COMMENT ON COLUMN public.framework_controls.framework_id IS
  'frameworks.id (uuid, stored as text) — the live id-space. The 20260826 seed migrations key this on slugs; this migration rewrites them to uuids so the Frameworks catalog tab resolves.';

-- Verification (2026-08-18, live project vhparvughsygyknblkzt), running the
-- exact query the UI runs — advertised = actual = distinct refs for all 15:
--
--   PCI DSS 246 | HITRUST 156 | ISO 27001 93 | HIPAA 76 | NIST AI RMF 72
--   SOC 2 61 | GDPR 39 | ISO 42001 38 | EU AI Act 34 | MITRE ATLAS 30
--   UNESCO 25 | Singapore 25 | Google SAIF 21 | OECD 10 | OWASP LLM 10
--   -> 936 total
--
-- RLS proven by impersonating a real authenticated tenant (not the service
-- role): 15 frameworks, 936 controls, SOC 2 = 61 visible.
