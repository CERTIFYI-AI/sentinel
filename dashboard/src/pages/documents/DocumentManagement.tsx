// SPDX-License-Identifier: Apache-2.0
// Document Management — the real org-scoped `documents` table via
// documentService (writes throw; toasts fire only after the write resolves).
// Files are really uploaded to storage (evidence bucket, documents/ folder)
// with storage_path / file_size / mime_type / sha256 recorded; external
// references render as real links. Interlinks: linked_entity_type/id and
// linked_model_ids carry uuids, resolved to display names at render time.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import {
  FileText, MagnifyingGlass, Export, Plus, Clock, CheckCircle, Warning,
  PencilSimple, Trash, X, ArrowSquareOut, UploadSimple,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../../stores/settingsStore';
import { toast } from 'sonner';
import { fetchDocuments, saveDocument, deleteDocument, type DocumentRecord } from '../../services/documentService';
import { uploadFile } from '@/lib/storage';
import { exportCsv } from '@/lib/exportUtils';
import { useModelsData } from '@/hooks/useModelsData';
import { usePolicies } from '@/hooks/queries/usePolicies';

// ── Constants ────────────────────────────────────────────────────────────────
const DOC_TYPES = ['policy', 'procedure', 'standard', 'guideline', 'template'];
const STATUSES = ['draft', 'in_review', 'approved', 'published', 'archived', 'expired'];
const CATEGORIES = ['AI Governance', 'Data security', 'Access', 'Risk', 'Compliance', 'Security', 'Privacy', 'Ethics', 'Business continuity', 'Change management'];
const FRAMEWORKS_LIST = ['EU AI Act', 'NIST AI RMF', 'ISO 42001', 'ISO 27001', 'SOC 2', 'GDPR', 'OECD AI Principles', 'OWASP LLM Top 10'];

const label = (s?: string | null) =>
  (s ?? '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '—';

function statusStyle(s: string) {
  const map: Record<string, { bg: string; color: string }> = {
    published: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    approved: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    in_review: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    draft: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
    expired: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
    archived: { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' },
  };
  return map[s] || { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-1))' };
}

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatBytes(bytes?: number | null) {
  if (bytes == null) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function sha256Hex(file: File): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null; // hashing unavailable — the row simply has no sha256
  }
}

// ── Data hook — real backend, toasts only after the write resolves ──────────
function useDocuments() {
  const qc = useQueryClient();
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    staleTime: 30_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['documents'] });
  const save = useMutation({
    mutationFn: (r: DocumentRecord) => saveDocument(r),
    onSuccess: () => { inv(); toast.success('Document saved'); },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to save document'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => { inv(); toast.success('Document deleted'); },
    onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : 'Failed to delete document'),
  });
  return {
    items, isLoading, error,
    save: save.mutateAsync, remove: remove.mutateAsync,
    isSaving: save.isPending, isDeleting: remove.isPending,
  };
}

// ── Form field ───────────────────────────────────────────────────────────────
function FormField({ label: l, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{l}{required && <span style={{ color: 'hsl(var(--destructive))' }}>*</span>}</label>
      {children}
      {hint && <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{hint}</p>}
    </div>
  );
}

interface FormState {
  title: string; docType: string; version: string; owner: string; status: string;
  description: string; frameworks: string[]; category: string; expiryDate: string;
  documentSource: 'none' | 'upload' | 'link'; externalLink: string;
  linkedEntityType: string; linkedEntityId: string; linkedModelIds: string[];
}
const EMPTY_FORM: FormState = {
  title: '', docType: 'policy', version: '1.0', owner: '', status: 'draft',
  description: '', frameworks: [], category: '', expiryDate: '',
  documentSource: 'none', externalLink: '',
  linkedEntityType: 'none', linkedEntityId: '', linkedModelIds: [],
};

