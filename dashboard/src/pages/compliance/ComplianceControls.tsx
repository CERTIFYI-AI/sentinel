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
  ShieldCheck, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  CheckCircle, XCircle, Clock, Warning, ClipboardText,
} from '@phosphor-icons/react';
import { CONTROLS, FRAMEWORKS, GAPS, EVIDENCE, Control, ControlStatus, statusColor, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

const EMPTY_CONTROL: Omit<Control, 'id'> = {
  title: '', framework: 'EU AI Act', clause: '', status: 'planned',
  score: 0, owner: '', evidenceCount: 0, lastTested: '',
  description: '', testResult: 'pending',
};

function statusIcon(status: ControlStatus) {
  if (status === 'implemented') return <CheckCircle size={14} style={{ color: '#10b981' }} />;
  if (status === 'partial') return <Warning size={14} style={{ color: '#f97316' }} />;
  if (status === 'planned') return <Clock size={14} style={{ color: '#6b7280' }} />;
  return <XCircle size={14} style={{ color: '#9ca3af' }} />;
}

export default function ComplianceControls() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [controls, setControls] = useState<Control[]>(CONTROLS);
  const [search, setSearch] = useState('');
  const [filterFramework, setFilterFramework] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewItem, setViewItem] = useState<Control | null>(null);
  const [editItem, setEditItem] = useState<Control | null>(null);
  const [deleteItem, setDeleteItem] = useState<Control | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Control, 'id'>>(EMPTY_CONTROL);

  const frameworks = Array.from(new Set(controls.map(c => c.framework)));

  const filtered = controls.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.clause.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q);
    const matchFW = filterFramework === 'all' || c.framework === filterFramework;
    const matchStat = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchFW && matchStat;
  });

  const totalControls = controls.length;
  const implemented = controls.filter(c => c.status === 'implemented').length;
  const coverage = Math.round((implemented / totalControls) * 100);
  const openGaps = GAPS.length;
  const evidenceTotal = controls.reduce((sum, c) => sum + c.evidenceCount, 0);

  const stats = [
    { label: 'Control Coverage', value: coverage + '%', icon: ShieldCheck, color: '#10b981' },
    { label: 'Total Controls', value: totalControls, icon: ClipboardText, color: '#6366f1' },
    { label: 'Open Gaps', value: openGaps, icon: Warning, color: '#f97316' },
    { label: 'Evidence Items', value: evidenceTotal, icon: CheckCircle, color: '#3b82f6' },
  ];

  function handleCreate() {
    const id = `CTRL-${String(controls.length + 1).padStart(3, '0')}`;
    setControls(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_CONTROL);
  }

  function handleEdit() {
    if (!editItem) return;
    setControls(prev => prev.map(c => c.id === editItem.id ? editItem : c));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setControls(prev => prev.filter(c => c.id !== deleteItem.id));
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
        <Link to="/compliance" style={{ color: 'hsl(var(--text-3))', textDecoration: 'none' }}>Compliance</Link>
        <span className="mx-1">›</span>
        <span style={{ color: 'hsl(var(--text-1))' }}>Controls</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Compliance Controls</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · {totalControls} controls across {frameworks.length} frameworks
          </p>
        </div>
        <Button size="sm" onClick={() => { setFormData(EMPTY_CONTROL); setCreateOpen(true); }}>
          <Plus size={14} className="mr-1" /> Add Control
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

      {/* Framework filter tabs */}
      <Tabs value={filterFramework} onValueChange={setFilterFramework}>
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="all" style={{ borderRadius: 0 }}>All</TabsTrigger>
          {frameworks.map(fw => (
            <TabsTrigger key={fw} value={fw} style={{ borderRadius: 0 }}>
              {fw.replace('ISO/IEC ', '').replace('OWASP ', '')}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search + Status Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search controls..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">All Statuses</option>
          {['implemented', 'partial', 'planned', 'not_applicable'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {controls.length}</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <ShieldCheck size={40} />
              <p className="mt-3 text-sm font-medium">No controls match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'Title', 'Framework', 'Clause', 'Status', 'Score', 'Evidence', 'Last Tested', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const sc = statusColor(c.status);
                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer"
                      style={{ borderTop: '1px solid hsl(var(--border))' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                      onClick={() => setViewItem(c)}
                    >
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{c.id}</td>
                      <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 200 }}>
                        <span className="line-clamp-2">{c.title}</span>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{c.framework.replace('ISO/IEC ', '')}</td>
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{c.clause}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(c.status)}
                          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                            {c.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3" style={{ minWidth: 100 }}>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, background: 'hsl(var(--bg-muted))', height: 6 }}>
                            <div style={{
                              width: c.score + '%',
                              height: '100%',
                              background: c.score >= 80 ? '#10b981' : c.score >= 60 ? '#f97316' : '#ef4444',
                            }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{c.score}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-center" style={{ color: 'hsl(var(--text-2))' }}>{c.evidenceCount}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{c.lastTested ? formatDate(c.lastTested) : '—'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(c)}>
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...c })}>
                            <PencilSimple size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(c)}>
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
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
                <div className="flex gap-2">
                  {(() => { const sc = statusColor(viewItem.status); return (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
                      {viewItem.status.replace('_', ' ')}
                    </Badge>
                  ); })()}
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.framework}</Badge>
                </div>
              </SheetHeader>
              <div className="space-y-3">
                {[
                  { label: 'Control ID', value: viewItem.id },
                  { label: 'Clause', value: viewItem.clause },
                  { label: 'Owner', value: viewItem.owner },
                  { label: 'Score', value: viewItem.score + '%' },
                  { label: 'Evidence Items', value: viewItem.evidenceCount.toString() },
                  { label: 'Last Tested', value: viewItem.lastTested ? formatDate(viewItem.lastTested) : '—' },
                  { label: 'Test Result', value: viewItem.testResult },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{ color: r.label === 'Test Result' && viewItem.testResult === 'fail' ? '#ef4444' : viewItem.testResult === 'pass' ? '#10b981' : 'hsl(var(--text-1))' }}>
                      {r.value}
                    </span>
                  </div>
                ))}
                <div className="pt-2">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Description</p>
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </div>
                {/* Gap delta — decrease is green, increase is red */}
                {(() => {
                  const linkedGaps = GAPS.filter(g => g.controlRef && viewItem.clause && g.controlRef.includes(viewItem.clause.split(' ')[0]));
                  const delta = viewItem.score - 80;
                  return (
                    <div className="pt-2 p-3" style={{ background: 'hsl(var(--bg-muted))' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Gap Delta vs Target (80%)</p>
                      <span className="text-sm font-bold" style={{ color: delta >= 0 ? '#10b981' : '#ef4444' }}>
                        {delta >= 0 ? '+' : ''}{delta}%
                      </span>
                      <span className="text-xs ml-2" style={{ color: 'hsl(var(--text-3))' }}>
                        {delta >= 0 ? 'Above target (good)' : 'Below target — action needed'}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} className="mr-1" /> Edit
                </Button>
                <Link to={`/controls/${viewItem.id}`} onClick={() => setViewItem(null)}>
                  <Button size="sm" variant="outline">View Detail</Button>
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Control</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Title', key: 'title' },
                { label: 'Clause', key: 'clause' },
                { label: 'Owner', key: 'owner' },
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
                  <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value as ControlStatus } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['implemented', 'partial', 'planned', 'not_applicable'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Score</label>
                  <Input type="number" min={0} max={100} value={editItem.score}
                    onChange={e => setEditItem(prev => prev ? { ...prev, score: Number(e.target.value) } : null)}
                    style={{ borderRadius: 0 }} />
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Title', key: 'title' },
              { label: 'Clause', key: 'clause' },
              { label: 'Owner', key: 'owner' },
              { label: 'Description', key: 'description' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Framework</label>
                <select value={formData.framework} onChange={e => setFormData(prev => ({ ...prev, framework: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {FRAMEWORKS.map(fw => <option key={fw.id} value={fw.name}>{fw.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ControlStatus }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['planned', 'partial', 'implemented'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.title}>Create Control</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Control</AlertDialogTitle>
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
