// @ts-nocheck
import { useState, useMemo } from 'react';
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { toast } from 'sonner';
import {
  Plus, Eye, Trash, MagnifyingGlass, CheckCircle,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useChartTheme } from '../hooks/useChartTheme';


type Art10Status = 'Met' | 'Partial' | 'Not Met';

interface DQAssessment {
  id: string;
  dataset: string;
  linkedModel: string;
  overallScore: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  representativeness: number;
  biasScore: number;
  relevance: number;
  timeliness: number;
  art10Status: Art10Status;
  assessmentMethod: 'Automated' | 'Manual' | 'Hybrid';
  assessor?: string;
  date: string;
  deficiencies: { issue: string; dimension: string; severity: string; remediation: string }[];
}

const SEED: DQAssessment[] = [
  { id: 'DQ-001', dataset: 'Consumer Credit DS', linkedModel: 'Credit Risk Scorer', overallScore: 78, completeness: 92, accuracy: 85, consistency: 80, representativeness: 71, biasScore: 0.74, relevance: 88, timeliness: 82, art10Status: 'Partial', assessmentMethod: 'Automated', date: '2026-03-01', deficiencies: [{ issue: 'Underrepresentation of minority groups', dimension: 'Representativeness', severity: 'High', remediation: 'Augment training data with diverse samples' }] },
  { id: 'DQ-002', dataset: 'Transaction Fraud DS', linkedModel: 'Fraud Detection Engine', overallScore: 91, completeness: 98, accuracy: 93, consistency: 94, representativeness: 88, biasScore: 0.91, relevance: 95, timeliness: 96, art10Status: 'Met', assessmentMethod: 'Automated', date: '2026-03-10', deficiencies: [] },
  { id: 'DQ-003', dataset: 'HR Recruitment DS', linkedModel: 'HR Screening System', overallScore: 61, completeness: 78, accuracy: 70, consistency: 65, representativeness: 52, biasScore: 0.68, relevance: 72, timeliness: 60, art10Status: 'Not Met', assessmentMethod: 'Manual', assessor: 'David Kim', date: '2026-03-15', deficiencies: [{ issue: 'Severe gender bias in historical hiring data', dimension: 'Bias-Free', severity: 'Critical', remediation: 'Rebalance dataset and apply bias correction' }, { issue: 'Low geographic diversity', dimension: 'Representativeness', severity: 'High', remediation: 'Expand data collection to underrepresented regions' }] },
  { id: 'DQ-004', dataset: 'AML History DS', linkedModel: 'AML Transaction Monitor', overallScore: 89, completeness: 95, accuracy: 91, consistency: 90, representativeness: 86, biasScore: 0.88, relevance: 93, timeliness: 89, art10Status: 'Met', assessmentMethod: 'Automated', date: '2026-02-20', deficiencies: [] },
  { id: 'DQ-005', dataset: 'Policy Corpus DS', linkedModel: 'Customer Service Chatbot', overallScore: 82, completeness: 88, accuracy: 84, consistency: 83, representativeness: 78, biasScore: 0.82, relevance: 86, timeliness: 80, art10Status: 'Partial', assessmentMethod: 'Hybrid', date: '2026-02-15', deficiencies: [{ issue: 'Some policy documents outdated (>2 years)', dimension: 'Timeliness', severity: 'Medium', remediation: 'Update policy corpus with current documentation' }] },
  { id: 'DQ-006', dataset: 'Employee HR Records DS', linkedModel: 'HR Screening System', overallScore: 55, completeness: 72, accuracy: 60, consistency: 58, representativeness: 48, biasScore: 0.62, relevance: 65, timeliness: 55, art10Status: 'Not Met', assessmentMethod: 'Manual', assessor: 'James Patel', date: '2026-03-20', deficiencies: [{ issue: 'Significant data gaps for remote workers', dimension: 'Completeness', severity: 'High', remediation: 'Collect missing employment records' }, { issue: 'Performance ratings show systematic bias', dimension: 'Bias-Free', severity: 'Critical', remediation: 'Review and recalibrate rating methodology' }] },
];

const DIMENSIONS = ['Completeness', 'Accuracy', 'Consistency', 'Representativeness', 'Bias-Free', 'Relevance', 'Timeliness'];

function art10Color(s: Art10Status) {
  switch (s) {
    case 'Met': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'Partial': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
    case 'Not Met': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
  }
}

