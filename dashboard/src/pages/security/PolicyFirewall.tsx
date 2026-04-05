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
  Funnel, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, ShieldCheck, ToggleLeft, ToggleRight, Lightning,
  Lock, Warning, Clock,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

interface FirewallRule {
  id: string;
  name: string;
  type: string;
  action: 'block' | 'warn' | 'allow' | 'flag';
  target: string;
  enabled: boolean;
  priority: number;
  evaluations: number;
  blocked: number;
  lastTriggered: string;
  description: string;
  pattern: string;
}

const MOCK_RULES: FirewallRule[] = [
  { id: 'FW-001', name: 'PII Block — SSN & Credit Cards', type: 'Privacy', action: 'block', target: 'All Agents', enabled: true, priority: 1, evaluations: 12400, blocked: 234, lastTriggered: '2026-04-05', description: 'Block any output or input containing social security numbers, credit card numbers, or other PII patterns.', pattern: 'SSN: \\d{3}-\\d{2}-\\d{4}|\\b\\d{4}[\\s-]\\d{4}[\\s-]\\d{4}[\\s-]\\d{4}\\b' },
  { id: 'FW-002', name: 'Toxicity & Hate Speech Filter', type: 'Safety', action: 'block', target: 'Customer-facing', enabled: true, priority: 2, evaluations: 8900, blocked: 88, lastTriggered: '2026-04-05', description: 'Filter toxic, hateful, or abusive content from all customer-facing AI outputs.', pattern: 'toxicity_score > 0.85' },
  { id: 'FW-003', name: 'Prompt Injection Guard', type: 'Security', action: 'block', target: 'LLM Agents', enabled: true, priority: 3, evaluations: 5600, blocked: 41, lastTriggered: '2026-04-04', description: 'Detect and block prompt injection attempts including jailbreak patterns.', pattern: 'ignore previous|system:override|[INST].*bypass' },
  { id: 'FW-004', name: 'Rate Limiter — Inference API', type: 'Rate Limiting', action: 'flag', target: 'External APIs', enabled: true, priority: 4, evaluations: 24500, blocked: 120, lastTriggered: '2026-04-05', description: 'Flag and throttle agents exceeding 100 requests/minute to inference endpoints.', pattern: 'rate > 100/min' },
  { id: 'FW-005', name: 'Data Boundary Enforcement', type: 'Security', action: 'block', target: 'All Agents', enabled: true, priority: 5, evaluations: 45200, blocked: 7, lastTriggered: '2026-04-03', description: 'Prevent unauthorized data exfiltration to external endpoints not on the allowlist.', pattern: 'egress_domain NOT IN allowlist' },
  { id: 'FW-006', name: 'Hallucination Confidence Check', type: 'Accuracy', action: 'warn', target: 'LLM Agents', enabled: true, priority: 6, evaluations: 3200, blocked: 310, lastTriggered: '2026-04-05', description: 'Warn when model confidence falls below threshold, potentially indicating hallucination.', pattern: 'confidence_score < 0.7' },
  { id: 'FW-007', name: 'Cost Ceiling Guard', type: 'Governance', action: 'block', target: 'All Models', enabled: false, priority: 7, evaluations: 1800, blocked: 15, lastTriggered: '2026-04-01', description: 'Block inference requests that would exceed monthly cost budget per agent.', pattern: 'cumulative_cost > $5000/month' },
  { id: 'FW-008', name: 'NSFW Content Filter', type: 'Safety', action: 'block', target: 'All Agents', enabled: false, priority: 8, evaluations: 920, blocked: 3, lastTriggered: '2026-03-28', description: 'Block NSFW image generation and explicit text outputs across all model endpoints.', pattern: 'nsfw_score > 0.6' },
];

