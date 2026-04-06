import { useState, useMemo } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, Warning, Siren,
  ArrowUp, Clock, User, CaretRight, MagnifyingGlass,
  Timer, Bell, Megaphone, Check, Info,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  INCIDENTS, Incident, severityColor, statusColor, formatDate, USERS,
} from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';

// ── SLA deadlines ─────────────────────────────────────────────────────────────
const SLA_DEADLINES: Record<string, string> = {
  'INC-001': '2026-01-12T00:00:00Z',
  'INC-002': '2026-01-14T00:00:00Z',
  'INC-003': '2026-01-22T00:00:00Z',
  'INC-004': '2026-02-10T00:00:00Z',
  'INC-005': '2026-03-08T00:00:00Z',
};

// ── Timeline stages ───────────────────────────────────────────────────────────
const TIMELINE_STAGES = ['Reported', 'Triaged', 'Investigating', 'Contained', 'Resolved'];

function getStageIndex(status: string): number {
  switch (status) {
    case 'open': return 0;
    case 'investigating': return 2;
    case 'mitigating': return 3;
    case 'resolved': return 4;
    default: return 0;
  }
}

// ── MetricTile ────────────────────────────────────────────────────────────────
function MetricTile({ label, value, variant }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok';
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Horizontal Timeline Gantt ─────────────────────────────────────────────────
function IncidentTimeline({ status }: { status: string }) {
  const current = getStageIndex(status);
  return (
    <div className="flex items-center gap-0 w-full py-4">
      {TIMELINE_STAGES.map((stage, i) => {
        const isPast = i < current;
        const isCurrent = i === current;
        const isFuture = i > current;
        return (
          <div key={stage} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex items-center justify-center w-8 h-8 relative"
                style={{
                  background: isPast ? 'hsl(var(--s-ok-tx))' : isCurrent ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                  border: `2px solid ${isPast ? 'hsl(var(--s-ok-tx))' : isCurrent ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                  borderRadius: '50%',
                }}
              >
                {isPast && <Check size={14} weight="bold" style={{ color: '#fff' }} />}
                {isCurrent && (
                  <>
                    <div className="w-2.5 h-2.5 bg-white" style={{ borderRadius: '50%' }} />
                    <div className="absolute inset-0 animate-ping opacity-30" style={{ background: 'hsl(var(--brand))', borderRadius: '50%' }} />
                  </>
                )}
              </div>
              <span className="text-[10px] font-medium" style={{ color: isFuture ? 'hsl(var(--text-4))' : 'hsl(var(--text-1))' }}>
                {stage}
              </span>
            </div>
            {i < TIMELINE_STAGES.length - 1 && (
              <div className="flex-1 h-0.5 mx-1" style={{ background: isPast ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--border))' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function IncidentLog() {
  const { orgName } = useSettingsStore();
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Detail sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);

  // Resolve modal
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveId, setResolveId] = useState<string>('');
  const [rootCauseInput, setRootCauseInput] = useState('');

  // Regulatory notification
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyRegulation, setNotifyRegulation] = useState('gdpr-33');

  // New incident form
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<string>('medium');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newAffectedSystem, setNewAffectedSystem] = useState('');
  const [newActions, setNewActions] = useState('');

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return incidents.filter(inc => {
      if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) && !inc.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
      return true;
    });
  }, [incidents, search, filterStatus]);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => i.severity === 'critical').length;
  const openInvestigating = incidents.filter(i => i.status === 'open' || i.status === 'investigating' || i.status === 'mitigating').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  // ── Open detail ───────────────────────────────────────────────────────────
  const openDetail = (inc: Incident) => {
    setSelectedIncident(inc);
    setSheetOpen(true);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteIncident = (id: string) => {
    setIncidents(prev => prev.filter(i => i.id !== id));
  };

  // ── Escalate ──────────────────────────────────────────────────────────────
  const escalateIncident = (inc: Incident) => {
    const severityMap: Record<string, string> = { low: 'medium', medium: 'high', high: 'critical', critical: 'critical' };
    const newSev = severityMap[inc.severity] || 'critical';
    setIncidents(prev => prev.map(i => i.id === inc.id ? {
      ...i,
      severity: newSev as Incident['severity'],
      timeline: [...i.timeline, { date: new Date().toISOString().split('T')[0], action: `Escalated to ${newSev}`, actor: 'System' }],
    } : i));
  };

  // ── Resolve ───────────────────────────────────────────────────────────────
  const handleResolve = () => {
    if (rootCauseInput.length < 100) return;
    setIncidents(prev => prev.map(i => i.id === resolveId ? {
      ...i,
      status: 'resolved' as Incident['status'],
      rootCause: rootCauseInput,
      timeline: [...i.timeline, { date: new Date().toISOString().split('T')[0], action: 'Incident resolved', actor: 'Current User' }],
    } : i));
    setResolveOpen(false);
    setResolveId('');
    setRootCauseInput('');
  };

  // ── Add incident ──────────────────────────────────────────────────────────
  const handleAdd = () => {
    const inc: Incident = {
      id: `INC-${String(incidents.length + 1).padStart(3, '0')}`,
      title: newTitle,
      severity: newSeverity as Incident['severity'],
      status: 'open',
      category: newCategory,
      reportedDate: new Date().toISOString().split('T')[0],
      reporter: 'Current User',
      assignee: newAssignee,
      description: newDescription,
      linkedModel: newAffectedSystem,
      rootCause: '',
      correctiveActions: newActions ? [newActions] : [],
      timeline: [{ date: new Date().toISOString().split('T')[0], action: 'Incident reported', actor: 'Current User' }],
    };
    setIncidents(prev => [...prev, inc]);
    setAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewTitle(''); setNewSeverity('medium'); setNewCategory('');
    setNewDescription(''); setNewAssignee(''); setNewAffectedSystem(''); setNewActions('');
  };

  // ── GDPR timer calculation ────────────────────────────────────────────────
  const getGdprHoursRemaining = (reportedDate: string): number => {
    const reported = new Date(reportedDate).getTime();
    const deadline = reported + 72 * 60 * 60 * 1000;
    const now = Date.now();
    return Math.max(0, Math.round((deadline - now) / (60 * 60 * 1000)));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Incident Log</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · AI incident tracking & response management
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <Plus size={14} className="mr-1" />Report Incident
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricTile label="Total Incidents" value={totalIncidents} variant="default" />
          <MetricTile label="Critical" value={criticalCount} variant="error" />
          <MetricTile label="Open / Investigating" value={openInvestigating} variant="warn" />
          <MetricTile label="Resolved" value={resolvedCount} variant="ok" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
            <Input
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              style={{ borderRadius: 0 }}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44 h-8 text-xs" style={{ borderRadius: 0 }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="mitigating">Mitigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Incident Table */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['INC-ID', 'Title', 'Severity', 'Status', 'Category', 'Reported', 'Assigned To', 'SLA Deadline', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inc => {
                    const sevColor = severityColor(inc.severity);
                    const statColor = statusColor(inc.status);
                    const isCritical = inc.id === 'INC-001' || inc.id === 'INC-004';
                    const sla = SLA_DEADLINES[inc.id];
                    const slaOverdue = sla && new Date(sla).getTime() < Date.now() && inc.status !== 'resolved';
                    return (
                      <tr
                        key={inc.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        style={{
                          borderBottom: '1px solid hsl(var(--border))',
                          borderLeft: isCritical ? '4px solid hsl(var(--s-er-tx))' : 'none',
                        }}
                        onClick={() => openDetail(inc)}
                      >
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{inc.id}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{inc.title}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge style={{ background: sevColor.bg, color: sevColor.text, borderRadius: 0, fontSize: 11 }}>
                            {inc.severity}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge style={{ background: statColor.bg, color: statColor.text, borderRadius: 0, fontSize: 11 }}>
                            {inc.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{inc.category}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(inc.reportedDate)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{inc.assignee}</span>
                        </td>
                        <td className="px-3 py-2">
                          {sla ? (
                            <span className="text-xs font-mono" style={{ color: slaOverdue ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-1))' }}>
                              {slaOverdue ? 'OVERDUE' : formatDate(sla)}
                            </span>
                          ) : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                        </td>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(inc)}>
                              <Eye size={14} style={{ color: 'hsl(var(--text-4))' }} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditIncident(inc); setAddOpen(true); }}>
                              <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Trash size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent style={{ borderRadius: 0 }}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Incident</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete "{inc.id} — {inc.title}"? Incident records should be preserved for audit compliance.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteIncident(inc.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

        {/* ── Incident Detail Sheet ────────────────────────────────────────── */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
            {selectedIncident && (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedIncident.id}</span>
                    <Badge style={{ background: severityColor(selectedIncident.severity).bg, color: severityColor(selectedIncident.severity).text, borderRadius: 0, fontSize: 11 }}>
                      {selectedIncident.severity}
                    </Badge>
                    <Badge style={{ background: statusColor(selectedIncident.status).bg, color: statusColor(selectedIncident.status).text, borderRadius: 0, fontSize: 11 }}>
                      {selectedIncident.status}
                    </Badge>
                  </div>
                  <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedIncident.title}</SheetTitle>
                </SheetHeader>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3">
                  {selectedIncident.status !== 'resolved' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        style={{ borderRadius: 0 }}
                        onClick={() => escalateIncident(selectedIncident)}
                      >
                        <ArrowUp size={12} className="mr-1" />Escalate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        style={{ borderRadius: 0 }}
                        onClick={() => {
                          setResolveId(selectedIncident.id);
                          setRootCauseInput(selectedIncident.rootCause || '');
                          setResolveOpen(true);
                        }}
                      >
                        <Check size={12} className="mr-1" />Resolve
                      </Button>
                    </>
                  )}
                </div>

                <Tabs defaultValue="overview" className="mt-4">
                  <TabsList className="w-full" style={{ borderRadius: 0 }}>
                    <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                    <TabsTrigger value="timeline" style={{ borderRadius: 0 }}>Timeline</TabsTrigger>
                    <TabsTrigger value="rootcause" style={{ borderRadius: 0 }}>Root Cause</TabsTrigger>
                    <TabsTrigger value="corrective" style={{ borderRadius: 0 }}>Corrective</TabsTrigger>
                    <TabsTrigger value="regulatory" style={{ borderRadius: 0 }}>Regulatory</TabsTrigger>
                  </TabsList>

                  {/* Overview */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Reporter</p>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedIncident.reporter}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Assignee</p>
                        <div className="flex items-center gap-1">
                          <User size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedIncident.assignee}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Category</p>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedIncident.category}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Reported</p>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedIncident.reportedDate)}</span>
                      </div>
                    </div>
                    {selectedIncident.linkedModel && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Linked Model</p>
                        <Badge className="font-mono text-xs" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>
                          {selectedIncident.linkedModel}
                        </Badge>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                      <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedIncident.description}</p>
                    </div>
                  </TabsContent>

                  {/* Timeline */}
                  <TabsContent value="timeline" className="space-y-4 mt-4">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Incident Progress</p>
                    <IncidentTimeline status={selectedIncident.status} />
                    <div className="space-y-2 mt-4">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Activity Log</p>
                      {selectedIncident.timeline.map((entry, i) => (
                        <div key={i} className="flex gap-3 p-2" style={{ borderLeft: '2px solid hsl(var(--brand))', borderRadius: 0 }}>
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.action}</p>
                            <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(entry.date)} · {entry.actor}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Root Cause */}
                  <TabsContent value="rootcause" className="space-y-4 mt-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Root Cause Analysis</p>
                      {selectedIncident.rootCause ? (
                        <p className="text-sm p-3" style={{ color: 'hsl(var(--text-1))', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          {selectedIncident.rootCause}
                        </p>
                      ) : (
                        <div className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                          Root cause analysis pending. Required for incident resolution.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Corrective Actions */}
                  <TabsContent value="corrective" className="space-y-4 mt-4">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Corrective Actions</p>
                    {selectedIncident.correctiveActions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2 p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <CaretRight size={12} style={{ color: 'hsl(var(--brand))', marginTop: 2 }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{action}</span>
                      </div>
                    ))}
                  </TabsContent>

                  {/* Regulatory Notify */}
                  <TabsContent value="regulatory" className="space-y-4 mt-4">
                    {/* GDPR Timer */}
                    <div className="p-3 flex items-start gap-2" style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))', borderRadius: 0 }}>
                      <Timer size={16} weight="bold" style={{ color: 'hsl(var(--s-wn-tx))', marginTop: 1 }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                          72h GDPR breach window — {getGdprHoursRemaining(selectedIncident.reportedDate)} hours remaining
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                          GDPR Art. 33 requires notification to supervisory authority within 72 hours of becoming aware of a personal data breach.
                        </p>
                      </div>
                    </div>

                    {/* EU AI Act Art. 73 */}
                    <div className="p-3" style={{ background: 'hsl(var(--s-in-bg))', border: '1px solid hsl(var(--s-in-br))', borderRadius: 0 }}>
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-in-tx))' }}>
                        EU AI Act Art. 73 — Serious Incident Reporting
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                        Providers of high-risk AI systems shall report serious incidents to the market surveillance authority.
                      </p>
                    </div>

                    <Button onClick={() => setNotifyOpen(true)} style={{ borderRadius: 0, width: '100%' }} variant="outline">
                      <Megaphone size={14} className="mr-1.5" />Notify Regulator
                    </Button>

                    {/* Notification history */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Notification History</p>
                      <div className="text-xs py-3 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                        No regulatory notifications sent for this incident.
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ── Resolve Dialog ───────────────────────────────────────────────── */}
        <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
          <DialogContent style={{ borderRadius: 0 }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Resolve Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Root Cause (min 100 characters) *</Label>
                <Textarea
                  value={rootCauseInput}
                  onChange={(e) => setRootCauseInput(e.target.value)}
                  rows={4}
                  style={{ borderRadius: 0 }}
                  placeholder="Describe the root cause of this incident..."
                />
                <p className="text-[10px]" style={{ color: rootCauseInput.length >= 100 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                  {rootCauseInput.length}/100 characters minimum
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
              <Button
                onClick={handleResolve}
                disabled={rootCauseInput.length < 100}
                style={{ borderRadius: 0, background: 'hsl(var(--s-ok-tx))', color: '#fff' }}
              >
                <Check size={14} className="mr-1" />Resolve Incident
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Regulatory Notify Dialog ─────────────────────────────────────── */}
        <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
          <DialogContent style={{ borderRadius: 0 }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Notify Regulator</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Regulation</Label>
                <Select value={notifyRegulation} onValueChange={setNotifyRegulation}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value="gdpr-33">GDPR Art. 33 — Breach Notification</SelectItem>
                    <SelectItem value="gdpr-34">GDPR Art. 34 — Data Subject Notification</SelectItem>
                    <SelectItem value="eu-ai-73">EU AI Act Art. 73 — Serious Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>
                  {notifyRegulation === 'gdpr-33' && 'To: Data Protection Authority\nSubject: Personal Data Breach Notification (Art. 33 GDPR)\n\nWe are writing to inform you of a personal data breach that has occurred...'}
                  {notifyRegulation === 'gdpr-34' && 'To: Affected Data Subjects\nSubject: Notification of Personal Data Breach\n\nWe are writing to inform you that your personal data may have been affected...'}
                  {notifyRegulation === 'eu-ai-73' && 'To: Market Surveillance Authority\nSubject: Serious Incident Report (Art. 73 EU AI Act)\n\nWe are reporting a serious incident involving a high-risk AI system...'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotifyOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
              <Button onClick={() => setNotifyOpen(false)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                <Megaphone size={14} className="mr-1" />Send Notification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Report Incident Modal ────────────────────────────────────────── */}
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setEditIncident(null); resetForm(); } }}>
          <DialogContent className="sm:max-w-lg" style={{ borderRadius: 0 }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editIncident ? 'Edit Incident' : 'Report Incident'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input
                  value={editIncident ? editIncident.title : newTitle}
                  onChange={(e) => editIncident ? setEditIncident({ ...editIncident, title: e.target.value }) : setNewTitle(e.target.value)}
                  style={{ borderRadius: 0 }}
                  placeholder="Incident title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Severity *</Label>
                  <Select
                    value={editIncident ? editIncident.severity : newSeverity}
                    onValueChange={(v) => editIncident ? setEditIncident({ ...editIncident, severity: v as Incident['severity'] }) : setNewSeverity(v)}
                  >
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['critical', 'high', 'medium', 'low'].map(s => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category *</Label>
                  <Select
                    value={editIncident ? editIncident.category : newCategory}
                    onValueChange={(v) => editIncident ? setEditIncident({ ...editIncident, category: v }) : setNewCategory(v)}
                  >
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['Bias/Fairness', 'Performance', 'Security', 'AI Safety', 'Data Breach', 'Compliance'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description *</Label>
                <Textarea
                  value={editIncident ? editIncident.description : newDescription}
                  onChange={(e) => editIncident ? setEditIncident({ ...editIncident, description: e.target.value }) : setNewDescription(e.target.value)}
                  style={{ borderRadius: 0 }}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Affected System</Label>
                  <Input
                    value={newAffectedSystem}
                    onChange={(e) => setNewAffectedSystem(e.target.value)}
                    style={{ borderRadius: 0 }}
                    placeholder="e.g., MDL-001"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assigned To *</Label>
                  <Select
                    value={editIncident ? editIncident.assignee : newAssignee}
                    onValueChange={(v) => editIncident ? setEditIncident({ ...editIncident, assignee: v }) : setNewAssignee(v)}
                  >
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {USERS.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Initial Actions</Label>
                <Input
                  value={newActions}
                  onChange={(e) => setNewActions(e.target.value)}
                  style={{ borderRadius: 0 }}
                  placeholder="Initial response actions taken..."
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setAddOpen(false); setEditIncident(null); resetForm(); }} style={{ borderRadius: 0 }}>
                Cancel
              </Button>
              <Button
                onClick={editIncident ? () => {
                  setIncidents(prev => prev.map(i => i.id === editIncident.id ? editIncident : i));
                  setAddOpen(false);
                  setEditIncident(null);
                } : handleAdd}
                disabled={editIncident ? !editIncident.title : (!newTitle || !newCategory || !newAssignee || !newDescription)}
                style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
              >
                {editIncident ? 'Save Changes' : 'Report Incident'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
