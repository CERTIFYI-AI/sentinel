// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Board Report — the document most likely to be repeated to a board or a
// regulator, so it is held to the strictest reading of CLAUDE.md #5 ("no
// invented data").
//
// Every figure below is computed at render time from the real org-scoped
// tables via the same hooks the CISO Dashboard uses:
//   ai_models · risks · incidents · frameworks · controls · bias_audits
//   (+ derived gap analysis over `controls`/`compliance_scores`)
//
// Deliberately NOT rendered, because nothing on the platform measures them:
//   · an "overall risk score" out of 25 and its quarter-over-quarter trend —
//     no historical snapshots are stored, so a trend is unfalsifiable;
//   · a hardcoded open-gap count, a per-framework compliance literal, and an
//     "average accuracy" (ai_models has no accuracy column — see
//     supabase/migrations/007_replay_baseline.sql);
//   · hand-written recommendations naming individuals and deadlines. The
//     Priority Actions section is derived from real open records instead, and
//     an owner is shown only when the record itself carries one.
//
// Averages exclude unmeasured rows and state the real denominator ("across N
// of M scored"); an unmeasured mean renders "—", never 0 and never green.
//
// Embedding: `BoardReportBody` is the presentational report and is embedded as
// a tab by CisoDashboard; the default export wraps it in page chrome for the
// standalone route /ciso/report.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Warning, Shield, Fire, Brain, Lightbulb, ArrowRight,
  DownloadSimple, FileJs, ChartBar,
} from '@phosphor-icons/react';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { DataTable, type Column } from '../../components/ui/DataTable';

import { useOrgName } from '../../hooks/useOrganization';
import { useModelsData } from '../../hooks/useModelsData';
import { useRisksData } from '../../hooks/useRisksData';
import { useIncidentData } from '../../hooks/useIncidentData';
import { useFrameworksData } from '../../hooks/useFrameworksData';
import { useControls } from '../../hooks/queries/useControls';
import { useGaps } from '../../hooks/useComplianceGroup';
import { biasAuditHooks } from '../../hooks/queries/useEvalsCrud';
import { scoreBand, type RiskRecord } from '../../services/riskService';
import type { IncidentRecord } from '../../services/incidentService';
import type { FrameworkRecord } from '../../services/frameworkService';
import type { ModelRecord } from '../../services/modelService';
import type { ControlRecord } from '../../services/controlService';
import { exportCsv, exportJson } from '../../lib/exportUtils';
import { logAction } from '../../lib/auditLogger';

// ── Small shared helpers ─────────────────────────────────────────────────────

const DASH = '—';

/** Live `frameworks` stores `score`; the service type still carries the legacy
 *  `compliance_score`. Read whichever is present — same rule as CisoDashboard. */
function frameworkScore(f: FrameworkRecord): number | null {
  const raw = (f as Record<string, unknown>).score ?? f.compliance_score;
  const n = Number(raw);
  return raw == null || Number.isNaN(n) ? null : n;
}
function frameworkTarget(f: FrameworkRecord): number | null {
  const raw = (f as Record<string, unknown>).target_score;
  const n = Number(raw);
  return raw == null || Number.isNaN(n) ? null : n;
}
function frameworkControls(f: FrameworkRecord): { implemented: number; total: number } | null {
  const rec = f as Record<string, unknown>;
  const total = Number(rec.controls_total ?? f.controls_count);
  const implemented = Number(rec.controls_implemented ?? 0);
  return Number.isNaN(total) || total <= 0
    ? null
    : { implemented: Number.isNaN(implemented) ? 0 : implemented, total };
}

/** Score-band colour — identical thresholds to CisoDashboard's `scoreColor`. */
function scoreColor(s: number) {
  if (s >= 80) return 'hsl(var(--s-ok-tx))';
  if (s >= 65) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--destructive))';
}

const isOpenRisk = (r: RiskRecord) => String(r.status ?? '').toLowerCase() === 'open';

/** A risk's score, or null when the row carries no usable score — an unscored
 *  risk renders "—" and sits in no band; it is never treated as a 0. */
