// SPDX-License-Identifier: Apache-2.0
// Trust Costs & Tokens — real aggregates over `cost_token_usage` (daily batch
// data, one row per model per day). Every KPI, chart and callout is computed
// from fetched rows; budgets persist to the DB via a throwing write.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CurrencyDollar, Export, WarningCircle, X, Bell } from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { TrustEngineTabs } from '../../components/trust-engine/TrustEngineTabs';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useCostMetrics, type CostRangeKey } from '../../hooks/useCostMetrics';
import { useModelOptions } from '@/hooks/useAiiaData';

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── Chart tooltips ────────────────────────────────────────────────────────────

function TrendTooltip({ active, payload, label, kind }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="px-3 py-2 text-xs shadow-lg space-y-1" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-mid))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
      <p className="font-semibold">{fmtDay(label)}</p>
      {kind === 'cost'
        ? <p>Cost: {fmtUsd(p.cost)}</p>
        : <p>Tokens: {fmtTokens(p.tokens)}</p>}
      <p style={{ color: 'hsl(var(--text-3))' }}>{p.requests.toLocaleString()} requests</p>
    </div>
  );
}

function ModelCostTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="px-3 py-2 text-xs shadow-lg space-y-1" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-mid))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
      <p className="font-semibold">{d.name}</p>
      <div className="flex justify-between gap-4"><span style={{ color: 'hsl(var(--text-3))' }}>Total cost:</span> <span>{fmtUsd(d.cost)}</span></div>
      <div className="flex justify-between gap-4"><span style={{ color: 'hsl(var(--text-3))' }}>Prompt tokens:</span> <span>{fmtTokens(d.promptTokens)}</span></div>
      <div className="flex justify-between gap-4"><span style={{ color: 'hsl(var(--text-3))' }}>Completion tokens:</span> <span>{fmtTokens(d.completionTokens)}</span></div>
      {d.budgetLimitUsd != null && (
        <div className="flex justify-between gap-4"><span style={{ color: 'hsl(var(--text-3))' }}>Daily budget:</span> <span>{fmtUsd(d.budgetLimitUsd)}</span></div>
      )}
      <p style={{ color: 'hsl(var(--text-4))' }}>Click to open model</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CostTokenDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');
  const ct = useChartTheme();
  const { models } = useModelOptions();
  const [range, setRange] = useState<CostRangeKey>('14d');
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetModelId, setBudgetModelId] = useState('');
  const [budgetInput, setBudgetInput] = useState('');

  const {
    rows, dailyTrend, costByModel, dataThrough,
    totalCost, totalTokens, activeModels, costPer1kTokens,
    costWoWPct, tokensWoWPct, budgetAlerts,
    isLoading, error, saveBudget,
  } = useCostMetrics(range, modelParam);

  // Resolve the registry name at render time; the stored snapshot is fallback.
  const resolveName = (modelId: string | null, snapshot: string | null) =>
    (modelId ? models.find(m => m.id === modelId)?.name : undefined) ?? snapshot ?? 'Unavailable';

  const modelChartData = useMemo(() => costByModel.map(m => ({
    ...m,
    name: resolveName(m.modelId, m.modelName),
  })), [costByModel, models]); // eslint-disable-line react-hooks/exhaustive-deps

  const openModel = (modelId?: string) => { if (modelId) navigate(`/models/inventory/${modelId}`); };

  const handleExportCSV = () => {
    if (rows.length === 0) { toast.error('No usage data to export'); return; }
    const csv = ['Date,Model,Prompt Tokens,Completion Tokens,Total Tokens,Cost (USD),Requests,Daily Budget (USD)']
      .concat(rows.map(r => [
        r.usageDate, `"${resolveName(r.modelId, r.modelName)}"`, r.promptTokens, r.completionTokens,
        r.totalTokens, r.costUsd.toFixed(2), r.requestCount, r.budgetLimitUsd != null ? r.budgetLimitUsd.toFixed(2) : '',
      ].join(',')))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `cost-token-usage-${dataThrough ?? 'export'}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported cost & token usage to CSV');
  };

  const openBudgetDialog = () => {
    const first = costByModel[0];
    const id = modelParam ?? first?.modelId ?? '';
    setBudgetModelId(id);
    const existing = costByModel.find(m => m.modelId === id)?.budgetLimitUsd;
    setBudgetInput(existing != null ? String(existing) : '');
    setBudgetDialogOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!budgetModelId) { toast.error('Select a model first'); return; }
    const trimmed = budgetInput.trim();
    const limit = trimmed === '' ? null : parseFloat(trimmed);
    if (limit !== null && (isNaN(limit) || limit <= 0)) { toast.error('Enter a positive daily budget, or leave empty to clear'); return; }
    try {
      await saveBudget.mutateAsync({ modelId: budgetModelId, limitUsd: limit });
      const name = resolveName(budgetModelId, costByModel.find(m => m.modelId === budgetModelId)?.modelName ?? null);
      toast.success(limit === null ? `Daily budget cleared for ${name}` : `Daily budget of ${fmtUsd(limit)} saved for ${name}`);
      setBudgetDialogOpen(false);
    } catch (e) {
      toast.error(`Failed to save budget: ${(e as Error).message}`);
    }
  };

  if (isLoading) return <PageSkeleton title="Trust Costs & Tokens" />;

  return (
    <div className="space-y-6">
      <TrustEngineTabs />

      <PageHeader
        title="Trust Costs & Tokens"
        subtitle="LLM token usage and spend per model, from the daily usage ledger"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Trust Engine', href: '/trust-engine' }, { label: 'Costs & Tokens' }]}
        badge={dataThrough ? (
          <Badge variant="outline" className="rounded-none text-xs font-normal text-[hsl(var(--text-3))]">
            Data through {fmtDay(dataThrough)}
          </Badge>
        ) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={v => setRange(v as CostRangeKey)}>
              <SelectTrigger className="h-8 w-36 text-xs" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="14d">Last 14 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={openBudgetDialog} style={{ borderRadius: 0 }}>
              <Bell size={14} />Set Model Budget
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} style={{ borderRadius: 0 }}>
              <Export size={14} />Export CSV
            </Button>
          </div>
        }
      />

      {/* Real query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load usage data</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{error.message}</p>
        </div>
      )}

      {/* Model-scoped filter chip (?model=<uuid> deep link) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{models.find(m => m.id === modelParam)?.name ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={() => setSearchParams({})}
              className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Budget callout — computed: models whose latest-day spend ≥80% of budget */}
      {budgetAlerts.map(a => (
        <div key={a.modelId} className="flex items-center justify-between gap-3 p-3"
          style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))', borderRadius: 0 }}>
          <div className="flex items-center gap-3 min-w-0">
            <WarningCircle size={20} weight="fill" className="shrink-0 text-[hsl(var(--s-wn-tx))]" />
            <p className="text-sm text-[hsl(var(--s-wn-tx))]">
              <strong>{resolveName(a.modelId, a.modelName)}</strong> is nearing its daily budget:{' '}
              {fmtUsd(a.latestDayCost)} of {fmtUsd(a.budgetLimitUsd)} ({Math.round(a.pct * 100)}%) on the latest recorded day.
            </p>
          </div>
          <button
            onClick={() => openModel(a.modelId)}
            className="shrink-0 inline-flex items-center px-3 py-1 text-xs font-medium bg-[hsl(var(--bg-surface))] border border-[hsl(var(--s-wn-br))] text-[hsl(var(--s-wn-tx))] hover:bg-[hsl(var(--brand-subtle))] rounded-none">
            View model
          </button>
        </div>
      ))}

      {/* KPIs — all computed; WoW deltas only when two full weeks of data exist */}
      <StatCardRow cards={[
        {
          label: 'Total Cost', value: fmtUsd(totalCost),
          delta: costWoWPct != null ? `${Math.abs(costWoWPct).toFixed(1)}% WoW` : undefined,
          deltaDir: costWoWPct != null ? (costWoWPct >= 0 ? 'up' : 'down') : undefined,
          isPositiveUp: false,
          description: `Total cost in window: ${fmtUsd(totalCost)}`,
        },
        {
          label: 'Total Tokens', value: fmtTokens(totalTokens),
          delta: tokensWoWPct != null ? `${Math.abs(tokensWoWPct).toFixed(1)}% WoW` : undefined,
          deltaDir: tokensWoWPct != null ? (tokensWoWPct >= 0 ? 'up' : 'down') : undefined,
          isPositiveUp: false,
          description: `Total tokens in window: ${totalTokens.toLocaleString()}`,
        },
        { label: 'Active Models', value: activeModels, description: `Models with recorded usage: ${activeModels}` },
        {
          label: 'Cost per 1K Tokens', value: costPer1kTokens != null ? `$${costPer1kTokens.toFixed(4)}` : '—',
          description: costPer1kTokens != null ? `Average cost per 1K tokens: $${costPer1kTokens.toFixed(4)}` : 'No usage data',
        },
      ]} />

      {rows.length === 0 && !error ? (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="py-12 text-center">
            <CurrencyDollar size={32} className="mx-auto mb-2 opacity-40" style={{ color: 'hsl(var(--text-4))' }} />
            <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>No usage recorded in this window</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
              The cost ledger is filled by the daily usage batch. Try a wider date range{modelParam ? ' or clear the model filter' : ''}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Row 1: daily cost + daily tokens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Daily Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                    <ReTooltip content={<TrendTooltip kind="cost" />} />
                    <Line type="monotone" dataKey="cost" stroke={ct.brand} strokeWidth={2} dot={{ fill: ct.brand, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Daily Token Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                    <YAxis tickFormatter={v => fmtTokens(Number(v))} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                    <ReTooltip content={<TrendTooltip kind="tokens" />} cursor={{ fill: 'hsl(var(--bg-raised))' }} />
                    <Bar dataKey="tokens" fill={ct.brand} maxBarSize={28} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: cost by model + tokens by model — keyed by uuid, click → model detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Cost by Model</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={modelChartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                    <ReTooltip content={<ModelCostTooltip />} cursor={{ fill: 'hsl(var(--bg-raised))' }} />
                    <Bar dataKey="cost" fill={ct.brand} maxBarSize={18} radius={[0, 4, 4, 0]} cursor="pointer"
                      onClick={(d: any) => openModel(d?.modelId)} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Click a bar to open the model record.</p>
              </CardContent>
            </Card>

            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Token Usage by Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {modelChartData.map(m => {
                  const pct = totalTokens > 0 ? (m.totalTokens / totalTokens) * 100 : 0;
                  return (
                    <div key={m.modelId}>
                      <div className="flex items-center justify-between mb-1">
                        <button onClick={() => openModel(m.modelId)}
                          className="text-xs font-medium hover:underline text-left"
                          style={{ color: 'hsl(var(--brand))' }}>
                          {m.name}
                        </button>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                          {fmtTokens(m.totalTokens)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                        <div className="h-full" style={{ width: `${Math.min(pct, 100)}%`, background: ct.brand, borderRadius: 0 }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Budget dialog — persists budget_limit_usd via throwing write */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Set Daily Model Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              The budget is stored on the model's usage ledger rows (budget_limit_usd). A callout appears
              on this page when the latest day's spend reaches 80% of the budget.
            </p>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Model</label>
              <Select value={budgetModelId} onValueChange={v => {
                setBudgetModelId(v);
                const existing = costByModel.find(m => m.modelId === v)?.budgetLimitUsd;
                setBudgetInput(existing != null ? String(existing) : '');
              }}>
                <SelectTrigger className="h-9 text-sm" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a model" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {costByModel.map(m => (
                    <SelectItem key={m.modelId} value={m.modelId}>{resolveName(m.modelId, m.modelName)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Daily budget (USD) — leave empty to clear</label>
              <Input value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                type="number" min="0" step="0.01" placeholder="e.g. 60.00" style={{ borderRadius: 0 }} />
            </div>
            {budgetModelId && (
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                Latest recorded day for this model:{' '}
                <strong style={{ color: 'hsl(var(--text-2))' }}>
                  {fmtUsd(costByModel.find(m => m.modelId === budgetModelId)?.latestDayCost ?? 0)}
                </strong>
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSaveBudget} disabled={saveBudget.isPending}
              style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {saveBudget.isPending ? 'Saving…' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
