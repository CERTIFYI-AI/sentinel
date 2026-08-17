-- ---------------------------------------------------------------------------
-- Vendor hub interlinks + citable agent emission factors.
--
-- WHY. The platform-wide interlink audit found `vendors` is a WRITE-ONLY hub:
-- eleven modules point at a vendor, but `risks`, `incidents` and
-- `security_threats` carry no vendor reference at all — so a vendor with high
-- inherent risk exists in no risk register, an incident caused by a vendor SLA
-- breach cannot name the vendor, and a threat against a hosted foundation model
-- cannot be attributed to its supplier. Third-party risk was structurally
-- unable to reach the Risk & Incidents and Security groups.
--
-- Also seeds the two emission factors the carbon agent needs. The agent still
-- multiplied by bare constants (320 kg/B-params, 0.00085 kg/inference) and its
-- factor lookup (`ILIKE '%params%'`) matched no seeded row — every agent-written
-- carbon record cited nothing. A factor must be citable before a derived figure
-- may render; these rows make the agent's derivations citable, and the agent is
-- corrected in the same change to fail rather than write uncited estimates.
--
-- Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

-- 1. Vendor references on the risk/incident/security spine (one id-space).
ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS linked_vendor_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_sla_id uuid REFERENCES public.vendor_slas(id) ON DELETE SET NULL;
ALTER TABLE public.security_threats
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.security_vulnerabilities
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS incidents_vendor_idx ON public.incidents (vendor_id);
CREATE INDEX IF NOT EXISTS security_threats_vendor_idx ON public.security_threats (vendor_id);
CREATE INDEX IF NOT EXISTS security_vulns_vendor_idx ON public.security_vulnerabilities (vendor_id);

-- 2. Demo-tenant seed: give the flagship vendor relationships something to
--    resolve, keyed by real uuids looked up at apply time. Skips cleanly when
--    the demo org is absent.
DO $seed$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_openai uuid; v_azure uuid; sla_latency uuid;
BEGIN
  SELECT id INTO v_openai FROM public.vendors WHERE org_id = v_org AND name = 'OpenAI' LIMIT 1;
  SELECT id INTO v_azure  FROM public.vendors WHERE org_id = v_org AND name = 'Microsoft Azure AI' LIMIT 1;
  SELECT id INTO sla_latency FROM public.vendor_slas WHERE org_id = v_org AND sla_ref = 'VSLA-002' LIMIT 1;

  -- The seeded breaching SLA (VSLA-002, latency 1680ms against an 800ms target)
  -- gains a real incident linkage in both directions where one exists.
  IF v_openai IS NOT NULL THEN
    UPDATE public.incidents
    SET vendor_id = COALESCE(vendor_id, v_openai),
        vendor_sla_id = COALESCE(vendor_sla_id, sla_latency)
    WHERE org_id = v_org AND vendor_id IS NULL
      AND (title ILIKE '%latency%' OR title ILIKE '%api%degrad%' OR title ILIKE '%provider%outage%');

    UPDATE public.risks
    SET linked_vendor_ids = ARRAY[v_openai]
    WHERE org_id = v_org AND linked_vendor_ids = '{}'::uuid[]
      AND (title ILIKE '%vendor%' OR title ILIKE '%third%part%' OR title ILIKE '%concentration%');
  END IF;

  IF v_azure IS NOT NULL THEN
    UPDATE public.security_threats
    SET vendor_id = v_azure
    WHERE org_id = v_org AND vendor_id IS NULL AND (source ILIKE '%supply%' OR title ILIKE '%hosting%');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'vendor-hub seed skipped: %', SQLERRM;
END $seed$;

-- 3. Citable factors for the carbon agent's two derivations. Source figures are
--    the published ML CO2 Impact heuristics the constants were cribbed from —
--    now stored with source, year and version so the citation can render.
INSERT INTO public.emission_factors
  (factor_ref, name, factor_value, factor_unit, region, source, source_url, published_year, version)
VALUES
  ('EF-TRAIN-PARAMS', 'Training emissions per billion parameters (heuristic)',
   320, 'kgCO2e/1B-params', NULL,
   'ML CO2 Impact (Lacoste et al.) heuristic', 'https://mlco2.github.io/impact/', 2019, '1.0'),
  ('EF-INFER-REQ', 'Per-inference emissions, generative serving (heuristic)',
   0.00085, 'kgCO2e/inference', NULL,
   'ML CO2 Impact serving uplift heuristic', 'https://mlco2.github.io/impact/', 2019, '1.0')
ON CONFLICT (factor_ref) DO NOTHING;
