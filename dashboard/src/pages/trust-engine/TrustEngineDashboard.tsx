import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ShieldCheck, Eye, PencilSimple, Trash, Plus, Copy, Play, Pause,
  Warning, CheckCircle, ArrowUp, ArrowDown, TrendUp, TrendDown,
  Info, Lightning, Clock,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TRUST_POLICIES, TrustPolicy, formatNumber, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

interface ExtPolicy extends TrustPolicy {
  framework: string;
  clause: string;
  trendData: number[];
  trend: 'up' | 'down' | 'stable';
}

// ── Extended policies ─────────────────────────────────────────────────────────

const EXTENDED_POLICIES: ExtPolicy[] = [
  { ...TRUST_POLICIES[0], framework: 'GDPR', clause: 'Art. 25', trendData: [96, 97, 97, 98, 97, 98, 98], trend: 'up' },
  { ...TRUST_POLICIES[1], framework: 'EU AI Act', clause: 'Art. 9', trendData: [94, 95, 95, 96, 96, 95, 96], trend: 'stable' },
  { ...TRUST_POLICIES[2], framework: 'ISO 42001', clause: 'Cl. 8.4', trendData: [91, 90, 89, 88, 89, 89, 89], trend: 'down' },
  { ...TRUST_POLICIES[3], framework: 'SOC 2', clause: 'CC6.1', trendData: [98, 99, 99, 99, 99, 99, 99], trend: 'stable' },
  { ...TRUST_POLICIES[4], framework: 'ISO 42001', clause: 'Cl. 9.1', trendData: [92, 93, 93, 94, 94, 94, 94], trend: 'up' },
];

// ── Weekly Eval Trend Data ────────────────────────────────────────────────────

const EVAL_TREND = [
  { day: 'Mon', evaluations: 12800 },
  { day: 'Tue', evaluations: 14200 },
  { day: 'Wed', evaluations: 13600 },
  { day: 'Thu', evaluations: 15100 },
  { day: 'Fri', evaluations: 14800 },
  { day: 'Sat', evaluations: 11200 },
  { day: 'Sun', evaluations: 12300 },
];

// ── Alert Ticker Messages ─────────────────────────────────────────────────────

const TICKER_MESSAGES = [
  'PII detected in loan request — Redacted [14:32:01]',
  'Hallucination Guard blocked LoanAssistant output — Confidence 0.72 [14:22:55]',
  'Data Boundary violation: DataGuard attempted external export [14:22:50]',
  'Cost threshold approaching for OpenAI-API-Connector (71% of weekly budget) [13:45:00]',
  'Prompt injection attempt blocked by ComplianceBot [13:30:44]',
];

// ── Metric Tile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(142 71% 45%)' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(45 93% 47%)' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(0 72% 51%)' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(220 90% 56%)' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Mini Sparkline ────────────────────────────────────────────────────────────

function MiniSparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'stable' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 20;
  const width = 56;
  const barW = width / data.length - 1;
  const color = trend === 'up' ? 'hsl(142 71% 45%)' : trend === 'down' ? 'hsl(0 72% 51%)' : 'hsl(220 90% 56%)';
  return (
    <div className="flex items-center gap-1">
      <svg width={width} height={height}>
        {data.map((val, i) => {
          const barH = ((val - min) / range) * (height - 4) + 4;
          return (
            <rect
              key={i}
              x={i * (barW + 1)}
              y={height - barH}
              width={barW}
              height={barH}
              fill={color}
              opacity={i === data.length - 1 ? 1 : 0.5}
            />
          );
        })}
      </svg>
      {trend === 'up' && <ArrowUp size={12} weight="bold" style={{ color: 'hsl(142 71% 45%)' }} />}
      {trend === 'down' && <ArrowDown size={12} weight="bold" style={{ color: 'hsl(0 72% 51%)' }} />}
    </div>
  );
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{
      background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
      borderRadius: 0, color: 'hsl(var(--text-1))',
    }}>
      <p className="font-semibold mb-1">{label}</p>
      <p>Evaluations: <span className="font-bold">{formatNumber(payload[0].value)}</span></p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrustEngineDashboard() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [policies, setPolicies] = useState<ExtPolicy[]>(EXTENDED_POLICIES);
  const [selectedPolicy, setSelectedPolicy] = useState<ExtPolicy | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<ExtPolicy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExtPolicy | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', type: 'Privacy', target: 'All Agents', threshold: '95%' });
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Computed metrics
  const totalEvals = policies.reduce((a, p) => a + p.evaluations, 0);
  const trustScore = Math.round(policies.reduce((a, p) => a + p.trustScore * p.evaluations, 0) / totalEvals);
  const violations7d = 7;
  const activePolicies = policies.filter(p => p.status === 'active').length;

  // Actions
  const handleDeactivate = () => {
    if (!deactivateTarget) return;
    setPolicies(prev => prev.map(p => p.id === deactivateTarget.id ? { ...p, status: 'disabled' as const } : p));
    toast(`${deactivateTarget.name} deactivated`, 'info');
    setDeactivateTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setPolicies(prev => prev.filter(p => p.id !== deleteTarget.id));
    toast(`Policy ${deleteTarget.id} deleted`, 'info');
    setDeleteTarget(null);
  };

  const handleClone = (policy: ExtPolicy) => {
    const clone: ExtPolicy = {
      ...policy,
      id: `TP-${String(policies.length + 1).padStart(3, '0')}`,
      name: `${policy.name} (Clone)`,
      status: 'testing',
      evaluations: 0,
    };
    setPolicies(prev => [...prev, clone]);
    toast(`Cloned "${policy.name}" as testing policy`, 'success');
  };

  const handleTestPolicy = (policy: ExtPolicy) => {
    toast(`Running test evaluation for "${policy.name}"...`, 'info');
  };

  const handleCreate = () => {
    const id = `TP-${String(policies.length + 1).padStart(3, '0')}`;
    const newPolicy: ExtPolicy = {
      id,
      name: newRule.name || 'New Policy',
      type: newRule.type,
      target: newRule.target,
      status: 'testing',
      evaluations: 0,
      trustScore: 100,
      lastEvaluated: new Date().toISOString().split('T')[0],
      description: `Custom policy: ${newRule.name}`,
      framework: 'Custom',
      clause: '—',
      trendData: [100, 100, 100, 100, 100, 100, 100],
      trend: 'stable',
    };
    setPolicies(prev => [...prev, newPolicy]);
    setCreateOpen(false);
    setNewRule({ name: '', type: 'Privacy', target: 'All Agents', threshold: '95%' });
    toast(`Policy "${newPolicy.name}" created in testing mode`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(142 71% 45%)' : t.type === 'error' ? 'hsl(0 72% 51%)' : 'hsl(220 90% 56%)',
            color: '#fff', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Trust Engine Dashboard</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} — Real-time policy governance, trust scoring, and guardrail monitoring</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <Plus size={14} className="mr-2" />Create Rule
        </Button>
      </div>

      {/* Live Alert Ticker */}
      <div className="overflow-hidden relative" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, height: 28 }}>
        <div className="flex items-center h-full px-3">
          <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 9, marginRight: 8, flexShrink: 0 }}>LIVE</Badge>
          <div ref={tickerRef} className="flex-1 overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-marquee" style={{ animation: 'marquee 40s linear infinite' }}>
              {TICKER_MESSAGES.map((msg, i) => (
                <span key={i} className="text-xs mx-8" style={{ color: 'hsl(var(--text-4))' }}>
                  <Lightning size={10} weight="fill" className="inline mr-1" style={{ color: 'hsl(45 93% 47%)' }} />
                  {msg}
                </span>
              ))}
            </div>
          </div>
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => setBreakdownOpen(true)}>
          <MetricTile
            label="Trust Score"
            value={`${trustScore}%`}
            variant="ok"
            icon={<ShieldCheck size={16} weight="fill" style={{ color: 'hsl(142 71% 45%)' }} />}
            sub="Click for breakdown"
          />
        </div>
        <MetricTile label="Active Policies" value={String(activePolicies)} variant="ok" icon={<CheckCircle size={16} weight="fill" style={{ color: 'hsl(142 71% 45%)' }} />} />
        <MetricTile label="Violations (7d)" value={String(violations7d)} variant="warn" icon={<Warning size={16} weight="fill" style={{ color: 'hsl(45 93% 47%)' }} />} sub="3 critical" />
        <MetricTile label="Evaluations (Week)" value={formatNumber(totalEvals)} variant="info" icon={<Lightning size={16} weight="fill" style={{ color: 'hsl(220 90% 56%)' }} />} />
      </div>

      {/* Chart */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Weekly Evaluation Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={EVAL_TREND} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
              <YAxis tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
              <ReTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="evaluations" fill={ct.brand} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Policies Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Trust Policies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['ID', 'Policy', 'Type', 'Target', 'Trust Score', 'Evaluations', 'Trend', 'Framework', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map(p => {
                  const scoreColor = p.trustScore >= 95 ? 'hsl(142 71% 45%)' : p.trustScore >= 90 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)';
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{p.id}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{p.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(220 90% 56%)', borderRadius: 0, fontSize: 10 }}>{p.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{p.target}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color: scoreColor }}>{p.trustScore}%</span>
                        {p.trustScore < 95 && (
                          <Badge className="ml-2" style={{ background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 93% 47%)', borderRadius: 0, fontSize: 9 }}>
                            Below 95%
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{formatNumber(p.evaluations)}</td>
                      <td className="px-4 py-3">
                        <MiniSparkline data={p.trendData} trend={p.trend} />
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{p.framework} {p.clause}</td>
                      <td className="px-4 py-3">
                        <Badge style={{
                          background: p.status === 'active' ? 'hsl(142 71% 45% / 0.12)' : p.status === 'testing' ? 'hsl(220 90% 56% / 0.12)' : 'hsl(var(--s-nt-bg))',
                          color: p.status === 'active' ? 'hsl(142 71% 45%)' : p.status === 'testing' ? 'hsl(220 90% 56%)' : 'hsl(var(--s-nt-tx))',
                          borderRadius: 0, fontSize: 10,
                        }}>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedPolicy(p); setSheetOpen(true); }}>
                            <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedPolicy(p); setSheetOpen(true); }}>
                            <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleTestPolicy(p)}>
                            <Play size={14} style={{ color: 'hsl(142 71% 45%)' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleClone(p)}>
                            <Copy size={14} style={{ color: 'hsl(220 90% 56%)' }} />
                          </Button>
                          {p.status === 'active' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeactivateTarget(p)}>
                              <Pause size={14} style={{ color: 'hsl(45 93% 47%)' }} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trust Score Breakdown Sheet */}
      <Sheet open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto" style={{ borderRadius: 0 }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Trust Score Breakdown — {trustScore}%</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3" style={{ background: 'hsl(220 90% 56% / 0.06)', border: '1px solid hsl(220 90% 56% / 0.2)', borderRadius: 0 }}>
              <p className="text-xs" style={{ color: 'hsl(220 90% 56%)' }}>
                <Info size={12} className="inline mr-1" />
                <strong>Weighted Methodology:</strong> The composite trust score is a weighted average where each policy's contribution is proportional to its evaluation volume. Policies with more evaluations have greater influence on the overall score.
              </p>
            </div>
            {policies.filter(p => p.status === 'active').map(p => {
              const weight = ((p.evaluations / totalEvals) * 100).toFixed(1);
              return (
                <div key={p.id} className="p-3 space-y-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{p.name}</span>
                    <span className="text-sm font-bold" style={{
                      color: p.trustScore >= 95 ? 'hsl(142 71% 45%)' : p.trustScore >= 90 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)',
                    }}>{p.trustScore}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    <span>{formatNumber(p.evaluations)} evaluations · {p.framework} {p.clause}</span>
                    <span>Weight: {weight}%</span>
                  </div>
                  <div className="w-full h-1.5" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                    <div className="h-full" style={{
                      width: `${p.trustScore}%`,
                      background: p.trustScore >= 95 ? 'hsl(142 71% 45%)' : p.trustScore >= 90 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)',
                      borderRadius: 0,
                    }} />
                  </div>
                  {p.trustScore < 95 && (
                    <p className="text-xs" style={{ color: 'hsl(45 93% 47%)' }}>
                      <Warning size={10} className="inline mr-1" />Below 95% enterprise threshold
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Deactivate ConfirmDialog */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        type="warning"
        title={`Deactivate ${deactivateTarget?.name}`}
        message={
          <p>
            Deactivating <strong>{deactivateTarget?.name}</strong> will affect <strong>{formatNumber(deactivateTarget?.evaluations ?? 0)}</strong> weekly evaluations
            and may violate <strong>{deactivateTarget?.framework} {deactivateTarget?.clause}</strong>.
          </p>
        }
        confirmLabel="Deactivate Policy"
      />

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { setPolicies(prev => prev.filter(p => p.id !== deleteTarget.id)); toast(`${deleteTarget.id} deleted`, 'info'); setDeleteTarget(null); } }}
        type="danger"
        title="Delete Policy"
        message={<p>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>}
        confirmLabel="Delete"
      />

      {/* Create Rule Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Create Trust Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Policy Name</label>
              <Input value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g., Content Safety Filter" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
              <Select value={newRule.type} onValueChange={v => setNewRule({ ...newRule, type: v })}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {['Privacy', 'Safety', 'Accuracy', 'Security', 'Governance'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Target</label>
              <Select value={newRule.target} onValueChange={v => setNewRule({ ...newRule, target: v })}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {['All Agents', 'Customer-facing', 'LLM Agents', 'External APIs', 'Internal'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Threshold</label>
              <Input value={newRule.threshold} onChange={e => setNewRule({ ...newRule, threshold: e.target.value })}
                placeholder="e.g., 95%" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedPolicy && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <ShieldCheck size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  {selectedPolicy.id} — {selectedPolicy.name}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="config" style={{ borderRadius: 0 }}>Configuration</TabsTrigger>
                  <TabsTrigger value="history" style={{ borderRadius: 0 }}>Evaluation History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Trust Score</span>
                      <p className="text-xl font-bold mt-1" style={{
                        color: selectedPolicy.trustScore >= 95 ? 'hsl(142 71% 45%)' : 'hsl(45 93% 47%)',
                      }}>{selectedPolicy.trustScore}%</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Evaluations</span>
                      <p className="text-xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatNumber(selectedPolicy.evaluations)}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Framework</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedPolicy.framework} {selectedPolicy.clause}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Last Evaluated</span>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedPolicy.lastEvaluated)}</p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedPolicy.description}</p>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="space-y-3 mt-4">
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Type</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedPolicy.type}</p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Target</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedPolicy.target}</p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedPolicy.status}</p>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-3 mt-4">
                  {selectedPolicy.trendData.map((score, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </span>
                      <span className="text-xs font-bold" style={{
                        color: score >= 95 ? 'hsl(142 71% 45%)' : score >= 90 ? 'hsl(45 93% 47%)' : 'hsl(0 72% 51%)',
                      }}>{score}%</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
