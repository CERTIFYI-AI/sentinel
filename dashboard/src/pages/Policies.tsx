// SPDX-License-Identifier: Apache-2.0
// Policy Management — real org-scoped `policies` backend via
// hooks/queries/usePolicies (service throws; the hook owns success toasts).
// The list is the entry point; /policies/:id (PolicyDetail) is the canonical
// record surface — row clicks navigate there and ?open=<id> redirects there.
// The quick-view sheet (Eye) shows only the summary + "Open record".
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { usePolicies, useUpsertPolicy, useDeletePolicy, useSubmitPolicyForApproval } from '@/hooks/queries/usePolicies';
import { useControls } from '@/hooks/queries/useControls';
import { useAuthStore } from '../stores/authStore';
import type { PolicyRecord } from '../services/policyService';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { exportCsv } from '@/lib/exportUtils';
import {
  FileText, Plus, Eye, PencilSimple, Trash, MagnifyingGlass,
  CheckCircle, Clock, NotePencil, Download, PaperPlaneTilt,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useOrgName } from '../hooks/useOrganization';
import { useChartTheme } from '../hooks/useChartTheme';

const CATEGORY_COLORS = ['#3b82f6', 'hsl(var(--tag-purple))', 'hsl(var(--r-hi-tx))', 'hsl(var(--s-ok-tx))', '#ec4899', 'hsl(var(--s-in-tx))', 'hsl(var(--s-wn-tx))'];
const CATEGORIES = ['AI Usage', 'Risk', 'Data Privacy', 'AI Ethics', 'Regulatory', 'Vendor', 'Security', 'Governance'];

function policyStatusColor(status: string) {
  switch (status) {
    case 'published': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'in_review': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
    case 'archived': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  }
}

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface FormState {
  title: string; description: string; category: string; status: string;
  version: string; owner: string; framework: string; approver: string;
  nextReviewAt: string;
}
const EMPTY_FORM: FormState = {
  title: '', description: '', category: 'AI Usage', status: 'draft',
  version: '1.0', owner: '', framework: '', approver: '', nextReviewAt: '',
};

