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
  ClipboardText, CheckCircle, Clock, XCircle, Plus, Eye, PencilSimple,
  Trash, MagnifyingGlass, ArrowsClockwise, UploadSimple, Warning,
} from '@phosphor-icons/react';
import { EVIDENCE, Evidence, EvidenceStatus, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

const EMPTY_EVIDENCE: Omit<Evidence, 'id'> = {
  title: '', source: '', framework: '', control: '', type: 'Report',
  status: 'pending', lastSync: new Date().toISOString().split('T')[0],
  owner: '', description: '', fileSize: '0 KB',
};

function syncIcon(status: EvidenceStatus) {
  if (status === 'synced') return <CheckCircle size={14} style={{ color: '#10b981' }} />;
  if (status === 'pending') return <Clock size={14} style={{ color: '#f97316' }} />;
  if (status === 'expired') return <Warning size={14} style={{ color: '#ef4444' }} />;
  return <XCircle size={14} style={{ color: '#ef4444' }} />;
}

export default function EvidenceHub() {
  const { orgName } = useSettingsStore();

  const [evidence, setEvidence] = useState<Evidence[]>(EVIDENCE);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [syncingAll, setSyncingAll] = useState(false);

  const [viewItem, setViewItem] = useState<Evidence | null>(null);
  const [editItem, setEditItem] = useState<Evidence | null>(null);
  const [deleteItem, setDeleteItem] = useState<Evidence | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Evidence, 'id'>>(EMPTY_EVIDENCE);

  const filtered = evidence.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || e.owner.toLowerCase().includes(q);
    const matchTab = tab === 'all' || e.status === tab;
    return matchSearch && matchTab;
  });

  const synced = evidence.filter(e => e.status === 'synced').length;
  const pending = evidence.filter(e => e.status === 'pending').length;
  const expired = evidence.filter(e => e.status === 'expired').length;
  const failed = evidence.filter(e => e.status === 'failed').length;

  const stats = [
    { label: 'Total', value: evidence.length, icon: ClipboardText, color: '#6366f1' },
    { label: 'Synced', value: synced, icon: CheckCircle, color: '#10b981' },
    { label: 'Pending', value: pending, icon: Clock, color: '#f97316' },
    { label: 'Expired', value: expired, icon: Warning, color: '#ef4444' },
  ];

  function handleSyncAll() {
    setSyncingAll(true);
    setTimeout(() => {
      setEvidence(prev => prev.map(e => e.status === 'pending' ? { ...e, status: 'synced' as EvidenceStatus, lastSync: new Date().toISOString().split('T')[0] } : e));
      setSyncingAll(false);
    }, 1200);
  }

  function handleSyncItem(id: string) {
    setEvidence(prev => prev.map(e => e.id === id ? { ...e, status: 'synced' as EvidenceStatus, lastSync: new Date().toISOString().split('T')[0] } : e));
  }

  function handleCreate() {
    const id = `EV-${String(evidence.length + 1).padStart(3, '0')}`;
    setEvidence(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_EVIDENCE);
  }

  function handleEdit() {
    if (!editItem) return;
    setEvidence(prev => prev.map(e => e.id === editItem.id ? editItem : e));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setEvidence(prev => prev.filter(e => e.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Breadcrumb */}
      <div className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
        <Link to="/compliance" style={{ color: 'hsl(var(--text-3))', textDecoration: 'none' }}>Compliance</Link>
        <span className="mx-1">›</span>
        <span style={{ color: 'hsl(var(--text-1))' }}>Evidence Hub</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Evidence Hub</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Compliance evidence collection and synchronization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncingAll}>
            <ArrowsClockwise size={14} className={`mr-1 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Syncing...' : 'Sync All'}
          </Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_EVIDENCE); setCreateOpen(true); }}>
            <UploadSimple size={14} className="mr-1" /> Upload Evidence
          </Button>
        </div>
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

      {/* Tab filters */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="all" style={{ borderRadius: 0 }}>All ({evidence.length})</TabsTrigger>
          <TabsTrigger value="synced" style={{ borderRadius: 0 }}>Synced ({synced})</TabsTrigger>
          <TabsTrigger value="pending" style={{ borderRadius: 0 }}>Pending ({pending})</TabsTrigger>
          <TabsTrigger value="expired" style={{ borderRadius: 0 }}>Expired ({expired})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search evidence..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {evidence.length}</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <ClipboardText size={40} />
              <p className="mt-3 text-sm font-medium">No evidence items found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'Title', 'Type', 'Framework', 'Control', 'Status', 'Source', 'Last Sync', 'Owner', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const sc = statusColor(e.status);
                  return (
                    <tr
                      key={e.id}
                      className="cursor-pointer"
                      style={{ borderTop: '1px solid hsl(var(--border))' }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                      onClick={() => setViewItem(e)}
                    >
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{e.id}</td>
                      <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 200 }}>
                        <span className="line-clamp-2">{e.title}</span>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.type}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.framework}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{e.control}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {syncIcon(e.status)}
                          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                            {e.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.source}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(e.lastSync)}</td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{e.owner}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(e)}>
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} title="Re-sync" onClick={() => handleSyncItem(e.id)}>
                            <ArrowsClockwise size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...e })}>
                            <PencilSimple size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(e)}>
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
                      {viewItem.status}
                    </Badge>
                  ); })()}
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.type}</Badge>
                </div>
              </SheetHeader>
              <div className="space-y-3">
                {[
                  { label: 'Evidence ID', value: viewItem.id },
                  { label: 'Framework', value: viewItem.framework },
                  { label: 'Control', value: viewItem.control },
                  { label: 'Source', value: viewItem.source },
                  { label: 'Owner', value: viewItem.owner },
                  { label: 'File Size', value: viewItem.fileSize },
                  { label: 'Last Sync', value: formatDate(viewItem.lastSync) },
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
              </div>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => handleSyncItem(viewItem.id)} variant="outline">
                  <ArrowsClockwise size={14} className="mr-1" /> Re-sync
                </Button>
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
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Evidence</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Title', key: 'title' },
                { label: 'Source', key: 'source' },
                { label: 'Framework', key: 'framework' },
                { label: 'Control', key: 'control' },
                { label: 'Owner', key: 'owner' },
                { label: 'Description', key: 'description' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value as EvidenceStatus } : null)}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['synced', 'pending', 'expired', 'failed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} style={{ borderRadius: 0 }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Upload Evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Title', key: 'title' },
              { label: 'Source', key: 'source' },
              { label: 'Framework', key: 'framework' },
              { label: 'Control', key: 'control' },
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
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Type</label>
                <select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['Report', 'Log', 'Validation', 'Agreement', 'Certificate'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as EvidenceStatus }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['pending', 'synced'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.title} style={{ borderRadius: 0 }}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Evidence</AlertDialogTitle>
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
