import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Clock, Warning, Brain, WarningCircle, Briefcase, FileText,
  Users, Database, StackSimple, ArrowRight, ChartLine, CheckCircle,
  TrendUp, TrendDown, Minus, ShieldCheck, Siren, Plus,
  Robot, Scales, UserCircleCheck, Eye, Lightning, PresentationChart, Exam,
  ArrowSquareOut, Sparkle, X, ArrowUp, ArrowDown, Timer,
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

// CISO View — frameworks with traffic-light thresholds and 30-day sparkline data
const CISO_FRAMEWORKS: {
  key: string;
  label: string;
  score: number;
  trend: number[]; // 30 daily scores
}[] = [
  { key: 'iso27001', label: 'ISO 27001', score: 92, trend: [85,86,86,87,87,88,88,88,89,89,89,90,90,90,90,91,91,91,91,91,92,92,92,92,92,92,92,92,92,92] },
  { key: 'soc2', label: 'SOC 2', score: 85, trend: [78,78,79,79,80,80,80,81,81,81,82,82,82,82,83,83,83,83,84,84,84,84,84,85,85,85,85,85,85,85] },
  { key: 'euaiact', label: 'EU AI Act', score: 65, trend: [55,55,56,56,57,57,58,58,58,59,59,60,60,61,61,62,62,62,63,63,63,64,64,64,64,65,65,65,65,65] },
  { key: 'nistrmf', label: 'NIST AI RMF', score: 71, trend: [62,62,63,63,63,64,64,64,65,65,66,66,66,67,67,67,68,68,68,69,69,69,70,70,70,70,71,71,71,71] },
  { key: 'gdpr', label: 'GDPR', score: 88, trend: [82,82,83,83,83,84,84,84,85,85,85,85,86,86,86,86,87,87,87,87,87,87,88,88,88,88,88,88,88,88] },
];

