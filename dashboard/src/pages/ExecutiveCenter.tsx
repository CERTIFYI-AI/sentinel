// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  ShieldCheck, Warning, ArrowRight, Brain, Scales, TrendUp, TrendDown,
  Minus, Clock, Globe, Robot, FileText, Lightning, CheckCircle,
  ArrowSquareOut, Siren, Users, PresentationChart, Buildings, Info,
  Star, ChartLine, Money, Calendar, Gauge,
} from '@phosphor-icons/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, ComposedChart,
  Bar, Line, Legend,
} from 'recharts';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';
import { MODELS, RISKS, FRAMEWORKS, INCIDENTS } from '../data/seed';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCardRow } from '../components/ui/StatCardRow';
import type { StatCardRowItem } from '../components/ui/StatCardRow';

// ── Derived Metrics ────────────────────────────────────────────────────────────
const prodModels = MODELS.filter(m => m.status === 'production').length;
const criticalRisks = RISKS.filter(r => r.severity === 'critical').length;
const avgCompliance = Math.round(FRAMEWORKS.reduce((s, f) => s + f.complianceScore, 0) / FRAMEWORKS.length);
const openIncidents = INCIDENTS.filter(i => i.status !== 'resolved').length;
const highRiskModels = MODELS.filter(m => m.riskTier === 'high').length;

// AI Risk Score = weighted composite
const aiRiskScore = Math.round(
  avgCompliance * 0.35 +
  (100 - (criticalRisks / RISKS.length) * 100) * 0.30 +
  (100 - (openIncidents / Math.max(INCIDENTS.length, 1)) * 100) * 0.20 +
  (100 - (highRiskModels / Math.max(prodModels, 1)) * 100) * 0.15
);

const RISK_SCORE_TREND = [
  { month: 'Oct', score: 58, target: 70 },
  { month: 'Nov', score: 61, target: 70 },
  { month: 'Dec', score: 63, target: 70 },
  { month: 'Jan', score: 67, target: 72 },
  { month: 'Feb', score: 70, target: 72 },
  { month: 'Mar', score: 72, target: 75 },
  { month: 'Apr', score: aiRiskScore, target: 75 },
];

const FRAMEWORK_STATUS = [
  { name: 'EU AI Act', score: 65, maxFine: '$35M or 3% revenue', deadline: '2026-08-02', status: 'amber' },
  { name: 'GDPR', score: 88, maxFine: '€20M or 4% revenue', deadline: 'Effective', status: 'green' },
  { name: 'ISO 27001', score: 92, maxFine: 'Contract risk', deadline: 'Certified', status: 'green' },
  { name: 'NIST AI RMF', score: 71, maxFine: 'Regulatory action', deadline: '2026-09-30', status: 'amber' },
  { name: 'SOC 2 Type II', score: 85, maxFine: 'Customer churn', deadline: 'Ongoing', status: 'green' },
];

const EXECUTIVE_ACTIONS = [
  { id: 1, urgency: 'critical', title: 'EU AI Act — Art. 9 Risk Management gap on CreditRisk-XGB', deadline: '112 days', owner: 'Maria Santos', impact: '$35M fine exposure', link: '/reg-velocity' },
  { id: 2, urgency: 'high', title: 'Bias violation unresolved on MDL-001 — ECOA Reg B risk', deadline: '30 days', owner: 'Raj Gupta', impact: '$2.4M class action exposure', link: '/bias-audits' },
  { id: 3, urgency: 'high', title: 'FraudDetect-LSTM model drift — human oversight protocol needed', deadline: '14 days', owner: 'Maria Santos', impact: 'Operational risk', link: '/models/inventory' },
  { id: 4, urgency: 'medium', title: 'NIST AI RMF GOVERN 6.1 policy gap — 3 controls missing', deadline: '60 days', owner: 'James Patel', impact: 'Regulatory readiness', link: '/compliance-dashboard' },
  { id: 5, urgency: 'medium', title: 'Q2 Model Risk Committee approval — 2 models awaiting vote', deadline: '18 days', owner: 'Sarah Chen', impact: 'Governance obligation', link: '/mrc' },
];

const MODEL_PORTFOLIO = MODELS.map(m => ({
  name: m.name.split('-')[0].replace(' ', '\n'),
  risk: m.riskTier === 'high' ? 3 : m.riskTier === 'limited' ? 2 : 1,
  fairness: m.fairnessScore,
  drift: m.driftStatus === 'critical' ? 'red' : m.driftStatus === 'warning' ? 'amber' : 'green',
  compliance: Math.round(m.complianceMapping.filter(c => c.status === 'Compliant').length / m.complianceMapping.length * 100),
}));

