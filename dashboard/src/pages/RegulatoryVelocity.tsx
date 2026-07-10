import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TooltipProvider } from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  Globe, Warning, Clock, Brain, ShieldCheck, ArrowRight,
  TrendUp, Bell, CheckCircle, FileText, Lightning, Info,
} from '@phosphor-icons/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, Legend,
} from 'recharts';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

const VELOCITY_SCORES = [
  { reg: 'EU AI Act', velocity: 94, change: '+12', articles: 113, activeArticles: 7, deadline: '2026-08-02', region: 'EU', models: 3, readiness: 71 },
  { reg: 'EU AI Liability Dir.', velocity: 78, change: '+8', articles: 24, activeArticles: 3, deadline: '2026-12-15', region: 'EU', models: 3, readiness: 44 },
  { reg: 'NIST AI RMF 1.1', velocity: 61, change: '+5', articles: 36, activeArticles: 2, deadline: '2026-09-30', region: 'US', models: 6, readiness: 68 },
  { reg: 'UK AI Safety Bill', velocity: 55, change: '+9', articles: 18, activeArticles: 4, deadline: '2027-01-01', region: 'UK', models: 2, readiness: 52 },
  { reg: 'ECOA / Reg B', velocity: 34, change: '+1', articles: 12, activeArticles: 1, deadline: 'Effective', region: 'US', models: 2, readiness: 82 },
  { reg: 'ISO 42001', velocity: 28, change: '+3', articles: 45, activeArticles: 2, deadline: '2026-11-30', region: 'Global', models: 6, readiness: 61 },
];

const VELOCITY_TREND = [
  { month: 'Oct', euAIAct: 62, nist: 41, ukBill: 28 },
  { month: 'Nov', euAIAct: 67, nist: 44, ukBill: 32 },
  { month: 'Dec', euAIAct: 72, nist: 49, ukBill: 37 },
  { month: 'Jan', euAIAct: 78, nist: 53, ukBill: 41 },
  { month: 'Feb', euAIAct: 84, nist: 56, ukBill: 47 },
  { month: 'Mar', euAIAct: 89, nist: 59, ukBill: 51 },
  { month: 'Apr', euAIAct: 94, nist: 61, ukBill: 55 },
];

const MODEL_IMPACT_MAP = [
  { model: 'CreditRisk-XGB-v3.2', id: 'MDL-001', regs: ['EU AI Act', 'ECOA', 'EU AI Liability'], impact: 'Critical', gaps: 3, daysToDeadline: 112 },
  { model: 'FraudDetect-LSTM-v1.8', id: 'MDL-002', regs: ['EU AI Act', 'NIST AI RMF'], impact: 'High', gaps: 1, daysToDeadline: 112 },
  { model: 'CreditScoreNLP-v2.1', id: 'MDL-004', regs: ['EU AI Act', 'ECOA', 'UK AI Safety'], impact: 'High', gaps: 2, daysToDeadline: 112 },
  { model: 'RiskForecast-GBM', id: 'MDL-005', regs: ['NIST AI RMF', 'ISO 42001'], impact: 'Medium', gaps: 1, daysToDeadline: 171 },
  { model: 'DocClassifier-BERT', id: 'MDL-006', regs: ['ISO 42001'], impact: 'Low', gaps: 0, daysToDeadline: 232 },
];

const UPCOMING_CHANGES = [
  { date: '2026-05-01', reg: 'EU AI Act', article: 'Art. 52 — Transparency obligations for GPAI', impact: 'High', modelsAffected: 2, autoMapped: true },
  { date: '2026-06-15', reg: 'NIST AI RMF 1.1', article: 'GOVERN 6.1 — Policies for AI deployment decisions', impact: 'Medium', modelsAffected: 6, autoMapped: true },
  { date: '2026-08-02', reg: 'EU AI Act', article: 'Art. 9 — Full risk management system required', impact: 'Critical', modelsAffected: 3, autoMapped: false },
  { date: '2026-09-01', reg: 'UK AI Safety Bill', article: 'Cl. 12 — Mandatory bias assessments for public-facing AI', impact: 'High', modelsAffected: 2, autoMapped: false },
  { date: '2026-11-30', reg: 'ISO 42001', article: 'Clause 9 — Performance evaluation requirements', impact: 'Medium', modelsAffected: 6, autoMapped: true },
];