export default function Policies() {
  const navigate = useNavigate()
  const orgName = useOrgName();
  const { user } = useAuthStore();
  const ct = useChartTheme();
  const { data: policies = [], isLoading, error } = usePolicies();
  const upsertMutation = useUpsertPolicy();
  const deleteMutation = useDeletePolicy();
  const submitMutation = useSubmitPolicyForApproval();
  const { data: controls = [] } = useControls();
  const [searchParams] = useSearchParams();
  const openParam = searchParams.get('open');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewItem, setViewItem] = useState<PolicyRecord | null>(null);
  const [editItem, setEditItem] = useState<PolicyRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<PolicyRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  // Deep link: ?open=<uuid or policyRef> — /policies/:id is the canonical
  // detail surface, so redirect there instead of opening a local sheet.
  useEffect(() => {
    if (!openParam || isLoading) return;
    const match = policies.find(p => p.id === openParam || p.policyRef === openParam);
    navigate(match?.id ? `/policies/${match.id}` : `/policies/${openParam}`, { replace: true });
  }, [openParam, policies, isLoading, navigate]);

  const closeSheet = (open: boolean) => {
    if (!open) setViewItem(null);
  };

  const controlLabel = (id: string) => {
    const c = controls.find((c: any) => c.id === id);
    return c ? (c.controlRef || c.name || 'Unavailable') : 'Unavailable';
  };

  const filtered = policies.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (p.title ?? '').toLowerCase().includes(q)
      || (p.category ?? '').toLowerCase().includes(q)
      || (p.owner ?? '').toLowerCase().includes(q)
      || (p.policyRef ?? '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const categoryData = Array.from(
    policies.reduce((acc, p) => {
      const key = p.category || 'Uncategorised';
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }));

  // Upcoming reviews per month — computed from the real next_review_at /
  // next_review_date columns (no invented trend data).
  const reviewTrend = useMemo(() => {
    const months: { key: string; month: string; reviews: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        reviews: 0,
      });
    }
    for (const p of policies) {
      const due = p.nextReviewAt ?? p.nextReviewDate;
      if (!due) continue;
      const d = new Date(due);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = months.find(m => m.key === key);
      if (bucket) bucket.reviews += 1;
    }
    return months;
  }, [policies]);
  const hasReviewDates = policies.some(p => p.nextReviewAt ?? p.nextReviewDate);

  const stats = [
    { label: 'Total Policies', value: policies.length, icon: FileText, color: 'hsl(var(--brand))' },
    { label: 'Published', value: policies.filter(p => p.status === 'published').length, icon: CheckCircle, color: 'hsl(var(--s-ok-tx))' },
    { label: 'In Review', value: policies.filter(p => p.status === 'in_review').length, icon: Clock, color: 'hsl(var(--r-hi-tx))' },
    { label: 'Draft', value: policies.filter(p => p.status === 'draft').length, icon: NotePencil, color: 'hsl(var(--tag-purple))' },
  ];

  async function handleCreate() {
    // No client-minted PK — the DB uuid default assigns the id.
    const record: PolicyRecord = {
      title: formData.title.trim(),
      name: formData.title.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
      status: formData.status,
      version: formData.version || '1.0',
      owner: formData.owner.trim() || null,
      approver: formData.approver.trim() || null,
      framework: formData.framework.trim() || null,
      linkedFrameworks: formData.framework.trim() ? [formData.framework.trim()] : [],
      nextReviewAt: formData.nextReviewAt || null,
    };
    try {
      await upsertMutation.mutateAsync(record); // hook toasts success / error
      setCreateOpen(false);
      setFormData(EMPTY_FORM);
    } catch { /* hook surfaces the error toast; dialog stays open */ }
  }

  async function handleEdit() {
    if (!editItem) return;
    try {
      await upsertMutation.mutateAsync({ ...editItem, name: editItem.title });
      setEditItem(null);
    } catch { /* hook surfaces the error toast */ }
  }

  async function handleDelete() {
    if (!deleteItem?.id) return;
    try {
      await deleteMutation.mutateAsync(deleteItem.id);
      if (viewItem?.id === deleteItem.id) closeSheet(false);
      setDeleteItem(null);
    } catch { /* hook surfaces the error toast */ }
  }

  // Submit for approval: the service binds the request to the active
  // policy_change workflow, refuses duplicate pending requests, moves the
  // policy to in_review, and audits the submission. The hook owns the toasts.
  async function handleSubmitForApproval(p: PolicyRecord) {
    if (!p.id) return;
    try {
      await submitMutation.mutateAsync({ policy: p, requestedBy: user?.fullName ?? user?.email ?? null });
      setViewItem(prev => (prev && prev.id === p.id ? { ...prev, status: 'in_review' } : prev));
    } catch { /* hook surfaces the error toast */ }
  }

  function handleExport() {
    if (!filtered.length) { toast.error('No policies to export'); return; }
    exportCsv(
      filtered.map(p => ({
        policy_ref: p.policyRef ?? '',
        title: p.title,
        category: p.category ?? '',
        status: p.status,
        version: p.version ?? '',
        owner: p.owner ?? '',
        approver: p.approver ?? '',
        framework: p.framework ?? '',
        next_review: p.nextReviewAt ?? p.nextReviewDate ?? '',
      })),
      `policies-${new Date().toISOString().split('T')[0]}.csv`,
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy Management"
        subtitle={`${orgName} · ${policies.length} policies across all categories`}
        breadcrumbs={[{ label: 'Home', href: '/overview' }, { label: 'Policies' }]}
        actions={
          <>
            {/* A policy nobody has been trained on is not an operating control —
                AI Literacy holds the completion evidence (Art. 4). */}
            <Button variant="ghost" size="sm" onClick={() => navigate('/ai-literacy')}>
              Training
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} /> Export</Button>
            <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setCreateOpen(true); }}>
              <Plus size={14} /> New Policy
            </Button>
          </>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load policies</p>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{(error as Error).message}</p>
        </div>
      )}

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
            {categoryData.length === 0 ? (
              <p className="text-xs py-10 w-full text-center" style={{ color: 'hsl(var(--text-4))' }}>
                No policies yet — the category breakdown appears once policies exist.
              </p>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>

        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Upcoming Reviews (next 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasReviewDates ? (
              <p className="text-xs py-10 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                No review dates scheduled yet — set a next-review date on a policy to populate this chart.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={reviewTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} />
                  <YAxis allowDecimals={false} tick={{ fill: ct.axis, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                  <Bar dataKey="reviews" fill="hsl(var(--brand))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {['published', 'in_review', 'draft', 'archived'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {policies.length}</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['Ref', 'Title', 'Category', 'Status', 'Version', 'Owner', 'Framework', 'Next Review', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={9} className="p-8 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>Loading policies…</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      {policies.length === 0
                        ? 'No policies yet. Create one, or instantiate a template from the Policy Templates catalog.'
                        : 'No policies match your filters.'}
                    </td>
                  </tr>
                )}
                {filtered.map(p => {
                  const sc = policyStatusColor(p.status);
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer"
                      style={{ borderTop: '1px solid hsl(var(--border))' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                      onClick={() => p.id && navigate(`/policies/${p.id}`)}
                    >
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{p.policyRef ?? '—'}</td>
                      <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 220 }}>
                        <span className="line-clamp-2">{p.title}</span>
                      </td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{p.category ?? '—'}</td>
                      <td className="p-3">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                          {p.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{p.version ?? '—'}</td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{p.owner ?? '—'}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{p.framework ?? '—'}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{fmt(p.nextReviewAt ?? p.nextReviewDate)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(p)}>
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...p })}>
                            <PencilSimple size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(p)}>
                            <Trash size={14} />
                          </Button>
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

      {/* Quick-view sheet — summary only; /policies/:id is the record surface */}
      <Sheet open={!!viewItem} onOpenChange={closeSheet}>
        <SheetContent className="overflow-y-auto" style={{ width: 480, maxWidth: '90vw', background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  {(() => { const sc = policyStatusColor(viewItem.status); return (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
                      {viewItem.status.replace('_', ' ')}
                    </Badge>
                  ); })()}
                  {viewItem.category && <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.category}</Badge>}
                  {viewItem.version && <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.version}</Badge>}
                  {viewItem.framework && <Badge variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--brand))', borderColor: 'hsl(var(--brand))' }}>{viewItem.framework}</Badge>}
                </div>
              </SheetHeader>

              <div className="space-y-3">
                {[
                  { label: 'Policy Ref', value: viewItem.policyRef ?? '—' },
                  { label: 'Owner', value: viewItem.owner ?? '—' },
                  { label: 'Next Review', value: fmt(viewItem.nextReviewAt ?? viewItem.nextReviewDate) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}
                {viewItem.description && (
                  <p className="text-sm pt-1" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                )}
                {typeof viewItem.content?.summary === 'string' && viewItem.content.summary && (
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.content.summary}</p>
                )}
              </div>

              <div className="flex gap-2 mt-6 flex-wrap">
                <Button size="sm" style={{ borderRadius: 0 }}
                  onClick={() => viewItem.id && navigate(`/policies/${viewItem.id}`)}>
                  <ArrowSquareOut size={14} /> Open record
                </Button>
                {(viewItem.status === 'draft') && viewItem.id && (
                  <Button size="sm" variant="outline" style={{ borderRadius: 0 }} disabled={submitMutation.isPending}
                    onClick={() => handleSubmitForApproval(viewItem)}>
                    <PaperPlaneTilt size={14} /> Submit for approval
                  </Button>
                )}
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => closeSheet(false)}>Close</Button>
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
              {([
                { label: 'Title', key: 'title' },
                { label: 'Owner', key: 'owner' },
                { label: 'Framework', key: 'framework' },
                { label: 'Approver', key: 'approver' },
                { label: 'Version', key: 'version' },
              ] as { label: string; key: keyof PolicyRecord }[]).map(f => (
                <div key={f.key as string}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem[f.key] as string) || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
                <Textarea rows={3} value={editItem.description || ''} onChange={e => setEditItem(prev => prev ? { ...prev, description: e.target.value } : null)} style={{ borderRadius: 0 }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  {/* Publication happens only through the approval queue —
                      'published' is not a free pick unless already published. */}
                  <Select value={editItem.status} onValueChange={v => setEditItem(prev => prev ? { ...prev, status: v } : null)}>
                    <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {(editItem.status === 'published' ? ['published', 'in_review', 'draft', 'archived'] : ['in_review', 'draft', 'archived'])
                        .map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                  <Select value={editItem.category ?? ''} onValueChange={v => setEditItem(prev => prev ? { ...prev, category: v } : null)}>
                    <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Next Review</label>
                <Input type="date" value={(editItem.nextReviewAt ?? editItem.nextReviewDate ?? '').split('T')[0]} onChange={e => setEditItem(prev => prev ? { ...prev, nextReviewAt: e.target.value || null } : null)} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>
                  Linked Controls <span style={{ color: 'hsl(var(--text-4))', fontWeight: 400 }}>— controls this policy operationalises</span>
                </label>
                {controls.length === 0 ? (
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No controls available yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2" style={{ border: '1px solid hsl(var(--border))' }}>
                    {controls.map((c: any) => {
                      const selected = (editItem.linkedControlIds ?? []).includes(c.id);
                      return (
                        <button key={c.id} type="button"
                          title={c.name ?? c.title ?? ''}
                          onClick={() => setEditItem(prev => prev ? {
                            ...prev,
                            linkedControlIds: selected
                              ? (prev.linkedControlIds ?? []).filter(x => x !== c.id)
                              : [...(prev.linkedControlIds ?? []), c.id],
                          } : null)}
                          className="px-2 py-1 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]"
                          style={selected
                            ? { border: '1px solid hsl(var(--brand))', background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }
                            : { border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
                          {controlLabel(c.id)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={upsertMutation.isPending || !editItem?.title?.trim()} style={{ borderRadius: 0 }}>
              {upsertMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
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
            {([
              { label: 'Title', key: 'title' },
              { label: 'Owner', key: 'owner' },
              { label: 'Framework', key: 'framework' },
            ] as { label: string; key: keyof FormState }[]).map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={formData[f.key]} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</label>
              <Textarea rows={3} value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                {/* New policies are born draft/in_review — publication only
                    happens through the approval workflow. */}
                <Select value={formData.status} onValueChange={v => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['draft', 'in_review'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                <Select value={formData.category} onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Next Review</label>
              <Input type="date" value={formData.nextReviewAt} onChange={e => setFormData(prev => ({ ...prev, nextReviewAt: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.title.trim() || upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Creating…' : 'Create Policy'}
            </Button>
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
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
