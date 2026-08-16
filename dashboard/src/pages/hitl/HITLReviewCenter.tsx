// SPDX-License-Identifier: Apache-2.0
// HITL Review Center — the human side of the queue the agent mesh writes to.
// Reads/writes hitl_reviews via useHitlReviews(); decisions persist and are
// audited server-side. No fake toasts, no simulated latency, no invented KPIs.
import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Eye, MagnifyingGlass, Funnel, Clock, Warning, CheckCircle,
  XCircle, Queue, Plus, Info, User, UsersThree, ShieldWarning,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import { severityColor, statusColor, formatDate, timeAgo } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { useHitlReviews } from '../../hooks/useRiskIncidents';
import { useModelsData } from '@/hooks/useModelsData';
import type { HitlRecord } from '../../services/oversightService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ENTITY_TYPES = ['model', 'incident', 'deployment', 'agent', 'dataset', 'vendor'];

function entityTypeBadge(t?: string) {
  const map: Record<string, { bg: string; color: string }> = {
    model: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    agent: { bg: 'hsl(270 70% 56% / 0.15)', color: 'hsl(270 70% 56%)' },
    dataset: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    vendor: { bg: 'hsl(180 60% 45% / 0.15)', color: 'hsl(180 60% 45%)' },
    incident: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    deployment: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  };
  const key = (t ?? 'model').toLowerCase();
  const s = map[key] ?? map.model;
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>
      {key.charAt(0).toUpperCase() + key.slice(1)}
    </Badge>
  );
}

function priorityBadge(p: string) {
  const sc = severityColor(p);
  return (
    <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 11 }}>
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </Badge>
  );
}

function hitlStatusBadge(s: string) {
  const sc = statusColor(s);
  const label: Record<string, string> = {
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected', info_requested: 'Info Requested',
  };
  return (
    <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 11 }}>
      {label[s] ?? s.replace(/_/g, ' ')}
    </Badge>
  );
}

const isOpen = (r: HitlRecord) => r.status === 'pending' || r.status === 'info_requested';

function isOverdue(r: HitlRecord): boolean {
  return r.status === 'pending' && !!r.slaDeadline && new Date(r.slaDeadline) < new Date();
}

