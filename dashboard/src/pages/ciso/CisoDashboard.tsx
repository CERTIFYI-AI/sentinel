// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// CISO Dashboard — the consolidated executive surface (route /ciso).
// Absorbs the former Executive Center (/executive-center) and ROI & Value
// (/roi) pages per the approved IA restructure, as tabs:
//   · Overview          — live risk & compliance posture from governed tables
//   · Board Report      — the existing /ciso/report generator, embedded
//   · Executive Metrics — regulatory readiness + model portfolio (real queries)
//   · ROI & Value       — honest state: realized value is not measured yet
// Honesty rules (CLAUDE.md): every number rendered here is computed from the
// real org-scoped tables (ai_models, risks, incidents, frameworks,
// agent_gov_registry, vendors) at render time. The fabricated metrics the old
// pages showed (risk-score trends, fine exposure, ROI curves, automation
// savings) had no backing tables and were NOT carried over.
// Deep links: ?tab=report|metrics|roi selects a tab.

import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Warning, Fire, Robot, ChartBar, Shield, Brain, Gauge,
  Buildings, ArrowRight, CheckCircle, Money, ClipboardText,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useModelsData } from '../../hooks/useModelsData';
import { useRisksData } from '../../hooks/useRisksData';
import { useIncidentData } from '../../hooks/useIncidentData';
import { useFrameworksData } from '../../hooks/useFrameworksData';
import { useVendorsData } from '../../hooks/useVendorsData';
import { agentRecordHooks } from '../../hooks/queries/useAgentGovCrud';
import type { RiskRecord } from '../../services/riskService';
import type { IncidentRecord } from '../../services/incidentService';
import type { FrameworkRecord } from '../../services/frameworkService';
import BoardReport from './BoardReport';

// The live `frameworks` table stores `score`/`target_score`; the service type
// still carries legacy `compliance_score`. Read whichever is present.
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
  return Number.isNaN(total) || total <= 0 ? null : { implemented: Number.isNaN(implemented) ? 0 : implemented, total };
}

const isOpenRisk = (r: RiskRecord) => String(r.status ?? '').toLowerCase() === 'open';
const isActiveIncident = (i: IncidentRecord) => !['resolved', 'closed'].includes(String(i.status ?? '').toLowerCase());

function scoreColor(s: number) {
  if (s >= 80) return 'hsl(var(--s-ok-tx))';
  if (s >= 65) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--destructive))';
}

type TabKey = 'overview' | 'report' | 'metrics' | 'roi';