export default function DocumentManagement() {
  const { orgName } = useSettingsStore();
  const { items: docs, isLoading, error, save, remove, isSaving } = useDocuments();
  const { models } = useModelsData();
  const { data: policies = [] } = usePolicies();
  const [searchParams, setSearchParams] = useSearchParams();
  const openParam = searchParams.get('open');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDoc = useMemo(() => docs.find(d => d.id === selectedId) ?? null, [docs, selectedId]);
  const setF = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  // Deep link: ?open=<uuid> opens the detail sheet.
  useEffect(() => {
    if (!openParam || isLoading) return;
    const match = docs.find(d => d.id === openParam);
    if (match?.id) { setSelectedId(match.id); setSheetOpen(true); }
  }, [openParam, docs, isLoading]);

  const closeSheet = (open: boolean) => {
    setSheetOpen(open);
    if (!open && openParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
    }
  };

  const modelName = (id: string) => models.find((m: any) => m.id === id)?.name ?? 'Unavailable';
  const policyLabel = (id: string) => {
    const p = policies.find(p => p.id === id);
    return p ? (p.policyRef ? `${p.policyRef} · ${p.title}` : p.title) : 'Unavailable';
  };
  const linkedEntityChip = (d: DocumentRecord) => {
    if (!d.linkedEntityType || !d.linkedEntityId) return null;
    switch (d.linkedEntityType) {
      case 'model':
        return <InterlinkChip label={modelName(d.linkedEntityId)} to={`/models/inventory/${d.linkedEntityId}`} />;
      case 'policy':
        return <InterlinkChip label={policyLabel(d.linkedEntityId)} to={`/policies?open=${d.linkedEntityId}`} />;
      case 'use_case':
        return <InterlinkChip label="Use case" to={`/use-cases/${d.linkedEntityId}`} />;
      default:
        return null;
    }
  };

  const filtered = useMemo(() => docs.filter(doc => {
    const q = search.toLowerCase();
    const ms = !q
      || doc.title.toLowerCase().includes(q)
      || (doc.owner ?? '').toLowerCase().includes(q)
      || (doc.category ?? '').toLowerCase().includes(q)
      || (doc.frameworks ?? []).some(f => f.toLowerCase().includes(q));
    const mt = filterType === 'all' || doc.docType === filterType;
    const mst = filterStatus === 'all' || doc.status === filterStatus;
    return ms && mt && mst;
  }), [docs, search, filterType, filterStatus]);

  // Current quarter derived from today's date — never hardcoded.
  const quarterStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  }, []);
  const totalDocuments = docs.length;
  const pendingReview = docs.filter(d => d.status === 'in_review').length;
  const expired = docs.filter(d => d.status === 'expired' || (d.expiryDate && new Date(d.expiryDate) < new Date())).length;
  const publishedThisQ = docs.filter(d => d.status === 'published' && d.createdAt && new Date(d.createdAt) >= quarterStart).length;

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setPendingFile(null); setEditId(null); setFormOpen(true); };
  const openEdit = (doc: DocumentRecord) => {
    setForm({
      title: doc.title,
      docType: doc.docType ?? 'policy',
      version: doc.version ?? '1.0',
      owner: doc.owner ?? '',
      status: doc.status,
      description: doc.description ?? '',
      frameworks: [...(doc.frameworks ?? [])],
      category: doc.category ?? '',
      expiryDate: doc.expiryDate ?? '',
      documentSource: doc.storagePath ? 'upload' : doc.externalLink ? 'link' : 'none',
      externalLink: doc.externalLink ?? '',
      linkedEntityType: doc.linkedEntityType ?? 'none',
      linkedEntityId: doc.linkedEntityId ?? '',
      linkedModelIds: [...(doc.linkedModelIds ?? [])],
    });
    setPendingFile(null);
    setEditId(doc.id ?? null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Document title is required'); return; }
    const existing = editId ? docs.find(d => d.id === editId) : undefined;

    let storagePath = existing?.storagePath ?? null;
    let fileSize = existing?.fileSize ?? null;
    let mimeType = existing?.mimeType ?? null;
    let uri = existing?.uri ?? null;
    let sha256 = existing?.sha256 ?? null;

    // Real upload — the record is only written after the file persisted.
    if (form.documentSource === 'upload' && pendingFile) {
      setUploading(true);
      try {
        const path = `documents/${Date.now()}_${pendingFile.name}`;
        const { url, error: upErr } = await uploadFile('evidence', path, pendingFile);
        if (upErr) { toast.error(`Upload failed: ${upErr}`); return; }
        storagePath = path;
        fileSize = pendingFile.size;
        mimeType = pendingFile.type || null;
        uri = url;
        sha256 = await sha256Hex(pendingFile);
      } finally {
        setUploading(false);
      }
    }

    const record: DocumentRecord = {
      // id omitted on create — the DB uuid default assigns it.
      id: editId ?? undefined,
      title: form.title.trim(),
      docType: form.docType,
      version: form.version.trim() || null,
      status: form.status,
      description: form.description.trim() || null,
      owner: form.owner.trim() || null,
      category: form.category || null,
      frameworks: form.frameworks,
      expiryDate: form.expiryDate || null,
      externalLink: form.documentSource === 'link' ? (form.externalLink.trim() || null) : (existing?.externalLink ?? null),
      storagePath,
      fileSize,
      mimeType,
      uri,
      sha256,
      linkedEntityType: form.linkedEntityType === 'none' ? null : form.linkedEntityType,
      linkedEntityId: form.linkedEntityType === 'none' ? null : (form.linkedEntityId || null),
      linkedModelIds: form.linkedModelIds,
    };
    try {
      await save(record); // hook toasts success; throws on failure
      setFormOpen(false); setEditId(null); setForm({ ...EMPTY_FORM }); setPendingFile(null);
    } catch { /* hook surfaces the error toast; sheet stays open */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return false;
    await remove(deleteTarget.id); // throws on failure — ConfirmDialog stays open
    if (selectedId === deleteTarget.id) closeSheet(false);
    setDeleteTarget(null);
  };

  const handleExport = () => {
    if (!filtered.length) { toast.error('No documents to export'); return; }
    exportCsv(
      filtered.map(d => ({
        title: d.title,
        type: d.docType ?? '',
        version: d.version ?? '',
        owner: d.owner ?? '',
        status: label(d.status),
        category: d.category ?? '',
        frameworks: (d.frameworks ?? []).join('; '),
        expiry_date: d.expiryDate ?? '',
        external_link: d.externalLink ?? '',
        file: d.storagePath ?? '',
        created_at: d.createdAt ?? '',
      })),
      `documents-${new Date().toISOString().split('T')[0]}.csv`,
    );
  };

  const toggleFramework = (fw: string) =>
    setForm(f => ({
      ...f,
      frameworks: f.frameworks.includes(fw) ? f.frameworks.filter(x => x !== fw) : [...f.frameworks, fw],
    }));
  const toggleModel = (id: string) =>
    setForm(f => ({
      ...f,
      linkedModelIds: f.linkedModelIds.includes(id) ? f.linkedModelIds.filter(x => x !== id) : [...f.linkedModelIds, id],
    }));

  const openDetail = (doc: DocumentRecord) => { setSelectedId(doc.id ?? null); setSheetOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Management"
        subtitle={`${orgName} · Policy library and document lifecycle management`}
        breadcrumbs={[{ label: 'Home', href: '/overview' }, { label: 'Documents' }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport} style={{ borderRadius: 0 }}><Export size={14} />Export CSV</Button>
            <Button size="sm" onClick={openCreate} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}><Plus size={14} />New Document</Button>
          </>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load documents</p>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{(error as Error).message}</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          ['Total Documents', totalDocuments, FileText, 'hsl(var(--text-1))'],
          ['Pending Review', pendingReview, Clock, 'hsl(var(--s-wn-tx))'],
          ['Expired / Past Expiry', expired, Warning, 'hsl(var(--destructive))'],
          ['Published This Quarter', publishedThisQ, CheckCircle, 'hsl(var(--s-ok-tx))'],
        ].map(([l, v, Icon, c]: any) => (
          <Card key={l} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{l}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: c }}>{v}</p>
              </div>
              <Icon size={28} weight="duotone" style={{ color: c, opacity: 0.7 }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" style={{ borderRadius: 0 }} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 h-8 text-xs" style={{ borderRadius: 0 }}><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{label(t)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-8 text-xs" style={{ borderRadius: 0 }}><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} of {docs.length} documents</span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-4))' }}>
              <FileText size={40} /><p className="mt-3 text-sm">Loading documents…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-4))' }}>
              <FileText size={40} />
              <p className="mt-3 text-sm font-medium">
                {docs.length === 0 ? 'No documents yet' : 'No documents match your filters'}
              </p>
              {docs.length === 0 && (
                <Button size="sm" className="mt-3" style={{ borderRadius: 0 }} onClick={openCreate}><Plus size={14} />Add the first document</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
              {['Title', 'Type', 'Version', 'Owner', 'Status', 'Category', 'Expiry', 'Frameworks', ''].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>)}
            </tr></thead><tbody>
              {filtered.map(doc => {
                const ss = statusStyle(doc.status);
                const isExpired = doc.status === 'expired' || (doc.expiryDate && new Date(doc.expiryDate) < new Date());
                return (
                  <tr key={doc.id} className="cursor-pointer" style={{ borderBottom: '1px solid hsl(var(--border))', borderLeft: isExpired ? '4px solid hsl(var(--destructive))' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onClick={() => openDetail(doc)}>
                    <td className="px-3 py-2" style={{ maxWidth: 260 }}><span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{doc.title}</span></td>
                    <td className="px-3 py-2"><Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{label(doc.docType)}</Badge></td>
                    <td className="px-3 py-2"><span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{doc.version ?? '—'}</span></td>
                    <td className="px-3 py-2"><span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{doc.owner ?? '—'}</span></td>
                    <td className="px-3 py-2"><Badge style={{ background: ss.bg, color: ss.color, borderRadius: 0, fontSize: 11 }}>{label(doc.status)}</Badge></td>
                    <td className="px-3 py-2"><span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{doc.category ?? '—'}</span></td>
                    <td className="px-3 py-2"><span className="text-xs" style={{ color: isExpired ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))', fontWeight: isExpired ? 600 : 400 }}>{fmt(doc.expiryDate)}</span></td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{(doc.frameworks ?? []).map(fw => <Badge key={fw} variant="outline" style={{ borderRadius: 0, fontSize: 10, color: 'hsl(var(--text-3))', borderColor: 'hsl(var(--border))' }}>{fw}</Badge>)}</div></td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(doc)} className="p-1 hover:bg-raised" title="Edit"><PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} /></button>
                        <button onClick={() => setDeleteTarget(doc)} className="p-1 hover:bg-[hsl(var(--s-er-bg))]" title="Delete"><Trash size={14} style={{ color: 'hsl(var(--s-er-tx))' }} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody></table></div>
          )}
        </CardContent>
      </Card>

      {/* ── Add/Edit Sheet ── */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-[620px] sm:max-w-[620px] overflow-y-auto p-0" style={{ borderRadius: 0 }}>
          <div className="sticky top-0 z-10 px-6 py-4 border-b" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
            <SheetTitle className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>{editId ? 'Edit Document' : 'Add New Document'}</SheetTitle>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Fill in the details below to {editId ? 'update the' : 'add a new'} document.</p>
          </div>
          <div className="space-y-5 px-6 py-4">
            <FormField label="Title" required>
              <Input value={form.title} onChange={e => setF('title')(e.target.value)} placeholder="e.g. Data Privacy Policy" className="h-9 text-sm" style={{ borderRadius: 0 }} />
            </FormField>
            <FormField label="Description">
              <textarea value={form.description} onChange={e => setF('description')(e.target.value)} placeholder="Describe the document scope and objectives…" rows={3} className="w-full px-3 py-2 text-sm border resize-none" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type">
                <Select value={form.docType} onValueChange={setF('docType')}>
                  <SelectTrigger className="h-9 text-sm" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{label(t)}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={form.status} onValueChange={setF('status')}>
                  <SelectTrigger className="h-9 text-sm" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{STATUSES.map(s => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Owner" hint="Free text — name, role, or team.">
                <Input value={form.owner} onChange={e => setF('owner')(e.target.value)} placeholder="e.g. Head of AI Governance" className="h-9 text-sm" style={{ borderRadius: 0 }} />
              </FormField>
              <FormField label="Version">
                <Input value={form.version} onChange={e => setF('version')(e.target.value)} placeholder="1.0" className="h-9 text-sm" style={{ borderRadius: 0 }} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category">
                <Select value={form.category || undefined} onValueChange={setF('category')}>
                  <SelectTrigger className="h-9 text-sm" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Expiry Date">
                <Input type="date" value={form.expiryDate} onChange={e => setF('expiryDate')(e.target.value)} className="h-9 text-sm" style={{ borderRadius: 0 }} />
              </FormField>
            </div>
            <FormField label="Linked Frameworks" hint="Link to compliance frameworks for audit traceability.">
              <div className="flex flex-wrap gap-1.5">
                {FRAMEWORKS_LIST.map(fw => (
                  <button key={fw} onClick={() => toggleFramework(fw)} className="px-2 py-1 text-[11px] border transition-colors" style={{ borderRadius: 0, background: form.frameworks.includes(fw) ? 'hsl(var(--brand))' : 'transparent', color: form.frameworks.includes(fw) ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-2))', borderColor: form.frameworks.includes(fw) ? 'hsl(var(--brand))' : 'hsl(var(--border))' }}>{fw}</button>
                ))}
              </div>
            </FormField>

            {/* Interlinks — real governed entities, ids only */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>Linked Records</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Linked Entity Type">
                  <Select value={form.linkedEntityType} onValueChange={v => setForm(f => ({ ...f, linkedEntityType: v, linkedEntityId: '' }))}>
                    <SelectTrigger className="h-9 text-sm" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="model">Model</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                {form.linkedEntityType === 'model' && (
                  <FormField label="Model">
                    <Select value={form.linkedEntityId || undefined} onValueChange={setF('linkedEntityId')}>
                      <SelectTrigger className="h-9 text-sm" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a model" /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        {models.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
                {form.linkedEntityType === 'policy' && (
                  <FormField label="Policy">
                    <Select value={form.linkedEntityId || undefined} onValueChange={setF('linkedEntityId')}>
                      <SelectTrigger className="h-9 text-sm" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a policy" /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        {policies.filter(p => p.id).map(p => <SelectItem key={p.id} value={p.id!}>{p.policyRef ? `${p.policyRef} · ${p.title}` : p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              </div>
              <FormField label="Linked Models" hint="Models this document evidences or governs.">
                {models.length === 0 ? (
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models in the inventory yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {models.map((m: any) => (
                      <button key={m.id} onClick={() => toggleModel(m.id)} className="px-2 py-1 text-[11px] border transition-colors" style={{ borderRadius: 0, background: form.linkedModelIds.includes(m.id) ? 'hsl(var(--brand))' : 'transparent', color: form.linkedModelIds.includes(m.id) ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-2))', borderColor: form.linkedModelIds.includes(m.id) ? 'hsl(var(--brand))' : 'hsl(var(--border))' }}>{m.name}</button>
                    ))}
                  </div>
                )}
              </FormField>
            </div>

            {/* Document source — real upload or external link */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>Document Source</h3>
              <div className="flex gap-2">
                {([['none', 'Metadata Only'], ['upload', 'Upload File'], ['link', 'External Link']] as const).map(([val, l]) => (
                  <button key={val} onClick={() => setF('documentSource')(val)} className="flex-1 px-3 py-2.5 text-xs font-medium border transition-colors text-center" style={{ borderRadius: 0, background: form.documentSource === val ? 'hsl(var(--brand))' : 'transparent', color: form.documentSource === val ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-2))', borderColor: form.documentSource === val ? 'hsl(var(--brand))' : 'hsl(var(--border))' }}>{l}</button>
                ))}
              </div>
              {form.documentSource === 'upload' && (
                <div className="border-2 border-dashed p-6 text-center" style={{ borderColor: 'hsl(var(--border))', borderRadius: 0 }}>
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt,.md"
                    onChange={e => setPendingFile(e.target.files?.[0] ?? null)} />
                  {pendingFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                      <FileText size={14} /> {pendingFile.name} · {formatBytes(pendingFile.size)}
                      <button onClick={() => setPendingFile(null)} className="p-0.5" title="Remove file"><X size={12} /></button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        {editId && form.documentSource === 'upload' && docs.find(d => d.id === editId)?.storagePath
                          ? 'A file is already attached — choosing a new one replaces it on save.'
                          : 'Choose a file to upload to the evidence store.'}
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" style={{ borderRadius: 0 }} onClick={() => fileInputRef.current?.click()}>
                        <UploadSimple size={13} /> Browse Files
                      </Button>
                    </>
                  )}
                </div>
              )}
              {form.documentSource === 'link' && (
                <FormField label="External Link">
                  <Input value={form.externalLink} onChange={e => setF('externalLink')(e.target.value)} placeholder="https://…" className="h-9 text-sm" style={{ borderRadius: 0 }} />
                </FormField>
              )}
            </div>
          </div>
          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 border-t flex justify-end gap-2" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || uploading} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {uploading ? 'Uploading…' : isSaving ? 'Saving…' : editId ? 'Update Document' : 'Create Document'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Detail Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="w-[580px] sm:max-w-[580px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedDoc && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{label(selectedDoc.docType)}</Badge>
                  <Badge style={{ background: statusStyle(selectedDoc.status).bg, color: statusStyle(selectedDoc.status).color, borderRadius: 0, fontSize: 11 }}>{label(selectedDoc.status)}</Badge>
                  {selectedDoc.version && <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{selectedDoc.version}</span>}
                </div>
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedDoc.title}</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-2 mt-3">
                <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => { setSheetOpen(false); openEdit(selectedDoc); }}><PencilSimple size={12} />Edit</Button>
                <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => setDeleteTarget(selectedDoc)}><Trash size={12} />Delete</Button>
              </div>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="w-full" style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="links" style={{ borderRadius: 0 }}>Linked Records</TabsTrigger>
                  <TabsTrigger value="versions" style={{ borderRadius: 0 }}>Versions</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Owner', selectedDoc.owner ?? '—'],
                      ['Category', selectedDoc.category ?? '—'],
                      ['Created', fmt(selectedDoc.createdAt)],
                      ['Expiry Date', fmt(selectedDoc.expiryDate)],
                      ['File Size', formatBytes(selectedDoc.fileSize)],
                      ['MIME Type', selectedDoc.mimeType ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k}><p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>{k}</p><span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{v}</span></div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Frameworks</p>
                    {(selectedDoc.frameworks ?? []).length === 0 ? (
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>No frameworks linked.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">{(selectedDoc.frameworks ?? []).map(fw => <Badge key={fw} variant="outline" style={{ borderRadius: 0, fontSize: 11, color: 'hsl(var(--brand))', borderColor: 'hsl(var(--brand))' }}>{fw}</Badge>)}</div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedDoc.description || '—'}</p>
                  </div>
                  {selectedDoc.externalLink && (
                    <div className="p-2 border flex items-center gap-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                      <ArrowSquareOut size={14} style={{ color: 'hsl(var(--brand))' }} />
                      <a href={selectedDoc.externalLink} target="_blank" rel="noreferrer" className="text-xs underline break-all" style={{ color: 'hsl(var(--brand))' }}>
                        {selectedDoc.externalLink}
                      </a>
                    </div>
                  )}
                  {(selectedDoc.uri || selectedDoc.storagePath) && (
                    <div className="p-2 border flex items-center gap-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                      <FileText size={14} style={{ color: 'hsl(var(--brand))' }} />
                      {selectedDoc.uri ? (
                        <a href={selectedDoc.uri} target="_blank" rel="noreferrer" className="text-xs underline break-all" style={{ color: 'hsl(var(--brand))' }}>
                          {selectedDoc.storagePath ?? selectedDoc.uri}
                        </a>
                      ) : (
                        <span className="text-xs break-all" style={{ color: 'hsl(var(--text-2))' }}>{selectedDoc.storagePath}</span>
                      )}
                    </div>
                  )}
                  {selectedDoc.sha256 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>SHA-256</p>
                      <p className="text-[10px] font-mono break-all mt-1" style={{ color: 'hsl(var(--text-3))' }}>{selectedDoc.sha256}</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="links" className="mt-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Linked Entity</p>
                    {linkedEntityChip(selectedDoc) ?? (
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No governed entity linked to this document yet.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Linked Models</p>
                    {(selectedDoc.linkedModelIds ?? []).length === 0 ? (
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models linked to this document yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedDoc.linkedModelIds ?? []).map(id => (
                          <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="versions" className="mt-4">
                  <p className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                    No version history yet — document versioning has not been enabled for this library.
                  </p>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation — stays open until the delete resolves */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title={`Delete "${deleteTarget?.title ?? ''}"?`}
        message="This document record will be permanently removed."
        confirmLabel="Delete"
      />
    </div>
  );
}
