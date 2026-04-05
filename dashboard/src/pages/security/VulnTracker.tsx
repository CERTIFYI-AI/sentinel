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
  Bug, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, FunnelSimple, CheckCircle, Clock, WarningCircle,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { VULNERABILITIES, Vulnerability, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

function cvssColor(score: number) {
  if (score >= 9) return '#ef4444';
  if (score >= 7) return '#f97316';
  if (score >= 4) return '#eab308';
  return '#10b981';
}

function statusBadgeColor(status: string) {
  switch (status) {
    case 'patched': return { bg: '#10b98120', text: '#10b981', border: '#10b98140' };
    case 'in_progress': return { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f640' };
    case 'open': return { bg: '#ef444420', text: '#ef4444', border: '#ef444440' };
    default: return { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
  }
}

const EMPTY_VULN: Omit<Vulnerability, 'id'> = {
  cve: '', title: '', cvss: 5.0, severity: 'medium', component: '',
  status: 'open', discovered: new Date().toISOString().split('T')[0],
  patchDate: '', assignee: '', description: '',
};

export default function VulnTracker() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [vulns, setVulns] = useState<Vulnerability[]>(VULNERABILITIES);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewItem, setViewItem] = useState<Vulnerability | null>(null);
  const [editItem, setEditItem] = useState<Vulnerability | null>(null);
  const [deleteItem, setDeleteItem] = useState<Vulnerability | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Vulnerability, 'id'>>(EMPTY_VULN);

  const filtered = vulns.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.title.toLowerCase().includes(q) || v.cve.toLowerCase().includes(q) || v.component.toLowerCase().includes(q);
    const matchSev = filterSeverity === 'all' || v.severity === filterSeverity;
    const matchStat = filterStatus === 'all' || v.status === filterStatus;
    return matchSearch && matchSev && matchStat;
  });

  const severityData = ['critical', 'high', 'medium', 'low'].map(s => ({
    name: s,
    count: vulns.filter(v => v.severity === s).length,
  }));

  const stats = [
    { label: 'Total CVEs', value: vulns.length, icon: Bug },
    { label: 'Critical', value: vulns.filter(v => v.severity === 'critical').length, icon: WarningCircle },
    { label: 'Open', value: vulns.filter(v => v.status === 'open').length, icon: Clock },
    { label: 'Patched', value: vulns.filter(v => v.status === 'patched').length, icon: CheckCircle },
  ];

  function handleCreate() {
    const id = `VULN-${String(vulns.length + 1).padStart(3, '0')}`;
    setVulns(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_VULN);
  }

  function handleEdit() {
    if (!editItem) return;
    setVulns(prev => prev.map(v => v.id === editItem.id ? editItem : v));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setVulns(prev => prev.filter(v => v.id !== deleteItem.id));
    setDeleteItem(null);
  }

  function CvssBar({ score }: { score: number }) {
    const color = cvssColor(score);
    return (
      <div className="flex items-center gap-2">
        <div style={{ width: 80, height: 6, background: 'hsl(var(--bg-muted))', position: 'relative', borderRadius: 0 }}>
          <div style={{ width: `${(score / 10) * 100}%`, height: '100%', background: color, borderRadius: 0 }} />
        </div>
        <span className="text-xs font-bold" style={{ color }}>{score.toFixed(1)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Vulnerability Tracker</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · CVE tracking, CVSS scoring & patch management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_VULN); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> Add CVE
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
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Vulnerabilities by Severity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
              <YAxis tick={{ fontSize: 11, fill: ct.axis }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              <Bar dataKey="count" name="Count" radius={0}>
                {severityData.map((entry, i) => (
                  <Cell key={i} fill={cvssColor(entry.name === 'critical' ? 9.5 : entry.name === 'high' ? 7.5 : entry.name === 'medium' ? 5 : 2)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* CVSS Score List */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>CVSS Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vulns.sort((a, b) => b.cvss - a.cvss).map(v => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="text-xs font-mono w-24" style={{ color: 'hsl(var(--text-3))' }}>{v.cve}</span>
                <span className="text-xs flex-1" style={{ color: 'hsl(var(--text-2))' }}>{v.title}</span>
                <div className="flex items-center gap-2">
                  <div style={{ width: 120, height: 8, background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                    <div style={{ width: `${(v.cvss / 10) * 100}%`, height: '100%', background: cvssColor(v.cvss), borderRadius: 0 }} />
                  </div>
                  <span className="text-xs font-bold w-8" style={{ color: cvssColor(v.cvss) }}>{v.cvss}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search CVEs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <FunnelSimple size={14} style={{ color: 'hsl(var(--text-3))' }} />
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Severities</option>
          {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Statuses</option>
          {['open', 'in_progress', 'patched'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {vulns.length} vulns</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Bug size={40} />
              <p className="mt-3 text-sm font-medium">No vulnerabilities match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'CVE', 'Title', 'CVSS', 'Severity', 'Component', 'Status', 'Assignee', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr
                    key={v.id}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onClick={() => setViewItem(v)}
                  >
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{v.id}</td>
                    <td className="p-3 text-xs font-mono" style={{ color: '#3b82f6' }}>{v.cve}</td>
                    <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v.title}</td>
                    <td className="p-3">
                      <CvssBar score={v.cvss} />
                    </td>
                    <td className="p-3">
                      <Badge style={{ background: severityColor(v.severity).bg, color: severityColor(v.severity).text, border: `1px solid ${severityColor(v.severity).border}`, borderRadius: 0, fontSize: 11 }}>
                        {v.severity}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{v.component}</td>
                    <td className="p-3">
                      <Badge style={{ background: statusBadgeColor(v.status).bg, color: statusBadgeColor(v.status).text, border: `1px solid ${statusBadgeColor(v.status).border}`, borderRadius: 0, fontSize: 11 }}>
                        {v.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{v.assignee}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(v)}>
                          <Eye size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...v })}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(v)}>
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
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ background: severityColor(viewItem.severity).bg, color: severityColor(viewItem.severity).text, border: `1px solid ${severityColor(viewItem.severity).border}`, borderRadius: 0 }}>
                    {viewItem.severity}
                  </Badge>
                  <Badge style={{ background: statusBadgeColor(viewItem.status).bg, color: statusBadgeColor(viewItem.status).text, border: `1px solid ${statusBadgeColor(viewItem.status).border}`, borderRadius: 0 }}>
                    {viewItem.status}
                  </Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="cvss" style={{ borderRadius: 0 }}>CVSS</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'CVE ID', value: viewItem.cve },
                    { label: 'Component', value: viewItem.component },
                    { label: 'Assignee', value: viewItem.assignee },
                    { label: 'Discovered', value: formatDate(viewItem.discovered) },
                    { label: 'Patch Date', value: viewItem.patchDate ? formatDate(viewItem.patchDate) : 'Not patched' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </TabsContent>
                <TabsContent value="cvss" className="mt-4">
                  <div className="text-center py-4">
                    <p className="text-6xl font-bold" style={{ color: cvssColor(viewItem.cvss) }}>{viewItem.cvss}</p>
                    <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>CVSS Base Score</p>
                    <div style={{ width: '100%', height: 12, background: 'hsl(var(--bg-muted))', margin: '16px 0', borderRadius: 0 }}>
                      <div style={{ width: `${(viewItem.cvss / 10) * 100}%`, height: '100%', background: cvssColor(viewItem.cvss), borderRadius: 0 }} />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      <span>0 (None)</span><span>10 (Critical)</span>
                    </div>
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Vulnerability</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'CVE ID', key: 'cve' }, { label: 'Title', key: 'title' },
                { label: 'Component', key: 'component' }, { label: 'Assignee', key: 'assignee' },
                { label: 'Description', key: 'description' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>CVSS Score</label>
                  <Input type="number" min={0} max={10} step={0.1} value={editItem.cvss} onChange={e => setEditItem(prev => prev ? { ...prev, cvss: parseFloat(e.target.value) } : null)} style={{ borderRadius: 0 }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</label>
                  <select value={editItem.severity} onChange={e => setEditItem(prev => prev ? { ...prev, severity: e.target.value as any } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['open', 'in_progress', 'patched'].map(s => <option key={s} value={s}>{s}</option>)}
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add New Vulnerability</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'CVE ID', key: 'cve' }, { label: 'Title', key: 'title' },
              { label: 'Component', key: 'component' }, { label: 'Assignee', key: 'assignee' },
              { label: 'Description', key: 'description' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>CVSS</label>
                <Input type="number" min={0} max={10} step={0.1} value={formData.cvss} onChange={e => setFormData(prev => ({ ...prev, cvss: parseFloat(e.target.value) }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</label>
                <select value={formData.severity} onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['open', 'in_progress', 'patched'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.title}>Create Vulnerability</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Vulnerability</AlertDialogTitle>
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