function riskScoreOf(r: RiskRecord): number | null {
  const n = Number(r.risk_score);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const isActiveIncident = (i: IncidentRecord) =>
  !['resolved', 'closed'].includes(String(i.status ?? '').toLowerCase());

/** A control counts toward the mean only when it has actually been scored —
 *  never-tested rows are excluded rather than averaged in as zeros. */
const isScoredControl = (c: ControlRecord) =>
  typeof c.score === 'number' &&
  Number.isFinite(c.score) &&
  String(c.testResult ?? '').toLowerCase() !== 'not_tested';

/** Mean over measured values only; null when nothing is measured. */
function meanOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function fmtDate(v?: string | null): string {
  if (!v) return DASH;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? DASH
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtTimestamp(d: Date): string {
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Reporting period derived from the render time — never hardcoded. */
function quarterOf(d: Date): { label: string; start: Date; end: Date } {
  const q = Math.floor(d.getMonth() / 3);
  const start = new Date(d.getFullYear(), q * 3, 1);
  const end = new Date(d.getFullYear(), q * 3 + 3, 1);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return {
    label: `Q${q + 1} ${d.getFullYear()} (${months[q * 3]} – ${months[q * 3 + 2]})`,
    start,
    end,
  };
}

const SEVERITY_TOKENS: Record<string, { bg: string; tx: string; br: string }> = {
  critical: { bg: 'hsl(var(--r-cr-bg))', tx: 'hsl(var(--r-cr-tx))', br: 'hsl(var(--r-cr-br))' },
  high: { bg: 'hsl(var(--r-hi-bg))', tx: 'hsl(var(--r-hi-tx))', br: 'hsl(var(--r-hi-br))' },
  medium: { bg: 'hsl(var(--r-md-bg))', tx: 'hsl(var(--r-md-tx))', br: 'hsl(var(--r-md-br))' },
  low: { bg: 'hsl(var(--r-lo-bg))', tx: 'hsl(var(--r-lo-tx))', br: 'hsl(var(--r-lo-br))' },
};
const NEUTRAL_TOKENS = { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--s-nt-tx))', br: 'hsl(var(--s-nt-br))' };
const severityTokens = (s?: string | null) =>
  SEVERITY_TOKENS[String(s ?? '').toLowerCase()] ?? NEUTRAL_TOKENS;

function TokenBadge({ label, tone }: { label: string; tone: { bg: string; tx: string; br: string } }) {
  return (
    <Badge style={{ background: tone.bg, color: tone.tx, border: `1px solid ${tone.br}`, borderRadius: 0, fontSize: 10 }}>
      {label}
    </Badge>
  );
}

/** Business reference (risks.risk_id / incidents.incident_id). Never a raw
 *  uuid — "Unavailable" when the record carries no business ref. */
function BusinessRef({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>;
  return <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{value}</span>;
}

/**
 * KPI tile. `value === null` renders "—" in the muted token — never 0, never
 * green. Every tile that represents a set of records navigates to that set.
 */
function StatTile({
  label, value, sub, color, to, onNavigate,
}: {
  label: string;
  value: string | number | null;
  sub?: string;
  color?: string;
  to?: string;
  onNavigate?: (path: string) => void;
}) {
  const isNull = value === null || value === undefined;
  const body = (
    <>
      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: isNull ? 'hsl(var(--text-4))' : (color ?? 'hsl(var(--text-1))') }}>
        {isNull ? DASH : value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>{sub}</p>}
      {to && (
        <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: 'hsl(var(--brand))' }}>
          Open records <ArrowRight size={10} />
        </p>
      )}
    </>
  );
  const style = { padding: 16, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' } as const;
  if (!to || !onNavigate) return <div style={style}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onNavigate(to)}
      className="text-left hover:bg-muted/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ ...style, outlineColor: 'hsl(var(--brand))' }}
    >
      {body}
    </button>
  );
}

