import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ShieldCheck, Bug, Sword, Scan, Globe, Funnel,
  Key, Robot, FileText, Warning, CheckCircle, Clock,
  ArrowRight, TrendUp, TrendDown, Minus,
} from '@phosphor-icons/react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { THREATS, VULNERABILITIES, RED_TEAM_EXERCISES, ATTACK_SURFACE, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

const modules = [
  { label: 'Threat Feed', path: '/security/threats', icon: Warning, count: 6, status: 'active', color: '#ef4444', desc: 'Active threats & intel' },
  { label: 'Vuln Tracker', path: '/security/vulns', icon: Bug, count: 6, status: 'open', color: '#f97316', desc: 'CVEs & patch status' },
  { label: 'Red Team Lab', path: '/security/redteam', icon: Sword, count: 4, status: 'active', color: '#8b5cf6', desc: 'Adversarial exercises' },
  { label: 'Scan Center', path: '/security/scans', icon: Scan, count: 6, status: 'scheduled', color: '#3b82f6', desc: 'Security scans & schedules' },
  { label: 'Attack Surface', path: '/security/attack-surface', icon: Globe, count: 8, status: 'monitored', color: '#06b6d4', desc: 'Asset exposure map' },
  { label: 'Policy Firewall', path: '/security/firewall', icon: Funnel, count: 8, status: 'active', color: '#10b981', desc: 'AI safety guardrails' },
  { label: 'Keys Vault', path: '/security/keys', icon: Key, count: 8, status: 'secure', color: '#f59e0b', desc: 'API keys & secrets' },
  { label: 'Model Arena', path: '/security/models', icon: Robot, count: 6, status: 'evaluated', color: '#ec4899', desc: 'Security benchmarks' },
  { label: 'Report Generator', path: '/security/reports', icon: FileText, count: 6, status: 'ready', color: '#6366f1', desc: 'Compliance reporting' },
];

const trendData = [
  { month: 'Oct', threats: 4, vulns: 8, score: 71 },
  { month: 'Nov', threats: 6, vulns: 7, score: 73 },
  { month: 'Dec', threats: 3, vulns: 9, score: 75 },
  { month: 'Jan', threats: 5, vulns: 6, score: 74 },
  { month: 'Feb', threats: 4, vulns: 5, score: 78 },
  { month: 'Mar', threats: 6, vulns: 6, score: 76 },
];

const securityScore = 76;

function ScoreBadge({ value }: { value: number }) {
  if (value >= 80) return <span style={{ color: '#10b981' }}>Good</span>;
  if (value >= 65) return <span style={{ color: '#f59e0b' }}>Fair</span>;
  return <span style={{ color: '#ef4444' }}>At Risk</span>;
}

export default function SecurityHome() {
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const activeThreats = THREATS.filter(t => t.status === 'active').length;
  const criticalVulns = VULNERABILITIES.filter(v => v.severity === 'critical').length;
  const openVulns = VULNERABILITIES.filter(v => v.status === 'open' || v.status === 'in_progress').length;
  const activeExercises = RED_TEAM_EXERCISES.filter(e => e.status === 'active').length;
  const highRiskAssets = ATTACK_SURFACE.filter(a => a.risk === 'critical' || a.risk === 'high').length;

  const recentEvents = [
    ...THREATS.map(t => ({ id: t.id, title: t.name, type: 'Threat', severity: t.severity, date: t.detected, status: t.status })),
    ...VULNERABILITIES.map(v => ({ id: v.id, title: v.title, type: 'Vuln', severity: v.severity, date: v.discovered, status: v.status })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const radialData = [{ name: 'Security Score', value: securityScore, fill: '#3b82f6' }];

  const stats = [
    { label: 'Security Score', value: `${securityScore}%`, icon: ShieldCheck, trend: '+2%', up: true },
    { label: 'Active Threats', value: String(activeThreats), icon: Warning, trend: '+1', up: false },
    { label: 'Open Vulns', value: String(openVulns), icon: Bug, trend: '-2', up: true },
    { label: 'High-Risk Assets', value: String(highRiskAssets), icon: Globe, trend: '0', up: null },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            Security Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · AI-native security posture monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/security/scans')}>
            <Scan size={14} className="mr-1" /> Run Scan
          </Button>
          <Button size="sm" onClick={() => navigate('/security/reports')}>
            <FileText size={14} className="mr-1" /> Generate Report
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {s.up === true && <TrendUp size={12} style={{ color: '#10b981' }} />}
                    {s.up === false && <TrendDown size={12} style={{ color: '#ef4444' }} />}
                    {s.up === null && <Minus size={12} style={{ color: 'hsl(var(--text-3))' }} />}
                    <span className="text-xs" style={{ color: s.up === true ? '#10b981' : s.up === false ? '#ef4444' : 'hsl(var(--text-3))' }}>
                      {s.trend} vs last month
                    </span>
                  </div>
                </div>
                <div className="p-2" style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                  <s.icon size={20} style={{ color: 'hsl(var(--brand))' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score + Trend */}
      <div className="grid grid-cols-3 gap-4">
        {/* Security Score Gauge */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Security Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div style={{ width: 180, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={radialData}>
                    <RadialBar dataKey="value" background={{ fill: 'hsl(var(--bg-muted))' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center -mt-6">
                <p className="text-4xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{securityScore}</p>
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                  Rating: <ScoreBadge value={securityScore} />
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 w-full text-center">
                {[{ label: 'Critical', val: criticalVulns, color: '#ef4444' }, { label: 'Active', val: activeThreats, color: '#f97316' }, { label: 'RT Active', val: activeExercises, color: '#8b5cf6' }].map(item => (
                  <div key={item.label}>
                    <p className="text-lg font-bold" style={{ color: item.color }}>{item.val}</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card className="col-span-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>6-Month Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis tick={{ fontSize: 11, fill: ct.axis }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Line type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} dot={false} name="Threats" />
                <Line type="monotone" dataKey="vulns" stroke="#f97316" strokeWidth={2} dot={false} name="Vulns" />
                <Line type="monotone" dataKey="score" stroke={ct.brand} strokeWidth={2} dot={false} name="Score" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Security Modules</h2>
        <div className="grid grid-cols-3 gap-3">
          {modules.map((mod) => (
            <Card
              key={mod.label}
              className="cursor-pointer transition-colors"
              style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderLeft: `3px solid ${mod.color}` }}
              onClick={() => navigate(mod.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5" style={{ background: `${mod.color}20` }}>
                      <mod.icon size={16} style={{ color: mod.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{mod.label}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{mod.desc}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-bold" style={{ color: mod.color }}>{mod.count}</span>
                    <ArrowRight size={14} style={{ color: 'hsl(var(--text-3))' }} />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge style={{ background: `${mod.color}20`, color: mod.color, border: `1px solid ${mod.color}40`, fontSize: 10 }}>
                    {mod.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Recent Security Events</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/security/threats')}>
              View All <ArrowRight size={12} className="ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {recentEvents.map((event, i) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 cursor-pointer"
                style={{
                  borderBottom: i < recentEvents.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-1.5 h-1.5"
                    style={{ background: severityColor(event.severity as any).bg, borderRadius: 0 }}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{event.title}</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{event.id} · {formatDate(event.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge style={{ background: severityColor(event.severity as any).bg, color: severityColor(event.severity as any).text, border: `1px solid ${severityColor(event.severity as any).border}`, fontSize: 10 }}>
                    {event.severity}
                  </Badge>
                  <Badge variant="outline" style={{ fontSize: 10 }}>{event.type}</Badge>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{event.status}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
