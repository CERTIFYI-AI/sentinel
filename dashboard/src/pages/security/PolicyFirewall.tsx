import { useState } from 'react';
import { toast } from 'sonner';
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
  Funnel, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, ShieldCheck, ToggleLeft, ToggleRight, Lightning,
  Lock, Warning, Clock,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../../data/seed';
import { useOrgName } from '../../hooks/useOrganization';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useFirewall } from '../../hooks/useSecurityGroup';
import type { FirewallRecord } from '../../services/securityGroupService';
import { useModelsData } from '../../hooks/useModelsData';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';

// Canonical vocabulary (matches the policy_firewall_rules migration/seeds).
// Comparisons, writes and select values use these; display is prettified.
const RULE_TYPES = ['prompt_injection', 'pii', 'jailbreak', 'data_exfil', 'toxicity', 'custom'];
const RULE_TYPE_LABELS: Record<string, string> = {
  prompt_injection: 'Prompt injection', pii: 'PII', jailbreak: 'Jailbreak',
  data_exfil: 'Data exfiltration', toxicity: 'Toxicity', custom: 'Custom',
};
const ruleTypeLabel = (t?: string) => (t ? RULE_TYPE_LABELS[t] ?? t : '—');

const ACTIONS = ['block', 'redact', 'flag', 'require_approval'];
const ACTION_LABELS: Record<string, string> = {
  block: 'Block', redact: 'Redact', flag: 'Flag', require_approval: 'Require approval',
};
const actionLabel = (a?: string) => (a ? ACTION_LABELS[a] ?? a : '—');

