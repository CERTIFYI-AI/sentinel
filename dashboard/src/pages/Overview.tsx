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
  ArrowSquareOut, Sparkle, X, ArrowUp, ArrowDown, Timer, Megaphone,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { severityColor, statusColor, formatDate } from '../data/seed';
import { useRisksData } from '../hooks/useRisksData';
import { useIncidentData } from '../hooks/useIncidentData';
import { useModelsData } from '../hooks/useModelsData';
import { useVendorsData } from '../hooks/useVendorsData';
import { useFrameworksData } from '../hooks/useFrameworksData';
import { useTaskData } from '../hooks/useTaskData';
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

  // Live Supabase data
  const { risks } = useRisksData();
  const { incidents } = useIncidentData();
  const { models } = useModelsData();
  const { vendors } = useVendorsData();
  const { frameworks } = useFrameworksData();
  const { tasks } = useTaskData();
  const chartTheme = useChartTheme();

  const openRisks = risks.filter((r: any) => r.status === 'open').length;
  const criticalRisks = risks.filter((r: any) => (r.risk_score || r.score || 0) >= 15).length;
  const activeModels = models.filter((m: any) => m.is_active || m.lifecycle_stage === 'production' || m.status === 'production').length;
  const criticalIncidents = incidents.filter((i: any) => i.severity === 'critical').length;
  const openIncidents = incidents.filter((i: any) => i.status !== 'resolved').length;
  const overdueGaps = tasks.filter((t: any) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;

  // Compliance posture
  const avgCompliance = frameworks.length > 0
    ? Math.round(frameworks.reduce((s: number, f: any) => s + (f.compliance_score || f.complianceScore || 0), 0) / frameworks.length)
    : 0;
  const securityScore = 79;

  const kpis = [
    { label: 'Open Tasks', value: overdueGaps + 5, icon: Clock, color: ragColor(overdueGaps + 5, 'risk'), link: '/compliance/gap-analysis' },
    { label: 'Open Risks', value: openRisks, icon: Warning, color: ragColor(openRisks, 'risk'), link: '/risk', ragType: 'risk' as const },
    { label: 'Active Models', value: activeModels, icon: Brain, color: '#8b5cf6', link: '/models/inventory' },
    { label: 'Critical Incidents', value: criticalIncidents, icon: WarningCircle, color: ragColor(criticalIncidents, 'incident'), link: '/risk/incidents', ragType: 'incident' as const },
    { label: 'Vendors', value: vendors.length, icon: Briefcase, color: '#06b6d4', link: '/vendors' },
    { label: 'Frameworks', value: frameworks.length, icon: StackSimple, color: '#6366f1', link: '/frameworks' },
  ];

  // RAG border color for KPI tiles
  function kpiBorderColor(k: typeof kpis[0]): string {
    if (k.label === 'Critical Incidents') return criticalIncidents >= 2 ? '#ef4444' : criticalIncidents >= 1 ? '#f97316' : '#10b981';
    if (k.label === 'Open Risks') return openRisks >= 10 ? '#f97316' : '#10b981';
    if (k.label === 'Open Tasks') return (overdueGaps + 5) >= 5 ? '#f97316' : '#10b981';
    return 'hsl(var(--border))';
  }

  const frameworkChartData = frameworks.map((f: any) => ({
    name: f.name?.includes('42001') ? 'ISO 42001' :
          f.name?.includes('27001') ? 'ISO 27001' :
          f.name?.includes('SOC') ? 'SOC 2' :
          f.name?.includes('EU AI') ? 'EU AI Act' :
          f.name?.includes('NIST') ? 'NIST RMF' :
          f.name?.includes('OWASP') ? 'OWASP LLM' :
          (f.name || '').replace('ISO/IEC ', '').replace('OWASP ', '').split(' ')[0],
    score: f.compliance_score || f.complianceScore || 0,
    fullName: f.name,
  }));

  const recentActivity: any[] = [];
  const overdueGapItems = tasks.filter((t: any) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).slice(0, 5);

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

  const REGULATORY_SCORECARD = [
    { label: 'EU AI Act', score: 65, target: 80, trend: 'up' as const, link: '/ai-risk-tiering' },
    { label: 'ISO 42001', score: 72, target: 90, trend: 'up' as const, link: '/frameworks' },
    { label: 'NIST AI RMF', score: 71, target: 85, trend: 'stable' as const, link: '/framework-mapping' },
    { label: 'GDPR', score: 88, target: 95, trend: 'up' as const, link: '/dpia' },
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
      <a href="#main-content" style={{ position: 'absolute', left: -9999, top: 0, zIndex: 999, padding: '8px 14px', background: '#DC2626', color: '#fff', fontSize: 13 }}
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
          background: '#FEF2F2', borderLeft: '4px solid #EF4444',
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
              {(frameworks.length > 0 ? frameworks : CISO_FRAMEWORKS).map((fw: any) => {
                // Normalize live framework data to CISO display format
                const fwScore = fw.compliance_score || fw.complianceScore || fw.score || 0;
                const fwLabel = fw.label || fw.name || '';
                const fwKey = fw.key || fw.id || fwLabel;
                const fwTrend: number[] = fw.trend || Array.from({length:30}, (_,i) => Math.max(0, fwScore - 5 + Math.round(i * 5/29)));
                const cisoFw = { key: fwKey, label: fwLabel, score: fwScore, trend: fwTrend };
                const fw2 = cisoFw; // shadow fw for below code
                const dotColor = cisoTrafficColor(fw2.score);
                const ragLabel = cisoTrafficLabel(fw2.score);
                return (
                  <div
                    key={fw2.key}
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
                        {fw2.label}
                      </span>
                    </div>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-2xl font-bold" style={{ color: dotColor }}>
                        {fw2.score}%
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
                      <Sparkline data={fw2.trend} color={dotColor} width={120} height={24} />
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
                <span className="text-xs" style={{ color: '#D97706' }}>Open Risks</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-[90px] h-[90px]">
                  <span className="text-3xl font-bold" style={{ color: ragColor(criticalIncidents, 'incident') }}>{criticalIncidents}</span>
                </div>
                <span className="text-xs" style={{ color: '#DC2626' }}>Critical Incidents</span>
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
                style={{ borderRadius: 0, background: '#DC2626', color: '#fff' }}
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
              const metricColor = k.label === 'Critical Incidents' ? 'text-red-600' : k.label === 'Open Risks' ? 'text-amber-600' : k.label === 'Compliance Score' || k.label === 'Security Score' ? 'text-emerald-600' : '';
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

      {/* ═══════ REGULATORY SCORECARD ═══════ */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Regulatory Compliance Scorecard
          </CardTitle>
          <span className="text-xs px-2 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0 }}>EU AI Act · ISO 42001 · NIST AI RMF · GDPR</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {REGULATORY_SCORECARD.map(rs => {
              const pct = rs.score;
              const barColor = pct >= 85 ? 'hsl(var(--s-ok-tx))' : pct >= 70 ? 'hsl(var(--brand))' : 'hsl(var(--s-er-tx))';
              const gapColor = pct >= 85 ? 'hsl(var(--s-ok-bg))' : pct >= 70 ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-er-bg))';
              const gapPct = rs.target - pct;
              return (
                <Link key={rs.label} to={rs.link} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{rs.label}</p>
                      <p className="text-lg font-bold" style={{ color: barColor }}>{pct}%</p>
                    </div>
                    <div className="w-full h-2 bg-[hsl(var(--bg-raised))]">
                      <div className="h-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'hsl(var(--text-4))' }}>Target: {rs.target}%</span>
                      <span className="px-1.5 py-0.5 font-medium" style={{ background: gapColor, color: pct >= 85 ? 'hsl(var(--s-ok-tx))' : pct >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))', borderRadius: 0 }}>
                        {gapPct > 0 ? `${gapPct}% gap` : '✓ Met'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
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

      {/* Last 7 AI Incidents */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Recent AI Incidents
          </CardTitle>
          <Link to="/incidents">
            <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
              View All <ArrowRight size={12} className="ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Title', 'Type', 'Severity', 'Status', 'Agent', 'Reported'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 7).map(inc => {
                const sc = severityColor(inc.severity);
                const stColor = inc.status === 'open' ? 'hsl(var(--s-er-tx))' : inc.status === 'investigating' ? 'hsl(var(--s-wn-tx))' : inc.status === 'resolved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))';
                const stBg = inc.status === 'open' ? 'hsl(0 72% 51% / 0.10)' : inc.status === 'investigating' ? 'hsl(45 93% 47% / 0.10)' : inc.status === 'resolved' ? 'hsl(142 71% 45% / 0.10)' : 'hsl(var(--bg-muted))';
                return (
                  <tr key={inc.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{inc.id}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium line-clamp-1" style={{ color: 'hsl(var(--text-1))', maxWidth: 260, display: 'block' }}>{inc.title}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{inc.category}</td>
                    <td className="px-4 py-2.5">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{inc.severity}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge style={{ background: stBg, color: stColor, borderRadius: 0, fontSize: 10, textTransform: 'capitalize' }}>{inc.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{inc.linkedModel ?? inc.linked_model ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(inc.reportedDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {/* ── SLA Countdown Timers ─────────────────────────────────────────────── */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            SLA Countdown — Open Remediation Items
          </CardTitle>
          <Link to="/remediation">
            <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }}>
              View All <ArrowRight size={12} className="ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Item', 'Category', 'SLA Deadline', 'Time Remaining', 'Owner', 'Status'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'REM-001', item: 'Bias remediation — Loan Model Gender gap', cat: 'Bias Audit', deadline: '2026-04-12', owner: 'Data Science', hoursLeft: 48, status: 'In Progress' },
                { id: 'REM-002', item: 'GDPR Art.22 explanation document update', cat: 'Compliance', deadline: '2026-04-15', owner: 'Compliance', hoursLeft: 120, status: 'Not Started' },
                { id: 'REM-003', item: 'Kill switch post-mortem KSE-2026-012', cat: 'Incident', deadline: '2026-04-10', owner: 'CISO', hoursLeft: 4, status: 'Overdue' },
                { id: 'REM-004', item: 'Model revalidation after data drift alert', cat: 'Model Risk', deadline: '2026-04-18', owner: 'MLOps', hoursLeft: 192, status: 'In Progress' },
                { id: 'REM-005', item: 'EU AI Act Art.9 risk management update', cat: 'Regulatory', deadline: '2026-04-08', owner: 'Legal', hoursLeft: -24, status: 'Overdue' },
              ].map(item => {
                const pct = Math.max(0, Math.min(100, (item.hoursLeft / 192) * 100));
                const isOverdue = item.hoursLeft < 0;
                const isUrgent = item.hoursLeft >= 0 && item.hoursLeft < 72;
                const barColor = isOverdue ? 'hsl(0 72% 51%)' : isUrgent ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)';
                const timeLabel = isOverdue
                  ? `${Math.abs(item.hoursLeft)}h overdue`
                  : item.hoursLeft < 24
                    ? `${item.hoursLeft}h left`
                    : `${Math.floor(item.hoursLeft / 24)}d ${item.hoursLeft % 24}h left`;
                return (
                  <tr key={item.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{item.id}</td>
                    <td className="p-3 text-xs font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 260 }}>
                      <span className="line-clamp-2">{item.item}</span>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{item.cat}</td>
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{item.deadline}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5" style={{ background: 'hsl(var(--border))' }}>
                          <div className="h-full" style={{ width: `${isOverdue ? 100 : pct}%`, background: barColor }} />
                        </div>
                        <span className="text-xs font-bold whitespace-nowrap" style={{ color: barColor }}>{timeLabel}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{item.owner}</td>
                    <td className="p-3">
                      <Badge style={{
                        background: item.status === 'Overdue' ? 'hsl(0 72% 51% / 0.12)' : item.status === 'In Progress' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(var(--s-nt-bg))',
                        color: item.status === 'Overdue' ? 'hsl(var(--destructive))' : item.status === 'In Progress' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))',
                        borderRadius: 0, fontSize: 10,
                      }}>{item.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Cross-Module Dependency Graph ─────────────────────────────────── */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Cross-Module Dependency Map — MDL-001 Loan Approval v3.0
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="relative" style={{ height: 280 }}>
            <svg viewBox="0 0 800 260" style={{ width: '100%', height: '100%' }}>
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="hsl(220 90% 56% / 0.5)" />
                </marker>
                <marker id="arrowhead-warn" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="hsl(45 93% 47% / 0.8)" />
                </marker>
                <marker id="arrowhead-err" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="hsl(0 72% 51% / 0.8)" />
                </marker>
              </defs>
              {[
                { x1: 180, y1: 130, x2: 300, y2: 75, type: 'ok' },
                { x1: 180, y1: 130, x2: 300, y2: 130, type: 'warn' },
                { x1: 180, y1: 130, x2: 300, y2: 185, type: 'ok' },
                { x1: 500, y1: 75, x2: 620, y2: 75, type: 'ok' },
                { x1: 500, y1: 130, x2: 620, y2: 130, type: 'err' },
                { x1: 500, y1: 185, x2: 620, y2: 185, type: 'ok' },
              ].map((line, i) => (
                <line key={i} x1={line.x1} y1={line.y1} x2={line.x2 - 60} y2={line.y2}
                  stroke={line.type === 'ok' ? 'hsl(220 90% 56% / 0.4)' : line.type === 'warn' ? 'hsl(45 93% 47% / 0.6)' : 'hsl(0 72% 51% / 0.6)'}
                  strokeWidth="1.5" strokeDasharray={line.type !== 'ok' ? '4,3' : '0'}
                  markerEnd={`url(#arrowhead${line.type === 'warn' ? '-warn' : line.type === 'err' ? '-err' : ''})`} />
              ))}
              {[
                { x: 80, y: 107, w: 100, h: 46, label: 'MDL-001', sub: 'Loan Approval v3.0', color: 'hsl(var(--brand))' },
                { x: 300, y: 52, w: 200, h: 40, label: 'BA-003 Bias Audit', sub: 'Failed (Gender: 0.74)', color: 'hsl(0 72% 51%)' },
                { x: 300, y: 107, w: 200, h: 40, label: 'EXP-002 Explainability', sub: 'Pending Review', color: 'hsl(45 93% 47%)' },
                { x: 300, y: 163, w: 200, h: 40, label: 'UC-001 Use Case', sub: 'In Progress', color: 'hsl(var(--brand))' },
                { x: 620, y: 52, w: 140, h: 40, label: 'EU AI Act Art.10', sub: 'Gap Identified', color: 'hsl(0 72% 51%)' },
                { x: 620, y: 107, w: 140, h: 40, label: 'Kill Switch', sub: 'Trigger Active', color: 'hsl(0 72% 51%)' },
                { x: 620, y: 163, w: 140, h: 40, label: 'ECOA Compliance', sub: 'Compliant', color: 'hsl(142 71% 45%)' },
              ].map((node) => (
                <g key={node.label}>
                  <rect x={node.x} y={node.y} width={node.w} height={node.h}
                    fill="hsl(var(--bg-raised))" stroke={node.color} strokeWidth="1.5" />
                  <text x={node.x + node.w / 2} y={node.y + 16} textAnchor="middle" fontSize="10" fill={node.color} fontWeight="600">{node.label}</text>
                  <text x={node.x + node.w / 2} y={node.y + 30} textAnchor="middle" fontSize="9" fill="hsl(var(--text-4))">{node.sub}</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="flex items-center gap-6 text-[10px] mt-2 px-2" style={{ color: 'hsl(var(--text-4))' }}>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5" style={{ background: 'hsl(220 90% 56% / 0.6)' }} />Active dependency</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: 'hsl(45 93% 47% / 0.8)' }} />Warning dependency</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: 'hsl(0 72% 51% / 0.8)' }} />Critical / blocking dependency</span>
          </div>
        </CardContent>
      </Card>

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
              {risks.filter((r: any) => r.status === 'open').slice(0, 5).map(r => {
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
                      <span className="text-sm font-bold" style={{ color: (r.score || r.risk_score || 0) >= 16 ? '#ef4444' : (r.score || r.risk_score || 0) >= 10 ? '#f97316' : 'hsl(var(--text-1))' }}>
                        {r.score || r.risk_score || 0}
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
