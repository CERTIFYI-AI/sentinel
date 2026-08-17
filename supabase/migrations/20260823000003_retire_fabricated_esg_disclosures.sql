-- ---------------------------------------------------------------------------
-- Retire the fabricated ESG disclosures.
--
-- WHY. PR #75 deleted `SEED_ESG_REPORTS` from `esgService.ts` and its comment
-- claims an empty tenant now gets `[]`. That is true of the TypeScript and
-- false of the database: `20260421000004_p1_seed_all_modules.sql:576-612` seeds
-- three rows with `status = 'published'` containing exactly the fabrications the
-- rebuild condemned. The page rewrite never touched the migration, so the fiction
-- simply moved out of sight.
--
-- What was seeded, and why each part is unacceptable on a disclosure surface:
--
--   * `assurance_provider: 'PwC'` and `'Deloitte'` — REAL audit firms named as
--     the assurers of content nobody produced. This is the single worst artefact
--     the platform can emit: an unassured disclosure carrying a Big Four name.
--     Compounding it, `esgService.ts` falls back to `metadata.assurance_provider`
--     when the column is null, and 20260822000003 set `assurance_status='none'`
--     — so the UI rendered the self-contradicting string "No assurance · PwC".
--   * Invented dimension scores (72.4 / 81.3 / 88.9 …) presented as measured.
--   * Factual achievement claims — "Reduced per-inference carbon by 18% vs 2024",
--     "Achieved 31% renewable energy share" — that no record substantiates.
--   * `ai_metrics` with fabricated precision (`co2_kg: 89240`,
--     `carbon_per_inference_mg: 63.7`), which the page renders under the heading
--     "As recorded on the report" and writes verbatim into the downloaded
--     disclosure file.
--   * `published_at` set with NO approver and NO approved_by — a published
--     regulatory disclosure with no accountable human, which is precisely the
--     artefact the Art. 14 oversight path exists to prevent.
--
-- WHAT THIS DOES. The rows are kept as demo scaffolding (title, period,
-- framework) so the module still demonstrates its shape, but every fabricated
-- assertion is removed and the lifecycle state is corrected to `draft` — because
-- nothing was ever approved, and a draft is what an unapproved document is.
-- Demo data may be fictional; it may not assert measurements or name real firms.
--
-- Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

UPDATE public.esg_reports
SET
  -- Nothing here was ever approved by anyone, so it is not published.
  status = 'draft',
  published_at = NULL,
  -- Invented scores presented as measured.
  environmental_score = NULL,
  social_score = NULL,
  governance_score = NULL,
  overall_score = NULL,
  -- Unsubstantiated factual claims and fabricated precise metrics.
  highlights = '[]'::jsonb,
  ai_metrics = '{}'::jsonb,
  -- Strip the real audit-firm names from metadata; keep the rest of the demo
  -- scaffolding (framework alignment flags, material topics).
  metadata = (COALESCE(metadata, '{}'::jsonb) - 'assurance_provider')
             || jsonb_build_object(
                  'demo_seed', true,
                  'fabrication_retired', '2026-08-17',
                  'note', 'Fictional demo record. Scores, highlights and metrics were '
                       || 'fabricated by an early seed and have been removed; this row '
                       || 'asserts no measured value and carries no assurance.'),
  assurance_status = 'none',
  assurance_provider = NULL,
  assurance_date = NULL,
  updated_at = now()
WHERE id IN (
  '77700001-0000-0000-0000-000000000001'::uuid,
  '77700002-0000-0000-0000-000000000001'::uuid,
  '77700003-0000-0000-0000-000000000001'::uuid
);

-- Catch any other seeded row that named a real assurance firm without the
-- column being set — the fallback in the service made these render as though
-- the firm had signed off.
UPDATE public.esg_reports
SET metadata = COALESCE(metadata, '{}'::jsonb) - 'assurance_provider',
    updated_at = now()
WHERE metadata ? 'assurance_provider'
  AND assurance_provider IS NULL;

-- ---------------------------------------------------------------------------
-- Evidence-chain hygiene: 20260822000003 attached real carbon_record_ids to
-- these reports, which laundered fabricated disclosures into the evidence
-- chain — and cited 2026 records on FY2024/FY2025 reports, evidence that
-- postdates the disclosure by up to two years. Detach anything whose period
-- does not fall inside the report's own reporting period.
-- ---------------------------------------------------------------------------
UPDATE public.esg_reports r
SET carbon_record_ids = COALESCE((
      SELECT array_agg(c.id)
      FROM public.carbon_records c
      WHERE c.id = ANY(r.carbon_record_ids)
        AND r.period_start IS NOT NULL AND r.period_end IS NOT NULL
        AND c.period_start >= r.period_start
        AND c.period_end   <= r.period_end
    ), '{}'::uuid[]),
    updated_at = now()
WHERE r.carbon_record_ids <> '{}'::uuid[];
