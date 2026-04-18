import { useState, useMemo } from 'react';
import { usePolicies, useUpsertPolicy, useDeletePolicy } from '@/hooks/queries/usePolicies';
import { toast } from 'sonner';
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
  FileText, Plus, Eye, PencilSimple, Trash, MagnifyingGlass,
  CheckCircle, Clock, NotePencil, Download,
} from '@phosphor-icons/react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { POLICIES, Policy, statusColor, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

const POLICY_REVIEW_TREND = [
  { month: 'Oct', reviews: 2 },
  { month: 'Nov', reviews: 1 },
  { month: 'Dec', reviews: 3 },
  { month: 'Jan', reviews: 4 },
  { month: 'Feb', reviews: 2 },
  { month: 'Mar', reviews: 3 },
];

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ec4899', '#06b6d4', '#f59e0b'];

const EMPTY_POLICY: Omit<Policy, 'id'> = {
  title: '', category: 'AI Usage', status: 'draft', version: 'v1.0',
  owner: '', framework: '', lastReview: new Date().toISOString().split('T')[0],
  nextReview: '', approver: '', description: '',
};

export default function Policies() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const { data: supabasePolicies } = usePolicies();
  const upsertMutation = useUpsertPolicy();
  const deleteMutation = useDeletePolicy();
  const [localPolicies, setLocalPolicies] = useState<Policy[]>(POLICIES);
  const policies = (supabasePolicies && supabasePolicies.length > 0 ? supabasePolicies : localPolicies) as Policy[];
  const setPolicies = (fn: (prev: Policy[]) => Policy[]) => setLocalPolicies(fn);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewItem, setViewItem] = useState<Policy | null>(null);
  const [editItem, setEditItem] = useState<Policy | null>(null);
  const [deleteItem, setDeleteItem] = useState<Policy | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Policy, 'id'>>(EMPTY_POLICY);

  const filtered = policies.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const categoryData = Array.from(
    policies.reduce((acc, p) => {
      acc.set(p.category, (acc.get(p.category) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: 'Total Policies', value: policies.length, icon: FileText, color: '#6366f1' },
    { label: 'Published', value: policies.filter(p => p.status === 'published').length, icon: CheckCircle, color: '#10b981' },
    { label: 'In Review', value: policies.filter(p => p.status === 'in_review').length, icon: Clock, color: '#f97316' },
    { label: 'Draft', value: policies.filter(p => p.status === 'draft').length, icon: NotePencil, color: '#8b5cf6' },
  ];

  function handleCreate() {
    const id = `POL-${String(policies.length + 1).padStart(3, '0')}`;
    upsertMutation.mutate({ ...formData, id } as any, {
      onSuccess: () => { toast.success('Policy created'); },
      onError: () => { setPolicies(prev => [...prev, { ...formData, id }]); },
    });
    setPolicies(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_POLICY);
  }

  function handleEdit() {
    if (!editItem) return;
    upsertMutation.mutate(editItem as any, {
      onSuccess: () => { toast.success('Policy updated'); },
      onError: () => { setPolicies(prev => prev.map(p => p.id === editItem!.id ? editItem! : p)); },
    });
    setPolicies(prev => prev.map(p => p.id === editItem.id ? editItem : p));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id, {
      onSuccess: () => { toast.success('Policy deleted'); },
      onError: () => { setPolicies(prev => prev.filter(p => p.id !== deleteItem!.id)); },
    });
    setPolicies(prev => prev.filter(p => p.id !== deleteItem.id));
    setDeleteItem(null);
  }

  const selectStyle = {
    background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0,
  };

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Policy Management</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · {policies.length} policies across all categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_POLICY); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> New Policy
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: s.color }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Policies by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={categoryData} cx={75} cy={75} innerRadius={42} outerRadius={70} paddingAngle={2} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {categoryData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 flex-shrink-0" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{d.name}</span>
                  <span className="text-xs font-bold ml-auto" style={{ color: 'hsl(var(--text-1))' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Policy Reviews per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={POLICY_REVIEW_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis tick={{ fill: ct.axis, fontSize: 11 }} label={{ value: 'Reviews', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Line type="monotone" dataKey="reviews" stroke="hsl(var(--brand))" strokeWidth={2} dot={{ fill: 'hsl(var(--brand))' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">All Statuses</option>
          {['published', 'in_review', 'draft'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {policies.length}</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Title', 'Category', 'Status', 'Version', 'Owner', 'Framework', 'Next Review', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const sc = statusColor(p.status);
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
                      <span className="line-clamp-2">{p.title}</span>
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{p.category}</td>
                    <td className="p-3">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{p.version}</td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{p.owner}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{p.framework}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(p.nextReview)}</td>
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
        <SheetContent style={{ width: 520, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
                <div className="flex gap-2">
                  {(() => { const sc = statusColor(viewItem.status); return (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
                      {viewItem.status.replace('_', ' ')}
                    </Badge>
                  ); })()}
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.category}</Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.version}</Badge>
                </div>
              </SheetHeader>
              <div className="space-y-3 mt-2">
                {[
                  { label: 'Policy ID', value: viewItem.id },
                  { label: 'Owner', value: viewItem.owner },
                  { label: 'Framework', value: viewItem.framework },
                  { label: 'Approver', value: viewItem.approver || 'Pending' },
                  { label: 'Last Review', value: formatDate(viewItem.lastReview) },
                  { label: 'Next Review', value: formatDate(viewItem.nextReview) },
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Policy</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Title', key: 'title' },
                { label: 'Owner', key: 'owner' },
                { label: 'Framework', key: 'framework' },
                { label: 'Approver', key: 'approver' },
                { label: 'Description', key: 'description' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value } : null)}
                    style={{ width: '100%', ...{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 } }}>
                    {['published', 'in_review', 'draft'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                  <select value={editItem.category} onChange={e => setEditItem(prev => prev ? { ...prev, category: e.target.value } : null)}
                    style={{ width: '100%', ...{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 } }}>
                    {['AI Usage', 'Risk', 'Data Privacy', 'AI Ethics', 'Regulatory', 'Vendor', 'Security', 'Governance'].map(s => <option key={s} value={s}>{s}</option>)}
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Title', key: 'title' },
              { label: 'Owner', key: 'owner' },
              { label: 'Framework', key: 'framework' },
              { label: 'Description', key: 'description' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['draft', 'in_review', 'published'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                <select value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['AI Usage', 'Risk', 'Data Privacy', 'AI Ethics', 'Regulatory', 'Vendor', 'Security', 'Governance'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.title}>Create Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Policy</AlertDialogTitle>
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
