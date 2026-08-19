import { useState } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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
  Key, MagnifyingGlass, Plus, Eye, PencilSimple, Trash, Copy,
  ArrowsClockwise, X, Lock, ShieldCheck, Warning, CheckCircle,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../../data/seed';
import { useOrgName } from '../../hooks/useOrganization';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useKeys } from '../../hooks/useSecurityGroup';
import type { KeyRecord } from '../../services/securityGroupService';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';

const PROVIDERS = ['OpenAI', 'Anthropic', 'AWS', 'Azure', 'GCP', 'Pinecone', 'HuggingFace', 'LangChain', 'Cohere', 'Other'];
const STATUSES = ['active', 'rotated', 'expired', 'revoked'];

function statusStyle(status?: string) {
  switch (status) {
    case 'active': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'rotated': return { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' };
    case 'expired': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
    case 'revoked': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  }
}

function statusIcon(status?: string) {
  if (status === 'active') return <CheckCircle size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />;
  if (status === 'rotated') return <ArrowsClockwise size={14} style={{ color: 'hsl(var(--s-in-tx))' }} />;
  if (status === 'expired') return <Warning size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />;
  return <X size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />;
}

function safeDate(v?: string) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : formatDate(v);
}
function isExpired(v?: string) {
  if (!v) return false;
  const d = new Date(v);
  return !isNaN(d.getTime()) && d < new Date();
}

type CreateForm = {
  name: string; provider: string; keyPrefix: string; owner: string;
  scopesText: string; expiresAt: string; secret: string; linkedAgentId: string;
};
const EMPTY_CREATE: CreateForm = {
  name: '', provider: 'OpenAI', keyPrefix: 'sk-', owner: '',
  scopesText: '', expiresAt: '', secret: '', linkedAgentId: '',
};