function slaDisplay(r: HitlRecord) {
  if (r.status === 'approved' || r.status === 'rejected') {
    return <span className="text-xs text-[hsl(var(--s-ok-tx))]">Completed</span>;
  }
  if (!r.slaDeadline) return <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No SLA</span>;
  const deadline = new Date(r.slaDeadline);
  const now = new Date();
  if (deadline < now) {
    const hoursOver = Math.round((now.getTime() - deadline.getTime()) / 3600000);
    return <span className="text-xs font-semibold text-destructive">{hoursOver}h overdue</span>;
  }
  const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / 3600000);
  return <span className="text-xs" style={{ color: hoursLeft < 4 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }}>{hoursLeft}h remaining</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function HITLReviewCenter() {
  const { orgName } = useSettingsStore();
  const user = useAuthStore(s => s.user);
  const currentUser = user?.fullName || user?.email || 'Reviewer';
  const { items, isLoading, error, save, decide, isDeciding, isSaving } = useHitlReviews();
  const { models } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const modelName = (id?: string | null) =>
    (id && models.find(m => m.id === id)?.name) ?? 'Unavailable';

  // Deep link: ?open=<uuid> opens the review sheet for that record.
  const openParam = searchParams.get('open');
  useEffect(() => {
    if (openParam && items.some(i => i.id === openParam)) {
      setSelectedId(openParam);
      setReviewRemarks(items.find(i => i.id === openParam)?.remarks ?? '');
    }
  }, [openParam, items]);

  const selectedItem = useMemo(
    () => items.find(i => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const closeSheet = () => {
    setSelectedId(null);
    setReviewRemarks('');
    if (openParam) {
      searchParams.delete('open');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // Derived KPIs — counted from real records only.
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const overdueCount = items.filter(isOverdue).length;
  const blockingCount = items.filter(i => i.blocksDeployment && i.status === 'pending').length;
  const decidedToday = items.filter(i =>
    i.decidedAt && new Date(i.decidedAt).toDateString() === new Date().toDateString()
  ).length;

  // Reviewer workload — bucketed on assignedTo over the real queue.
  const reviewerWorkload = useMemo(() => {
    const workloadMap: Record<string, { total: number; pending: number; overdue: number }> = {};
    items.forEach(item => {
      const who = item.assignedTo || 'Unassigned';
      if (!workloadMap[who]) workloadMap[who] = { total: 0, pending: 0, overdue: 0 };
      workloadMap[who].total += 1;
      if (isOpen(item)) workloadMap[who].pending += 1;
      if (isOverdue(item)) workloadMap[who].overdue += 1;
    });
    return Object.entries(workloadMap)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.pending - a.pending);
  }, [items]);

  const assignees = ['all', ...Array.from(new Set(items.map(i => i.assignedTo || 'Unassigned')))];

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (i.title ?? '').toLowerCase().includes(q) ||
      (i.entityName ?? '').toLowerCase().includes(q) ||
      (i.triggerReason ?? '').toLowerCase().includes(q);
    const matchTab = activeTab === 'all' ||
      (activeTab === 'queue' && isOpen(i)) ||
      (activeTab === 'overdue' && isOverdue(i)) ||
      (activeTab === 'approved' && i.status === 'approved') ||
      (activeTab === 'rejected' && i.status === 'rejected');
    const matchEntity = entityTypeFilter === 'all' || (i.entityType ?? '') === entityTypeFilter;
    const matchAssignee = assigneeFilter === 'all' || (i.assignedTo || 'Unassigned') === assigneeFilter;
    return matchSearch && matchTab && matchEntity && matchAssignee;
  });

  const runDecision = async (decision: 'approved' | 'rejected' | 'info_requested', remarks: string) => {
    if (!selectedItem?.id) return;
    try {
      await decide({ id: selectedItem.id, decision, decidedBy: currentUser, remarks: remarks.trim() || undefined });
      setRejectDialogOpen(false);
      setRejectReason('');
      closeSheet();
    } catch { /* hook toasts the error; keep the sheet open so nothing is lost */ }
  };

  const entityLink = (r: HitlRecord) => {
    if (r.entityType === 'model' || (r.entityType === 'deployment' && (r.modelId || r.entityId))) {
      const id = r.modelId || r.entityId;
      if (id) return <InterlinkChip label={modelName(id)} to={`/models/inventory/${id}`} />;
    }
    if (r.entityType === 'incident' && r.entityId) {
      return <InterlinkChip label={r.entityName || 'Incident'} to={`/risk/incidents?open=${r.entityId}`} />;
    }
    return <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.entityName || '—'}</span>;
  };

  if (isLoading) return <PageSkeleton title="HITL Review Center" showStats rows={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="HITL Review Center"
        subtitle={`${orgName} · Human-in-the-Loop review queue for AI decisions — shared with the agent mesh`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Oversight' }, { label: 'HITL Reviews' }]}
        actions={
          <Button onClick={() => setAddDialogOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <Plus className="h-4 w-4" />Queue Review
          </Button>
        }
      />

      {/* Real query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load the review queue</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Metric tiles — all derived from real records */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Reviews', value: pendingCount, color: 'hsl(var(--s-wn-tx))', icon: Clock },
          { label: 'Overdue', value: overdueCount, color: 'hsl(var(--destructive))', icon: Warning },
          { label: 'Blocking Deployment', value: blockingCount, color: 'hsl(var(--s-er-tx))', icon: ShieldWarning },
          { label: 'Decided Today', value: decidedToday, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reviewer workload — bucketed on assignedTo over real items */}
      {reviewerWorkload.length > 0 && (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <UsersThree size={16} style={{ color: 'hsl(var(--brand))' }} />
              <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Reviewer Workload</span>
            </div>
            <div className="space-y-2">
              {reviewerWorkload.map(reviewer => {
                const maxPending = Math.max(...reviewerWorkload.map(r => r.pending), 1);
                const barWidth = (reviewer.pending / maxPending) * 100;
                return (
                  <div key={reviewer.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className="flex items-center justify-center" style={{
                        width: 24, height: 24, borderRadius: 0,
                        background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))',
                      }}>
                        <User size={12} style={{ color: 'hsl(var(--text-4))' }} />
                      </div>
                      <span className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>
                        {reviewer.name}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-4 relative" style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                        <div style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          background: reviewer.overdue > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--brand))',
                          borderRadius: 0,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <Badge style={{
                        borderRadius: 0, fontSize: 10, minWidth: 24, justifyContent: 'center',
                        background: reviewer.pending > 0 ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-ok-bg))',
                        color: reviewer.pending > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                      }}>
                        {reviewer.pending} open
                      </Badge>
                      {reviewer.overdue > 0 && (
                        <Badge style={{
                          borderRadius: 0, fontSize: 10, minWidth: 24, justifyContent: 'center',
                          background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))',
                        }}>
                          {reviewer.overdue} overdue
                        </Badge>
                      )}
                      <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                        {reviewer.total} total
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs + filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="all" style={{ borderRadius: 0 }}>All ({items.length})</TabsTrigger>
            <TabsTrigger value="queue" style={{ borderRadius: 0 }}>Queue ({items.filter(isOpen).length})</TabsTrigger>
            <TabsTrigger value="overdue" style={{ borderRadius: 0 }}>Overdue ({overdueCount})</TabsTrigger>
            <TabsTrigger value="approved" style={{ borderRadius: 0 }}>Approved ({items.filter(i => i.status === 'approved').length})</TabsTrigger>
            <TabsTrigger value="rejected" style={{ borderRadius: 0 }}>Rejected ({items.filter(i => i.status === 'rejected').length})</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative min-w-52">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
              <Input placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
            </div>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
                <Funnel className="h-3 w-3 mr-1" /><SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="all">All Types</SelectItem>
                {ENTITY_TYPES.map(t =>
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-44 h-9" style={{ borderRadius: 0 }}>
                <User className="h-3 w-3 mr-1" /><SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {assignees.map(a => <SelectItem key={a} value={a}>{a === 'all' ? 'All Assignees' : a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <Queue size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">
                    {items.length === 0 || (activeTab === 'queue' && items.filter(isOpen).length === 0 && !search)
                      ? 'The queue is clear — no reviews waiting.'
                      : 'No reviews match your filters'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Review', 'Entity', 'Trigger Reason', 'Assigned To', 'SLA', 'Priority', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(item => (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          style={{
                            borderBottom: '1px solid hsl(var(--border))',
                            borderLeft: isOverdue(item) ? '4px solid hsl(var(--s-er-tx))' : '4px solid transparent',
                          }}
                          onClick={() => { setSelectedId(item.id ?? null); setReviewRemarks(item.remarks || ''); }}
                        >
                          <td className="px-4 py-3 max-w-[240px]" onClick={e => e.stopPropagation()}>
                            <Link to={`/hitl/${item.id}`} className="text-xs font-medium hover:underline line-clamp-2" style={{ color: 'hsl(var(--brand))' }}>
                              {item.title}
                            </Link>
                            {item.blocksDeployment && isOpen(item) && (
                              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9, marginTop: 4 }}>
                                Blocks deployment
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2 flex-wrap">
                              {entityTypeBadge(item.entityType)}
                              {entityLink(item)}
                              {item.linkedRiskId && (
                                <InterlinkChip label="Risk" to={`/risks?open=${item.linkedRiskId}`} />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs max-w-[260px]" style={{ color: 'hsl(var(--text-2))' }}>
                            <span className="line-clamp-2">{item.triggerReason || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{item.assignedTo || 'Unassigned'}</td>
                          <td className="px-4 py-3">{slaDisplay(item)}</td>
                          <td className="px-4 py-3">{priorityBadge(item.priority)}</td>
                          <td className="px-4 py-3">{hitlStatusBadge(item.status)}</td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => { setSelectedId(item.id ?? null); setReviewRemarks(item.remarks || ''); }}>
                              <Eye size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={open => { if (!open) closeSheet(); }}>
        <SheetContent style={{ borderRadius: 0, width: 640, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              {selectedItem?.title ?? 'Review'}
            </SheetTitle>
          </SheetHeader>
          {selectedItem && (
            <div className="mt-4 space-y-5 overflow-y-auto h-[calc(100vh-120px)]">
              {/* Entity context */}
              <div className="p-4 space-y-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  {entityTypeBadge(selectedItem.entityType)}
                  {priorityBadge(selectedItem.priority)}
                  {hitlStatusBadge(selectedItem.status)}
                  {isOverdue(selectedItem) && (
                    <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                      OVERDUE
                    </Badge>
                  )}
                  {selectedItem.blocksDeployment && (
                    <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                      BLOCKS DEPLOYMENT
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Entity</p>
                    <div className="mt-0.5">{entityLink(selectedItem)}</div>
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Linked Risk</p>
                    {selectedItem.linkedRiskId
                      ? <div className="mt-0.5"><InterlinkChip label="Open risk" to={`/risks?open=${selectedItem.linkedRiskId}`} /></div>
                      : <p style={{ color: 'hsl(var(--text-4))' }}>—</p>}
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Assigned To</p>
                    <p className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.assignedTo || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>SLA</p>
                    {slaDisplay(selectedItem)}
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Created</p>
                    <p style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.createdAt ? formatDate(selectedItem.createdAt) : '—'}</p>
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Review Type</p>
                    <p style={{ color: 'hsl(var(--text-1))' }}>{(selectedItem.reviewType ?? '—').replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <Link to={`/hitl/${selectedItem.id}`} className="inline-block text-xs font-medium hover:underline" style={{ color: 'hsl(var(--brand))' }}>
                  Open full review page →
                </Link>
              </div>

              {/* Trigger alert */}
              {selectedItem.triggerReason && (
                <div className="p-3 flex gap-3" style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-bg))' }}>
                  <Warning size={18} style={{ color: 'hsl(var(--s-wn-tx))', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-wn-tx))' }}>Trigger Reason</p>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.triggerReason}</p>
                  </div>
                </div>
              )}

              {selectedItem.description && (
                <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{selectedItem.description}</p>
              )}

              {/* Decision section — persists via decide(), audited server-side */}
              {isOpen(selectedItem) && (
                <div className="p-4 space-y-3" style={{ border: '1px solid hsl(var(--border))' }}>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Review Decision (as {currentUser})</p>
                  <div>
                    <label className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Remarks (min 10 characters) *</label>
                    <textarea
                      value={reviewRemarks}
                      onChange={e => setReviewRemarks(e.target.value)}
                      className="mt-1 w-full h-24 text-xs p-3 resize-none"
                      style={{
                        borderRadius: 0,
                        background: 'hsl(var(--bg-surface))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--text-1))',
                      }}
                      placeholder="Provide your review decision remarks..."
                    />
                    <p className="text-xs mt-1" style={{ color: reviewRemarks.length >= 10 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}>
                      {reviewRemarks.length}/10 characters minimum
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={reviewRemarks.length < 10 || isDeciding}
                      onClick={() => runDecision('approved', reviewRemarks)}
                      style={{ borderRadius: 0, background: reviewRemarks.length >= 10 ? 'hsl(var(--s-ok-tx))' : undefined, color: reviewRemarks.length >= 10 ? 'hsl(var(--bg-surface))' : undefined }}
                    >
                      <CheckCircle size={14} />{isDeciding ? 'Saving…' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewRemarks.length < 10 || isDeciding}
                      onClick={() => runDecision('info_requested', reviewRemarks)}
                      style={{ borderRadius: 0 }}
                    >
                      <Info size={14} />Request Info
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isDeciding}
                      onClick={() => { setRejectDialogOpen(true); setRejectReason(''); }}
                      style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}
                    >
                      <XCircle size={14} />Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Recorded decision */}
              {(selectedItem.status === 'approved' || selectedItem.status === 'rejected') && (
                <div className="p-3" style={{
                  border: `1px solid ${selectedItem.status === 'approved' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))'}`,
                  background: selectedItem.status === 'approved' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
                }}>
                  <p className="text-xs font-semibold" style={{
                    color: selectedItem.status === 'approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
                  }}>
                    Decision: {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                    {selectedItem.decidedBy ? ` — ${selectedItem.decidedBy}` : ''}
                    {selectedItem.decidedAt ? ` · ${timeAgo(selectedItem.decidedAt)}` : ''}
                  </p>
                  {selectedItem.remarks && (
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.remarks}</p>
                  )}
                </div>
              )}

              {/* Timeline — derived from the record itself */}
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Review History</p>
                <div className="space-y-0">
                  {[
                    selectedItem.createdAt && {
                      action: `Review opened${selectedItem.triggerReason ? ` — ${selectedItem.triggerReason}` : ''}`,
                      by: selectedItem.assignedTo ? `Assigned to ${selectedItem.assignedTo}` : 'Unassigned',
                      date: selectedItem.createdAt,
                    },
                    selectedItem.decidedAt && {
                      action: `${(selectedItem.decision ?? selectedItem.status).replace(/_/g, ' ')}${selectedItem.remarks ? ` — ${selectedItem.remarks}` : ''}`,
                      by: selectedItem.decidedBy ?? 'Unknown',
                      date: selectedItem.decidedAt,
                    },
                  ].filter(Boolean).map((h: any, idx, arr) => (
                    <div key={idx} className="flex gap-3 py-2" style={{ borderBottom: idx < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full mt-1" style={{ background: 'hsl(var(--brand))' }} />
                        {idx < arr.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ background: 'hsl(var(--border))' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{h.action}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                          {h.by} · {timeAgo(h.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject reason dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Provide a detailed reason for rejecting <strong style={{ color: 'hsl(var(--text-1))' }}>{selectedItem?.title}</strong> (min 20 characters).
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full h-28 text-xs p-3 resize-none"
              style={{
                borderRadius: 0,
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--text-1))',
              }}
              placeholder="Explain why this review item is being rejected..."
            />
            <p className="text-xs" style={{ color: rejectReason.length >= 20 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}>
              {rejectReason.length}/20 characters minimum
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button
              disabled={rejectReason.length < 20 || isDeciding}
              onClick={() => runDecision('rejected', rejectReason)}
              style={{ borderRadius: 0, background: rejectReason.length >= 20 ? 'hsl(var(--destructive))' : undefined, color: rejectReason.length >= 20 ? 'hsl(var(--bg-surface))' : undefined }}
            >
              <XCircle size={14} />{isDeciding ? 'Saving…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Queue new review dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Queue New Review</DialogTitle>
          </DialogHeader>
          <AddReviewForm
            models={models}
            isSaving={isSaving}
            onSubmit={async (record) => {
              try {
                await save(record);
                setAddDialogOpen(false);
              } catch { /* hook toasts the error; keep dialog open */ }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Add Review Form — writes a real HitlRecord via save() ────────────────────

function AddReviewForm({ models, isSaving, onSubmit }: {
  models: { id: string; name: string }[];
  isSaving: boolean;
  onSubmit: (record: HitlRecord) => Promise<void>;
}) {
  const [entityType, setEntityType] = useState('model');
  const [modelId, setModelId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityId, setEntityId] = useState('');
  const [triggerReason, setTriggerReason] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [slaHours, setSlaHours] = useState(24);
  const [blocksDeployment, setBlocksDeployment] = useState(false);

  const isModel = entityType === 'model';
  const canSubmit = triggerReason.trim().length >= 10 && assignedTo.trim()
    && (isModel ? !!modelId : !!entityName.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    const model = models.find(m => m.id === modelId);
    onSubmit({
      entityType,
      entityId: isModel ? modelId : (entityId.trim() || null),
      entityName: isModel ? (model?.name ?? null) : entityName.trim(),
      modelId: isModel ? modelId : null,
      reviewType: 'manual_review',
      title: `${isModel ? (model?.name ?? 'Model') : entityName.trim()} — manual review`,
      status: 'pending',
      priority,
      triggerReason: triggerReason.trim(),
      assignedTo: assignedTo.trim(),
      slaHours,
      slaDeadline: new Date(Date.now() + slaHours * 3600000).toISOString(),
      blocksDeployment,
    });
  };

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Entity Type *</label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {ENTITY_TYPES.map(t =>
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Priority *</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['critical', 'high', 'medium', 'low'].map(p =>
                <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isModel ? (
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Model *</label>
          <Select value={modelId} onValueChange={setModelId}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}>
              <SelectValue placeholder={models.length ? 'Select a registered model' : 'No models registered'} />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Entity Name *</label>
            <Input value={entityName} onChange={e => setEntityName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. INC-2026-610" />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Entity ID (optional)</label>
            <Input value={entityId} onChange={e => setEntityId(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Record id for deep-linking" />
          </div>
        </>
      )}
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Trigger Reason * (min 10 chars)</label>
        <textarea value={triggerReason} onChange={e => setTriggerReason(e.target.value)}
          className="mt-1 w-full h-16 text-xs p-2 resize-none"
          style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
          placeholder="Describe the reason for queuing this review..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Assignee *</label>
          <Input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Head of Model Risk" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>SLA (hours)</label>
          <Input type="number" min={1} value={slaHours} onChange={e => setSlaHours(Math.max(1, +e.target.value || 1))} className="mt-1" style={{ borderRadius: 0 }} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
        <input type="checkbox" checked={blocksDeployment} onChange={e => setBlocksDeployment(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--brand))]" />
        Block deployment until this review is decided
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={!canSubmit || isSaving} onClick={handleSubmit} style={{ borderRadius: 0, background: canSubmit ? 'hsl(var(--brand))' : undefined, color: canSubmit ? 'hsl(var(--bg-surface))' : undefined }}>
          <Plus size={14} />{isSaving ? 'Saving…' : 'Queue Review'}
        </Button>
      </div>
    </div>
  );
}
