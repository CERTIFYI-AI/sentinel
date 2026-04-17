import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Plus, Eye, PencilSimple, Trash, Download, MagnifyingGlass,
  FunnelSimple, ClipboardText, Warning, CheckCircle, Clock, ArrowUp,
} from '@phosphor-icons/react';
import { RISKS, GAPS, severityColor, statusColor, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

interface RemediationPlan {
  id: string;
  title: string;
  linkedRisk: string;
  linkedGap: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  progress: number;
  assignee: string;
  dueDate: string;
  status: string;
  description: string;
  steps: string[];
  startDate: string;
}

const PLANS: RemediationPlan[] = [
  {
    id: 'REM-001',
    title: 'Retrain Credit Scorer to remove geographic proxy',
    linkedRisk: 'RSK-001',
    linkedGap: 'GAP-004',
    priority: 'critical',
    progress: 35,
    assignee: 'Maria Santos',
    dueDate: '2026-04-30',
    status: 'in_progress',
    description: 'Remove ZIP code and geographic features from the Credit Risk Scorer training pipeline and retrain with debiased data.',
    steps: ['Audit feature importance for proxy signals', 'Remove identified proxy features', 'Retrain model on debiased dataset', 'Validate fairness metrics post-retrain', 'Deploy to staging for validation'],
    startDate: '2026-03-15',
  },
  {
    id: 'REM-002',
    title: 'Implement RAG pipeline for Loan Assistant',
    linkedRisk: 'RSK-002',
    linkedGap: 'GAP-001',
    priority: 'high',
    progress: 20,
    assignee: 'Raj Gupta',
    dueDate: '2026-05-15',
    status: 'in_progress',
    description: 'Build a Retrieval-Augmented Generation pipeline to ground LLM outputs in verified regulatory documents, eliminating hallucinations.',
    steps: ['Define document corpus for RAG', 'Set up vector database (Pinecone)', 'Build retrieval pipeline', 'Integrate with Loan Assistant', 'Test hallucination reduction'],
    startDate: '2026-03-20',
  },
  {
    id: 'REM-003',
    title: 'Obtain GDPR consent for AI processing',
    linkedRisk: 'RSK-003',
    linkedGap: 'GAP-005',
    priority: 'critical',
    progress: 10,
    assignee: 'James Patel',
    dueDate: '2026-04-15',
    status: 'in_progress',
    description: 'Obtain explicit GDPR Art. 6 consent for AI processing of consumer credit and HR datasets. Legal review required.',
    steps: ['Legal review of processing basis', 'Draft consent forms', 'Implement consent collection UI', 'Retroactive consent outreach', 'Document consent records'],
    startDate: '2026-03-25',
  },
  {
    id: 'REM-004',
    title: 'Negotiate amended DPA with OpenAI',
    linkedRisk: 'RSK-004',
    linkedGap: 'GAP-005',
    priority: 'critical',
    progress: 5,
    assignee: 'James Patel',
    dueDate: '2026-04-10',
    status: 'overdue',
    description: 'Renegotiate Data Processing Agreement with OpenAI to explicitly cover EU citizen data and GDPR requirements.',
    steps: ['Engage OpenAI enterprise team', 'Draft DPA amendment', 'Legal review of amended DPA', 'Execute signed agreement', 'Document in vendor registry'],
    startDate: '2026-03-01',
  },
  {
    id: 'REM-005',
    title: 'Quarantine and audit shadow AI agents',
    linkedRisk: 'RSK-006',
    linkedGap: 'GAP-010',
    priority: 'high',
    progress: 65,
    assignee: 'Sarah Chen',
    dueDate: '2026-04-05',
    status: 'overdue',
    description: 'Quarantine unauthorized LangChain and AutoGPT deployments, audit data access, and implement network-level controls.',
    steps: ['Identify all shadow agents', 'Revoke data access tokens', 'Quarantine agent endpoints', 'Audit data accessed', 'Implement API gateway controls'],
    startDate: '2026-03-10',
  },
  {
    id: 'REM-006',
    title: 'Complete EU AI Act Article 11 documentation',
    linkedRisk: 'RSK-007',
    linkedGap: 'GAP-002',
    priority: 'high',
    progress: 40,
    assignee: 'Emma Wilson',
    dueDate: '2026-05-30',
    status: 'in_progress',
    description: 'Create complete technical documentation for all high-risk AI systems per EU AI Act Article 11 requirements.',
    steps: ['Identify all high-risk AI systems', 'Create model cards', 'Document training data governance', 'Create system risk assessment', 'Review with legal'],
    startDate: '2026-03-12',
  },
  {
    id: 'REM-007',
    title: 'Implement SHAP explainability for credit decisions',
    linkedRisk: 'RSK-012',
    linkedGap: 'GAP-003',
    priority: 'high',
    progress: 55,
    assignee: 'Raj Gupta',
    dueDate: '2026-04-20',
    status: 'in_progress',
    description: 'Deploy SHAP-based explanation API for all automated credit decisions to meet GDPR Art. 22 requirements.',
    steps: ['Implement SHAP explainer for MDL-001', 'Create explanation API endpoint', 'Integrate with UI', 'Validate explanation quality', 'Document for compliance'],
    startDate: '2026-03-08',
  },
  {
    id: 'REM-008',
    title: 'Suspend and remediate HR screening bias',
    linkedRisk: 'RSK-008',
    linkedGap: 'GAP-001',
    priority: 'critical',
    progress: 80,
    assignee: 'Raj Gupta',
    dueDate: '2026-04-01',
    status: 'completed',
    description: 'Suspend HR screening feature, conduct full bias audit, and retrain model with balanced data before re-enabling.',
    steps: ['Suspend HR screening feature in prod', 'Conduct bias audit BA-005', 'Retrain on balanced HR dataset', 'External auditor review', 'Re-enable with monitoring'],
    startDate: '2026-02-03',
  },
];

const EMPTY_FORM = {
  title: '',
  linkedRisk: 'RSK-001',
  linkedGap: 'GAP-001',
  priority: 'high' as RemediationPlan['priority'],
  progress: 0,
  assignee: '',
  dueDate: '',
  status: 'in_progress',
  description: '',
};

function progressBarColor(progress: number, status: string) {
  if (status === 'completed') return '#10b981';
  if (status === 'overdue') return '#ef4444';
  if (progress > 60) return '#10b981';
  if (progress > 30) return '#f97316';
  return '#3b82f6';
}

export default function Remediation() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [plans, setPlans] = useState<RemediationPlan[]>(PLANS);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewItem, setViewItem] = useState<RemediationPlan | null>(null);
  const [editItem, setEditItem] = useState<RemediationPlan | null>(null);
  const [deleteItem, setDeleteItem] = useState<RemediationPlan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const filtered = plans.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.assignee.toLowerCase().includes(q);
    const matchPriority = filterPriority === 'all' || p.priority === filterPriority;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchPriority && matchStatus;
  });

  const stats = [
    { label: 'Active Plans', value: plans.filter(p => p.status === 'in_progress').length, icon: ClipboardText },
    { label: 'Overdue', value: plans.filter(p => p.status === 'overdue').length, icon: Warning },
    { label: 'Completed This Month', value: plans.filter(p => p.status === 'completed').length, icon: CheckCircle },
    { label: 'Avg Completion', value: `${Math.round(plans.reduce((s, p) => s + p.progress, 0) / plans.length)}%`, icon: ArrowUp },
  ];

  const progressData = plans.map(p => ({ name: p.id, progress: p.progress, status: p.status }));

  function handleCreate() {
    const id = `REM-${String(plans.length + 1).padStart(3, '0')}`;
    const newPlan: RemediationPlan = {
      ...formData,
      id,
      steps: [],
      startDate: new Date().toISOString().split('T')[0],
    };
    setPlans(prev => [...prev, newPlan]);
    setCreateOpen(false);
    setFormData(EMPTY_FORM);
  }

  function handleEdit() {
    if (!editItem) return;
    setPlans(prev => prev.map(p => p.id === editItem.id ? editItem : p));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setPlans(prev => prev.filter(p => p.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Remediation Plans</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Track and manage risk remediation activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> Create Plan
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

      {/* Progress Chart */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Remediation Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: ct.axis }}
                label={{ value: 'Progress (%)', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
              />
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              <Bar dataKey="progress" name="Completion %" radius={0}>
                {progressData.map((entry, i) => (
                  <Cell key={i} fill={progressBarColor(entry.progress, entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search plans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <FunnelSimple size={14} style={{ color: 'hsl(var(--text-3))' }} />
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}
        >
          <option value="all">All Priorities</option>
          {['critical', 'high', 'medium', 'low'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}
        >
          <option value="all">All Statuses</option>
          {['in_progress', 'overdue', 'completed', 'planned'].map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {plans.length} plans</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Title', 'Linked Risk', 'Priority', 'Progress', 'Assignee', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const sc = statusColor(p.status);
                const pc = severityColor(p.priority);
                const barColor = progressBarColor(p.progress, p.status);
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onClick={() => setViewItem(p)}
                  >
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{p.id}</td>
                    <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 220 }}>
                      <span className="block truncate">{p.title}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs font-mono px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-2))' }}>
                        {p.linkedRisk}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, borderRadius: 0, fontSize: 11 }}>
                        {p.priority}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 70, height: 6, background: 'hsl(var(--bg-muted))' }}>
                          <div style={{ width: `${p.progress}%`, height: '100%', background: barColor }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: barColor }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{p.assignee}</td>
                    <td className="p-3 text-xs" style={{ color: p.status === 'overdue' ? '#ef4444' : 'hsl(var(--text-3))' }}>{formatDate(p.dueDate)}</td>
                    <td className="p-3">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(p)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...p })}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(p)}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 540, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
                <div className="flex gap-2">
                  <Badge style={{ background: severityColor(viewItem.priority).bg, color: severityColor(viewItem.priority).text, border: `1px solid ${severityColor(viewItem.priority).border}`, borderRadius: 0 }}>
                    {viewItem.priority}
                  </Badge>
                  <Badge style={{ background: statusColor(viewItem.status).bg, color: statusColor(viewItem.status).text, border: `1px solid ${statusColor(viewItem.status).border}`, borderRadius: 0 }}>
                    {viewItem.status.replace('_', ' ')}
                  </Badge>
                </div>
              </SheetHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-3))' }}>Progress</p>
                  <div className="flex items-center gap-3">
                    <div style={{ flex: 1, height: 8, background: 'hsl(var(--bg-muted))' }}>
                      <div style={{ width: `${viewItem.progress}%`, height: '100%', background: progressBarColor(viewItem.progress, viewItem.status) }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.progress}%</span>
                  </div>
                </div>
                {[
                  { label: 'Plan ID', value: viewItem.id },
                  { label: 'Linked Risk', value: viewItem.linkedRisk + ' — ' + (RISKS.find(r => r.id === viewItem.linkedRisk)?.title || '') },
                  { label: 'Linked Gap', value: viewItem.linkedGap },
                  { label: 'Assignee', value: viewItem.assignee },
                  { label: 'Start Date', value: formatDate(viewItem.startDate) },
                  { label: 'Due Date', value: formatDate(viewItem.dueDate) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium text-right" style={{ color: 'hsl(var(--text-1))', maxWidth: 260 }}>{r.value}</span>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Description</p>
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </div>
                {viewItem.steps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Remediation Steps</p>
                    <ol className="space-y-2">
                      {viewItem.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))', minWidth: 18 }}>{i + 1}.</span>
                          <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Remediation Plan</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Title</label>
                <Input value={editItem.title} onChange={e => setEditItem(p => p ? { ...p, title: e.target.value } : null)} style={{ borderRadius: 0 }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Linked Risk</label>
                  <select value={editItem.linkedRisk} onChange={e => setEditItem(p => p ? { ...p, linkedRisk: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {RISKS.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Priority</label>
                  <select value={editItem.priority} onChange={e => setEditItem(p => p ? { ...p, priority: e.target.value as any } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['critical', 'high', 'medium', 'low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Progress (%)</label>
                  <Input type="number" min={0} max={100} value={editItem.progress}
                    onChange={e => setEditItem(p => p ? { ...p, progress: parseInt(e.target.value) } : null)} style={{ borderRadius: 0 }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select value={editItem.status} onChange={e => setEditItem(p => p ? { ...p, status: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['in_progress', 'overdue', 'completed', 'planned'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Assignee</label>
                <Input value={editItem.assignee} onChange={e => setEditItem(p => p ? { ...p, assignee: e.target.value } : null)} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Due Date</label>
                <Input type="date" value={editItem.dueDate} onChange={e => setEditItem(p => p ? { ...p, dueDate: e.target.value } : null)} style={{ borderRadius: 0 }} />
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Create Remediation Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Plan Title</label>
              <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} style={{ borderRadius: 0 }} placeholder="e.g. Retrain model with debiased data" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
              <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                rows={2} style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0, resize: 'vertical' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Linked Risk</label>
                <select value={formData.linkedRisk} onChange={e => setFormData(p => ({ ...p, linkedRisk: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {RISKS.map(r => <option key={r.id} value={r.id}>{r.id} — {r.title.slice(0, 30)}...</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Priority</label>
                <select value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Assignee</label>
                <Input value={formData.assignee} onChange={e => setFormData(p => ({ ...p, assignee: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Due Date</label>
                <Input type="date" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.title || !formData.assignee}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Remediation Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#ef4444', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
