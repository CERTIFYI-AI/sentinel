import { useState, useCallback } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, ShieldCheck, Info,
  CheckCircle, XCircle, Funnel, ArrowDown, ArrowUp,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { TRUST_POLICIES, TrustPolicy, severityColor, statusColor } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const FRAMEWORKS = ['EU AI Act Art.9', 'ISO 42001', 'NIST AI RMF', 'SOC 2', 'GDPR'] as const;
const POLICY_TYPES = ['Privacy', 'Safety', 'Accuracy', 'Security', 'Governance'] as const;
const TARGETS = ['All Agents', 'Customer-facing', 'LLM Agents', 'External APIs'] as const;
const ACTIONS = ['Block', 'Warn', 'Flag', 'Allow'] as const;

// Map policies to simulated "live" timestamps
const EVAL_TIMESTAMPS: Record<string, string> = {
  'TP-001': new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  'TP-002': new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  'TP-003': new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  'TP-004': new Date(Date.now() - 45 * 1000).toISOString(),
  'TP-005': new Date(Date.now() - 31 * 60 * 1000).toISOString(),
};

const FRAMEWORK_MAP: Record<string, string> = {
  'TP-001': 'GDPR', 'TP-002': 'EU AI Act Art.9', 'TP-003': 'ISO 42001',
  'TP-004': 'SOC 2', 'TP-005': 'NIST AI RMF',
};

// Sparkline data per policy (7 days)
const SPARKLINES: Record<string, { v: number }[]> = {
  'TP-001': [{ v: 96 }, { v: 97 }, { v: 98 }, { v: 97 }, { v: 98 }, { v: 98 }, { v: 98 }],
  'TP-002': [{ v: 93 }, { v: 94 }, { v: 95 }, { v: 96 }, { v: 96 }, { v: 95 }, { v: 96 }],
  'TP-003': [{ v: 91 }, { v: 90 }, { v: 88 }, { v: 87 }, { v: 89 }, { v: 88 }, { v: 89 }],
  'TP-004': [{ v: 99 }, { v: 99 }, { v: 99 }, { v: 100 }, { v: 99 }, { v: 99 }, { v: 99 }],
  'TP-005': [{ v: 92 }, { v: 93 }, { v: 94 }, { v: 93 }, { v: 94 }, { v: 95 }, { v: 94 }],
};

const EVAL_DATA = [
  { day: 'Mon', evaluations: 18400 }, { day: 'Tue', evaluations: 21200 },
  { day: 'Wed', evaluations: 19800 }, { day: 'Thu', evaluations: 24500 },
  { day: 'Fri', evaluations: 22100 }, { day: 'Sat', evaluations: 14300 },
  { day: 'Sun', evaluations: 11600 },
];

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── TrustGauge ────────────────────────────────────────────────────────────────

function TrustGauge({ score }: { score: number }) {
  const r = 70; const cx = 90; const cy = 90;
  const startAngle = 210; const endAngle = 330;
  const totalDeg = 360 - startAngle + endAngle;
  const filledDeg = (score / 100) * totalDeg;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number, radius: number) => {
    const s = toRad(start); const e = toRad(end);
    const x1 = cx + radius * Math.cos(s); const y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e); const y2 = cy + radius * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };
  const endFilled = startAngle + filledDeg;
  const scoreColor = score >= 90 ? 'hsl(142 71% 45%)' : score >= 80 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)';
  return (
    <svg viewBox="0 0 180 110" className="w-44 h-28">
      <path d={arcPath(startAngle, startAngle + totalDeg, r)} fill="none" stroke="hsl(var(--border))" strokeWidth="12" strokeLinecap="round" />
      <path d={arcPath(startAngle, endFilled, r)} fill="none" stroke={scoreColor} strokeWidth="12" strokeLinecap="round" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="28" fontWeight="700" fill="hsl(var(--text-1))">{score}%</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="10" fill="hsl(var(--text-4))">Trust Score</text>
    </svg>
  );
}

function PolicySparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <ResponsiveContainer width={80} height={28}>
      <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barSize={7}>
        <Bar dataKey="v" fill={color} radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function policyStatusBadge(status: TrustPolicy['status']) {
  if (status === 'active') return <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', borderRadius: 0 }}>Active</Badge>;
  if (status === 'disabled') return <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0 }}>Disabled</Badge>;
  return <Badge style={{ background: 'hsl(45 93% 47% / 0.15)', color: 'hsl(45 93% 47%)', borderRadius: 0 }}>Testing</Badge>;
}

// ── Default form ──────────────────────────────────────────────────────────────

