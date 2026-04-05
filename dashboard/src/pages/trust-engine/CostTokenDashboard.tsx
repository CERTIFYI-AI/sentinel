import { useState, useCallback } from 'react';
import { Export, CalendarBlank, TrendUp, TrendDown, Warning } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, ReferenceDot, ReferenceLine,
} from 'recharts';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Data ──────────────────────────────────────────────────────────────────────

const DAILY_TOKENS = [
  { day: 'Mon', tokens: 148000 }, { day: 'Tue', tokens: 172000 },
  { day: 'Wed', tokens: 163000 }, { day: 'Thu', tokens: 198000 },
  { day: 'Fri', tokens: 184000 }, { day: 'Sat', tokens: 92000 },
  { day: 'Sun', tokens: 74000 },
];

const DAILY_COST = [
  { day: 'Mon', cost: 18.4, projected: null },
  { day: 'Tue', cost: 21.6, projected: null },
  { day: 'Wed', cost: 20.3, projected: null },
  { day: 'Thu', cost: 24.8, projected: null },
  { day: 'Fri', cost: 23.1, projected: null },
  { day: 'Sat', cost: 11.5, projected: null },
  { day: 'Sun', cost: 9.2, projected: 9.2 },
  // Projected days (dotted line)
  { day: 'Mon+', cost: null, projected: 18.9 },
  { day: 'Tue+', cost: null, projected: 21.1 },
];

const COST_BY_MODEL = [
  { model: 'GPT-4o', cost: 67.4, color: '#10b981' },
  { model: 'Claude-3 Opus', cost: 31.2, color: '#6366f1' },
  { model: 'Claude-3 Haiku', cost: 12.8, color: '#8b5cf6' },
  { model: 'GPT-3.5', cost: 8.9, color: '#f59e0b' },
  { model: 'GPT-4 Turbo', cost: 6.2, color: '#ec4899' },
  { model: 'Mistral-7B', cost: 2.4, color: '#14b8a6' },
];

// Agent cost data with budget comparison — includes SupportBot and RiskAnalyzer (audit F-CT-004)
const AGENT_COST_DATA = [
  { agent: 'OpenAI-API-Connector', tokens: 245000, cost: 30.6, weeklyBudget: 250, dailyBudget: 50 },
  { agent: 'DataLabeler-v2', tokens: 198000, cost: 24.8, weeklyBudget: 150, dailyBudget: 30 },
  { agent: 'LoanAssistant', tokens: 142000, cost: 17.8, weeklyBudget: 100, dailyBudget: 20 },
  { agent: 'SupportBot', tokens: 98000, cost: 12.3, weeklyBudget: 80, dailyBudget: 16 },
  { agent: 'RiskAnalyzer', tokens: 64000, cost: 8.0, weeklyBudget: 60, dailyBudget: 12 },
  { agent: 'ComplianceBot', tokens: 38000, cost: 4.8, weeklyBudget: 50, dailyBudget: 10 },
];

const WEEK_TOTAL_COST = DAILY_COST.filter(d => d.cost !== null).reduce((s, d) => s + (d.cost || 0), 0);
const WEEK_TOTAL_TOKENS = DAILY_TOKENS.reduce((s, d) => s + d.tokens, 0);
const LAST_WEEK_COST = 114.8;
const WOW_CHANGE = ((WEEK_TOTAL_COST - LAST_WEEK_COST) / LAST_WEEK_COST) * 100;

// Anomaly detection: avg daily cost
const AVG_DAILY_COST = WEEK_TOTAL_COST / 7;
const DAILY_COST_WITH_ANOMALY = DAILY_COST.map(d => ({
  ...d,
  isAnomaly: d.cost !== null && d.cost > AVG_DAILY_COST * 2,
}));

// Cost efficiency metrics
const BLOCKED_CALLS = 6;
const TOTAL_INFERENCES = 94000;
const INCIDENT_COUNT = 3;
const COST_PER_1K_SUCCESSFUL = ((WEEK_TOTAL_COST / (WEEK_TOTAL_TOKENS - 0)) * 1000).toFixed(3);
const COST_PER_BLOCKED = (WEEK_TOTAL_COST / BLOCKED_CALLS).toFixed(2);
const COST_PER_INCIDENT = (WEEK_TOTAL_COST / INCIDENT_COUNT).toFixed(2);

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Main Component ────────────────────────────────────────────────────────────