const BOARD_METRICS = [
  { quarter: 'Q2 \'25', riskScore: 54, compliance: 68, incidents: 5 },
  { quarter: 'Q3 \'25', riskScore: 60, compliance: 71, incidents: 4 },
  { quarter: 'Q4 \'25', riskScore: 65, compliance: 74, incidents: 3 },
  { quarter: 'Q1 \'26', riskScore: aiRiskScore, compliance: avgCompliance, incidents: openIncidents },
];

function scoreColor(s: number) {
  if (s >= 80) return 'hsl(var(--s-ok-tx))';
  if (s >= 65) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--destructive))';
}
function scoreBg(s: number) {
  if (s >= 80) return 'hsl(var(--s-ok-bg))';
  if (s >= 65) return 'hsl(var(--s-wn-bg))';
  return 'hsl(var(--s-er-bg))';
}
function urgencyStyle(u: string) {
  if (u === 'critical') return { border: 'hsl(var(--destructive) / 0.5)', bg: 'hsl(var(--s-er-bg) / 0.5)', dot: 'hsl(var(--destructive))' };
  if (u === 'high') return { border: 'hsl(var(--s-wn-br))', bg: 'hsl(var(--s-wn-bg) / 0.5)', dot: 'hsl(var(--s-wn-tx))' };
  return { border: 'hsl(var(--border))', bg: 'hsl(var(--bg-surface))', dot: 'hsl(var(--text-4))' };
}

// ── Animated Score Ring ────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let frame = 0;
    const target = score;
    const step = () => {
      frame++;
      setDisplayed(Math.min(Math.round((frame / 60) * target), target));
      if (frame < 60) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [score]);

  const r = 70;
  const circ = 2 * Math.PI * r;
  const filled = (displayed / 100) * circ;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle cx={90} cy={90} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={12} />
        <circle cx={90} cy={90} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="butt"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dasharray 0.05s' }} />
        <text x={90} y={82} textAnchor="middle" fontSize={38} fontWeight={700} fill={color}>{displayed}</text>
        <text x={90} y={104} textAnchor="middle" fontSize={11} fill="hsl(var(--text-4))">AI RISK SCORE</text>
        <text x={90} y={120} textAnchor="middle" fontSize={9} fill="hsl(var(--text-4))">+{score - 58} vs. 6 months ago</text>
      </svg>
      <p className="text-xs font-semibold mt-1" style={{ color }}>
        {score >= 80 ? 'STRONG' : score >= 65 ? 'PROGRESSING' : 'NEEDS ATTENTION'}
      </p>
    </div>
  );
}

// ── Live Pulse Ticker ──────────────────────────────────────────────────────────
function PulseTicker({ fineExposure, score }: { fineExposure: number; score: number }) {
  const [tick, setTick] = useState(0);
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => { setTick(t => t + 1); setTime(new Date()); }, 8000);
    return () => clearInterval(id);
  }, []);
  const msgs = [
    `Live risk score: ${score}/100 — ${score >= 80 ? 'STRONG' : score >= 65 ? 'PROGRESSING' : 'NEEDS ATTENTION'}`,
    `Maximum fine exposure: $${fineExposure}M across 5 regulatory frameworks`,
    `Next MRC meeting: Apr 25, 2026 — 2 models awaiting vote`,
    `EU AI Act compliance deadline: Aug 2, 2026 — 112 days remaining`,
    `Q1 2026: Compliance score improved +${score - 65}pts from baseline`,
  ];
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-[10px]"
      style={{ border: '1px solid hsl(var(--brand) / 0.25)', background: 'hsl(var(--brand) / 0.04)' }}>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--s-ok-tx))' }} />
        <span className="font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--brand))' }}>LIVE</span>
      </div>
      <span style={{ color: 'hsl(var(--text-3))' }}>{msgs[tick % msgs.length]}</span>
      <span className="ml-auto flex-shrink-0" style={{ color: 'hsl(var(--text-4))' }}>
        Updated {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label, ct }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-2 text-xs" style={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText }}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
}

