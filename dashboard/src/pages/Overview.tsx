import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Clock, Warning, Brain, WarningCircle, Briefcase, FileText,
  Users, Database, StackSimple, ArrowRight, ChartLine, CheckCircle,
  TrendUp, TrendDown, Minus, ShieldCheck, Siren, Plus,
  Robot, Scales, UserCircleCheck,
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

// RAG ring color helper
function ragColor(value: number, type: 'score' | 'risk' | 'incident'): string {
  if (type === 'incident') return value >= 2 ? '#ef4444' : value >= 1 ? '#f97316' : '#10b981';
  if (type === 'risk') return value >= 10 ? '#f97316' : value >= 5 ? '#f97316' : '#10b981';
  // score type: compliance %
  if (value >= 85) return '#10b981';
  if (value >= 60) return '#f97316';
  return '#ef4444';
}

function ScoreRing({ value, label, color, size = 80 }: { value: number | string; label: string; color: string; size?: number }) {
  const circumference = 2 * Math.PI * 34;
  const numVal = typeof value === 'number' ? value : parseInt(String(value));
  const progress = Math.min(numVal / 100, 1);

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="butt"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{value}{typeof value === 'number' && label.includes('Score') ? '%' : ''}</span>
        </div>
      </div>
      <span className="text-xs text-center" style={{ color: 'hsl(var(--text-3))' }}>{label}</span>
    </div>
  );
}

export default function Overview() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const navigate = useNavigate();

  const openRisks = RISKS.filter(r => r.status === 'open').length;
  const activeModels = MODELS.filter(m => m.status === 'production').length;
  const criticalIncidents = INCIDENTS.filter(i => i.severity === 'critical').length;
  const activePolicies = POLICIES.filter(p => p.status === 'published').length;
  const openGaps = GAPS.length;
  const overdueGaps = GAPS.filter(g => new Date(g.dueDate) < new Date()).length;

  // Compliance posture
  const avgCompliance = Math.round(FRAMEWORKS.reduce((sum, f) => sum + f.complianceScore, 0) / FRAMEWORKS.length);
  const securityScore = 79;

  const kpis = [
    { label: 'Open Tasks', value: overdueGaps + 5, icon: Clock, color: ragColor(overdueGaps + 5, 'risk'), link: '/compliance/gap-analysis' },
    { label: 'Open Risks', value: openRisks, icon: Warning, color: ragColor(openRisks, 'risk'), link: '/risk', ragType: 'risk' as const },
    { label: 'Active Models', value: activeModels, icon: Brain, color: '#8b5cf6', link: '/models/inventory' },
    { label: 'Critical Incidents', value: criticalIncidents, icon: WarningCircle, color: ragColor(criticalIncidents, 'incident'), link: '/risk/incidents', ragType: 'incident' as const },
    { label: 'Use Cases', value: AGENTS.length, icon: ChartLine, color: '#3b82f6', link: '/agents' },
    { label: 'Active Policies', value: activePolicies, icon: FileText, color: '#10b981', link: '/compliance/policies' },
    { label: 'Vendors', value: VENDORS.length, icon: Briefcase, color: '#06b6d4', link: '/vendors' },
    { label: 'Datasets', value: DATASETS.length, icon: Database, color: '#f59e0b', link: '/datasets' },
    { label: 'Frameworks', value: FRAMEWORKS.length, icon: StackSimple, color: '#6366f1', link: '/frameworks' },
  ];

  // RAG border color for KPI tiles
  function kpiBorderColor(k: typeof kpis[0]): string {
    if (k.label === 'Critical Incidents') return criticalIncidents >= 2 ? '#ef4444' : criticalIncidents >= 1 ? '#f97316' : '#10b981';
    if (k.label === 'Open Risks') return openRisks >= 10 ? '#f97316' : '#10b981';
    if (k.label === 'Open Tasks') return (overdueGaps + 5) >= 5 ? '#f97316' : '#10b981';
    return 'hsl(var(--border))';
  }

  const frameworkChartData = FRAMEWORKS.map(f => ({
    name: f.name.includes('42001') ? 'ISO 42001' :
          f.name.includes('27001') ? 'ISO 27001' :
          f.name.includes('SOC') ? 'SOC 2' :
          f.name.includes('EU AI') ? 'EU AI Act' :
          f.name.includes('NIST') ? 'NIST RMF' :
          f.name.includes('OWASP') ? 'OWASP LLM' :
          f.name.replace('ISO/IEC ', '').replace('OWASP ', '').split(' ')[0],
    score: f.complianceScore,
    fullName: f.name,
  }));

  const recentActivity = [...AUDIT_LOG].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 6);

  const overdueGapItems = GAPS.filter(g => new Date(g.dueDate) < new Date()).slice(0, 5);

  const quickActions = [
    { label: 'Register Model', icon: Robot, to: '/models/inventory', action: 'register' },
    { label: 'Create Policy', icon: FileText, to: '/compliance/policies' },
    { label: 'Start Audit', icon: ShieldCheck, to: '/compliance/controls' },
    { label: 'Add Vendor', icon: Briefcase, to: '/vendors' },
    { label: 'Queue HITL Review', icon: UserCircleCheck, to: '/hitl' },
  ];

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

      {/* ═══════ COMPLIANCE POSTURE BANNER ═══════ */}
      <Card style={{
        background: 'linear-gradient(135deg, hsl(var(--bg-surface)) 0%, hsl(var(--bg-muted)) 100%)',
        border: '1px solid hsl(var(--border))',
      }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <ScoreRing value={avgCompliance} label="Compliance Score" color={ragColor(avgCompliance, 'score')} size={90} />
              <ScoreRing value={securityScore} label="Security Score" color={ragColor(securityScore, 'score')} size={90} />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-[90px] h-[90px]">
                  <span className="text-3xl font-bold" style={{ color: ragColor(openRisks, 'risk') }}>{openRisks}</span>
                </div>
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Open Risks</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-[90px] h-[90px]">
                  <span className="text-3xl font-bold" style={{ color: ragColor(criticalIncidents, 'incident') }}>{criticalIncidents}</span>
                </div>
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Critical Incidents</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <Siren size={16} style={{ color: '#f97316' }} />
                <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Attention Required</span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>
                3 critical items require immediate attention before next audit (Apr 20)
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/risk')}
                style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
              >
                View All Issues <ArrowRight size={12} className="ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Tiles — 9 cards, 3 rows of 3 */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-9 lg:gap-3">
        {kpis.map(k => (
          <Link key={k.label} to={k.link} style={{ textDecoration: 'none' }}>
            <Card
              style={{
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border))',
                borderLeft: `4px solid ${kpiBorderColor(k)}`,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = k.color)}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'hsl(var(--border))';
                e.currentTarget.style.borderLeftColor = kpiBorderColor(k);
              }}
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

      {/* ═══════ QUICK ACTIONS ═══════ */}
      <div className="flex items-center gap-3">
        {quickActions.map(a => (
          <Link key={a.label} to={a.to} style={{ textDecoration: 'none' }}>
            <Button
              variant="outline"
              size="sm"
              style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}
              className="hover:border-[hsl(var(--brand))] hover:text-[hsl(var(--brand))]"
            >
              <a.icon size={14} className="mr-1.5" /> {a.label}
            </Button>
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
            <Link to="/compliance/gap-analysis">
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
          <Link to="/risk">
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
