import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Plus, Eye, PencilSimple, Trash, MagnifyingGlass, CheckCircle,
  Warning, Clock, TestTube, Robot, Sliders, Gauge, Shield,
  Lightning, Flask,
} from '@phosphor-icons/react';
import { statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

interface Technique {
  id: string;
  name: string;
  description: string;
  applicableTypes: string[];
  lastRun: string;
  status: string;
  icon: React.ElementType;
  cadence: string;
}

const TECHNIQUES_SEED: Technique[] = [
  {
    id: 'TQ-001',
    name: 'Accuracy & F1 Score Testing',
    description: 'Measures model accuracy, precision, recall, and F1 score against labeled holdout datasets. Essential for all classification and regression models.',
    applicableTypes: ['ML — Classification', 'ML — Regression', 'ML — NLP'],
    lastRun: '2026-03-20',
    status: 'completed',
    icon: CheckCircle,
    cadence: 'Monthly',
  },
  {
    id: 'TQ-002',
    name: 'Fairness & Bias Audit',
    description: 'Evaluates disparate impact across protected attributes including gender, age, race/ethnicity, and geography using EU AI Act and EEOC frameworks.',
    applicableTypes: ['ML — Classification', 'LLM — Generative', 'ML — NLP'],
    lastRun: '2026-03-15',
    status: 'completed',
    icon: Shield,
    cadence: 'Quarterly',
  },
  {
    id: 'TQ-003',
    name: 'Robustness Testing',
    description: 'Tests model stability under distribution shifts, noisy inputs, and edge cases. Includes stress testing and boundary analysis.',
    applicableTypes: ['ML — Classification', 'ML — Anomaly Detection', 'LLM — Generative'],
    lastRun: '2026-03-10',
    status: 'completed',
    icon: Gauge,
    cadence: 'Monthly',
  },
  {
    id: 'TQ-004',
    name: 'Explainability (SHAP/LIME)',
    description: 'Generates SHAP and LIME explanations to understand feature importance and decision-making processes. Required for GDPR Art. 22 compliance.',
    applicableTypes: ['ML — Classification', 'ML — Regression', 'ML — NLP'],
    lastRun: '2026-03-08',
    status: 'completed',
    icon: Flask,
    cadence: 'Quarterly',
  },
  {
    id: 'TQ-005',
    name: 'Drift Detection',
    description: 'Monitors input feature distributions and prediction distributions over time. Detects data drift, concept drift, and covariate shift.',
    applicableTypes: ['All model types'],
    lastRun: '2026-03-25',
    status: 'running',
    icon: Lightning,
    cadence: 'Continuous',
  },
  {
    id: 'TQ-006',
    name: 'Adversarial Testing',
    description: 'Simulates adversarial attacks including evasion attacks, poisoning attacks, and model inversion. Tests model resilience against malicious inputs.',
    applicableTypes: ['ML — Classification', 'LLM — Generative', 'ML — NLP'],
    lastRun: '2026-02-28',
    status: 'scheduled',
    icon: TestTube,
    cadence: 'Bi-Annual',
  },
  {
    id: 'TQ-007',
    name: 'Hallucination Detection',
    description: 'Evaluates LLM outputs for factual accuracy, citation verification, and confabulation rates. Uses RAG-based grounding checks.',
    applicableTypes: ['LLM — Generative'],
    lastRun: '2026-03-18',
    status: 'completed',
    icon: Robot,
    cadence: 'Weekly',
  },
  {
    id: 'TQ-008',
    name: 'Performance Benchmarking',
    description: 'Standardized benchmarks comparing model performance across dimensions: accuracy, latency, throughput, cost per inference, and energy consumption.',
    applicableTypes: ['All model types'],
    lastRun: '2026-03-12',
    status: 'completed',
    icon: Sliders,
    cadence: 'Monthly',
  },
];

const STATUS_ICON: Record<string, React.ElementType> = {
  completed: CheckCircle,
  running: Lightning,
  scheduled: Clock,
  failed: Warning,
};

export default function EvalTechniques() {
  const { orgName } = useSettingsStore();
  const [techniques, setTechniques] = useState<Technique[]>(TECHNIQUES_SEED);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewItem, setViewItem] = useState<Technique | null>(null);
  const [editItem, setEditItem] = useState<Technique | null>(null);
  const [deleteItem, setDeleteItem] = useState<Technique | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', cadence: 'Monthly', applicableTypes: '' });

  const filtered = techniques.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function handleCreate() {
    const id = `TQ-${String(techniques.length + 1).padStart(3, '0')}`;
    const newT: Technique = {
      id,
      name: formData.name,
      description: formData.description,
      applicableTypes: formData.applicableTypes.split(',').map(s => s.trim()),
      lastRun: '',
      status: 'scheduled',
      icon: TestTube,
      cadence: formData.cadence,
    };
    setTechniques(prev => [...prev, newT]);
    setCreateOpen(false);
    setFormData({ name: '', description: '', cadence: 'Monthly', applicableTypes: '' });
  }

  function handleEdit() {
    if (!editItem) return;
    setTechniques(prev => prev.map(t => t.id === editItem.id ? editItem : t));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setTechniques(prev => prev.filter(t => t.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Evaluation Techniques</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · AI model evaluation technique library
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} className="mr-1" /> Configure Technique
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search techniques..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}
        >
          <option value="all">All Statuses</option>
          {['completed', 'running', 'scheduled', 'failed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} techniques</span>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(t => {
          const sc = statusColor(t.status);
          const IconComp = t.icon;
          const StatusIcon = STATUS_ICON[t.status] || Clock;
          return (
            <Card
              key={t.id}
              style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', cursor: 'pointer' }}
              onClick={() => setViewItem(t)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 36, height: 36, background: 'hsl(var(--bg-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComp size={18} style={{ color: 'hsl(var(--brand))' }} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{t.name}</CardTitle>
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{t.id} · {t.cadence}</p>
                    </div>
                  </div>
                  <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <StatusIcon size={10} />
                    {t.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{t.description}</p>

                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--text-3))' }}>Applicable Model Types</p>
                  <div className="flex flex-wrap gap-1">
                    {t.applicableTypes.map(type => (
                      <Badge key={type} variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{type}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                    Last run: {t.lastRun ? formatDate(t.lastRun) : 'Never'}
                  </span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" style={{ padding: '2px 6px' }} onClick={() => setEditItem({ ...t })}>
                      <PencilSimple size={13} />
                    </Button>
                    <Button size="sm" variant="ghost" style={{ padding: '2px 6px', color: '#ef4444' }} onClick={() => setDeleteItem(t)}>
                      <Trash size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem?.name}</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
              {[
                { label: 'Technique ID', value: viewItem.id },
                { label: 'Cadence', value: viewItem.cadence },
                { label: 'Status', value: viewItem.status },
                { label: 'Last Run', value: viewItem.lastRun ? formatDate(viewItem.lastRun) : 'Never' },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                </div>
              ))}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Applicable Model Types</p>
                <div className="flex flex-wrap gap-1">
                  {viewItem.applicableTypes.map(type => (
                    <Badge key={type} variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{type}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)} style={{ borderRadius: 0 }}>Close</Button>
            <Button onClick={() => { setEditItem(viewItem ? { ...viewItem } : null); setViewItem(null); }} style={{ borderRadius: 0 }}>
              <PencilSimple size={14} className="mr-1" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Technique</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Name</label>
                <Input value={editItem.name} onChange={e => setEditItem(p => p ? { ...p, name: e.target.value } : null)} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
                <textarea
                  value={editItem.description}
                  onChange={e => setEditItem(p => p ? { ...p, description: e.target.value } : null)}
                  rows={3}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0, resize: 'vertical' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Cadence</label>
                  <select
                    value={editItem.cadence}
                    onChange={e => setEditItem(p => p ? { ...p, cadence: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}
                  >
                    {['Continuous', 'Weekly', 'Monthly', 'Quarterly', 'Bi-Annual', 'Annual'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select
                    value={editItem.status}
                    onChange={e => setEditItem(p => p ? { ...p, status: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}
                  >
                    {['completed', 'running', 'scheduled', 'failed'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Configure New Technique</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Technique Name</label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} style={{ borderRadius: 0 }} placeholder="e.g. Calibration Testing" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Describe what this technique tests..."
                style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0, resize: 'vertical' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Applicable Model Types (comma-separated)</label>
              <Input
                value={formData.applicableTypes}
                onChange={e => setFormData(p => ({ ...p, applicableTypes: e.target.value }))}
                style={{ borderRadius: 0 }}
                placeholder="e.g. ML — Classification, LLM — Generative"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Cadence</label>
              <select
                value={formData.cadence}
                onChange={e => setFormData(p => ({ ...p, cadence: e.target.value }))}
                style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}
              >
                {['Continuous', 'Weekly', 'Monthly', 'Quarterly', 'Bi-Annual', 'Annual'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Configure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Remove Technique</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteItem?.name}</strong>? This action cannot be undone.
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
