// SPDX-License-Identifier: Apache-2.0
// Remediation Timeline Tracker — real org-scoped backend (remediation_plans
// via useRemediations). The gantt window is computed from the actual plan
// dates — no hardcoded timeline.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  List, ChartBar, FunnelSimple, CalendarBlank, CheckCircle, Clock, Warning, User,
  Plus, PencilSimple, Trash, X,
} from '@phosphor-icons/react';
import { severityColor, statusColor, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useRemediations, useIncidents } from '../hooks/useRiskIncidents';
import type { RemediationRecord } from '../services/incidentResponseService';
import { useModelsData } from '@/hooks/useModelsData';
import { useRisksData } from '@/hooks/useRisksData';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import PageSkeleton from '../components/ui/PageSkeleton';

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'];

function statusBarColor(item: RemediationRecord): string {
  if (item.status === 'completed') return 'hsl(var(--s-ok-tx))';
  if (item.status === 'blocked') return 'hsl(var(--s-er-tx))';
  if (item.dueDate && new Date(item.dueDate).getTime() < Date.now()) return 'hsl(var(--s-er-tx))';
  return 'hsl(var(--r-hi-tx))';
}

function itemStart(r: RemediationRecord): string | null {
  return r.startDate ?? r.createdAt?.split('T')[0] ?? null;
}

interface RemForm {
  id?: string;
  planRef: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  owner: string;
  assignee: string;
  startDate: string;
  dueDate: string;
  progressPct: number;
  incidentId: string;
  riskId: string;
  sourceType: string | null;
  sourceId: string | null;
  linkedModelIds: string[];
  milestones: { name: string; done: boolean }[];
}

const EMPTY_FORM: RemForm = {
  planRef: '', title: '', description: '', status: 'planned', priority: 'medium',
  owner: '', assignee: '', startDate: '', dueDate: '', progressPct: 0,
  incidentId: '', riskId: '', sourceType: null, sourceId: null,
  linkedModelIds: [], milestones: [],
};

function recordToForm(r: RemediationRecord): RemForm {
  return {
    id: r.id,
    planRef: r.planRef ?? '',
    title: r.title,
    description: r.description ?? '',
    status: r.status,
    priority: r.priority ?? 'medium',
    owner: r.owner ?? '',
    assignee: r.assignee ?? '',
    startDate: r.startDate ?? '',
    dueDate: r.dueDate ?? '',
    progressPct: r.progressPct,
    incidentId: r.incidentId ?? '',
    riskId: r.riskId ?? '',
    sourceType: r.sourceType ?? null,
    sourceId: r.sourceId ?? null,
    linkedModelIds: r.linkedModelIds ?? [],
    milestones: r.milestones,
  };
}

