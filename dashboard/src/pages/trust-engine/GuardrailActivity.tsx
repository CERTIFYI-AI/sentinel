import { useState } from 'react';
import { Eye, PencilSimple, Trash, Export, Funnel, GearSix, MagnifyingGlass, CheckCircle, Warning, XCircle, Flag, ArrowRight } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { GUARDRAIL_EVENTS, GuardrailEvent, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

function latencyStyle(ms: number): React.CSSProperties {
  if (ms > 15) return { color: 'hsl(0 72% 51%)', fontWeight: 700 };
  if (ms >= 8) return { color: 'hsl(45 93% 47%)', fontWeight: 700 };
  return { color: 'hsl(142 71% 45%)', fontWeight: 700 };
}

function latencyLabel(ms: number) {
  if (ms > 15) return 'High';
  if (ms >= 8) return 'Med';
  return 'Low';
}

function actionBadge(action: GuardrailEvent['action']) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    blocked: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', label: 'Blocked' },
    warned: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(45 93% 47%)', label: 'Warned' },
    allowed: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', label: 'Allowed' },
    flagged: { bg: 'hsl(220 90% 56% / 0.15)', color: 'hsl(220 90% 56%)', label: 'Flagged' },
  };
  const s = map[action] ?? map.flagged;
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{s.label}</Badge>;
}

export default function GuardrailActivity() {
  const { orgName } = useSettingsStore();
  const [events, setEvents] = useState<GuardrailEvent[]>(GUARDRAIL_EVENTS);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewItem, setViewItem] = useState<GuardrailEvent | null>(null);
  const [editItem, setEditItem] = useState<GuardrailEvent | null>(null);
  const [editForm, setEditForm] = useState<Partial<GuardrailEvent>>({});
  const [configOpen, setConfigOpen] = useState(false);

  const filtered = events.filter(e => {
    const matchSearch = e.agent.toLowerCase().includes(search.toLowerCase()) ||
      e.rule.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase());
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return matchSearch && e.timestamp.startsWith(today);
    }
    return matchSearch;
  });

  const blocked = events.filter(e => e.action === 'blocked').length;
  const warned = events.filter(e => e.action === 'warned').length;
  const avgLatency = Math.round(events.reduce((s, e) => s + e.latencyMs, 0) / events.length);

  const openEdit = (e: GuardrailEvent) => { setEditItem(e); setEditForm({ ...e }); };
  const saveEdit = () => {
    if (!editItem) return;
    setEvents(prev => prev.map(e => e.id === editItem.id ? { ...e, ...editForm } as GuardrailEvent : e));
    setEditItem(null);
  };
  const handleDelete = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));

  const handleExport = () => {
    const csv = [
      ['ID', 'Timestamp', 'Agent', 'Rule', 'Severity', 'Action', 'Latency (ms)', 'Input', 'Output'].join(','),
      ...events.map(e => [e.id, e.timestamp, e.agent, e.rule, e.severity, e.action, e.latencyMs, `"${e.input}"`, `"${e.output}"`].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'guardrail-events.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Guardrail Activity</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Real-time guardrail event monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfigOpen(true)} style={{ borderRadius: 0 }}>
            <GearSix className="h-4 w-4 mr-2" />Configure Rules
          </Button>
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4 mr-2" />Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: events.length, color: 'hsl(var(--text-1))' },
          { label: 'Blocked', value: blocked, color: 'hsl(0 72% 51%)' },
          { label: 'Warnings', value: warned, color: 'hsl(45 93% 47%)' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, color: avgLatency > 15 ? 'hsl(0 72% 51%)' : avgLatency >= 8 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-5">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
              <Flag size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No guardrail events match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Timestamp', 'Agent', 'Rule', 'Severity', 'Action', 'Latency', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.id}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{e.agent}</td>
                      <td className="px-4 py-3" style={{ color: 'hsl(var(--text-4))' }}>{e.rule}</td>
                      <td className="px-4 py-3">
                        <Badge style={{ ...severityColor(e.severity) as any, borderRadius: 0, fontSize: 11 }}>
                          {e.severity.charAt(0).toUpperCase() + e.severity.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{actionBadge(e.action)}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span style={latencyStyle(e.latencyMs)}>{e.latencyMs}ms</span>
                        <span className="ml-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>({latencyLabel(e.latencyMs)})</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewItem(e)}>
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(e)}>
                            <PencilSimple size={14} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: 'hsl(0 72% 51%)' }}>
                                <Trash size={14} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                <AlertDialogDescription>Remove event {e.id} from the log? This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(e.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <SheetContent style={{ borderRadius: 0 }}>
          <SheetHeader><SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Event Detail</SheetTitle></SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-4 text-sm">
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>ID</p><p className="font-mono">{viewItem.id}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</p><p>{new Date(viewItem.timestamp).toLocaleString()}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</p><p className="font-medium">{viewItem.agent}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Rule</p><p>{viewItem.rule}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Severity</p>
                <Badge style={{ ...severityColor(viewItem.severity) as any, borderRadius: 0 }}>{viewItem.severity}</Badge>
              </div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Action</p>{actionBadge(viewItem.action)}</div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Latency</p>
                <span style={latencyStyle(viewItem.latencyMs)}>{viewItem.latencyMs}ms</span>
              </div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Input</p>
                <p className="mt-1 p-2 text-xs font-mono" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0 }}>{viewItem.input}</p>
              </div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Output</p>
                <p className="mt-1 p-2 text-xs font-mono" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0 }}>{viewItem.output}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</label>
              <Input value={editForm.agent || ''} onChange={e => setEditForm(f => ({ ...f, agent: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Rule</label>
              <Input value={editForm.rule || ''} onChange={e => setEditForm(f => ({ ...f, rule: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={saveEdit} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Rules Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader><DialogTitle>Configure Guardrail Rules</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            {['PII Detection', 'Toxicity Filter', 'Hallucination Guard', 'Data Boundary', 'Rate Limiter', 'Cost Threshold'].map(rule => (
              <div key={rule} className="flex items-center justify-between p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{rule}</span>
                <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', borderRadius: 0, fontSize: 11 }}>Active</Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setConfigOpen(false)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