export default function CostTokenDashboard() {
  const { orgName } = useSettingsStore();
  const chart = useChartTheme();
  const [dateRange, setDateRange] = useState('week');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleExport = () => {
    const csv = [
      ['Day', 'Cost ($)', 'Tokens', 'Anomaly'].join(','),
      ...DAILY_COST.filter(d => d.cost !== null).map((d, i) => [
        d.day, d.cost, DAILY_TOKENS[i]?.tokens || 0,
        (d.cost || 0) > AVG_DAILY_COST * 2 ? 'YES' : 'NO'
      ].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `cost-tokens-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast('Cost & token report exported');
  };

  const tooltipStyle = {
    contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 0, color: chart.tooltipText, fontSize: 12 }
  };

  const wowColor = WOW_CHANGE > 10 ? 'hsl(0 72% 51%)' : WOW_CHANGE > 5 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)';
  const wowBg = WOW_CHANGE > 10 ? 'hsl(0 72% 51% / 0.1)' : WOW_CHANGE > 5 ? 'hsl(45 93% 47% / 0.1)' : 'hsl(142 71% 45% / 0.1)';

  return (
    <div className="space-y-6">

      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(142 71% 45%)' : 'hsl(220 90% 56%)',
            color: '#fff', borderRadius: 0, minWidth: 260
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Cost & Token Dashboard</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · LLM usage analytics & budget management</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 h-9" style={{ borderRadius: 0 }}>
              <CalendarBlank className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>
      </div>

      {/* WoW Alert Banner */}
      {WOW_CHANGE > 10 && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'hsl(0 72% 51% / 0.1)', border: '1px solid hsl(0 72% 51% / 0.4)', borderRadius: 0 }}>
          <Warning size={16} style={{ color: 'hsl(0 72% 51%)' }} />
          <p className="text-sm" style={{ color: 'hsl(0 72% 51%)' }}>
            <strong>+{WOW_CHANGE.toFixed(1)}% WoW cost increase</strong> — exceeds 10% threshold. Root cause analysis required. Primary driver: GPT-4o usage up 18% driven by OpenAI-API-Connector batch processing.
          </p>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Total Cost This Week</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--brand))' }}>${WEEK_TOTAL_COST.toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-1 px-2 py-0.5 w-fit" style={{ background: wowBg, borderRadius: 0 }}>
              {WOW_CHANGE > 0 ? <TrendUp size={12} style={{ color: wowColor }} /> : <TrendDown size={12} style={{ color: wowColor }} />}
              <span className="text-xs font-medium" style={{ color: wowColor }}>+{WOW_CHANGE.toFixed(1)}% WoW</span>
            </div>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Total Tokens This Week</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{(WEEK_TOTAL_TOKENS / 1000).toFixed(0)}K</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Across 6 agents</p>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Top Model by Cost</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>GPT-4o</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>${COST_BY_MODEL[0].cost} this week (52.3%)</p>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Blended Cost / 1K Tokens</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>${((WEEK_TOTAL_COST / WEEK_TOTAL_TOKENS) * 1000).toFixed(3)}</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>All models averaged</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Efficiency Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Cost per 1K Successful Tokens', value: `$${COST_PER_1K_SUCCESSFUL}`, sub: 'Excluding blocked calls', color: 'hsl(var(--text-1))' },
          { label: 'Cost per Blocked Call', value: `$${COST_PER_BLOCKED}`, sub: `${BLOCKED_CALLS} blocked this week`, color: 'hsl(45 93% 47%)' },
          { label: 'Cost per Incident Triggered', value: `$${COST_PER_INCIDENT}`, sub: `${INCIDENT_COUNT} incidents this period`, color: 'hsl(0 72% 51%)' },
        ].map(m => (
          <Card key={m.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{m.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: m.color }}>{m.value}</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Token Usage */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Daily Token Usage (Mon–Sun)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={DAILY_TOKENS} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${(v / 1000).toFixed(0)}K tokens`, 'Tokens']} />
                <Bar dataKey="tokens" fill="hsl(var(--brand))" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Cost + Forecast */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Daily LLM Cost + Forecast</CardTitle>
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                <span className="inline-block w-8 h-0.5 mr-1 align-middle" style={{ background: 'hsl(var(--brand))', display: 'inline-block' }} />Actual
                <span className="inline-block w-8 h-0.5 ml-2 mr-1 align-middle" style={{ background: 'hsl(var(--brand))', display: 'inline-block', opacity: 0.4 }} />Forecast
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={DAILY_COST_WITH_ANOMALY} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="day" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v?.toFixed(2) || '—'}`, 'Cost']} />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--brand))" strokeWidth={2}
                  dot={(props: { cx: number; cy: number; payload: { isAnomaly?: boolean } }) => {
                    const { cx, cy, payload } = props;
                    if (!cx || !cy) return <g key="empty" />;
                    if (payload.isAnomaly) {
                      return <circle key={`dot-anomaly-${cx}`} cx={cx} cy={cy} r={5} fill="hsl(0 72% 51%)" stroke="none" />;
                    }
                    return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={3} fill="hsl(var(--brand))" stroke="none" />;
                  }}
                  connectNulls={false}
                />
                <Line type="monotone" dataKey="projected" stroke="hsl(var(--brand))" strokeWidth={1.5}
                  strokeDasharray="5 5" dot={false} connectNulls={true} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
              Red dots = cost anomaly (&gt;2× daily avg ${AVG_DAILY_COST.toFixed(2)}). Dotted = projected run rate.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost by Model */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Cost by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={COST_BY_MODEL} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="model" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']} />
                <Bar dataKey="cost" radius={0}>
                  {COST_BY_MODEL.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget vs Actual per Agent */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Budget vs. Actual per Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-1">
              {AGENT_COST_DATA.map(item => {
                const pct = Math.round((item.cost / item.weeklyBudget) * 100);
                const barColor = pct >= 90 ? 'hsl(0 72% 51%)' : pct >= 70 ? 'hsl(45 93% 47%)' : 'hsl(var(--brand))';
                return (
                  <div key={item.agent}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.agent}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                          ${item.cost.toFixed(1)} / ${item.weeklyBudget}
                        </span>
                        <span className="text-xs font-bold" style={{ color: barColor }}>{pct}%</span>
                        {pct >= 70 && (
                          <span className="text-xs px-1" style={{ background: barColor + '22', color: barColor, borderRadius: 0 }}>
                            {pct >= 90 ? '⚠ CRITICAL' : 'ALERT'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 w-full" style={{ background: 'hsl(var(--border))' }}>
                      <div className="h-2 transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{(item.tokens / 1000).toFixed(0)}K tokens</span>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Alert at 70%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
