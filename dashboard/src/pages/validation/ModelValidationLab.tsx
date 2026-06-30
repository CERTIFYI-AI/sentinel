import { useState } from 'react';
import {
  Flask, Play, Plus, Eye, MagnifyingGlass, Export, CheckCircle,
  Warning, Siren, ChartBar, Brain, ShieldCheck, ArrowRight,
  Download, Gauge, Clock, FileText,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Legend,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { MODELS, formatDate } from '../../data/seed';


type ValStatus = 'Passed' | 'Failed' | 'In Progress' | 'Pending' | 'Waived';

interface ValidationTest {
  name: string; category: string; result: ValStatus; score?: number; threshold?: number;
  description: string; detail?: string;
}

interface ValidationReport {
  id: string; modelId: string; modelName: string; modelVersion: string;
  validatorName: string; startDate: string; completedDate?: string;
  status: ValStatus; framework: string; overallScore: number;
  tests: ValidationTest[];
  benchmarks: { name: string; champion: number; challenger?: number; unit: string }[];
  adversarialResults: { attack: string; successRate: number; baseline: number }[];
  regressionStatus: 'Passed' | 'Failed' | 'Pending';
  regressionDetails: string;
  srCompliance: boolean; occCompliance: boolean;
  recommendation: 'Approve' | 'Conditional Approval' | 'Reject' | 'Pending';
  conditions?: string;
}

const SEED_REPORTS: ValidationReport[] = [
  {
    id: 'VAL-2026-008', modelId: 'MDL-003', modelName: 'Credit Risk Scorer v4.0', modelVersion: 'v4.0.0-rc1',
    validatorName: 'Raj Gupta', startDate: '2026-03-25', completedDate: '2026-04-07',
    status: 'Passed', framework: 'SR 11-7 / OCC 2011-12', overallScore: 87,
    recommendation: 'Conditional Approval',
    conditions: 'Deploy in shadow mode for 30 days. Require bias audit after 100K inferences. MRC sign-off required before full production traffic.',
    srCompliance: true, occCompliance: true, regressionStatus: 'Passed',
    regressionDetails: 'All 847 regression test cases passed. No performance degradation vs MDL-001 v3.2.1 on holdout set.',
    tests: [
      { name: 'Performance Benchmark', category: 'Performance', result: 'Passed', score: 92.3, threshold: 90, description: 'AUC-ROC vs holdout set', detail: 'AUC-ROC: 0.923 (champion: 0.915). Gini: 0.847. KS-stat: 0.52.' },
      { name: 'Bias & Fairness Assessment', category: 'Fairness', result: 'Passed', score: 88, threshold: 85, description: 'Demographic parity across protected classes', detail: 'Gender parity: 0.91 (pass). Age fairness: 0.87 (pass). Ethnicity: 0.88 (pass). All groups above 0.85 threshold.' },
      { name: 'Adversarial Robustness', category: 'Security', result: 'Passed', score: 81, threshold: 80, description: 'Resistance to adversarial perturbations', detail: 'FGSM attack success rate: 4.2% (threshold ≤5%). PGD attack: 6.1% (threshold ≤8%). JSMA: 3.8%.' },
      { name: 'Data Drift Stability', category: 'Stability', result: 'Passed', score: 94, threshold: 85, description: 'PSI and KS-test on input feature distributions', detail: 'Max PSI across features: 0.08 (threshold <0.25). KS-test: stable across 6-month window.' },
      { name: 'Explainability Adequacy', category: 'Explainability', result: 'Passed', score: 89, threshold: 80, description: 'SHAP fidelity and ECOA adverse action compliance', detail: 'SHAP global fidelity: 0.94. All adverse action reasons mappable to ECOA-compliant factors. GDPR Art. 22 explanation adequacy: PASS.' },
      { name: 'Stress Testing', category: 'Stability', result: 'Passed', score: 85, threshold: 75, description: 'Performance under extreme economic scenarios', detail: 'Model tested against 2008 GFC scenario, COVID-19 Q2 2020, and synthetic 40% default spike. Performance degraded <5% vs baseline.' },
      { name: 'Documentation Completeness', category: 'Governance', result: 'Passed', score: 100, threshold: 100, description: 'Model card, technical spec, and data sheet', detail: 'All required SR 11-7 documentation sections complete. Model card per Mitchell et al. format filed.' },
      { name: 'ECOA/FCRA Compliance', category: 'Regulatory', result: 'Passed', score: 96, threshold: 90, description: 'Equal Credit Opportunity Act and Fair Credit Reporting Act compliance', detail: 'Adverse action notice logic validated. All 47 ECOA factors correctly mapped.' },
    ],
    benchmarks: [
      { name: 'AUC-ROC', champion: 0.915, challenger: 0.923, unit: 'score' },
      { name: 'Gini Coefficient', champion: 0.830, challenger: 0.847, unit: 'score' },
      { name: 'KS Statistic', champion: 0.49, challenger: 0.52, unit: 'stat' },
      { name: 'Brier Score', champion: 0.142, challenger: 0.128, unit: 'score' },
      { name: 'Inference Latency (p99)', champion: 52, challenger: 41, unit: 'ms' },
      { name: 'Default Rate (test set)', champion: 4.2, challenger: 3.8, unit: '%' },
    ],
    adversarialResults: [
      { attack: 'FGSM', successRate: 4.2, baseline: 5.0 },
      { attack: 'PGD', successRate: 6.1, baseline: 8.0 },
      { attack: 'JSMA', successRate: 3.8, baseline: 6.0 },
      { attack: 'Feature Squeezing', successRate: 2.1, baseline: 4.0 },
    ],
  },
  {
    id: 'VAL-2026-007', modelId: 'MDL-004', modelName: 'AML Transaction Monitor v3.1', modelVersion: 'v3.1.0',
    validatorName: 'Emma Wilson', startDate: '2026-03-10', completedDate: '2026-03-28',
    status: 'Failed', framework: 'SR 11-7 / FinCEN Guidelines', overallScore: 63,
    recommendation: 'Reject',
    srCompliance: false, occCompliance: false, regressionStatus: 'Failed',
    regressionDetails: '23 of 847 regression test cases failed. False negative rate increased by 12% on structured transactions.',
    tests: [
      { name: 'Performance Benchmark', category: 'Performance', result: 'Failed', score: 68, threshold: 85, description: 'Precision-Recall on SAR dataset', detail: 'Recall: 0.68 (threshold: 0.85). 32% of true SARs missed on validation set.' },
      { name: 'Bias & Fairness Assessment', category: 'Fairness', result: 'Passed', score: 91, threshold: 85, description: 'Demographic fairness in alert rates', detail: 'No significant demographic disparities in alert generation.' },
      { name: 'Adversarial Robustness', category: 'Security', result: 'Failed', score: 71, threshold: 80, description: 'Resistance to evasion attacks', detail: 'Structuring evasion (breaking large txns into small batches) bypasses detection in 29% of cases.' },
      { name: 'Documentation Completeness', category: 'Governance', result: 'Passed', score: 100, threshold: 100, description: 'Model documentation', detail: 'All documentation sections complete.' },
    ],
    benchmarks: [
      { name: 'Recall (SAR detection)', champion: 0.88, challenger: 0.68, unit: 'score' },
      { name: 'Precision', champion: 0.72, challenger: 0.81, unit: 'score' },
      { name: 'F1 Score', champion: 0.79, challenger: 0.74, unit: 'score' },
    ],
    adversarialResults: [
      { attack: 'Structuring Evasion', successRate: 29, baseline: 10 },
      { attack: 'Round-Trip Obfuscation', successRate: 18, baseline: 12 },
    ],
  },
  {
    id: 'VAL-2026-009', modelId: 'MDL-002', modelName: 'Fraud Detection Engine v5.0', modelVersion: 'v5.0.0-beta',
    validatorName: 'Raj Gupta', startDate: '2026-04-05',
    status: 'In Progress', framework: 'SR 11-7', overallScore: 0,
    recommendation: 'Pending',
    srCompliance: false, occCompliance: false, regressionStatus: 'Pending',
    regressionDetails: 'Regression pipeline running — ETA 2026-04-12.',
    tests: [
      { name: 'Performance Benchmark', category: 'Performance', result: 'In Progress', description: 'Precision-Recall on fraud holdout set' },
      { name: 'Bias & Fairness Assessment', category: 'Fairness', result: 'Pending', description: 'Protected class fairness analysis' },
      { name: 'Adversarial Robustness', category: 'Security', result: 'Pending', description: 'Evasion and poisoning attack resistance' },
      { name: 'Data Drift Stability', category: 'Stability', result: 'Pending', description: 'PSI across input features' },
    ],
    benchmarks: [],
    adversarialResults: [],
  },
];

const STATUS_COLORS: Record<ValStatus, { bg: string; color: string }> = {
  Passed: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Failed: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  'In Progress': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  Pending: { bg: 'hsl(220 14% 60% / 0.15)', color: 'hsl(var(--text-3))' },
  Waived: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
};

const REC_COLORS: Record<string, { bg: string; color: string }> = {
  Approve: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  'Conditional Approval': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
  Reject: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Pending: { bg: 'hsl(220 14% 60% / 0.15)', color: 'hsl(var(--text-3))' },
};

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

export default function ModelValidationLab() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ValidationReport | null>(null);
  const [tab, setTab] = useState('tests');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const ct = useChartTheme();

  const addToast = (text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, text, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const filtered = SEED_REPORTS.filter(r =>
    r.modelName.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  const passed = SEED_REPORTS.filter(r => r.status === 'Passed').length;
  const failed = SEED_REPORTS.filter(r => r.status === 'Failed').length;
  const inProgress = SEED_REPORTS.filter(r => r.status === 'In Progress').length;

  return (
    <div className="space-y-5">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 rounded text-sm text-white shadow-lg"
            style={{ background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--s-er-tx))' : '#3b82f6' }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Flask size={20} weight="duotone" className="text-[hsl(var(--brand))]" />
            Model Validation & Testing Lab
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Structured validation per SR 11-7 · OCC 2011-12 · adversarial robustness testing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={() => addToast('Reports exported')}>
            <Export size={14} /> Export
          </Button>
          <Button size="sm" className="gap-1.5 rounded-none" onClick={() => addToast('Validation run initiated for MDL-002', 'info')}>
            <Play size={14} /> Run Validation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Validations', value: SEED_REPORTS.length, color: 'hsl(var(--brand))' },
          { label: 'Passed', value: passed, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Failed', value: failed, color: 'hsl(var(--s-er-tx))' },
          { label: 'In Progress', value: inProgress, color: '#3b82f6' },
        ].map(s => (
          <Card key={s.label} style={{ borderRadius: 0 }}>
            <CardContent className="px-4 py-3">
              <p className="text-xs text-[hsl(var(--text-4))] mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-[hsl(var(--text-4))]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search validations..." className="pl-8 rounded-none h-8 text-sm" />
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
                {['Report ID', 'Model', 'Version', 'Validator', 'Framework', 'Status', 'Score', 'Recommendation', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-[hsl(var(--text-4))] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-[hsl(var(--border))] hover:bg-surface transition-colors ${i % 2 === 0 ? '' : 'bg-[hsl(var(--bg-page))]'}`}>
                  <td className="px-3 py-2 font-mono text-xs text-[hsl(var(--text-3))]">{r.id}</td>
                  <td className="px-3 py-2 font-medium text-[hsl(var(--text-1))] whitespace-nowrap">{r.modelName}</td>
                  <td className="px-3 py-2 font-mono text-xs text-[hsl(var(--text-3))]">{r.modelVersion}</td>
                  <td className="px-3 py-2 text-[hsl(var(--text-2))] whitespace-nowrap">{r.validatorName}</td>
                  <td className="px-3 py-2 text-[hsl(var(--text-3))] text-xs">{r.framework}</td>
                  <td className="px-3 py-2">
                    <Badge style={{ ...STATUS_COLORS[r.status], borderRadius: 0, fontSize: 10 }}>{r.status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {r.overallScore > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: r.overallScore >= 80 ? 'hsl(var(--s-ok-tx))' : r.overallScore >= 65 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))' }}>{r.overallScore}</span>
                        <Progress value={r.overallScore} className="h-1.5 w-16 rounded-none" />
                      </div>
                    ) : <span className="text-[hsl(var(--text-4))]">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge style={{ ...REC_COLORS[r.recommendation], borderRadius: 0, fontSize: 10 }}>{r.recommendation}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" className="h-7 rounded-none text-xs" onClick={() => { setSelected(r); setTab('tests'); }}>
                      <Eye size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <SheetTitle className="text-base">{selected.modelName}</SheetTitle>
                    <p className="text-xs text-[hsl(var(--text-3))] mt-1">{selected.id} · {selected.modelVersion} · Validator: {selected.validatorName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge style={{ ...STATUS_COLORS[selected.status], borderRadius: 0, fontSize: 10 }}>{selected.status}</Badge>
                    <Badge style={{ ...REC_COLORS[selected.recommendation], borderRadius: 0, fontSize: 10 }}>{selected.recommendation}</Badge>
                  </div>
                </div>
                {selected.conditions && (
                  <div className="flex items-start gap-2 p-3 border border-[hsl(var(--s-wn-br))] bg-[hsl(var(--s-wn-bg))]">
                    <Warning size={14} className="text-[hsl(var(--s-wn-tx))] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[hsl(var(--s-wn-tx))]"><strong>Conditions:</strong> {selected.conditions}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'SR 11-7', value: selected.srCompliance ? 'Compliant' : 'Non-Compliant', ok: selected.srCompliance },
                    { label: 'OCC', value: selected.occCompliance ? 'Compliant' : 'Non-Compliant', ok: selected.occCompliance },
                    { label: 'Regression', value: selected.regressionStatus, ok: selected.regressionStatus === 'Passed' },
                  ].map(s => (
                    <div key={s.label} className={`p-2 border text-center ${s.ok ? 'border-[hsl(var(--s-ok-br))] bg-[hsl(var(--s-ok-bg))]' : 'border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))]'}`}>
                      <p className="text-xs text-[hsl(var(--text-4))]">{s.label}</p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: s.ok ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </SheetHeader>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="rounded-none w-full">
                  <TabsTrigger value="tests" className="rounded-none flex-1 text-xs">Tests ({selected.tests.length})</TabsTrigger>
                  <TabsTrigger value="benchmarks" className="rounded-none flex-1 text-xs">Benchmarks</TabsTrigger>
                  <TabsTrigger value="adversarial" className="rounded-none flex-1 text-xs">Adversarial</TabsTrigger>
                </TabsList>

                <TabsContent value="tests" className="mt-4 space-y-2">
                  {selected.tests.map((t, i) => (
                    <div key={i} className="border border-[hsl(var(--border))] p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[hsl(var(--text-1))]">{t.name}</p>
                          <p className="text-xs text-[hsl(var(--text-3))]">{t.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge style={{ background: '#3b82f6/0.12', color: '#60a5fa', border: '1px solid #3b82f6/0.2', borderRadius: 0, fontSize: 10 }}>{t.category}</Badge>
                          <Badge style={{ ...STATUS_COLORS[t.result], borderRadius: 0, fontSize: 10 }}>{t.result}</Badge>
                        </div>
                      </div>
                      {t.score !== undefined && (
                        <div className="flex items-center gap-3">
                          <Progress value={t.score} className="h-1.5 flex-1 rounded-none" />
                          <span className="text-xs font-medium whitespace-nowrap" style={{ color: t.score >= (t.threshold || 80) ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                            {t.score} / {t.threshold}
                          </span>
                        </div>
                      )}
                      {t.detail && <p className="text-xs text-[hsl(var(--text-3))] bg-surface p-2">{t.detail}</p>}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="benchmarks" className="mt-4">
                  {selected.benchmarks.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--text-3))] text-center py-8">Benchmarks pending validation completion.</p>
                  ) : (
                    <div className="space-y-3">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={selected.benchmarks.map(b => ({ name: b.name.length > 15 ? b.name.slice(0,15) + '…' : b.name, Champion: b.champion, Challenger: b.challenger ?? 0 }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                          <XAxis dataKey="name" tick={{ fill: ct.text, fontSize: 10 }} />
                          <YAxis tick={{ fill: ct.text, fontSize: 10 }} />
                          <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.text, borderRadius: 0 }} />
                          <Legend />
                          <Bar dataKey="Champion" fill="#6366f1" radius={0} />
                          <Bar dataKey="Challenger" fill="#10b981" radius={0} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[hsl(var(--border))]">
                              {['Metric', 'Champion', 'Challenger', 'Delta', 'Unit'].map(h => (
                                <th key={h} className="px-2 py-2 text-left text-[hsl(var(--text-4))] font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selected.benchmarks.map((b, i) => {
                              const delta = b.challenger !== undefined ? b.challenger - b.champion : 0;
                              const better = b.name.includes('Latency') || b.name.includes('Default') ? delta < 0 : delta > 0;
                              return (
                                <tr key={i} className="border-b border-[hsl(var(--border))]">
                                  <td className="px-2 py-2 font-medium text-[hsl(var(--text-1))]">{b.name}</td>
                                  <td className="px-2 py-2 text-[hsl(var(--text-2))]">{b.champion}</td>
                                  <td className="px-2 py-2 text-[hsl(var(--text-2))]">{b.challenger ?? '—'}</td>
                                  <td className="px-2 py-2 font-semibold" style={{ color: better ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                                    {delta > 0 ? '+' : ''}{delta.toFixed(3)}
                                  </td>
                                  <td className="px-2 py-2 text-[hsl(var(--text-4))]">{b.unit}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="adversarial" className="mt-4">
                  {selected.adversarialResults.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--text-3))] text-center py-8">Adversarial testing pending.</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-[hsl(var(--text-3))]">Attack success rate vs baseline threshold (lower is better)</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={selected.adversarialResults}>
                          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                          <XAxis dataKey="attack" tick={{ fill: ct.text, fontSize: 10 }} />
                          <YAxis tick={{ fill: ct.text, fontSize: 10 }} />
                          <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.text, borderRadius: 0 }} />
                          <Legend />
                          <Bar dataKey="successRate" name="Actual %" fill="#ef4444" radius={0} />
                          <Bar dataKey="baseline" name="Threshold %" fill="#6b7280" radius={0} />
                        </BarChart>
                      </ResponsiveContainer>
                      {selected.adversarialResults.map((a, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 border border-[hsl(var(--border))]">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[hsl(var(--text-1))]">{a.attack}</p>
                            <p className="text-xs text-[hsl(var(--text-3))]">Threshold: ≤{a.baseline}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold" style={{ color: a.successRate <= a.baseline ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>{a.successRate}%</p>
                            <Badge style={{ ...(a.successRate <= a.baseline ? STATUS_COLORS.Passed : STATUS_COLORS.Failed), borderRadius: 0, fontSize: 10 }}>
                              {a.successRate <= a.baseline ? 'PASS' : 'FAIL'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-none flex-1" onClick={() => addToast('Validation report exported as PDF')}>
                  <Download size={13} /> Export PDF Report
                </Button>
                {selected.recommendation !== 'Reject' && (
                  <Button size="sm" className="gap-1.5 rounded-none flex-1" onClick={() => addToast('Approval submitted to MRC')}>
                    <CheckCircle size={13} /> Submit to MRC
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
