// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Compliance overview — a real view over the governed compliance entities:
// adopted frameworks (org-scoped `frameworks` table), the control library
// (`controls`) and the mesh-written `compliance_scores` recalculation feed.
// No seeded scores, no invented sub-metrics: when a value has not been
// measured it renders as an em dash, and report generation downloads the
// real derived snapshot as JSON.
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scale, Download } from 'lucide-react';
import { ShieldCheck, CheckCircle, ChartBar, ArrowsClockwise, BookOpen } from '@phosphor-icons/react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow, type StatCardRowItem } from '@/components/ui/StatCardRow';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/button';
import { useFrameworksData } from '@/hooks/useFrameworksData';
import { useControls } from '@/hooks/queries/useControls';
import { useRisksData } from '@/hooks/useRisksData';
import type { FrameworkRecord } from '@/services/frameworkService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { exportJson } from '@/lib/exportUtils';

interface MeshRecalcRow {
  id: string;
  framework: string | null;
  score_delta: number | null;
  recalculated_at: string | null;
  gaps: unknown;
}

// Mesh-written recalculation feed (compliance_scores) — read-only here.
async function fetchRecentMeshRecalcs(): Promise<MeshRecalcRow[]> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — compliance scores are unavailable');
  }
  const { data, error } = await supabase
    .from('compliance_scores')
    .select('id, framework, score_delta, recalculated_at, gaps')
    .order('recalculated_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(`Could not load mesh recalculations: ${error.message}`);
  return (data ?? []) as MeshRecalcRow[];
}

const IMPLEMENTED = new Set(['implemented', 'effective']);

function formatDateTime(d?: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const scoreColor = (s: number) => (s >= 85 ? 'hsl(var(--s-ok-tx))' : s >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))');

function SectionError({ label, error }: { label: string; error: unknown }) {
  return (
    <div className="border p-3" style={{ background: 'hsl(var(--s-er-bg))', borderColor: 'hsl(var(--s-er-br))' }}>
      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>{label}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{(error as Error)?.message ?? 'Unknown error'}</p>
    </div>
  );
}

