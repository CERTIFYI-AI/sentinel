// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Platform front page (/ and /dashboard redirect here). Everything rendered on
// this page is derived from a real, org-scoped query. Sections that could not
// be backed by a query were REMOVED rather than relabelled — see
// docs/reference/technical-debt.md TD-009. Specifically deleted: the SLA
// countdown table (REM-001…), the cross-module dependency SVG (MDL-001 business
// codes), the "Real-Time Trust Score 86" panel (which also collided with the
// 0.0–1.0 verifier composite defined in docs/reference/trust-score.md) and the
// AI System Governance Coverage matrix. Null is rendered as "—", never as 0 and
// never as green.
import { isOverdueTask } from '@/services/taskService';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import {
  Clock, Warning, Brain, WarningCircle, Briefcase,
  StackSimple, ArrowRight, ChartLine, CheckCircle,
  TrendUp, TrendDown, Minus, ShieldCheck, Siren,
  Robot, Scales, Eye, Lightning, PresentationChart, Exam,
  Sparkle, X, Megaphone, CalendarBlank,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { severityColor, formatDate } from '../data/seed';
import { useAuditLogData } from '@/hooks/useAuditLogData';
import { useRisksData } from '../hooks/useRisksData';
import { useIncidentData } from '../hooks/useIncidentData';
import { useModelsData } from '../hooks/useModelsData';
import { useVendorsData } from '../hooks/useVendorsData';
import { useFrameworksData } from '../hooks/useFrameworksData';
import { useTaskData } from '../hooks/useTaskData';
import { useHitlReviews } from '../hooks/useRiskIncidents';
import { useAttestations } from '../hooks/useAttestationsData';
import { agentRecordHooks } from '../hooks/queries/useAgentGovCrud';
import { useCalendar } from '../hooks/useComplianceGroup';
import { useChartTheme } from '../hooks/useChartTheme';

// Open-risk matcher shared by every risk KPI on this page: statuses are
// normalized to lowercase and anything still being worked counts as open.
const OPEN_RISK_STATUSES = new Set(['open', 'assessed', 'in_progress', 'investigating']);
const isOpenRiskStatus = (status: unknown) =>
  OPEN_RISK_STATUSES.has(String(status ?? '').toLowerCase().replace(/\s+/g, '_'));
// Incidents count as active until they are resolved or closed.
const isActiveIncidentStatus = (status: unknown) =>
  !['resolved', 'closed'].includes(String(status ?? '').toLowerCase());

/** Shadow AI = registry record whose status marks it as outside governance. */
const isShadowAgentStatus = (status: unknown) =>
  ['shadow', 'unregistered'].includes(String(status ?? '').toLowerCase());

const NEUTRAL = 'hsl(var(--text-4))';

const errText = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';

const norm = (v: unknown): string | null => {
  const s = String(v ?? '').trim().toLowerCase();
  return s ? s : null;
};

const titleCase = (s: string) =>
  s.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** A risk score that was never recorded is null — never 0. */
const riskScoreOf = (r: any): number | null => {
  const v = r?.risk_score ?? r?.score;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

/** A framework score that was never recorded is null — never 0. */
const frameworkScoreOf = (f: any): number | null => {
  const v = f?.score ?? f?.compliance_score ?? f?.complianceScore;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

// CISO View traffic-light thresholds. A null score is "unscored" — it renders
// neutral, never as a red 0%.
function cisoTrafficColor(score: number | null): string {
  if (score == null) return NEUTRAL;
  if (score >= 85) return 'hsl(var(--s-ok-tx))';
  if (score >= 65) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--s-er-tx))';
}

function cisoTrafficLabel(score: number | null): string {
  if (score == null) return 'UNSCORED';
  if (score >= 85) return 'GREEN';
  if (score >= 65) return 'AMBER';
  return 'RED';
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendUp size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />;
  if (trend === 'down') return <TrendDown size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />;
  return <Minus size={14} style={{ color: NEUTRAL }} />;
}

// RAG ring color helper. Null (= not measured) is always neutral.
function ragColor(value: number | null, type: 'score' | 'risk' | 'incident'): string {
  if (value == null) return NEUTRAL;
  if (type === 'incident') return value >= 2 ? 'hsl(var(--s-er-tx))' : value >= 1 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))';
  if (type === 'risk') return value >= 10 ? 'hsl(var(--r-hi-tx))' : value >= 5 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))';
  if (value >= 85) return 'hsl(var(--s-ok-tx))';
  if (value >= 60) return 'hsl(var(--r-hi-tx))';
  return 'hsl(var(--s-er-tx))';
}

/** Coverage percentages: neutral when there is nothing to measure. */
function coverageColor(pct: number | null): string {
  if (pct == null) return NEUTRAL;
  if (pct >= 85) return 'hsl(var(--s-ok-tx))';
  if (pct >= 50) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--s-er-tx))';
}

function ScoreRing({ value, label, color, size = 80, hint }: { value: number | null; label: string; color: string; size?: number; hint?: string }) {
  const circumference = 2 * Math.PI * 34;
  const progress = value == null ? 0 : Math.min(Math.max(value, 0) / 100, 1);

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          {/* No arc at all when the value was never measured. */}
          {value != null && (
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={color} strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="butt"
              transform="rotate(-90 40 40)"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }} title={value == null ? hint : undefined}>
            {value == null ? '—' : `${value}%`}
          </span>
        </div>
      </div>
      <span className="text-xs text-center" style={{ color: 'hsl(var(--text-3))' }}>{label}</span>
    </div>
  );
}

/** Inline, honest failure state reused by every section on this page. */
function SectionError({ error, what }: { error: unknown; what: string }) {
  return (
    <div role="alert" className="px-4 py-6">
      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
        {what} could not be loaded: {errText(error)}
      </p>
    </div>
  );
}

/** Heat-map cell palette, keyed on the EU AI Act risk tier stored on the model. */
function tierPalette(tier: string | null): { color: string; bg: string } {
  switch (tier) {
    case 'unacceptable':
    case 'high':
      return { color: 'hsl(var(--s-er-tx))', bg: 'hsl(var(--s-er-bg))' };
    case 'medium':
    case 'limited':
      return { color: 'hsl(var(--s-wn-tx))', bg: 'hsl(var(--s-wn-bg))' };
    case 'minimal':
    case 'low':
      return { color: 'hsl(var(--s-ok-tx))', bg: 'hsl(var(--s-ok-bg))' };
    default:
      return { color: NEUTRAL, bg: 'hsl(var(--bg-muted))' };
  }
}

const TIER_ORDER = ['unacceptable', 'high', 'medium', 'limited', 'low', 'minimal'];
const STAGE_ORDER = ['development', 'validation', 'staging', 'production', 'retired', 'decommissioned'];

