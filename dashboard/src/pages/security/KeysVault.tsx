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
  Key, MagnifyingGlass, Plus, Eye, EyeSlash, PencilSimple, Trash,
  ArrowsClockwise, X, Lock, ShieldCheck, Warning, CheckCircle,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  keyPrefix: string;
  maskedKey: string;
  status: 'active' | 'rotated' | 'revoked' | 'expired';
  scopes: string[];
  owner: string;
  createdAt: string;
  lastUsed: string;
  expiresAt: string;
  usageCount: number;
  description: string;
}

const MOCK_KEYS: ApiKey[] = [
  { id: 'KEY-001', name: 'OpenAI Production', provider: 'OpenAI', keyPrefix: 'sk-prod', maskedKey: 'sk-prod-••••••••••••••••••••••••••••••••••••••••••••••••', status: 'active', scopes: ['gpt-4', 'gpt-3.5', 'embeddings'], owner: 'Maria Santos', createdAt: '2026-01-10', lastUsed: '2026-04-05', expiresAt: '2027-01-10', usageCount: 45200, description: 'Primary OpenAI API key for production LLM inference.' },
  { id: 'KEY-002', name: 'Anthropic Claude Key', provider: 'Anthropic', keyPrefix: 'sk-ant', maskedKey: 'sk-ant-••••••••••••••••••••••••••••••••••••••••••••••••', status: 'active', scopes: ['claude-3-opus', 'claude-3-sonnet'], owner: 'Maria Santos', createdAt: '2026-02-01', lastUsed: '2026-04-04', expiresAt: '2027-02-01', usageCount: 12800, description: 'Anthropic API key for Claude model family.' },
  { id: 'KEY-003', name: 'AWS Bedrock Access Key', provider: 'AWS', keyPrefix: 'AKIA', maskedKey: 'AKIA••••••••••••••••', status: 'active', scopes: ['bedrock:InvokeModel', 's3:GetObject'], owner: 'David Kim', createdAt: '2026-01-15', lastUsed: '2026-04-03', expiresAt: '2026-07-15', usageCount: 8900, description: 'AWS IAM access key for Bedrock model inference and S3 data access.' },
  { id: 'KEY-004', name: 'Pinecone Vector DB Key', provider: 'Pinecone', keyPrefix: 'pc-', maskedKey: 'pc-••••••••••••••••••••••••••••••••••', status: 'active', scopes: ['index:read', 'index:write', 'namespace:manage'], owner: 'Maria Santos', createdAt: '2026-02-20', lastUsed: '2026-04-05', expiresAt: '2027-02-20', usageCount: 23400, description: 'Pinecone API key for vector similarity search and retrieval.' },
  { id: 'KEY-005', name: 'HuggingFace Token', provider: 'HuggingFace', keyPrefix: 'hf_', maskedKey: 'hf_••••••••••••••••••••••••••••••••••', status: 'rotated', scopes: ['read', 'write', 'inference'], owner: 'Maria Santos', createdAt: '2026-01-05', lastUsed: '2026-03-20', expiresAt: '2027-01-05', usageCount: 3400, description: 'HuggingFace access token for model downloads and inference API.' },
  { id: 'KEY-006', name: 'LangSmith Tracing Key', provider: 'LangChain', keyPrefix: 'ls__', maskedKey: 'ls__••••••••••••••••••••••••••••••••••••••', status: 'active', scopes: ['traces:write', 'runs:read'], owner: 'David Kim', createdAt: '2026-03-01', lastUsed: '2026-04-05', expiresAt: '2027-03-01', usageCount: 88100, description: 'LangSmith API key for LLM run tracing and observability.' },
  { id: 'KEY-007', name: 'Azure OpenAI Key', provider: 'Azure', keyPrefix: 'az-', maskedKey: 'az-••••••••••••••••••••••••••••••••', status: 'expired', scopes: ['gpt-4-turbo', 'embeddings'], owner: 'James Patel', createdAt: '2025-10-01', lastUsed: '2026-03-28', expiresAt: '2026-03-31', usageCount: 6700, description: 'Azure OpenAI Service key for EU-region inference (expired).' },
  { id: 'KEY-008', name: 'Cohere API Key', provider: 'Cohere', keyPrefix: 'co-', maskedKey: 'co-••••••••••••••••••••••••••••••••••••', status: 'revoked', scopes: ['generate', 'embed', 'classify'], owner: 'Maria Santos', createdAt: '2026-01-20', lastUsed: '2026-02-15', expiresAt: '2027-01-20', usageCount: 1200, description: 'Cohere API key (revoked following vendor security advisory).' },
];

