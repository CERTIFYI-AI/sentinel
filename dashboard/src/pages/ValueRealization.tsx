import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TooltipProvider } from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  Money, TrendUp, Clock, Users, ShieldCheck, ArrowRight, CheckCircle,
  Info, Lightning, FileText, Calculator, Buildings, Warning,
} from '@phosphor-icons/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, ComposedChart, Line, Cell, Legend,
} from 'recharts';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

// ── ROI Model ──────────────────────────────────────────────────────────────────
const FINE_AVOIDANCE = [
  { regulation: 'EU AI Act — Art. 9 High-Risk Compliance', maxFine: 35_000_000, riskReduction: 0.82, avoided: 28_700_000, controls: 7, status: 'amber' },
  { regulation: 'GDPR — Data Governance Controls', maxFine: 20_000_000, riskReduction: 0.91, avoided: 18_200_000, controls: 12, status: 'green' },
  { regulation: 'ECOA Reg B — Bias Audit Requirements', maxFine: 2_400_000, riskReduction: 0.65, avoided: 1_560_000, controls: 4, status: 'red' },
  { regulation: 'SOC 2 Type II — Contract Obligations', maxFine: 8_500_000, riskReduction: 0.88, avoided: 7_480_000, controls: 9, status: 'green' },
  { regulation: 'NIST AI RMF — Federal Contracting Risk', maxFine: 3_000_000, riskReduction: 0.72, avoided: 2_160_000, controls: 5, status: 'amber' },
];

const AUTOMATION_VALUE = [
  { task: 'Evidence Collection & Management', manualHrsPerYear: 2400, automationRate: 0.87, costPerHr: 185, annualSaving: 0 },
  { task: 'Compliance Control Testing', manualHrsPerYear: 1800, automationRate: 0.79, costPerHr: 165, annualSaving: 0 },
  { task: 'Bias Audit Preparation', manualHrsPerYear: 960, automationRate: 0.91, costPerHr: 220, annualSaving: 0 },
  { task: 'Regulatory Report Generation', manualHrsPerYear: 1200, automationRate: 0.83, costPerHr: 175, annualSaving: 0 },
  { task: 'Risk Register Maintenance', manualHrsPerYear: 720, automationRate: 0.76, costPerHr: 145, annualSaving: 0 },
  { task: 'Vendor Risk Assessments', manualHrsPerYear: 540, automationRate: 0.68, costPerHr: 195, annualSaving: 0 },
  { task: 'Audit Response Preparation', manualHrsPerYear: 1440, automationRate: 0.73, costPerHr: 200, annualSaving: 0 },
].map(t => ({
  ...t,
  annualSaving: Math.round(t.manualHrsPerYear * t.automationRate * t.costPerHr),
}));

const AUDIT_TIMELINE = [
  { year: 'Pre-Sentinel', auditPrep: 18, regulatoryResponse: 14, controlTesting: 22, total: 54 },
  { year: 'Year 1 (2024)', auditPrep: 12, regulatoryResponse: 9, controlTesting: 16, total: 37 },
  { year: 'Year 2 (2025)', auditPrep: 7, regulatoryResponse: 5, controlTesting: 9, total: 21 },
  { year: 'Year 3 (2026)', auditPrep: 4, regulatoryResponse: 3, controlTesting: 5, total: 12 },
];

const ROI_CUMULATIVE = [
  { month: 'Jan \'24', investment: 480000, value: 120000, cumRoi: -360000 },
  { month: 'Apr \'24', investment: 540000, value: 890000, cumRoi: 350000 },
  { month: 'Jul \'24', investment: 540000, value: 2100000, cumRoi: 1560000 },
  { month: 'Oct \'24', investment: 540000, value: 3800000, cumRoi: 3260000 },
  { month: 'Jan \'25', investment: 480000, value: 5600000, cumRoi: 5120000 },
  { month: 'Jul \'25', investment: 480000, value: 8900000, cumRoi: 8420000 },
  { month: 'Jan \'26', investment: 480000, value: 14200000, cumRoi: 13720000 },
  { month: 'Apr \'26', investment: 480000, value: 18300000, cumRoi: 17820000 },
];