export default function RemediationTracker() {
  const { orgName } = useSettingsStore();
  const { items, isLoading, error, save, remove, isSaving } = useRemediations();
  const { items: incidents } = useIncidents();
  const { models } = useModelsData();
  const { risks } = useRisksData();
  const [searchParams, setSearchParams] = useSearchParams();
  const openParam = searchParams.get('open');

  const [view, setView] = useState<'gantt' | 'list'>('gantt');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RemForm>(EMPTY_FORM);
  const [milestoneInput, setMilestoneInput] = useState('');
  const [detail, setDetail] = useState<RemediationRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RemediationRecord | null>(null);

  // Deep link: ?open=<id> opens that plan once data is loaded.
  useEffect(() => {
    if (!openParam || isLoading) return;
    const match = items.find(r => r.id === openParam);
    if (match) setDetail(match);
  }, [openParam, items, isLoading]);

  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';
  const riskLabel = (id: string) => risks.find(r => r.id === id)?.title ?? 'Risk';
  const incidentLabel = (id: string) => {
    const inc = incidents.find(i => i.id === id);
    return inc ? (inc.incidentId ? `${inc.incidentId} — ${inc.title}` : inc.title) : 'Unavailable';
  };

  const filtered = items.filter(item => {
    const matchAssignee = filterAssignee === 'all' || (item.assignee ?? item.owner ?? 'Unassigned') === filterAssignee;
    const matchPriority = filterPriority === 'all' || (item.priority ?? 'medium') === filterPriority;
    return matchAssignee && matchPriority;
  });

  const ASSIGNEES = Array.from(new Set(items.map(i => i.assignee ?? i.owner ?? 'Unassigned')));

  // Timeline window computed from the real data: min start → max due, padded a
  // month each side. Guarded when no plan carries a date.
  const timeline = useMemo(() => {
    const starts = filtered.map(itemStart).filter(Boolean).map(d => new Date(d as string).getTime());
    const ends = filtered.map(i => i.dueDate ?? itemStart(i)).filter(Boolean).map(d => new Date(d as string).getTime());
    const all = [...starts, ...ends].filter(t => !Number.isNaN(t));
    if (!all.length) return null;
    const min = new Date(Math.min(...all));
    const max = new Date(Math.max(...all));
    const start = new Date(min.getFullYear(), min.getMonth() - 1, 1);
    const end = new Date(max.getFullYear(), max.getMonth() + 2, 1);
    const months: Date[] = [];
    const d = new Date(start);
    while (d < end) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
    return { start, end, months };
  }, [filtered]);

  const dateToPercent = (dateStr?: string | null): number => {
    if (!dateStr || !timeline) return 0;
    const t = new Date(dateStr).getTime();
    if (Number.isNaN(t)) return 0;
    const pct = ((t - timeline.start.getTime()) / (timeline.end.getTime() - timeline.start.getTime())) * 100;
    return Math.max(0, Math.min(100, pct));
  };
  const barWidth = (start?: string | null, end?: string | null): number =>
    Math.max(1, dateToPercent(end) - dateToPercent(start));
  const todayPercent = timeline ? dateToPercent(new Date().toISOString().split('T')[0]) : 0;

  const openCreate = () => { setForm(EMPTY_FORM); setMilestoneInput(''); setDialogOpen(true); };
  const openEdit = (r: RemediationRecord) => { setForm(recordToForm(r)); setMilestoneInput(''); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const record: RemediationRecord = {
      id: form.id,
      planRef: form.planRef.trim() || undefined,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      owner: form.owner.trim() || null,
      assignee: form.assignee.trim() || null,
      incidentId: form.incidentId || null,
      riskId: form.riskId || null,
      sourceType: form.sourceType,
      sourceId: form.sourceId,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      progressPct: form.progressPct,
      linkedModelIds: form.linkedModelIds,
      milestones: form.milestones,
    };
    try {
      await save(record); // hook toasts success; throws on failure
      setDialogOpen(false);
      if (detail?.id && detail.id === form.id) setDetail({ ...detail, ...record });
    } catch { /* hook surfaces the error toast */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await remove(deleteTarget.id);
      if (detail?.id === deleteTarget.id) closeDetail();
      setDeleteTarget(null);
    } catch { /* hook surfaces the error toast */ }
  };

  const closeDetail = () => {
    setDetail(null);
    if (openParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
    }
  };

  if (isLoading) return <PageSkeleton title="Remediation Timeline Tracker" showStats rows={5} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Remediation Timeline Tracker"
        subtitle={`${orgName} · Gantt-style timeline for remediation plans`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 mr-4">
              {[
                { color: 'hsl(var(--s-ok-tx))', label: 'Completed' },
                { color: 'hsl(var(--r-hi-tx))', label: 'In Progress' },
                { color: 'hsl(var(--s-er-tx))', label: 'Blocked / Overdue' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, background: l.color }} />
                  <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{l.label}</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant={view === 'gantt' ? 'default' : 'outline'} onClick={() => setView('gantt')}>
              <ChartBar size={14} /> Gantt
            </Button>
            <Button size="sm" variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}>
              <List size={14} /> List
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} /> New Plan
            </Button>
          </div>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load remediation plans</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <FunnelSimple size={14} style={{ color: 'hsl(var(--text-3))' }} />
        <div className="flex items-center gap-2">
          <User size={14} style={{ color: 'hsl(var(--text-3))' }} />
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Assignees</SelectItem>
              {ASSIGNEES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} plans</span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="py-12 text-center">
            <CalendarBlank size={28} className="mx-auto" style={{ color: 'hsl(var(--text-4))' }} />
            <p className="text-sm font-medium mt-2" style={{ color: 'hsl(var(--text-2))' }}>
              {items.length === 0 ? 'No remediation plans yet' : 'No plans match the current filters'}
            </p>
            {items.length === 0 && (
              <Button size="sm" className="mt-3" onClick={openCreate}><Plus size={14} /> Create the first plan</Button>
            )}
          </CardContent>
        </Card>
      )}

      {filtered.length > 0 && view === 'gantt' && timeline && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            {/* Timeline header */}
            <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
              <div style={{ width: 300, minWidth: 300, padding: '10px 12px', borderRight: '1px solid hsl(var(--border))' }}>
                <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Plan</span>
              </div>
              <div style={{ flex: 1, position: 'relative', padding: '10px 0' }}>
                {timeline.months.map(m => (
                  <span
                    key={m.toISOString()}
                    className="text-xs font-semibold absolute"
                    style={{ left: `${dateToPercent(m.toISOString())}%`, color: 'hsl(var(--text-2))', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
                  >
                    {m.toLocaleDateString('en-US', { month: 'short', year: m.getMonth() === 0 ? '2-digit' : undefined })}
                  </span>
                ))}
              </div>
            </div>

            {/* Rows */}
            {filtered.map(item => {
              const pc = severityColor(item.priority ?? 'medium');
              const barColor = statusBarColor(item);
              const start = itemStart(item);
              const end = item.dueDate ?? start;
              const left = dateToPercent(start);
              const width = barWidth(start, end);
              return (
                <div
                  key={item.id}
                  style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', minHeight: 52, cursor: 'pointer' }}
                  onClick={() => setDetail(item)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 300, minWidth: 300, padding: '8px 12px', borderRight: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{item.planRef ?? '—'}</span>
                      <Badge style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, borderRadius: 0, fontSize: 9, padding: '0 4px' }}>
                        {item.priority ?? 'medium'}
                      </Badge>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))', lineHeight: 1.3 }}>{item.title}</span>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.assignee ?? item.owner ?? 'Unassigned'}</span>
                  </div>

                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                    {timeline.months.map(m => (
                      <div key={m.toISOString()} style={{ position: 'absolute', left: `${dateToPercent(m.toISOString())}%`, top: 0, bottom: 0, width: 1, background: 'hsl(var(--border))', opacity: 0.5 }} />
                    ))}
                    <div style={{ position: 'absolute', left: `${todayPercent}%`, top: 0, bottom: 0, width: 2, background: 'hsl(var(--brand))', opacity: 0.7 }} />
                    {start ? (
                      <div
                        title={`${start} → ${item.dueDate ?? '—'} (${item.progressPct}%)`}
                        style={{
                          position: 'absolute', left: `${left}%`, width: `${width}%`, height: 28,
                          background: `${barColor}25`, border: `1px solid ${barColor}`,
                          display: 'flex', alignItems: 'center', overflow: 'hidden',
                        }}
                      >
                        <div style={{ width: `${item.progressPct}%`, height: '100%', background: `${barColor}60`, position: 'absolute', left: 0, top: 0 }} />
                        <span className="text-xs font-semibold relative px-1.5" style={{ color: barColor, whiteSpace: 'nowrap' }}>
                          {item.progressPct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No dates set</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Today label */}
            <div style={{ display: 'flex', padding: '6px 0', background: 'hsl(var(--bg-muted))' }}>
              <div style={{ width: 300, minWidth: 300, borderRight: '1px solid hsl(var(--border))' }} />
              <div style={{ flex: 1, position: 'relative', paddingLeft: 8 }}>
                <span className="text-xs font-semibold absolute"
                  style={{ left: `${todayPercent}%`, color: 'hsl(var(--brand))', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                  ▲ Today
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length > 0 && (view === 'list' || !timeline) && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                  <tr>
                    {['Ref', 'Title', 'Assignee', 'Priority', 'Progress', 'Start', 'Due', 'Status', 'Links', 'Actions'].map(h => (
                      <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const pc = severityColor(item.priority ?? 'medium');
                    const sc = statusColor(item.status);
                    const barColor = statusBarColor(item);
                    return (
                      <tr key={item.id} style={{ borderTop: '1px solid hsl(var(--border))', cursor: 'pointer' }}
                        onClick={() => setDetail(item)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{item.planRef ?? '—'}</td>
                        <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 240 }}>
                          <span className="block truncate">{item.title}</span>
                        </td>
                        <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{item.assignee ?? item.owner ?? 'Unassigned'}</td>
                        <td className="p-3">
                          <Badge style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, borderRadius: 0, fontSize: 11 }}>{item.priority ?? 'medium'}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div style={{ width: 60, height: 6, background: 'hsl(var(--bg-muted))' }}>
                              <div style={{ width: `${item.progressPct}%`, height: '100%', background: barColor }} />
                            </div>
                            <span className="text-xs" style={{ color: barColor }}>{item.progressPct}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.startDate ?? '—'}</td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.dueDate ?? '—'}</td>
                        <td className="p-3">
                          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1">
                            {item.incidentId && <InterlinkChip label={incidentLabel(item.incidentId)} to={`/risk/incidents?open=${item.incidentId}`} />}
                            {item.riskId && <InterlinkChip label={riskLabel(item.riskId)} to={`/risks?open=${item.riskId}`} />}
                            {(item.linkedModelIds ?? []).map(id => (
                              <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                            ))}
                          </div>
                        </td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                              <PencilSimple size={14} style={{ color: 'hsl(var(--brand))' }} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(item)}>
                              <Trash size={14} className="text-destructive" />
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
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Plans', value: items.length, icon: CalendarBlank, color: 'hsl(var(--brand))' },
          { label: 'In Progress', value: items.filter(i => i.status === 'in_progress').length, icon: Clock, color: 'hsl(var(--r-hi-tx))' },
          { label: 'Blocked', value: items.filter(i => i.status === 'blocked').length, icon: Warning, color: 'hsl(var(--s-er-tx))' },
          { label: 'Completed', value: items.filter(i => i.status === 'completed').length, icon: CheckCircle, color: 'hsl(var(--s-ok-tx))' },
        ].map(s => (
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

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={v => !v && closeDetail()}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base" style={{ color: 'hsl(var(--text-1))' }}>
                  {detail.planRef ? `${detail.planRef} — ` : ''}{detail.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge style={{ background: statusColor(detail.status).bg, color: statusColor(detail.status).text, borderRadius: 0, fontSize: 11 }}>
                    {detail.status.replace('_', ' ')}
                  </Badge>
                  <Badge style={{ background: severityColor(detail.priority ?? 'medium').bg, color: severityColor(detail.priority ?? 'medium').text, borderRadius: 0, fontSize: 11 }}>
                    {detail.priority ?? 'medium'}
                  </Badge>
                </div>
                {detail.description && (
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{detail.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Owner', value: detail.owner ?? '—' },
                    { label: 'Assignee', value: detail.assignee ?? '—' },
                    { label: 'Start', value: detail.startDate ? formatDate(detail.startDate) : '—' },
                    { label: 'Due', value: detail.dueDate ? formatDate(detail.dueDate) : '—' },
                  ].map(f => (
                    <div key={f.label} className="p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{f.label}</p>
                      <p className="text-xs font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{f.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--text-4))' }}>Progress</p>
                  <div className="flex items-center gap-2">
                    <div style={{ flex: 1, height: 8, background: 'hsl(var(--bg-muted))' }}>
                      <div style={{ width: `${detail.progressPct}%`, height: '100%', background: statusBarColor(detail) }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: statusBarColor(detail) }}>{detail.progressPct}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Linked Records</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.incidentId && <InterlinkChip label={incidentLabel(detail.incidentId)} to={`/risk/incidents?open=${detail.incidentId}`} />}
                    {detail.riskId && <InterlinkChip label={riskLabel(detail.riskId)} to={`/risks?open=${detail.riskId}`} />}
                    {(detail.linkedModelIds ?? []).map(id => (
                      <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                    ))}
                    {!detail.incidentId && !detail.riskId && !(detail.linkedModelIds ?? []).length && (
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No linked records.</span>
                    )}
                  </div>
                </div>
                {(detail.sourceType || detail.sourceId) && (
                  <div className="p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Source</p>
                    <p className="text-xs font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {detail.sourceType ?? '—'}{detail.sourceId ? ` · ${detail.sourceId}` : ''}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Milestones</p>
                  {detail.milestones.length === 0 ? (
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No milestones recorded.</p>
                  ) : (
                    <div className="space-y-1">
                      {detail.milestones.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                          <CheckCircle size={13} weight={m.done ? 'fill' : 'regular'}
                            style={{ color: m.done ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }} />
                          <span className={m.done ? 'line-through' : ''}>{m.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => openEdit(detail)}>
                    <PencilSimple size={13} /> Edit
                  </Button>
                  <Button variant="outline" size="sm" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteTarget(detail)}>
                    <Trash size={13} /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Remediation Plan' : 'New Remediation Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Plan title" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Plan Ref</Label>
                <Input value={form.planRef} onChange={e => setForm(f => ({ ...f, planRef: e.target.value }))} placeholder="e.g. REM-2026-01" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Owner</Label>
                <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assignee</Label>
                <Input value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Progress — {form.progressPct}%</Label>
              <input
                type="range" min={0} max={100} step={5}
                value={form.progressPct}
                onChange={e => setForm(f => ({ ...f, progressPct: Number(e.target.value) }))}
                className="w-full"
                aria-label="Progress percentage"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Linked Incident</Label>
              <Select value={form.incidentId || 'none'} onValueChange={v => setForm(f => ({ ...f, incidentId: v === 'none' ? '' : v }))}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="No incident linked" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="none">No incident linked</SelectItem>
                  {incidents.filter(i => i.id).map(i => (
                    <SelectItem key={i.id} value={i.id!}>{i.incidentId ? `${i.incidentId} — ` : ''}{i.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Milestones</Label>
              <div className="flex gap-2">
                <Input value={milestoneInput} onChange={e => setMilestoneInput(e.target.value)} placeholder="Milestone name"
                  onKeyDown={e => { if (e.key === 'Enter' && milestoneInput.trim()) { e.preventDefault(); setForm(f => ({ ...f, milestones: [...f.milestones, { name: milestoneInput.trim(), done: false }] })); setMilestoneInput(''); } }}
                  style={{ borderRadius: 0 }} />
                <Button type="button" variant="outline" size="sm" style={{ borderRadius: 0 }}
                  onClick={() => { if (milestoneInput.trim()) { setForm(f => ({ ...f, milestones: [...f.milestones, { name: milestoneInput.trim(), done: false }] })); setMilestoneInput(''); } }}>
                  <Plus size={13} />
                </Button>
              </div>
              {form.milestones.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs px-2 py-1" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'hsl(var(--text-2))' }}>
                    <input type="checkbox" checked={m.done}
                      onChange={() => setForm(f => ({ ...f, milestones: f.milestones.map((x, i) => i === idx ? { ...x, done: !x.done } : x) }))} />
                    <span className={m.done ? 'line-through' : ''}>{m.name}</span>
                  </label>
                  <button type="button" onClick={() => setForm(f => ({ ...f, milestones: f.milestones.filter((_, i) => i !== idx) }))}>
                    <X size={11} style={{ color: 'hsl(var(--text-4))' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} disabled={isSaving || !form.title.trim()} onClick={handleSave}>
              {isSaving ? 'Saving…' : 'Save Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Remediation Plan"
        message={<p>Delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.</p>}
        confirmLabel="Delete"
      />
    </div>
  );
}