const READINESS_DATA = VELOCITY_SCORES.map(v => ({ name: v.reg.replace('EU AI ', '').replace(' Dir.', ''), readiness: v.readiness }));

function velColor(v: number) {
  if (v >= 80) return 'hsl(var(--destructive))';
  if (v >= 60) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--s-ok-tx))';
}

function impactBadge(impact: string) {
  const map: Record<string, { bg: string; tx: string }> = {
    Critical: { bg: 'hsl(var(--destructive) / 0.12)', tx: 'hsl(var(--destructive))' },
    High: { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))' },
    Medium: { bg: 'hsl(45 90% 50% / 0.12)', tx: 'hsl(45 90% 38%)' },
    Low: { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--text-4))' },
  };
  return map[impact] || map.Low;
}

export default function RegulatoryVelocity() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [tab, setTab] = useState('velocity');

  const criticalRegs = VELOCITY_SCORES.filter(r => r.velocity >= 80).length;
  const totalModelsAtRisk = new Set(MODEL_IMPACT_MAP.filter(m => m.impact === 'Critical' || m.impact === 'High').map(m => m.id)).size;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title="Regulatory Velocity Engine"
          subtitle={`${orgName} · AI-powered regulatory change velocity scoring with automatic model impact mapping and deadline intelligence`}
          actions={
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
              onClick={() => toast.success('Regulatory scan triggered — results in 30s')}>
              <Lightning size={13} />Run Regulatory Scan
            </Button>
          }
        />

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Regulations Tracked', value: VELOCITY_SCORES.length, sub: '6 jurisdictions' },
            { label: 'High-Velocity Regulations', value: criticalRegs, sub: 'Velocity score ≥ 80', alert: true },
            { label: 'Models at Critical/High Risk', value: totalModelsAtRisk, sub: 'Auto-mapped exposure', alert: true },
            { label: 'Upcoming Article Changes (90d)', value: UPCOMING_CHANGES.length, sub: '2 require immediate action' },
          ].map((tile, i) => (
            <div key={i} className="p-4" style={{ border: `1px solid ${tile.alert ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))'}`, background: tile.alert ? 'hsl(var(--s-wn-bg) / 0.5)' : 'hsl(var(--bg-surface))' }}>
              <span className="text-[10px] uppercase tracking-widest font-semibold block mb-1" style={{ color: 'hsl(var(--text-4))' }}>{tile.label}</span>
              <p className="text-2xl font-bold" style={{ color: tile.alert ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>{tile.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{tile.sub}</p>
            </div>
          ))}
        </div>

        <div className="p-3 flex items-start gap-3" style={{ border: '1px solid hsl(var(--brand) / 0.3)', background: 'hsl(var(--brand) / 0.04)' }}>
          <Info size={16} style={{ color: 'hsl(var(--brand))', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand))' }}>Switching Cost: Your Regulation-Model Mapping History is Irreplaceable</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
              Every model-to-regulation mapping, compliance decision, and article-level evidence link you've built over 14 months lives exclusively in Sentinel.
              Migrating this data to any other platform would require months of manual re-mapping work — a structural switching cost that protects your investment.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="velocity" style={{ borderRadius: 0 }}>Velocity Scores</TabsTrigger>
            <TabsTrigger value="impact" style={{ borderRadius: 0 }}>Model Impact Map</TabsTrigger>
            <TabsTrigger value="upcoming" style={{ borderRadius: 0 }}>Upcoming Changes</TabsTrigger>
            <TabsTrigger value="trend" style={{ borderRadius: 0 }}>Velocity Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="velocity" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Regulation Velocity Score — Change Rate Index (0-100)</p>
                  <div className="space-y-3">
                    {VELOCITY_SCORES.sort((a, b) => b.velocity - a.velocity).map((reg, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Globe size={11} style={{ color: 'hsl(var(--brand))' }} />
                            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{reg.reg}</span>
                            <span className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{reg.region}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px]" style={{ color: 'hsl(var(--s-ok-tx))' }}>{reg.change} pts/mo</span>
                            <span className="text-xs font-bold" style={{ color: velColor(reg.velocity) }}>{reg.velocity}</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                          <div style={{ width: `${reg.velocity}%`, height: '100%', background: velColor(reg.velocity) }} />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>
                          <span>{reg.activeArticles} articles changing · {reg.models} models affected</span>
                          <span>Readiness: <strong style={{ color: reg.readiness >= 70 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>{reg.readiness}%</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Compliance Readiness vs. Regulation</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={READINESS_DATA} layout="vertical" barCategoryGap={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: ct.axis, fontSize: 9 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: ct.axis, fontSize: 10 }} width={80} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                      <Bar dataKey="readiness" name="Readiness %" radius={0}>
                        {READINESS_DATA.map((entry, i) => (
                          <Cell key={i} fill={entry.readiness >= 70 ? 'hsl(var(--s-ok-tx))' : entry.readiness >= 55 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="impact" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <div className="p-3 flex items-center gap-2" style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  <Brain size={13} style={{ color: 'hsl(var(--brand))' }} />
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                    Auto-mapped using Sentinel's proprietary model-regulation semantic matching engine. Models are automatically linked to applicable regulations based on use-case classification, geography, and data type.
                  </p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Model', 'Applicable Regulations', 'Impact Level', 'Open Gaps', 'Nearest Deadline'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_IMPACT_MAP.map((m, i) => {
                      const ib = impactBadge(m.impact);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.model}</p>
                            <p className="text-[10px] font-mono" style={{ color: 'hsl(var(--brand))' }}>{m.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {m.regs.map(r => (
                                <span key={r} className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' }}>{r}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] px-1.5 py-0.5 font-semibold" style={{ background: ib.bg, color: ib.tx }}>{m.impact}</span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold" style={{ color: m.gaps > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))' }}>{m.gaps}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Clock size={10} style={{ color: m.daysToDeadline < 120 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }} />
                              <span style={{ color: m.daysToDeadline < 120 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}>
                                {m.daysToDeadline === 0 ? 'Effective now' : `${m.daysToDeadline} days`}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4">
            <div className="space-y-3">
              {UPCOMING_CHANGES.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((change, i) => {
                const ib = impactBadge(change.impact);
                const daysLeft = Math.ceil((new Date(change.date).getTime() - Date.now()) / 86400000);
                return (
                  <Card key={i} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${change.impact === 'Critical' ? 'hsl(var(--destructive) / 0.4)' : 'hsl(var(--border))'}` }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-center p-2 min-w-12" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                            <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{new Date(change.date).toLocaleDateString('en', { month: 'short' })}</p>
                            <p className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>{new Date(change.date).getDate()}</p>
                            <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{new Date(change.date).getFullYear()}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold" style={{ color: 'hsl(var(--brand))' }}>{change.reg}</span>
                              <span className="text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: ib.bg, color: ib.tx }}>{change.impact}</span>
                              {change.autoMapped && (
                                <span className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>AUTO-MAPPED</span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{change.article}</p>
                            <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                              {change.modelsAffected} model{change.modelsAffected > 1 ? 's' : ''} affected · {daysLeft} days remaining
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 ml-4">
                          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" style={{ borderRadius: 0 }}
                            onClick={() => toast.success('Compliance task created for this article')}>
                            <CheckCircle size={10} />Create Task
                          </Button>
                          {!change.autoMapped && (
                            <Button size="sm" className="h-7 text-[10px] px-2" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                              onClick={() => toast.success('Auto-mapping models to this regulation…')}>
                              <Brain size={10} />Auto-Map
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="trend" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Regulatory Velocity Index — 7-Month Trend by Key Regulation</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={VELOCITY_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="month" tick={{ fill: ct.axis, fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: ct.axis, fontSize: 11 }} label={{ value: 'Velocity Score', angle: -90, position: 'insideLeft', style: { fill: ct.axis, fontSize: 10 } }} />
                    <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="euAIAct" stroke="hsl(var(--destructive))" strokeWidth={2.5} name="EU AI Act" dot={{ fill: 'hsl(var(--destructive))', r: 3 }} />
                    <Line type="monotone" dataKey="nist" stroke="hsl(var(--brand))" strokeWidth={2} name="NIST AI RMF" dot={{ fill: 'hsl(var(--brand))', r: 3 }} />
                    <Line type="monotone" dataKey="ukBill" stroke="hsl(var(--s-wn-tx))" strokeWidth={2} name="UK AI Safety Bill" dot={{ fill: 'hsl(var(--s-wn-tx))', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                    <strong style={{ color: 'hsl(var(--destructive))' }}>EU AI Act</strong> velocity has accelerated +32 points over 7 months and is projected to hit 98/100 by the August 2, 2026 full effectiveness deadline.
                    Immediate action recommended for MDL-001, MDL-002, MDL-004.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
