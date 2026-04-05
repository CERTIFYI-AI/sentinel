import { useState } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, Warning, XCircle, CheckCircle, ArrowUp, Lock
} from '@phosphor-icons/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { INCIDENTS, severityColor, statusColor, formatDate, MODELS } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="mt-0.5 text-[hsl(var(--brand))]">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{value}</div>
        <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

export default function IncidentLog() {
  const orgName = useSettingsStore(s => s.orgName);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selected, setSelected] = useState<typeof INCIDENTS[0] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof INCIDENTS[0] | null>(null);
  const [incidents, setIncidents] = useState(INCIDENTS);
  const [editForm, setEditForm] = useState({ title: '', assignee: '', description: '' });

  const stats = {
    total: incidents.length,
    active: incidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
  };

  const filtered = incidents.filter(inc => {
    const q = search.toLowerCase();
    const matchSearch = !q || inc.title.toLowerCase().includes(q) || inc.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || inc.status === statusFilter;
    const matchSev = severityFilter === 'all' || inc.severity === severityFilter;
    return matchSearch && matchStatus && matchSev;
  });

  const handleEdit = (inc: typeof INCIDENTS[0]) => {
    setEditForm({ title: inc.title, assignee: inc.assignee, description: inc.description });
    setSelected(inc);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    setIncidents(prev => prev.map(i => i.id === selected?.id ? { ...i, ...editForm } : i));
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setIncidents(prev => prev.filter(i => i.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
    }
  };

  const handleEscalate = (id: string) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'investigating' as const } : i));
  };

  const handleClose = (id: string) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved' as const } : i));
    if (selected?.id === id) setSelected(null);
  };

  const timelineTypeColor: Record<string, string> = {
    info: 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))/20]',
    warning: 'border-yellow-500 bg-yellow-900/30',
    error: 'border-red-500 bg-red-900/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Incident Log</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — AI incident tracking and response management</p>
        </div>
        <Button className="gap-2"><Plus size={16} /> Report Incident</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Warning size={20} />} value={stats.total} label="Total Incidents" />
        <StatCard icon={<XCircle size={20} />} value={stats.active} label="Open / Investigating" />
        <StatCard icon={<Warning size={20} />} value={stats.critical} label="Critical" />
        <StatCard icon={<CheckCircle size={20} />} value={stats.resolved} label="Resolved" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="mitigating">Mitigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incident Cards */}
      <div className="space-y-3">
        {filtered.map(inc => {
          const rc = severityColor(inc.severity);
          const sc = statusColor(inc.status);
          const model = MODELS.find(m => m.id === inc.linkedModel);
          return (
            <Card key={inc.id} className={inc.severity === 'critical' ? 'border-red-800' : ''}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-[hsl(var(--text-4))]">{inc.id}</span>
                      <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{inc.severity}</span>
                      <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{inc.status}</span>
                      <span className="text-xs text-[hsl(var(--text-4))]">{inc.category}</span>
                    </div>
                    <div className="font-semibold text-[hsl(var(--text-1))] text-sm mb-1">{inc.title}</div>
                    <div className="text-xs text-[hsl(var(--text-3))] mb-2">{inc.description}</div>
                    <div className="flex gap-4 text-xs text-[hsl(var(--text-4))]">
                      <span>Reporter: <span className="text-[hsl(var(--text-3))]">{inc.reporter}</span></span>
                      <span>Assignee: <span className="text-[hsl(var(--text-3))]">{inc.assignee}</span></span>
                      {model && <span>Model: <span className="text-[hsl(var(--text-3))]">{model.name}</span></span>}
                      <span>Reported: <span className="text-[hsl(var(--text-3))]">{formatDate(inc.reportedDate)}</span></span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(inc)}>
                      <Eye size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(inc)}>
                      <PencilSimple size={14} />
                    </Button>
                    {inc.status !== 'resolved' && (
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs border-orange-700 text-orange-400 hover:bg-orange-950/20" onClick={() => handleEscalate(inc.id)}>
                        <ArrowUp size={12} /> Escalate
                      </Button>
                    )}
                    {inc.status !== 'resolved' && (
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs border-green-700 text-green-400 hover:bg-green-950/20" onClick={() => handleClose(inc.id)}>
                        <Lock size={12} /> Close
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(inc)}>
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected && !editOpen} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[640px] max-w-full overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Warning size={18} /> {selected.title}
                  <span className="font-mono text-xs text-[hsl(var(--text-4))]">{selected.id}</span>
                </SheetTitle>
                <p className="text-sm text-[hsl(var(--text-4))]">{selected.description}</p>
              </SheetHeader>
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Category', selected.category], ['Severity', selected.severity],
                      ['Status', selected.status], ['Reporter', selected.reporter],
                      ['Assignee', selected.assignee], ['Linked Model', selected.linkedModel || '—'],
                      ['Reported', formatDate(selected.reportedDate)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-[hsl(var(--bg-surface))] p-3 border border-[hsl(var(--border))]">
                        <div className="text-xs text-[hsl(var(--text-4))]">{k}</div>
                        <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Root Cause</div>
                    <div className="p-3 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm text-[hsl(var(--text-3))]">{selected.rootCause}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Corrective Actions</div>
                    <div className="space-y-2">
                      {selected.correctiveActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">
                          <div className="w-5 h-5 border border-[hsl(var(--border))] flex items-center justify-center text-xs text-[hsl(var(--text-4))] shrink-0">{i + 1}</div>
                          <div className="text-sm text-[hsl(var(--text-1))]">{action}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selected.status !== 'resolved' && (
                      <>
                        <Button size="sm" className="gap-1.5 bg-orange-700 hover:bg-orange-600 text-white" onClick={() => handleEscalate(selected.id)}>
                          <ArrowUp size={14} /> Escalate
                        </Button>
                        <Button size="sm" className="gap-1.5 bg-green-700 hover:bg-green-600 text-white" onClick={() => handleClose(selected.id)}>
                          <Lock size={14} /> Close Incident
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-1">
                  <div className="text-xs text-[hsl(var(--text-4))] mb-4">Incident chronology</div>
                  {selected.timeline.map((event, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 mt-0.5 border-2 border-[hsl(var(--brand))] bg-[hsl(var(--brand))/20]`} />
                        {i < selected.timeline.length - 1 && <div className="w-px flex-1 mt-1 bg-[hsl(var(--border))]" />}
                      </div>
                      <div className="pb-4">
                        <div className="text-xs text-[hsl(var(--text-4))] mb-0.5">{formatDate(event.date)} · {event.actor}</div>
                        <div className="text-sm text-[hsl(var(--text-1))]">{event.action}</div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Incident — {selected?.id}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-[hsl(var(--text-4))]">Title</label>
              <Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-4))]">Assignee</label>
              <Input value={editForm.assignee} onChange={e => setEditForm(p => ({ ...p, assignee: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-4))]">Description</label>
              <textarea
                className="w-full mt-1 px-3 py-2 text-sm bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--text-1))] resize-none"
                rows={3}
                value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
