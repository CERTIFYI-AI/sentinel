import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ShieldWarning, CheckCircle, Warning, Fire, Robot, Users,
  ArrowUpRight, ChartBar, Shield, Brain, ArrowRight,
  Buildings, Gauge, TrendUp,
} from '@phosphor-icons/react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { RISKS, INCIDENTS, MODELS, CONTROLS, FRAMEWORKS, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useNavigate } from 'react-router-dom';

const RISK_TREND = [
  { month: 'Oct', score: 16.8, open: 8 },
  { month: 'Nov', score: 17.2, open: 9 },
  { month: 'Dec', score: 16.1, open: 7 },
  { month: 'Jan', score: 15.4, open: 8 },
  { month: 'Feb', score: 14.8, open: 9 },
  { month: 'Mar', score: 14.2, open: 8 },
];

const INCIDENT_SEVERITY = [
  { name: 'Critical', value: 2, color: '#ef4444' },
  { name: 'High', value: 2, color: '#f97316' },
  { name: 'Medium', value: 1, color: '#eab308' },
];

const COMPLIANCE_DATA = FRAMEWORKS.map(f => ({
  name: f.name.replace('ISO/', '').replace(' RMF', '').replace(' LLM Top 10', ' LLM').replace(' Type II', '').split(' ')[0],
  score: f.complianceScore,
  full: f.name,
}));

const QUICK_NAV = [
  { label: 'Model Inventory', path: '/models', icon: Brain, count: `${MODELS.length} models`, color: '#3b82f6' },
  { label: 'Risk Register', path: '/risk', icon: Warning, count: `${RISKS.filter(r => r.status === 'open').length} open risks`, color: '#ef4444' },
  { label: 'Compliance', path: '/compliance', icon: Shield, count: `${Math.round(FRAMEWORKS.reduce((s, f) => s + f.complianceScore, 0) / FRAMEWORKS.length)}% avg score`, color: '#10b981' },
  { label: 'Incidents', path: '/incidents', icon: Fire, count: `${INCIDENTS.filter(i => i.status !== 'resolved').length} active`, color: '#f97316' },
  { label: 'Bias Audits', path: '/bias-audits', icon: Gauge, count: '5 audits', color: '#8b5cf6' },
  { label: 'Vendors', path: '/vendors', icon: Buildings, count: '7 vendors', color: '#06b6d4' },
];

const CRITICAL_ALERTS = [
  { id: 'ALT-001', message: 'BA-005 — Loan Approval Assistant FAILED bias audit (Gender, Age, Disability)', severity: 'critical' as const, time: '2026-03-15' },
  { id: 'ALT-002', message: 'RSK-004 — OpenAI DPA gap for EU data, trending UP', severity: 'critical' as const, time: '2026-03-18' },
  { id: 'ALT-003', message: 'AGT-010 — LangChain-Marketing shadow agent accessing customer PII', severity: 'critical' as const, time: '2026-03-25' },
  { id: 'ALT-004', message: 'CTRL-012 — Prompt Injection Prevention control failing (score: 65)', severity: 'high' as const, time: '2026-03-20' },
  { id: 'ALT-005', message: 'GAP-005 — Vendor DPA agreements need immediate updates (10% complete)', severity: 'critical' as const, time: '2026-03-22' },
];

export default function CisoDashboard() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const navigate = useNavigate();

  const openCriticalRisks = RISKS.filter(r => r.severity === 'critical' && r.status === 'open').length;
  const activeIncidents = INCIDENTS.filter(i => i.status !== 'resolved').length;
  const productionModels = MODELS.filter(m => m.status === 'production').length;
  const complianceScore = Math.round(FRAMEWORKS.reduce((s, f) => s + f.complianceScore, 0) / FRAMEWORKS.length);

  const topStats = [
    { label: 'Overall Risk Score', value: '14.2', unit: '/25', icon: Gauge, color: '#ef4444', trend: 'down' },
    { label: 'Compliance Score', value: `${complianceScore}%`, unit: '', icon: Shield, color: '#10b981', trend: 'up' },
    { label: 'Open Critical Risks', value: openCriticalRisks, unit: '', icon: Warning, color: '#ef4444', trend: 'stable' },
    { label: 'Active Incidents', value: activeIncidents, unit: '', icon: Fire, color: '#f97316', trend: 'up' },
    { label: 'Models in Production', value: productionModels, unit: '', icon: Robot, color: '#3b82f6', trend: 'stable' },
    { label: 'MFA Adoption', value: '63%', unit: '', icon: Users, color: '#f97316', trend: 'up' },
  ];

  function trendIcon(trend: string, color: string) {
    if (trend === 'up') return <TrendUp size={14} style={{ color }} />;
    if (trend === 'down') return <TrendUp size={14} style={{ color, transform: 'rotate(180deg)' }} />;
    return null;
  }

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>CISO Executive Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · As of April 5, 2026 · Executive risk and compliance overview
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/ciso/report')} style={{ borderRadius: 0 }}>
          <ChartBar size={14} className="mr-1" /> Board Report
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-6 gap-3">
        {topStats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${s.color}30` }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <s.icon size={20} style={{ color: s.color }} />
                {trendIcon(s.trend, s.color)}
              </div>
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
                {s.value}<span className="text-sm font-normal" style={{ color: 'hsl(var(--text-3))' }}>{s.unit}</span>
              </p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Risk Trend */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '1 / 3' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Overall Risk Score — 6 Month Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={RISK_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis
                  domain={[10, 20]}
                  tick={{ fontSize: 11, fill: ct.axis }}
                  label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
                />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Area type="monotone" dataKey="score" name="Risk Score" stroke="#ef4444" fill="#ef444415" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incident Severity Pie */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Incident Severity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={INCIDENT_SEVERITY}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                  stroke="none"
                >
                  {INCIDENT_SEVERITY.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 w-full">
              {INCIDENT_SEVERITY.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 10, height: 10, background: s.color }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.name}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance by Framework */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Compliance Score by Framework</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={COMPLIANCE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: ct.axis }}
                label={{ value: 'Compliance %', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
              />
              <Tooltip
                contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                formatter={(v: number, _, props) => [v + '%', props.payload?.full]}
              />
              <Bar dataKey="score" name="Score" radius={0}>
                {COMPLIANCE_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 80 ? '#10b981' : entry.score >= 65 ? '#f97316' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Quick Nav */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {QUICK_NAV.map(nav => (
              <button
                key={nav.label}
                onClick={() => navigate(nav.path)}
                style={{
                  padding: '12px',
                  background: `${nav.color}08`,
                  border: `1px solid ${nav.color}30`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  transition: 'all 0.15s',
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

        {/* Critical Alerts Feed */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Critical Alert Feed</CardTitle>
              <Badge style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 0, fontSize: 11 }}>
                {CRITICAL_ALERTS.filter(a => a.severity === 'critical').length} critical
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {CRITICAL_ALERTS.map((alert, i) => {
              const sc = severityColor(alert.severity);
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: '10px 16px',
                    borderTop: i > 0 ? '1px solid hsl(var(--border))' : 'none',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <Warning size={14} style={{ color: sc.text, flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-2))', lineHeight: 1.4 }}>{alert.message}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(alert.time)}</p>
                  </div>
                  <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 9, flexShrink: 0 }}>
                    {alert.severity}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
