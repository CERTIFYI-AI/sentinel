import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Clock, Warning, Brain, WarningCircle, Briefcase, FileText,
  Users, Database, StackSimple, ArrowRight, ChartLine, CheckCircle,
  TrendUp, TrendDown, Minus,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import {
  MODELS, RISKS, AGENTS, INCIDENTS, POLICIES, FRAMEWORKS, GAPS,
  AUDIT_LOG, VENDORS, DATASETS, EVIDENCE, severityColor, statusColor, formatDate,
} from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

const RISK_TREND = [
  { month: 'Oct', open: 14, critical: 4 },
  { month: 'Nov', open: 13, critical: 3 },
  { month: 'Dec', open: 15, critical: 5 },
  { month: 'Jan', open: 14, critical: 4 },
  { month: 'Feb', open: 13, critical: 4 },
  { month: 'Mar', open: 12, critical: 3 },
];

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendUp size={14} style={{ color: '#ef4444' }} />;
  if (trend === 'down') return <TrendDown size={14} style={{ color: '#10b981' }} />;
  return <Minus size={14} style={{ color: '#6b7280' }} />;
}

export default function Overview() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const openRisks = RISKS.filter(r => r.status === 'open').length;
  const activeModels = MODELS.filter(m => m.status === 'production').length;
  const criticalIncidents = INCIDENTS.filter(i => i.severity === 'critical').length;
  const activePolicies = POLICIES.filter(p => p.status === 'published').length;
  const openGaps = GAPS.length;
  const overdueGaps = GAPS.filter(g => new Date(g.dueDate) < new Date()).length;

  const kpis = [
    { label: 'Open Tasks', value: overdueGaps + 5, icon: Clock, color: '#f97316', link: '/tasks' },
    { label: 'Open Risks', value: openRisks, icon: Warning, color: '#ef4444', link: '/risk-register' },
    { label: 'Active Models', value: activeModels, icon: Brain, color: '#8b5cf6', link: '/model-inventory' },
    { label: 'Critical Incidents', value: criticalIncidents, icon: WarningCircle, color: '#ef4444', link: '/incidents' },
    { label: 'Use Cases', value: AGENTS.length, icon: ChartLine, color: '#3b82f6', link: '/agent-discovery' },
    { label: 'Active Policies', value: activePolicies, icon: FileText, color: '#10b981', link: '/policies' },
    { label: 'Vendors', value: VENDORS.length, icon: Briefcase, color: '#06b6d4', link: '/vendors' },
    { label: 'Datasets', value: DATASETS.length, icon: Database, color: '#f59e0b', link: '/datasets' },
    { label: 'Frameworks', value: FRAMEWORKS.length, icon: StackSimple, color: '#6366f1', link: '/frameworks' },
  ];

  const frameworkChartData = FRAMEWORKS.map(f => ({
    name: f.name.replace('ISO/IEC ', '').replace('OWASP ', '').split(' ')[0],
    score: f.complianceScore,
    fullName: f.name,
  }));

  const recentActivity = [...AUDIT_LOG].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 6);

  const overdueGapItems = GAPS.filter(g => new Date(g.dueDate) < new Date()).slice(0, 5);

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            GRC Executive Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · AI Governance, Risk & Compliance Overview
          </p>
        </div>
        <div className="flex gap-2">
          <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0, fontSize: 12 }}>
            System Operational
          </Badge>
          <span className="text-xs self-center" style={{ color: 'hsl(var(--text-3))' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* KPI Tiles — 9 cards, 3 rows of 3 */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-9 lg:gap-3">
        {kpis.map(k => (
          <Link key={k.label} to={k.link} style={{ textDecoration: 'none' }}>
            <Card
              style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = k.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <k.icon size={20} style={{ color: k.color }} />
                  <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{k.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{k.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

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
                  formatter={(v: number, _: string, p: any) => [v + '%', p.payload.fullName]}
                />
                <Bar dataKey="score" name="Score" radius={0} fill="hsl(var(--brand))" />
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={RISK_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis
                  tick={{ fill: ct.axis, fontSize: 11 }}
                  label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
                />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: ct.axis }} />
                <Line type="monotone" dataKey="open" stroke="#f97316" strokeWidth={2} dot={false} name="Open Risks" />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={false} name="Critical" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Activity Feed + Overdue Tasks */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Recent Activity
            </CardTitle>
            <Link to="/audit-log">
              <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
                View All <ArrowRight size={12} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {recentActivity.map(entry => {
                const sc = statusColor(entry.category);
                return (
                  <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'hsl(var(--brand))' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>
                        {entry.action}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'hsl(var(--text-3))' }}>
                        {entry.entity} · {entry.actor}
                      </p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--text-4))' }}>
                      {formatDate(entry.timestamp.split('T')[0])}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Tasks from GAPS */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Overdue Gap Actions
            </CardTitle>
            <Link to="/gap-analysis">
              <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
                View All <ArrowRight size={12} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {overdueGapItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <CheckCircle size={28} style={{ color: '#10b981' }} />
                <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>No overdue gaps</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {overdueGapItems.map(gap => {
                  const daysOver = Math.ceil((new Date().getTime() - new Date(gap.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                  const sc = severityColor(gap.severity);
                  return (
                    <div key={gap.id} className="px-4 py-3 flex items-start gap-3">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
                        {gap.severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))', wordBreak: 'break-word' }}>
                          {gap.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                          {gap.framework} · {gap.owner}
                        </p>
                      </div>
                      <span className="text-xs flex-shrink-0 font-medium" style={{ color: '#ef4444' }}>
                        {daysOver}d overdue
                      </span>
                    </div>
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
          <Link to="/risk-register">
            <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
              View All <ArrowRight size={12} className="ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Risk', 'Category', 'Severity', 'Score', 'Trend', 'Owner'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RISKS.filter(r => r.status === 'open').slice(0, 5).map(r => {
                const sc = severityColor(r.severity);
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.id}</td>
                    <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 280 }}>
                      <span className="line-clamp-2">{r.title}</span>
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{r.category}</td>
                    <td className="p-3">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                        {r.severity}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-sm font-bold" style={{ color: r.score >= 16 ? '#ef4444' : r.score >= 10 ? '#f97316' : 'hsl(var(--text-1))' }}>
                        {r.score}
                      </span>
                    </td>
                    <td className="p-3">
                      <TrendIcon trend={r.trending} />
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{r.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
