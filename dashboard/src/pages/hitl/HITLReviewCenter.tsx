import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Users, Clock, Warning, CheckCircle, Plus, Eye, PencilSimple, Trash,
  MagnifyingGlass, ArrowSquareOut, Siren,
} from '@phosphor-icons/react';
import { HITL_REVIEWS, HITLReview, Severity, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

const EMPTY_REVIEW: Omit<HITLReview, 'id'> = {
  modelId: '', modelName: '', type: '', trigger: '', priority: 'medium',
  status: 'pending', assignee: '', sla: '24h remaining', riskScore: 50,
  createdDate: new Date().toISOString().split('T')[0], description: '',
};

function slaColor(sla: string): string {
  if (sla.toLowerCase() === 'overdue') return '#ef4444';
  if (sla.toLowerCase() === 'completed') return '#10b981';
  const match = sla.match(/(\d+)h/);
  if (match) {
    const h = parseInt(match[1]);
    if (h <= 4) return '#ef4444';
    if (h <= 12) return '#f97316';
    return 'hsl(var(--text-2))';
  }
  return 'hsl(var(--text-2))';
}

function riskBarColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  return '#10b981';
}

export default function HITLReviewCenter() {
  const { orgName } = useSettingsStore();

  const [reviews, setReviews] = useState<HITLReview[]>(HITL_REVIEWS);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const [viewItem, setViewItem] = useState<HITLReview | null>(null);
  const [editItem, setEditItem] = useState<HITLReview | null>(null);
  const [deleteItem, setDeleteItem] = useState<HITLReview | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<HITLReview, 'id'>>(EMPTY_REVIEW);

  const filtered = reviews.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.modelName.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.assignee.toLowerCase().includes(q);
    const matchTab = tab === 'all' || r.status === tab;
    return matchSearch && matchTab;
  });

  const pending = reviews.filter(r => r.status === 'pending').length;
  const inReview = reviews.filter(r => r.status === 'in_review').length;
  const escalated = reviews.filter(r => r.status === 'escalated').length;
  const avgRisk = Math.round(reviews.reduce((s, r) => s + r.riskScore, 0) / reviews.length);

  const stats = [
    { label: 'Pending', value: pending, icon: Clock, color: '#f97316' },
    { label: 'In Review', value: inReview, icon: Users, color: '#3b82f6' },
    { label: 'Escalated', value: escalated, icon: Siren, color: '#ef4444' },
    { label: 'Avg Risk Score', value: avgRisk, icon: Warning, color: '#8b5cf6' },
  ];

  function handleCreate() {
    const id = `HITL-${String(reviews.length + 1).padStart(3, '0')}`;
    setReviews(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_REVIEW);
  }

  function handleEdit() {
    if (!editItem) return;
    setReviews(prev => prev.map(r => r.id === editItem.id ? editItem : r));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setReviews(prev => prev.filter(r => r.id !== deleteItem.id));
    setDeleteItem(null);
  }

  const selectStyle = {
    background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0,
  };

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Breadcrumb */}
      <div className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
        <span style={{ color: 'hsl(var(--text-1))' }}>HITL Reviews</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>HITL Review Center</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Human-in-the-Loop AI decision review queue
          </p>
        </div>
        <Button size="sm" onClick={() => { setFormData(EMPTY_REVIEW); setCreateOpen(true); }}>
          <Plus size={14} className="mr-1" /> Add Review
        </Button>
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

      {/* Filter tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="all" style={{ borderRadius: 0 }}>All ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending" style={{ borderRadius: 0 }}>Pending ({pending})</TabsTrigger>
          <TabsTrigger value="in_review" style={{ borderRadius: 0 }}>In Review ({inReview})</TabsTrigger>
          <TabsTrigger value="escalated" style={{ borderRadius: 0 }}>Escalated ({escalated})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {reviews.length}</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <CheckCircle size={40} style={{ color: '#10b981' }} />
              <p className="mt-3 text-sm font-medium">No reviews match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'Model', 'Type', 'Priority', 'Status', 'SLA', 'Risk Score', 'Assignee', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const sc = severityColor(r.priority);
                  const statc = statusColor(r.status);
                  const isOverdue = r.sla.toLowerCase() === 'overdue';
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer"
                      style={{ borderTop: '1px solid hsl(var(--border))', background: isOverdue ? 'hsl(var(--s-er-bg))' : '' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      onClick={() => setViewItem(r)}
                    >
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.id}</td>
                      <td className="p-3">
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.modelName}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.modelId}</p>
                      </td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{r.type}</td>
                      <td className="p-3">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                          {r.priority}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge style={{ background: statc.bg, color: statc.text, border: `1px solid ${statc.border}`, borderRadius: 0, fontSize: 11 }}>
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-semibold" style={{ color: slaColor(r.sla) }}>
                          {r.sla}
                          {isOverdue && <span className="ml-1">⚠</span>}
                        </span>
                      </td>
                      <td className="p-3" style={{ minWidth: 110 }}>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, background: 'hsl(var(--bg-muted))', height: 6 }}>
                            <div style={{ width: r.riskScore + '%', height: '100%', background: riskBarColor(r.riskScore) }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: riskBarColor(r.riskScore) }}>{r.riskScore}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{r.assignee}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(r.createdDate)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(r)}>
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...r })}>
                            <PencilSimple size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(r)}>
                            <Trash size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 520, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.type}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  {(() => { const sc = severityColor(viewItem.priority); return (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
                      {viewItem.priority} priority
                    </Badge>
                  ); })()}
                  {(() => { const sc = statusColor(viewItem.status); return (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
                      {viewItem.status.replace('_', ' ')}
                    </Badge>
                  ); })()}
                  <Badge variant="outline" style={{ borderRadius: 0, color: slaColor(viewItem.sla) }}>
                    SLA: {viewItem.sla}
                  </Badge>
                </div>
              </SheetHeader>
              <div className="space-y-3 mt-2">
                <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                {[
                  { label: 'Review ID', value: viewItem.id },
                  { label: 'Model', value: `${viewItem.modelName} (${viewItem.modelId})` },
                  { label: 'Trigger', value: viewItem.trigger },
                  { label: 'Assignee', value: viewItem.assignee },
                  { label: 'Created', value: formatDate(viewItem.createdDate) },
                  { label: 'Risk Score', value: viewItem.riskScore.toString() },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}
                {/* Risk bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'hsl(var(--text-3))' }}>Risk Score</span>
                    <span style={{ color: riskBarColor(viewItem.riskScore) }}>{viewItem.riskScore}/100</span>
                  </div>
                  <div style={{ background: 'hsl(var(--bg-muted))', height: 10 }}>
                    <div style={{ width: viewItem.riskScore + '%', height: '100%', background: riskBarColor(viewItem.riskScore) }} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} className="mr-1" /> Edit
                </Button>
                <Link to={`/hitl/${viewItem.id}`} onClick={() => setViewItem(null)}>
                  <Button size="sm" variant="outline">
                    <ArrowSquareOut size={14} className="mr-1" /> Full Detail
                  </Button>
                </Link>
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Review</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Model Name', key: 'modelName' },
                { label: 'Type', key: 'type' },
                { label: 'Trigger', key: 'trigger' },
                { label: 'Assignee', key: 'assignee' },
                { label: 'Description', key: 'description' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Priority</label>
                  <select value={editItem.priority} onChange={e => setEditItem(prev => prev ? { ...prev, priority: e.target.value as Severity } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['pending', 'in_review', 'escalated', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Risk Score</label>
                <Input type="number" min={0} max={100} value={editItem.riskScore}
                  onChange={e => setEditItem(prev => prev ? { ...prev, riskScore: Number(e.target.value) } : null)}
                  style={{ borderRadius: 0 }} />
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add HITL Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Model Name', key: 'modelName' },
              { label: 'Model ID', key: 'modelId' },
              { label: 'Type', key: 'type' },
              { label: 'Trigger', key: 'trigger' },
              { label: 'Assignee', key: 'assignee' },
              { label: 'Description', key: 'description' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Priority</label>
                <select value={formData.priority} onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as Severity }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Risk Score</label>
                <Input type="number" min={0} max={100} value={formData.riskScore}
                  onChange={e => setFormData(prev => ({ ...prev, riskScore: Number(e.target.value) }))}
                  style={{ borderRadius: 0 }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.modelName} style={{ borderRadius: 0 }}>Add Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the review for <strong>{deleteItem?.modelName}</strong>? This action cannot be undone.
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
