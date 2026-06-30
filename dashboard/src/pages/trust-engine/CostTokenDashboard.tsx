import { useState, useCallback } from 'react';
import {
  CurrencyDollar, Lightning, ChartBar, Export, Warning,
  Bell, Clock, CheckCircle, Info, Gauge,
  Database, CloudCheck, WarningCircle, TrendUp
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { formatNumber } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';


// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Chart Data ────────────────────────────────────────────────────────────────

import { useCostMetrics } from '../../hooks/useCostMetrics';

// ── Metric Tile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))' },
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

// ── Custom Chart Tooltips ─────────────────────────────────────────────────────

function TokenTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
      <p className="font-semibold">{label}</p>
      <p>Tokens: {payload[0].value}K</p>
    </div>
  );
}

function CostTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
      <p className="font-semibold">{label}</p>
      <p>Cost: ${payload[0].value}</p>
    </div>
  );
}

function ModelCostTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="px-3 py-2 text-xs shadow-lg space-y-1" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
      <p className="font-semibold">{label}</p>
      <div className="flex justify-between gap-4"><span style={{ color: 'hsl(var(--text-3))' }}>Total Cost:</span> <span>${payload[0].value.toFixed(2)}</span></div>
      <div className="flex justify-between gap-4"><span style={{ color: 'hsl(var(--text-3))' }}>Prompt Tokens:</span> <span>{data.prompt}K</span></div>
      <div className="flex justify-between gap-4"><span style={{ color: 'hsl(var(--text-3))' }}>Comp Tokens:</span> <span>{data.comp}K</span></div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CostTokenDashboard() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [dateRange, setDateRange] = useState('week');
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetThreshold, setBudgetThreshold] = useState(() => localStorage.getItem('budgetAlert') || '15');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const { tokenUsage, costTrend, costByModel, tokenByAgent, totalTokens, totalCost, providerTraffic } = useCostMetrics(dateRange);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleExportCSV = () => {
    const csv = 'Day,Tokens(K),Cost($)\n' + tokenUsage.map((d, i) => `${d.day},${d.tokens},${costTrend[i].cost}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cost-token-data.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Exported cost data to CSV', 'success');
  };

  const handleSetBudget = () => {
    const val = parseFloat(budgetThreshold);
    if (isNaN(val) || val <= 0) { toast('Invalid threshold', 'error'); return; }
    localStorage.setItem('budgetAlert', val.toString());
    toast(`Budget alert set at $${val}/week. You will be notified when exceeded.`, 'success');
    setBudgetDialogOpen(false);
  };


  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CurrencyDollar size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Cost & Token Dashboard</h1>
            <Badge className="rounded-none bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-medium tracking-wide flex items-center gap-1.5 px-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              LIVE SYNC: AI GATEWAY DB
            </Badge>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} — Real-time LLM token usage and cost tracking across all providers</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-8 w-36 text-xs" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setBudgetDialogOpen(true)} style={{ borderRadius: 0 }}>
            <Bell size={14} />Set Budget Alert
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} style={{ borderRadius: 0 }}>
            <Export size={14} />Export CSV
          </Button>
        </div>
      </div>

      {/* Anomaly Banner */}
      <div className="flex items-center justify-between p-3" style={{ background: 'hsl(45 93% 47% / 0.10)', border: '1px solid hsl(45 93% 47% / 0.3)', borderRadius: 0 }}>
        <div className="flex items-center gap-3">
          <WarningCircle size={20} weight="fill" className="text-orange-500" />
          <div>
            <p className="text-sm font-semibold text-orange-500">Anomaly Detected: High Token Usage</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>OpenAI-API-Connector usage spiked by 42% in the last 4 hours compared to 7-day moving average.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="rounded-none border-orange-500/30 text-orange-500 hover:bg-orange-500/10">Investigate Logs</Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Tokens This Week" value={`${Math.round(totalTokens)}K`} variant="info" icon={<Lightning size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Total Cost This Week" value={`$${totalCost.toFixed(2)}`} variant="ok" icon={<CurrencyDollar size={16} weight="fill" className="text-green-600 dark:text-green-400" />} sub="+12% WoW" />
        <MetricTile label="Active Models" value="4" variant="info" icon={<Gauge size={16} className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Cost Per 1K Tokens (Avg)" value="$0.012" variant="warn" icon={<TrendUp size={16} className="text-orange-600 dark:text-orange-400" />} sub="Up 3% from yesterday" />
      </div>

      {/* Charts Row 1: Token Usage + Cost Trend */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Daily Token Usage (Mon–Sun)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tokenUsage} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <YAxis label={{ value: 'Tokens (K)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <ReTooltip content={<TokenTooltip />} />
                <Bar dataKey="tokens" fill={ct.brand} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Daily Cost Trend (Mon–Sun)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={costTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <YAxis label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <ReTooltip content={<CostTooltip />} />
                <Line type="monotone" dataKey="cost" stroke={ct.brand} strokeWidth={2} dot={{ fill: ct.brand, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Cost by Model + Token by Agent */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Cost by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={costByModel} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="model" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <YAxis label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <ReTooltip content={<ModelCostTooltip />} />
                <Bar dataKey="cost" maxBarSize={36}>
                  {costByModel.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Token Usage by Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tokenByAgent.map(agent => (
              <div key={agent.agent}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{agent.agent}</span>
                  <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{agent.tokens}K ({agent.pct}%)</span>
                </div>
                <div className="w-full h-2" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                  <div className="h-full" style={{ width: `${agent.pct * 3}%`, background: ct.brand, borderRadius: 0, maxWidth: '100%' }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
              <Database size={16} /> Data Sources & Provider Traffic
            </CardTitle>
            <Badge variant="outline" className="rounded-none text-xs text-[hsl(var(--text-3))]">Real-time Gateway Routing</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase" style={{ background: 'hsl(var(--surface-2))', color: 'hsl(var(--text-3))' }}>
              <tr>
                <th className="px-4 py-3 font-semibold">Provider Endpoint</th>
                <th className="px-4 py-3 font-semibold">Requests (24h)</th>
                <th className="px-4 py-3 font-semibold">Traffic Share</th>
                <th className="px-4 py-3 font-semibold">Active Keys</th>
                <th className="px-4 py-3 font-semibold">Avg Latency</th>
                <th className="px-4 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {providerTraffic.map((p, i) => (
                <tr key={i} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                    <CloudCheck size={16} className="text-[hsl(var(--brand))]" /> {p.provider}
                  </td>
                  <td className="px-4 py-3 font-mono" style={{ color: 'hsl(var(--text-2))' }}>{p.reqs.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                        <div className="h-full" style={{ width: `${p.pct}%`, background: 'hsl(var(--brand))', borderRadius: 0 }} />
                      </div>
                      <span className="text-xs text-[hsl(var(--text-3))]" >{p.pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'hsl(var(--text-2))' }}>{p.activeKeys} keys</td>
                  <td className="px-4 py-3 font-mono text-[hsl(var(--text-2))]" >{p.latency}ms</td>
                  <td className="px-4 py-3 text-right">
                    <Badge className="rounded-none bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-medium">{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Budget Alert Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Set Budget Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Set a weekly cost threshold. You will receive a warning when spending exceeds this amount.
            </p>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Weekly Budget Threshold ($)</label>
              <Input value={budgetThreshold} onChange={e => setBudgetThreshold(e.target.value)}
                type="number" placeholder="15.00" style={{ borderRadius: 0 }} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(220 90% 56% / 0.06)', border: '1px solid hsl(220 90% 56% / 0.2)', borderRadius: 0 }}>
              <Info size={12} className="text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Current weekly spend: <strong>${totalCost.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSetBudget} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>Set Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
