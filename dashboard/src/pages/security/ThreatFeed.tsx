import { useState } from 'react';
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
  Warning, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, FunnelSimple, ShieldWarning, CheckCircle, Clock, Fire,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { THREATS, Threat, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

const STATUS_COLORS: Record<string, string> = {
  active: '#ef4444',
  investigating: '#f97316',
  mitigated: '#10b981',
  resolved: '#6b7280',
};

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ec4899', '#06b6d4'];

function statusIcon(status: string) {
  if (status === 'active') return <Fire size={14} style={{ color: '#ef4444' }} />;
  if (status === 'investigating') return <Clock size={14} style={{ color: '#f97316' }} />;
  if (status === 'mitigated') return <ShieldWarning size={14} style={{ color: '#10b981' }} />;
  return <CheckCircle size={14} style={{ color: '#6b7280' }} />;
}

const EMPTY_THREAT: Omit<Threat, 'id'> = {
  name: '', category: 'Injection', severity: 'medium', status: 'investigating',
  source: '', detected: new Date().toISOString().split('T')[0],
  description: '', affectedModels: [], remediation: [],
};

export default function ThreatFeed() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [threats, setThreats] = useState<Threat[]>(THREATS);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewItem, setViewItem] = useState<Threat | null>(null);
  const [editItem, setEditItem] = useState<Threat | null>(null);
  const [deleteItem, setDeleteItem] = useState<Threat | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Threat, 'id'>>(EMPTY_THREAT);

  const filtered = threats.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    const matchSev = filterSeverity === 'all' || t.severity === filterSeverity;
    const matchStat = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchSev && matchStat;
  });

  const categoryData = Array.from(
    threats.reduce((acc, t) => {
      acc.set(t.category, (acc.get(t.category) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, count]) => ({ name, count }));

  const stats = [
    { label: 'Total Threats', value: threats.length, icon: Warning },
    { label: 'Active', value: threats.filter(t => t.status === 'active').length, icon: Fire },
    { label: 'Critical', value: threats.filter(t => t.severity === 'critical').length, icon: ShieldWarning },
    { label: 'Resolved', value: threats.filter(t => t.status === 'resolved').length, icon: CheckCircle },
  ];

  function handleCreate() {
    const id = `THR-${String(threats.length + 1).padStart(3, '0')}`;
    setThreats(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_THREAT);
  }

  function handleEdit() {
    if (!editItem) return;
    setThreats(prev => prev.map(t => t.id === editItem.id ? editItem : t));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setThreats(prev => prev.filter(t => t.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Threat Feed</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · AI threat intelligence & incident tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_THREAT); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> Add Threat
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: 'hsl(var(--brand))' }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Threats by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
              <YAxis tick={{ fontSize: 11, fill: ct.axis }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              <Bar dataKey="count" name="Threats" radius={0}>
                {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search threats..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <FunnelSimple size={14} style={{ color: 'hsl(var(--text-3))' }} />
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}
        >
          <option value="all">All Severities</option>
          {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}
        >
          <option value="all">All Statuses</option>
          {['active', 'investigating', 'mitigated', 'resolved'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {threats.length} threats</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Warning size={40} />
              <p className="mt-3 text-sm font-medium">No threats match your filters</p>
              <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'Name', 'Category', 'Severity', 'Status', 'Source', 'Detected', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onClick={() => setViewItem(t)}
                  >
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{t.id}</td>
                    <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{t.name}</td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{t.category}</td>
                    <td className="p-3">
                      <Badge style={{ background: severityColor(t.severity).bg, color: severityColor(t.severity).text, border: `1px solid ${severityColor(t.severity).border}`, borderRadius: 0, fontSize: 11 }}>
                        {t.severity}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(t.status)}
                        <span className="text-xs" style={{ color: STATUS_COLORS[t.status] || 'hsl(var(--text-2))' }}>{t.status}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{t.source}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(t.detected)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(t)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...t })}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(t)}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2">
                  <Badge style={{ background: severityColor(viewItem.severity).bg, color: severityColor(viewItem.severity).text, border: `1px solid ${severityColor(viewItem.severity).border}`, borderRadius: 0 }}>
                    {viewItem.severity}
                  </Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.status}</Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="remediation" style={{ borderRadius: 0 }}>Remediation</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Threat ID', value: viewItem.id },
                    { label: 'Category', value: viewItem.category },
                    { label: 'Source', value: viewItem.source },
                    { label: 'Detected', value: formatDate(viewItem.detected) },
                    { label: 'CVE', value: viewItem.cve || 'N/A' },
                    { label: 'Affected Models', value: viewItem.affectedModels.join(', ') || 'None' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Description</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                  </div>
                </TabsContent>
                <TabsContent value="remediation" className="mt-4">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Remediation Steps</p>
                  <ul className="space-y-2">
                    {viewItem.remediation.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle size={14} style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{r}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Threat</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Name', key: 'name', type: 'text' },
                { label: 'Category', key: 'category', type: 'text' },
                { label: 'Source', key: 'source', type: 'text' },
                { label: 'CVE', key: 'cve', type: 'text' },
                { label: 'Description', key: 'description', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input
                    value={(editItem as any)[f.key] || ''}
                    onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                    style={{ borderRadius: 0 }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</label>
                  <select
                    value={editItem.severity}
                    onChange={e => setEditItem(prev => prev ? { ...prev, severity: e.target.value as any } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}
                  >
                    {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select
                    value={editItem.status}
                    onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}
                  >
                    {['active', 'investigating', 'mitigated', 'resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add New Threat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Category', key: 'category', type: 'text' },
              { label: 'Source', key: 'source', type: 'text' },
              { label: 'Description', key: 'description', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input
                  value={(formData as any)[f.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ borderRadius: 0 }}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</label>
                <select
                  value={formData.severity}
                  onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}
                >
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}
                >
                  {['active', 'investigating', 'mitigated', 'resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Create Threat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Threat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This action cannot be undone.
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
