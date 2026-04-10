import { useState, useMemo, useCallback, type ReactNode } from 'react';
import {
  ChatTeardropText, Plus, MagnifyingGlass, PencilSimple, Trash,
  Eye, ClockCounterClockwise, Tag, Robot, CheckCircle,
  Warning, Clock, Archive, Funnel, ArrowsClockwise,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  PROMPT_REGISTRY, type PromptRecord, type PromptStatus, type PromptCategory, formatDate,
} from '../data/seed';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

function statusConfig(s: PromptStatus) {
  const map: Record<PromptStatus, { label: string; bg: string; color: string; icon: ReactNode }> = {
    active:       { label: 'Active',       bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', icon: <CheckCircle size={11} weight="fill" /> },
    draft:        { label: 'Draft',        bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', icon: <Clock size={11} weight="fill" /> },
    deprecated:   { label: 'Deprecated',   bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', icon: <Archive size={11} weight="fill" /> },
    under_review: { label: 'Under Review', bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', icon: <Warning size={11} weight="fill" /> },
  };
  return map[s] ?? map.draft;
}

function categoryLabel(c: PromptCategory): string {
  const map: Record<PromptCategory, string> = {
    system: 'System', user: 'User', tool_call: 'Tool Call',
    safety: 'Safety', chain_of_thought: 'Chain of Thought',
  };
  return map[c] ?? c;
}

function bumpVersion(v: string): string {
  const clean = v.replace(/-rc\d+$/, '');
  const parts = clean.split('.').map(Number);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join('.');
}

function generateId(existing: PromptRecord[]): string {
  const nums = existing.map(p => parseInt(p.id.split('-')[1] ?? '0', 10)).filter(Boolean);
  const next = Math.max(0, ...nums) + 1;
  return `PR-${String(next).padStart(3, '0')}`;
}

// ── Toaster ───────────────────────────────────────────────────────────────────
function Toaster({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 border shadow-lg text-sm font-medium min-w-[280px]"
          style={{
            background: 'hsl(var(--bg-surface))',
            borderColor: t.type === 'error' ? 'hsl(var(--s-er-br))' : t.type === 'info' ? 'hsl(var(--s-in-br))' : 'hsl(var(--s-ok-br))',
            color: t.type === 'error' ? 'hsl(var(--s-er-tx))' : t.type === 'info' ? 'hsl(var(--s-in-tx))' : 'hsl(var(--s-ok-tx))',
          }}>
          <span className="flex-1">{t.text}</span>
          <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100"><Trash size={12} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsRow({ records }: { records: PromptRecord[] }) {
  const stats = [
    { label: 'Total',        value: records.length,                                                              color: 'hsl(var(--brand))' },
    { label: 'Active',       value: records.filter(r => r.status === 'active').length,                          color: 'hsl(var(--s-ok-tx))' },
    { label: 'Under Review', value: records.filter(r => r.status === 'under_review').length,                    color: 'hsl(var(--s-wn-tx))' },
    { label: 'Draft',        value: records.filter(r => r.status === 'draft').length,                           color: 'hsl(var(--s-nt-tx))' },
    { label: 'Deprecated',   value: records.filter(r => r.status === 'deprecated').length,                      color: 'hsl(var(--s-er-tx))' },
    { label: 'Avg Tokens',   value: Math.round(records.reduce((a, r) => a + r.tokenCount, 0) / Math.max(records.length, 1)), color: 'hsl(var(--text-2))' },
  ];
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {stats.map(s => (
        <Card key={s.label} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardContent className="p-3">
            <p className="text-xs text-[hsl(var(--text-4))] mb-1">{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Prompt Card ───────────────────────────────────────────────────────────────
function PromptCard({ record, onView, onEdit, onDelete }: {
  record: PromptRecord;
  onView: (r: PromptRecord) => void;
  onEdit: (r: PromptRecord) => void;
  onDelete: (r: PromptRecord) => void;
}) {
  const sc = statusConfig(record.status);
  return (
    <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] hover:border-[hsl(var(--brand))] transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-[hsl(var(--text-4))]">{record.id}</span>
              <Badge style={{ background: sc.bg, color: sc.color, borderRadius: 0, fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                {sc.icon}{sc.label}
              </Badge>
              <Badge style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>
                {categoryLabel(record.category)}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] truncate">{record.name}</h3>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => onView(record)}><Eye size={13} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => onEdit(record)}><PencilSimple size={13} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-[hsl(var(--destructive))]" title="Delete" onClick={() => onDelete(record)}><Trash size={13} /></Button>
          </div>
        </div>

        <p className="text-xs text-[hsl(var(--text-3))] line-clamp-2 mb-3">{record.description}</p>

        <pre className="text-xs font-mono bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] p-2 line-clamp-3 text-[hsl(var(--text-3))] mb-3 whitespace-pre-wrap leading-relaxed overflow-hidden">
          {record.content.slice(0, 180)}{record.content.length > 180 ? '…' : ''}
        </pre>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[10px] text-[hsl(var(--text-4))]">
            <span className="flex items-center gap-1"><Robot size={10} />{record.model}</span>
            <span className="flex items-center gap-1"><ClockCounterClockwise size={10} />v{record.currentVersion}</span>
            <span className="flex items-center gap-1"><Tag size={10} />{record.tokenCount} tok</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {record.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]">{t}</span>
            ))}
            {record.tags.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-4))]">+{record.tags.length - 3}</span>
            )}
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-[hsl(var(--border))] text-[10px] flex items-center gap-1">
          {record.approvedBy ? (
            <span className="flex items-center gap-1 text-[hsl(var(--s-ok-tx))]">
              <CheckCircle size={10} />Approved by {record.approvedBy} · {formatDate(record.approvalDate!)}
            </span>
          ) : record.status !== 'deprecated' ? (
            <span className="flex items-center gap-1 text-[hsl(var(--s-wn-tx))]">
              <Warning size={10} />Pending approval · modified {formatDate(record.lastModified)}
            </span>
          ) : (
            <span className="text-[hsl(var(--text-4))]">Deprecated · {formatDate(record.lastModified)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── View Sheet ────────────────────────────────────────────────────────────────
function ViewSheet({ record, open, onClose }: { record: PromptRecord | null; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'content' | 'versions' | 'meta'>('content');
  if (!record) return null;
  const sc = statusConfig(record.status);
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-[640px] max-w-full flex flex-col overflow-hidden p-0 bg-[hsl(var(--bg-surface))]">
        <SheetHeader className="px-6 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-[hsl(var(--text-4))]">{record.id}</span>
            <Badge style={{ background: sc.bg, color: sc.color, borderRadius: 0, fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>{sc.icon}{sc.label}</Badge>
            <Badge style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>v{record.currentVersion}</Badge>
          </div>
          <SheetTitle className="text-base font-bold text-[hsl(var(--text-1))]">{record.name}</SheetTitle>
          <p className="text-xs text-[hsl(var(--text-3))] mt-1">{record.description}</p>
        </SheetHeader>
        <div className="flex border-b border-[hsl(var(--border))] flex-shrink-0">
          {(['content', 'versions', 'meta'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2.5 text-xs font-medium capitalize transition-colors"
              style={{ color: tab === t ? 'hsl(var(--brand))' : 'hsl(var(--text-3))', borderBottom: tab === t ? '2px solid hsl(var(--brand))' : '2px solid transparent' }}>
              {t === 'versions' ? 'History' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'content' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider">Prompt Content</p>
                <span className="text-[10px] text-[hsl(var(--text-4))]">{record.tokenCount} tokens</span>
              </div>
              <pre className="text-xs font-mono bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] p-4 whitespace-pre-wrap leading-relaxed text-[hsl(var(--text-2))] overflow-x-auto mb-4">
                {record.content}
              </pre>
              <div className="flex flex-wrap gap-2">
                {record.tags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-1 bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]">{t}</span>
                ))}
              </div>
            </div>
          )}
          {tab === 'versions' && (
            <div className="space-y-3">
              {record.versions.map((v, i) => (
                <div key={v.version} className="border border-[hsl(var(--border))] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-[hsl(var(--brand))]">v{v.version}</span>
                      {i === 0 && <Badge style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 9 }}>CURRENT</Badge>}
                    </div>
                    <span className="text-[10px] text-[hsl(var(--text-4))]">{formatDate(v.changedAt)}</span>
                  </div>
                  <p className="text-[10px] text-[hsl(var(--text-3))] mb-1">by {v.author}</p>
                  <p className="text-xs text-[hsl(var(--text-2))]">{v.changeNote}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'meta' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Category',      value: categoryLabel(record.category) },
                  { label: 'Model',         value: record.model },
                  { label: 'Owner',         value: record.owner },
                  { label: 'Version',       value: `v${record.currentVersion}` },
                  { label: 'Created',       value: formatDate(record.createdDate) },
                  { label: 'Last Modified', value: formatDate(record.lastModified) },
                  { label: 'Approved By',   value: record.approvedBy ?? '— Pending' },
                  { label: 'Approval Date', value: record.approvalDate ? formatDate(record.approvalDate) : '— Pending' },
                ].map(m => (
                  <div key={m.label} className="border border-[hsl(var(--border))] p-3">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-sm font-medium text-[hsl(var(--text-1))]">{m.value}</p>
                  </div>
                ))}
              </div>
              {record.usedBy.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider mb-2">Used By</p>
                  <div className="flex flex-wrap gap-2">
                    {record.usedBy.map(u => (
                      <span key={u} className="text-xs px-2 py-1 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-2))] flex items-center gap-1">
                        <Robot size={10} />{u}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Edit / Create Sheet ───────────────────────────────────────────────────────
function EditSheet({ record, open, onClose, onSave }: {
  record: PromptRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<PromptRecord> & { changeNote: string }, isNew: boolean) => void;
}) {
  const isNew = record === null;
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PromptCategory>('system');
  const [status, setStatus] = useState<PromptStatus>('draft');
  const [model, setModel] = useState('GPT-4o');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [usedByInput, setUsedByInput] = useState('');
  const [changeNote, setChangeNote] = useState('');

  const reset = useCallback(() => {
    if (record) {
      setName(record.name); setCategory(record.category); setStatus(record.status);
      setModel(record.model); setOwner(record.owner); setDescription(record.description);
      setContent(record.content); setTagsInput(record.tags.join(', '));
      setUsedByInput(record.usedBy.join(', ')); setChangeNote('');
    } else {
      setName(''); setCategory('system'); setStatus('draft');
      setModel('GPT-4o'); setOwner(''); setDescription('');
      setContent(''); setTagsInput(''); setUsedByInput(''); setChangeNote('');
    }
  }, [record]);

  // Reset when sheet opens
  const handleOpenChange = (v: boolean) => {
    if (v) reset();
    else onClose();
  };

  const estTokens = Math.round(content.split(/\s+/).filter(Boolean).length * 1.3);
  const canSave = !!(name.trim() && content.trim() && owner.trim());

  const handleSave = () => {
    onSave({
      ...(record ?? {}),
      name, category, status, model, owner, description, content,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      usedBy: usedByInput.split(',').map(t => t.trim()).filter(Boolean),
      changeNote,
    }, isNew);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-[620px] max-w-full flex flex-col overflow-hidden p-0 bg-[hsl(var(--bg-surface))]">
        <SheetHeader className="px-6 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
          <SheetTitle className="text-base font-bold text-[hsl(var(--text-1))]">
            {isNew ? 'Register New Prompt' : `Edit — ${record?.name}`}
          </SheetTitle>
          {!isNew && (
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">
              Current: v{record?.currentVersion} → saving creates v{bumpVersion(record?.currentVersion ?? '1.0.0')}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Prompt Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. LoanDecision-System-v4" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Category</label>
              <Select value={category} onValueChange={v => setCategory(v as PromptCategory)}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['system','user','tool_call','safety','chain_of_thought'] as PromptCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Status</label>
              <Select value={status} onValueChange={v => setStatus(v as PromptStatus)}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['active','draft','under_review','deprecated'] as PromptStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{statusConfig(s).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['GPT-4o','GPT-4o-Mini','GPT-3.5-Turbo','Claude-3-Opus','Claude-3-Sonnet','Claude-3-Haiku','Mistral-7B-Instruct','Llama-3-70B','Internal'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Owner *</label>
              <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. Sarah Chen" className="text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Brief description of this prompt's purpose and compliance context"
              className="w-full text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] px-3 py-2 resize-none text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 flex items-center justify-between">
              <span>Prompt Content *</span>
              {content && <span className="text-[10px] text-[hsl(var(--text-4))] font-normal">~{estTokens} tokens est.</span>}
            </label>
            <textarea
              value={content} onChange={e => setContent(e.target.value)} rows={10}
              placeholder="Enter the full prompt content…"
              className="w-full text-xs font-mono border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] px-3 py-2 resize-y text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Tags (comma-separated)</label>
              <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="compliance, PII, safety" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Used By (comma-separated)</label>
              <Input value={usedByInput} onChange={e => setUsedByInput(e.target.value)} placeholder="MDL-001, ComplianceBot" className="text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">
              {isNew ? 'Initial Version Note' : 'Change Note (required for version bump)'}
            </label>
            <Input
              value={changeNote} onChange={e => setChangeNote(e.target.value)}
              placeholder="Describe what changed and why…"
              className="text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-between flex-shrink-0 bg-[hsl(var(--bg-raised))]">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={handleSave}
            style={{ background: canSave ? 'hsl(var(--brand))' : undefined, color: canSave ? 'white' : undefined }}>
            {isNew ? 'Register Prompt' : `Save → v${bumpVersion(record?.currentVersion ?? '1.0.0')}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PromptRegistry() {
  const [records, setRecords] = useState<PromptRecord[]>(PROMPT_REGISTRY);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PromptStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<PromptCategory | 'all'>('all');
  const [viewRecord, setViewRecord] = useState<PromptRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PromptRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromptRecord | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, text, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const filtered = useMemo(() => {
    let list = records;
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(r => r.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [records, search, filterStatus, filterCategory]);

  const openNew = () => { setEditRecord(null); setEditOpen(true); };
  const openEdit = (r: PromptRecord) => { setEditRecord(r); setEditOpen(true); };

  const handleSave = useCallback((data: Partial<PromptRecord> & { changeNote: string }, isNew: boolean) => {
    const now = new Date().toISOString();
    if (isNew) {
      const rec: PromptRecord = {
        id: generateId(records),
        name: data.name ?? 'Untitled',
        category: (data.category ?? 'system') as PromptCategory,
        status: (data.status ?? 'draft') as PromptStatus,
        model: data.model ?? 'GPT-4o',
        owner: data.owner ?? '',
        currentVersion: '1.0.0',
        description: data.description ?? '',
        content: data.content ?? '',
        tags: data.tags ?? [],
        usedBy: data.usedBy ?? [],
        tokenCount: Math.round((data.content ?? '').split(/\s+/).filter(Boolean).length * 1.3),
        lastModified: now, createdDate: now,
        approvedBy: null, approvalDate: null,
        versions: [{ version: '1.0.0', content: data.content ?? '', author: data.owner ?? '', changedAt: now, changeNote: data.changeNote || 'Initial version.' }],
      };
      setRecords(p => [rec, ...p]);
      toast(`Created "${rec.name}" (v1.0.0)`);
    } else {
      const existing = records.find(r => r.id === (data as PromptRecord).id);
      if (!existing) return;
      const newVer = bumpVersion(existing.currentVersion);
      const updated: PromptRecord = {
        ...existing,
        name: data.name ?? existing.name,
        category: (data.category ?? existing.category) as PromptCategory,
        status: (data.status ?? existing.status) as PromptStatus,
        model: data.model ?? existing.model,
        owner: data.owner ?? existing.owner,
        description: data.description ?? existing.description,
        content: data.content ?? existing.content,
        tags: data.tags ?? existing.tags,
        usedBy: data.usedBy ?? existing.usedBy,
        tokenCount: Math.round((data.content ?? existing.content).split(/\s+/).filter(Boolean).length * 1.3),
        currentVersion: newVer, lastModified: now,
        approvedBy: null, approvalDate: null,
        versions: [{ version: newVer, content: data.content ?? existing.content, author: data.owner ?? existing.owner, changedAt: now, changeNote: data.changeNote || 'Updated.' }, ...existing.versions],
      };
      setRecords(p => p.map(r => r.id === updated.id ? updated : r));
      toast(`Updated "${updated.name}" → v${newVer}`);
    }
    setEditOpen(false);
  }, [records, toast]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    setRecords(p => p.filter(r => r.id !== deleteTarget.id));
    toast(`Deleted "${deleteTarget.name}"`, 'info');
    setDeleteTarget(null);
  }, [deleteTarget, toast]);

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--bg-page))]">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[hsl(var(--brand-subtle))] flex items-center justify-center">
              <ChatTeardropText size={16} className="text-[hsl(var(--brand))]" weight="fill" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[hsl(var(--text-1))]">Prompt Registry</h1>
              <p className="text-xs text-[hsl(var(--text-4))]">
                Version-controlled governance for system prompts · {records.length} registered
              </p>
            </div>
          </div>
          <Button size="sm" onClick={openNew}
            style={{ background: 'hsl(var(--brand))', color: 'white' }}
            className="flex items-center gap-2">
            <Plus size={14} weight="bold" /> New Prompt
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <StatsRow records={records} />

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
            <Input
              placeholder="Search by name, content, owner, or tag…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 text-sm h-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as PromptStatus | 'all')}>
            <SelectTrigger className="w-40 text-sm h-9">
              <Funnel size={12} className="mr-1 text-[hsl(var(--text-4))]" /><SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(['active','under_review','draft','deprecated'] as PromptStatus[]).map(s => (
                <SelectItem key={s} value={s}>{statusConfig(s).label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={v => setFilterCategory(v as PromptCategory | 'all')}>
            <SelectTrigger className="w-44 text-sm h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(['system','user','tool_call','safety','chain_of_thought'] as PromptCategory[]).map(c => (
                <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-9 text-xs"
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterCategory('all'); }}>
            <ArrowsClockwise size={12} className="mr-1" />Reset
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ChatTeardropText size={40} className="text-[hsl(var(--text-4))] mb-3" />
            <p className="text-sm text-[hsl(var(--text-3))] mb-1">No prompts match your filters</p>
            <p className="text-xs text-[hsl(var(--text-4))]">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(r => (
              <PromptCard key={r.id} record={r} onView={setViewRecord} onEdit={openEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {/* Overlays */}
      <ViewSheet record={viewRecord} open={!!viewRecord} onClose={() => setViewRecord(null)} />
      <EditSheet record={editRecord} open={editOpen} onClose={() => setEditOpen(false)} onSave={handleSave} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Prompt?"
        message={`Permanently delete "${deleteTarget?.name}" (v${deleteTarget?.currentVersion}) and all version history? This cannot be undone.`}
        confirmLabel="Delete Permanently"
        type="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
      <Toaster toasts={toasts} remove={id => setToasts(p => p.filter(t => t.id !== id))} />
    </div>
  );
}