export default function ComplianceDashboard() {
  const nav = useNavigate();
  const { frameworks, isLoading: fwLoading, error: fwError } = useFrameworksData();
  const controlsQuery = useControls();
  const meshQuery = useQuery({
    queryKey: ['compliance-scores-recent'],
    queryFn: fetchRecentMeshRecalcs,
    staleTime: 30_000,
  });

  // Published control catalogs (`framework_controls`). /compliance previously
  // had no reference to the catalog and no link to the page that renders it,
  // so the 936 seeded controls were unreachable from the surface a user
  // naturally opens. Counted for real — never asserted.
  const catalogQuery = useQuery({
    queryKey: ['framework-catalog-total'],
    queryFn: async (): Promise<number | null> => {
      if (!isSupabaseConfigured() || !supabase) return null
      const { count, error } = await supabase
        .from('framework_controls')
        .select('id', { count: 'exact', head: true })
      if (error) return null
      return count ?? 0
    },
    staleTime: 60_000,
  });

  const { risks, error: risksError } = useRisksData();

  const controls = controlsQuery.data ?? [];
  const recalcs = meshQuery.data ?? [];

  // Risk posture — derived client-side from the live risk register.
  const riskPosture = useMemo(() => {
    const openSet = new Set(['open', 'assessed', 'in_progress', 'investigating']);
    const isOpen = (s: unknown) => openSet.has(String(s ?? '').toLowerCase().replace(/\s+/g, '_'));
    const open = risks.filter(r => isOpen(r.status));
    const now = Date.now();
    return {
      open: open.length,
      critical: risks.filter(r => isOpen(r.status) && Number(r.risk_score ?? r.score ?? 0) >= 20).length,
      escalated: risks.filter(r => isOpen(r.status) && r.is_escalated).length,
      overdueReview: open.filter(r => r.next_review_date && new Date(r.next_review_date).getTime() < now).length,
    };
  }, [risks]);

  // Controls coverage derived from the real control library rows.
  const coverage = useMemo(() => {
    const total = controls.length;
    const implemented = controls.filter(
      (c) => IMPLEMENTED.has((c.implementationStatus ?? '').toLowerCase()) || IMPLEMENTED.has((c.status ?? '').toLowerCase()),
    ).length;
    return { total, implemented, pct: total > 0 ? Math.round((implemented / total) * 100) : null };
  }, [controls]);

  // Average framework score over frameworks that actually carry a score.
  const scored = frameworks.filter((f: FrameworkRecord) => f.score != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s: number, f: FrameworkRecord) => s + Number(f.score), 0) / scored.length)
    : null;

  // Real JSON snapshot of what this page derived — nothing invented.
  const downloadSnapshot = () => {
    exportJson(
      [{
        generatedAt: new Date().toISOString(),
        frameworks: frameworks.map((f: FrameworkRecord) => ({
          id: f.id,
          name: f.name,
          version: f.version ?? null,
          score: f.score ?? null,
          controlsTotal: f.controls_total ?? null,
          controlsImplemented: f.controls_implemented ?? null,
          nextAuditAt: f.next_audit_at ?? null,
        })),
        controlsCoverage: coverage,
        recentMeshRecalculations: recalcs,
      }],
      `compliance-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  if (fwLoading || controlsQuery.isLoading) {
    return <PageSkeleton title="Compliance" showStats rows={6} />;
  }

  const statCards: StatCardRowItem[] = [
    {
      label: 'Avg Framework Score',
      value: avgScore == null ? '—' : `${avgScore}%`,
      variant: avgScore == null ? 'default' : avgScore >= 85 ? 'success' : avgScore >= 70 ? 'warning' : 'danger',
      icon: <ChartBar size={14} weight="fill" />,
      description: avgScore == null ? 'No framework has a recorded score yet' : undefined,
    },
    { label: 'Frameworks Adopted', value: String(frameworks.length), icon: <ShieldCheck size={14} weight="fill" />, href: '/frameworks' },
    {
      label: 'Controls Implemented',
      value: coverage.total ? `${coverage.implemented}/${coverage.total}` : '—',
      variant: 'success',
      icon: <CheckCircle size={14} weight="fill" />,
      href: '/compliance/controls',
    },
    {
      // Null (query failed) renders '—', never a fabricated 0.
      label: 'Published Catalog Controls',
      value: catalogQuery.data == null ? '—' : String(catalogQuery.data),
      icon: <BookOpen size={14} weight="fill" />,
      href: '/frameworks?tab=catalog',
      description: catalogQuery.data == null
        ? 'Catalog count unavailable'
        : 'Requirements published by the adopted frameworks',
    },
    { label: 'Mesh Recalculations', value: String(recalcs.length), icon: <ArrowsClockwise size={14} weight="fill" /> },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Compliance"
        subtitle={`${frameworks.length} adopted framework${frameworks.length !== 1 ? 's' : ''} · ${coverage.total} controls in the library`}
        icon={Scale}
        actions={
          <Button size="sm" leftIcon={<Download size={13} />} onClick={downloadSnapshot}
            disabled={frameworks.length === 0 && controls.length === 0}>
            Download JSON Snapshot
          </Button>
        }
      />

      {fwError && <SectionError label="Failed to load frameworks" error={fwError} />}
      {controlsQuery.isError && <SectionError label="Failed to load controls" error={controlsQuery.error} />}

      <StatCardRow cards={statCards} />

      {/* Risk posture — compact strip derived live from the risk register */}
      <div className="border" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
        <div className="px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>RISK POSTURE</h3>
          <Link to="/risks" className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--brand))' }}>
            Open risk register →
          </Link>
        </div>
        {risksError ? (
          <p className="px-4 pb-3 text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>
            Risk register unavailable: {(risksError as Error).message}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x" style={{ borderTop: '1px solid hsl(var(--border))', borderColor: 'hsl(var(--border))' }}>
            {[
              { label: 'Open risks', value: riskPosture.open, tone: riskPosture.open > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' },
              { label: 'Critical (score ≥ 20)', value: riskPosture.critical, tone: riskPosture.critical > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-1))' },
              { label: 'Escalated', value: riskPosture.escalated, tone: riskPosture.escalated > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-1))' },
              { label: 'Review overdue', value: riskPosture.overdueReview, tone: riskPosture.overdueReview > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' },
            ].map(cell => (
              <Link key={cell.label} to="/risks" className="px-4 py-3 hover:bg-[hsl(var(--bg-raised))] transition-colors block">
                <p className="text-xl font-mono font-bold" style={{ color: cell.tone }}>{cell.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{cell.label}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Controls coverage — derived from real control rows */}
      <div className="border p-4" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>CONTROLS COVERAGE</h3>
          <span className="text-2xl font-mono font-bold" style={{ color: coverage.pct == null ? 'hsl(var(--text-4))' : scoreColor(coverage.pct) }}>
            {coverage.pct == null ? '—' : `${coverage.pct}%`}
          </span>
        </div>
        {coverage.pct == null ? (
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            No controls in the library yet — coverage appears once controls are defined in{' '}
            <Link to="/compliance/controls" className="underline" style={{ color: 'hsl(var(--brand))' }}>Compliance Controls</Link>.
          </p>
        ) : (
          <>
            <div className="w-full h-1.5" style={{ background: 'hsl(var(--bg-sunken))' }}>
              <div className="h-1.5 transition-all duration-700" style={{ width: `${coverage.pct}%`, background: scoreColor(coverage.pct) }} />
            </div>
            <p className="text-[10px] font-mono mt-1.5" style={{ color: 'hsl(var(--text-4))' }}>
              {coverage.implemented} of {coverage.total} controls implemented or effective
            </p>
          </>
        )}
      </div>

      {/* Framework cards — real org-scoped rows */}
      {frameworks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
          <ShieldCheck size={36} />
          <p className="mt-3 text-sm font-medium">No frameworks adopted yet</p>
          <p className="text-xs mt-1">Adopt a framework to start tracking compliance against it.</p>
          <Button size="sm" className="mt-4" onClick={() => nav('/frameworks')}>Go to Frameworks</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {frameworks.map((fw: FrameworkRecord) => {
            const score = fw.score != null ? Number(fw.score) : null;
            const total = fw.controls_total;
            const implemented = fw.controls_implemented;
            return (
              // `?open=<framework_id>` opens THAT framework's detail (the repo
              // deep-link convention), so a card lands on its own Requirements
              // tab — the published control catalog — instead of dropping the
              // reader on the generic list to find it again.
              <Link
                key={fw.id}
                to={`/frameworks?open=${encodeURIComponent(fw.id)}`}
                className="block border transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]"
                style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}
              >
                <div className="p-3">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                      {fw.name}{fw.version ? <span className="font-normal ml-1" style={{ color: 'hsl(var(--text-4))' }}>v{fw.version}</span> : null}
                    </span>
                    {fw.category && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 uppercase tracking-wider border flex-shrink-0"
                        style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderColor: 'hsl(var(--brand) / 0.3)' }}>
                        {fw.category}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xl font-mono font-bold" style={{ color: score == null ? 'hsl(var(--text-4))' : scoreColor(score) }}>
                      {score == null ? '—' : `${score}%`}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                      {total == null ? '—' : `${implemented ?? 0}/${total} implemented`}
                    </span>
                  </div>
                  <div className="w-full h-1 mt-1.5" style={{ background: 'hsl(var(--bg-sunken))' }}>
                    {score != null && <div className="h-1 transition-all" style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: scoreColor(score) }} />}
                  </div>
                  {score == null && (
                    <p className="text-[9px] mt-1.5" style={{ color: 'hsl(var(--text-4))' }}>No score recorded yet</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mesh recalculations — real compliance_scores rows written by the governance mesh */}
      <div className="border" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Mesh recalculations</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>Most recent framework score recalculations written by the governance mesh</p>
          </div>
        </div>
        {meshQuery.isLoading ? (
          <p className="px-4 py-6 text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading recalculations…</p>
        ) : meshQuery.isError ? (
          <div className="p-3"><SectionError label="Failed to load mesh recalculations" error={meshQuery.error} /></div>
        ) : recalcs.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            No mesh recalculations recorded yet — entries appear once the governance mesh recalculates a framework score.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                  {['Framework', 'Score Δ', 'Gaps Flagged', 'Recalculated'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recalcs.map((r) => {
                  const gapCount = Array.isArray(r.gaps) ? r.gaps.length : 0;
                  const delta = r.score_delta != null ? Number(r.score_delta) : null;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-[hsl(var(--bg-raised))]">
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                        {(r.framework ?? 'Unmapped framework').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: delta == null ? 'hsl(var(--text-4))' : delta < 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' }}>
                        {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {gapCount > 0 ? (
                          <Link to="/compliance/gap-analysis" className="underline" style={{ color: 'hsl(var(--brand))' }}>
                            {gapCount} gap{gapCount !== 1 ? 's' : ''}
                          </Link>
                        ) : (
                          <span style={{ color: 'hsl(var(--text-4))' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDateTime(r.recalculated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
