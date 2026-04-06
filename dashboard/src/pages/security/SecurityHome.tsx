import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ShieldWarning, Bug, Crosshair, Sword, Scan,
  Lightning, Warning, Clock, ArrowRight, Fire, Eye, Globe,
  Lock, Target, CaretRight,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { THREATS, VULNERABILITIES, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Security Score Data ───────────────────────────────────────────────────────

const SECURITY_SCORES = [
  { module: 'Vulnerability', score: 72, color: 'hsl(45 93% 47%)' },
  { module: 'Threat Intel', score: 68, color: 'hsl(25 95% 53%)' },
  { module: 'Red Team', score: 61, color: 'hsl(0 72% 51%)' },
  { module: 'Attack Surface', score: 75, color: 'hsl(45 93% 47%)' },
  { module: 'Access Control', score: 79, color: 'hsl(142 71% 45%)' },
];

// ── Metric Tiles ──────────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: string;
  variant: 'ok' | 'warn' | 'error' | 'info';
  icon: React.ReactNode;
  sub?: string;
}

function MetricTile({ label, value, variant, icon, sub }: MetricTileProps) {
  const variantStyles = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', border: 'hsl(142 71% 45% / 0.3)', color: 'hsl(142 71% 45%)' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', border: 'hsl(45 93% 47% / 0.3)', color: 'hsl(45 93% 47%)' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', border: 'hsl(0 72% 51% / 0.3)', color: 'hsl(0 72% 51%)' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', border: 'hsl(220 90% 56% / 0.3)', color: 'hsl(220 90% 56%)' },
  };
  const s = variantStyles[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Sub-Navigation Cards ──────────────────────────────────────────────────────

interface SubNavCardProps {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  statusLabel: string;
  statusVariant: string;
  count: number;
  countLabel: string;
}

function SubNavCard({ title, description, path, icon, statusLabel, statusVariant, count, countLabel }: SubNavCardProps) {
  const navigate = useNavigate();
  const sc = statusColor(statusVariant);
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md group"
      style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}
      onClick={() => navigate(path)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{title}</span>
          </div>
          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
            {statusLabel}
          </Badge>
        </div>
        <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-4))' }}>{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>
            <span className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>{count}</span> {countLabel}
          </span>
          <CaretRight size={14} className="group-hover:translate-x-1 transition-transform" style={{ color: 'hsl(var(--brand))' }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Recent Security Events ────────────────────────────────────────────────────

function getRecentEvents() {
  const threatEvents = THREATS.slice(0, 3).map(t => ({
    id: t.id,
    icon: <Lightning size={14} weight="fill" style={{ color: severityColor(t.severity).text }} />,
    severity: t.severity,
    title: t.name,
    target: t.affectedModels.length > 0 ? t.affectedModels.join(', ') : 'Platform',
    date: t.detected,
    type: 'Threat' as const,
  }));
  const vulnEvents = VULNERABILITIES.slice(0, 3).map(v => ({
    id: v.id,
    icon: <Bug size={14} weight="fill" style={{ color: severityColor(v.severity).text }} />,
    severity: v.severity,
    title: v.title,
    target: v.component,
    date: v.discovered,
    type: 'Vulnerability' as const,
  }));
  return [...threatEvents, ...vulnEvents]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{
      background: 'hsl(var(--bg-surface))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 0,
      color: 'hsl(var(--text-1))',
    }}>
      <p className="font-semibold mb-1">{label}</p>
      <p>Score: <span className="font-bold">{payload[0].value}</span>/100</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SecurityHome() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const recentEvents = getRecentEvents();

  const subNavItems: SubNavCardProps[] = [
    {
      title: 'Threat Intelligence',
      description: 'Monitor and investigate active threats, attack vectors, and MITRE ATT&CK mappings.',
      path: '/security/threats',
      icon: <Lightning size={16} weight="fill" style={{ color: 'hsl(0 72% 51%)' }} />,
      statusLabel: '3 Active',
      statusVariant: 'open',
      count: 6,
      countLabel: 'tracked threats',
    },
    {
      title: 'Vulnerability Tracker',
      description: 'Track CVEs, CVSS scores, patch status, and remediation timelines.',
      path: '/security/vulnerabilities',
      icon: <Bug size={16} weight="fill" style={{ color: 'hsl(25 95% 53%)' }} />,
      statusLabel: '2 Open',
      statusVariant: 'in_review',
      count: 6,
      countLabel: 'vulnerabilities',
    },
    {
      title: 'Red Team Lab',
      description: 'Adversarial testing campaigns, jailbreak tests, and attack simulations.',
      path: '/security/red-team',
      icon: <Sword size={16} weight="fill" style={{ color: 'hsl(0 72% 51%)' }} />,
      statusLabel: '1 Active',
      statusVariant: 'running',
      count: 4,
      countLabel: 'campaigns',
    },
    {
      title: 'Attack Surface',
      description: 'External and internal asset exposure monitoring and risk assessment.',
      path: '/security/attack-surface',
      icon: <Globe size={16} style={{ color: 'hsl(45 93% 47%)' }} />,
      statusLabel: '3 Exposed',
      statusVariant: 'in_review',
      count: 8,
      countLabel: 'assets monitored',
    },
    {
      title: 'Security Scanner',
      description: 'Automated vulnerability scanning, compliance checks, and policy enforcement.',
      path: '/security/scanner',
      icon: <Scan size={16} style={{ color: 'hsl(var(--brand))' }} />,
      statusLabel: 'Operational',
      statusVariant: 'active',
      count: 24,
      countLabel: 'scans today',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Security Hub</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} — Unified security posture, threat intelligence, and vulnerability management
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          <Clock size={13} />
          <span>Last scan: {formatDate('2026-04-05')} at 23:45 UTC</span>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile
          label="Overall Security Score"
          value="79%"
          variant="warn"
          icon={<ShieldWarning size={16} weight="fill" style={{ color: 'hsl(45 93% 47%)' }} />}
          sub="Target: 85%"
        />
        <MetricTile
          label="Active Threats"
          value="3"
          variant="error"
          icon={<Fire size={16} weight="fill" style={{ color: 'hsl(0 72% 51%)' }} />}
          sub="2 critical, 1 high"
        />
        <MetricTile
          label="Open Vulnerabilities"
          value="5"
          variant="warn"
          icon={<Bug size={16} weight="fill" style={{ color: 'hsl(45 93% 47%)' }} />}
          sub="1 critical CVSS 9.1"
        />
        <MetricTile
          label="Scans Today"
          value="24"
          variant="ok"
          icon={<Scan size={16} style={{ color: 'hsl(142 71% 45%)' }} />}
          sub="All passed"
        />
      </div>

      {/* Security Score Chart + Recent Events */}
      <div className="grid grid-cols-3 gap-4">
        {/* Security Score per Module Chart */}
        <Card className="col-span-2" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Security Score per Module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={SECURITY_SCORES} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis
                  dataKey="module"
                  tick={{ fill: ct.axis, fontSize: 11 }}
                  axisLine={{ stroke: ct.grid }}
                  tickLine={false}
                />
                <YAxis
                  label={{ value: 'Security Score (0-100)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }}
                  tick={{ fill: ct.axis, fontSize: 11 }}
                  axisLine={{ stroke: ct.grid }}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <ReTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="score" maxBarSize={48}>
                  {SECURITY_SCORES.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Security Events Feed */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Recent Security Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {recentEvents.map(ev => {
                const sc = severityColor(ev.severity);
                const daysAgo = Math.floor((Date.now() - new Date(ev.date).getTime()) / 86400000);
                return (
                  <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="mt-0.5 p-1" style={{ background: sc.bg, borderRadius: 0 }}>
                      {ev.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 9, padding: '1px 5px' }}>
                          {ev.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{ev.type}</span>
                      </div>
                      <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{ev.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                          <Target size={10} className="inline mr-1" />{ev.target}
                        </span>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{daysAgo}d ago</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Navigation Cards */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Security Modules</h2>
        <div className="grid grid-cols-5 gap-4">
          {subNavItems.map(item => (
            <SubNavCard key={item.path} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
