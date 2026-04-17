import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Eye, MagnifyingGlass, Funnel, Clock, Warning, CheckCircle,
  XCircle, Queue, Plus, Info, ArrowRight, User, Flag, UsersThree,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  HITL_ITEMS, HITLItem, HITLStatus, Severity, USERS,
  severityColor, statusColor, formatDate, timeAgo,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

function entityTypeBadge(t: HITLItem['entityType']) {
  const map: Record<string, { bg: string; color: string }> = {
    model: { bg: 'hsl(220 90% 56% / 0.15)', color: 'hsl(var(--s-in-tx))' },
    agent: { bg: 'hsl(270 70% 56% / 0.15)', color: 'hsl(270 70% 56%)' },
    dataset: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))' },
    vendor: { bg: 'hsl(180 60% 45% / 0.15)', color: 'hsl(180 60% 45%)' },
    incident: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  };
  const s = map[t] ?? map.model;
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>
      {t.charAt(0).toUpperCase() + t.slice(1)}
    </Badge>
  );
}

function priorityBadge(p: Severity) {
  const sc = severityColor(p);
  return (
    <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 11 }}>
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </Badge>
  );
}

function hitlStatusBadge(s: HITLStatus) {
  const sc = statusColor(s);
  const label: Record<HITLStatus, string> = {
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    escalated: 'Escalated', info_requested: 'Info Requested',
  };
  return (
    <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 11 }}>
      {label[s]}
    </Badge>
  );
}

function isOverdue(item: HITLItem): boolean {
  if (item.status === 'approved' || item.status === 'rejected') return false;
  return item.overdue || new Date(item.slaDeadline) < new Date();
}

