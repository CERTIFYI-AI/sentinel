import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Vault, FilePdf, FileDoc, FileXls, File, UploadSimple, MagnifyingGlass,
  Trash, Download, Eye, Warning, CheckCircle, Clock,
} from '@phosphor-icons/react';
import { EVIDENCE, Evidence, EvidenceStatus, statusColor, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';

const EMPTY_EVIDENCE: Omit<Evidence, 'id'> = {
  title: '', source: '', framework: '', control: '', type: 'Report',
  status: 'pending', lastSync: new Date().toISOString().split('T')[0],
  owner: '', description: '', fileSize: '0 KB',
};

function fileIcon(type: string) {
  if (type === 'Report' || type === 'Validation') return <FilePdf size={32} style={{ color: '#ef4444' }} />;
  if (type === 'Agreement' || type === 'Log') return <FileDoc size={32} style={{ color: '#3b82f6' }} />;
  if (type === 'Certificate') return <FileXls size={32} style={{ color: '#10b981' }} />;
  return <File size={32} style={{ color: '#6b7280' }} />;
}

function syncStatusDot(status: EvidenceStatus) {
  if (status === 'synced') return { color: '#10b981', label: 'Synced' };
  if (status === 'pending') return { color: '#f97316', label: 'Pending' };
  if (status === 'expired') return { color: '#ef4444', label: 'Expired' };
  return { color: '#ef4444', label: 'Failed' };
}

export default function EvidenceVault() {
  const { orgName } = useSettingsStore();

  const [evidence, setEvidence] = useState<Evidence[]>(EVIDENCE);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewItem, setViewItem] = useState<Evidence | null>(null);
  const [deleteItem, setDeleteItem] = useState<Evidence | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Evidence, 'id'>>(EMPTY_EVIDENCE);

  const types = Array.from(new Set(evidence.map(e => e.type)));

  const filtered = evidence.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || e.framework.toLowerCase().includes(q);
    const matchType = filterType === 'all' || e.type === filterType;
    return matchSearch && matchType;
  });

  const totalSize = '13.9 MB'; // sum of file sizes
  const synced = evidence.filter(e => e.status === 'synced').length;

  const stats = [
    { label: 'Total Files', value: evidence.length, icon: Vault, color: '#6366f1' },
    { label: 'Synced', value: synced, icon: CheckCircle, color: '#10b981' },
    { label: 'Total Size', value: totalSize, icon: Warning, color: '#3b82f6' },
    { label: 'Pending', value: evidence.filter(e => e.status === 'pending').length, icon: Clock, color: '#f97316' },
  ];

  function handleUpload() {
    const id = `EV-${String(evidence.length + 1).padStart(3, '0')}`;
    setEvidence(prev => [...prev, { ...formData, id }]);
    setUploadOpen(false);
    setFormData(EMPTY_EVIDENCE);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setEvidence(prev => prev.filter(e => e.id !== deleteItem.id));
    setDeleteItem(null);
  }

  const selectStyle = {
    background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0,
  };

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Evidence Vault</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Secure compliance evidence file management
          </p>
        </div>
        <Button size="sm" onClick={() => { setFormData(EMPTY_EVIDENCE); setUploadOpen(true); }}>
          <UploadSimple size={14} className="mr-1" /> Upload Evidence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={26} style={{ color: s.color }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search vault..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
          <option value="all">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {evidence.length} files</span>
      </div>

      {/* File Card Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(e => {
          const dot = syncStatusDot(e.status);
          const sc = statusColor(e.status);
          return (
            <Card
              key={e.id}
              className="cursor-pointer"
              style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', transition: 'border-color 0.15s' }}
              onMouseEnter={ev => (ev.currentTarget.style.borderColor = 'hsl(var(--brand))')}
              onMouseLeave={ev => (ev.currentTarget.style.borderColor = 'hsl(var(--border))')}
              onClick={() => setViewItem(e)}
            >
              <CardContent className="p-4">
                {/* Top: icon + type */}
                <div className="flex items-start justify-between mb-3">
                  {fileIcon(e.type)}
                  <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                    {e.status}
                  </Badge>
                </div>

                {/* File name */}
                <p className="text-sm font-semibold mb-1 line-clamp-2" style={{ color: 'hsl(var(--text-1))' }}>{e.title}</p>
                <p className="text-xs mb-2 line-clamp-1" style={{ color: 'hsl(var(--text-3))' }}>{e.framework}</p>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>
                  <span>{e.type}</span>
                  <span>{e.fileSize}</span>
                </div>
                <div className="flex items-center text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>
                  <span>Synced: {formatDate(e.lastSync)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }} onClick={ev => ev.stopPropagation()}>
                  <Button size="sm" variant="ghost" style={{ padding: '3px 8px', fontSize: 11 }}>
                    <Download size={12} className="mr-1" /> Download
                  </Button>
                  <Button size="sm" variant="ghost" style={{ padding: '3px 8px', fontSize: 11, color: '#ef4444' }}
                    onClick={() => setDeleteItem(e)}>
                    <Trash size={12} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
          <Vault size={40} />
          <p className="mt-3 text-sm font-medium">No files found</p>
          <p className="text-xs mt-1">Adjust your search or upload new evidence</p>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem?.title}</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-center py-4">
                {fileIcon(viewItem.type)}
              </div>
              {[
                { label: 'Evidence ID', value: viewItem.id },
                { label: 'Type', value: viewItem.type },
                { label: 'Framework', value: viewItem.framework },
                { label: 'Control', value: viewItem.control },
                { label: 'Source', value: viewItem.source },
                { label: 'Owner', value: viewItem.owner },
                { label: 'File Size', value: viewItem.fileSize },
                { label: 'Status', value: viewItem.status },
                { label: 'Last Sync', value: formatDate(viewItem.lastSync) },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                </div>
              ))}
              {viewItem.description && (
                <p className="text-sm pt-2" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }}>
              <Download size={14} className="mr-1" /> Download
            </Button>
            <Button variant="outline" onClick={() => setViewItem(null)} style={{ borderRadius: 0 }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Upload Evidence File</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* File drop zone */}
            <div className="flex flex-col items-center justify-center py-8" style={{ border: '2px dashed hsl(var(--border))', borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
              <UploadSimple size={28} style={{ color: 'hsl(var(--text-3))' }} />
              <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>Drop files here or click to browse</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>PDF, DOC, XLS supported</p>
            </div>
            {[
              { label: 'Title', key: 'title' },
              { label: 'Framework', key: 'framework' },
              { label: 'Owner', key: 'owner' },
              { label: 'Description', key: 'description' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Type</label>
              <select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                {['Report', 'Log', 'Validation', 'Agreement', 'Certificate'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!formData.title} style={{ borderRadius: 0 }}>
              <UploadSimple size={14} className="mr-1" /> Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Evidence File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteItem?.title}</strong>? This action cannot be undone.
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
