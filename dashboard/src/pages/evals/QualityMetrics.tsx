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
import {
  ChartBar, Plus, Eye, PencilSimple, Trash, Download,
  MagnifyingGlass, CheckCircle, Warning, ArrowUp, ArrowDown, Minus,
  Brain, FunnelSimple,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { MODELS, Model, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

const ACCENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ec4899', '#06b6d4'];

function driftIcon(status: string) {
  if (status === 'stable') return <CheckCircle size={14} style={{ color: '#10b981' }} />;
  if (status === 'warning') return <Warning size={14} style={{ color: '#f97316' }} />;
  return <Warning size={14} style={{ color: '#ef4444' }} />;
}

function driftColor(status: string) {
  if (status === 'stable') return '#10b981';
  if (status === 'warning') return '#f97316';
  return '#ef4444';
}

const EMPTY_FORM = {
  name: '', version: '', type: '', owner: '', department: '',
  accuracy: 90, fairnessScore: 80, latencyMs: 50,
  driftStatus: 'stable' as 'stable' | 'warning' | 'critical',
  status: 'production' as Model['status'],
};

export default function QualityMetrics() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [models, setModels] = useState<Model[]>(MODELS);
  const [search, setSearch] = useState('');
  const [filterDrift, setFilterDrift] = useState('all');

  const [viewItem, setViewItem] = useState<Model | null>(null);
  const [editItem, setEditItem] = useState<Model | null>(null);
  const [deleteItem, setDeleteItem] = useState<Model | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const filtered = models.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
    const matchDrift = filterDrift === 'all' || m.driftStatus === filterDrift;
    return matchSearch && matchDrift;
  });

  const avgAccuracy = (models.reduce((s, m) => s + m.accuracy, 0) / models.length).toFixed(1);
  const avgFairness = (models.reduce((s, m) => s + m.fairnessScore, 0) / models.length).toFixed(1);

  const stats = [
    { label: 'Models Evaluated', value: 6, icon: Brain },
    { label: 'Avg Accuracy', value: `${avgAccuracy}%`, icon: ChartBar },
    { label: 'Avg Fairness', value: `${avgFairness}%`, icon: CheckCircle },
    { label: 'Tests This Month', value: 45, icon: ArrowUp },
  ];

  const accuracyData = models.map(m => ({ name: m.id.replace('MDL-', 'M-'), fullName: m.name, accuracy: m.accuracy }));
  const fairnessData = models.map(m => ({ name: m.id.replace('MDL-', 'M-'), fullName: m.name, fairness: m.fairnessScore }));

  function handleCreate() {
    const id = `MDL-${String(models.length + 1).padStart(3, '0')}`;
    const newModel: Model = {
      ...MODELS[0],
      ...formData,
      id,
      riskTier: 'limited',
      lastValidated: new Date().toISOString().split('T')[0],
      framework: 'NIST AI RMF',
      description: '',
      monthlyInferences: '0',
      euAiActArticle: '',
      biasMetrics: [],
      performanceHistory: [],
      guardrails: [],
      complianceMapping: [],
      incidents: [],
      lifecyclePhase: 'Development',
      daysInPhase: 0,
      lifecycleProgress: 10,
    };
    setModels(prev => [...prev, newModel]);
    setCreateOpen(false);
    setFormData(EMPTY_FORM);
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

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Quality Metrics</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · AI model evaluation & performance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> Run Evaluation
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

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Accuracy by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis
                  domain={[60, 100]}
                  tick={{ fontSize: 11, fill: ct.axis }}
                  label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: { fill: ct.axis }, offset: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                  formatter={(v: number, _, props) => [v.toFixed(1) + '%', props.payload?.fullName]}
                />
                <Bar dataKey="accuracy" name="Accuracy" radius={0}>
                  {accuracyData.map((_, i) => <Cell key={i} fill={ACCENT_COLORS[i % ACCENT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Fairness Score Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fairnessData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: ct.axis }}
                  label={{ value: 'Fairness Score', angle: -90, position: 'insideLeft', style: { fill: ct.axis }, offset: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                  formatter={(v: number, _, props) => [v + '', props.payload?.fullName]}
                />
                <Bar dataKey="fairness" name="Fairness" radius={0}>
                  {fairnessData.map((entry, i) => (
                    <Cell key={i} fill={entry.fairness >= 85 ? '#10b981' : entry.fairness >= 70 ? '#f97316' : '#ef4444'} />
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
        <FunnelSimple size={14} style={{ color: 'hsl(var(--text-3))' }} />
        <select
          value={filterDrift}
          onChange={e => setFilterDrift(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}
        >
          <option value="all">All Drift Status</option>
          {['stable', 'warning', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {models.length} models</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Model', 'Type', 'Accuracy', 'Latency', 'Fairness', 'Drift', 'Last Validated', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr
                  key={m.id}
                  className="cursor-pointer"
                  style={{ borderTop: '1px solid hsl(var(--border))' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                  onClick={() => setViewItem(m)}
                >
                  <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{m.id}</td>
                  <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</td>
                  <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{m.type}</td>
                  <td className="p-3">
                    <span className="text-sm font-semibold" style={{ color: m.accuracy >= 90 ? '#10b981' : '#f97316' }}>{m.accuracy}%</span>
                  </td>
                  <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{m.latencyMs}ms</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 60, height: 6, background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                        <div style={{ width: `${m.fairnessScore}%`, height: '100%', background: m.fairnessScore >= 85 ? '#10b981' : '#f97316' }} />
                      </div>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{m.fairnessScore}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {driftIcon(m.driftStatus)}
                      <span className="text-xs" style={{ color: driftColor(m.driftStatus) }}>{m.driftStatus}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(m.lastValidated)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(m)}>
                        <Eye size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...m })}>
                        <PencilSimple size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(m)}>
                        <Trash size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 520, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.type}</Badge>
                  <Badge style={{ background: viewItem.driftStatus === 'stable' ? '#10b98120' : '#ef444420', color: viewItem.driftStatus === 'stable' ? '#10b981' : '#ef4444', border: `1px solid ${viewItem.driftStatus === 'stable' ? '#10b981' : '#ef4444'}`, borderRadius: 0 }}>
                    drift: {viewItem.driftStatus}
                  </Badge>
                </div>
              </SheetHeader>
              <div className="space-y-3 mt-2">
                {[
                  { label: 'Model ID', value: viewItem.id },
                  { label: 'Version', value: viewItem.version },
                  { label: 'Owner', value: viewItem.owner },
                  { label: 'Department', value: viewItem.department },
                  { label: 'Framework', value: viewItem.framework },
                  { label: 'Status', value: viewItem.status },
                  { label: 'Accuracy', value: viewItem.accuracy + '%' },
                  { label: 'Latency', value: viewItem.latencyMs + 'ms' },
                  { label: 'Fairness Score', value: viewItem.fairnessScore },
                  { label: 'Monthly Inferences', value: viewItem.monthlyInferences },
                  { label: 'Last Validated', value: formatDate(viewItem.lastValidated) },
                  { label: 'Risk Tier', value: viewItem.riskTier },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Description</p>
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} className="mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Model</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Name', key: 'name' },
                { label: 'Version', key: 'version' },
                { label: 'Owner', key: 'owner' },
                { label: 'Department', key: 'department' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input
                    value={(editItem as any)[f.key] || ''}
                    onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                    style={{ borderRadius: 0 }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Accuracy (%)</label>
                  <Input
                    type="number"
                    value={editItem.accuracy}
                    onChange={e => setEditItem(prev => prev ? { ...prev, accuracy: parseFloat(e.target.value) } : null)}
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Fairness Score</label>
                  <Input
                    type="number"
                    value={editItem.fairnessScore}
                    onChange={e => setEditItem(prev => prev ? { ...prev, fairnessScore: parseFloat(e.target.value) } : null)}
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Drift Status</label>
                <select
                  value={editItem.driftStatus}
                  onChange={e => setEditItem(prev => prev ? { ...prev, driftStatus: e.target.value as any } : null)}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}
                >
                  {['stable', 'warning', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Run New Evaluation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Model Name', key: 'name' },
              { label: 'Version', key: 'version' },
              { label: 'Type', key: 'type' },
              { label: 'Owner', key: 'owner' },
              { label: 'Department', key: 'department' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input
                  value={(formData as any)[f.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ borderRadius: 0 }}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Target Accuracy (%)</label>
                <Input
                  type="number"
                  value={formData.accuracy}
                  onChange={e => setFormData(prev => ({ ...prev, accuracy: parseFloat(e.target.value) }))}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Fairness Target</label>
                <Input
                  type="number"
                  value={formData.fairnessScore}
                  onChange={e => setFormData(prev => ({ ...prev, fairnessScore: parseFloat(e.target.value) }))}
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Run Evaluation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Remove Model Evaluation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteItem?.name}</strong> from evaluations? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#ef4444', borderRadius: 0 }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