function SectionCard({
  id, title, icon: Icon, iconColor, children,
}: {
  id: string; title: string; icon: any; iconColor: string; children: React.ReactNode;
}) {
  return (
    <Card id={id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardHeader style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
          <Icon size={16} style={{ color: iconColor }} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">{children}</CardContent>
    </Card>
  );
}

const SECTIONS = [
  'Executive Summary',
  'Risk Overview',
  'Compliance Status',
  'Incident Summary',
  'Model Inventory',
  'Priority Actions',
];

// ── The report body (embedded as a CISO Dashboard tab, and standalone) ───────

export function BoardReportBody() {
  const navigate = useNavigate();
  const orgName = useOrgName();

  // Stable for the lifetime of the render session so every figure and the
  // exported provenance block share one "as of" instant.
  const generatedAt = useMemo(() => new Date(), []);
  const period = useMemo(() => quarterOf(generatedAt), [generatedAt]);

  const { models, isLoading: modelsLoading, error: modelsError } = useModelsData();
  const { risks, isLoading: risksLoading, error: risksError } = useRisksData();
  const { incidents, isLoading: incidentsLoading, error: incidentsError } = useIncidentData();
  const { frameworks, isLoading: frameworksLoading, error: frameworksError } = useFrameworksData();
  const { data: controls = [], isLoading: controlsLoading, error: controlsError } = useControls();
  const { items: gaps, isLoading: gapsLoading, error: gapsError } = useGaps();
  const { data: biasAudits = [], isLoading: biasLoading, error: biasError } = biasAuditHooks.useList();

  const loading = modelsLoading || risksLoading || incidentsLoading
    || frameworksLoading || controlsLoading || gapsLoading || biasLoading;

  // ── Risk ───────────────────────────────────────────────────────────────────
  const openRisks = useMemo(() => risks.filter(isOpenRisk), [risks]);
  const rankedOpenRisks = useMemo(
    () => [...openRisks].sort((a, b) => (riskScoreOf(b) ?? -1) - (riskScoreOf(a) ?? -1)),
    [openRisks],
  );
  const bandOf = (r: RiskRecord) => {
    const s = riskScoreOf(r);
    return s == null ? null : scoreBand(s).label;
  };
  const openCriticalRisks = openRisks.filter(r => bandOf(r) === 'Critical').length;
  const openHighRisks = openRisks.filter(r => bandOf(r) === 'High').length;
  const overdueRisks = openRisks.filter(
    r => r.deadline && new Date(r.deadline).getTime() < generatedAt.getTime(),
  );

  // ── Compliance ─────────────────────────────────────────────────────────────
  const frameworkScores = frameworks
    .map(frameworkScore)
    .filter((s): s is number => s != null);
  const avgFrameworkScore = meanOf(frameworkScores);

  const scoredControls = controls.filter(isScoredControl);
  const avgControlScore = meanOf(scoredControls.map(c => Number(c.score)));
  const failingControls = controls.filter(
    c => String(c.testResult ?? '').toLowerCase() === 'fail',
  );

  // ── Incidents ──────────────────────────────────────────────────────────────
  const incidentDate = (i: IncidentRecord) =>
    i.detected_at ?? i.occurred_date ?? i.detected_date ?? i.created_at;
  const incidentsThisPeriod = incidents.filter(i => {
    const t = new Date(incidentDate(i) ?? '').getTime();
    return !Number.isNaN(t) && t >= period.start.getTime() && t < period.end.getTime();
  }).length;
  const activeIncidents = incidents.filter(isActiveIncident);
  const resolvedIncidents = incidents.length - activeIncidents.length;
  const failedBiasAudits = biasAudits.filter(a => String(a.result ?? '').toLowerCase() === 'fail');

  // ── Models ─────────────────────────────────────────────────────────────────
  const productionModels = models.filter(m => m.lifecycle_stage === 'production');
  const highRiskModels = models.filter(m =>
    ['high', 'critical'].includes(String(m.risk_tier ?? '').toLowerCase()));
  const measuredFairness = models
    .map(m => m.fairness_score)
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
  const avgFairness = meanOf(measuredFairness);

  // Only claim "nothing recorded" when every table actually answered — a
  // failed read must never be reported to a board as an empty estate.
  const nothingRecorded =
    !loading && !incidentsError && !frameworksError && !controlsError
    && models.length === 0 && risks.length === 0 && incidents.length === 0
    && frameworks.length === 0 && controls.length === 0;

  // ── Priority actions — derived from real open records only ─────────────────
  type Action = {
    key: string; priority: 'critical' | 'high' | 'medium';
    text: string; sub: string; path: string; owner?: string | null; due?: string | null;
  };
  const actions: Action[] = useMemo(() => {
    const out: Action[] = [];
    for (const r of rankedOpenRisks) {
      const band = bandOf(r);
      if (band !== 'Critical' && band !== 'High') continue;
      out.push({
        key: `risk-${r.id}`,
        priority: band === 'Critical' ? 'critical' : 'high',
        text: r.title || 'Untitled risk',
        sub: `Open ${band.toLowerCase()} risk · score ${riskScoreOf(r) ?? DASH} · likelihood ${r.likelihood}/5 · impact ${r.impact}/5`,
        path: `/risks?open=${r.id}`,
        owner: r.owner || null,
        due: r.deadline ?? null,
      });
    }
    for (const i of activeIncidents) {
      const sev = String(i.severity ?? '').toLowerCase();
      if (!['critical', 'high'].includes(sev)) continue;
      out.push({
        key: `inc-${i.id}`,
        priority: sev === 'critical' ? 'critical' : 'high',
        text: i.title || i.description || 'Untitled incident',
        sub: `Unresolved ${sev} incident · status ${i.status ?? 'unknown'} · detected ${fmtDate(incidentDate(i))}`,
        path: `/risk/incidents?open=${i.id}`,
        owner: i.assignee || null,
        due: null,
      });
    }
    for (const a of failedBiasAudits) {
      out.push({
        key: `bias-${a.id}`,
        priority: 'critical',
        text: `${a.modelName || 'Model'} — bias audit failed`,
        sub: `Fairness ${typeof a.fairnessScore === 'number' ? `${a.fairnessScore}` : DASH} · ${a.framework || 'no framework recorded'}`,
        path: `/bias-audits?open=${a.id}`,
        owner: a.auditor || null,
        due: null,
      });
    }
    for (const c of failingControls) {
      out.push({
        key: `ctl-${c.id}`,
        priority: 'high',
        text: `${c.name || 'Untitled control'} — last test failed`,
        sub: `${c.controlRef ?? 'Unavailable'} · ${c.framework ?? 'no framework mapped'}`,
        path: c.id ? `/compliance/controls/${c.id}` : '/compliance/controls',
        owner: c.owner || null,
        due: c.remediationDeadline ?? null,
      });
    }
    const rank = { critical: 0, high: 1, medium: 2 } as const;
    return out.sort((a, b) => rank[a.priority] - rank[b.priority]);
  }, [rankedOpenRisks, activeIncidents, failedBiasAudits, failingControls]);

  // ── Export — a real file, with provenance, then an audit-log entry ─────────
  const provenanceRows = () => ([
    { Section: 'Provenance', Metric: 'Organisation', Value: orgName, Source: 'organizations' },
    { Section: 'Provenance', Metric: 'Reporting period', Value: period.label, Source: 'derived at render' },
    { Section: 'Provenance', Metric: 'Data as of', Value: generatedAt.toISOString(), Source: 'export time' },
    { Section: 'Provenance', Metric: 'Source tables', Value: 'ai_models; risks; incidents; frameworks; controls; bias_audits', Source: 'org-scoped (RLS)' },
    { Section: 'Provenance', Metric: 'Basis', Value: 'Point-in-time counts read from the governed tables at export time. Not audited, not assured, and not a period aggregate. No historical snapshots are stored, so no trend figures are included.', Source: 'CLAUDE.md #5' },
  ]);

  // A table that failed to load exports as "unavailable" — never as 0.
  const val = (err: unknown, v: string | number) => (err ? 'unavailable' : String(v));

  const metricRows = () => ([
    { Section: 'Risk', Metric: 'Open risks', Value: String(openRisks.length), Source: 'risks' },
    { Section: 'Risk', Metric: 'Open risks in the Critical band', Value: String(openCriticalRisks), Source: 'risks' },
    { Section: 'Risk', Metric: 'Open risks in the High band', Value: String(openHighRisks), Source: 'risks' },
    { Section: 'Risk', Metric: 'Open risks past their deadline', Value: String(overdueRisks.length), Source: 'risks' },
    { Section: 'Compliance', Metric: `Mean framework score (across ${frameworkScores.length} of ${frameworks.length} scored)`, Value: val(frameworksError, avgFrameworkScore != null ? `${avgFrameworkScore}%` : 'not measured'), Source: 'frameworks' },
    { Section: 'Compliance', Metric: `Mean control score (across ${scoredControls.length} of ${controls.length} scored)`, Value: val(controlsError, avgControlScore != null ? String(avgControlScore) : 'not measured'), Source: 'controls' },
    { Section: 'Compliance', Metric: 'Controls whose last test failed', Value: val(controlsError, failingControls.length), Source: 'controls' },
    { Section: 'Compliance', Metric: 'Open gaps', Value: val(gapsError, gaps.length), Source: 'controls + compliance_scores (derived)' },
    { Section: 'Incidents', Metric: 'Incidents recorded (all time)', Value: val(incidentsError, incidents.length), Source: 'incidents' },
    { Section: 'Incidents', Metric: `Incidents detected in ${period.label}`, Value: val(incidentsError, incidentsThisPeriod), Source: 'incidents' },
    { Section: 'Incidents', Metric: 'Unresolved incidents', Value: val(incidentsError, activeIncidents.length), Source: 'incidents' },
    { Section: 'Incidents', Metric: 'Resolved or closed incidents', Value: val(incidentsError, resolvedIncidents), Source: 'incidents' },
    { Section: 'Incidents', Metric: 'Bias audits with a failed verdict', Value: val(biasError, failedBiasAudits.length), Source: 'bias_audits' },
    { Section: 'Models', Metric: 'Models registered', Value: String(models.length), Source: 'ai_models' },
    { Section: 'Models', Metric: 'Models in production', Value: String(productionModels.length), Source: 'ai_models' },
    { Section: 'Models', Metric: 'Models tiered high or critical', Value: String(highRiskModels.length), Source: 'ai_models' },
    { Section: 'Models', Metric: `Mean fairness score (across ${measuredFairness.length} of ${models.length} measured)`, Value: avgFairness != null ? `${avgFairness}%` : 'not measured', Source: 'ai_models' },
  ]);

  const stamp = generatedAt.toISOString().slice(0, 10);

  const runExport = (format: 'csv' | 'json') => {
    try {
      const rows = [...provenanceRows(), ...metricRows()];
      if (format === 'csv') {
        exportCsv(rows, `board-report-${stamp}.csv`);
      } else {
        exportJson([{
          provenance: {
            organisation: orgName,
            reporting_period: period.label,
            data_as_of: generatedAt.toISOString(),
            source_tables: ['ai_models', 'risks', 'incidents', 'frameworks', 'controls', 'bias_audits'],
            basis: 'Point-in-time counts read from the governed org-scoped tables at export time. Not audited, not assured, and not a period aggregate. No historical snapshots are stored, so no trend figures are included.',
          },
          metrics: metricRows(),
          risks: rankedOpenRisks.map(r => ({
            id: r.id, risk_ref: r.risk_id ?? null, title: r.title, category: r.category,
            score: riskScoreOf(r), band: bandOf(r), status: r.status, owner: r.owner ?? null,
          })),
          incidents: incidents.map(i => ({
            id: i.id, incident_ref: i.incident_id ?? null, title: i.title,
            severity: i.severity ?? null, status: i.status ?? null, detected: incidentDate(i) ?? null,
          })),
          models: models.map(m => ({
            id: m.id, name: m.name, lifecycle_stage: m.lifecycle_stage ?? null,
            risk_tier: m.risk_tier ?? null, fairness_score: m.fairness_score ?? null,
            drift_status: m.drift_status ?? null, provider: m.provider ?? null,
          })),
        }], `board-report-${stamp}.json`);
      }
      // Art. 12 traceability: the export of a board-facing figure set is a
      // recordable event. Fire-and-forget by contract (logAction never throws).
      void logAction({
        module: 'board-report',
        entityType: 'report',
        entityName: `Board report ${period.label}`,
        action: 'export',
        newValues: {
          format,
          data_as_of: generatedAt.toISOString(),
          metric_count: metricRows().length,
        },
      });
      toast.success(`Board report exported as ${format.toUpperCase()} (${rows.length} rows).`);
    } catch (e) {
      toast.error(e instanceof Error ? `Export failed: ${e.message}` : 'Export failed.');
    }
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  // The report cannot be honest if its two spine tables failed to load.
  const spineError = (risksError ?? modelsError) as Error | null;
  if (spineError) {
    return (
      <ErrorState
        title="The board report could not be assembled"
        description={`The risk register or model inventory could not be read, so no figure on this report can be trusted. ${spineError instanceof Error ? spineError.message : ''}`.trim()}
      />
    );
  }

  if (nothingRecorded) {
    return (
      <EmptyState
        icon={<ChartBar size={28} />}
        title="Nothing to report yet"
        description="No models, risks, incidents, frameworks or controls are recorded for this organisation, so there are no figures to put in front of a board. Register the governed estate first — the report fills itself from those tables."
        action={
          <Button size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/models/inventory')}>
            Open Model Inventory <ArrowRight size={12} />
          </Button>
        }
      />
    );
  }

  const riskColumns: Column<RiskRecord>[] = [
    { key: 'risk_id', header: 'Risk Ref', render: r => <BusinessRef value={r.risk_id} /> },
    { key: 'title', header: 'Title', sortable: true, render: r => <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{r.title || 'Untitled risk'}</span> },
    { key: 'category', header: 'Category', render: r => <span className="text-xs">{r.category || DASH}</span> },
    {
      key: 'risk_score', header: 'Score', sortable: true, render: r => {
        const s = riskScoreOf(r);
        if (s == null) return <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{DASH}</span>;
        return <span className="text-sm font-bold" style={{ color: scoreBand(s).text }}>{s}</span>;
      },
    },
    {
      key: 'band', header: 'Band', render: r => {
        const s = riskScoreOf(r);
        if (s == null) return <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unscored</span>;
        const band = scoreBand(s);
        return <TokenBadge label={band.label} tone={{ bg: band.bg, tx: band.text, br: band.text }} />;
      },
    },
    { key: 'owner', header: 'Owner', render: r => <span className="text-xs">{r.owner || DASH}</span> },
    { key: 'deadline', header: 'Deadline', render: r => <span className="text-xs">{fmtDate(r.deadline)}</span> },
  ];

  const incidentColumns: Column<IncidentRecord>[] = [
    { key: 'incident_id', header: 'Incident Ref', render: i => <BusinessRef value={i.incident_id} /> },
    { key: 'title', header: 'Title', sortable: true, render: i => <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{i.title || 'Untitled incident'}</span> },
    { key: 'severity', header: 'Severity', render: i => <TokenBadge label={i.severity ?? 'unrated'} tone={severityTokens(i.severity)} /> },
    { key: 'category', header: 'Category', render: i => <span className="text-xs">{i.category || i.incident_type || DASH}</span> },
    { key: 'status', header: 'Status', render: i => <span className="text-xs">{i.status || DASH}</span> },
    { key: 'detected', header: 'Detected', render: i => <span className="text-xs">{fmtDate(incidentDate(i))}</span> },
  ];

  const modelColumns: Column<ModelRecord>[] = [
    { key: 'name', header: 'Model', sortable: true, render: m => (
      <div>
        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name || 'Unnamed model'}</p>
        {m.version && <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>v{m.version}</p>}
      </div>
    ) },
    { key: 'lifecycle_stage', header: 'Lifecycle', render: m => <span className="text-xs">{m.lifecycle_stage || DASH}</span> },
    { key: 'risk_tier', header: 'Risk Tier', render: m => (
      m.risk_tier
        ? <TokenBadge label={m.risk_tier} tone={severityTokens(m.risk_tier)} />
        : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unassessed</span>
    ) },
    { key: 'fairness_score', header: 'Fairness', render: m => (
      typeof m.fairness_score === 'number'
        ? <span className="text-xs font-semibold" style={{ color: scoreColor(m.fairness_score) }}>{m.fairness_score}%</span>
        : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Not measured</span>
    ) },
    { key: 'drift_status', header: 'Drift', render: m => <span className="text-xs">{m.drift_status || DASH}</span> },
    { key: 'business_owner', header: 'Owner', render: m => <span className="text-xs">{m.business_owner || m.technical_owner || DASH}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Provenance + real export actions */}
      <div
        className="flex items-start justify-between gap-4 flex-wrap"
        style={{ padding: 16, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            {orgName} · AI Governance &amp; Risk Report · {period.label}
          </p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            Data as of {fmtTimestamp(generatedAt)} · sources: ai_models, risks, incidents, frameworks, controls, bias_audits
          </p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
            Every figure is a point-in-time count read from the governed tables at render time. It is not audited,
            not assured, and not a period aggregate. No historical snapshots are stored, so no trend is shown.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => runExport('csv')}>
            <DownloadSimple size={14} /> Export CSV
          </Button>
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => runExport('json')}>
            <FileJs size={14} /> Export JSON
          </Button>
        </div>
      </div>

      {/* Section nav */}
      <div className="flex gap-1 flex-wrap">
        {SECTIONS.map(s => (
          <a
            key={s}
            href={`#${s.toLowerCase().replace(/ /g, '-')}`}
            style={{
              padding: '4px 12px', background: 'hsl(var(--bg-muted))',
              border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))',
              fontSize: 12, textDecoration: 'none', display: 'inline-block',
            }}
          >
            {s}
          </a>
        ))}
      </div>

      {/* ─── Executive Summary ─── */}
      <Card id="executive-summary" style={{ background: 'hsl(var(--bg-surface))', border: '2px solid hsl(var(--brand))' }}>
        <CardHeader style={{ background: 'hsl(var(--brand) / 0.08)', borderBottom: '1px solid hsl(var(--border))' }}>
          <CardTitle className="text-base font-bold" style={{ color: 'hsl(var(--text-1))' }}>Executive Summary</CardTitle>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{orgName} · {period.label}</p>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>
            The governed estate holds <strong style={{ color: 'hsl(var(--text-1))' }}>{models.length} registered {models.length === 1 ? 'model' : 'models'}</strong>
            {' '}({productionModels.length} in production, {highRiskModels.length} tiered high or critical).
            {' '}<strong style={{ color: openRisks.length > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-1))' }}>{openRisks.length} {openRisks.length === 1 ? 'risk is' : 'risks are'} open</strong>
            {openRisks.length > 0 && <> — {openCriticalRisks} in the Critical band and {openHighRisks} in the High band</>}.
            {' '}{incidentsError
              ? 'Incident counts are unavailable — the incidents table could not be read.'
              : `${activeIncidents.length} of ${incidents.length} recorded incidents are unresolved.`}
            {' '}{frameworksError ? (
              'Framework compliance is unavailable — the frameworks table could not be read.'
            ) : (
              <>
                Framework compliance averages{' '}
                {avgFrameworkScore != null
                  ? <strong style={{ color: scoreColor(avgFrameworkScore) }}>{avgFrameworkScore}%</strong>
                  : <strong style={{ color: 'hsl(var(--text-4))' }}>{DASH}</strong>}
                {' '}across {frameworkScores.length} of {frameworks.length} registered {frameworks.length === 1 ? 'framework' : 'frameworks'} that carry a score
                {frameworkScores.length === 0 && ' (none are scored yet)'}.
              </>
            )}
            {' '}{actions.length > 0
              ? `${actions.length} ${actions.length === 1 ? 'item' : 'items'} are listed under Priority Actions, each linked to its source record.`
              : 'Nothing currently meets the threshold for a priority action.'}
          </p>
        </CardContent>
      </Card>

      {/* ─── Risk Overview ─── */}
      <SectionCard id="risk-overview" title="Risk Overview" icon={Warning} iconColor="hsl(var(--s-er-tx))">
        <div className="grid grid-cols-4 gap-3">
          <StatTile label="Open Risks" value={openRisks.length} sub="Register, status = open"
            color={openRisks.length > 0 ? 'hsl(var(--s-er-tx))' : undefined}
            to="/risks" onNavigate={navigate} />
          <StatTile label="Open — Critical Band" value={openCriticalRisks} sub="Score ≥ 20"
            color={openCriticalRisks > 0 ? 'hsl(var(--destructive))' : undefined}
            to="/risks" onNavigate={navigate} />
          <StatTile label="Open — High Band" value={openHighRisks} sub="Score 12–19"
            color={openHighRisks > 0 ? 'hsl(var(--r-hi-tx))' : undefined}
            to="/risks" onNavigate={navigate} />
          <StatTile label="Past Deadline" value={overdueRisks.length} sub="Open with a deadline in the past"
            color={overdueRisks.length > 0 ? 'hsl(var(--s-wn-tx))' : undefined}
            to="/risks" onNavigate={navigate} />
        </div>

        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>OPEN RISKS BY SCORE</p>
          <DataTable<RiskRecord>
            data={rankedOpenRisks}
            columns={riskColumns}
            searchKey="title"
            searchPlaceholder="Search open risks…"
            defaultPageSize={10}
            emptyMessage="No open risks in the register."
            onRowClick={r => navigate(`/risks?open=${r.id}`)}
          />
        </div>
      </SectionCard>

      {/* ─── Compliance Status ─── */}
      <SectionCard id="compliance-status" title="Compliance Status" icon={Shield} iconColor="hsl(var(--s-ok-tx))">
        <div className="grid grid-cols-4 gap-3">
          <StatTile
            label="Mean Framework Score"
            value={frameworksError ? null : (avgFrameworkScore != null ? `${avgFrameworkScore}%` : null)}
            sub={frameworksError
              ? 'Frameworks could not be read'
              : `Across ${frameworkScores.length} of ${frameworks.length} frameworks scored`}
            color={avgFrameworkScore != null ? scoreColor(avgFrameworkScore) : undefined}
            to="/frameworks" onNavigate={navigate}
          />
          <StatTile
            label="Mean Control Score"
            value={controlsError ? null : (avgControlScore != null ? String(avgControlScore) : null)}
            sub={controlsError
              ? 'Controls could not be read'
              : `Across ${scoredControls.length} of ${controls.length} controls scored`}
            color={avgControlScore != null ? scoreColor(avgControlScore) : undefined}
            to="/compliance/controls" onNavigate={navigate}
          />
          <StatTile
            label="Controls Failing"
            value={controlsError ? null : failingControls.length}
            sub="Last recorded test result = fail"
            color={failingControls.length > 0 ? 'hsl(var(--s-er-tx))' : undefined}
            to="/compliance/controls" onNavigate={navigate}
          />
          <StatTile
            label="Open Gaps"
            value={gapsError ? null : gaps.length}
            sub={gapsError ? 'Gap analysis could not be read' : 'Derived from unimplemented controls'}
            color={gaps.length > 0 ? 'hsl(var(--r-hi-tx))' : undefined}
            to="/compliance/gap-analysis" onNavigate={navigate}
          />
        </div>

        {frameworksError ? (
          <ErrorState title="Frameworks could not be loaded" error={frameworksError as Error} />
        ) : frameworks.length === 0 ? (
          <EmptyState
            icon={<Shield size={24} />}
            title="No frameworks registered"
            description="Compliance posture cannot be reported until at least one framework is registered and scored."
            action={
              <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/frameworks')}>
                Open Frameworks <ArrowRight size={12} />
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {frameworks.map(f => {
              const score = frameworkScore(f);
              const target = frameworkTarget(f);
              const ctl = frameworkControls(f);
              const color = score != null ? scoreColor(score) : 'hsl(var(--text-4))';
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => navigate('/frameworks')}
                  className="w-full text-left hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: 'hsl(var(--brand))' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</span>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      <span>{ctl ? `${ctl.implemented}/${ctl.total} controls` : `${DASH} controls`}</span>
                      <span>Target {target != null ? `${Math.round(target)}%` : DASH}</span>
                      <span className="font-bold" style={{ color }}>
                        {score != null ? `${Math.round(score)}%` : 'Not scored'}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: 'hsl(var(--bg-muted))' }}>
                    <div style={{ width: `${score ?? 0}%`, height: '100%', background: color }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ─── Incident Summary ─── */}
      <SectionCard id="incident-summary" title="Incident Summary" icon={Fire} iconColor="hsl(var(--r-hi-tx))">
        <div className="grid grid-cols-4 gap-3">
          <StatTile label="Incidents Recorded" value={incidentsError ? null : incidents.length} sub="All time"
            to="/risk/incidents" onNavigate={navigate} />
          <StatTile label={`Detected in ${period.label.split(' (')[0]}`} value={incidentsError ? null : incidentsThisPeriod}
            sub="By detection date"
            to="/risk/incidents" onNavigate={navigate} />
          <StatTile label="Unresolved" value={incidentsError ? null : activeIncidents.length} sub="Not resolved or closed"
            color={activeIncidents.length > 0 ? 'hsl(var(--r-hi-tx))' : undefined}
            to="/risk/incidents" onNavigate={navigate} />
          <StatTile label="Bias Audits Failed" value={biasError ? null : failedBiasAudits.length} sub="Verdict = fail"
            color={failedBiasAudits.length > 0 ? 'hsl(var(--s-er-tx))' : undefined}
            to="/bias-audits" onNavigate={navigate} />
        </div>

        {incidentsError ? (
          <ErrorState title="Incidents could not be loaded" error={incidentsError as Error} />
        ) : (
          <DataTable<IncidentRecord>
            data={incidents}
            columns={incidentColumns}
            searchKey="title"
            searchPlaceholder="Search incidents…"
            defaultPageSize={10}
            emptyMessage="No incidents recorded."
            onRowClick={i => navigate(`/risk/incidents?open=${i.id}`)}
          />
        )}
      </SectionCard>

      {/* ─── Model Inventory ─── */}
      <SectionCard id="model-inventory" title="Model Inventory Summary" icon={Brain} iconColor="hsl(var(--s-in-tx))">
        <div className="grid grid-cols-4 gap-3">
          <StatTile label="Registered Models" value={models.length} sub="ai_models inventory"
            to="/models/inventory" onNavigate={navigate} />
          <StatTile label="In Production" value={productionModels.length} sub="Lifecycle = production"
            color={productionModels.length > 0 ? 'hsl(var(--s-ok-tx))' : undefined}
            to="/models/inventory" onNavigate={navigate} />
          <StatTile label="High / Critical Tier" value={highRiskModels.length} sub="Enhanced oversight required"
            color={highRiskModels.length > 0 ? 'hsl(var(--s-er-tx))' : undefined}
            to="/models/inventory" onNavigate={navigate} />
          <StatTile
            label="Mean Fairness Score"
            value={avgFairness != null ? `${avgFairness}%` : null}
            sub={`Across ${measuredFairness.length} of ${models.length} models measured`}
            color={avgFairness != null ? scoreColor(avgFairness) : undefined}
            to="/models/inventory" onNavigate={navigate}
          />
        </div>
        <DataTable<ModelRecord>
          data={models}
          columns={modelColumns}
          searchKey="name"
          searchPlaceholder="Search models…"
          defaultPageSize={10}
          emptyMessage="No models registered in the inventory."
          onRowClick={m => navigate(`/models/inventory/${m.id}`)}
        />
      </SectionCard>

      {/* ─── Priority Actions ─── */}
      <SectionCard id="priority-actions" title="Priority Actions" icon={Lightbulb} iconColor="hsl(var(--s-wn-tx))">
        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          Derived from open records at render time — open risks in the Critical/High bands, unresolved critical or high
          incidents, failed bias audits and failed control tests. Accountability is shown only where the record itself
          names an owner; the platform does not assign one.
        </p>
        {actions.length === 0 ? (
          <EmptyState
            icon={<Lightbulb size={24} />}
            title="No priority actions outstanding"
            description="No open Critical/High risk, unresolved critical or high incident, failed bias audit, or failed control test is currently recorded."
          />
        ) : (
          <div className="space-y-2">
            {actions.map(a => {
              const tone = severityTokens(a.priority);
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => navigate(a.path)}
                  className="w-full text-left hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ padding: '12px 16px', border: `1px solid ${tone.br}`, background: tone.bg, outlineColor: 'hsl(var(--brand))' }}
                >
                  <div className="flex items-start gap-3">
                    <TokenBadge label={a.priority.toUpperCase()} tone={tone} />
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{a.text}</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>{a.sub}</p>
                      <div className="flex gap-4 mt-1.5">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                          Owner: {a.owner || 'Unassigned'}
                        </span>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                          Deadline: {fmtDate(a.due)}
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))', flexShrink: 0, marginTop: 4 }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Footer */}
      <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 16 }}>
        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          {orgName} — Sentinel AI GRC Platform · Data as of {fmtTimestamp(generatedAt)} · CONFIDENTIAL ·
          Point-in-time counts from the governed tables; not audited.
        </p>
      </div>
    </div>
  );
}

// ── Standalone page (/ciso/report) ───────────────────────────────────────────

export default function BoardReport() {
  const orgName = useOrgName();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Board Report"
        subtitle={`${orgName} · AI governance and risk posture, computed live from the governed tables`}
        breadcrumbs={[{ label: 'CISO Dashboard', href: '/ciso' }, { label: 'Board Report' }]}
      />
      <BoardReportBody />
    </div>
  );
}
