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
  Globe, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, Monitor, Database, Cloud, ShieldCheck, Scan,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { ATTACK_SURFACE, AttackSurfaceAsset, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

function exposureStyle(exposure: string) {
  switch (exposure) {
    case 'public': return { bg: '#ef444420', text: '#ef4444', border: '#ef444440' };
    case 'restricted': return { bg: '#f9731620', text: '#f97316', border: '#f9731640' };
    case 'internal': return { bg: '#10b98120', text: '#10b981', border: '#10b98140' };
    default: return { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
  }
}

function typeIcon(type: string) {
  if (type.includes('Web') || type.includes('Admin')) return <Monitor size={14} style={{ color: '#3b82f6' }} />;
  if (type.includes('Data') || type.includes('DB')) return <Database size={14} style={{ color: '#f97316' }} />;
  if (type.includes('API')) return <Cloud size={14} style={{ color: '#8b5cf6' }} />;
  return <Globe size={14} style={{ color: 'hsl(var(--text-3))' }} />;
}

const EMPTY_ASSET: Omit<AttackSurfaceAsset, 'id'> = {
  name: '', type: 'Web Application', exposure: 'internal', risk: 'low',
  protocol: 'HTTPS', lastScanned: '', status: 'monitored',
  owner: '', description: '', openPorts: 0,
};

export default function AttackSurface() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [assets, setAssets] = useState<AttackSurfaceAsset[]>(ATTACK_SURFACE);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterExposure, setFilterExposure] = useState('all');

  const [viewItem, setViewItem] = useState<AttackSurfaceAsset | null>(null);
  const [editItem, setEditItem] = useState<AttackSurfaceAsset | null>(null);
  const [deleteItem, setDeleteItem] = useState<AttackSurfaceAsset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<AttackSurfaceAsset, 'id'>>(EMPTY_ASSET);

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q);
    const matchRisk = filterRisk === 'all' || a.risk === filterRisk;
    const matchExp = filterExposure === 'all' || a.exposure === filterExposure;
    return matchSearch && matchRisk && matchExp;
  });

  const typeData = Array.from(
    assets.reduce((acc, a) => {
      acc.set(a.type, (acc.get(a.type) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, count]) => ({ name, count }));

  const radarData = [
    { subject: 'Public', count: assets.filter(a => a.exposure === 'public').length },
    { subject: 'Restricted', count: assets.filter(a => a.exposure === 'restricted').length },
    { subject: 'Internal', count: assets.filter(a => a.exposure === 'internal').length },
    { subject: 'Critical Risk', count: assets.filter(a => a.risk === 'critical').length },
    { subject: 'High Risk', count: assets.filter(a => a.risk === 'high').length },
    { subject: 'Open Ports', count: assets.reduce((s, a) => s + a.openPorts, 0) },
  ];

  const stats = [
    { label: 'Total Assets', value: assets.length, icon: Globe },
    { label: 'Public Exposure', value: assets.filter(a => a.exposure === 'public').length, icon: Cloud },
    { label: 'Critical Risk', value: assets.filter(a => a.risk === 'critical').length, icon: Monitor },
    { label: 'Open Ports', value: assets.reduce((s, a) => s + a.openPorts, 0), icon: Database },
  ];

  function handleCreate() {
    const id = `AS-${String(assets.length + 1).padStart(3, '0')}`;
    setAssets(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_ASSET);
  }

  function handleEdit() {
    if (!editItem) return;
    setAssets(prev => prev.map(a => a.id === editItem.id ? editItem : a));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setAssets(prev => prev.filter(a => a.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Attack Surface</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Asset exposure mapping & risk monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Scan size={14} className="mr-1" /> Scan All</Button>
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_ASSET); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> Add Asset
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

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Assets by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: ct.axis }} />
                <YAxis tick={{ fontSize: 11, fill: ct.axis }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Bar dataKey="count" fill={ct.brand} radius={0} name="Assets" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Exposure Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={ct.grid} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: ct.axis }} />
                <Radar dataKey="count" stroke={ct.brand} fill={ct.brand} fillOpacity={0.3} name="Count" />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Risk Levels</option>
          {['critical', 'high', 'medium', 'low'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterExposure} onChange={e => setFilterExposure(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Exposures</option>
          {['public', 'restricted', 'internal'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {assets.length} assets</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Globe size={40} />
              <p className="mt-3 text-sm font-medium">No assets match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'Asset', 'Type', 'Exposure', 'Risk', 'Protocol', 'Ports', 'Owner', 'Last Scan', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr
                    key={a.id}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onClick={() => setViewItem(a)}
                  >
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{a.id}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {typeIcon(a.type)}
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.type}</td>
                    <td className="p-3">
                      <Badge style={{ background: exposureStyle(a.exposure).bg, color: exposureStyle(a.exposure).text, border: `1px solid ${exposureStyle(a.exposure).border}`, borderRadius: 0, fontSize: 11 }}>
                        {a.exposure}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge style={{ background: severityColor(a.risk).bg, color: severityColor(a.risk).text, border: `1px solid ${severityColor(a.risk).border}`, borderRadius: 0, fontSize: 11 }}>
                        {a.risk}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>{a.protocol}</td>
                    <td className="p-3 text-sm" style={{ color: a.openPorts > 2 ? '#ef4444' : 'hsl(var(--text-2))' }}>{a.openPorts}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.owner}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(a.lastScanned)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(a)}><Eye size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...a })}><PencilSimple size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(a)}><Trash size={14} /></Button>
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
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ background: severityColor(viewItem.risk).bg, color: severityColor(viewItem.risk).text, border: `1px solid ${severityColor(viewItem.risk).border}`, borderRadius: 0 }}>
                    {viewItem.risk} risk
                  </Badge>
                  <Badge style={{ background: exposureStyle(viewItem.exposure).bg, color: exposureStyle(viewItem.exposure).text, border: `1px solid ${exposureStyle(viewItem.exposure).border}`, borderRadius: 0 }}>
                    {viewItem.exposure}
                  </Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="ports" style={{ borderRadius: 0 }}>Network</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Asset ID', value: viewItem.id },
                    { label: 'Type', value: viewItem.type },
                    { label: 'Protocol', value: viewItem.protocol },
                    { label: 'Owner', value: viewItem.owner },
                    { label: 'Status', value: viewItem.status },
                    { label: 'Last Scanned', value: formatDate(viewItem.lastScanned) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </TabsContent>
                <TabsContent value="ports" className="mt-4">
                  <div className="text-center py-6">
                    <p className="text-5xl font-bold" style={{ color: viewItem.openPorts > 2 ? '#ef4444' : '#10b981' }}>{viewItem.openPorts}</p>
                    <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>Open Ports Detected</p>
                  </div>
                  <div className="p-3 mt-2" style={{ background: 'hsl(var(--bg-muted))' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Protocol</p>
                    <p className="text-sm font-mono" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.protocol}</p>
                  </div>
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Asset</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[{ label: 'Name', key: 'name' }, { label: 'Protocol', key: 'protocol' }, { label: 'Owner', key: 'owner' }, { label: 'Description', key: 'description' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Risk</label>
                  <select value={editItem.risk} onChange={e => setEditItem(prev => prev ? { ...prev, risk: e.target.value as any } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['critical', 'high', 'medium', 'low'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Exposure</label>
                  <select value={editItem.exposure} onChange={e => setEditItem(prev => prev ? { ...prev, exposure: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['public', 'restricted', 'internal'].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Open Ports</label>
                  <Input type="number" min={0} value={editItem.openPorts} onChange={e => setEditItem(prev => prev ? { ...prev, openPorts: parseInt(e.target.value) } : null)} style={{ borderRadius: 0 }} />
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Asset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Name / Hostname', key: 'name' }, { label: 'Protocol', key: 'protocol' }, { label: 'Owner', key: 'owner' }, { label: 'Description', key: 'description' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Asset Type</label>
                <select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['Web Application', 'API Gateway', 'ML Pipeline', 'Data Store', 'Admin Panel', 'CDN', 'Monitoring'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Risk</label>
                <select value={formData.risk} onChange={e => setFormData(prev => ({ ...prev, risk: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['critical', 'high', 'medium', 'low'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Exposure</label>
                <select value={formData.exposure} onChange={e => setFormData(prev => ({ ...prev, exposure: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['public', 'restricted', 'internal'].map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Remove Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteItem?.name}</strong> from monitoring? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#ef4444', borderRadius: 0 }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