function orderedKeys(keys: (string | null)[], preferred: string[]): (string | null)[] {
  return keys.slice().sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED_CALENDAR_STATUSES = new Set(['done', 'completed', 'closed', 'cancelled', 'canceled', 'submitted', 'acknowledged']);

function relativeDayLabel(dueAt: string): { label: string; overdue: boolean; days: number } {
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(new Date(dueAt)) - midnight(new Date())) / DAY_MS);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true, days };
  if (days === 0) return { label: 'Today', overdue: false, days };
  if (days === 1) return { label: 'Tomorrow', overdue: false, days };
  return { label: `In ${days} days`, overdue: false, days };
}

export default function Overview() {
  const ct = useChartTheme();
  const navigate = useNavigate();
  const [cisoView, setCisoView] = useState(false);
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState(15);

  // ── Live Supabase data. Every hook's error is surfaced (never swallowed into
  // an empty array that renders as a confident zero). ──────────────────────────
  const { risks, isLoading: risksLoading, error: risksError } = useRisksData();
  const { incidents, isLoading: incidentsLoading, error: incidentsError } = useIncidentData();
  const { models, isLoading: modelsLoading, error: modelsError } = useModelsData();
  const { vendors, isLoading: vendorsLoading, error: vendorsError } = useVendorsData();
  const { frameworks, isLoading: frameworksLoading, error: frameworksError } = useFrameworksData();
  const { tasks, isLoading: tasksLoading, error: tasksError } = useTaskData();
  const { items: hitlReviews, isLoading: hitlLoading, error: hitlError } = useHitlReviews();
  const { attestations, isLoading: attestationsLoading, error: attestationsError } = useAttestations();
  const { data: agents = [], isLoading: agentsLoading, error: agentsError } = agentRecordHooks.useList();
  const { items: calendarItems, isLoading: calendarLoading, error: calendarError } = useCalendar();
  // Recent Activity — the real org-scoped audit trail (same hook as
  // pages/AuditTrail.tsx), latest 5 events.
  const { logs: recentActivity, isLoading: activityLoading, error: activityError } = useAuditLogData(5);

  // ── Data-source health. The former "System Operational" badge was a hardcoded
  // green claim; this one is derived from the page's own queries. ──────────────
  const dataSources = [
    { label: 'Risk register', error: risksError, loading: risksLoading },
    { label: 'Incidents', error: incidentsError, loading: incidentsLoading },
    { label: 'Model inventory', error: modelsError, loading: modelsLoading },
    { label: 'Vendors', error: vendorsError, loading: vendorsLoading },
    { label: 'Frameworks', error: frameworksError, loading: frameworksLoading },
    { label: 'Tasks', error: tasksError, loading: tasksLoading },
    { label: 'HITL queue', error: hitlError, loading: hitlLoading },
    { label: 'Supply-chain attestations', error: attestationsError, loading: attestationsLoading },
    { label: 'Agent registry', error: agentsError, loading: agentsLoading },
    { label: 'Compliance calendar', error: calendarError, loading: calendarLoading },
    { label: 'Audit trail', error: activityError, loading: activityLoading },
  ];
  const failedSources = dataSources.filter(d => d.error);
  const anySourceLoading = dataSources.some(d => d.loading);

  // ── Derived counts (memoised — the risk-threshold slider re-renders this page
  // on every drag tick and used to recompute ~11 full-table passes each time). ─
  const openRisks = useMemo(
    () => risks.filter((r: any) => isOpenRiskStatus(r.status)).length,
    [risks],
  );
  const criticalRisks = useMemo(
    () => risks.filter((r: any) => {
      const s = riskScoreOf(r);
      return s != null && s >= riskThreshold;
    }).length,
    [risks, riskThreshold],
  );
  const topOpenRisks = useMemo(
    () => risks.filter((r: any) => isOpenRiskStatus(r.status)).slice(0, 5),
    [risks],
  );
  const activeModels = useMemo(
    () => models.filter((m: any) => m.is_active || m.lifecycle_stage === 'production' || m.status === 'production').length,
    [models],
  );
  // Incident KPIs gate on ACTIVE statuses — a resolved critical incident is
  // history, not a live executive signal.
  const criticalIncidents = useMemo(
    () => incidents.filter((i: any) => i.severity === 'critical' && isActiveIncidentStatus(i.status)).length,
    [incidents],
  );
  const openIncidents = useMemo(
    () => incidents.filter((i: any) => isActiveIncidentStatus(i.status)).length,
    [incidents],
  );
  const recentIncidents = useMemo(() => incidents.slice(0, 7), [incidents]);
  const overdueTaskCount = useMemo(() => tasks.filter((t: any) => isOverdueTask(t)).length, [tasks]);
  const overdueTaskItems = useMemo(() => tasks.filter((t: any) => isOverdueTask(t)).slice(0, 5), [tasks]);
  const pendingHitl = useMemo(
    () => hitlReviews.filter(r => r.status === 'pending' || r.status === 'info_requested').length,
    [hitlReviews],
  );

  // id → name for the model estate. Raw uuids are never rendered; an id that
  // does not resolve shows "Unavailable" (CLAUDE.md, link affordances).
  const modelsById = useMemo(
    () => new Map(models.map((m: any) => [m.id as string, m.name as string])),
    [models],
  );
  const modelsByName = useMemo(
    () => new Map(models.map((m: any) => [String(m.name ?? '').toLowerCase(), m.id as string])),
    [models],
  );
  const resolveModel = useMemo(() => (raw: unknown): { id: string; name: string } | null => {
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (!key) return null;
    const byId = modelsById.get(key);
    if (byId) return { id: key, name: byId };
    const byName = modelsByName.get(key.toLowerCase());
    if (byName) return { id: byName, name: key };
    return null;
  }, [modelsById, modelsByName]);

  // Executive digest — derived from REAL counts at render time (the previous
  // rotating hardcoded templates fabricated events that never happened).
  const digestLine = useMemo(() => [
    risksError ? 'open risks unavailable' : `${openRisks} open risk${openRisks !== 1 ? 's' : ''}`,
    hitlError ? 'HITL queue unavailable' : `${pendingHitl} pending HITL review${pendingHitl !== 1 ? 's' : ''}`,
    incidentsError ? 'incidents unavailable' : `${criticalIncidents} active critical incident${criticalIncidents !== 1 ? 's' : ''}`,
  ].join(' · '), [risksError, hitlError, incidentsError, openRisks, pendingHitl, criticalIncidents]);

  // Compliance posture — averaged over frameworks that actually carry a score.
  // An unscored estate is null (renders "—", neutral), never a red 0%.
  const avgCompliance = useMemo(() => {
    const scored = frameworks.map(frameworkScoreOf).filter((s): s is number => s != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  }, [frameworks]);

  const kpis = useMemo(() => ([
    { label: 'Overdue Tasks', value: tasksError ? '—' : overdueTaskCount, icon: Clock, color: tasksError ? NEUTRAL : ragColor(overdueTaskCount, 'risk'), link: '/tasks', border: tasksError ? 'hsl(var(--border))' : overdueTaskCount >= 5 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))' },
    { label: 'Open Risks', value: risksError ? '—' : openRisks, icon: Warning, color: risksError ? NEUTRAL : ragColor(openRisks, 'risk'), link: '/risks', border: risksError ? 'hsl(var(--border))' : openRisks >= 10 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))' },
    { label: 'Active Models', value: modelsError ? '—' : activeModels, icon: Brain, color: modelsError ? NEUTRAL : 'hsl(var(--tag-purple))', link: '/models/inventory', border: 'hsl(var(--border))' },
    { label: 'Critical Incidents', value: incidentsError ? '—' : criticalIncidents, icon: WarningCircle, color: incidentsError ? NEUTRAL : ragColor(criticalIncidents, 'incident'), link: '/risk/incidents', border: incidentsError ? 'hsl(var(--border))' : criticalIncidents >= 2 ? 'hsl(var(--s-er-tx))' : criticalIncidents >= 1 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))' },
    { label: 'Vendors', value: vendorsError ? '—' : vendors.length, icon: Briefcase, color: vendorsError ? NEUTRAL : 'hsl(var(--s-in-tx))', link: '/vendors', border: 'hsl(var(--border))' },
    { label: 'Frameworks', value: frameworksError ? '—' : frameworks.length, icon: StackSimple, color: frameworksError ? NEUTRAL : 'hsl(var(--brand))', link: '/frameworks', border: 'hsl(var(--border))' },
  ]), [tasksError, overdueTaskCount, risksError, openRisks, modelsError, activeModels, incidentsError, criticalIncidents, vendorsError, vendors.length, frameworksError, frameworks.length]);

  const frameworkChartData = useMemo(() => frameworks.map((f: any) => ({
    name: f.name?.includes('42001') ? 'ISO 42001' :
          f.name?.includes('27001') ? 'ISO 27001' :
          f.name?.includes('SOC') ? 'SOC 2' :
          f.name?.includes('EU AI') ? 'EU AI Act' :
          f.name?.includes('NIST') ? 'NIST RMF' :
          f.name?.includes('OWASP') ? 'OWASP LLM' :
          (f.name || '').replace('ISO/IEC ', '').replace('OWASP ', '').split(' ')[0],
    // Null (unscored) — Recharts draws no bar for it, instead of a confident 0.
    score: frameworkScoreOf(f),
    fullName: f.name,
  })), [frameworks]);
  const frameworkChartHasScores = frameworkChartData.some(d => d.score != null);

  // Risk trend from real risk data grouped by creation month (last 6 months).
  // "Critical" uses the SAME riskThreshold gate as the KPI tile — the two used
  // to disagree (slider 10–20 vs a hardcoded >= 15).
  const riskTrendData = useMemo(() => {
    const now = new Date();
    const months: { month: string; open: number; critical: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const monthRisks = risks.filter((r: any) => {
        const c = r.created_at;
        return c >= monthStart && c <= monthEnd;
      });
      months.push({
        month: label,
        open: monthRisks.filter((r: any) => isOpenRiskStatus(r.status)).length,
        critical: monthRisks.filter((r: any) => {
          const s = riskScoreOf(r);
          return s != null && s >= riskThreshold;
        }).length,
      });
    }
    return months;
  }, [risks, riskThreshold]);
  // Honest empty state: no fabricated fallback series — when the register has
  // no risks created in the window, the chart says so instead of inventing one.
  const riskTrendHasData = riskTrendData.some(m => m.open > 0 || m.critical > 0);

  // CISO frameworks scorecard — real org frameworks only. Score may be null
  // (unscored) and no per-day history is stored, so there is no trend series
  // to draw; the card says so instead of synthesizing one.
  const cisoFrameworksData = useMemo(() => frameworks.map((f: any) => ({
    key: String(f.id ?? f.name ?? ''),
    label: f.name || 'Unknown',
    score: frameworkScoreOf(f),
  })), [frameworks]);

  // ── AI supply-chain provenance (was a hardcoded "94.2% / 48 of 51"). Derived
  // from supply_chain_attestation_status joined to the production estate. ──────
  const provenance = useMemo(() => {
    const production = models.filter((m: any) => norm(m.lifecycle_stage) === 'production');
    const attestedModelIds = new Set(
      attestations
        .filter(a => a.modelId && a.derivedValidity === 'valid' && a.verificationStatus === 'verified')
        .map(a => a.modelId as string),
    );
    const covered = production.filter((m: any) => attestedModelIds.has(m.id)).length;
    return {
      total: production.length,
      covered,
      pct: production.length > 0 ? Math.round((covered / production.length) * 100) : null,
    };
  }, [models, attestations]);

  // ── Shadow AI + kill-switch coverage, from agent_gov_registry (was "2
  // Isolated" and "100% Armed" literals). ─────────────────────────────────────
  const agentPosture = useMemo(() => {
    const shadow = agents.filter(a => isShadowAgentStatus(a.status)).length;
    const active = agents.filter(a => norm(a.status) === 'active');
    const armed = active.filter(a => a.killSwitchEnabled === true).length;
    return {
      shadow,
      activeCount: active.length,
      armed,
      armedPct: active.length > 0 ? Math.round((armed / active.length) * 100) : null,
    };
  }, [agents]);

  // ── Model risk heat map, cross-tabbed from ai_models.risk_tier ×
  // ai_models.lifecycle_stage (was a block of literals). ──────────────────────
  const heatMap = useMemo(() => {
    const tierSet = new Set<string | null>();
    const stageSet = new Set<string | null>();
    models.forEach((m: any) => { tierSet.add(norm(m.risk_tier)); stageSet.add(norm(m.lifecycle_stage)); });
    const tiers = orderedKeys([...tierSet], TIER_ORDER);
    const stages = orderedKeys([...stageSet], STAGE_ORDER);
    const rows = tiers.map(tier => ({
      tier,
      cells: stages.map(stage => models.filter((m: any) => norm(m.risk_tier) === tier && norm(m.lifecycle_stage) === stage).length),
    }));
    return { tiers, stages, rows };
  }, [models]);

  // ── Compliance calendar (90 days), from the real merged calendar: manual
  // compliance_calendar rows plus deadlines derived from the governed source
  // tables, each carrying its own deep link back. ─────────────────────────────
  const calendarStrip = useMemo(() => {
    const horizon = Date.now() + 90 * DAY_MS;
    return calendarItems
      .filter(e => {
        if (!e.dueAt) return false;
        const t = new Date(e.dueAt).getTime();
        if (Number.isNaN(t) || t > horizon) return false;
        return !CLOSED_CALENDAR_STATUSES.has(String(e.status ?? '').toLowerCase());
      })
      .slice(0, 8);
  }, [calendarItems]);

  const quickActions = [
    { label: 'Start Audit', desc: 'Launch a new compliance audit', icon: ShieldCheck, to: '/audits' },
    { label: 'Create Incident', desc: 'Report a new risk incident', icon: Lightning, to: '/risk/incidents' },
    { label: 'Run Assessment', desc: 'Conformity assessment', icon: Exam, to: '/conformity' },
    { label: 'Generate Report', desc: 'Board-ready reports', icon: PresentationChart, to: '/reporting' },
    { label: 'Classify AI System', desc: 'EU AI Act risk tiering', icon: Scales, to: '/ai-risk-tiering' },
    { label: 'Start DPIA', desc: 'GDPR Art.35 assessment', icon: ShieldCheck, to: '/dpia' },
    { label: 'Post-Market Plan', desc: 'EU AI Act Art.72', icon: ChartLine, to: '/post-market' },
    { label: 'Ethics Report', desc: 'Anonymous reporting', icon: Megaphone, to: '/ethics-reporting' },
  ];

  // Attention items — derived from LIVE counts only (the previous hardcoded
  // ALERT_ITEMS invented findings and linked to business codes like MDL-001
  // that resolve to nothing). Each entry links to the module that owns it.
  const attentionItems = useMemo(() => {
    const items: { id: string; title: string; severity: 'critical' | 'high'; link: string }[] = [];
    if (criticalIncidents > 0) items.push({
      id: 'critical-incidents',
      title: `${criticalIncidents} active critical incident${criticalIncidents !== 1 ? 's' : ''} in the incident log`,
      severity: 'critical',
      link: '/risk/incidents',
    });
    if (overdueTaskCount > 0) items.push({
      id: 'overdue-tasks',
      title: `${overdueTaskCount} task${overdueTaskCount !== 1 ? 's' : ''} past due date`,
      severity: 'high',
      link: '/tasks',
    });
    if (pendingHitl > 0) items.push({
      id: 'pending-hitl',
      title: `${pendingHitl} human-oversight review${pendingHitl !== 1 ? 's' : ''} waiting in the HITL queue`,
      severity: 'high',
      link: '/hitl',
    });
    if (agentPosture.shadow > 0) items.push({
      id: 'shadow-agents',
      title: `${agentPosture.shadow} agent${agentPosture.shadow !== 1 ? 's' : ''} outside governance in the agent registry`,
      severity: 'high',
      link: '/agents?tab=shadow',
    });
    return items;
  }, [criticalIncidents, overdueTaskCount, pendingHitl, agentPosture.shadow]);

  // NOTE: the former KPI_TRENDS map rendered hardcoded percentage deltas that
  // were never measured. No historical snapshots are stored, so KPIs render
  // without a delta rather than with a fictional one.

  return (
    <div className="space-y-6">
      {/* NOTE (WCAG 2.4.1): this page used to render its own skip link plus a
          second `id="main-content"` on the KPI grid ~380 lines down, so the id
          was duplicated with the app shell's <main> (App.tsx) and the in-page
          anchor jumped PAST the alert ribbon and CISO summary. The shell already
          renders <SkipLink /> targeting the real <main> landmark that wraps this
          whole page, so the duplicate landmark and link are gone. */}

      {/* Header */}
      <PageHeader
        title="Overview"
        subtitle="Your AI governance posture at a glance"
        breadcrumbs={[{ label: 'Home' }]}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-[hsl(var(--border))] px-3 py-1 bg-surface h-8">
            <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>Risk Gate: {riskThreshold}</span>
            <input
              type="range"
              min="10"
              max="20"
              value={riskThreshold}
              onChange={e => setRiskThreshold(Number(e.target.value))}
              style={{ width: 60, height: 4, cursor: 'pointer', accentColor: 'hsl(var(--brand))' }}
              aria-label="Risk threshold gate"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCisoView(v => !v)}
            aria-pressed={cisoView}
            style={{
              borderRadius: 0,
              borderColor: cisoView ? 'hsl(var(--brand))' : 'hsl(var(--border))',
              color: cisoView ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
              background: cisoView ? 'hsl(var(--bg-muted))' : 'transparent',
              fontSize: 12,
              gap: 6,
            }}
          >
            <Eye size={14} /> CISO View
          </Button>
          {/* Derived from this page's own queries — never a fixed green claim. */}
          {failedSources.length > 0 ? (
            <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0, fontSize: 12 }}>
              {failedSources.length} of {dataSources.length} data sources unavailable
            </Badge>
          ) : anySourceLoading ? (
            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 12 }}>
              Checking data sources…
            </Badge>
          ) : (
            <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0, fontSize: 12 }}>
              All {dataSources.length} data sources responding
            </Badge>
          )}
          <span className="text-xs self-center" style={{ color: 'hsl(var(--text-3))' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        }
      />

      {/* Data-source failures — a dead connection must never render as zeros
          and greens; name every source that failed, with its real message. */}
      {failedSources.length > 0 && (
        <div role="alert" style={{
          padding: '10px 16px',
          background: 'hsl(var(--s-er-bg))',
          borderLeft: '4px solid hsl(var(--s-er-tx))',
          border: '1px solid hsl(var(--s-er-br))',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--s-er-tx))', marginBottom: 4 }}>
            {failedSources.length} data source{failedSources.length !== 1 ? 's' : ''} could not be loaded — figures below that depend on {failedSources.length !== 1 ? 'them' : 'it'} show “—”.
          </p>
          <ul style={{ fontSize: 12, color: 'hsl(var(--s-er-tx))', listStyle: 'disc', paddingLeft: 20 }}>
            {failedSources.map(s => (
              <li key={s.label}>{s.label}: {errText(s.error)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Alert Ribbon — live counts only; hidden when nothing needs attention */}
      {attentionItems.length > 0 && (
      <div
        onClick={() => setAlertPanelOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: 'hsl(var(--s-er-bg))', borderLeft: '4px solid hsl(var(--s-er-tx))',
          border: '1px solid hsl(var(--s-er-br))',
          cursor: 'pointer',
        }}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setAlertPanelOpen(true)}
        aria-label="View items requiring attention"
      >
        <Siren size={16} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--s-er-tx))' }}>
          {attentionItems.length} item{attentionItems.length !== 1 ? 's' : ''} require attention — derived from live incident, task, HITL and agent-registry counts
        </span>
        <ArrowRight size={14} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0, marginLeft: 'auto' }} />
      </div>
      )}

      {/* Alert slide-out panel */}
      {alertPanelOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ flex: 1, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)' }} onClick={() => setAlertPanelOpen(false)} />
          <div style={{ width: 420, background: 'hsl(var(--bg-surface))', borderLeft: '1px solid hsl(var(--border))', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'hsl(var(--bg-surface))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Siren size={16} style={{ color: 'hsl(var(--s-er-tx))' }} />
                <span style={{ fontWeight: 700, color: 'hsl(var(--text-1))', fontSize: 14 }}>Needs Attention</span>
              </div>
              <button onClick={() => setAlertPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px 20px', flex: 1 }}>
              {attentionItems.length === 0 && (
                <p style={{ fontSize: 13, color: 'hsl(var(--text-3))' }}>Nothing needs attention right now.</p>
              )}
              {attentionItems.map((item) => {
                const sc = item.severity === 'critical'
                  ? { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', br: 'hsl(var(--s-er-br))' }
                  : { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', br: 'hsl(var(--s-wn-br))' };
                return (
                  <div key={item.id} style={{ marginBottom: 12, padding: 14, background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.br}`, borderRadius: 0, fontSize: 10 }}>{item.severity}</Badge>
                      <span style={{ fontSize: 10, color: NEUTRAL }}>{item.id}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', marginBottom: 10, lineHeight: 1.4 }}>{item.title}</p>
                    <Link to={item.link} onClick={() => setAlertPanelOpen(false)} style={{ fontSize: 12, color: 'hsl(var(--brand))', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Resolve <ArrowRight size={12} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ CISO VIEW — EXECUTIVE SUMMARY ═══════ */}
      {cisoView && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
              <Eye size={16} style={{ color: 'hsl(var(--brand))' }} />
              Executive Compliance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {frameworksError ? (
              <SectionError error={frameworksError} what="Frameworks" />
            ) : cisoFrameworksData.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: NEUTRAL }}>
                No frameworks adopted yet — add one under <Link to="/frameworks" style={{ color: 'hsl(var(--brand))' }}>Frameworks</Link>.
              </p>
            ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {cisoFrameworksData.map(fw => {
                const dotColor = cisoTrafficColor(fw.score);
                const ragLabel = cisoTrafficLabel(fw.score);
                return (
                  <div
                    key={fw.key}
                    style={{
                      background: 'hsl(var(--bg-muted))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 0,
                      padding: '16px',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: dotColor,
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${dotColor}40`,
                        }}
                      />
                      <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                        {fw.label}
                      </span>
                    </div>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-2xl font-bold" style={{ color: dotColor }} title={fw.score == null ? 'No score recorded yet' : undefined}>
                        {fw.score == null ? '—' : `${fw.score}%`}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5"
                        style={{
                          color: dotColor,
                          background: `${dotColor}18`,
                          borderRadius: 0,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {ragLabel}
                      </span>
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: NEUTRAL }}>
                      {fw.score == null
                        ? 'No score recorded yet'
                        : 'No trend history recorded yet — scores are point-in-time'}
                    </p>
                  </div>
                );
              })}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════ COMPLIANCE POSTURE BANNER ═══════ */}
      <Card style={{
        background: 'linear-gradient(135deg, hsl(var(--bg-surface)) 0%, hsl(var(--bg-muted)) 100%)',
        border: '1px solid hsl(var(--border))',
      }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <ScoreRing
                value={frameworksError ? null : avgCompliance}
                label="Compliance Score"
                color={frameworksError ? NEUTRAL : ragColor(avgCompliance, 'score')}
                size={90}
                hint={frameworksError ? 'Frameworks could not be loaded' : 'No framework carries a score yet'}
              />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-[90px] h-[90px]">
                  <span className="text-3xl font-bold" style={{ color: risksError ? NEUTRAL : ragColor(openRisks, 'risk') }}>{risksError ? '—' : openRisks}</span>
                </div>
                <span className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>Open Risks</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-[90px] h-[90px]">
                  <span className="text-3xl font-bold" style={{ color: incidentsError ? NEUTRAL : ragColor(criticalIncidents, 'incident') }}>{incidentsError ? '—' : criticalIncidents}</span>
                </div>
                <span className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>Critical Incidents</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <Siren size={16} style={{ color: 'hsl(var(--r-hi-tx))' }} />
                <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Attention Required</span>{/* consolidated — primary banner above is the authoritative source */}
              </div>
              <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>
                {attentionItems.length === 0
                  ? 'No live items need attention right now.'
                  : `${attentionItems.length} item${attentionItems.length !== 1 ? 's' : ''} need attention — active critical incidents, overdue tasks, pending HITL reviews and ungoverned agents.`}
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/risks')}
                style={{ borderRadius: 0, background: 'hsl(var(--s-er-tx))', color: 'hsl(var(--bg-surface))' }}
              >
                View All Issues <ArrowRight size={12} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive AI Digest */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, background: 'hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkle size={16} style={{ color: 'hsl(var(--brand))' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 4 }}>
                Executive Digest — live counts
              </p>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.6 }}>
                Right now: {digestLine}.{' '}
                <Link to="/risks" style={{ color: 'hsl(var(--brand))' }}>Risks</Link>
                {' · '}
                <Link to="/hitl" style={{ color: 'hsl(var(--brand))' }}>HITL queue</Link>
                {' · '}
                <Link to="/risk/incidents" style={{ color: 'hsl(var(--brand))' }}>Incidents</Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════ AGENTIC GOVERNANCE & AI SUPPLY CHAIN — all three derived ═══════
          Was: "94.2% / 48 of 51 verified cryptographic AIBOM attestations",
          "2 Isolated" and "100% Armed", none of which were measured. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supply-chain provenance — supply_chain_attestation_status × ai_models */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: NEUTRAL }}>AI Supply Chain Provenance</span>
                {attestationsError || modelsError ? (
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
                    Unavailable: {errText(attestationsError ?? modelsError)}
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold" style={{ color: coverageColor(provenance.pct) }}>
                      {provenance.pct == null ? '—' : `${provenance.pct}%`}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      {provenance.total === 0
                        ? 'No production models registered yet — coverage is not measurable.'
                        : `${provenance.covered} of ${provenance.total} production model${provenance.total !== 1 ? 's' : ''} carry a verified, currently-valid supply-chain attestation.`}
                    </p>
                  </>
                )}
              </div>
              <div style={{ background: 'hsl(var(--bg-muted))', padding: 8, borderRadius: 0, flexShrink: 0 }}>
                <ShieldCheck size={20} style={{ color: coverageColor(provenance.pct) }} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
              <Link to="/supply-chain" className="text-xs font-semibold hover:underline" style={{ color: 'hsl(var(--brand))' }}>
                View Attestation Register
              </Link>
              <Link to="/aibom" className="text-xs font-semibold hover:underline" style={{ color: 'hsl(var(--brand))' }}>
                AIBOM Registry
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Shadow AI — agent_gov_registry rows outside governance */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: NEUTRAL }}>Shadow AI Discovery</span>
                {agentsError ? (
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
                    Unavailable: {errText(agentsError)}
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold" style={{ color: agentPosture.shadow > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
                      {agentPosture.shadow}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      {agents.length === 0
                        ? 'No agents registered yet.'
                        : agentPosture.shadow === 0
                          ? `All ${agents.length} registered agent${agents.length !== 1 ? 's are' : ' is'} inside governance.`
                          : `Agent${agentPosture.shadow !== 1 ? 's' : ''} recorded as shadow or unregistered in the agent registry.`}
                    </p>
                  </>
                )}
              </div>
              <div style={{ background: 'hsl(var(--bg-muted))', padding: 8, borderRadius: 0, flexShrink: 0 }}>
                <Robot size={20} style={{ color: agentPosture.shadow > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
              <Link to="/agents?tab=shadow" className="text-xs font-semibold hover:underline" style={{ color: 'hsl(var(--brand))' }}>
                Review Shadow AI
              </Link>
              <ArrowRight size={12} style={{ color: NEUTRAL }} />
            </div>
          </CardContent>
        </Card>

        {/* Kill-switch coverage — agent_gov_registry.killSwitchEnabled */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: NEUTRAL }}>Agent Safety Gates</span>
                {agentsError ? (
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
                    Unavailable: {errText(agentsError)}
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold" style={{ color: coverageColor(agentPosture.armedPct) }}>
                      {agentPosture.armedPct == null ? '—' : `${agentPosture.armedPct}%`}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      {agentPosture.activeCount === 0
                        ? 'No active agents registered — coverage is not measurable.'
                        : `${agentPosture.armed} of ${agentPosture.activeCount} active agent${agentPosture.activeCount !== 1 ? 's have' : ' has'} a kill switch enabled in the registry.`}
                    </p>
                  </>
                )}
              </div>
              <div style={{ background: 'hsl(var(--bg-muted))', padding: 8, borderRadius: 0, flexShrink: 0 }}>
                <Lightning size={20} style={{ color: coverageColor(agentPosture.armedPct) }} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
              <Link to="/kill-switch" className="text-xs font-semibold hover:underline" style={{ color: 'hsl(var(--brand))' }}>
                Manage Kill Switches
              </Link>
              <ArrowRight size={12} style={{ color: NEUTRAL }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 4 KPI StatCardRow */}
      <StatCardRow
        cards={[
          {
            label: 'Open Risks',
            value: risksError ? '—' : openRisks,
            icon: <Warning size={16} />,
            isPositiveUp: false,
            href: '/risks',
          },
          {
            label: `Critical Risks (score ≥ ${riskThreshold})`,
            value: risksError ? '—' : criticalRisks,
            icon: <ShieldCheck size={16} />,
            isPositiveUp: false,
            href: '/risks',
          },
          {
            label: 'Compliance Score',
            value: frameworksError || avgCompliance == null ? '—' : `${avgCompliance}%`,
            icon: <CheckCircle size={16} />,
            isPositiveUp: true,
            href: '/frameworks',
          },
          {
            label: 'Open Incidents',
            value: incidentsError ? '—' : openIncidents,
            icon: <WarningCircle size={16} />,
            isPositiveUp: false,
            href: '/risk/incidents',
          },
        ]}
      />

      {/* KPI Tiles — responsive grid: 3 cols → 3 cols → 3 cols */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(k => (
          <Link key={k.label} to={k.link} style={{ textDecoration: 'none' }}>
            <Card
              style={{
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border))',
                borderLeft: `4px solid ${k.border}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = k.color; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderLeftColor = k.border; }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <k.icon size={20} style={{ color: k.color }} aria-hidden="true" />
                  <ArrowRight size={12} style={{ color: NEUTRAL }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{k.value}</p>
                <p className="text-xs mt-0.5 mb-1" style={{ color: 'hsl(var(--text-3))' }}>{k.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ═══════ QUICK ACTIONS ═══════ */}
      <div className="grid grid-cols-4 gap-4">
        {quickActions.map(a => (
          <Link key={a.label} to={a.to} style={{ textDecoration: 'none' }}>
            <Card
              style={{
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 0,
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'hsl(var(--brand))';
                e.currentTarget.style.boxShadow = '0 2px 8px hsl(var(--brand) / 0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'hsl(var(--border))';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    background: 'hsl(var(--bg-muted))',
                    borderRadius: 0,
                    flexShrink: 0,
                  }}
                >
                  <a.icon size={20} style={{ color: 'hsl(var(--brand))' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{a.label}</p>
                  <p className="text-xs" style={{ color: NEUTRAL }}>{a.desc}</p>
                </div>
                <ArrowRight size={14} style={{ color: NEUTRAL, marginLeft: 'auto', flexShrink: 0 }} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ═══════ REGULATORY SCORECARD — real org frameworks (was hardcoded) ═══════ */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Regulatory Compliance Scorecard
          </CardTitle>
          <span className="text-xs px-2 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0 }}>
            Live scores from your adopted frameworks
          </span>
        </CardHeader>
        <CardContent>
          {frameworksError ? (
            <SectionError error={frameworksError} what="Frameworks" />
          ) : frameworks.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: NEUTRAL }}>
              No frameworks adopted yet — add one under <Link to="/frameworks" style={{ color: 'hsl(var(--brand))' }}>Frameworks</Link>.
            </p>
          ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {frameworks.slice(0, 8).map((f: any) => {
              const pct = frameworkScoreOf(f);
              const target = (f.target_score ?? null) as number | null;
              // Null score = unscored: neutral treatment, never a red 0%.
              const barColor = pct == null
                ? NEUTRAL
                : pct >= 85 ? 'hsl(var(--s-ok-tx))' : pct >= 70 ? 'hsl(var(--brand))' : 'hsl(var(--s-er-tx))';
              const gapPct = pct != null && target != null ? target - pct : null;
              return (
                <Link key={f.id} to="/frameworks" style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</p>
                      <p className="text-lg font-bold flex-shrink-0" style={{ color: barColor }} title={pct == null ? 'No score recorded yet' : undefined}>
                        {pct == null ? '—' : `${pct}%`}
                      </p>
                    </div>
                    <div className="w-full h-2 bg-raised">
                      {pct != null && <div className="h-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: barColor }} />}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: NEUTRAL }}>
                        {pct == null ? 'No score recorded yet' : target != null ? `Target: ${target}%` : 'No target set'}
                      </span>
                      {gapPct != null && (
                        <span className="px-1.5 py-0.5 font-medium" style={{
                          background: gapPct <= 0 ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-wn-bg))',
                          color: gapPct <= 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                          borderRadius: 0,
                        }}>
                          {gapPct > 0 ? `${gapPct}% gap` : '✓ Met'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Compliance Score by Framework */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Compliance Score by Framework
            </CardTitle>
          </CardHeader>
          <CardContent>
            {frameworksError ? (
              <SectionError error={frameworksError} what="Frameworks" />
            ) : !frameworkChartHasScores ? (
              <div className="flex flex-col items-center justify-center" style={{ height: 220, color: NEUTRAL }}>
                <ChartLine size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No framework carries a score yet</p>
                <p className="text-xs mt-1">Unscored frameworks are left blank rather than plotted at 0%.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={frameworkChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: ct.axis, fontSize: 11 }}
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
                  />
                  <Tooltip
                    contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                    formatter={(v: any, _: any, p: any) => [v == null ? '— not scored' : `${v}%`, p.payload.fullName]}
                  />
                  <Bar dataKey="score" name="Score" radius={0} fill="hsl(var(--brand))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Risk Trend */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Risk Trend (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risksError ? (
              <SectionError error={risksError} what="Risk register" />
            ) : riskTrendHasData ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={riskTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} />
                  <YAxis
                    tick={{ fill: ct.axis, fontSize: 11 }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
                  />
                  <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: ct.axis }} />
                  <Line type="monotone" dataKey="open" stroke="hsl(var(--r-hi-tx))" strokeWidth={2} dot={false} name="Open Risks" />
                  <Line type="monotone" dataKey="critical" stroke="hsl(var(--s-er-tx))" strokeWidth={2} dot={false} name={`Critical (≥ ${riskThreshold})`} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center" style={{ height: 220, color: NEUTRAL }}>
                <ChartLine size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No risks recorded in the last 6 months</p>
                <p className="text-xs mt-1">The trend appears as risks are added to the register — nothing is simulated.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last 7 AI Incidents */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Recent AI Incidents
          </CardTitle>
          <Link to="/risk/incidents">
            <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
              View All <ArrowRight size={12} />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {incidentsError ? (
            <SectionError error={incidentsError} what="Incidents" />
          ) : recentIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10" style={{ color: NEUTRAL }}>
              <CheckCircle size={24} className="mb-2 opacity-40" />
              <p className="text-sm">No AI incidents recorded yet</p>
            </div>
          ) : (
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['Ref', 'Title', 'Type', 'Severity', 'Status', 'Affected Model', 'Reported'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentIncidents.map(inc => {
                const sc = severityColor((inc.severity ?? 'medium') as Parameters<typeof severityColor>[0]);
                const stColor = inc.status === 'open' ? 'hsl(var(--s-er-tx))' : inc.status === 'investigating' ? 'hsl(var(--s-wn-tx))' : inc.status === 'resolved' ? 'hsl(var(--s-ok-tx))' : NEUTRAL;
                const stBg = inc.status === 'open' ? 'hsl(var(--s-er-bg))' : inc.status === 'investigating' ? 'hsl(var(--s-wn-bg))' : inc.status === 'resolved' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))';
                // Human-facing business ref for display; the uuid stays the key
                // that the deep link carries.
                const ref = inc.incident_id ?? null;
                const rawModel = inc.model_id ?? inc.affected_models?.[0] ?? null;
                const model = resolveModel(rawModel);
                return (
                  <tr key={inc.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="px-4 py-2.5 text-xs font-mono">
                      <Link to={`/risk/incidents?open=${encodeURIComponent(inc.id)}`} style={{ color: 'hsl(var(--brand))', textDecoration: 'none' }}>
                        {ref ?? 'View'}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium line-clamp-1" style={{ color: 'hsl(var(--text-1))', maxWidth: 260, display: 'block' }}>{inc.title}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: NEUTRAL }}>{inc.category ?? inc.incident_type ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{inc.severity ?? 'unknown'}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge style={{ background: stBg, color: stColor, borderRadius: 0, fontSize: 10, textTransform: 'capitalize' }}>{inc.status ?? 'unknown'}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      {rawModel == null
                        ? '—'
                        : model
                          ? <Link to={`/models/inventory/${model.id}`} style={{ color: 'hsl(var(--brand))', textDecoration: 'none' }}>{model.name}</Link>
                          : 'Unavailable'}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: NEUTRAL }}>{formatDate(inc.detected_at ?? inc.created_at ?? '')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: Activity Feed + Overdue Tasks */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Recent Activity
            </CardTitle>
            <Link to="/audit-trail">
              <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
                View All <ArrowRight size={12} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {/* Real audit_log events via useAuditLogData — same source as /audit-trail. */}
            {activityLoading ? (
              <div className="px-4 py-3 space-y-3" role="status" aria-label="Loading recent activity">
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 36, background: 'hsl(var(--bg-raised))', opacity: 1 - i * 0.2 }} />
                ))}
              </div>
            ) : activityError ? (
              <SectionError error={activityError} what="Recent activity" />
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10" style={{ color: NEUTRAL }}>
                <Clock size={24} className="mb-2 opacity-40" />
                <p className="text-sm">No audit events recorded yet</p>
                <p className="text-xs mt-1">Platform actions appear here automatically as they happen.</p>
              </div>
            ) : (
            <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {recentActivity.map(entry => (
                <Link
                  key={entry.id}
                  to={`/audit-trail?open=${encodeURIComponent(entry.id)}`}
                  className="px-4 py-3 flex items-start gap-3 border-b border-[hsl(var(--border))]/30 last:border-b-0 hover:bg-[hsl(var(--muted)/0.3)] transition-colors"
                  style={{ textDecoration: 'none' }}
                >
                  <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10, flexShrink: 0, marginTop: 2 }}>
                    {(entry.module || 'general').replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>
                      {entry.action}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'hsl(var(--text-3))' }}>
                      {entry.entityName ?? (entry.entityId ? 'Unavailable' : '—')} · {entry.actorName}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0 font-mono" style={{ color: NEUTRAL }}>
                    {formatDate((entry.createdAt ?? '').split('T')[0])}
                  </span>
                </Link>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks — these rows come from `tasks`, so the card is titled
            and linked to /tasks. It previously claimed to show gap actions and
            sent "View All" to /compliance/gap-analysis, which reads `gaps`; it
            also read task.framework / task.severity / task.owner, none of which
            exist on a task row (they rendered blank or a fabricated colour). */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Overdue Tasks
            </CardTitle>
            <Link to="/tasks">
              <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
                View All <ArrowRight size={12} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {tasksError ? (
              <SectionError error={tasksError} what="Tasks" />
            ) : overdueTaskItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <CheckCircle size={28} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>No overdue tasks</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {overdueTaskItems.map((task: any) => {
                  const daysOver = Math.ceil((Date.now() - new Date(task.dueDate ?? task.due_date).getTime()) / DAY_MS);
                  const known = ['critical', 'high', 'medium', 'low'].includes(String(task.priority));
                  // An unrecognised priority is shown as unknown, never coerced
                  // into a confident "medium" badge.
                  const sc = known
                    ? severityColor(task.priority)
                    : { bg: 'hsl(var(--bg-muted))', text: NEUTRAL, border: 'hsl(var(--border))' };
                  return (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className="px-4 py-3 flex items-start gap-3 hover:bg-[hsl(var(--muted)/0.3)] transition-colors"
                      style={{ textDecoration: 'none' }}
                    >
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
                        {known ? task.priority : 'unknown'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))', wordBreak: 'break-word' }}>
                          {task.title || 'Untitled task'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                          {task.assignee || 'Unassigned'}
                        </p>
                      </div>
                      <span className="text-xs flex-shrink-0 font-medium" style={{ color: 'hsl(var(--s-er-tx))' }}>
                        {daysOver}d overdue
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Risks Summary */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Top Open Risks
          </CardTitle>
          <Link to="/risks">
            <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
              View All <ArrowRight size={12} />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {risksError ? (
            <SectionError error={risksError} what="Risk register" />
          ) : topOpenRisks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10" style={{ color: NEUTRAL }}>
              <CheckCircle size={24} className="mb-2 opacity-40" />
              <p className="text-sm">No open risks in the register</p>
            </div>
          ) : (
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['Ref', 'Risk', 'Category', 'Severity', 'Score', 'Trend', 'Owner'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topOpenRisks.map((r: any) => {
                const sc = severityColor((r.severity ?? 'medium') as Parameters<typeof severityColor>[0]);
                const score = riskScoreOf(r);
                const scoreColor = score == null
                  ? NEUTRAL
                  : score >= riskThreshold ? 'hsl(var(--s-er-tx))' : score >= 10 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--text-1))';
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="p-3 text-xs font-mono">
                      <Link to={`/risks?open=${encodeURIComponent(r.id)}`} style={{ color: 'hsl(var(--brand))', textDecoration: 'none' }}>
                        {r.risk_id ?? 'View'}
                      </Link>
                    </td>
                    <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 280 }}>
                      <span className="line-clamp-2">{r.title}</span>
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{r.category || '—'}</td>
                    <td className="p-3">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                        {r.severity ?? 'unknown'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {/* An unscored risk renders "—", never a confident 0. */}
                      <span className="text-sm font-bold" style={{ color: scoreColor }} title={score == null ? 'No score recorded yet' : undefined}>
                        {score == null ? '—' : score}
                      </span>
                    </td>
                    <td className="p-3">
                      <TrendIcon trend={(r.trending ?? 'stable') as 'stable' | 'up' | 'down'} />
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{r.owner || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </CardContent>
      </Card>

      {/* ── Model Risk Heat Map — cross-tab of the real model estate ─────────
          (risk tier × lifecycle stage from ai_models; was a literal matrix). */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Model Risk Heat Map — risk tier × lifecycle stage
          </CardTitle>
          <Link to="/models/inventory">
            <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
              View All <ArrowRight size={12} />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4 overflow-x-auto">
          {modelsError ? (
            <SectionError error={modelsError} what="Model inventory" />
          ) : models.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10" style={{ color: NEUTRAL }}>
              <Brain size={24} className="mb-2 opacity-40" />
              <p className="text-sm">No models registered yet</p>
              <p className="text-xs mt-1">
                Register one under <Link to="/models/inventory" style={{ color: 'hsl(var(--brand))' }}>Model Inventory</Link> and the map fills in.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-[hsl(var(--border))] text-left font-semibold text-[hsl(var(--text-3))]">Risk / Stage</th>
                  {heatMap.stages.map(stage => (
                    <th key={stage ?? 'unassigned'} className="p-2 border border-[hsl(var(--border))] font-semibold text-[hsl(var(--text-2))]">
                      {stage == null ? 'Unassigned' : titleCase(stage)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatMap.rows.map(row => {
                  const palette = tierPalette(row.tier);
                  return (
                    <tr key={row.tier ?? 'unclassified'}>
                      <td className="p-2 border border-[hsl(var(--border))] text-left font-medium" style={{ color: 'hsl(var(--text-2))' }}>
                        {row.tier == null ? 'Unclassified' : titleCase(row.tier)}
                      </td>
                      {row.cells.map((val, j) => (
                        <td key={j} className="p-2 border border-[hsl(var(--border))] relative">
                          {val > 0 && (
                            <div className="absolute inset-1" style={{ background: palette.bg, opacity: val > 5 ? 1 : 0.6 }} />
                          )}
                          <span className="relative z-10 font-bold" style={{ color: val > 0 ? palette.color : NEUTRAL }}>{val}</span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Compliance Calendar (90 days) — real merged calendar: manual
          compliance_calendar rows plus deadlines derived live from the
          governed source tables; each tile deep-links to its owner. ────────── */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Compliance Calendar (90 Days)
          </CardTitle>
          <Link to="/calendar">
            <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
              Full Calendar <ArrowRight size={12} />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4 overflow-x-auto">
          {calendarError ? (
            <SectionError error={calendarError} what="Compliance calendar" />
          ) : calendarLoading ? (
            <div className="flex items-center gap-4 min-w-max pb-2" role="status" aria-label="Loading compliance calendar">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-48 h-20" style={{ background: 'hsl(var(--bg-raised))', opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ) : calendarStrip.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8" style={{ color: NEUTRAL }}>
              <CalendarBlank size={24} className="mb-2 opacity-40" />
              <p className="text-sm">Nothing due in the next 90 days</p>
              <p className="text-xs mt-1">
                Add an entry under <Link to="/calendar" style={{ color: 'hsl(var(--brand))' }}>Compliance Calendar</Link> — deadlines from other modules appear here automatically.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-4 min-w-max pb-2">
              {calendarStrip.map((item, i) => {
                const rel = relativeDayLabel(item.dueAt as string);
                const color = rel.overdue
                  ? 'hsl(var(--s-er-tx))'
                  : rel.days <= 7 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-2))';
                return (
                  <Link
                    key={item.id ?? `${item.sourceType}-${i}`}
                    to={item.route ?? '/calendar'}
                    className="flex-shrink-0 w-48 p-3 border border-[hsl(var(--border))] flex flex-col gap-2 relative overflow-hidden hover:border-[hsl(var(--brand))] transition-colors"
                    style={{ textDecoration: 'none' }}
                  >
                    {(rel.overdue || rel.days <= 7) && <div className="absolute top-0 left-0 w-full h-1" style={{ background: color }} />}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{rel.label}</span>
                      <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', fontSize: 9, borderRadius: 0 }}>
                        {item.type ? titleCase(item.type) : titleCase(item.sourceType)}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-2 mt-1" style={{ color: 'hsl(var(--text-1))' }}>{item.title}</p>
                    <p className="text-[10px]" style={{ color: NEUTRAL }}>
                      {item.owner || 'Unassigned'} · {formatDate(String(item.dueAt).split('T')[0])}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