function slaDisplay(item: HITLItem) {
  if (item.status === 'approved' || item.status === 'rejected') {
    return <span className="text-xs text-green-600 dark:text-green-400">Completed</span>;
  }
  const deadline = new Date(item.slaDeadline);
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
  const [items, setItems] = useState<HITLItem[]>(HITL_ITEMS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<HITLItem | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Derived metrics
  const pendingCount = items.filter(i => i.status === 'pending' || i.status === 'escalated').length;
  const overdueCount = items.filter(i => isOverdue(i)).length;
  const approvedToday = items.filter(i => i.status === 'approved').length;
  const avgReviewTime = '4.2h';

  // Reviewer workload
  const reviewerWorkload = useMemo(() => {
    const workloadMap: Record<string, { total: number; pending: number; overdue: number }> = {};
    items.forEach(item => {
      if (!workloadMap[item.assignedTo]) {
        workloadMap[item.assignedTo] = { total: 0, pending: 0, overdue: 0 };
      }
      workloadMap[item.assignedTo].total += 1;
      if (item.status === 'pending' || item.status === 'escalated' || item.status === 'info_requested') {
        workloadMap[item.assignedTo].pending += 1;
      }
      if (isOverdue(item)) {
        workloadMap[item.assignedTo].overdue += 1;
      }
    });
    return Object.entries(workloadMap)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.pending - a.pending);
  }, [items]);

  // Filters
  const assignees = ['all', ...Array.from(new Set(items.map(i => i.assignedTo)))];

  const filtered = items.filter(i => {
    const matchSearch = i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.entityName.toLowerCase().includes(search.toLowerCase()) ||
      i.triggerReason.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' ||
      (activeTab === 'pending' && (i.status === 'pending' || i.status === 'escalated')) ||
      (activeTab === 'overdue' && isOverdue(i)) ||
      (activeTab === 'approved' && i.status === 'approved') ||
      (activeTab === 'rejected' && i.status === 'rejected');
    const matchEntity = entityTypeFilter === 'all' || i.entityType === entityTypeFilter;
    const matchAssignee = assigneeFilter === 'all' || i.assignedTo === assigneeFilter;
    return matchSearch && matchTab && matchEntity && matchAssignee;
  });

  const handleApprove = (item: HITLItem) => {
    if (reviewRemarks.length < 10) return;
    setItems(prev => prev.map(i => i.id === item.id ? {
      ...i,
      status: 'approved' as HITLStatus,
      remarks: reviewRemarks,
      history: [...i.history, { date: new Date().toISOString(), action: `Approved — ${reviewRemarks}`, by: 'Current User' }],
    } : i));
    toast(`${item.id} approved — ${item.entityName}`);
    setSelectedItem(null);
    setReviewRemarks('');
  };

  const handleRequestInfo = (item: HITLItem) => {
    if (reviewRemarks.length < 10) return;
    setItems(prev => prev.map(i => i.id === item.id ? {
      ...i,
      status: 'info_requested' as HITLStatus,
      remarks: reviewRemarks,
      history: [...i.history, { date: new Date().toISOString(), action: `Info requested — ${reviewRemarks}`, by: 'Current User' }],
    } : i));
    toast(`Info requested for ${item.id}`, 'info');
    setSelectedItem(null);
    setReviewRemarks('');
  };

  const handleReject = () => {
    if (!selectedItem || rejectReason.length < 20) return;
    setItems(prev => prev.map(i => i.id === selectedItem.id ? {
      ...i,
      status: 'rejected' as HITLStatus,
      remarks: rejectReason,
      history: [...i.history, { date: new Date().toISOString(), action: `Rejected — ${rejectReason}`, by: 'Current User' }],
    } : i));
    toast(`${selectedItem.id} rejected — ${selectedItem.entityName}`, 'error');
    setRejectDialogOpen(false);
    setSelectedItem(null);
    setRejectReason('');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /></div>
          <div className="flex gap-2"><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /></div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>HITL Review Center</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Human-in-the-Loop review queue for AI decisions</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <Plus className="h-4 w-4 mr-2" />Queue Review
        </Button>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Reviews', value: pendingCount, color: 'hsl(var(--s-wn-tx))', icon: Clock },
          { label: 'Overdue', value: overdueCount, color: 'hsl(var(--destructive))', icon: Warning },
          { label: 'Approved Today', value: approvedToday, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
          { label: 'Avg Review Time', value: avgReviewTime, color: 'hsl(var(--s-in-tx))', icon: Info },
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

      {/* Reviewer Workload */}
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
                      background: reviewer.pending > 0 ? 'hsl(var(--s-wn-bg, 45 93% 47% / 0.1))' : 'hsl(var(--s-ok-bg, 142 71% 45% / 0.1))',
                      color: reviewer.pending > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                      border: `1px solid ${reviewer.pending > 0 ? 'hsl(var(--s-wn-br, 45 93% 47% / 0.3))' : 'hsl(var(--s-ok-br, 142 71% 45% / 0.3))'}`,
                    }}>
                      {reviewer.pending} open
                    </Badge>
                    {reviewer.overdue > 0 && (
                      <Badge style={{
                        borderRadius: 0, fontSize: 10, minWidth: 24, justifyContent: 'center',
                        background: 'hsl(0 72% 51% / 0.1)',
                        color: 'hsl(var(--destructive))',
                        border: '1px solid hsl(0 72% 51% / 0.3)',
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

      {/* Tabs + Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="all" style={{ borderRadius: 0 }}>All ({items.length})</TabsTrigger>
            <TabsTrigger value="pending" style={{ borderRadius: 0 }}>Pending ({pendingCount})</TabsTrigger>
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
                {['model', 'agent', 'dataset', 'vendor', 'incident'].map(t =>
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
          {/* Table */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <Queue size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No reviews match your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['ID', 'Entity', 'Trigger Reason', 'Assigned To', 'SLA Deadline', 'Priority', 'Status', 'Actions'].map(h => (
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
                            borderLeft: isOverdue(item) ? '4px solid hsl(0 72% 51%)' : '4px solid transparent',
                          }}
                          onClick={() => { setSelectedItem(item); setReviewRemarks(item.remarks || ''); }}
                        >
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{item.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {entityTypeBadge(item.entityType)}
                              <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.entityName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs max-w-[260px]" style={{ color: 'hsl(var(--text-2))' }}>
                            <span className="line-clamp-2">{item.triggerReason}</span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{item.assignedTo}</td>
                          <td className="px-4 py-3">{slaDisplay(item)}</td>
                          <td className="px-4 py-3">{priorityBadge(item.priority)}</td>
                          <td className="px-4 py-3">{hitlStatusBadge(item.status)}</td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => { setSelectedItem(item); setReviewRemarks(item.remarks || ''); }}>
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
      <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <SheetContent style={{ borderRadius: 0, width: 640, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              Review {selectedItem?.id}
            </SheetTitle>
          </SheetHeader>
          {selectedItem && (
            <div className="mt-4 space-y-5 overflow-y-auto h-[calc(100vh-120px)]">
              {/* Entity Context */}
              <div className="p-4 space-y-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                <div className="flex items-center gap-2">
                  {entityTypeBadge(selectedItem.entityType)}
                  {priorityBadge(selectedItem.priority)}
                  {hitlStatusBadge(selectedItem.status)}
                  {isOverdue(selectedItem) && (
                    <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                      OVERDUE
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Entity</p>
                    <p className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.entityName}</p>
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Entity ID</p>
                    <p className="font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.entityId}</p>
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Assigned To</p>
                    <p className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.assignedTo}</p>
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>SLA Deadline</p>
                    {slaDisplay(selectedItem)}
                  </div>
                  <div>
                    <p style={{ color: 'hsl(var(--text-4))' }}>Created</p>
                    <p style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedItem.createdDate.split('T')[0])}</p>
                  </div>
                </div>
              </div>

              {/* Trigger Alert */}
              <div className="p-3 flex gap-3" style={{ background: 'hsl(45 93% 47% / 0.08)', border: '1px solid hsl(45 93% 47% / 0.3)' }}>
                <Warning size={18} style={{ color: 'hsl(var(--s-wn-tx))', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-wn-tx))' }}>Trigger Reason</p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.triggerReason}</p>
                </div>
              </div>

              {/* Decision Section */}
              {(selectedItem.status === 'pending' || selectedItem.status === 'escalated' || selectedItem.status === 'info_requested') && (
                <div className="p-4 space-y-3" style={{ border: '1px solid hsl(var(--border))' }}>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Review Decision</p>
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
                      disabled={reviewRemarks.length < 10}
                      onClick={() => handleApprove(selectedItem)}
                      style={{ borderRadius: 0, background: reviewRemarks.length >= 10 ? 'hsl(var(--s-ok-tx))' : undefined, color: reviewRemarks.length >= 10 ? '#fff' : undefined }}
                    >
                      <CheckCircle size={14} className="mr-1" />Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewRemarks.length < 10}
                      onClick={() => handleRequestInfo(selectedItem)}
                      style={{ borderRadius: 0 }}
                    >
                      <Info size={14} className="mr-1" />Request Info
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewRemarks.length < 10}
                      onClick={() => { setRejectDialogOpen(true); setRejectReason(''); }}
                      style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}
                    >
                      <XCircle size={14} className="mr-1" />Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing remarks if approved/rejected */}
              {(selectedItem.status === 'approved' || selectedItem.status === 'rejected') && selectedItem.remarks && (
                <div className="p-3" style={{
                  border: `1px solid ${selectedItem.status === 'approved' ? 'hsl(142 71% 45% / 0.3)' : 'hsl(0 72% 51% / 0.3)'}`,
                  background: selectedItem.status === 'approved' ? 'hsl(142 71% 45% / 0.05)' : 'hsl(0 72% 51% / 0.05)',
                }}>
                  <p className="text-xs font-semibold" style={{
                    color: selectedItem.status === 'approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
                  }}>
                    Decision: {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedItem.remarks}</p>
                </div>
              )}

              {/* History Timeline */}
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Review History</p>
                <div className="space-y-0">
                  {selectedItem.history.map((h, idx) => (
                    <div key={idx} className="flex gap-3 py-2" style={{ borderBottom: idx < selectedItem.history.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full mt-1" style={{ background: 'hsl(var(--brand))' }} />
                        {idx < selectedItem.history.length - 1 && (
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

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Provide a detailed reason for rejecting <strong style={{ color: 'hsl(var(--text-1))' }}>{selectedItem?.entityName}</strong> (min 20 characters).
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
              disabled={rejectReason.length < 20}
              onClick={handleReject}
              style={{ borderRadius: 0, background: rejectReason.length >= 20 ? 'hsl(var(--destructive))' : undefined, color: rejectReason.length >= 20 ? '#fff' : undefined }}
            >
              <XCircle size={14} className="mr-1" />Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Queue Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Queue New Review</DialogTitle>
          </DialogHeader>
          <AddReviewForm
            onSubmit={(newItem) => {
              setItems(prev => [newItem, ...prev]);
              toast(`${newItem.id} added to review queue`);
              setAddDialogOpen(false);
            }}
            nextId={`HT-${String(items.length + 1).padStart(3, '0')}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Add Review Form ───────────────────────────────────────────────────────────

function AddReviewForm({ onSubmit, nextId }: { onSubmit: (item: HITLItem) => void; nextId: string }) {
  const [entityType, setEntityType] = useState<HITLItem['entityType']>('model');
  const [entityName, setEntityName] = useState('');
  const [entityId, setEntityId] = useState('');
  const [triggerReason, setTriggerReason] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<Severity>('medium');

  const canSubmit = entityName && entityId && triggerReason.length >= 10 && assignedTo;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const now = new Date().toISOString();
    const sla = new Date(Date.now() + 24 * 3600000).toISOString();
    onSubmit({
      id: nextId,
      entityType,
      entityId,
      entityName,
      triggerReason,
      assignedTo,
      slaDeadline: sla,
      priority,
      status: 'pending',
      remarks: '',
      overdue: false,
      createdDate: now,
      history: [{ date: now, action: `Manual review queued — ${triggerReason}`, by: 'Current User' }],
    });
  };

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Entity Type *</label>
          <Select value={entityType} onValueChange={v => setEntityType(v as HITLItem['entityType'])}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['model', 'agent', 'dataset', 'vendor', 'incident'].map(t =>
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Priority *</label>
          <Select value={priority} onValueChange={v => setPriority(v as Severity)}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['critical', 'high', 'medium', 'low'].map(p =>
                <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Entity ID *</label>
        <Input value={entityId} onChange={e => setEntityId(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. MDL-004" />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Entity Name *</label>
        <Input value={entityName} onChange={e => setEntityName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Loan Approval Assistant" />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Trigger Reason * (min 10 chars)</label>
        <textarea value={triggerReason} onChange={e => setTriggerReason(e.target.value)}
          className="mt-1 w-full h-16 text-xs p-2 resize-none"
          style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
          placeholder="Describe the reason for queuing this review..."
        />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Assignee *</label>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue placeholder="Select assignee" /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {USERS.map(u => <SelectItem key={u.id} value={u.name}>{u.name} — {u.role}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit} style={{ borderRadius: 0, background: canSubmit ? 'hsl(var(--brand))' : undefined, color: canSubmit ? '#fff' : undefined }}>
          <Plus size={14} className="mr-1" />Queue Review
        </Button>
      </div>
    </div>
  );
}