export default function KeysVault() {
  const orgName = useOrgName();
  const ct = useChartTheme();

  const { items: keys, isLoading, error, save, rotate, revoke, remove, isSaving } = useKeys();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');

  const [viewItem, setViewItem] = useState<KeyRecord | null>(null);
  const [editItem, setEditItem] = useState<KeyRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<KeyRecord | null>(null);
  const [revokeItem, setRevokeItem] = useState<KeyRecord | null>(null);
  const [rotateItem, setRotateItem] = useState<KeyRecord | null>(null);
  const [rotateSecret, setRotateSecret] = useState('');
  const [rotatePrefix, setRotatePrefix] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<CreateForm>(EMPTY_CREATE);

  if (isLoading) return <PageSkeleton title="Keys Vault" showStats rows={6} />;

  const filtered = keys.filter(k => {
    const q = search.toLowerCase();
    const matchSearch = !q || (k.name ?? '').toLowerCase().includes(q) || (k.provider ?? '').toLowerCase().includes(q) || (k.owner ?? '').toLowerCase().includes(q);
    const matchStat = filterStatus === 'all' || k.status === filterStatus;
    const matchProv = filterProvider === 'all' || k.provider === filterProvider;
    return matchSearch && matchStat && matchProv;
  });

  // Aggregate usage per provider (sum) so duplicate providers don't produce
  // duplicate x-axis categories.
  const usageData = Array.from(
    keys.filter(k => k.status === 'active').reduce((acc, k) => {
      const key = k.provider || '—';
      acc.set(key, (acc.get(key) || 0) + (k.usageCount ?? 0));
      return acc;
    }, new Map<string, number>())
  ).map(([name, usage]) => ({ name, usage }));
  const providers = Array.from(new Set(keys.map(k => k.provider).filter(Boolean))) as string[];

  const stats = [
    { label: 'Total Keys', value: keys.length, icon: Key },
    { label: 'Active', value: keys.filter(k => k.status === 'active').length, icon: ShieldCheck },
    { label: 'Expired / Revoked', value: keys.filter(k => k.status === 'expired' || k.status === 'revoked').length, icon: Warning },
    { label: 'Total API Calls', value: keys.reduce((s, k) => s + (k.usageCount ?? 0), 0).toLocaleString(), icon: Lock },
  ];

  function copyPrefix(prefix?: string) {
    if (!prefix) return;
    navigator.clipboard?.writeText(prefix).then(
      () => toast.success('Key prefix copied'),
      () => toast.error('Copy failed'),
    );
  }

  async function handleCreate() {
    if (!formData.name.trim()) { toast.error('Key name is required'); return; }
    const scopes = formData.scopesText.split(',').map(s => s.trim()).filter(Boolean);
    try {
      await save({
        id: crypto.randomUUID(),
        name: formData.name,
        provider: formData.provider,
        keyPrefix: formData.keyPrefix,
        owner: formData.owner,
        scopes,
        status: 'active',
        expiresAt: formData.expiresAt || undefined,
        linkedAgentId: formData.linkedAgentId || undefined,
        secret: formData.secret || undefined,
      } as any);
      setCreateOpen(false);
      setFormData(EMPTY_CREATE);
    } catch { /* hook toasts error */ }
  }

  async function handleEdit() {
    if (!editItem) return;
    try {
      // The date input holds yyyy-MM-dd — convert back to an ISO timestamptz.
      const expiresAt = editItem.expiresAt
        ? new Date(`${editItem.expiresAt.slice(0, 10)}T00:00:00Z`).toISOString()
        : undefined;
      await save({ ...editItem, expiresAt });
      setEditItem(null);
    } catch { /* hook toasts error */ }
  }

  async function handleDelete() {
    if (!deleteItem?.id) return;
    try { await remove(deleteItem.id); setDeleteItem(null); } catch { /* hook toasts error */ }
  }

  async function handleRevoke() {
    if (!revokeItem?.id) return;
    try { await revoke(revokeItem.id); setRevokeItem(null); } catch { /* hook toasts error */ }
  }

  function openRotate(k: KeyRecord) {
    setRotateItem(k);
    setRotatePrefix(k.keyPrefix ?? '');
    setRotateSecret('');
  }

  async function handleRotate() {
    if (!rotateItem?.id) return;
    if (!rotateSecret.trim()) { toast.error('Enter the new secret to rotate'); return; }
    try {
      await rotate({ id: rotateItem.id, prefix: rotatePrefix || (rotateItem.keyPrefix ?? ''), secret: rotateSecret });
      setRotateItem(null);
      setRotateSecret('');
    } catch { /* hook toasts error */ }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Keys Vault"
        subtitle={`${orgName} · API key management, rotation & access control`}
        icon={Key}
        actions={
          <Button size="sm" onClick={() => { setFormData(EMPTY_CREATE); setCreateOpen(true); }}>
            <Plus size={14} /> Add Key
          </Button>
        }
      />

      {/* Query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load keys</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

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

      {/* Usage Chart */}
      {usageData.length > 0 && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>API Usage by Provider (Active Keys)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis tick={{ fontSize: 11, fill: ct.axis }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Bar dataKey="usage" fill={ct.brand} radius={0} name="API Calls" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search keys..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {keys.length} keys</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Key size={40} />
              <p className="mt-3 text-sm font-medium">
                {keys.length === 0 ? 'No keys registered yet. Add a key to start tracking.' : 'No keys match your filters'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['Name', 'Provider', 'Key Prefix', 'Status', 'Scopes', 'Owner', 'Last Used', 'Expires', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(k => (
                  <tr
                    key={k.id}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onClick={() => setViewItem(k)}
                  >
                    <td className="p-3">
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{k.name}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{k.provider || '—'}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <code className="text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>
                          {(k.keyPrefix ?? '')}{'••••'}
                        </code>
                        <button onClick={() => copyPrefix(k.keyPrefix)} title="Copy prefix" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <Copy size={13} style={{ color: 'hsl(var(--text-3))' }} />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(k.status)}
                        <Badge style={{ background: statusStyle(k.status).bg, color: statusStyle(k.status).text, border: `1px solid ${statusStyle(k.status).border}`, borderRadius: 0, fontSize: 11 }}>
                          {k.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(k.scopes ?? []).slice(0, 2).map(s => (
                          <Badge key={s} variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{s}</Badge>
                        ))}
                        {(k.scopes ?? []).length > 2 && <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>+{(k.scopes ?? []).length - 2}</span>}
                      </div>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{k.owner || '—'}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{safeDate(k.lastUsedAt)}</td>
                    <td className="p-3 text-xs" style={{ color: isExpired(k.expiresAt) ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))' }}>
                      {safeDate(k.expiresAt)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(k)}><Eye size={14} /></Button>
                        {k.status === 'active' && (
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-in-tx))' }} onClick={() => openRotate(k)}>
                            <ArrowsClockwise size={14} />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...k })}><PencilSimple size={14} /></Button>
                        {k.status === 'active' && (
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--r-hi-tx))' }} onClick={() => setRevokeItem(k)}>
                            <X size={14} />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(k)}><Trash size={14} /></Button>
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
                  <Badge style={{ background: statusStyle(viewItem.status).bg, color: statusStyle(viewItem.status).text, border: `1px solid ${statusStyle(viewItem.status).border}`, borderRadius: 0 }}>
                    {viewItem.status}
                  </Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.provider || '—'}</Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="usage" style={{ borderRadius: 0 }}>Usage</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Owner', value: viewItem.owner || '—' },
                    { label: 'Created', value: safeDate(viewItem.createdAt) },
                    { label: 'Last Used', value: safeDate(viewItem.lastUsedAt) },
                    { label: 'Expires', value: safeDate(viewItem.expiresAt) },
                    { label: 'Rotated', value: safeDate(viewItem.rotatedAt) },
                    { label: 'Revoked', value: safeDate(viewItem.revokedAt) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Scopes</p>
                    <div className="flex flex-wrap gap-1">
                      {(viewItem.scopes ?? []).length > 0
                        ? (viewItem.scopes ?? []).map(s => <Badge key={s} variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{s}</Badge>)
                        : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>None</span>}
                    </div>
                  </div>
                  <div className="p-3 mt-2 flex items-center justify-between" style={{ background: 'hsl(var(--bg-muted))' }}>
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Key Prefix</p>
                      <code className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{(viewItem.keyPrefix ?? '—')}{viewItem.keyPrefix ? '••••' : ''}</code>
                    </div>
                    {viewItem.keyPrefix && (
                      <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => copyPrefix(viewItem.keyPrefix)}>
                        <Copy size={13} /> Copy
                      </Button>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                    The secret is never stored or displayed — only a one-way hash and this prefix are retained.
                  </p>
                </TabsContent>
                <TabsContent value="usage" className="mt-4">
                  <div className="text-center py-6">
                    <p className="text-4xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{(viewItem.usageCount ?? 0).toLocaleString()}</p>
                    <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>Total API Calls</p>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                {viewItem.status === 'active' && (
                  <Button size="sm" onClick={() => { openRotate(viewItem); setViewItem(null); }}>
                    <ArrowsClockwise size={14} /> Rotate
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} /> Edit
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit API Key</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[{ label: 'Name', key: 'name' }, { label: 'Owner', key: 'owner' }, { label: 'Expires At', key: 'expiresAt', type: 'date' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input
                    type={f.type || 'text'}
                    // Date inputs need yyyy-MM-dd; expiresAt is stored as an ISO timestamptz.
                    value={f.type === 'date' ? ((editItem as any)[f.key] || '').slice(0, 10) : (editItem as any)[f.key] || ''}
                    onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                    style={{ borderRadius: 0 }}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Scopes (comma-separated)</label>
                <Input value={(editItem.scopes ?? []).join(', ')} onChange={e => setEditItem(prev => prev ? { ...prev, scopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : null)} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <Select value={editItem.status} onValueChange={v => setEditItem(prev => prev ? { ...prev, status: v } : null)}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving} style={{ borderRadius: 0 }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add API Key</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Name', key: 'name' }, { label: 'Key Prefix (e.g. sk-)', key: 'keyPrefix' }, { label: 'Owner', key: 'owner' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Secret (hashed on save, never stored in clear)</label>
              <Input type="password" value={formData.secret} onChange={e => setFormData(prev => ({ ...prev, secret: e.target.value }))} placeholder="Paste the raw secret to hash" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Scopes (comma-separated)</label>
              <Input value={formData.scopesText} onChange={e => setFormData(prev => ({ ...prev, scopesText: e.target.value }))} placeholder="e.g. gpt-4, embeddings" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Provider</label>
                <Select value={formData.provider} onValueChange={v => setFormData(prev => ({ ...prev, provider: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Expires At</label>
                <Input type="date" value={formData.expiresAt} onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name || isSaving}>Add Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Confirm */}
      <AlertDialog open={!!rotateItem} onOpenChange={o => !o && setRotateItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Rotate Key</AlertDialogTitle>
            <AlertDialogDescription>
              Rotate <strong>{rotateItem?.name}</strong>? A new key hash is stored and the previous hash is invalidated. Update all dependent services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>New Key Prefix</label>
              <Input value={rotatePrefix} onChange={e => setRotatePrefix(e.target.value)} style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>New Secret (hashed on save)</label>
              <Input type="password" value={rotateSecret} onChange={e => setRotateSecret(e.target.value)} placeholder="Paste the new raw secret" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotate} disabled={isSaving} style={{ background: 'hsl(var(--s-in-tx))', borderRadius: 0 }}>Rotate Key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Confirm */}
      <AlertDialog open={!!revokeItem} onOpenChange={o => !o && setRevokeItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Revoke Key</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke <strong>{revokeItem?.name}</strong>? The key is marked revoked and its hash is no longer accepted for authentication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} style={{ background: 'hsl(var(--r-hi-tx))', borderRadius: 0 }}>Revoke Key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Key Record</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete the record for <strong>{deleteItem?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
