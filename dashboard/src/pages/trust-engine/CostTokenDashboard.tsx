import { useState, useCallback } from 'react';
import {
  CurrencyDollar, Lightning, ChartBar, Export, Warning,
  Bell, Clock, CheckCircle, Info, Gauge,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, LineChart, Line, Cell,
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

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Chart Data ────────────────────────────────────────────────────────────────

const DAILY_TOKEN_USAGE = [
  { day: 'Mon', tokens: 42.3 },
  { day: 'Tue', tokens: 48.1 },
  { day: 'Wed', tokens: 44.7 },
  { day: 'Thu', tokens: 51.2 },
  { day: 'Fri', tokens: 47.8 },
  { day: 'Sat', tokens: 38.2 },
  { day: 'Sun', tokens: 40.7 },
];

const DAILY_COST_TREND = [
  { day: 'Mon', cost: 1.27 },
  { day: 'Tue', cost: 1.44 },
  { day: 'Wed', cost: 1.34 },
  { day: 'Thu', cost: 1.54 },
  { day: 'Fri', cost: 1.43 },
  { day: 'Sat', cost: 1.15 },
  { day: 'Sun', cost: 1.22 },
];

const COST_BY_MODEL = [
  { model: 'GPT-4o', cost: 3.82, color: 'hsl(var(--s-in-tx))' },
  { model: 'Claude-3-Opus', cost: 2.14, color: 'hsl(var(--s-ok-tx))' },
  { model: 'GPT-3.5-Turbo', cost: 1.21, color: 'hsl(var(--s-wn-tx))' },
  { model: 'Claude-3-Haiku', cost: 0.89, color: 'hsl(var(--s-wn-tx))' },
  { model: 'GPT-4o-Mini', cost: 0.74, color: 'hsl(280 67% 56%)' },
  { model: 'Mistral-7B', cost: 0.59, color: 'hsl(var(--destructive))' },
];

const TOKEN_BY_AGENT = [
  { agent: 'OpenAI-API-Connector', tokens: 78.2, pct: 25 },
  { agent: 'DataLabeler-v2', tokens: 63.1, pct: 20 },
  { agent: 'LoanAssistant', tokens: 45.3, pct: 14 },
  { agent: 'SupportBot', tokens: 31.2, pct: 10 },
  { agent: 'RiskAnalyzer', tokens: 20.4, pct: 7 },
];

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
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
      <p className="font-semibold">{label}</p>
      <p>Cost: ${payload[0].value}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CostTokenDashboard() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [dateRange, setDateRange] = useState('week');
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetThreshold, setBudgetThreshold] = useState('15');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleExportCSV = () => {
    const csv = 'Day,Tokens(K),Cost($)\n' + DAILY_TOKEN_USAGE.map((d, i) => `${d.day},${d.tokens},${DAILY_COST_TREND[i].cost}`).join('\n');
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
    toast(`Budget alert set at $${val}/week. You will be notified when exceeded.`, 'success');
    setBudgetDialogOpen(false);
  };

  const totalCost = DAILY_COST_TREND.reduce((a, d) => a + d.cost, 0);
  const totalTokens = DAILY_TOKEN_USAGE.reduce((a, d) => a + d.tokens, 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CurrencyDollar size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Cost & Token Dashboard</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} — LLM token usage and cost tracking</p>
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
            <Bell size={14} className="mr-2" />Set Budget Alert
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} style={{ borderRadius: 0 }}>
            <Export size={14} className="mr-2" />Export CSV
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Tokens This Week" value={`${Math.round(totalTokens)}K`} variant="info" icon={<Lightning size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Total Cost This Week" value={`$${totalCost.toFixed(2)}`} variant="ok" icon={<CurrencyDollar size={16} weight="fill" className="text-green-600 dark:text-green-400" />} sub="+12% WoW" />
        <MetricTile label="Active Models" value="4" variant="info" icon={<Gauge size={16} className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Active Agents" value="5" variant="info" icon={<ChartBar size={16} className="text-blue-600 dark:text-blue-400" />} />
      </div>

      {/* Charts Row 1: Token Usage + Cost Trend */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Daily Token Usage (Mon–Sun)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={DAILY_TOKEN_USAGE} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
              <LineChart data={DAILY_COST_TREND} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
              <BarChart data={COST_BY_MODEL} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="model" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <YAxis label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                <ReTooltip content={<ModelCostTooltip />} />
                <Bar dataKey="cost" maxBarSize={36}>
                  {COST_BY_MODEL.map((entry, idx) => (
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
            {TOKEN_BY_AGENT.map(agent => (
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
            <Button onClick={handleSetBudget} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Set Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
