import { useState, useMemo } from 'react';
import {
  Eye, Trash, Plus, Warning, ArrowRight, ArrowLeft,
  Play, ShieldCheck, Scales, Brain, Check, CaretRight,
  MagnifyingGlass, Lightning, Info, ArrowsClockwise, X,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Progress } from '../../components/ui/progress';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BIAS_AUDITS, BiasAudit, MODELS, DATASETS, severityColor, statusColor, formatDate,
} from '../../data/seed';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useSettingsStore } from '../../stores/settingsStore';


// ── Score Color ───────────────────────────────────────────────────────────────
function scoreColor(score: number): { bg: string; text: string } {
  if (score >= 0.85) return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
  if (score >= 0.80) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
  return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
}

// ── MetricTile ────────────────────────────────────────────────────────────────
function MetricTile({ label, value, variant }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok';
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Trend chart data ──────────────────────────────────────────────────────────
const TREND_DATA = [
  { month: 'Oct', 'MDL-001': 0.82, 'MDL-002': 0.91, 'MDL-004': 0.70 },
  { month: 'Nov', 'MDL-001': 0.80, 'MDL-002': 0.92, 'MDL-004': 0.68 },
  { month: 'Dec', 'MDL-001': 0.79, 'MDL-002': 0.93, 'MDL-004': 0.65 },
  { month: 'Jan', 'MDL-001': 0.79, 'MDL-002': 0.93, 'MDL-004': 0.67 },
  { month: 'Feb', 'MDL-001': 0.78, 'MDL-002': 0.94, 'MDL-004': 0.62 },
  { month: 'Mar', 'MDL-001': 0.79, 'MDL-002': 0.93, 'MDL-004': 0.67 },
];

// ── Frameworks for wizard ─────────────────────────────────────────────────────
const FRAMEWORKS = [
  { id: 'eu-ai-act', name: 'EU AI Act', icon: Scales, desc: 'EU AI Act Annex III high-risk assessment' },
  { id: 'nist-ai-rmf', name: 'NIST AI RMF', icon: ShieldCheck, desc: 'NIST AI Risk Management Framework MEASURE 2.6' },
  { id: 'eeoc', name: 'EEOC / Title VII', icon: Scales, desc: 'Equal Employment Opportunity Commission guidelines' },
  { id: 'gdpr', name: 'GDPR Art. 22', icon: ShieldCheck, desc: 'Automated individual decision-making assessment' },
  { id: 'iso-42001', name: 'ISO/IEC 42001', icon: Brain, desc: 'AI Management System bias controls' },
  { id: 'custom', name: 'Custom Framework', icon: Lightning, desc: 'Define custom fairness metrics and thresholds' },
];

const DIMENSIONS = ['Gender', 'Age', 'Race/Ethnicity', 'Disability', 'Geography', 'Income', 'Language'];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function BiasAuditWizard() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [audits, setAudits] = useState<BiasAudit[]>(BIAS_AUDITS);
  const [search, setSearch] = useState('');
  const [cfRunning, setCfRunning] = useState(false);
  const [cfDone, setCfDone] = useState(false);

  const runCounterfactualTest = () => {
    setCfRunning(true);
    setCfDone(false);
    setTimeout(() => { setCfRunning(false); setCfDone(true); }, 2200);
  };

  // Detail sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<BiasAudit | null>(null);

  // Wizard modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedFramework, setSelectedFramework] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['Gender', 'Age']);
  const [threshold, setThreshold] = useState('0.85');
  const [running, setRunning] = useState(false);
  const [wizardResult, setWizardResult] = useState<BiasAudit | null>(null);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return audits.filter(a => {
      if (search && !a.modelName.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [audits, search]);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalAudits = audits.length;
  const failedCount = audits.filter(a => a.result === 'failed').length;
  const passedCount = audits.filter(a => a.result === 'passed').length;
  const remediationCount = audits.filter(a => a.status === 'remediation_required' || a.status === 'blocked').length;

  // ── Open detail ───────────────────────────────────────────────────────────
  const openDetail = (audit: BiasAudit) => {
    setSelectedAudit(audit);
    setSheetOpen(true);
  };

  // ── Delete audit ──────────────────────────────────────────────────────────
  const deleteAudit = (id: string) => {
    setAudits(prev => prev.filter(a => a.id !== id));
  };

  // ── Re-run audit ──────────────────────────────────────────────────────────
  const rerunAudit = (audit: BiasAudit) => {
    // Simulate re-run
    const updated = { ...audit, date: new Date().toISOString().split('T')[0], status: audit.result === 'failed' ? 'remediation_required' : 'compliant' };
    setAudits(prev => prev.map(a => a.id === audit.id ? updated : a));
  };

  // ── Wizard run ────────────────────────────────────────────────────────────
  const runWizardAudit = () => {
    setRunning(true);
    setTimeout(() => {
      const dims = selectedDimensions.map(d => ({
        attribute: d,
        score: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
        threshold: parseFloat(threshold),
        pass: false,
      }));
      dims.forEach(d => { d.pass = d.score >= d.threshold; });
      const overall = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length * 100) / 100;
      const result: BiasAudit = {
        id: `BA-${String(audits.length + 1).padStart(3, '0')}`,
        modelId: selectedModel,
        modelName: MODELS.find(m => m.id === selectedModel)?.name || 'Unknown Model',
        dataset: selectedDataset,
        framework: FRAMEWORKS.find(f => f.id === selectedFramework)?.name || 'Custom',
        overallScore: overall,
        result: dims.every(d => d.pass) ? 'passed' : 'failed',
        protectedAttributes: selectedDimensions,
        severity: overall < 0.80 ? 'critical' : overall < 0.85 ? 'high' : 'low',
        date: new Date().toISOString().split('T')[0],
        auditor: 'System (Automated)',
        status: dims.every(d => d.pass) ? 'compliant' : 'remediation_required',
        dimensions: dims,
        recommendations: dims.filter(d => !d.pass).map(d => `Remediate ${d.attribute} bias (score: ${d.score})`),
      };
      setWizardResult(result);
      setRunning(false);
    }, 2500);
  };

  const finalizeWizard = () => {
    if (wizardResult) {
      setAudits(prev => [...prev, wizardResult]);
    }
    setWizardOpen(false);
    setWizardStep(1);
    setWizardResult(null);
    setSelectedFramework('');
    setSelectedModel('');
    setSelectedDataset('');
    setSelectedDimensions(['Gender', 'Age']);
    setThreshold('0.85');
  };

  const toggleDimension = (d: string) => {
    setSelectedDimensions(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Bias Audits</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · Fairness & bias assessment across protected attributes
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <Plus size={14} className="mr-1" />New Bias Audit
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricTile label="Total Audits" value={totalAudits} variant="default" />
          <MetricTile label="Failed" value={failedCount} variant="error" />
          <MetricTile label="Passed" value={passedCount} variant="ok" />
          <MetricTile label="Remediation Needed" value={remediationCount} variant="warn" />
        </div>

        {/* Trend Chart */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Fairness Score Trend</p>
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>6-month window</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="month" tick={{ fill: ct.axis, fontSize: 11 }} />
                <YAxis domain={[0.5, 1.0]} tick={{ fill: ct.axis, fontSize: 11 }} label={{ value: 'Fairness Score', angle: -90, position: 'insideLeft', fill: ct.axis, fontSize: 11 }} />
                <RTooltip
                  contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0.80} stroke="hsl(45 93% 47%)" strokeDasharray="6 3" label={{ value: 'Threshold 0.80', fill: 'hsl(var(--s-wn-tx))', fontSize: 10 }} />
                <Line type="monotone" dataKey="MDL-001" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3 }} name="MDL-001 (Credit Risk)" />
                <Line type="monotone" dataKey="MDL-002" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} name="MDL-002 (Fraud Detection)" />
                <Line type="monotone" dataKey="MDL-004" stroke="hsl(220 90% 56%)" strokeWidth={2} dot={{ r: 3 }} name="MDL-004 (Loan Assistant)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
            <Input
              placeholder="Search audits..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>

        {/* Audit Table */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['BA-ID', 'Model', 'Dataset', 'Framework', 'Score', 'Result', 'Protected Attrs', 'Triggered By', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(audit => {
                    const sc = scoreColor(audit.overallScore);
                    const isFailed = audit.result === 'failed';
                    const isFailedHighlight = ['BA-001', 'BA-003', 'BA-005'].includes(audit.id);
                    return (
                      <tr
                        key={audit.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        style={{
                          borderBottom: '1px solid hsl(var(--border))',
                          borderLeft: isFailedHighlight ? '4px solid hsl(var(--s-er-tx))' : 'none',
                        }}
                        onClick={() => openDetail(audit)}
                      >
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{audit.id}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div>
                            <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{audit.modelName}</span>
                            <span className="block text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{audit.modelId}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{audit.dataset}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{audit.framework}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 12, fontWeight: 700 }}>
                            {audit.overallScore.toFixed(2)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge style={{
                            background: isFailed ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-ok-bg))',
                            color: isFailed ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))',
                            borderRadius: 0, fontSize: 11,
                          }}>
                            {isFailed ? 'Fail' : 'Pass'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {audit.protectedAttributes.map(attr => (
                              <Badge key={attr} className="text-[10px] px-1 py-0" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>
                                {attr}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{audit.auditor}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(audit.date)}</span>
                        </td>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(audit)}>
                              <Eye size={14} style={{ color: 'hsl(var(--text-4))' }} />
                            </Button>
                            {isFailed && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => rerunAudit(audit)}>
                                    <ArrowsClockwise size={14} style={{ color: 'hsl(var(--brand))' }} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent style={{ borderRadius: 0 }}>Re-run Audit</TooltipContent>
                              </Tooltip>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Trash size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent style={{ borderRadius: 0 }}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Bias Audit</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete "{audit.id} — {audit.modelName}"? Audit records should be preserved for compliance.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteAudit(audit.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Intersectional Bias Analysis ─────────────────────────────────── */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Intersectional Bias Analysis</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Cross-cutting protected attributes — fairness scores at attribute intersections (Loan Approval Model v3.0)</p>
              </div>
              <Badge style={{ background: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>MDL-001</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-medium" style={{ color: 'hsl(var(--text-4))' }}>Attribute ↓ / ↓</th>
                    {['Gender', 'Age', 'Race/Ethnicity', 'Geography', 'Income'].map(a => (
                      <th key={a} className="p-2 text-center font-medium" style={{ color: 'hsl(var(--text-4))' }}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { attr: 'Gender', scores: [null, 0.91, 0.74, 0.88, 0.79] },
                    { attr: 'Age', scores: [0.91, null, 0.68, 0.85, 0.72] },
                    { attr: 'Race/Ethnicity', scores: [0.74, 0.68, null, 0.71, 0.65] },
                    { attr: 'Geography', scores: [0.88, 0.85, 0.71, null, 0.83] },
                    { attr: 'Income', scores: [0.79, 0.72, 0.65, 0.83, null] },
                  ].map(row => (
                    <tr key={row.attr}>
                      <td className="p-2 font-medium" style={{ color: 'hsl(var(--text-2))' }}>{row.attr}</td>
                      {row.scores.map((score, i) => (
                        <td key={i} className="p-2 text-center">
                          {score === null ? (
                            <span style={{ color: 'hsl(var(--text-4))' }}>—</span>
                          ) : (
                            <span className="font-mono font-bold text-xs px-2 py-0.5" style={{
                              background: score >= 0.85 ? 'hsl(142 71% 45% / 0.15)' : score >= 0.75 ? 'hsl(45 93% 47% / 0.15)' : 'hsl(0 72% 51% / 0.15)',
                              color: score >= 0.85 ? 'hsl(var(--s-ok-tx))' : score >= 0.75 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                            }}>{score.toFixed(2)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3" style={{ background: 'hsl(142 71% 45% / 0.3)' }} />≥ 0.85 Pass</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3" style={{ background: 'hsl(45 93% 47% / 0.3)' }} />0.75–0.84 Warning</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3" style={{ background: 'hsl(0 72% 51% / 0.3)' }} />&lt; 0.75 Fail</span>
              <span className="ml-auto font-semibold text-[hsl(var(--destructive))]">⚠ 3 critical intersections detected (Race/Ethnicity × Income = 0.65)</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Pre / Post Deployment Comparison ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Pre vs. Post Deployment Audit Comparison</p>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Dimension', 'Pre-Deploy', 'Post-Deploy', 'Δ Change'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-medium" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { dim: 'Gender', pre: 0.87, post: 0.79 },
                    { dim: 'Age', pre: 0.83, post: 0.81 },
                    { dim: 'Race/Ethnicity', pre: 0.80, post: 0.74 },
                    { dim: 'Geography', pre: 0.89, post: 0.88 },
                    { dim: 'Income', pre: 0.82, post: 0.79 },
                  ].map(r => {
                    const delta = r.post - r.pre;
                    return (
                      <tr key={r.dim} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td className="px-2 py-2" style={{ color: 'hsl(var(--text-1))' }}>{r.dim}</td>
                        <td className="px-2 py-2 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.pre.toFixed(2)}</td>
                        <td className="px-2 py-2 font-mono font-bold" style={{ color: r.post >= 0.85 ? 'hsl(var(--s-ok-tx))' : r.post >= 0.75 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>{r.post.toFixed(2)}</td>
                        <td className="px-2 py-2 font-mono font-bold" style={{ color: delta >= 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] mt-2" style={{ color: 'hsl(var(--text-4))' }}>Comparison: BA-002 (pre-deploy, Feb 2026) vs BA-004 (post-deploy, Apr 2026)</p>
            </CardContent>
          </Card>

          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Statistical Significance Indicators</p>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Test', 'Statistic', 'p-value', 'Significance'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-medium" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { test: 'Chi-squared (Gender)', stat: '12.4', p: '0.002', sig: true },
                    { test: 'KS Test (Age)', stat: '0.18', p: '0.041', sig: true },
                    { test: 'PSI (Race)', stat: '0.32', p: '< 0.001', sig: true },
                    { test: 'Fisher (Geography)', stat: '3.2', p: '0.213', sig: false },
                    { test: 'Z-test (Income)', stat: '1.96', p: '0.051', sig: false },
                  ].map(r => (
                    <tr key={r.test} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <td className="px-2 py-2" style={{ color: 'hsl(var(--text-1))' }}>{r.test}</td>
                      <td className="px-2 py-2 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.stat}</td>
                      <td className="px-2 py-2 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.p}</td>
                      <td className="px-2 py-2">
                        <Badge style={{
                          background: r.sig ? 'hsl(0 72% 51% / 0.12)' : 'hsl(142 71% 45% / 0.12)',
                          color: r.sig ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))',
                          borderRadius: 0, fontSize: 9,
                        }}>{r.sig ? 'Significant (α=0.05)' : 'Not significant'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* ── Counterfactual Fairness Testing ──────────────────────────────── */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Counterfactual Fairness Testing</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Would the decision change if only the protected attribute changed? Tested on Loan Approval Model v3.0</p>
              </div>
              <Button size="sm" style={{ borderRadius: 0, background: cfDone ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--brand))', color: cfDone ? 'hsl(var(--s-ok-tx))' : '#fff', border: cfDone ? '1px solid hsl(var(--s-ok-br))' : 'none' }}
                onClick={runCounterfactualTest} disabled={cfRunning}>
                {cfRunning ? 'Running…' : cfDone ? '✓ Re-run Test' : 'Run Counterfactual Test'}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Cases Tested', value: '500', color: 'hsl(var(--text-1))' },
                { label: 'Counterfactually Unfair', value: '87 (17.4%)', color: 'hsl(var(--destructive))' },
                { label: 'Avg Decision Delta', value: '-0.12', color: 'hsl(var(--s-wn-tx))' },
              ].map(s => (
                <div key={s.label} className="p-3 text-center" style={{ border: '1px solid hsl(var(--border))' }}>
                  <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
                  <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Case ID', 'Changed Attribute', 'Original Score', 'Counterfactual Score', 'Decision Changed', 'Fairness Issue'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'CF-001', attr: 'Gender: M → F', orig: 0.72, cf: 0.58, changed: true, issue: 'Approval → Reject' },
                  { id: 'CF-002', attr: 'Race: White → Black', orig: 0.85, cf: 0.69, changed: true, issue: 'Score drop 16pts' },
                  { id: 'CF-003', attr: 'Age: 35 → 55', orig: 0.78, cf: 0.76, changed: false, issue: 'None' },
                  { id: 'CF-004', attr: 'Gender: F → M', orig: 0.61, cf: 0.74, changed: true, issue: 'Reject → Approval' },
                  { id: 'CF-005', attr: 'Race: Black → Asian', orig: 0.68, cf: 0.71, changed: false, issue: 'None' },
                ].map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border))', background: r.changed ? 'hsl(0 72% 51% / 0.04)' : 'transparent' }}>
                    <td className="px-3 py-2 font-mono" style={{ color: 'hsl(var(--brand))' }}>{r.id}</td>
                    <td className="px-3 py-2" style={{ color: 'hsl(var(--text-1))' }}>{r.attr}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.orig.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono font-bold" style={{ color: r.cf < r.orig ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))' }}>{r.cf.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <Badge style={{
                        background: r.changed ? 'hsl(0 72% 51% / 0.12)' : 'hsl(142 71% 45% / 0.12)',
                        color: r.changed ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))',
                        borderRadius: 0, fontSize: 9,
                      }}>{r.changed ? 'Yes — Unfair' : 'No — Fair'}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: r.issue !== 'None' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>{r.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Remediation Recommendation Engine ────────────────────────────── */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Remediation Recommendation Engine</p>
            <div className="space-y-3">
              {[
                {
                  issue: 'Race/Ethnicity × Income intersectional gap (score: 0.65)',
                  priority: 'Critical',
                  recommendations: [
                    'Re-weight training data to address underrepresentation of low-income minority applicants',
                    'Apply adversarial debiasing during model training (FairLearn / AI Fairness 360)',
                    'Implement post-processing: equalized odds calibration per subgroup',
                  ],
                  regulation: 'ECOA, EU AI Act Art. 10, CFPB Fair Lending',
                },
                {
                  issue: 'Gender counterfactual unfairness — 17.4% of decisions change on gender flip',
                  priority: 'High',
                  recommendations: [
                    'Remove or proxy gender-correlated features (e.g., name, address patterns)',
                    'Constrain model using fairness-aware training objective',
                    'Run monthly bias audit with real-time monitoring trigger at 5% threshold',
                  ],
                  regulation: 'EU AI Act Art. 5, Title VII, ECOA',
                },
                {
                  issue: 'Post-deployment score degradation across Race (−0.06) and Gender (−0.08)',
                  priority: 'Medium',
                  recommendations: [
                    'Schedule quarterly re-training with refreshed fairness-balanced datasets',
                    'Set up automated bias monitoring with kill-switch trigger at score < 0.75',
                    'Implement human-in-the-loop review for borderline decisions',
                  ],
                  regulation: 'NIST AI RMF GOVERN 6.1, ISO 42001 Clause 9',
                },
              ].map(item => (
                <div key={item.issue} className="p-3" style={{
                  border: `1px solid ${item.priority === 'Critical' ? 'hsl(0 72% 51% / 0.3)' : item.priority === 'High' ? 'hsl(45 93% 47% / 0.3)' : 'hsl(var(--border))'}`,
                  borderLeft: `4px solid ${item.priority === 'Critical' ? 'hsl(0 72% 51%)' : item.priority === 'High' ? 'hsl(45 93% 47%)' : 'hsl(var(--brand))'}`,
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge style={{
                      background: item.priority === 'Critical' ? 'hsl(0 72% 51% / 0.12)' : item.priority === 'High' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(220 90% 56% / 0.12)',
                      color: item.priority === 'Critical' ? 'hsl(var(--destructive))' : item.priority === 'High' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-in-tx))',
                      borderRadius: 0, fontSize: 9,
                    }}>{item.priority}</Badge>
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.issue}</p>
                  </div>
                  <ul className="space-y-1 mb-2">
                    {item.recommendations.map((r, i) => (
                      <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'hsl(var(--text-3))' }}>
                        <span className="font-bold mt-0.5" style={{ color: 'hsl(var(--brand))' }}>→</span>{r}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Regulatory basis: {item.regulation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Regulatory Mapping Panel ──────────────────────────────────────── */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Regulatory Mapping — Which Audits Satisfy Which Regulation</p>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Regulation / Article', 'Requirement', 'Satisfied By', 'Coverage', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { reg: 'EU AI Act Art. 10', req: 'Training data governance & bias assessment', satisfiedBy: 'BA-001, BA-003', coverage: 85, status: 'Compliant' },
                  { reg: 'EU AI Act Art. 9 Annex III', req: 'Risk management for high-risk AI systems', satisfiedBy: 'BA-001, BA-004', coverage: 70, status: 'Partial' },
                  { reg: 'ECOA / Reg B', req: 'Equal Credit Opportunity — no disparate impact', satisfiedBy: 'BA-003, BA-005', coverage: 60, status: 'Gap Identified' },
                  { reg: 'NIST AI RMF MEASURE 2.6', req: 'AI bias testing and monitoring', satisfiedBy: 'BA-001 – BA-005', coverage: 90, status: 'Compliant' },
                  { reg: 'ISO/IEC 42001 §6.1.2', req: 'AI risk assessment including bias risks', satisfiedBy: 'BA-002, BA-004', coverage: 75, status: 'Compliant' },
                  { reg: 'GDPR Art. 22', req: 'Safeguards for automated decisions', satisfiedBy: 'BA-001', coverage: 55, status: 'Gap Identified' },
                ].map(r => (
                  <tr key={r.reg} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.reg}</td>
                    <td className="px-3 py-2 max-w-[200px]" style={{ color: 'hsl(var(--text-3))' }}>{r.req}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'hsl(var(--brand))' }}>{r.satisfiedBy}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5" style={{ background: 'hsl(var(--border))', maxWidth: 80 }}>
                          <div className="h-full" style={{ width: `${r.coverage}%`, background: r.coverage >= 80 ? 'hsl(142 71% 45%)' : r.coverage >= 65 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)' }} />
                        </div>
                        <span className="font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.coverage}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge style={{
                        background: r.status === 'Compliant' ? 'hsl(142 71% 45% / 0.12)' : r.status === 'Partial' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(0 72% 51% / 0.12)',
                        color: r.status === 'Compliant' ? 'hsl(var(--s-ok-tx))' : r.status === 'Partial' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                        borderRadius: 0, fontSize: 9,
                      }}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Bias Audit Detail Sheet ──────────────────────────────────────── */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
            {selectedAudit && (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedAudit.id}</span>
                    <Badge style={{
                      background: selectedAudit.result === 'failed' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-ok-bg))',
                      color: selectedAudit.result === 'failed' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))',
                      borderRadius: 0,
                    }}>
                      {selectedAudit.result === 'failed' ? 'FAILED' : 'PASSED'}
                    </Badge>
                  </div>
                  <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedAudit.modelName}</SheetTitle>
                </SheetHeader>

                {/* FAILED Banner */}
                {selectedAudit.result === 'failed' && (
                  <div className="mt-3 p-3 flex items-start gap-2" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0 }}>
                    <Warning size={16} weight="bold" style={{ color: 'hsl(var(--s-er-tx))', marginTop: 1 }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>
                        Model promotion blocked. Remediation required before deployment.
                      </p>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 mt-1" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }}>
                        Create Remediation Task →
                      </Button>
                    </div>
                  </div>
                )}

                <Tabs defaultValue="overview" className="mt-4">
                  <TabsList className="w-full" style={{ borderRadius: 0 }}>
                    <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                    <TabsTrigger value="dimensions" style={{ borderRadius: 0 }}>Dimensions</TabsTrigger>
                    <TabsTrigger value="remediation" style={{ borderRadius: 0 }}>Remediation</TabsTrigger>
                    <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
                  </TabsList>

                  {/* Overview */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Overall Score</p>
                        {(() => {
                          const sc = scoreColor(selectedAudit.overallScore);
                          return (
                            <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 16, fontWeight: 700 }}>
                              {selectedAudit.overallScore.toFixed(2)}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Framework</p>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedAudit.framework}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Dataset</p>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedAudit.dataset}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Date</p>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedAudit.date)}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Auditor</p>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{selectedAudit.auditor}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Status</p>
                        <Badge style={{ background: statusColor(selectedAudit.status).bg, color: statusColor(selectedAudit.status).text, borderRadius: 0 }}>
                          {selectedAudit.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Protected Attributes</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedAudit.protectedAttributes.map(a => (
                          <Badge key={a} style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 11 }}>{a}</Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Dimension Results */}
                  <TabsContent value="dimensions" className="space-y-4 mt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          {['Dimension', 'Score', 'Threshold', 'Pass/Fail'].map(h => (
                            <th key={h} className="px-2 py-2 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAudit.dimensions.map((dim) => {
                          const dimSc = scoreColor(dim.score);
                          return (
                            <tr
                              key={dim.attribute}
                              style={{
                                borderBottom: '1px solid hsl(var(--border))',
                                background: !dim.pass ? 'hsl(var(--s-er-bg))' : 'transparent',
                              }}
                            >
                              <td className="px-2 py-2">
                                <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{dim.attribute}</span>
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 max-w-[80px]">
                                    <Progress
                                      value={dim.score * 100}
                                      className="h-1.5"
                                      style={{ borderRadius: 0 }}
                                    />
                                  </div>
                                  <Badge style={{ background: dimSc.bg, color: dimSc.text, borderRadius: 0, fontSize: 11, fontWeight: 700 }}>
                                    {dim.score.toFixed(2)}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>≥ {dim.threshold.toFixed(2)}</span>
                              </td>
                              <td className="px-2 py-2">
                                <Badge style={{
                                  background: dim.pass ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
                                  color: dim.pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                                  borderRadius: 0, fontSize: 10,
                                }}>
                                  {dim.pass ? 'Pass' : 'Fail'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </TabsContent>

                  {/* Remediation */}
                  <TabsContent value="remediation" className="space-y-4 mt-4">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Recommendations</p>
                    {selectedAudit.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <CaretRight size={12} style={{ color: 'hsl(var(--brand))', marginTop: 2 }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{rec}</span>
                      </div>
                    ))}
                    {selectedAudit.result === 'failed' && (
                      <div className="p-3" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0 }}>
                        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>
                          Deployment blocked until all dimensions meet threshold. Contact {selectedAudit.auditor} for remediation plan.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Activity */}
                  <TabsContent value="activity" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      {[
                        { date: selectedAudit.date, action: `Bias audit ${selectedAudit.result}`, actor: selectedAudit.auditor },
                        { date: selectedAudit.date, action: 'Audit initiated', actor: 'System' },
                      ].map((entry, i) => (
                        <div key={i} className="flex gap-3 p-2" style={{ borderLeft: '2px solid hsl(var(--brand))', borderRadius: 0 }}>
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.action}</p>
                            <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(entry.date)} · {entry.actor}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ── Wizard Modal ─────────────────────────────────────────────────── */}
        <Dialog open={wizardOpen} onOpenChange={(o) => { if (!o) { setWizardOpen(false); setWizardStep(1); setWizardResult(null); } else { setWizardOpen(true); } }}>
          <DialogContent className="sm:max-w-2xl" style={{ borderRadius: 0, maxHeight: '85vh', overflow: 'auto' }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>
                New Bias Audit — Step {wizardStep} of 4
              </DialogTitle>
            </DialogHeader>

            {/* Progress */}
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center gap-1">
                  <div
                    className="flex items-center justify-center w-7 h-7 text-xs font-bold"
                    style={{
                      background: s <= wizardStep ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                      color: s <= wizardStep ? '#fff' : 'hsl(var(--text-4))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 0,
                    }}
                  >
                    {s < wizardStep ? <Check size={12} /> : s}
                  </div>
                  {s < 4 && <div className="w-8 h-px" style={{ background: s < wizardStep ? 'hsl(var(--brand))' : 'hsl(var(--border))' }} />}
                </div>
              ))}
            </div>

            {/* Step 1: Framework */}
            {wizardStep === 1 && (
              <div className="space-y-3 mt-4">
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Select Fairness Framework</p>
                <div className="grid grid-cols-3 gap-3">
                  {FRAMEWORKS.map(fw => (
                    <div
                      key={fw.id}
                      className="p-3 space-y-2 cursor-pointer transition-colors"
                      style={{
                        background: selectedFramework === fw.id ? 'hsl(var(--brand) / 0.08)' : 'hsl(var(--bg-surface))',
                        border: selectedFramework === fw.id ? '2px solid hsl(var(--brand))' : '1px solid hsl(var(--border))',
                        borderRadius: 0,
                      }}
                      onClick={() => setSelectedFramework(fw.id)}
                    >
                      <fw.icon size={20} style={{ color: 'hsl(var(--brand))' }} />
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{fw.name}</p>
                      <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{fw.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Model */}
            {wizardStep === 2 && (
              <div className="space-y-3 mt-4">
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Select Model to Audit</p>
                <div className="space-y-2">
                  {MODELS.map(m => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 cursor-pointer transition-colors"
                      style={{
                        background: selectedModel === m.id ? 'hsl(var(--brand) / 0.08)' : 'hsl(var(--bg-surface))',
                        border: selectedModel === m.id ? '2px solid hsl(var(--brand))' : '1px solid hsl(var(--border))',
                        borderRadius: 0,
                      }}
                      onClick={() => setSelectedModel(m.id)}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{m.id} · {m.type} · {m.riskTier} risk</p>
                      </div>
                      <Badge style={{ background: severityColor(m.riskTier === 'high' || m.riskTier === 'unacceptable' ? 'high' : m.riskTier === 'limited' ? 'medium' : 'low').bg, color: severityColor(m.riskTier === 'high' || m.riskTier === 'unacceptable' ? 'high' : m.riskTier === 'limited' ? 'medium' : 'low').text, borderRadius: 0, fontSize: 10 }}>
                        {m.riskTier}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Dataset + Dimensions + Threshold */}
            {wizardStep === 3 && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Select Dataset</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DATASETS.filter(d => d.status === 'active').map(d => (
                      <div
                        key={d.id}
                        className="p-2 cursor-pointer transition-colors"
                        style={{
                          background: selectedDataset === d.id ? 'hsl(var(--brand) / 0.08)' : 'hsl(var(--bg-surface))',
                          border: selectedDataset === d.id ? '2px solid hsl(var(--brand))' : '1px solid hsl(var(--border))',
                          borderRadius: 0,
                        }}
                        onClick={() => setSelectedDataset(d.id)}
                      >
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{d.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{d.id} · {d.records.toLocaleString()} records</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Protected Dimensions</p>
                  <div className="flex flex-wrap gap-2">
                    {DIMENSIONS.map(d => (
                      <Badge
                        key={d}
                        className="cursor-pointer px-2 py-1"
                        style={{
                          background: selectedDimensions.includes(d) ? 'hsl(var(--brand) / 0.15)' : 'hsl(var(--bg-surface))',
                          color: selectedDimensions.includes(d) ? 'hsl(var(--brand))' : 'hsl(var(--text-4))',
                          border: selectedDimensions.includes(d) ? '1px solid hsl(var(--brand))' : '1px solid hsl(var(--border))',
                          borderRadius: 0,
                        }}
                        onClick={() => toggleDimension(d)}
                      >
                        {selectedDimensions.includes(d) && <Check size={10} className="mr-1" />}
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Fairness Threshold</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.60}
                      max={0.95}
                      step={0.01}
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono font-bold w-12 text-center" style={{ color: 'hsl(var(--text-1))' }}>
                      {parseFloat(threshold).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review + Run */}
            {wizardStep === 4 && (
              <div className="space-y-4 mt-4">
                {!running && !wizardResult && (
                  <>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Review & Run</p>
                    <div className="space-y-2 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'hsl(var(--text-4))' }}>Framework</span>
                        <span style={{ color: 'hsl(var(--text-1))' }}>{FRAMEWORKS.find(f => f.id === selectedFramework)?.name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'hsl(var(--text-4))' }}>Model</span>
                        <span style={{ color: 'hsl(var(--text-1))' }}>{MODELS.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'hsl(var(--text-4))' }}>Dataset</span>
                        <span style={{ color: 'hsl(var(--text-1))' }}>{selectedDataset}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'hsl(var(--text-4))' }}>Dimensions</span>
                        <span style={{ color: 'hsl(var(--text-1))' }}>{selectedDimensions.join(', ')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'hsl(var(--text-4))' }}>Threshold</span>
                        <span style={{ color: 'hsl(var(--text-1))' }}>≥ {parseFloat(threshold).toFixed(2)}</span>
                      </div>
                    </div>
                    <Button onClick={runWizardAudit} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff', width: '100%' }}>
                      <Play size={14} className="mr-1.5" />Run Bias Audit
                    </Button>
                  </>
                )}
                {running && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <ArrowsClockwise size={32} className="animate-spin" style={{ color: 'hsl(var(--brand))' }} />
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Running bias audit...</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Analyzing {selectedDimensions.length} dimensions across {DATASETS.find(d => d.id === selectedDataset)?.records.toLocaleString() || '—'} records</p>
                  </div>
                )}
                {wizardResult && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {wizardResult.result === 'passed' ? (
                        <ShieldCheck size={20} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                      ) : (
                        <Warning size={20} style={{ color: 'hsl(var(--s-er-tx))' }} />
                      )}
                      <p className="text-sm font-bold" style={{ color: wizardResult.result === 'passed' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                        Audit {wizardResult.result === 'passed' ? 'PASSED' : 'FAILED'} — Score: {wizardResult.overallScore.toFixed(2)}
                      </p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          {['Dimension', 'Score', 'Threshold', 'Result'].map(h => (
                            <th key={h} className="px-2 py-2 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {wizardResult.dimensions.map(d => (
                          <tr key={d.attribute} style={{ borderBottom: '1px solid hsl(var(--border))', background: !d.pass ? 'hsl(var(--s-er-bg))' : 'transparent' }}>
                            <td className="px-2 py-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{d.attribute}</td>
                            <td className="px-2 py-2 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{d.score.toFixed(2)}</td>
                            <td className="px-2 py-2 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>≥ {d.threshold.toFixed(2)}</td>
                            <td className="px-2 py-2">
                              <Badge style={{
                                background: d.pass ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
                                color: d.pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                                borderRadius: 0, fontSize: 10,
                              }}>
                                {d.pass ? 'Pass' : 'Fail'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Button onClick={finalizeWizard} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff', width: '100%' }}>
                      Save Audit Results
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            {!running && !wizardResult && (
              <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <Button
                  variant="outline"
                  onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                  disabled={wizardStep === 1}
                  style={{ borderRadius: 0 }}
                >
                  <ArrowLeft size={14} className="mr-1" />Back
                </Button>
                <Button
                  onClick={() => setWizardStep(s => Math.min(4, s + 1))}
                  disabled={
                    (wizardStep === 1 && !selectedFramework) ||
                    (wizardStep === 2 && !selectedModel) ||
                    (wizardStep === 3 && (!selectedDataset || selectedDimensions.length === 0)) ||
                    wizardStep === 4
                  }
                  style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                >
                  Next<ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
