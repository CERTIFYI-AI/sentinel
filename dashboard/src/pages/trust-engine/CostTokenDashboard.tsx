import { useState } from 'react';
import { Export, CalendarBlank, CurrencyDollar, ChartBar } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell
} from 'recharts';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

const DAILY_TOKENS = [
  { day: 'Mon', tokens: 148000 },
  { day: 'Tue', tokens: 172000 },
  { day: 'Wed', tokens: 163000 },
  { day: 'Thu', tokens: 198000 },
  { day: 'Fri', tokens: 184000 },
  { day: 'Sat', tokens: 92000 },
  { day: 'Sun', tokens: 74000 },
];

const DAILY_COST = [
  { day: 'Mon', cost: 18.4 },
  { day: 'Tue', cost: 21.6 },
  { day: 'Wed', cost: 20.3 },
  { day: 'Thu', cost: 24.8 },
  { day: 'Fri', cost: 23.1 },
  { day: 'Sat', cost: 11.5 },
  { day: 'Sun', cost: 9.2 },
];

const COST_BY_MODEL = [
  { model: 'GPT-4o', cost: 67.4, color: '#10b981' },
  { model: 'Claude-3 Opus', cost: 31.2, color: '#6366f1' },
  { model: 'Claude-3 Haiku', cost: 12.8, color: '#8b5cf6' },
  { model: 'GPT-3.5', cost: 8.9, color: '#f59e0b' },
  { model: 'GPT-4 Turbo', cost: 6.2, color: '#ec4899' },
  { model: 'Mistral-7B', cost: 2.4, color: '#14b8a6' },
];

const TOKEN_BY_AGENT = [
  { agent: 'OpenAI-API-Connector', tokens: 245000 },
  { agent: 'DataLabeler-v2', tokens: 198000 },
  { agent: 'LoanAssistant', tokens: 142000 },
  { agent: 'SupportBot', tokens: 98000 },
  { agent: 'RiskAnalyzer', tokens: 64000 },
  { agent: 'ComplianceBot', tokens: 38000 },
];

const WEEK_TOTAL_COST = DAILY_COST.reduce((s, d) => s + d.cost, 0).toFixed(2);
const WEEK_TOTAL_TOKENS = DAILY_TOKENS.reduce((s, d) => s + d.tokens, 0);

export default function CostTokenDashboard() {
  const { orgName } = useSettingsStore();
  const chart = useChartTheme();
  const [dateRange, setDateRange] = useState('week');

  const handleExport = () => {
    const rows = DAILY_COST.map((d, i) => `${d.day},${d.cost},${DAILY_TOKENS[i].tokens}`);
    const csv = ['Day,Cost ($),Tokens', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'cost-token-report.csv';
    a.click();
  };

  const tooltipStyle = {
    contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 0, color: chart.tooltipText, fontSize: 12 }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Cost & Token Dashboard</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · LLM usage analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}>
              <CalendarBlank className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Total Cost This Week</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--brand))' }}>${WEEK_TOTAL_COST}</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>+12% vs last week</p>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Total Tokens This Week</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{(WEEK_TOTAL_TOKENS / 1000).toFixed(0)}K</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Across all agents</p>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Top Model by Cost</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>GPT-4o</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>${COST_BY_MODEL[0].cost} this week</p>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>Cost Per 1K Tokens</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>${((parseFloat(WEEK_TOTAL_COST) / WEEK_TOTAL_TOKENS) * 1000).toFixed(3)}</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Blended avg</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
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

        {/* Daily Cost Line */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Daily LLM Cost (Mon–Sun)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={DAILY_COST} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="day" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']} />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--brand))" strokeWidth={2} dot={{ fill: 'hsl(var(--brand))', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
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
                  {COST_BY_MODEL.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Token by Agent */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Token Usage by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-2">
              {TOKEN_BY_AGENT.map(item => {
                const pct = Math.round((item.tokens / TOKEN_BY_AGENT[0].tokens) * 100);
                return (
                  <div key={item.agent}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.agent}</span>
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{(item.tokens / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="h-1.5 w-full" style={{ background: 'hsl(var(--border))' }}>
                      <div className="h-1.5" style={{ width: `${pct}%`, background: 'hsl(var(--brand))' }} />
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
