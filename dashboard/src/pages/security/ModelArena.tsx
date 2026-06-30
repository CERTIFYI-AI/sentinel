import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Robot, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, ArrowUp, ArrowDown, Minus, ChartBar,
} from '@phosphor-icons/react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useEffect } from 'react'
import { useRedTeamCampaigns } from '../../hooks/queries/useSecurity'


interface ModelBenchmark {
  id: string;
  name: string;
  provider: string;
  version: string;
  status: 'production' | 'staging' | 'deprecated' | 'evaluation';
  promptInjectionResistance: number;
  piiLeakage: number;       // lower is better (inverted display)
  hallucinationRate: number; // lower is better (inverted display)
  jailbreakResistance: number;
  outputSafety: number;
  biasScore: number;        // lower is better (inverted)
  overallScore: number;
  lastEvaluated: string;
  description: string;
}

const MOCK_MODELS: ModelBenchmark[] = [
  { id: 'MB-001', name: 'GPT-4o', provider: 'OpenAI', version: '2024-08-06', status: 'production', promptInjectionResistance: 87, piiLeakage: 4, hallucinationRate: 8, jailbreakResistance: 92, outputSafety: 95, biasScore: 12, overallScore: 88, lastEvaluated: '2026-04-01', description: 'OpenAI GPT-4o production model used for primary LLM inference.' },
  { id: 'MB-002', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', version: '20241022', status: 'production', promptInjectionResistance: 91, piiLeakage: 2, hallucinationRate: 6, jailbreakResistance: 94, outputSafety: 97, biasScore: 8, overallScore: 93, lastEvaluated: '2026-04-01', description: 'Anthropic Claude 3.5 Sonnet — highest security benchmark scores.' },
  { id: 'MB-003', name: 'Llama 3.1 70B', provider: 'Meta', version: '3.1-70b-instruct', status: 'staging', promptInjectionResistance: 72, piiLeakage: 9, hallucinationRate: 14, jailbreakResistance: 78, outputSafety: 82, biasScore: 18, overallScore: 72, lastEvaluated: '2026-03-28', description: 'Meta Llama 3.1 70B — on-premise deployment candidate under evaluation.' },
  { id: 'MB-004', name: 'Gemini 1.5 Pro', provider: 'Google', version: '001', status: 'evaluation', promptInjectionResistance: 83, piiLeakage: 5, hallucinationRate: 10, jailbreakResistance: 88, outputSafety: 91, biasScore: 14, overallScore: 84, lastEvaluated: '2026-03-25', description: 'Google Gemini 1.5 Pro — multimodal capability evaluation.' },
  { id: 'MB-005', name: 'Mistral Large 2', provider: 'Mistral AI', version: '2407', status: 'staging', promptInjectionResistance: 79, piiLeakage: 7, hallucinationRate: 11, jailbreakResistance: 84, outputSafety: 87, biasScore: 15, overallScore: 79, lastEvaluated: '2026-03-20', description: 'Mistral Large 2 — European model for GDPR-compliant deployments.' },
  { id: 'MB-006', name: 'GPT-3.5 Turbo', provider: 'OpenAI', version: '0125', status: 'deprecated', promptInjectionResistance: 61, piiLeakage: 16, hallucinationRate: 22, jailbreakResistance: 65, outputSafety: 74, biasScore: 24, overallScore: 59, lastEvaluated: '2026-02-15', description: 'OpenAI GPT-3.5 Turbo — legacy model, migration in progress.' },
];

const RADAR_KEYS = [
  { key: 'promptInjectionResistance', label: 'Prompt Injection' },
  { key: 'jailbreakResistance', label: 'Jailbreak Resist' },
  { key: 'outputSafety', label: 'Output Safety' },
  { key: 'piiResistance', label: 'PII Resistance' },
  { key: 'accuracyScore', label: 'Accuracy' },
  { key: 'biasResistance', label: 'Bias Resistance' },
];

function statusStyle(status: string) {
  switch (status) {
    case 'production': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'staging': return { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f640' };
    case 'evaluation': return { bg: 'hsl(var(--tag-purple-bg))', text: 'hsl(var(--tag-purple))', border: 'hsl(var(--tag-purple-border))' };
    case 'deprecated': return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  }
}

function scoreColor(score: number) {
  if (score >= 85) return 'hsl(var(--s-ok-tx))';
  if (score >= 70) return '#eab308';
  return 'hsl(var(--s-er-tx))';
}

function modelToRadar(m: ModelBenchmark) {
  return [
    { subject: 'Prompt Injection', value: m.promptInjectionResistance },
    { subject: 'Jailbreak Resist', value: m.jailbreakResistance },
    { subject: 'Output Safety', value: m.outputSafety },
    { subject: 'PII Resistance', value: 100 - m.piiLeakage },
    { subject: 'Accuracy', value: 100 - m.hallucinationRate },
    { subject: 'Bias Resistance', value: 100 - m.biasScore },
  ];
}

const COLORS = ['#3b82f6', 'hsl(var(--s-ok-tx))', 'hsl(var(--tag-purple))', 'hsl(var(--r-hi-tx))', '#ec4899', 'hsl(var(--s-in-tx))'];

const EMPTY_MODEL: Omit<ModelBenchmark, 'id'> = {
  name: '', provider: 'OpenAI', version: '', status: 'evaluation',
  promptInjectionResistance: 80, piiLeakage: 5, hallucinationRate: 10,
  jailbreakResistance: 80, outputSafety: 90, biasScore: 10, overallScore: 80,
  lastEvaluated: new Date().toISOString().split('T')[0], description: '',
};

export default function ModelArena() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const { data: supabaseModels = [] } = useRedTeamCampaigns()
  const [models, setModels] = useState<ModelBenchmark[]>(MOCK_MODELS);
  useEffect(() => { if (supabaseModels.length > 0) setModels(supabaseModels as any) }, [supabaseModels]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedModel, setSelectedModel] = useState<ModelBenchmark>(MOCK_MODELS[1]);

  const [viewItem, setViewItem] = useState<ModelBenchmark | null>(null);
  const [editItem, setEditItem] = useState<ModelBenchmark | null>(null);
  const [deleteItem, setDeleteItem] = useState<ModelBenchmark | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<ModelBenchmark, 'id'>>(EMPTY_MODEL);

  const filtered = models.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
    const matchStat = filterStatus === 'all' || m.status === filterStatus;
    return matchSearch && matchStat;
  });

  const overallData = [...models].sort((a, b) => b.overallScore - a.overallScore).map(m => ({
    name: m.name, score: m.overallScore,
  }));

  const stats = [
    { label: 'Total Models', value: models.length, icon: Robot },
    { label: 'Production', value: models.filter(m => m.status === 'production').length, icon: ChartBar },
    { label: 'Avg Security Score', value: `${models.length > 0 ? Math.round(models.reduce((s, m) => s + m.overallScore, 0) / models.length) : 0}%`, icon: ArrowUp },
    { label: 'Under Evaluation', value: models.filter(m => m.status === 'evaluation' || m.status === 'staging').length, icon: Minus },
  ];

  function handleCreate() {
    const id = `MB-${String(models.length + 1).padStart(3, '0')}`;
    setModels(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_MODEL);
  }

  function handleEdit() {
    if (!editItem) return;
    setModels(prev => prev.map(m => m.id === editItem.id ? editItem : m));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setModels(prev => prev.filter(m => m.id !== deleteItem.id));
    setDeleteItem(null);
  }

  const radarData = modelToRadar(selectedModel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Model Arena</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Security benchmark scores & model comparison
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_MODEL); setCreateOpen(true); }}>
            <Plus size={14} /> Add Model
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: 'hsl(var(--brand))' }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Radar + Bar */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Security Radar</CardTitle>
              <select
                value={selectedModel.id}
                onChange={e => {
                  const m = models.find(m => m.id === e.target.value);
                  if (m) setSelectedModel(m);
                }}
                style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '4px 8px', fontSize: 12, borderRadius: 0 }}
              >
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={ct.grid} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: ct.axis }} />
                <Radar dataKey="value" stroke={ct.brand} fill={ct.brand} fillOpacity={0.3} name={selectedModel.name} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Overall Security Score Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overallData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: ct.axis }} label={{ value: 'Count', angle: 0, position: 'insideBottom', style: { fill: ct.axis } }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} width={110} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Bar dataKey="score" radius={0} name="Score">
                  {overallData.map((entry, i) => (
                    <Cell key={i} fill={scoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search models..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Statuses</option>
          {['production', 'staging', 'evaluation', 'deprecated'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {models.length} models</span>
      </div>

      {/* Comparison Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Robot size={40} />
              <p className="mt-3 text-sm font-medium">No models match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['Model', 'Provider', 'Status', 'Inj. Resist', 'Jailbreak', 'Safety', 'PII Leak %', 'Hallucination %', 'Bias %', 'Overall', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a, b) => b.overallScore - a.overallScore).map(m => (
                  <tr
                    key={m.id}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onClick={() => setViewItem(m)}
                  >
                    <td className="p-3">
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>v{m.version}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{m.provider}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge style={{ background: statusStyle(m.status).bg, color: statusStyle(m.status).text, border: `1px solid ${statusStyle(m.status).border}`, borderRadius: 0, fontSize: 11 }}>
                        {m.status}
                      </Badge>
                    </td>
                    {[m.promptInjectionResistance, m.jailbreakResistance, m.outputSafety].map((val, i) => (
                      <td key={i} className="p-3">
                        <span className="text-sm font-bold" style={{ color: scoreColor(val) }}>{val}%</span>
                      </td>
                    ))}
                    {[m.piiLeakage, m.hallucinationRate, m.biasScore].map((val, i) => (
                      <td key={i} className="p-3">
                        <span className="text-sm font-bold" style={{ color: val > 15 ? 'hsl(var(--s-er-tx))' : val > 8 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))' }}>{val}%</span>
                      </td>
                    ))}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 50, height: 6, background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                          <div style={{ width: `${m.overallScore}%`, height: '100%', background: scoreColor(m.overallScore), borderRadius: 0 }} />
                        </div>
                        <span className="text-sm font-bold" style={{ color: scoreColor(m.overallScore) }}>{m.overallScore}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(m)}><Eye size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...m })}><PencilSimple size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(m)}><Trash size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 560, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ background: statusStyle(viewItem.status).bg, color: statusStyle(viewItem.status).text, border: `1px solid ${statusStyle(viewItem.status).border}`, borderRadius: 0 }}>
                    {viewItem.status}
                  </Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.provider}</Badge>
                  <Badge style={{ background: `${scoreColor(viewItem.overallScore)}20`, color: scoreColor(viewItem.overallScore), border: `1px solid ${scoreColor(viewItem.overallScore)}40`, borderRadius: 0 }}>
                    Score: {viewItem.overallScore}
                  </Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="benchmarks">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="benchmarks" style={{ borderRadius: 0 }}>Benchmarks</TabsTrigger>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                </TabsList>
                <TabsContent value="benchmarks" className="mt-4">
                  <div className="space-y-2">
                    {[
                      { label: 'Prompt Injection Resistance', value: viewItem.promptInjectionResistance, higher: true },
                      { label: 'Jailbreak Resistance', value: viewItem.jailbreakResistance, higher: true },
                      { label: 'Output Safety', value: viewItem.outputSafety, higher: true },
                      { label: 'PII Leakage Rate', value: viewItem.piiLeakage, higher: false },
                      { label: 'Hallucination Rate', value: viewItem.hallucinationRate, higher: false },
                      { label: 'Bias Score', value: viewItem.biasScore, higher: false },
                    ].map(b => (
                      <div key={b.label} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <span className="text-xs w-44" style={{ color: 'hsl(var(--text-2))' }}>{b.label}</span>
                        <div style={{ flex: 1, height: 8, background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                          <div style={{ width: `${b.value}%`, height: '100%', background: b.higher ? scoreColor(b.value) : (b.value > 15 ? 'hsl(var(--s-er-tx))' : b.value > 8 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))'), borderRadius: 0 }} />
                        </div>
                        <span className="text-xs font-bold w-10 text-right" style={{ color: b.higher ? scoreColor(b.value) : (b.value > 15 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))') }}>
                          {b.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Model ID', value: viewItem.id },
                    { label: 'Version', value: viewItem.version },
                    { label: 'Last Evaluated', value: viewItem.lastEvaluated },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 560 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Model Benchmark</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[{ label: 'Name', key: 'name' }, { label: 'Version', key: 'version' }, { label: 'Description', key: 'description' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Provider</label>
                  <select value={editItem.provider} onChange={e => setEditItem(prev => prev ? { ...prev, provider: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral AI', 'Cohere', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['production', 'staging', 'evaluation', 'deprecated'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Inj. Resistance', key: 'promptInjectionResistance' },
                  { label: 'Jailbreak Resist', key: 'jailbreakResistance' },
                  { label: 'Overall Score', key: 'overallScore' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                    <Input type="number" min={0} max={100} value={(editItem as any)[f.key]} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: parseInt(e.target.value) } : null)} style={{ borderRadius: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} style={{ borderRadius: 0 }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Model for Benchmarking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Model Name', key: 'name' }, { label: 'Version', key: 'version' }, { label: 'Description', key: 'description' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Provider</label>
                <select value={formData.provider} onChange={e => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral AI', 'Cohere', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['production', 'staging', 'evaluation', 'deprecated'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Add Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Remove Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteItem?.name}</strong> from the arena? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