function actionStyle(action: string) {
  switch (action) {
    case 'block': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
    case 'redact': return { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', border: 'hsl(var(--r-hi-br))' };
    case 'flag': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
    case 'require_approval': return { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-bg))' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  }
}

function typeIcon(type?: string) {
  if (type === 'pii' || type === 'data_exfil') return <Lock size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />;
  if (type === 'prompt_injection') return <ShieldCheck size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />;
  if (type === 'jailbreak') return <Lightning size={14} style={{ color: 'hsl(var(--r-hi-tx))' }} />;
  if (type === 'toxicity') return <Warning size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />;
  return <Clock size={14} style={{ color: 'hsl(var(--text-3))' }} />;
}

const EMPTY_RULE: FirewallRecord = {
  name: '', description: '', ruleType: 'custom', pattern: '', action: 'block',
  target: 'All Agents', enabled: true, priority: 10, evaluations: 0, blocked: 0,
  severity: 'medium', status: 'active', linkedModelIds: [],
};

export default function PolicyFirewall() {
  const orgName = useOrgName();
  const ct = useChartTheme();

  const { items: rules, isLoading, error, save, remove, isSaving } = useFirewall();
  const { models } = useModelsData();
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterEnabled, setFilterEnabled] = useState('all');

  const [viewItem, setViewItem] = useState<FirewallRecord | null>(null);
  const [editItem, setEditItem] = useState<FirewallRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<FirewallRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<FirewallRecord>(EMPTY_RULE);

  if (isLoading) return <PageSkeleton title="Policy Firewall" showStats rows={6} />;

  const filtered = rules.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || (r.name ?? '').toLowerCase().includes(q) || (r.ruleType ?? '').toLowerCase().includes(q) || (r.target ?? '').toLowerCase().includes(q);
    const matchType = filterType === 'all' || r.ruleType === filterType;
    const matchEnabled = filterEnabled === 'all' || (filterEnabled === 'enabled' ? r.enabled : !r.enabled);
    return matchSearch && matchType && matchEnabled;
  });

  const typeData = Array.from(
    rules.reduce((acc, r) => {
      const key = r.ruleType || 'uncategorized';
      acc.set(key, (acc.get(key) || 0) + (r.blocked ?? 0));
      return acc;
    }, new Map<string, number>())
  ).map(([key, blocked]) => ({ name: key === 'uncategorized' ? 'Uncategorized' : ruleTypeLabel(key), blocked }));

  const ruleTypes = Array.from(new Set(rules.map(r => r.ruleType).filter(Boolean))) as string[];

  const stats = [
    { label: 'Total Rules', value: rules.length, icon: Funnel },
    { label: 'Active Rules', value: rules.filter(r => r.enabled).length, icon: ShieldCheck },
    { label: 'Total Blocks', value: rules.reduce((s, r) => s + (r.blocked ?? 0), 0), icon: Lock },
    { label: 'Total Evaluations', value: rules.reduce((s, r) => s + (r.evaluations ?? 0), 0).toLocaleString(), icon: Lightning },
  ];

  async function toggleEnabled(rule: FirewallRecord) {
    try { await save({ ...rule, enabled: !rule.enabled }); } catch { /* hook toasts error */ }
  }

  async function handleCreate() {
    if (!formData.name.trim()) { toast.error('Rule name is required'); return; }
    try {
      await save({ ...formData, id: crypto.randomUUID() });
      setCreateOpen(false);
      setFormData(EMPTY_RULE);
    } catch { /* hook toasts error */ }
  }

  async function handleEdit() {
    if (!editItem) return;
    try {
      await save(editItem);
      setEditItem(null);
    } catch { /* hook toasts error */ }
  }

  async function handleDelete() {
    if (!deleteItem?.id) return;
    try {
      await remove(deleteItem.id);
      setDeleteItem(null);
    } catch { /* hook toasts error */ }
  }

  function handleExport() {
    if (rules.length === 0) { toast.error('No rules to export'); return; }
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policy-firewall-rules-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Exported firewall rules');
  }

  function toggleModel(list: string[] | undefined, id: string): string[] {
    const set = new Set(list ?? []);
    if (set.has(id)) set.delete(id); else set.add(id);
    return Array.from(set);
  }

  const modelPicker = (selected: string[] | undefined, onChange: (ids: string[]) => void) => (
    <div>
      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Linked Models</label>
      {models.length === 0 ? (
        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>No models available to link.</p>
      ) : (
        <div className="max-h-32 overflow-y-auto border p-2 space-y-1" style={{ borderColor: 'hsl(var(--border))' }}>
          {models.map(m => (
            <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'hsl(var(--text-2))' }}>
              <input
                type="checkbox"
                checked={(selected ?? []).includes(m.id)}
                onChange={() => onChange(toggleModel(selected, m.id))}
              />
              {m.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Policy Firewall"
        subtitle={`${orgName} · AI guardrail rules, filters & enforcement policies`}
        icon={ShieldCheck}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} /> Export</Button>
            <Button size="sm" onClick={() => { setFormData(EMPTY_RULE); setCreateOpen(true); }}>
              <Plus size={14} /> Add Rule
            </Button>
          </div>
        }
      />

      {/* Query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load firewall rules</p>
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

      {/* Chart */}
      {typeData.length > 0 && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Blocks by Policy Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} />
                <YAxis tick={{ fontSize: 11, fill: ct.axis }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Bar dataKey="blocked" fill={ct.brand} radius={0} name="Blocks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Types</option>
          {ruleTypes.map(t => <option key={t} value={t}>{ruleTypeLabel(t)}</option>)}
        </select>
        <select value={filterEnabled} onChange={e => setFilterEnabled(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Rules</option>
          <option value="enabled">Enabled Only</option>
          <option value="disabled">Disabled Only</option>
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} of {rules.length} rules</span>
      </div>

      {/* Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <Funnel size={40} />
              <p className="mt-3 text-sm font-medium">
                {rules.length === 0 ? 'No firewall rules yet. Add a rule to start enforcing policy.' : 'No rules match your filters'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['#', 'Rule', 'Type', 'Action', 'Target', 'Models', 'Evaluations', 'Blocks', 'Enabled', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...filtered].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)).map(r => (
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid hsl(var(--border))', opacity: r.enabled ? 1 : 0.6 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onClick={() => setViewItem(r)}
                  >
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.priority}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {typeIcon(r.ruleType)}
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{ruleTypeLabel(r.ruleType)}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge style={{ background: actionStyle(r.action ?? '').bg, color: actionStyle(r.action ?? '').text, border: `1px solid ${actionStyle(r.action ?? '').border}`, borderRadius: 0, fontSize: 11 }}>
                        {actionLabel(r.action)}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{r.target}</td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {(r.linkedModelIds ?? []).length > 0
                          ? (r.linkedModelIds ?? []).map(id => (
                              <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                            ))
                          : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                      </div>
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{(r.evaluations ?? 0).toLocaleString()}</td>
                    <td className="p-3 text-sm font-bold" style={{ color: (r.blocked ?? 0) > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-2))' }}>{r.blocked ?? 0}</td>
                    <td className="p-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleEnabled(r); }}
                        disabled={isSaving}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {r.enabled
                          ? <ToggleRight size={26} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                          : <ToggleLeft size={26} style={{ color: 'hsl(var(--text-3))' }} />}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(r)}><Eye size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...r })}><PencilSimple size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--s-er-tx))' }} onClick={() => setDeleteItem(r)}><Trash size={14} /></Button>
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
                  <Badge style={{ background: actionStyle(viewItem.action ?? '').bg, color: actionStyle(viewItem.action ?? '').text, border: `1px solid ${actionStyle(viewItem.action ?? '').border}`, borderRadius: 0 }}>
                    {actionLabel(viewItem.action)}
                  </Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{ruleTypeLabel(viewItem.ruleType)}</Badge>
                  <Badge style={{ background: viewItem.enabled ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))', color: viewItem.enabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))', border: `1px solid ${viewItem.enabled ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`, borderRadius: 0 }}>
                    {viewItem.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="stats" style={{ borderRadius: 0 }}>Statistics</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Priority', value: String(viewItem.priority ?? '—') },
                    { label: 'Target', value: viewItem.target || '—' },
                    { label: 'Severity', value: viewItem.severity || '—' },
                    { label: 'Last Triggered', value: viewItem.lastTriggeredAt ? formatDate(viewItem.lastTriggeredAt) : 'Never' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Description</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Linked Models</p>
                    <div className="flex flex-wrap gap-1">
                      {(viewItem.linkedModelIds ?? []).length > 0
                        ? (viewItem.linkedModelIds ?? []).map(id => (
                            <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                          ))
                        : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>None</span>}
                    </div>
                  </div>
                  {viewItem.pattern && (
                    <div className="p-3 mt-2" style={{ background: 'hsl(var(--bg-muted))' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Detection Pattern</p>
                      <code className="text-xs" style={{ color: 'hsl(var(--tag-purple))' }}>{viewItem.pattern}</code>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="stats" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{(viewItem.evaluations ?? 0).toLocaleString()}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Evaluations</p>
                    </div>
                    <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(var(--s-er-tx))' }}>{viewItem.blocked ?? 0}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Blocked/Flagged</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3" style={{ background: 'hsl(var(--bg-muted))' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Block Rate</p>
                    <p className="text-2xl font-bold" style={{ color: 'hsl(var(--r-hi-tx))' }}>
                      {(viewItem.evaluations ?? 0) > 0 ? `${(((viewItem.blocked ?? 0) / (viewItem.evaluations ?? 1)) * 100).toFixed(2)}%` : '—'}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" disabled={isSaving} onClick={() => { toggleEnabled(viewItem); setViewItem(null); }}>
                  {viewItem.enabled ? 'Disable' : 'Enable'} Rule
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} /> Edit
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Firewall Rule</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[{ label: 'Name', key: 'name' }, { label: 'Target', key: 'target' }, { label: 'Description', key: 'description' }, { label: 'Pattern', key: 'pattern' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Type</label>
                  <select value={editItem.ruleType} onChange={e => setEditItem(prev => prev ? { ...prev, ruleType: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {RULE_TYPES.map(t => <option key={t} value={t}>{ruleTypeLabel(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Action</label>
                  <select value={editItem.action} onChange={e => setEditItem(prev => prev ? { ...prev, action: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {ACTIONS.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Priority</label>
                  <Input type="number" min={1} value={editItem.priority ?? 0} onChange={e => setEditItem(prev => prev ? { ...prev, priority: parseInt(e.target.value) || 0 } : null)} style={{ borderRadius: 0 }} />
                </div>
              </div>
              {modelPicker(editItem.linkedModelIds, ids => setEditItem(prev => prev ? { ...prev, linkedModelIds: ids } : null))}
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Firewall Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Rule Name', key: 'name' }, { label: 'Target', key: 'target' }, { label: 'Description', key: 'description' }, { label: 'Detection Pattern', key: 'pattern' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Type</label>
                <select value={formData.ruleType} onChange={e => setFormData(prev => ({ ...prev, ruleType: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {RULE_TYPES.map(t => <option key={t} value={t}>{ruleTypeLabel(t)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Action</label>
                <select value={formData.action} onChange={e => setFormData(prev => ({ ...prev, action: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {ACTIONS.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Priority</label>
                <Input type="number" min={1} value={formData.priority ?? 0} onChange={e => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
            {modelPicker(formData.linkedModelIds, ids => setFormData(prev => ({ ...prev, linkedModelIds: ids })))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name || isSaving}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Firewall Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This rule will stop enforcing immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>Delete Rule</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