function actionStyle(action: string) {
  switch (action) {
    case 'block': return { bg: '#ef444420', text: '#ef4444', border: '#ef444440' };
    case 'warn': return { bg: '#f9731620', text: '#f97316', border: '#f9731640' };
    case 'flag': return { bg: '#eab30820', text: '#eab308', border: '#eab30840' };
    case 'allow': return { bg: '#10b98120', text: '#10b981', border: '#10b98140' };
    default: return { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
  }
}

function typeIcon(type: string) {
  if (type === 'Privacy' || type === 'Security') return <Lock size={14} style={{ color: '#ef4444' }} />;
  if (type === 'Safety') return <ShieldCheck size={14} style={{ color: '#10b981' }} />;
  if (type === 'Rate Limiting') return <Lightning size={14} style={{ color: '#f97316' }} />;
  if (type === 'Accuracy') return <Warning size={14} style={{ color: '#eab308' }} />;
  return <Clock size={14} style={{ color: '#6b7280' }} />;
}

const EMPTY_RULE: Omit<FirewallRule, 'id'> = {
  name: '', type: 'Security', action: 'block', target: 'All Agents',
  enabled: true, priority: 10, evaluations: 0, blocked: 0,
  lastTriggered: '', description: '', pattern: '',
};

export default function PolicyFirewall() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [rules, setRules] = useState<FirewallRule[]>(MOCK_RULES);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterEnabled, setFilterEnabled] = useState('all');

  const [viewItem, setViewItem] = useState<FirewallRule | null>(null);
  const [editItem, setEditItem] = useState<FirewallRule | null>(null);
  const [deleteItem, setDeleteItem] = useState<FirewallRule | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<FirewallRule, 'id'>>(EMPTY_RULE);

  const filtered = rules.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.target.toLowerCase().includes(q);
    const matchType = filterType === 'all' || r.type === filterType;
    const matchEnabled = filterEnabled === 'all' || (filterEnabled === 'enabled' ? r.enabled : !r.enabled);
    return matchSearch && matchType && matchEnabled;
  });

  const typeData = Array.from(
    rules.reduce((acc, r) => {
      acc.set(r.type, (acc.get(r.type) || 0) + r.blocked);
      return acc;
    }, new Map<string, number>())
  ).map(([name, blocked]) => ({ name, blocked }));

  const ruleTypes = Array.from(new Set(rules.map(r => r.type)));

  const stats = [
    { label: 'Total Rules', value: rules.length, icon: Funnel },
    { label: 'Active Rules', value: rules.filter(r => r.enabled).length, icon: ShieldCheck },
    { label: 'Total Blocks', value: rules.reduce((s, r) => s + r.blocked, 0), icon: Lock },
    { label: 'Total Evaluations', value: rules.reduce((s, r) => s + r.evaluations, 0).toLocaleString(), icon: Lightning },
  ];

  function toggleEnabled(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function handleCreate() {
    const id = `FW-${String(rules.length + 1).padStart(3, '0')}`;
    setRules(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_RULE);
  }

  function handleEdit() {
    if (!editItem) return;
    setRules(prev => prev.map(r => r.id === editItem.id ? editItem : r));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setRules(prev => prev.filter(r => r.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Policy Firewall</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · AI guardrail rules, filters & enforcement policies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_RULE); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> Add Rule
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
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Blocks by Policy Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} />
              <YAxis tick={{ fontSize: 11, fill: ct.axis }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              <Bar dataKey="blocked" fill={ct.brand} radius={0} name="Blocks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
          <Input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
          <option value="all">All Types</option>
          {ruleTypes.map(t => <option key={t} value={t}>{t}</option>)}
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
              <p className="mt-3 text-sm font-medium">No rules match your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['#', 'Rule', 'Type', 'Action', 'Target', 'Evaluations', 'Blocks', 'Enabled', 'Actions'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a, b) => a.priority - b.priority).map(r => (
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
                        {typeIcon(r.type)}
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{r.type}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge style={{ background: actionStyle(r.action).bg, color: actionStyle(r.action).text, border: `1px solid ${actionStyle(r.action).border}`, borderRadius: 0, fontSize: 11 }}>
                        {r.action}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{r.target}</td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{r.evaluations.toLocaleString()}</td>
                    <td className="p-3 text-sm font-bold" style={{ color: r.blocked > 0 ? '#ef4444' : 'hsl(var(--text-2))' }}>{r.blocked}</td>
                    <td className="p-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleEnabled(r.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {r.enabled
                          ? <ToggleRight size={26} style={{ color: '#10b981' }} />
                          : <ToggleLeft size={26} style={{ color: '#6b7280' }} />}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(r)}><Eye size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...r })}><PencilSimple size={14} /></Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(r)}><Trash size={14} /></Button>
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
                  <Badge style={{ background: actionStyle(viewItem.action).bg, color: actionStyle(viewItem.action).text, border: `1px solid ${actionStyle(viewItem.action).border}`, borderRadius: 0 }}>
                    {viewItem.action}
                  </Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.type}</Badge>
                  <Badge style={{ background: viewItem.enabled ? '#10b98120' : '#6b728020', color: viewItem.enabled ? '#10b981' : '#6b7280', border: `1px solid ${viewItem.enabled ? '#10b98140' : '#6b728040'}`, borderRadius: 0 }}>
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
                    { label: 'Rule ID', value: viewItem.id },
                    { label: 'Priority', value: String(viewItem.priority) },
                    { label: 'Target', value: viewItem.target },
                    { label: 'Last Triggered', value: viewItem.lastTriggered ? formatDate(viewItem.lastTriggered) : 'Never' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Description</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                  </div>
                  <div className="p-3 mt-2" style={{ background: 'hsl(var(--bg-muted))' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Detection Pattern</p>
                    <code className="text-xs" style={{ color: '#8b5cf6' }}>{viewItem.pattern}</code>
                  </div>
                </TabsContent>
                <TabsContent value="stats" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.evaluations.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Evaluations</p>
                    </div>
                    <div className="text-center p-4" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-3xl font-bold" style={{ color: '#ef4444' }}>{viewItem.blocked}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Blocked/Flagged</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3" style={{ background: 'hsl(var(--bg-muted))' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Block Rate</p>
                    <p className="text-2xl font-bold" style={{ color: '#f97316' }}>
                      {viewItem.evaluations > 0 ? ((viewItem.blocked / viewItem.evaluations) * 100).toFixed(2) : '0.00'}%
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { toggleEnabled(viewItem.id); setViewItem(null); }}>
                  {viewItem.enabled ? 'Disable' : 'Enable'} Rule
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} className="mr-1" /> Edit
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
                  <select value={editItem.type} onChange={e => setEditItem(prev => prev ? { ...prev, type: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['Privacy', 'Safety', 'Security', 'Rate Limiting', 'Accuracy', 'Governance'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Action</label>
                  <select value={editItem.action} onChange={e => setEditItem(prev => prev ? { ...prev, action: e.target.value as any } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['block', 'warn', 'flag', 'allow'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Priority</label>
                  <Input type="number" min={1} value={editItem.priority} onChange={e => setEditItem(prev => prev ? { ...prev, priority: parseInt(e.target.value) } : null)} style={{ borderRadius: 0 }} />
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Firewall Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Rule Name', key: 'name' }, { label: 'Target', key: 'target' }, { label: 'Description', key: 'description' }, { label: 'Detection Pattern', key: 'pattern' }].map(f => (
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
                  {['Privacy', 'Safety', 'Security', 'Rate Limiting', 'Accuracy', 'Governance'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Action</label>
                <select value={formData.action} onChange={e => setFormData(prev => ({ ...prev, action: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['block', 'warn', 'flag', 'allow'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Create Rule</Button>
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
            <AlertDialogAction onClick={handleDelete} style={{ background: '#ef4444', borderRadius: 0 }}>Delete Rule</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