function scorePct(n: number) {
  if (n >= 85) return 'hsl(var(--s-ok-tx))';
  if (n >= 70) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--s-er-tx))';
}

function MetricTile({ label, value, variant }: { label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok' }) {
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

function dqToRadar(dq: DQAssessment) {
  return [
    { subject: 'Completeness', value: dq.completeness },
    { subject: 'Accuracy', value: dq.accuracy },
    { subject: 'Consistency', value: dq.consistency },
    { subject: 'Representativeness', value: dq.representativeness },
    { subject: 'Bias-Free', value: Math.round(dq.biasScore * 100) },
    { subject: 'Relevance', value: dq.relevance },
    { subject: 'Timeliness', value: dq.timeliness },
  ];
}

export default function DataQuality() {
  const ct = useChartTheme();
  const { data: items, setData: setItems } = useSupabaseTable('dataquality_table', SEED);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DQAssessment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Wizard state
  const [wDataset, setWDataset] = useState('');
  const [wModel, setWModel] = useState('');
  const [wMethod, setWMethod] = useState<'Automated' | 'Manual' | 'Hybrid'>('Automated');
  const [wDims, setWDims] = useState<Record<string, number>>({ Completeness: 80, Accuracy: 80, Consistency: 80, Representativeness: 70, Relevance: 80, Timeliness: 80 });
  const [wBias, setWBias] = useState(0.80);

  const filtered = useMemo(() => items.filter(i =>
    !search || i.dataset.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  const assessed = items.length;
  const passing = items.filter(i => i.art10Status === 'Met').length;
  const warning = items.filter(i => i.art10Status === 'Partial').length;
  const failing = items.filter(i => i.art10Status === 'Not Met').length;

  const avgScore = Math.round(items.reduce((a, i) => a + i.overallScore, 0) / items.length);
  const topThree = [...items].sort((a, b) => b.overallScore - a.overallScore).slice(0, 3);

  const autoStatus = (score: number): Art10Status => score >= 85 ? 'Met' : score >= 70 ? 'Partial' : 'Not Met';

  function submitCreate() {
    const scores = Object.values(wDims);
    const overall = Math.round((scores.reduce((a, v) => a + v, 0) / scores.length + wBias * 100) / 2);
    const newItem: DQAssessment = {
      id: `DQ-${String(items.length + 1).padStart(3, '0')}`,
      dataset: wDataset || 'New Dataset',
      linkedModel: wModel || 'Unknown Model',
      overallScore: overall,
      completeness: wDims.Completeness || 80,
      accuracy: wDims.Accuracy || 80,
      consistency: wDims.Consistency || 80,
      representativeness: wDims.Representativeness || 70,
      biasScore: wBias,
      relevance: wDims.Relevance || 80,
      timeliness: wDims.Timeliness || 80,
      art10Status: autoStatus(overall),
      assessmentMethod: wMethod,
      date: new Date().toISOString().split('T')[0],
      deficiencies: [],
    };
    setItems(prev => [newItem, ...prev]);
    toast.success(`Assessment "${newItem.id}" created for ${newItem.dataset}`);
    setCreateOpen(false);
    setWDataset(''); setWModel('');
  }

  function deleteItem(id: string) {
    const item = items.find(i => i.id === id);
    if (item) toast.success(`Assessment "${item.id}" removed`);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  // Radar data for top 3
  const radarData = DIMENSIONS.map(dim => {
    const entry: Record<string, number | string> = { subject: dim };
    topThree.forEach(dq => {
      entry[dq.dataset] = dim === 'Bias-Free' ? Math.round(dq.biasScore * 100) :
        dim === 'Completeness' ? dq.completeness : dim === 'Accuracy' ? dq.accuracy :
        dim === 'Consistency' ? dq.consistency : dim === 'Representativeness' ? dq.representativeness :
        dim === 'Relevance' ? dq.relevance : dq.timeliness;
    });
    return entry;
  });

  const RADAR_COLORS = [ct.colors[0], ct.colors[1], ct.colors[2]];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Data Quality Assessment</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>EU AI Act Article 10 — validate training data for high-risk AI systems</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0 }}>
          <Plus size={15} className="mr-1.5" /> Run Assessment
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Datasets Assessed" value={assessed} variant="default" />
        <MetricTile label="Passing (Art.10 Met)" value={passing} variant="ok" />
        <MetricTile label="Warning (Partial)" value={warning} variant="warn" />
        <MetricTile label="Failing (Not Met)" value={failing} variant="error" />
      </div>

      {/* Radar chart */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Quality Dimensions — Top 3 Datasets</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={ct.grid} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: ct.text, fontSize: 11 }} />
                  {topThree.map((dq, i) => (
                    <Radar key={dq.id} name={dq.dataset} dataKey={dq.dataset} stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.15} />
                  ))}
                  <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.grid}`, borderRadius: 0 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {topThree.map((dq, i) => (
                <div key={dq.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 flex-shrink-0" style={{ background: RADAR_COLORS[i] }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{dq.dataset}</p>
                    <p className="text-xs" style={{ color: scorePct(dq.overallScore) }}>{dq.overallScore}% overall</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <MagnifyingGlass size={15} style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search assessments..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0 bg-transparent" style={{ color: 'hsl(var(--text-1))' }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  {['DQ ID', 'Dataset', 'Overall Score', 'Completeness', 'Accuracy', 'Representativeness', 'Bias Score', 'EU AI Act Art.10', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const ac = art10Color(item.art10Status);
                  const isFailing = item.art10Status === 'Not Met';
                  return (
                    <tr key={item.id} className="border-b hover:bg-[hsl(var(--bg-raised))] transition-colors cursor-pointer"
                      style={{ borderColor: 'hsl(var(--border))', borderLeft: isFailing ? '3px solid hsl(var(--s-er-tx))' : 'none' }}
                      onClick={() => { setSelected(item); setSheetOpen(true); }}>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{item.id}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{item.dataset}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm font-bold" style={{ color: scorePct(item.overallScore) }}>{item.overallScore}%</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: scorePct(item.completeness) }}>{item.completeness}%</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: scorePct(item.accuracy) }}>{item.accuracy}%</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: scorePct(item.representativeness) }}>{item.representativeness}%</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: item.biasScore >= 0.85 ? 'hsl(var(--s-ok-tx))' : item.biasScore >= 0.70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))' }}>
                        {item.biasScore.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5 font-medium" style={{ background: ac.bg, color: ac.text, borderRadius: 0 }}>{item.art10Status}</span>
                      </td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                            onClick={() => { setSelected(item); setSheetOpen(true); }}>
                            <Eye size={13} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }}>
                                <Trash size={13} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                                <AlertDialogDescription>Delete {item.id}? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction style={{ borderRadius: 0 }} onClick={() => deleteItem(item.id)}>Delete</AlertDialogAction>
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

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent style={{ width: 560, borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{selected.id}</span>
                  {selected.dataset}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="dimensions" style={{ borderRadius: 0 }}>Dimensions</TabsTrigger>
                  <TabsTrigger value="deficiencies" style={{ borderRadius: 0 }}>Deficiencies</TabsTrigger>
                  <TabsTrigger value="remediation" style={{ borderRadius: 0 }}>Remediation</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-3">
                  {[
                    { label: 'Dataset', value: selected.dataset },
                    { label: 'Linked Model', value: selected.linkedModel },
                    { label: 'Overall Score', value: `${selected.overallScore}%` },
                    { label: 'EU AI Act Art.10', value: selected.art10Status },
                    { label: 'Assessment Method', value: selected.assessmentMethod },
                    { label: 'Date', value: selected.date },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="dimensions" className="mt-4 space-y-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={dqToRadar(selected)}>
                      <PolarGrid stroke={ct.grid} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: ct.text, fontSize: 10 }} />
                      <Radar name={selected.dataset} dataKey="value" stroke={ct.colors[0]} fill={ct.colors[0]} fillOpacity={0.25} />
                      <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.grid}`, borderRadius: 0 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                  {DIMENSIONS.map(dim => {
                    const val = dim === 'Bias-Free' ? Math.round(selected.biasScore * 100) :
                      dim === 'Completeness' ? selected.completeness : dim === 'Accuracy' ? selected.accuracy :
                      dim === 'Consistency' ? selected.consistency : dim === 'Representativeness' ? selected.representativeness :
                      dim === 'Relevance' ? selected.relevance : selected.timeliness;
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <span className="text-xs w-28 flex-shrink-0" style={{ color: 'hsl(var(--text-3))' }}>{dim}</span>
                        <div className="flex-1 h-1.5 bg-[hsl(var(--bg-raised))]">
                          <div className="h-full" style={{ width: `${val}%`, background: scorePct(val) }} />
                        </div>
                        <span className="text-xs tabular-nums w-8 text-right" style={{ color: scorePct(val) }}>{val}%</span>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="deficiencies" className="mt-4 space-y-2">
                  {selected.deficiencies.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 border" style={{ borderColor: 'hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))', borderRadius: 0 }}>
                      <CheckCircle size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                      <span className="text-sm" style={{ color: 'hsl(var(--s-ok-tx))' }}>No deficiencies identified</span>
                    </div>
                  ) : selected.deficiencies.map((d, i) => (
                    <div key={i} className="p-3 border" style={{ borderColor: 'hsl(var(--s-er-br))', background: 'hsl(var(--s-er-bg))', borderRadius: 0 }}>
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>{d.issue}</p>
                      <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--text-3))' }}>Dimension: {d.dimension} · Severity: {d.severity}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Remediation: {d.remediation}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="remediation" className="mt-4">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Remediation tasks linked to this assessment.</p>
                  {selected.deficiencies.length === 0 ? (
                    <p className="text-xs mt-3" style={{ color: 'hsl(var(--text-4))' }}>No remediation required.</p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {selected.deficiencies.map((d, i) => (
                        <div key={i} className="p-3 border" style={{ borderColor: 'hsl(var(--border))' }}>
                          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{d.remediation}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Status: Open · Priority: {d.severity}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Run Assessment Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle>Run Data Quality Assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Dataset *</label>
                <Input style={{ borderRadius: 0 }} value={wDataset} onChange={e => setWDataset(e.target.value)} placeholder="e.g. Consumer Credit DS" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Linked Model *</label>
                <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wModel} onChange={e => setWModel(e.target.value)}>
                  <option value="">Select model...</option>
                  {['Credit Risk Scorer', 'Fraud Detection Engine', 'Loan Approval Assistant', 'HR Screening System', 'Customer Service Chatbot'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Assessment Method</label>
              <div className="flex gap-2">
                {(['Automated', 'Manual', 'Hybrid'] as const).map(m => (
                  <button key={m} onClick={() => setWMethod(m)}
                    className="flex-1 py-1.5 text-sm border font-medium transition-colors"
                    style={{ borderRadius: 0, borderColor: wMethod === m ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wMethod === m ? 'hsl(var(--brand-subtle))' : 'transparent', color: wMethod === m ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Quality Dimensions (0–100)</p>
              {['Completeness', 'Accuracy', 'Consistency', 'Representativeness', 'Relevance', 'Timeliness'].map(dim => (
                <div key={dim} className="flex items-center gap-3">
                  <span className="text-xs w-28 flex-shrink-0" style={{ color: 'hsl(var(--text-3))' }}>{dim}</span>
                  <input type="range" min={0} max={100} value={wDims[dim] ?? 80}
                    onChange={e => setWDims(prev => ({ ...prev, [dim]: Number(e.target.value) }))}
                    className="flex-1" />
                  <span className="text-xs tabular-nums w-8 text-right font-medium" style={{ color: scorePct(wDims[dim] ?? 80) }}>{wDims[dim] ?? 80}%</span>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <span className="text-xs w-28 flex-shrink-0" style={{ color: 'hsl(var(--text-3))' }}>Bias Score</span>
                <input type="range" min={0} max={100} value={Math.round(wBias * 100)}
                  onChange={e => setWBias(Number(e.target.value) / 100)}
                  className="flex-1" />
                <span className="text-xs tabular-nums w-8 text-right font-medium" style={{ color: wBias >= 0.85 ? 'hsl(var(--s-ok-tx))' : wBias >= 0.70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))' }}>{wBias.toFixed(2)}</span>
              </div>
            </div>

            {/* Auto status preview */}
            {wDataset && (
              <div className="p-2 border" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Estimated EU AI Act Art.10 status: <strong style={{ color: (() => { const avg = Math.round((Object.values(wDims).reduce((a, v) => a + v, 0) / Object.values(wDims).length + wBias * 100) / 2); return scorePct(avg); })() }}>{autoStatus(Math.round((Object.values(wDims).reduce((a, v) => a + v, 0) / Object.values(wDims).length + wBias * 100) / 2))}</strong></p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={submitCreate}>Run Assessment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