function statusStyle(status: string) {
  switch (status) {
    case 'active': return { bg: '#10b98120', text: '#10b981', border: '#10b98140' };
    case 'rotated': return { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f640' };
    case 'expired': return { bg: '#eab30820', text: '#eab308', border: '#eab30840' };
    case 'revoked': return { bg: '#ef444420', text: '#ef4444', border: '#ef444440' };
    default: return { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
  }
}

function statusIcon(status: string) {
  if (status === 'active') return <CheckCircle size={14} style={{ color: '#10b981' }} />;
  if (status === 'rotated') return <ArrowsClockwise size={14} style={{ color: '#3b82f6' }} />;
  if (status === 'expired') return <Warning size={14} style={{ color: '#eab308' }} />;
  return <X size={14} style={{ color: '#ef4444' }} />;
}

const EMPTY_KEY: Omit<ApiKey, 'id'> = {
  name: '', provider: 'OpenAI', keyPrefix: 'sk-', maskedKey: '',
  status: 'active', scopes: [], owner: '', createdAt: new Date().toISOString().split('T')[0],
  lastUsed: '', expiresAt: '', usageCount: 0, description: '',
};

export default function KeysVault() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const [viewItem, setViewItem] = useState<ApiKey | null>(null);
  const [editItem, setEditItem] = useState<ApiKey | null>(null);
  const [deleteItem, setDeleteItem] = useState<ApiKey | null>(null);
  const [revokeItem, setRevokeItem] = useState<ApiKey | null>(null);
  const [rotateItem, setRotateItem] = useState<ApiKey | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<ApiKey, 'id'>>(EMPTY_KEY);

  const filtered = keys.filter(k => {
    const q = search.toLowerCase();
    const matchSearch = !q || k.name.toLowerCase().includes(q) || k.provider.toLowerCase().includes(q) || k.owner.toLowerCase().includes(q);
    const matchStat = filterStatus === 'all' || k.status === filterStatus;
    const matchProv = filterProvider === 'all' || k.provider === filterProvider;
    return matchSearch && matchStat && matchProv;
  });

  const usageData = keys.filter(k => k.status === 'active').map(k => ({ name: k.provider, usage: k.usageCount }));
  const providers = Array.from(new Set(keys.map(k => k.provider)));

  const stats = [
    { label: 'Total Keys', value: keys.length, icon: Key },
    { label: 'Active', value: keys.filter(k => k.status === 'active').length, icon: ShieldCheck },
    { label: 'Expired / Revoked', value: keys.filter(k => k.status === 'expired' || k.status === 'revoked').length, icon: Warning },
    { label: 'Total API Calls', value: keys.reduce((s, k) => s + k.usageCount, 0).toLocaleString(), icon: Lock },
  ];

  function toggleReveal(id: string) {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleCreate() {
    const id = `KEY-${String(keys.length + 1).padStart(3, '0')}`;
    const masked = `${formData.keyPrefix}${'•'.repeat(40)}`;
    setKeys(prev => [...prev, { ...formData, id, maskedKey: masked }]);
    setCreateOpen(false);
    setFormData(EMPTY_KEY);
  }

  function handleEdit() {
    if (!editItem) return;
    setKeys(prev => prev.map(k => k.id === editItem.id ? editItem : k));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setKeys(prev => prev.filter(k => k.id !== deleteItem.id));
    setDeleteItem(null);
  }

  function handleRevoke() {
    if (!revokeItem) return;
    setKeys(prev => prev.map(k => k.id === revokeItem.id ? { ...k, status: 'revoked' } : k));
    setRevokeItem(null);
  }

  function handleRotate() {
    if (!rotateItem) return;
    const newPrefix = rotateItem.keyPrefix;
    const newMasked = `${newPrefix}${'•'.repeat(40)} (rotated)`;
    setKeys(prev => prev.map(k => k.id === rotateItem.id ? { ...k, status: 'rotated', maskedKey: newMasked, lastUsed: new Date().toISOString().split('T')[0] } : k));
    setRotateItem(null);
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Keys Vault</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · API key management, rotation & access control
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setFormData(EMPTY_KEY); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> Add Key
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

      {/* Usage Chart */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>API Usage by Provider (Active Keys)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
              <YAxis tick={{ fontSize: 11, fill: ct.axis }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              <Bar dataKey="usage" fill={ct.brand} radius={0} name="API Calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search keys..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Statuses</option>
          {['active', 'rotated', 'expired', 'revoked'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Providers</option>
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {keys.length} keys</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Key size={40} />
              <p className="mt-3 text-sm font-medium">No keys match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['Name', 'Provider', 'Masked Key', 'Status', 'Scopes', 'Owner', 'Last Used', 'Expires', 'Actions'].map(h => (
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
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{k.id}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{k.provider}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <code className="text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>
                          {revealedKeys.has(k.id) ? k.maskedKey : `${k.keyPrefix}${'•'.repeat(16)}`}
                        </code>
                        <button onClick={() => toggleReveal(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          {revealedKeys.has(k.id)
                            ? <EyeSlash size={13} style={{ color: 'hsl(var(--text-3))' }} />
                            : <Eye size={13} style={{ color: 'hsl(var(--text-3))' }} />}
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
                        {k.scopes.slice(0, 2).map(s => (
                          <Badge key={s} variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{s}</Badge>
                        ))}
                        {k.scopes.length > 2 && <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>+{k.scopes.length - 2}</span>}
                      </div>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{k.owner}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(k.lastUsed)}</td>
                    <td className="p-3 text-xs" style={{ color: new Date(k.expiresAt) < new Date() ? '#ef4444' : 'hsl(var(--text-3))' }}>
                      {formatDate(k.expiresAt)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(k)}><Eye size={14} /></Button>
                        {k.status === 'active' && (
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#3b82f6' }} onClick={() => setRotateItem(k)}>
                            <ArrowsClockwise size={14} />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...k })}><PencilSimple size={14} /></Button>
                        {k.status === 'active' && (
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#f97316' }} onClick={() => setRevokeItem(k)}>
                            <X size={14} />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(k)}><Trash size={14} /></Button>
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
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.provider}</Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="usage" style={{ borderRadius: 0 }}>Usage</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Key ID', value: viewItem.id },
                    { label: 'Owner', value: viewItem.owner },
                    { label: 'Created', value: formatDate(viewItem.createdAt) },
                    { label: 'Last Used', value: formatDate(viewItem.lastUsed) },
                    { label: 'Expires', value: formatDate(viewItem.expiresAt) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Scopes</p>
                    <div className="flex flex-wrap gap-1">
                      {viewItem.scopes.map(s => <Badge key={s} variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{s}</Badge>)}
                    </div>
                  </div>
                  <div className="p-3 mt-2" style={{ background: 'hsl(var(--bg-muted))' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Masked Key</p>
                    <code className="text-xs" style={{ color: 'hsl(var(--text-2))', wordBreak: 'break-all' }}>{viewItem.maskedKey}</code>
                  </div>
                </TabsContent>
                <TabsContent value="usage" className="mt-4">
                  <div className="text-center py-6">
                    <p className="text-4xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.usageCount.toLocaleString()}</p>
                    <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>Total API Calls</p>
                  </div>
                  <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                {viewItem.status === 'active' && (
                  <Button size="sm" onClick={() => { setRotateItem(viewItem); setViewItem(null); }}>
                    <ArrowsClockwise size={14} className="mr-1" /> Rotate
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit API Key</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[{ label: 'Name', key: 'name' }, { label: 'Owner', key: 'owner' }, { label: 'Description', key: 'description' }, { label: 'Expires At', key: 'expiresAt', type: 'date' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input type={f.type || 'text'} value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['active', 'rotated', 'expired', 'revoked'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add API Key</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Name', key: 'name' }, { label: 'Key Prefix (e.g. sk-)', key: 'keyPrefix' }, { label: 'Owner', key: 'owner' }, { label: 'Description', key: 'description' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Provider</label>
                <select value={formData.provider} onChange={e => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['OpenAI', 'Anthropic', 'AWS', 'Azure', 'GCP', 'Pinecone', 'HuggingFace', 'LangChain', 'Cohere', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Expires At</label>
                <Input type="date" value={formData.expiresAt} onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Add Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Confirm */}
      <AlertDialog open={!!rotateItem} onOpenChange={o => !o && setRotateItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Rotate Key</AlertDialogTitle>
            <AlertDialogDescription>
              Rotate <strong>{rotateItem?.name}</strong>? The old key will be invalidated and a new one will be generated. Update all dependent services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotate} style={{ background: '#3b82f6', borderRadius: 0 }}>Rotate Key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Confirm */}
      <AlertDialog open={!!revokeItem} onOpenChange={o => !o && setRevokeItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Revoke Key</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke <strong>{revokeItem?.name}</strong>? This will immediately block all requests using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} style={{ background: '#f97316', borderRadius: 0 }}>Revoke Key</AlertDialogAction>
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
            <AlertDialogAction onClick={handleDelete} style={{ background: '#ef4444', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