export default function CisoDashboard() {
  const { orgName } = useSettingsStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const rawTab = params.get('tab');
  const tab: TabKey = rawTab === 'report' || rawTab === 'metrics' || rawTab === 'roi' ? rawTab : 'overview';
  const setTab = (next: string) => {
    setParams(prev => {
      const p = new URLSearchParams(prev);
      if (next === 'overview') p.delete('tab');
      else p.set('tab', next);
      return p;
    }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>CISO Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Executive risk and compliance overview — computed live from the governed inventory
          </p>
        </div>
        <Button size="sm" onClick={() => setTab('report')} style={{ borderRadius: 0 }}>
          <ChartBar size={14} /> Board Report
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ borderRadius: 0 }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="report" style={{ borderRadius: 0 }}>Board Report</TabsTrigger>
          <TabsTrigger value="metrics" style={{ borderRadius: 0 }}>Executive Metrics</TabsTrigger>
          <TabsTrigger value="roi" style={{ borderRadius: 0 }}>ROI &amp; Value</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="report" className="mt-4"><BoardReport /></TabsContent>
        <TabsContent value="metrics" className="mt-4"><ExecutiveMetricsTab /></TabsContent>
        <TabsContent value="roi" className="mt-4"><RoiValueTab onNavigate={navigate} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Overview — live posture from the governed tables ──────────────────────────

function OverviewTab() {
  const ct = useChartTheme();
  const navigate = useNavigate();
  const { models, isLoading: modelsLoading } = useModelsData();
  const { risks, isLoading: risksLoading } = useRisksData();
  const { incidents, isLoading: incidentsLoading } = useIncidentData();
  const { frameworks, isLoading: frameworksLoading } = useFrameworksData();
  const { vendors, isLoading: vendorsLoading } = useVendorsData();
  const { data: agents = [], isLoading: agentsLoading } = agentRecordHooks.useList();

  const loading = modelsLoading || risksLoading || incidentsLoading || frameworksLoading || agentsLoading || vendorsLoading;
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  const productionModels = models.filter(m => m.lifecycle_stage === 'production').length;
  const openRisks = risks.filter(isOpenRisk);
  const openSevereRisks = openRisks.filter(r => Number(r.impact) >= 5).length;
  const activeIncidents = incidents.filter(isActiveIncident).length;
  const activeAgents = agents.filter(a => a.status === 'Active').length;
  const scoredFrameworks = frameworks.map(frameworkScore).filter((s): s is number => s != null);
  const avgFrameworkScore = scoredFrameworks.length
    ? Math.round(scoredFrameworks.reduce((s, v) => s + v, 0) / scoredFrameworks.length)
    : null;

  const topStats = [
    { label: 'Models in Production', value: String(productionModels), icon: Robot, color: '#3b82f6' },
    { label: 'Open Risks', value: String(openRisks.length), icon: Warning, color: 'hsl(var(--s-er-tx))' },
    { label: 'Open Severity-5 Risks', value: String(openSevereRisks), icon: Gauge, color: 'hsl(var(--destructive))' },
    { label: 'Active Incidents', value: String(activeIncidents), icon: Fire, color: 'hsl(var(--r-hi-tx))' },
    { label: 'Active Agents', value: String(activeAgents), icon: Robot, color: 'hsl(var(--tag-purple))' },
    { label: 'Avg Framework Score', value: avgFrameworkScore != null ? `${avgFrameworkScore}%` : '—', icon: Shield, color: 'hsl(var(--s-ok-tx))' },
  ];

  // Risks by mitigation status — computed from the live risk register.
  const riskStatusCounts = Object.entries(
    risks.reduce<Record<string, number>>((acc, r) => {
      const k = r.status || 'Unknown';
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  // Incidents by severity — computed from the live incidents table.
  const sevOrder = ['critical', 'high', 'medium', 'low'];
  const sevColors: Record<string, string> = {
    critical: 'hsl(var(--s-er-tx))', high: 'hsl(var(--r-hi-tx))', medium: '#eab308', low: 'hsl(var(--s-ok-tx))',
  };
  const incidentSeverity = sevOrder
    .map(sev => ({
      name: sev.charAt(0).toUpperCase() + sev.slice(1),
      value: incidents.filter(i => String(i.severity ?? '').toLowerCase() === sev).length,
      color: sevColors[sev],
    }))
    .filter(d => d.value > 0);

  const quickNav = [
    { label: 'Model Inventory', path: '/models', icon: Brain, count: `${models.length} models`, color: '#3b82f6' },
    { label: 'Risk Register', path: '/risk', icon: Warning, count: `${openRisks.length} open risks`, color: 'hsl(var(--s-er-tx))' },
    { label: 'Compliance', path: '/compliance', icon: Shield, count: avgFrameworkScore != null ? `${avgFrameworkScore}% avg score` : `${frameworks.length} frameworks`, color: 'hsl(var(--s-ok-tx))' },
    { label: 'Incidents', path: '/risk/incidents', icon: Fire, count: `${activeIncidents} active`, color: 'hsl(var(--r-hi-tx))' },
    { label: 'Agents', path: '/agents', icon: Robot, count: `${agents.length} registered`, color: 'hsl(var(--tag-purple))' },
    { label: 'Vendors', path: '/vendors', icon: Buildings, count: `${vendors.length} vendors`, color: 'hsl(var(--s-in-tx))' },
  ];

  // Attention feed — real open critical risks and unresolved critical/high incidents.
  const attention = [
    ...openRisks
      .filter(r => Number(r.impact) >= 5)
      .map(r => ({ key: `risk-${r.id}`, kind: 'Risk', label: r.title || 'Untitled risk', severity: 'critical', path: `/risk?open=${r.id}` })),
    ...incidents
      .filter(i => isActiveIncident(i) && ['critical', 'high'].includes(String(i.severity ?? '').toLowerCase()))
      .map(i => ({ key: `inc-${i.id}`, kind: 'Incident', label: i.title || i.description || 'Untitled incident', severity: String(i.severity).toLowerCase(), path: `/risk/incidents?open=${i.id}` })),
  ];

  return (
    <div className="space-y-6">
      {/* KPI Stats — live counts */}
      <div className="grid grid-cols-6 gap-3">
        {topStats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${s.color}30` }}>
            <CardContent className="p-4">
              <s.icon size={20} style={{ color: s.color }} className="mb-2" />
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row — computed from live records (no historical snapshots are stored, so no trend series is shown) */}
      <div className="grid grid-cols-3 gap-4">
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '1 / 3' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Risk Register — by Mitigation Status</CardTitle>
          </CardHeader>
          <CardContent>
            {riskStatusCounts.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: 'hsl(var(--text-4))' }}>No risks recorded yet — the register is empty.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskStatusCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: ct.axis }} />
                  <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                  <Bar dataKey="count" name="Risks" fill="hsl(var(--brand))" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {incidentSeverity.length === 0 ? (
              <p className="text-sm py-10 text-center" style={{ color: 'hsl(var(--text-4))' }}>No incidents recorded.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={incidentSeverity} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                      {incidentSeverity.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 w-full">
                  {incidentSeverity.map(s => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 10, height: 10, background: s.color }} />
                        <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.name}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Quick Nav — live counts */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {quickNav.map(nav => (
              <button
                key={nav.label}
                onClick={() => navigate(nav.path)}
                style={{
                  padding: '12px', background: `${nav.color}08`, border: `1px solid ${nav.color}30`,
                  cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${nav.color}15`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${nav.color}08`)}
              >
                <nav.icon size={18} style={{ color: nav.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{nav.label}</span>
                <span style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{nav.count}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Attention feed — real records only */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Needs Attention</CardTitle>
              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-tx))', borderRadius: 0, fontSize: 11 }}>
                {attention.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {attention.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <CheckCircle size={24} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No open severity-5 risks or unresolved critical/high incidents.</p>
              </div>
            ) : attention.map((item, i) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="w-full text-left hover:bg-muted/30 transition-colors"
                style={{ padding: '10px 16px', borderTop: i > 0 ? '1px solid hsl(var(--border))' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <Warning size={14} style={{ color: item.severity === 'critical' ? 'hsl(var(--destructive))' : 'hsl(var(--r-hi-tx))', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-2))', lineHeight: 1.4 }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{item.kind}</p>
                </div>
                <Badge style={{ background: item.severity === 'critical' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))', color: item.severity === 'critical' ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 9, flexShrink: 0 }}>
                  {item.severity}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Executive Metrics (absorbed from Executive Center — real queries only) ────

function ExecutiveMetricsTab() {
  const navigate = useNavigate();
  const { models, isLoading: modelsLoading } = useModelsData();
  const { frameworks, isLoading: frameworksLoading } = useFrameworksData();
  const { risks, isLoading: risksLoading } = useRisksData();

  if (modelsLoading || frameworksLoading || risksLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const highTierProduction = models.filter(m => m.lifecycle_stage === 'production' && ['high', 'critical'].includes(String(m.risk_tier ?? '').toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Regulatory readiness — real frameworks table (score vs target, controls implemented) */}
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Regulatory Readiness</p>
        <p className="text-[11px] mb-3" style={{ color: 'hsl(var(--text-4))' }}>
          Live from the frameworks register — score vs. target and implemented controls. Statutory fine amounts are not tracked on the platform and are therefore not shown.
        </p>
        {frameworks.length === 0 ? (
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="py-10 text-center">
              <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No frameworks registered yet.</p>
              <Button variant="outline" size="sm" className="mt-3" style={{ borderRadius: 0 }} onClick={() => navigate('/frameworks')}>
                Open Frameworks <ArrowRight size={10} />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {frameworks.map(fw => {
              const score = frameworkScore(fw);
              const target = frameworkTarget(fw);
              const controls = frameworkControls(fw);
              const color = score != null ? scoreColor(score) : 'hsl(var(--text-4))';
              return (
                <button key={fw.id} onClick={() => navigate('/frameworks')} className="p-4 text-left hover:opacity-90"
                  style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>{fw.name}</p>
                  <p className="text-2xl font-bold mb-1" style={{ color }}>{score != null ? `${Math.round(score)}%` : '—'}</p>
                  <div className="h-1 w-full mb-2 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                    <div style={{ width: `${score ?? 0}%`, height: '100%', background: color }} />
                  </div>
                  <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>Target: {target != null ? `${Math.round(target)}%` : '—'}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                    Controls: {controls ? `${controls.implemented}/${controls.total} implemented` : '—'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Model portfolio — real ai_models rows, canonical /models/inventory/:id links */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Model Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {models.length === 0 ? (
            <p className="text-sm py-10 text-center" style={{ color: 'hsl(var(--text-4))' }}>No models in the inventory yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  {['Model', 'Lifecycle', 'Risk Tier', 'Fairness Score', 'Drift', 'Provider'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map(m => {
                  const tier = String(m.risk_tier ?? '').toLowerCase();
                  const tierBg = tier === 'high' || tier === 'critical' ? 'hsl(var(--s-er-bg))' : tier === 'medium' || tier === 'limited' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-ok-bg))';
                  const tierTx = tier === 'high' || tier === 'critical' ? 'hsl(var(--s-er-tx))' : tier === 'medium' || tier === 'limited' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))';
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/models/inventory/${m.id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                        {m.version && <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>v{m.version}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: m.lifecycle_stage === 'production' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-nt-bg))', color: m.lifecycle_stage === 'production' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))' }}>
                          {m.lifecycle_stage ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.risk_tier
                          ? <span className="text-[9px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: tierBg, color: tierTx }}>{m.risk_tier}</span>
                          : <span style={{ color: 'hsl(var(--text-4))' }}>Unassessed</span>}
                      </td>
                      <td className="px-4 py-3">
                        {typeof m.fairness_score === 'number'
                          ? <span className="font-bold" style={{ color: scoreColor(m.fairness_score) }}>{m.fairness_score}%</span>
                          : <span style={{ color: 'hsl(var(--text-4))' }}>Not measured</span>}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'hsl(var(--text-3))' }}>{m.drift_status ?? '—'}</td>
                      <td className="px-4 py-3" style={{ color: 'hsl(var(--text-3))' }}>{m.provider ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Attention required — derived from real records (the old page's invented "executive actions" were dropped) */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Attention Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(() => {
            const items = [
              ...risks.filter(r => isOpenRisk(r) && Number(r.impact) >= 4).map(r => ({
                key: `r-${r.id}`,
                text: r.title || 'Untitled risk',
                sub: `Open risk · severity ${r.impact}/5 · likelihood ${r.likelihood}/5${r.owner ? ` · owner: ${r.owner}` : ''}`,
                path: `/risk?open=${r.id}`,
                critical: Number(r.impact) >= 5,
              })),
              ...highTierProduction.map(m => ({
                key: `m-${m.id}`,
                text: `${m.name} — ${m.risk_tier} risk tier in production`,
                sub: 'Production model requiring enhanced oversight',
                path: `/models/inventory/${m.id}`,
                critical: String(m.risk_tier).toLowerCase() === 'critical',
              })),
            ];
            if (items.length === 0) {
              return <p className="text-sm py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>Nothing needs executive attention right now.</p>;
            }
            return items.map(item => (
              <button key={item.key} onClick={() => navigate(item.path)}
                className="w-full text-left p-3 hover:bg-muted/30"
                style={{ border: `1px solid ${item.critical ? 'hsl(var(--destructive) / 0.5)' : 'hsl(var(--s-wn-br))'}`, background: item.critical ? 'hsl(var(--s-er-bg) / 0.5)' : 'hsl(var(--s-wn-bg) / 0.4)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.text}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{item.sub}</p>
                  </div>
                  <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))', flexShrink: 0 }} />
                </div>
              </button>
            ));
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

// ── ROI & Value (absorbed from /roi — honest state, no invented economics) ────

function RoiValueTab({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="py-14 flex flex-col items-center gap-3 text-center px-6">
        <Money size={32} style={{ color: 'hsl(var(--text-4))' }} />
        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Realized value is not measured yet</p>
        <p className="text-xs max-w-xl" style={{ color: 'hsl(var(--text-4))' }}>
          The retired ROI page presented fine-avoidance totals, automation savings and payback curves that were
          not backed by any measured data, so they were removed rather than carried over. The platform does not
          currently record time saved, fines avoided, or cost baselines. When a value-tracking source exists,
          this tab will report from it. In the meantime, the real posture signals live in the governed modules below.
        </p>
        <div className="flex gap-2 flex-wrap justify-center mt-2">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => onNavigate('/compliance')}>
            <Shield size={14} className="mr-1" />Compliance Posture
          </Button>
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => onNavigate('/remediation-tracker')}>
            <ClipboardText size={14} className="mr-1" />Remediation Tracker
          </Button>
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => onNavigate('/trust-engine/costs')}>
            <ChartBar size={14} className="mr-1" />Cost &amp; Token Usage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