function cisoTrafficColor(score: number): string {
  if (score >= 85) return '#10b981'; // green
  if (score >= 65) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function cisoTrafficLabel(score: number): string {
  if (score >= 85) return 'GREEN';
  if (score >= 65) return 'AMBER';
  return 'RED';
}

/** Inline SVG sparkline from an array of numbers */
function Sparkline({ data, color, width = 100, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

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

type DateRange = '7D' | '30D' | '90D' | 'QoQ';

const AUDIT_DATE = new Date('2026-04-20');

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    function update() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Today'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);
  return timeLeft;
}

const DIGEST_TEMPLATES = [
  'Since last login: 2 new risks added, compliance improved 3%, 1 bias audit failed. 2 models need immediate review.',
  'Since last login: Shadow AI agent detected in Marketing, EU AI Act readiness at 65%. 3 controls need evidence refresh.',
  'Since last login: HITL queue has 3 pending reviews, AML false positive rate increased. 1 critical incident escalated.',
  'Since last login: 4 vendor DPAs approaching expiry, ISO 42001 audit due in 10 days. 5 open gaps are past deadline.',
];

export default function Overview() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const navigate = useNavigate();
  const [cisoView, setCisoView] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('30D');
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);
  const [digestIdx, setDigestIdx] = useState(0);
  const countdown = useCountdown(AUDIT_DATE);

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
    { label: 'Start Audit', desc: 'Launch a new compliance audit', icon: ShieldCheck, to: '/audits' },
    { label: 'Create Incident', desc: 'Report a new risk incident', icon: Lightning, to: '/risk/incidents' },
    { label: 'Run Assessment', desc: 'Conformity assessment', icon: Exam, to: '/conformity' },
    { label: 'Generate Report', desc: 'Board-ready reports', icon: PresentationChart, to: '/reporting' },
  ];

  const ALERT_ITEMS = [
    { id: 'A1', title: 'EU AI Act Annex IV documentation incomplete', severity: 'critical', link: '/compliance/gap-analysis' },
    { id: 'A2', title: 'MDL-001 fairness score below threshold (74%)', severity: 'critical', link: '/models/inventory/MDL-001' },
    { id: 'A3', title: 'Shadow AI agent AGT-010 active in Marketing', severity: 'high', link: '/agents/AGT-010' },
  ];

  const KPI_TRENDS: Record<string, { delta: number; dir: 'up' | 'down' | 'stable' }> = {
    'Open Risks': { delta: 2.1, dir: 'up' },
    'Active Models': { delta: 0, dir: 'stable' },
    'Critical Incidents': { delta: 1.0, dir: 'up' },
    'Active Policies': { delta: 5.3, dir: 'up' },
    'Vendors': { delta: 0, dir: 'stable' },
    'Datasets': { delta: 1, dir: 'up' },
    'Frameworks': { delta: 0, dir: 'stable' },
    'Open Tasks': { delta: 3.2, dir: 'down' },
    'Use Cases': { delta: 0, dir: 'stable' },
  };

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Skip to main content (WCAG) */}
      <a href="#main-content" style={{ position: 'absolute', left: -9999, top: 0, zIndex: 999, padding: '8px 14px', background: 'hsl(var(--brand))', color: '#fff', fontSize: 13 }}
        onFocus={e => { e.currentTarget.style.left = '0'; }} onBlur={e => { e.currentTarget.style.left = '-9999px'; }}>
        Skip to main content
      </a>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            GRC Executive Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · AI Governance, Risk & Compliance Overview
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range pills */}
          <div style={{ display: 'flex', gap: 2 }}>
            {(['7D', '30D', '90D', 'QoQ'] as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                aria-pressed={dateRange === r}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  border: '1px solid hsl(var(--border))',
                  cursor: 'pointer',
                  background: dateRange === r ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                  color: dateRange === r ? '#fff' : 'hsl(var(--text-3))',
                  transition: 'all 0.15s',
                }}
              >
                {r}
              </button>
            ))}
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
          <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0, fontSize: 12 }}>
            System Operational
          </Badge>
          <span className="text-xs self-center" style={{ color: 'hsl(var(--text-3))' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Alert Ribbon */}
      <div
        onClick={() => setAlertPanelOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: 'hsl(var(--s-er-bg))',
          border: '1px solid hsl(var(--s-er-br))',
          cursor: 'pointer',
        }}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setAlertPanelOpen(true)}
        aria-label="View critical items before audit"
      >
        <Siren size={16} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--s-er-tx))' }}>
          {ALERT_ITEMS.length} critical items require attention before next audit (Apr 20)
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto', background: 'hsl(var(--s-er-tx)/0.12)', padding: '3px 10px' }}>
          <Timer size={13} style={{ color: 'hsl(var(--s-er-tx))' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--s-er-tx))', fontFamily: 'monospace' }}>{countdown}</span>
        </div>
        <ArrowRight size={14} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
      </div>

      {/* Alert slide-out panel */}
      {alertPanelOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ flex: 1, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)' }} onClick={() => setAlertPanelOpen(false)} />
          <div style={{ width: 420, background: 'hsl(var(--bg-surface))', borderLeft: '1px solid hsl(var(--border))', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'hsl(var(--bg-surface))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Siren size={16} style={{ color: 'hsl(var(--s-er-tx))' }} />
                <span style={{ fontWeight: 700, color: 'hsl(var(--text-1))', fontSize: 14 }}>Critical Items</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--s-er-tx))' }}>Audit in {countdown}</span>
              </div>
              <button onClick={() => setAlertPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px 20px', flex: 1 }}>
              {ALERT_ITEMS.map((item, i) => {
                const sc = item.severity === 'critical'
                  ? { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', br: 'hsl(var(--s-er-br))' }
                  : { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', br: 'hsl(var(--s-wn-br))' };
                return (
                  <div key={item.id} style={{ marginBottom: 12, padding: 14, background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.br}`, borderRadius: 0, fontSize: 10 }}>{item.severity}</Badge>
                      <span style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>{item.id}</span>
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
            <div className="grid grid-cols-5 gap-4">
              {CISO_FRAMEWORKS.map(fw => {
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
                      <span className="text-2xl font-bold" style={{ color: dotColor }}>
                        {fw.score}%
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
                    <div className="mt-2">
                      <span className="text-[10px] block mb-1" style={{ color: 'hsl(var(--text-4))' }}>
                        30-day trend
                      </span>
                      <Sparkline data={fw.trend} color={dotColor} width={120} height={24} />
                    </div>
                  </div>
                );
              })}
            </div>
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

      {/* Executive AI Digest */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, background: 'hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkle size={16} style={{ color: 'hsl(var(--brand))' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 4 }}>
                AI Executive Digest
              </p>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.6 }}>
                {DIGEST_TEMPLATES[digestIdx]}
              </p>
            </div>
            <button
              onClick={() => setDigestIdx(i => (i + 1) % DIGEST_TEMPLATES.length)}
              aria-label="Refresh AI digest"
              style={{ flexShrink: 0, background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', padding: '5px 8px', color: 'hsl(var(--text-3))' }}
            >
              <ArrowRight size={13} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Tiles — responsive grid: 3 cols → 5 cols → 9 cols */}
      <div id="main-content" className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9">
        {kpis.map(k => {
          const trend = KPI_TRENDS[k.label];
          const isNegative = k.label === 'Open Risks' || k.label === 'Critical Incidents' || k.label === 'Open Tasks';
          const trendColor = !trend || trend.dir === 'stable' ? 'hsl(var(--text-4))'
            : (trend.dir === 'up' && isNegative) || (trend.dir === 'down' && !isNegative) ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))';
          return (
            <Link key={k.label} to={k.link} style={{ textDecoration: 'none' }}>
              <Card
                style={{
                  background: 'hsl(var(--bg-surface))',
                  border: '1px solid hsl(var(--border))',
                  borderLeft: `4px solid ${kpiBorderColor(k)}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = k.color; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderLeftColor = kpiBorderColor(k); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <k.icon size={20} style={{ color: k.color }} aria-hidden="true" />
                    <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{k.value}</p>
                  <p className="text-xs mt-0.5 mb-1" style={{ color: 'hsl(var(--text-3))' }}>{k.label}</p>
                  {trend && trend.dir !== 'stable' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {trend.dir === 'up' ? <ArrowUp size={10} style={{ color: trendColor }} /> : <ArrowDown size={10} style={{ color: trendColor }} />}
                      <span style={{ fontSize: 10, color: trendColor, fontWeight: 600 }}>{trend.delta}% vs last {dateRange}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
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
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.desc}</p>
                </div>
                <ArrowRight size={14} style={{ color: 'hsl(var(--text-4))', marginLeft: 'auto', flexShrink: 0 }} />
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
