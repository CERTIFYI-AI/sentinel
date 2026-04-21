// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// ComplianceDashboard — enterprise compliance posture overview.
// Displays framework scores, control coverage, gap analytics, and the
// cross-framework control mapping matrix.

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  StackSimple, Warning, XCircle, ClipboardText, ShieldCheck, CheckCircle, Info,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { FRAMEWORKS, GAPS, CONTROLS, EVIDENCE, statusColor, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCardRow } from '../components/ui/StatCardRow';
import type { StatCardRowItem } from '../components/ui/StatCardRow';

const SCORE_TREND = [
  { month: 'Oct', score: 71 },
  { month: 'Nov', score: 72 },
  { month: 'Dec', score: 74 },
  { month: 'Jan', score: 75 },
  { month: 'Feb', score: 76 },
  { month: 'Mar', score: 78 },
];

const GAUGE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#06b6d4'];

function complianceBadge(score: number) {
  if (score >= 85) return { label: 'Compliant', bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
  if (score >= 65) return { label: 'Partial', bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
  return { label: 'Non-Compliant', bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
}

const overallScore = Math.round(
  FRAMEWORKS.reduce((s, f) => s + f.complianceScore, 0) / FRAMEWORKS.length
);

const criticalGaps = GAPS.filter(g => g.severity === 'critical').length;
const openGaps = GAPS.length;
const evidenceTotal = EVIDENCE.length;
const totalControls = CONTROLS.length;
const implementedControls = CONTROLS.filter(c => c.status === 'implemented').length;
const controlCoverage = Math.round((implementedControls / totalControls) * 100);

const gapsByFramework = FRAMEWORKS.map(f => ({
  name: f.name.replace('ISO/IEC ', '').replace('OWASP ', '').split(' ')[0],
  gaps: GAPS.filter(g => g.framework === f.name).length,
  fullName: f.name,
}));

// ── Control Mapping Matrix Data ───────────────────────────────────────────────

type CellStatus = 'implemented' | 'partial' | 'planned' | 'not_mapped';

interface MatrixCell {
  status: CellStatus;
  note: string;
}

const FW_KEYS = ['EU AI Act', 'ISO 27001', 'SOC 2', 'NIST AI RMF', 'OWASP LLM', 'GDPR'];

const CONTROL_MATRIX: Record<string, Record<string, CellStatus>> = {
  'CTRL-001': { 'EU AI Act': 'implemented', 'ISO 27001': 'partial', 'SOC 2': 'not_mapped', 'NIST AI RMF': 'implemented', 'OWASP LLM': 'not_mapped', 'GDPR': 'partial' },
  'CTRL-002': { 'EU AI Act': 'implemented', 'ISO 27001': 'partial', 'SOC 2': 'partial', 'NIST AI RMF': 'implemented', 'OWASP LLM': 'not_mapped', 'GDPR': 'implemented' },
  'CTRL-003': { 'EU AI Act': 'partial', 'ISO 27001': 'not_mapped', 'SOC 2': 'partial', 'NIST AI RMF': 'partial', 'OWASP LLM': 'not_mapped', 'GDPR': 'partial' },
  'CTRL-004': { 'EU AI Act': 'implemented', 'ISO 27001': 'implemented', 'SOC 2': 'implemented', 'NIST AI RMF': 'implemented', 'OWASP LLM': 'not_mapped', 'GDPR': 'partial' },
  'CTRL-005': { 'EU AI Act': 'partial', 'ISO 27001': 'implemented', 'SOC 2': 'implemented', 'NIST AI RMF': 'implemented', 'OWASP LLM': 'partial', 'GDPR': 'not_mapped' },
  'CTRL-006': { 'EU AI Act': 'partial', 'ISO 27001': 'not_mapped', 'SOC 2': 'not_mapped', 'NIST AI RMF': 'partial', 'OWASP LLM': 'not_mapped', 'GDPR': 'partial' },
  'CTRL-007': { 'EU AI Act': 'partial', 'ISO 27001': 'implemented', 'SOC 2': 'implemented', 'NIST AI RMF': 'partial', 'OWASP LLM': 'partial', 'GDPR': 'partial' },
  'CTRL-008': { 'EU AI Act': 'partial', 'ISO 27001': 'implemented', 'SOC 2': 'implemented', 'NIST AI RMF': 'partial', 'OWASP LLM': 'planned', 'GDPR': 'implemented' },
  'CTRL-009': { 'EU AI Act': 'partial', 'ISO 27001': 'partial', 'SOC 2': 'partial', 'NIST AI RMF': 'not_mapped', 'OWASP LLM': 'not_mapped', 'GDPR': 'partial' },
  'CTRL-010': { 'EU AI Act': 'not_mapped', 'ISO 27001': 'implemented', 'SOC 2': 'implemented', 'NIST AI RMF': 'partial', 'OWASP LLM': 'partial', 'GDPR': 'not_mapped' },
  'CTRL-011': { 'EU AI Act': 'partial', 'ISO 27001': 'implemented', 'SOC 2': 'implemented', 'NIST AI RMF': 'partial', 'OWASP LLM': 'not_mapped', 'GDPR': 'not_mapped' },
  'CTRL-012': { 'EU AI Act': 'partial', 'ISO 27001': 'partial', 'SOC 2': 'partial', 'NIST AI RMF': 'partial', 'OWASP LLM': 'partial', 'GDPR': 'not_mapped' },
  'CTRL-013': { 'EU AI Act': 'planned', 'ISO 27001': 'not_mapped', 'SOC 2': 'not_mapped', 'NIST AI RMF': 'not_mapped', 'OWASP LLM': 'planned', 'GDPR': 'planned' },
  'CTRL-014': { 'EU AI Act': 'implemented', 'ISO 27001': 'implemented', 'SOC 2': 'partial', 'NIST AI RMF': 'implemented', 'OWASP LLM': 'not_mapped', 'GDPR': 'not_mapped' },
  'CTRL-015': { 'EU AI Act': 'partial', 'ISO 27001': 'not_mapped', 'SOC 2': 'not_mapped', 'NIST AI RMF': 'not_mapped', 'OWASP LLM': 'not_mapped', 'GDPR': 'partial' },
};

function cellConfig(status: CellStatus) {
  if (status === 'implemented') return { symbol: '✓', bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))', label: 'Implemented' };
  if (status === 'partial') return { symbol: '⚠', bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))', label: 'Partial' };
  if (status === 'planned') return { symbol: '○', bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', label: 'Planned' };
  return { symbol: '—', bg: 'transparent', color: 'hsl(var(--text-4))', label: 'Not Mapped' };
}

export default function ComplianceDashboard() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [matrixHover, setMatrixHover] = useState<{ ctrl: string; fw: string } | null>(null);

  const kpiCards: StatCardRowItem[] = [
    {
      label: 'Overall Score',
      value: `${overallScore}%`,
      icon: <ShieldCheck size={18} />,
      delta: '+2%',
      deltaDir: 'up',
      isPositiveUp: true,
      description: `Overall compliance score: ${overallScore}% across ${FRAMEWORKS.length} frameworks`,
    },
    {
      label: 'Total Controls',
      value: totalControls,
      icon: <ClipboardText size={18} />,
      description: `${totalControls} controls tracked`,
    },
    {
      label: 'Implemented',
      value: `${controlCoverage}%`,
      icon: <CheckCircle size={18} />,
      delta: `${implementedControls}/${totalControls}`,
      deltaDir: 'up',
      isPositiveUp: true,
      description: `${implementedControls} of ${totalControls} controls implemented`,
    },
    {
      label: 'Critical Gaps',
      value: criticalGaps,
      icon: <XCircle size={18} />,
      delta: criticalGaps > 0 ? String(criticalGaps) : undefined,
      deltaDir: 'up',
      isPositiveUp: false,
      description: `${criticalGaps} critical compliance gaps require immediate attention`,
    },
  ];

  const matrixTotals = FW_KEYS.map(fw => {
    const cells = CONTROLS.map(c => CONTROL_MATRIX[c.id]?.[fw] ?? 'not_mapped');
    return {
      fw,
      implemented: cells.filter(s => s === 'implemented').length,
      partial: cells.filter(s => s === 'partial').length,
      planned: cells.filter(s => s === 'planned').length,
      not_mapped: cells.filter(s => s === 'not_mapped').length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Enterprise Page Header */}
      <PageHeader
        title="Compliance Dashboard"
        subtitle="Framework posture, gap tracking and control coverage"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Compliance' },
        ]}
        badge={
          (() => {
            const b = complianceBadge(overallScore);
            return (
              <Badge style={{ background: b.bg, color: b.text, border: `1px solid ${b.border}`, borderRadius: 0, fontSize: 11 }}>
                {b.label}
              </Badge>
            );
          })()
        }
      />

      {/* KPI StatCardRow */}
      <StatCardRow cards={kpiCards} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="mapping" style={{ borderRadius: 0 }}>Control Mapping Matrix</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">

          {/* Overall Score + Score Trend */}
          <div className="grid grid-cols-3 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Overall Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-4">
                  <div className="relative">
                    <PieChart width={160} height={90}>
                      <Pie
                        data={[{ value: overallScore }, { value: 100 - overallScore }]}
                        cx={80} cy={80} startAngle={180} endAngle={0}
                        innerRadius={55} outerRadius={75} paddingAngle={0} dataKey="value"
                      >
                        <Cell fill="hsl(var(--brand))" />
                        <Cell fill="hsl(var(--bg-muted))" />
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                      <span className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{overallScore}%</span>
                    </div>
                  </div>
                  <span className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                    Based on {FRAMEWORKS.length} frameworks
                  </span>
                  <div className="mt-3 flex gap-2">
                    {(() => {
                      const b = complianceBadge(overallScore);
                      return (
                        <Badge style={{ background: b.bg, color: b.text, border: `1px solid ${b.border}`, borderRadius: 0 }}>
                          {b.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="mt-4 w-full space-y-1">
                    <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      <span>Controls implemented</span>
                      <span style={{ color: 'hsl(var(--text-1))' }}>{implementedControls}/{totalControls}</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      <span>Coverage</span>
                      <span style={{ color: '#10b981' }}>{controlCoverage}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Compliance Score Trend (6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={SCORE_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} />
                    <YAxis
                      domain={[60, 100]}
                      tick={{ fill: ct.axis, fontSize: 11 }}
                      label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
                    />
                    <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                      formatter={(v: number) => [v + '%', 'Overall Score']} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--brand))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--brand))' }} name="Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Framework Table + Gaps by Framework */}
          <div className="grid grid-cols-2 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Framework Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                    <tr>
                      {['Framework', 'Score', 'Controls', 'Status', 'Next Audit'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FRAMEWORKS.map(f => {
                      const b = complianceBadge(f.complianceScore);
                      return (
                        <tr key={f.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                          <td className="p-3">
                            <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</p>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{f.category}</p>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1" style={{ background: 'hsl(var(--bg-muted))', height: 6 }}>
                                <div style={{ width: f.complianceScore + '%', background: f.complianceScore >= 85 ? '#10b981' : f.complianceScore >= 65 ? '#f97316' : '#ef4444', height: '100%' }} />
                              </div>
                              <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{f.complianceScore}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                            {f.controlsImplemented}/{f.controlsTotal}
                          </td>
                          <td className="p-3">
                            <Badge style={{ background: b.bg, color: b.text, border: `1px solid ${b.border}`, borderRadius: 0, fontSize: 10 }}>
                              {b.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                            {formatDate(f.nextAudit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Gaps by Framework
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={gapsByFramework} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: ct.axis }}
                      label={{ value: 'Gap Count', position: 'insideBottom', offset: -2, style: { fill: ct.axis, fontSize: 11 } }} />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10, fill: ct.axis }} />
                    <Tooltip
                      contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                      formatter={(v: number, _: string, p: any /* recharts payload */) => [v + ' gaps', p.payload.fullName]}
                    />
                    <Bar dataKey="gaps" name="Gaps" fill="#f97316" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Control Mapping Matrix Tab ────────────────────────────────────── */}
        <TabsContent value="mapping" className="mt-4 space-y-4">

          {/* Legend */}
          <div className="flex items-center gap-6 px-1">
            <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>Legend:</span>
            {(['implemented', 'partial', 'planned', 'not_mapped'] as CellStatus[]).map(s => {
              const c = cellConfig(s);
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: c.color }}>{c.symbol}</span>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{c.label}</span>
                </div>
              );
            })}
          </div>

          {/* Matrix */}
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div style={{ overflowX: 'auto' }}>
                <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 780 }}>
                  <thead>
                    <tr style={{ background: 'hsl(var(--bg-muted))' }}>
                      <th className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))', minWidth: 240, borderBottom: '1px solid hsl(var(--border))' }}>
                        Control
                      </th>
                      {FW_KEYS.map(fw => (
                        <th key={fw} className="p-2 text-center text-xs font-semibold" style={{ color: 'hsl(var(--text-2))', minWidth: 96, borderBottom: '1px solid hsl(var(--border))', borderLeft: '1px solid hsl(var(--border))' }}>
                          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {fw}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CONTROLS.map((ctrl, idx) => (
                      <tr
                        key={ctrl.id}
                        style={{
                          background: idx % 2 === 0 ? 'hsl(var(--bg-surface))' : 'hsl(var(--bg-muted) / 0.4)',
                          borderBottom: '1px solid hsl(var(--border))',
                        }}
                      >
                        <td className="p-3">
                          <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand))' }}>{ctrl.id}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{ctrl.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{ctrl.framework} · {ctrl.clause}</p>
                        </td>
                        {FW_KEYS.map(fw => {
                          const status = CONTROL_MATRIX[ctrl.id]?.[fw] ?? 'not_mapped';
                          const c = cellConfig(status);
                          const isHover = matrixHover?.ctrl === ctrl.id && matrixHover?.fw === fw;
                          return (
                            <td
                              key={fw}
                              className="text-center"
                              style={{
                                borderLeft: '1px solid hsl(var(--border))',
                                background: isHover ? c.bg : status !== 'not_mapped' ? c.bg : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                                position: 'relative',
                              }}
                              onMouseEnter={() => setMatrixHover({ ctrl: ctrl.id, fw })}
                              onMouseLeave={() => setMatrixHover(null)}
                            >
                              <span className="text-sm font-bold" style={{ color: c.color }}>{c.symbol}</span>
                              {isHover && status !== 'not_mapped' && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  background: 'hsl(var(--bg-surface))',
                                  border: '1px solid hsl(var(--border))',
                                  padding: '6px 10px',
                                  zIndex: 20,
                                  whiteSpace: 'nowrap',
                                  fontSize: 11,
                                  color: 'hsl(var(--text-2))',
                                  pointerEvents: 'none',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}>
                                  <p className="font-semibold" style={{ color: c.color }}>{c.label}</p>
                                  <p>{ctrl.id} → {fw}</p>
                                  <p style={{ color: 'hsl(var(--text-4))' }}>Score: {ctrl.score}% · {ctrl.clause}</p>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer totals */}
                  <tfoot>
                    <tr style={{ background: 'hsl(var(--bg-muted))', borderTop: '2px solid hsl(var(--border))' }}>
                      <td className="p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>
                        Framework Totals ({CONTROLS.length} controls)
                      </td>
                      {matrixTotals.map(t => (
                        <td key={t.fw} className="p-2 text-center" style={{ borderLeft: '1px solid hsl(var(--border))' }}>
                          <div className="flex flex-col gap-0.5 items-center">
                            <span className="text-xs font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>{t.implemented}✓</span>
                            <span className="text-xs font-bold" style={{ color: 'hsl(var(--s-wn-tx))' }}>{t.partial}⚠</span>
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{t.not_mapped}—</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Per-framework summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {matrixTotals.map(t => {
              const pct = Math.round((t.implemented / CONTROLS.length) * 100);
              return (
                <Card key={t.fw} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--text-1))' }}>{t.fw}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div style={{ flex: 1, background: 'hsl(var(--bg-muted))', height: 4 }}>
                        <div style={{ width: pct + '%', background: pct >= 60 ? '#10b981' : '#f97316', height: '100%' }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{pct}%</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      <span style={{ color: 'hsl(var(--s-ok-tx))' }}>{t.implemented} impl.</span>
                      <span style={{ color: 'hsl(var(--s-wn-tx))' }}>{t.partial} partial</span>
                      <span>{t.not_mapped} unmapped</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
