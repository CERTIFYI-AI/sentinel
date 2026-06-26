import { useState, useRef, useCallback } from 'react';
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
  Trash, MagnifyingGlass, ArrowsClockwise, UploadSimple, Warning, FilePlus, ClockCounterClockwise,
} from '@phosphor-icons/react';
import { EVIDENCE, Evidence, EvidenceStatus, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { toast } from 'sonner';


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

function daysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

interface VersionEntry {
  version: string;
  date: string;
  author: string;
  change: string;
  size: string;
}

function mockVersionHistory(e: Evidence): VersionEntry[] {
  return [
    { version: 'v3', date: e.lastSync, author: e.owner, change: 'Re-synced from source — auto-sync trigger', size: e.fileSize },
    { version: 'v2', date: '2026-01-15', author: e.owner, change: 'Updated evidence scope — added Q4 data', size: '1.8 MB' },
    { version: 'v1', date: '2025-10-01', author: 'James Patel', change: 'Initial upload and control mapping', size: '1.2 MB' },
  ];
}

export default function EvidenceHub() {
  const { orgName } = useSettingsStore();

  const [evidence, setEvidence] = useState<Evidence[]>(EVIDENCE);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [syncingAll, setSyncingAll] = useState(false);

  const [viewItem, setViewItem] = useState<Evidence | null>(null);
  const [viewTab, setViewTab] = useState('details');
  const [editItem, setEditItem] = useState<Evidence | null>(null);
  const [deleteItem, setDeleteItem] = useState<Evidence | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Evidence, 'id'>>(EMPTY_EVIDENCE);

  // ── Drag-drop state ────────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    files.forEach(file => {
      const id = `EV-${String(evidence.length + Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`;
      const newEntry: Evidence = {
        id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        source: 'Manual Upload',
        framework: 'Unassigned',
        control: 'Unassigned',
        type: file.name.endsWith('.pdf') ? 'Report' : 'Log',
        status: 'pending',
        lastSync: new Date().toISOString().split('T')[0],
        owner: 'You',
        description: `Uploaded file: ${file.name}`,
        fileSize: file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`,
      };
      setEvidence(prev => [newEntry, ...prev]);
    });
    toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded — assign framework and control`);
  }, [evidence.length]);

  const filtered = evidence.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || e.owner.toLowerCase().includes(q);
    const matchTab = tab === 'all' || e.status === tab || (tab === 'stale' && daysSince(e.lastSync) > 90 && e.status !== 'expired');
    return matchSearch && matchTab;
  });

  const synced = evidence.filter(e => e.status === 'synced').length;
  const pending = evidence.filter(e => e.status === 'pending').length;
  const expired = evidence.filter(e => e.status === 'expired').length;
  const failed = evidence.filter(e => e.status === 'failed').length;
  const stale = evidence.filter(e => daysSince(e.lastSync) > 90 && e.status !== 'expired').length;

  const stats = [
    { label: 'Total', value: evidence.length, icon: ClipboardText, color: '#6366f1' },
    { label: 'Synced', value: synced, icon: CheckCircle, color: '#10b981' },
    { label: 'Pending', value: pending, icon: Clock, color: '#f97316' },
    { label: 'Expired', value: expired, icon: Warning, color: '#ef4444' },
    { label: 'Stale (>90d)', value: stale, icon: ClockCounterClockwise, color: '#8b5cf6' },
  ];

  function handleSyncAll() {
    setSyncingAll(true);
    setTimeout(() => {
      setEvidence(prev => prev.map(e => e.status === 'pending' ? { ...e, status: 'synced' as EvidenceStatus, lastSync: new Date().toISOString().split('T')[0] } : e));
      setSyncingAll(false);
      toast.success('All pending evidence synced');
    }, 1200);
  }

  function handleSyncItem(id: string) {
    setEvidence(prev => prev.map(e => e.id === id ? { ...e, status: 'synced' as EvidenceStatus, lastSync: new Date().toISOString().split('T')[0] } : e));
    toast.success('Evidence re-synced');
  }

  function handleCreate() {
    const id = `EV-${String(evidence.length + 1).padStart(3, '0')}`;
    setEvidence(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_EVIDENCE);
    toast.success('Evidence uploaded successfully');
  }

  function handleEdit() {
    if (!editItem) return;
    setEvidence(prev => prev.map(e => e.id === editItem.id ? editItem : e));
    setEditItem(null);
    toast.success('Evidence updated');
  }

  function handleDelete() {
    if (!deleteItem) return;
    setEvidence(prev => prev.filter(e => e.id !== deleteItem.id));
    setDeleteItem(null);
    toast.success('Evidence deleted');
  }

  return (
    <div
      className="space-y-6"
      style={{ position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag-drop overlay */}
      {isDragging && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'hsl(var(--brand) / 0.08)',
          border: '3px dashed hsl(var(--brand))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <FilePlus size={52} style={{ color: 'hsl(var(--brand))', marginBottom: 12 }} />
          <p className="text-xl font-bold" style={{ color: 'hsl(var(--brand))' }}>Drop files to upload evidence</p>
          <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>PDF, CSV, JSON, XLSX supported</p>
        </div>
      )}

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
          <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncingAll} style={{ borderRadius: 0 }}>
            <ArrowsClockwise size={14} className={`mr-1 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Syncing...' : 'Sync All'}
          </Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_EVIDENCE); setCreateOpen(true); }} style={{ borderRadius: 0 }}>
            <UploadSimple size={14} className="mr-1" /> Upload Evidence
          </Button>
        </div>
      </div>

      {/* Drag-drop hint zone */}
      <div
        style={{
          border: '2px dashed hsl(var(--border))',
          padding: '20px',
          textAlign: 'center',
          background: 'hsl(var(--bg-muted) / 0.4)',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onDragEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--brand))'; e.currentTarget.style.background = 'hsl(var(--brand) / 0.05)'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.background = 'hsl(var(--bg-muted) / 0.4)'; }}
        onClick={() => { setFormData(EMPTY_EVIDENCE); setCreateOpen(true); }}
      >
        <UploadSimple size={24} style={{ color: 'hsl(var(--text-3))', margin: '0 auto 8px' }} />
        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>
          Drag & drop evidence files here, or <span style={{ color: 'hsl(var(--brand))' }}>click to browse</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
          PDF, XLSX, CSV, JSON · Files auto-tagged to pending queue
        </p>
      </div>

      {/* Staleness banner */}
      {stale > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'hsl(263 30% 14%)', border: '1px solid #8b5cf6' }}>
          <ClockCounterClockwise size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
          <p className="text-xs flex-1" style={{ color: '#8b5cf6' }}>
            <strong>{stale} evidence item{stale !== 1 ? 's' : ''}</strong> have not been updated in over 90 days — consider refreshing or re-syncing to maintain audit readiness.
          </p>
          <Button size="sm" variant="outline" onClick={() => setTab('stale')} style={{ borderRadius: 0, fontSize: 11, height: 28, borderColor: '#8b5cf6', color: '#8b5cf6' }}>
            View Stale
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
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
          <TabsTrigger value="stale" style={{ borderRadius: 0 }}>
            Stale ({stale})
            {stale > 0 && <span style={{ marginLeft: 4, width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />}
          </TabsTrigger>
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
                  {['ID', 'Title', 'Type', 'Framework', 'Control', 'Status', 'Staleness', 'Source', 'Last Sync', 'Owner', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const sc = statusColor(e.status);
                  const age = daysSince(e.lastSync);
                  const isStale = age > 90 && e.status !== 'expired';
                  return (
                    <tr
                      key={e.id}
                      className="cursor-pointer"
                      style={{ borderTop: '1px solid hsl(var(--border))' }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                      onClick={() => { setViewItem(e); setViewTab('details'); }}
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
                      <td className="p-3">
                        {isStale ? (
                          <Badge style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf6', borderRadius: 0, fontSize: 10 }}>
                            Stale {age}d
                          </Badge>
                        ) : (
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{age}d ago</span>
                        )}
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.source}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(e.lastSync)}</td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{e.owner}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => { setViewItem(e); setViewTab('details'); }}>
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => { setViewItem(e); setViewTab('ClockCounterClockwise'); }}>
                            <ClockCounterClockwise size={14} />
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
        <SheetContent style={{ width: 540, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  {(() => { const sc = statusColor(viewItem.status); return (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
                      {viewItem.status}
                    </Badge>
                  ); })()}
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.type}</Badge>
                  {daysSince(viewItem.lastSync) > 90 && viewItem.status !== 'expired' && (
                    <Badge style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf6', borderRadius: 0 }}>
                      Stale {daysSince(viewItem.lastSync)}d
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <Tabs value={viewTab} onValueChange={setViewTab}>
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))', marginBottom: 16 }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="ClockCounterClockwise" style={{ borderRadius: 0 }}>Version ClockCounterClockwise</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <div className="space-y-3">
                    {[
                      { label: 'Evidence ID', value: viewItem.id },
                      { label: 'Framework', value: viewItem.framework },
                      { label: 'Control', value: viewItem.control },
                      { label: 'Source', value: viewItem.source },
                      { label: 'Owner', value: viewItem.owner },
                      { label: 'File Size', value: viewItem.fileSize },
                      { label: 'Last Sync', value: formatDate(viewItem.lastSync) },
                      { label: 'Age', value: `${daysSince(viewItem.lastSync)} days ago` },
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
                    <Button size="sm" onClick={() => handleSyncItem(viewItem.id)} variant="outline" style={{ borderRadius: 0 }}>
                      <ArrowsClockwise size={14} className="mr-1" /> Re-sync
                    </Button>
                    <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }} style={{ borderRadius: 0 }}>
                      <PencilSimple size={14} className="mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setViewItem(null)} style={{ borderRadius: 0 }}>Close</Button>
                  </div>
                </TabsContent>

                <TabsContent value="ClockCounterClockwise">
                  <div className="space-y-3">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      Version ClockCounterClockwise for <strong style={{ color: 'hsl(var(--text-2))' }}>{viewItem.id}</strong>
                    </p>
                    {mockVersionHistory(viewItem).map((v, i) => (
                      <div key={v.version} style={{
                        padding: '12px 14px',
                        background: i === 0 ? 'hsl(var(--brand) / 0.04)' : 'hsl(var(--bg-muted) / 0.4)',
                        border: `1px solid ${i === 0 ? 'hsl(var(--brand) / 0.2)' : 'hsl(var(--border))'}`,
                      }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: i === 0 ? 'hsl(var(--brand))' : 'hsl(var(--text-2))' }}>
                              {v.version}
                            </span>
                            {i === 0 && (
                              <Badge style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 9 }}>
                                CURRENT
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(v.date)}</span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: 'hsl(var(--text-2))' }}>{v.change}</p>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                          <span>by {v.author}</span>
                          <span>·</span>
                          <span>{v.size}</span>
                        </div>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => setViewItem(null)} style={{ borderRadius: 0, marginTop: 8 }}>
                      Close
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
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
