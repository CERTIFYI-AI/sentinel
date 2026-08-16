import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * useModelBacklinks — reverse-interlink footprint of one model across the
 * risk & security modules (risks, incidents, HITL, financial quantification,
 * threat feed, red-team findings, model arena) and the compliance cluster
 * (conformity assessments, evidence vault, post-market monitoring plans).
 *
 * Every source is queried independently and tolerates failure: a source whose
 * query errors reports `count: null` ("unavailable") instead of throwing the
 * whole hook, so one missing table never blanks the rest of the panel.
 * Counts and items come straight from the tenant-scoped tables (RLS applies);
 * nothing is invented client-side.
 */

export interface BacklinkItem {
  /** Row uuid (primary key) — used for per-record deep links. */
  id: string;
  /** Business reference (e.g. RSK-014, INC-2026-003) — may be absent. */
  ref: string | null;
  title: string;
  severity: string | null;
  status: string | null;
  /** Extra display note (e.g. formatted ALE for financial risks). */
  note: string | null;
}

export interface BacklinkSource {
  /** Total matching rows; null means the query for this source failed. */
  count: number | null;
  /** Up to 3 most recent matching rows (1 for arena runs). */
  items: BacklinkItem[];
}

export interface ModelBacklinks {
  risks: BacklinkSource;
  incidents: BacklinkSource;
  hitlReviews: BacklinkSource;
  financialRisks: BacklinkSource;
  securityThreats: BacklinkSource;
  redTeamFindings: BacklinkSource;
  arenaRuns: BacklinkSource;
  conformityAssessments: BacklinkSource;
  evidence: BacklinkSource;
  postMarketPlans: BacklinkSource;
}

const UNAVAILABLE: BacklinkSource = { count: null, items: [] };

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.length ? v : null);

/** Run one source query; a thrown/errored query resolves to `count: null`. */
async function safeSource(
  run: () => PromiseLike<{ data: Row[] | null; count: number | null; error: unknown }>,
  map: (row: Row) => BacklinkItem,
): Promise<BacklinkSource> {
  try {
    const { data, count, error } = await run();
    if (error) return UNAVAILABLE;
    const rows = data ?? [];
    return { count: count ?? rows.length, items: rows.map(map) };
  } catch {
    return UNAVAILABLE;
  }
}

function formatAle(ale: unknown, currency: unknown): string | null {
  if (typeof ale !== 'number') return null;
  const cur = typeof currency === 'string' && currency ? currency : 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: cur, maximumFractionDigits: 0,
    }).format(ale) + '/yr ALE';
  } catch {
    return `${ale.toLocaleString()} ${cur}/yr ALE`;
  }
}

const mapEvidenceRow = (r: Row): BacklinkItem => ({
  id: String(r.id),
  ref: null,
  title: str(r.title) ?? 'Untitled evidence',
  severity: null,
  status: str(r.freshness_status),
  note: null,
});

/**
 * evidence.linked_models is text[] of model ids/slugs, so `.contains` matches
 * the uuid as a string. Some environments carry the column as jsonb, where
 * contains fails type-wise — fall back to a bounded client-side filter over
 * (id, title, linked_models) instead of reporting the source unavailable.
 */
async function evidenceSource(modelId: string): Promise<BacklinkSource> {
  const primary = await safeSource(
    () => supabase.from('evidence')
      .select('id,title,freshness_status', { count: 'exact' })
      .contains('linked_models', [modelId])
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(3),
    mapEvidenceRow,
  );
  if (primary.count !== null) return primary;
  try {
    const { data, error } = await supabase.from('evidence')
      .select('id,title,freshness_status,linked_models,is_deleted')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return UNAVAILABLE;
    const rows = (data ?? []).filter((r: Row) =>
      !r.is_deleted && Array.isArray(r.linked_models) && (r.linked_models as unknown[]).includes(modelId));
    return { count: rows.length, items: rows.slice(0, 3).map(mapEvidenceRow) };
  } catch {
    return UNAVAILABLE;
  }
}

