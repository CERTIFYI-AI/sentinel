// @ts-nocheck
import { useState, useMemo } from 'react';
import { useControlData } from '../hooks/useControlData';
import { useFrameworksData } from '../hooks/useFrameworksData';
import { PageSkeleton } from '../components/ui/PageSkeleton';
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
  Warning, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  CheckCircle, XCircle, FunnelSimple, TrendUp,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import { severityColor, formatDate } from '../data/seed';
type Gap = any;

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';


const EMPTY_GAP: Omit<Gap, 'id'> = {
  title: '', framework: 'EU AI Act', controlRef: '', severity: 'medium',
  progress: 0, dueDate: '', owner: '', description: '',
};

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function GapAnalysis() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const { controls, isLoading: ctrlLoading } = useControlData();
  const { frameworks: fwList, isLoading: fwLoading } = useFrameworksData();
  const isLoading = ctrlLoading || fwLoading;
  if (isLoading) return <PageSkeleton />;
  
  // Derive gaps from controls that are not fully implemented
  const derivedGaps: Gap[] = controls
    .filter((c: any) => c.status && !['Implemented', 'implemented'].includes(c.status))
    .map((c: any) => ({
      id: c.id || c.control_id || '',
      title: c.name || c.title || '',
      framework: c.framework || '',
      controlRef: c.control_id || c.controlId || c.id || '',
      severity: c.severity || (c.status === 'Not Implemented' ? 'high' : c.status === 'Partially Implemented' ? 'medium' : 'low'),
      progress: c.progress || (c.status === 'Partially Implemented' ? 40 : c.status === 'Planned' ? 10 : 0),
      dueDate: c.due_date || c.dueDate || '',
      owner: c.owner || '',
      description: c.description || '',
    }));
  const [_gaps, setLocalGaps] = useState<Gap[]>([]);
  const gaps = derivedGaps.length > 0 ? derivedGaps : _gaps;
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterFramework, setFilterFramework] = useState('all');

  const [viewItem, setViewItem] = useState<Gap | null>(null);
  const [editItem, setEditItem] = useState<Gap | null>(null);
  const [deleteItem, setDeleteItem] = useState<Gap | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Gap, 'id'>>(EMPTY_GAP);

  const filtered = gaps.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q || g.title.toLowerCase().includes(q) || g.framework.toLowerCase().includes(q) || g.owner.toLowerCase().includes(q);
    const matchSev = filterSeverity === 'all' || g.severity === filterSeverity;
    const matchFW = filterFramework === 'all' || g.framework === filterFramework;
    return matchSearch && matchSev && matchFW;
  });

  const totalGaps = gaps.length;
  const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
  const highGaps = gaps.filter(g => g.severity === 'high').length;
  const avgProgress = gaps.length > 0 ? Math.round(gaps.reduce((s: number, g: any) => s + (g.progress || 0), 0) / gaps.length) : 0;

  const severityData = ['critical', 'high', 'medium', 'low'].map(sev => ({
    name: sev,
    count: gaps.filter(g => g.severity === sev).length,
  }));

  const frameworkData = fwList.map((fw: any) => ({
    name: (fw.name || '').replace('ISO/IEC ', '').replace('OWASP ', '').split(' ')[0],
    gaps: gaps.filter((g: any) => g.framework === fw.name).length,
    fullName: fw.name,
  })).filter((d: any) => d.gaps > 0);

  const stats = [
    { label: 'Total Gaps', value: totalGaps, icon: Warning, color: '#6366f1' },
    { label: 'Critical', value: criticalGaps, icon: XCircle, color: '#ef4444' },
    { label: 'High', value: highGaps, icon: Warning, color: '#f97316' },
    { label: 'Avg Progress', value: avgProgress + '%', icon: TrendUp, color: '#10b981' },
  ];

  const frameworks = Array.from(new Set(gaps.map(g => g.framework)));

  function handleCreate() {
    // Gaps are derived from controls — create a control in the controls page
    setCreateOpen(false);
    setFormData(EMPTY_GAP);
  }

  function handleEdit() {
    if (!editItem) return;
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
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
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Gap Analysis</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · {totalGaps} compliance gaps across {frameworks.length} frameworks
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCsv(gaps, 'gap-analysis.csv')}>Export CSV</Button>
        <Button size="sm" onClick={() => { setFormData(EMPTY_GAP); setCreateOpen(true); }}>
          <Plus size={14} className="mr-1" /> Create Gap
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

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Gaps by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={severityData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis tick={{ fill: ct.axis, fontSize: 11 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Bar dataKey="count" name="Gaps" radius={0}>
                  {severityData.map((d, i) => <Cell key={i} fill={SEV_COLORS[d.name] || '#6b7280'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Gaps by Framework</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={frameworkData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} />
                <YAxis tick={{ fill: ct.axis, fontSize: 11 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                <Tooltip
                  contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                  formatter={(v: number, _: string, p: any) => [v, p.payload.fullName]}
                />
                <Bar dataKey="gaps" fill="hsl(var(--brand))" radius={0} name="Gaps" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search gaps..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <FunnelSimple size={14} style={{ color: 'hsl(var(--text-3))' }} />
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={selectStyle}>
          <option value="all">All Severities</option>
          {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterFramework} onChange={e => setFilterFramework(e.target.value)} style={selectStyle}>
          <option value="all">All Frameworks</option>
          {frameworks.map(fw => <option key={fw} value={fw}>{fw}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {gaps.length}</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <CheckCircle size={40} style={{ color: '#10b981' }} />
              <p className="mt-3 text-sm font-medium">No gaps match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'Gap Description', 'Framework', 'Control Ref', 'Severity', 'Progress', 'Due Date', 'Owner', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const sc = severityColor(g.severity);
                  const isOverdue = new Date(g.dueDate) < new Date();
                  return (
                    <tr
                      key={g.id}
                      className="cursor-pointer"
                      style={{ borderTop: '1px solid hsl(var(--border))' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                      onClick={() => setViewItem(g)}
                    >
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))', whiteSpace: 'nowrap' }}>{g.id}</td>
                      <td className="p-3" style={{ minWidth: 300 }}>
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {g.title}
                        </p>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))', whiteSpace: 'nowrap' }}>{g.framework}</td>
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))', whiteSpace: 'nowrap' }}>{g.controlRef}</td>
                      <td className="p-3" style={{ whiteSpace: 'nowrap' }}>
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                          {g.severity}
                        </Badge>
                      </td>
                      <td className="p-3" style={{ minWidth: 120 }}>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, background: 'hsl(var(--bg-muted))', height: 6 }}>
                            <div style={{ width: g.progress + '%', height: '100%', background: g.progress >= 70 ? '#10b981' : g.progress >= 40 ? '#f97316' : '#ef4444' }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{g.progress}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs" style={{ color: isOverdue ? '#ef4444' : 'hsl(var(--text-3))', whiteSpace: 'nowrap' }}>
                        {formatDate(g.dueDate)}
                        {isOverdue && <span className="ml-1 font-bold">(overdue)</span>}
                      </td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))', whiteSpace: 'nowrap' }}>{g.owner}</td>
                      <td className="p-3" style={{ whiteSpace: 'nowrap' }}>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(g)}>
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...g })}>
                            <PencilSimple size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(g)}>
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
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Gap Detail</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  {(() => { const sc = severityColor(viewItem.severity); return (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
                      {viewItem.severity}
                    </Badge>
                  ); })()}
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.framework}</Badge>
                </div>
              </SheetHeader>
              <div className="space-y-3">
                <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.title}</p>
                {[
                  { label: 'Gap ID', value: viewItem.id },
                  { label: 'Control Ref', value: viewItem.controlRef },
                  { label: 'Owner', value: viewItem.owner },
                  { label: 'Due Date', value: formatDate(viewItem.dueDate) },
                  { label: 'Progress', value: viewItem.progress + '%' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}
                {viewItem.description && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Description</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                  </div>
                )}
                {/* Progress bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'hsl(var(--text-3))' }}>Remediation Progress</span>
                    <span style={{ color: 'hsl(var(--text-1))' }}>{viewItem.progress}%</span>
                  </div>
                  <div style={{ background: 'hsl(var(--bg-muted))', height: 10 }}>
                    <div style={{ width: viewItem.progress + '%', height: '100%', background: viewItem.progress >= 70 ? '#10b981' : viewItem.progress >= 40 ? '#f97316' : '#ef4444' }} />
                  </div>
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Gap</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Title', key: 'title' },
                { label: 'Control Ref', key: 'controlRef' },
                { label: 'Owner', key: 'owner' },
                { label: 'Description', key: 'description' },
                { label: 'Due Date', key: 'dueDate', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input type={f.type || 'text'} value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</label>
                  <select value={editItem.severity} onChange={e => setEditItem(prev => prev ? { ...prev, severity: e.target.value as Severity } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Progress (%)</label>
                  <Input type="number" min={0} max={100} value={editItem.progress}
                    onChange={e => setEditItem(prev => prev ? { ...prev, progress: Number(e.target.value) } : null)}
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Create Gap</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Title', key: 'title' },
              { label: 'Control Ref', key: 'controlRef' },
              { label: 'Owner', key: 'owner' },
              { label: 'Description', key: 'description' },
              { label: 'Due Date', key: 'dueDate', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input type={f.type || 'text'} value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Framework</label>
                <select value={formData.framework} onChange={e => setFormData(prev => ({ ...prev, framework: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {fwList.map((fw: any) => <option key={fw.id} value={fw.name}>{fw.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</label>
                <select value={formData.severity} onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as Severity }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.title} style={{ borderRadius: 0 }}>Create Gap</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Gap</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this gap? This action cannot be undone.
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