const TCO_COMPARISON = [
  { name: 'Sentinel AI GRC\n(3-year TCO)', platform: 1440000, implementation: 240000, training: 60000, opportunity: 0, total: 1740000 },
  { name: 'Manual + Spreadsheets\n(3-year cost)', platform: 0, implementation: 0, training: 120000, opportunity: 4200000, total: 4320000 },
  { name: 'Legacy GRC +\nAI Point Solutions', platform: 2800000, implementation: 480000, training: 240000, opportunity: 1800000, total: 5320000 },
];

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const totalFineAvoidance = FINE_AVOIDANCE.reduce((s, f) => s + f.avoided, 0);
const totalAutomationValue = AUTOMATION_VALUE.reduce((s, a) => s + a.annualSaving, 0);
const totalHrsAutomated = AUTOMATION_VALUE.reduce((s, a) => s + Math.round(a.manualHrsPerYear * a.automationRate), 0);
const totalFTEEquivalent = (totalHrsAutomated / 2080).toFixed(1);
const totalROI = totalFineAvoidance + totalAutomationValue * 3; // 3-year

export default function ValueRealization() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [tab, setTab] = useState('summary');

  return (
    <TooltipProvider>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>ROI & Value Realization</h1>
              <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>
                CFO DASHBOARD
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · Quantified business value: fine avoidance, automation savings, audit efficiency, and 3-year TCO vs. alternatives
            </p>
          </div>
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
            onClick={() => toast.success('CFO ROI report generating — 12-page PDF with methodology')}>
            <FileText size={13} className="mr-1.5" />Export CFO Report
          </Button>
        </div>

        {/* Hero ROI Strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '3-Year Realized Value', value: fmt$(totalROI), sub: 'Fine avoidance + automation', highlight: true },
            { label: 'Fine Exposure Avoided', value: fmt$(totalFineAvoidance), sub: '5 regulatory frameworks', icon: ShieldCheck },
            { label: 'Annual Automation Savings', value: fmt$(totalAutomationValue), sub: `${totalHrsAutomated.toLocaleString()} hrs automated/yr` },
            { label: 'FTE Equivalent Saved', value: `${totalFTEEquivalent} FTE`, sub: 'Across 7 compliance functions' },
          ].map((tile, i) => (
            <div key={i} className="p-4" style={{ border: `1px solid ${tile.highlight ? 'hsl(var(--brand) / 0.4)' : 'hsl(var(--border))'}`, background: tile.highlight ? 'hsl(var(--brand) / 0.06)' : 'hsl(var(--bg-surface))' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{tile.label}</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: tile.highlight ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>{tile.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{tile.sub}</p>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="summary" style={{ borderRadius: 0 }}>ROI Overview</TabsTrigger>
            <TabsTrigger value="fines" style={{ borderRadius: 0 }}>Fine Avoidance</TabsTrigger>
            <TabsTrigger value="automation" style={{ borderRadius: 0 }}>Automation Value</TabsTrigger>
            <TabsTrigger value="audit" style={{ borderRadius: 0 }}>Audit Efficiency</TabsTrigger>
            <TabsTrigger value="tco" style={{ borderRadius: 0 }}>TCO Analysis</TabsTrigger>
          </TabsList>

          {/* ── ROI Overview ── */}
          <TabsContent value="summary" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Cumulative ROI — Investment vs. Value Delivered (28 months)</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={ROI_CUMULATIVE}>
                      <defs>
                        <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--s-ok-tx))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--s-ok-tx))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="month" tick={{ fill: ct.axis, fontSize: 9 }} />
                      <YAxis tickFormatter={v => fmt$(v)} tick={{ fill: ct.axis, fontSize: 9 }} />
                      <RTooltip formatter={(v: any) => fmt$(v)} contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="value" name="Cumulative Value" stroke="hsl(var(--s-ok-tx))" fill="url(#valGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="investment" name="Cumulative Investment" stroke="hsl(var(--brand))" fill="none" strokeWidth={1.5} strokeDasharray="4 3" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] mt-2" style={{ color: 'hsl(var(--text-4))' }}>Payback period: <strong style={{ color: 'hsl(var(--s-ok-tx))' }}>4.2 months</strong> · Current 3-yr ROI: <strong style={{ color: 'hsl(var(--brand))' }}>{Math.round(totalROI / 1440000 * 100)}%</strong></p>
                </CardContent>
              </Card>

              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Value Composition Breakdown</p>
                  <div className="space-y-4">
                    {[
                      { label: 'Fine & Penalty Avoidance', value: totalFineAvoidance, total: totalROI, color: 'hsl(var(--s-ok-tx))' },
                      { label: 'Compliance Automation (3yr)', value: totalAutomationValue * 3, total: totalROI, color: 'hsl(var(--brand))' },
                      { label: 'Audit Prep Efficiency (3yr)', value: 1_200_000, total: totalROI, color: '#f59e0b' },
                      { label: 'Incident Reduction Value', value: 480_000, total: totalROI, color: '#8b5cf6' },
                    ].map((row, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: 'hsl(var(--text-3))' }}>{row.label}</span>
                          <span className="font-bold" style={{ color: row.color }}>{fmt$(row.value)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                          <div style={{ width: `${Math.min((row.value / row.total) * 100, 100)}%`, height: '100%', background: row.color }} />
                        </div>
                        <p className="text-[9px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{Math.round((row.value / row.total) * 100)}% of total value</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Fine Avoidance ── */}
          <TabsContent value="fines" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <div className="p-3" style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                    Fine avoidance is calculated as: <strong>Maximum Statutory Fine × Risk Reduction Rate from Sentinel Controls</strong>.
                    Risk reduction rates are derived from control implementation coverage scores and are conservative estimates.
                  </p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Regulation', 'Max. Statutory Fine', 'Controls Active', 'Risk Reduction', 'Fine Avoided', 'Status'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FINE_AVOIDANCE.map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.regulation}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{fmt$(f.maxFine)}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: 'hsl(var(--brand))' }}>{f.controls} active</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                              <div style={{ width: `${f.riskReduction * 100}%`, height: '100%', background: f.status === 'green' ? 'hsl(var(--s-ok-tx))' : f.status === 'amber' ? '#f59e0b' : 'hsl(var(--destructive))' }} />
                            </div>
                            <span style={{ color: 'hsl(var(--text-3))' }}>{Math.round(f.riskReduction * 100)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-sm" style={{ color: 'hsl(var(--s-ok-tx))' }}>{fmt$(f.avoided)}</td>
                        <td className="px-4 py-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: f.status === 'green' ? 'hsl(var(--s-ok-tx))' : f.status === 'amber' ? '#f59e0b' : 'hsl(var(--destructive))' }} />
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'hsl(var(--bg-raised))' }}>
                      <td className="px-4 py-3 font-bold" style={{ color: 'hsl(var(--text-1))' }}>TOTAL</td>
                      <td className="px-4 py-3 font-bold font-mono" style={{ color: 'hsl(var(--text-1))' }}>{fmt$(FINE_AVOIDANCE.reduce((s, f) => s + f.maxFine, 0))}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'hsl(var(--brand))' }}>{FINE_AVOIDANCE.reduce((s, f) => s + f.controls, 0)} controls</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 font-bold text-base" style={{ color: 'hsl(var(--s-ok-tx))' }}>{fmt$(totalFineAvoidance)}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Automation Value ── */}
          <TabsContent value="automation" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                        {['Task', 'Manual Hrs/yr', 'Automation %', 'Annual Saving'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {AUTOMATION_VALUE.map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <td className="px-3 py-2.5" style={{ color: 'hsl(var(--text-1))' }}>{t.task}</td>
                          <td className="px-3 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{t.manualHrsPerYear.toLocaleString()}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-12 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                                <div style={{ width: `${t.automationRate * 100}%`, height: '100%', background: 'hsl(var(--brand))' }} />
                              </div>
                              <span style={{ color: 'hsl(var(--brand))' }}>{Math.round(t.automationRate * 100)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>{fmt$(t.annualSaving)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'hsl(var(--bg-raised))' }}>
                        <td className="px-3 py-2.5 font-bold" style={{ color: 'hsl(var(--text-1))' }}>TOTAL ANNUAL</td>
                        <td className="px-3 py-2.5 font-bold font-mono" style={{ color: 'hsl(var(--text-3))' }}>{AUTOMATION_VALUE.reduce((s, a) => s + a.manualHrsPerYear, 0).toLocaleString()}</td>
                        <td />
                        <td className="px-3 py-2.5 font-bold text-base" style={{ color: 'hsl(var(--s-ok-tx))' }}>{fmt$(totalAutomationValue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Annual Savings by Task (USD)</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={AUTOMATION_VALUE} layout="vertical" barCategoryGap={6}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} tick={{ fill: ct.axis, fontSize: 9 }} />
                      <YAxis dataKey="task" type="category" tick={{ fill: ct.axis, fontSize: 9 }} width={140} />
                      <RTooltip formatter={(v: any) => fmt$(v)} contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                      <Bar dataKey="annualSaving" name="Annual Saving" fill="hsl(var(--brand))" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Audit Efficiency ── */}
          <TabsContent value="audit" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Audit Preparation Time Reduction — Weeks per Audit Cycle</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={AUDIT_TIMELINE} barCategoryGap={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="year" tick={{ fill: ct.axis, fontSize: 11 }} />
                    <YAxis tick={{ fill: ct.axis, fontSize: 11 }} label={{ value: 'Weeks', angle: -90, position: 'insideLeft', style: { fill: ct.axis, fontSize: 10 } }} />
                    <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="auditPrep" name="Audit Prep" stackId="a" fill="hsl(var(--brand))" />
                    <Bar dataKey="regulatoryResponse" name="Regulatory Response" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="controlTesting" name="Control Testing" stackId="a" fill="hsl(var(--s-wn-tx))" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Audit Prep: Pre → Current', before: '18 weeks', after: '4 weeks', reduction: '78%' },
                    { label: 'Regulatory Response Time', before: '14 weeks', after: '3 weeks', reduction: '79%' },
                    { label: 'Control Testing Cycle', before: '22 weeks', after: '5 weeks', reduction: '77%' },
                  ].map((m, i) => (
                    <div key={i} className="p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'hsl(var(--text-3))' }}>{m.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs line-through" style={{ color: 'hsl(var(--text-4))' }}>{m.before}</span>
                        <ArrowRight size={10} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>{m.after}</span>
                      </div>
                      <p className="text-xs font-bold mt-1" style={{ color: 'hsl(var(--brand))' }}>{m.reduction} faster</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TCO Analysis ── */}
          <TabsContent value="tco" className="mt-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {TCO_COMPARISON.map((t, i) => (
                <div key={i} className="p-4" style={{ border: `1px solid ${i === 0 ? 'hsl(var(--brand) / 0.4)' : 'hsl(var(--border))'}`, background: i === 0 ? 'hsl(var(--brand) / 0.04)' : 'hsl(var(--bg-surface))' }}>
                  {i === 0 && <Badge style={{ borderRadius: 0, fontSize: 9, marginBottom: 8, background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>CURRENT</Badge>}
                  <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>{t.name.replace('\n', ' ')}</p>
                  {[
                    { label: 'Platform License', v: t.platform },
                    { label: 'Implementation', v: t.implementation },
                    { label: 'Training & Enablement', v: t.training },
                    { label: 'Opportunity Cost', v: t.opportunity },
                  ].map((row, j) => (
                    <div key={j} className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'hsl(var(--text-4))' }}>{row.label}</span>
                      <span style={{ color: row.v === 0 ? 'hsl(var(--text-4))' : 'hsl(var(--text-3))' }}>{row.v === 0 ? '—' : fmt$(row.v)}</span>
                    </div>
                  ))}
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>3-Year Total</span>
                      <span className="text-base font-bold" style={{ color: i === 0 ? 'hsl(var(--brand))' : 'hsl(var(--destructive))' }}>{fmt$(t.total)}</span>
                    </div>
                  </div>
                  {i > 0 && (
                    <p className="text-[10px] mt-1.5" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                      {fmt$(t.total - TCO_COMPARISON[0].total)} more expensive than Sentinel
                    </p>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