async function fetchModelBacklinks(modelId: string): Promise<ModelBacklinks> {
  const [
    risks, incidents, hitlReviews, financialRisks,
    securityThreats, redTeamFindings, arenaRuns,
    conformityAssessments, evidence, postMarketPlans,
  ] = await Promise.all([
    // linked_model_ids is text[] — the uuid is matched as a string.
    safeSource(
      () => supabase.from('risks')
        .select('id,risk_id,title', { count: 'exact' })
        .contains('linked_model_ids', [modelId])
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(3),
      r => ({ id: String(r.id), ref: str(r.risk_id), title: str(r.title) ?? 'Untitled risk', severity: null, status: null, note: null }),
    ),
    safeSource(
      () => supabase.from('incidents')
        .select('id,incident_id,title,severity,status', { count: 'exact' })
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(3),
      r => ({ id: String(r.id), ref: str(r.incident_id), title: str(r.title) ?? 'Untitled incident', severity: str(r.severity), status: str(r.status), note: null }),
    ),
    // hitl_reviews.model_id is TEXT — the uuid string matches directly.
    safeSource(
      () => supabase.from('hitl_reviews')
        .select('id,title,status', { count: 'exact' })
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(3),
      r => ({ id: String(r.id), ref: null, title: str(r.title) ?? 'Untitled review', severity: null, status: str(r.status), note: null }),
    ),
    safeSource(
      () => supabase.from('financial_risks')
        .select('id,fin_ref,title,annualized_loss_expectancy,currency', { count: 'exact' })
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(3),
      r => ({ id: String(r.id), ref: str(r.fin_ref), title: str(r.title) ?? 'Untitled scenario', severity: null, status: null, note: formatAle(r.annualized_loss_expectancy, r.currency) }),
    ),
    // affected_model_ids is uuid[].
    safeSource(
      () => supabase.from('security_threats')
        .select('id,threat_id,title,severity,status', { count: 'exact' })
        .contains('affected_model_ids', [modelId])
        .order('created_at', { ascending: false })
        .limit(3),
      r => ({ id: String(r.id), ref: str(r.threat_id), title: str(r.title) ?? 'Untitled threat', severity: str(r.severity), status: str(r.status), note: null }),
    ),
    safeSource(
      () => supabase.from('red_team_findings')
        .select('id,finding_ref,title,severity,status', { count: 'exact' })
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(3),
      r => ({ id: String(r.id), ref: str(r.finding_ref), title: str(r.title) ?? 'Untitled finding', severity: str(r.severity), status: str(r.status), note: null }),
    ),
    safeSource(
      () => supabase.from('model_arena_runs')
        .select('id,overall_score', { count: 'exact' })
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(1),
      r => ({
        id: String(r.id), ref: null, title: 'Latest arena run', severity: null, status: null,
        note: typeof r.overall_score === 'number' ? `Overall score ${r.overall_score}` : null,
      }),
    ),
    // conformity_assessments.model_id is TEXT — the uuid string matches directly.
    safeSource(
      () => supabase.from('conformity_assessments')
        .select('id,assessment_id,title,compliance_level,status,valid_until', { count: 'exact' })
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(3),
      r => ({
        id: String(r.id),
        ref: str(r.assessment_id),
        title: str(r.title) ?? 'Untitled assessment',
        severity: null,
        status: str(r.compliance_level) ?? str(r.status),
        note: typeof r.valid_until === 'string' && r.valid_until ? `Valid until ${r.valid_until.slice(0, 10)}` : null,
      }),
    ),
    evidenceSource(modelId),
    safeSource(
      () => supabase.from('post_market_plans')
        .select('id,plan_ref,name,status,frequency', { count: 'exact' })
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(3),
      r => ({
        id: String(r.id),
        ref: str(r.plan_ref),
        title: str(r.name) ?? 'Untitled plan',
        severity: null,
        status: str(r.status),
        note: str(r.frequency),
      }),
    ),
  ]);

  return {
    risks, incidents, hitlReviews, financialRisks, securityThreats, redTeamFindings, arenaRuns,
    conformityAssessments, evidence, postMarketPlans,
  };
}

export function useModelBacklinks(modelId: string | undefined) {
  return useQuery<ModelBacklinks>({
    queryKey: ['model-backlinks', modelId],
    queryFn: () => fetchModelBacklinks(modelId as string),
    enabled: !!modelId,
    staleTime: 60_000,
  });
}