const emptyForm = () => ({
  name: '', type: 'Privacy' as string, target: 'All Agents' as string,
  threshold: '95', action: 'Block' as string, description: '',
  framework: 'EU AI Act Art.9' as string,
});

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrustEngineDashboard() {
  const { orgName } = useSettingsStore();
  const chart = useChartTheme();
  const [policies, setPolicies] = useState<TrustPolicy[]>(TRUST_POLICIES);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewItem, setViewItem] = useState<TrustPolicy | null>(null);
  const [editItem, setEditItem] = useState<TrustPolicy | null>(null);
  const [editForm, setEditForm] = useState<typeof emptyForm extends () => infer R ? R : never>(emptyForm());
  const [createOpen, setCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm());
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const filtered = policies.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase()) ||
      p.target.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalEvals = policies.reduce((s, p) => s + p.evaluations, 0);
  const activePolicies = policies.filter(p => p.status === 'active').length;
  // Weighted trust score: Σ(score_i × evals_i) / Σ(evals_i)
  const weightedScore = Math.round(
    policies.reduce((s, p) => s + p.trustScore * p.evaluations, 0) /
    policies.reduce((s, p) => s + p.evaluations, 0)
  );

  const openEdit = (p: TrustPolicy) => {
    setEditItem(p);
    setEditForm({
      name: p.name, type: p.type, target: p.target,
      threshold: '95', action: 'Block', description: p.description,
      framework: FRAMEWORK_MAP[p.id] || 'EU AI Act Art.9',
    });
  };
  const saveEdit = () => {
    if (!editItem) return;
    setPolicies(prev => prev.map(p => p.id === editItem.id
      ? { ...p, name: editForm.name, type: editForm.type, target: editForm.target, description: editForm.description } as TrustPolicy
      : p));
    setEditItem(null);
    toast('Policy updated successfully');
  };
  const handleDelete = (id: string, name: string) => {
    setPolicies(prev => prev.filter(p => p.id !== id));
    toast(`Policy "${name}" deleted`, 'info');
  };
  const handleDeactivate = (id: string) => {
    setPolicies(prev => prev.map(p => p.id === id
      ? { ...p, status: p.status === 'active' ? 'disabled' : 'active' } as TrustPolicy
      : p));
    toast('Policy status updated');
  };
  const handleCreate = () => {
    const np: TrustPolicy = {
      id: `TP-00${policies.length + 1}`,
      name: newForm.name || 'New Policy',
      type: newForm.type || 'Privacy',
      target: newForm.target || 'All Agents',
      status: 'testing',
      evaluations: 0,
      trustScore: 100,
      lastEvaluated: new Date().toISOString(),
      description: newForm.description || '',
    };
    setPolicies(prev => [...prev, np]);
    setNewForm(emptyForm());
    setCreateOpen(false);
    toast(`Policy "${np.name}" created`);
  };

  const tooltipStyle = { contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 0, color: chart.tooltipText, fontSize: 12 } };

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Toast layer */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
              background: t.type === 'success' ? 'hsl(142 71% 45%)' : t.type === 'error' ? 'hsl(0 72% 51%)' : 'hsl(220 90% 56%)',
              color: '#fff', borderRadius: 0, minWidth: 260
            }}>{t.text}</div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Trust Engine</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Policy evaluation & guardrail management</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <Plus className="h-4 w-4 mr-2" weight="bold" />Create Rule
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-5">
              <div className="flex flex-col items-center">
                <TrustGauge score={weightedScore} />
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Weighted average</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button"><Info size={12} style={{ color: 'hsl(var(--text-4))' }} /></button>
                    </TooltipTrigger>
                    <TooltipContent style={{ borderRadius: 0, maxWidth: 280 }}>
                      <p className="text-xs">Weighted average of policy scores, weighted by evaluation volume.</p>
                      <p className="text-xs mt-1 font-mono">Formula: Σ(score_i × evals_i) / Σ(evals_i)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-5 space-y-1">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Active Policies</p>
              <p className="text-3xl font-bold" style={{ color: 'hsl(220 90% 56%)' }}>{activePolicies}</p>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{policies.length} total configured</p>
            </CardContent>
          </Card>
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-5 space-y-1">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Total Evaluations</p>
              <p className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{(totalEvals / 1000).toFixed(0)}K</p>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>This week</p>
            </CardContent>
          </Card>
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-5 space-y-1">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Avg Trust Score</p>
              <p className="text-3xl font-bold" style={{ color: 'hsl(142 71% 45%)' }}>{weightedScore}%</p>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Across all policies</p>
            </CardContent>
          </Card>
        </div>

        {/* Evaluations Chart */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Policy Evaluations — This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={EVAL_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <RTooltip {...tooltipStyle} formatter={(v: number) => [`${(v / 1000).toFixed(1)}K evals`, 'Evaluations']} />
                <Bar dataKey="evaluations" fill="hsl(var(--brand))" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-9 text-xs" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-9" style={{ borderRadius: 0 }}>
              <Funnel className="h-3 w-3 mr-1" /><SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Types</SelectItem>
              {POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9" style={{ borderRadius: 0 }}>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} of {policies.length} policies</span>
        </div>

        {/* Policy Table */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                <ShieldCheck size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No policies match your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['ID', 'Name', 'Type', 'Target', 'Framework', 'Status', 'Evaluations', 'Trust Score', 'Trend (7d)', 'Last Evaluated', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const tsColor = p.trustScore >= 95 ? 'hsl(142 71% 45%)' : p.trustScore >= 85 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)';
                      const evalTs = EVAL_TIMESTAMPS[p.id] || p.lastEvaluated;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{p.id}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{p.name}</td>
                          <td className="px-4 py-3">
                            <Badge style={{ background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 11 }}>{p.type}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{p.target}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                            {FRAMEWORK_MAP[p.id] || '—'}
                          </td>
                          <td className="px-4 py-3">{policyStatusBadge(p.status)}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-1))' }}>{p.evaluations.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-sm" style={{ color: tsColor }}>{p.trustScore}%</span>
                          </td>
                          <td className="px-4 py-3">
                            <PolicySparkline data={SPARKLINES[p.id] || []} color={tsColor} />
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                            {timeAgo(evalTs)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewItem(p)}>
                                <Eye size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                                <PencilSimple size={14} />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" style={{ color: p.status === 'active' ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' }}>
                                    {p.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent style={{ borderRadius: 0 }}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{p.status === 'active' ? 'Deactivate' : 'Activate'} Policy</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {p.status === 'active'
                                        ? `Deactivate "${p.name}"? This will stop policy enforcement immediately.`
                                        : `Activate "${p.name}"? Policy enforcement will resume.`}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeactivate(p.id)} style={{ borderRadius: 0, background: 'hsl(45 93% 47%)' }}>Confirm</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: 'hsl(0 72% 51%)' }}>
                                    <Trash size={14} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent style={{ borderRadius: 0 }}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Policy</AlertDialogTitle>
                                    <AlertDialogDescription>Delete "{p.name}"? This cannot be undone and will stop all evaluations.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(p.id, p.name)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Sheet */}
        <Sheet open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <SheetContent style={{ borderRadius: 0 }}>
            <SheetHeader><SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Policy Detail</SheetTitle></SheetHeader>
            {viewItem && (
              <div className="mt-6 space-y-4 text-sm overflow-y-auto">
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>ID</p><p className="font-mono">{viewItem.id}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name</p><p className="font-medium">{viewItem.name}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</p>
                  <Badge style={{ background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{viewItem.type}</Badge>
                </div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Target</p><p>{viewItem.target}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Framework</p><p>{FRAMEWORK_MAP[viewItem.id] || '—'}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Status</p>{policyStatusBadge(viewItem.status)}</div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Trust Score</p>
                  <p className="text-2xl font-bold" style={{ color: viewItem.trustScore >= 95 ? 'hsl(142 71% 45%)' : viewItem.trustScore >= 85 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)' }}>
                    {viewItem.trustScore}%
                  </p>
                </div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Total Evaluations</p><p>{viewItem.evaluations.toLocaleString()}</p></div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Last Evaluated</p>
                  <p>{timeAgo(EVAL_TIMESTAMPS[viewItem.id] || viewItem.lastEvaluated)}</p>
                </div>
                <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Description</p><p style={{ color: 'hsl(var(--text-4))' }}>{viewItem.description}</p></div>
                <div className="pt-3 flex gap-2">
                  <Button size="sm" onClick={() => { setViewItem(null); openEdit(viewItem); }} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                    <PencilSimple size={14} className="mr-1" />Edit Policy
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Edit Dialog */}
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
            <DialogHeader><DialogTitle>Edit Trust Policy</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Policy Name</label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
                  <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
                <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Target</label>
                  <Select value={editForm.target} onValueChange={v => setEditForm(f => ({ ...f, target: v }))}>
                    <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {TARGETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Threshold (%)</label>
                  <Input value={editForm.threshold} onChange={e => setEditForm(f => ({ ...f, threshold: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. 95" /></div>
                <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Action</label>
                  <Select value={editForm.action} onValueChange={v => setEditForm(f => ({ ...f, action: v }))}>
                    <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Framework Linkage</label>
                <Select value={editForm.framework} onValueChange={v => setEditForm(f => ({ ...f, framework: v }))}>
                  <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FRAMEWORKS.map(fw => <SelectItem key={fw} value={fw}>{fw}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Description</label>
                <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
              <Button onClick={saveEdit} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
            <DialogHeader><DialogTitle>Create Trust Policy</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Policy Name *</label>
                <Input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Output Sanitization Guard" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
                  <Select value={newForm.type} onValueChange={v => setNewForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
                <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Target</label>
                  <Select value={newForm.target} onValueChange={v => setNewForm(f => ({ ...f, target: v }))}>
                    <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {TARGETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Threshold (%)</label>
                  <Input value={newForm.threshold} onChange={e => setNewForm(f => ({ ...f, threshold: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="95" /></div>
                <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Action</label>
                  <Select value={newForm.action} onValueChange={v => setNewForm(f => ({ ...f, action: v }))}>
                    <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Framework Linkage</label>
                <Select value={newForm.framework} onValueChange={v => setNewForm(f => ({ ...f, framework: v }))}>
                  <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FRAMEWORKS.map(fw => <SelectItem key={fw} value={fw}>{fw}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Description</label>
                <Input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="Policy description and purpose" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newForm.name} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Create Policy</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