export default function ExecutiveCenter() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const fineExposure = 35 + 20 + 2.4; // EU AI Act + GDPR + ECOA risk floor

  const execKpiCards: StatCardRowItem[] = [
    {
      label: 'AI Risk Score',
      value: `${aiRiskScore}/100`,
      icon: <Gauge size={18} style={{ color: 'hsl(var(--brand))' }} />,
      delta: `+${aiRiskScore - 58} vs 6 months ago`,
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
    {
      label: 'Fine Exposure',
      value: `$${fineExposure}M+`,
      icon: <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      delta: 'Active regulatory risk',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'Framework Compliance',
      value: `${avgCompliance}%`,
      icon: <ShieldCheck size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />,
      delta: `${FRAMEWORKS.length} frameworks`,
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
    {
      label: 'Critical Risks Open',
      value: String(criticalRisks),
      icon: <Siren size={18} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />,
      delta: `${RISKS.length} total tracked`,
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Page Header */}
        <PageHeader
          title="Executive Center"
          subtitle="Board-level risk and compliance posture"
          breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Executive Center' }]}
          badge={
            <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>
              BOARD · CXO VIEW
            </Badge>
          }
          actions={
            <div className="flex gap-2">
              <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => toast.success('Board pack PDF generating…')}>
                <FileText size={13} className="mr-1.5" />Export Board Pack
              </Button>
              <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => navigate('/reporting')}>
                <PresentationChart size={13} className="mr-1.5" />Full Report
              </Button>
            </div>
          }
        />

        {/* Executive KPI Row */}
        <StatCardRow cards={execKpiCards} />

        {/* Live Pulse Ticker */}
        <PulseTicker fineExposure={fineExposure} score={aiRiskScore} />

        {/* KPI strip replaced by StatCardRow above */}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Risk Posture</TabsTrigger>
            <TabsTrigger value="actions" style={{ borderRadius: 0 }}>
              Actions Required
              <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5" style={{ background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
                {EXECUTIVE_ACTIONS.filter(a => a.urgency === 'critical' || a.urgency === 'high').length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="frameworks" style={{ borderRadius: 0 }}>Regulatory Exposure</TabsTrigger>
            <TabsTrigger value="portfolio" style={{ borderRadius: 0 }}>Model Portfolio</TabsTrigger>
            <TabsTrigger value="board" style={{ borderRadius: 0 }}>Board Trend</TabsTrigger>
            <TabsTrigger value="heatmap" style={{ borderRadius: 0 }}>Risk Heat Map</TabsTrigger>
          </TabsList>

          {/* ── Risk Posture ── */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <ScoreRing score={aiRiskScore} />
                  <div className="w-full mt-4 space-y-2">
                    {[
                      { label: 'Compliance Health', v: avgCompliance },
                      { label: 'Risk Mitigation Rate', v: 100 - Math.round((criticalRisks / RISKS.length) * 100) },
                      { label: 'Incident Resolution', v: 100 - Math.round((openIncidents / Math.max(INCIDENTS.length, 1)) * 100) },
                      { label: 'Model Risk Coverage', v: 100 - Math.round((highRiskModels / Math.max(prodModels, 1)) * 100) },
                    ].map((row, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span style={{ color: 'hsl(var(--text-3))' }}>{row.label}</span>
                          <span style={{ color: scoreColor(row.v) }}>{row.v}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                          <div style={{ width: `${row.v}%`, height: '100%', background: scoreColor(row.v) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>AI Risk Score — 7-Month Trajectory vs. Target</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={RISK_SCORE_TREND}>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--brand))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--brand))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="month" tick={{ fill: ct.axis, fontSize: 11 }} />
                      <YAxis domain={[40, 100]} tick={{ fill: ct.axis, fontSize: 11 }} />
                      <RTooltip content={<ChartTip ct={ct} />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="score" name="AI Risk Score" stroke="hsl(var(--brand))" fill="url(#scoreGrad)" strokeWidth={2.5} dot={{ fill: 'hsl(var(--brand))', r: 4 }} />
                      <Line type="monotone" dataKey="target" name="Target" stroke="hsl(var(--s-ok-tx))" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-3 p-2.5 text-xs" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                    <span style={{ color: 'hsl(var(--brand))' }}>+{aiRiskScore - 58} point improvement</span>
                    <span style={{ color: 'hsl(var(--text-3))' }}> in 6 months. EU AI Act readiness is the primary constraint to reaching the 80+ "Strong" threshold.
                    Closing the 3 critical Art. 9 gaps would add an estimated +6 points to the overall score.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Actions Required ── */}
          <TabsContent value="actions" className="mt-4">
            <div className="space-y-3">
              {EXECUTIVE_ACTIONS.map(action => {
                const s = urgencyStyle(action.urgency);
                return (
                  <div key={action.id} className="p-4" style={{ border: `1px solid ${s.border}`, background: s.bg }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: s.dot }} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5" style={{ background: s.dot, color: 'hsl(var(--bg-surface))' }}>
                              {action.urgency}
                            </span>
                            <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{action.title}</p>
                          </div>
                          <div className="flex items-center gap-4 text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                            <span className="flex items-center gap-1"><Clock size={9} />Deadline: {action.deadline}</span>
                            <span className="flex items-center gap-1"><Users size={9} />Owner: {action.owner}</span>
                            <span className="flex items-center gap-1"><Money size={9} />Impact: <strong style={{ color: action.urgency === 'critical' ? 'hsl(var(--destructive))' : 'hsl(var(--text-3))' }}>{action.impact}</strong></span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-3 flex-shrink-0" style={{ borderRadius: 0 }}
                        onClick={() => navigate(action.link)}>
                        Resolve <ArrowRight size={10} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Regulatory Exposure ── */}
          <TabsContent value="frameworks" className="mt-4">
            <div className="grid grid-cols-5 gap-3 mb-4">
              {FRAMEWORK_STATUS.map((fw, i) => (
                <div key={i} className="p-4" style={{ border: `1px solid ${fw.status === 'green' ? 'hsl(var(--s-ok-br))' : fw.status === 'amber' ? 'hsl(var(--s-wn-br))' : 'hsl(var(--destructive) / 0.4)'}`, background: fw.status === 'green' ? 'hsl(var(--s-ok-bg))' : fw.status === 'amber' ? 'hsl(var(--s-wn-bg) / 0.5)' : 'hsl(var(--s-er-bg))' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{fw.name}</p>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: fw.status === 'green' ? 'hsl(var(--s-ok-tx))' : fw.status === 'amber' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }} />
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: scoreColor(fw.score) }}>{fw.score}%</p>
                  <div className="h-1 w-full mb-2 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                    <div style={{ width: `${fw.score}%`, height: '100%', background: scoreColor(fw.score) }} />
                  </div>
                  <p className="text-[9px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>Max fine: <span style={{ color: fw.status !== 'green' ? 'hsl(var(--destructive))' : 'hsl(var(--text-3))' }}>{fw.maxFine}</span></p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Due: {fw.deadline}</p>
                </div>
              ))}
            </div>
            <div className="p-3 flex gap-3 items-start" style={{ border: '1px solid hsl(var(--destructive) / 0.3)', background: 'hsl(var(--s-er-bg) / 0.5)' }}>
              <Warning size={15} weight="fill" style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'hsl(var(--destructive))' }}>Total Maximum Fine Exposure: ${fineExposure}M+</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                  This represents the combined maximum statutory penalties across EU AI Act, GDPR, and ECOA Reg B for {orgName}'s
                  current compliance gaps. Closing the 5 identified critical gaps would reduce maximum exposure by an estimated $28M.
                  See ROI Dashboard for full fine avoidance analysis.
                </p>
                <Button size="sm" className="mt-2 h-6 text-[10px] px-2" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                  onClick={() => navigate('/roi')}>
                  View Full Fine Avoidance Analysis <ArrowRight size={9} className="ml-1" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Model Portfolio ── */}
          <TabsContent value="portfolio" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      {['Model', 'Status', 'Risk Tier', 'Fairness Score', 'Drift', 'Compliance', 'Validated'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODELS.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => navigate('/models/inventory')}>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                          <p className="text-[10px] font-mono" style={{ color: 'hsl(var(--brand))' }}>{m.id} · {m.version}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: m.status === 'production' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-nt-bg))', color: m.status === 'production' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))' }}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: m.riskTier === 'high' ? 'hsl(var(--s-er-bg))' : m.riskTier === 'limited' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-ok-bg))', color: m.riskTier === 'high' ? 'hsl(var(--s-er-tx))' : m.riskTier === 'limited' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
                            {m.riskTier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold" style={{ color: scoreColor(m.fairnessScore) }}>{m.fairnessScore}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: m.driftStatus === 'critical' ? 'hsl(var(--destructive))' : m.driftStatus === 'warning' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }} />
                            <span style={{ color: 'hsl(var(--text-3))' }}>{m.driftStatus}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: scoreColor(MODEL_PORTFOLIO[i]?.compliance ?? 50) }}>{MODEL_PORTFOLIO[i]?.compliance ?? 50}%</span>
                        </td>
                        <td className="px-4 py-3" style={{ color: 'hsl(var(--text-3))' }}>{m.lastValidated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Board Trend ── */}
          <TabsContent value="board" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Quarterly Board Metrics — AI Risk, Compliance & Incidents</p>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={BOARD_METRICS}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="quarter" tick={{ fill: ct.axis, fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: ct.axis, fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fill: ct.axis, fontSize: 11 }} />
                    <RTooltip content={<ChartTip ct={ct} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="compliance" name="Compliance %" fill="hsl(var(--brand))" radius={[0, 0, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="riskScore" name="AI Risk Score" stroke="hsl(var(--s-ok-tx))" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="incidents" name="Open Incidents" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: 'Compliance Δ (QoQ)', value: `+${avgCompliance - 68}%`, positive: true },
                    { label: 'Risk Score Δ (QoQ)', value: `+${aiRiskScore - 65}pts`, positive: true },
                    { label: 'Incident Reduction (QoQ)', value: `${openIncidents - 5} incidents`, positive: openIncidents < 5 },
                  ].map((m, i) => (
                    <div key={i} className="p-3 text-center" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      <p className="text-[10px] uppercase tracking-widest" style={{ color: 'hsl(var(--text-4))' }}>{m.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: m.positive ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* ── Risk Heat Map ── */}
          <TabsContent value="heatmap" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Model Risk Portfolio — Heat Grid</p>
                  <p className="text-[10px] mb-4" style={{ color: 'hsl(var(--text-4))' }}>Risk tier × compliance score × drift status for all production models</p>
                  <div className="space-y-2">
                    {MODELS.map((m, i) => {
                      const compliance = MODEL_PORTFOLIO[i]?.compliance ?? 50;
                      const heatColor = m.riskTier === 'high' && m.driftStatus === 'critical'
                        ? 'hsl(var(--destructive))'
                        : m.riskTier === 'high' || m.driftStatus === 'warning'
                        ? 'hsl(var(--s-wn-tx))'
                        : 'hsl(var(--s-ok-tx))';
                      const heatBg = m.riskTier === 'high' && m.driftStatus === 'critical'
                        ? 'hsl(var(--s-er-bg))'
                        : m.riskTier === 'high' || m.driftStatus === 'warning'
                        ? 'hsl(var(--s-wn-bg) / 0.5)'
                        : 'hsl(var(--s-ok-bg) / 0.5)';
                      return (
                        <div key={m.id} className="flex items-center gap-3 p-2.5"
                          style={{ border: `1px solid ${heatColor}33`, background: heatBg }}>
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: heatColor }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</span>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[9px] px-1.5 py-0.5 uppercase font-bold"
                                  style={{ background: m.riskTier === 'high' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))', color: m.riskTier === 'high' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))' }}>
                                  {m.riskTier}
                                </span>
                                <span className="text-[10px] font-bold" style={{ color: heatColor }}>{compliance}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                                <div style={{ width: `${compliance}%`, height: '100%', background: heatColor }} />
                              </div>
                              <span className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{m.driftStatus} drift</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Shareholder & Financial Impact</p>
                  <p className="text-[10px] mb-4" style={{ color: 'hsl(var(--text-4))' }}>Translating regulatory risk into financial exposure and market impact</p>
                  <div className="space-y-3">
                    {[
                      { label: 'EU AI Act Max Fine', value: '$35M', pct: '2.1% revenue', color: 'hsl(var(--destructive))', note: 'Art. 9 gaps — 112 days to deadline' },
                      { label: 'GDPR Max Fine', value: '$20M', pct: '1.2% revenue', color: 'hsl(var(--s-wn-tx))', note: 'Strong controls, 88% compliant' },
                      { label: 'ECOA Reg B Exposure', value: '$2.4M', pct: 'Class action risk', color: 'hsl(var(--s-wn-tx))', note: 'MDL-001 bias DI below threshold' },
                      { label: 'Contract Risk (SOC 2)', value: '$8.5M', pct: 'Customer churn risk', color: 'hsl(var(--s-ok-tx))', note: '85% compliant, low risk' },
                      { label: 'NIST Fed Contract Risk', value: '$3M', pct: 'Federal revenue at risk', color: 'hsl(var(--s-wn-tx))', note: '71% compliant — 3 gaps open' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-start justify-between p-2.5"
                        style={{ border: `1px solid ${row.color}22`, background: `${row.color}08` }}>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{row.label}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{row.note}</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="text-base font-bold" style={{ color: row.color }}>{row.value}</p>
                          <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{row.pct}</p>
                        </div>
                      </div>
                    ))}
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold" style={{ color: 'hsl(var(--text-1))' }}>Total Maximum Exposure</span>
                        <span className="font-bold text-sm" style={{ color: 'hsl(var(--destructive))' }}>${fineExposure}M+</span>
                      </div>
                      <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                        Resolving the 5 critical gaps would reduce maximum exposure by an estimated <strong style={{ color: 'hsl(var(--s-ok-tx))' }}>$28M (75%)</strong> and add an estimated <strong style={{ color: 'hsl(var(--brand))' }}>$0.14/share</strong> in risk-adjusted earnings.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
