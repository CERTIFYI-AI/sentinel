import { useState, useCallback } from 'react';
import {
  Eye, MagnifyingGlass, Export, Funnel, ArrowRight, Warning,
  GitFork, Lightning, UserCircle,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

type TriggerReason = 'rate_limit' | 'timeout' | 'api_error' | 'cost_limit' | 'context_overflow' | 'model_unavailable';

interface FallbackEvent {
  id: string; timestamp: string; agent: string;
  primaryModel: string; fallbackModel: string;
  reason: TriggerReason; reasonLabel: string;
  latencyMs: number; preWaitMs: number; fallbackMs: number;
  status: 'success' | 'failed';
  tokensUsed: number; tokensPrimary: number;
  details: string; slaImpact: number; // 0-100
  isHighRisk?: boolean;
}

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Data ──────────────────────────────────────────────────────────────────────

const HIGH_RISK_AGENTS = ['LoanAssistant', 'CreditRiskScorer'];

const FALLBACK_EVENTS: FallbackEvent[] = [
  {
    id: 'FB-001', timestamp: '2026-04-05T14:22:50.445Z', agent: 'RiskAnalyzer',
    primaryModel: 'GPT-4o', fallbackModel: 'Claude-3-Haiku',
    reason: 'rate_limit', reasonLabel: 'Rate limit exceeded',
    latencyMs: 1240, preWaitMs: 890, fallbackMs: 350, status: 'success',
    tokensUsed: 312, tokensPrimary: 0, slaImpact: 28,
    details: 'GPT-4o returned 429 Too Many Requests after 890ms retry wait. Routed to Claude-3-Haiku. Response generated successfully in 350ms.',
  },
  {
    id: 'FB-002', timestamp: '2026-04-05T13:48:22.100Z', agent: 'LoanAssistant',
    primaryModel: 'GPT-4o', fallbackModel: 'GPT-3.5-Turbo',
    reason: 'timeout', reasonLabel: 'Timeout (30s SLA)',
    latencyMs: 31200, preWaitMs: 30000, fallbackMs: 1200, status: 'success',
    tokensUsed: 756, tokensPrimary: 0, slaImpact: 87,
    details: 'Primary model response timed out after 30000ms. Fallback to GPT-3.5-Turbo succeeded in 1200ms. Total latency: 31.2s — SLA breach. NOTE: LoanAssistant fallback used lower-quality model for financial decision.',
    isHighRisk: true,
  },
  {
    id: 'FB-003', timestamp: '2026-04-05T12:15:11.000Z', agent: 'ComplianceBot',
    primaryModel: 'Claude-3-Opus', fallbackModel: 'Claude-3-Sonnet',
    reason: 'api_error', reasonLabel: '503 API error',
    latencyMs: 892, preWaitMs: 500, fallbackMs: 392, status: 'success',
    tokensUsed: 428, tokensPrimary: 0, slaImpact: 12,
    details: 'Anthropic API returned 503 Service Unavailable. Automatically routed to Claude-3-Sonnet fallback after 500ms. No data loss. Output quality maintained.',
  },
  {
    id: 'FB-004', timestamp: '2026-04-05T10:30:05.200Z', agent: 'DataLabeler-v2',
    primaryModel: 'GPT-4o', fallbackModel: 'Mistral-7B',
    reason: 'cost_limit', reasonLabel: 'Cost limit exceeded',
    latencyMs: 445, preWaitMs: 200, fallbackMs: 245, status: 'failed',
    tokensUsed: 0, tokensPrimary: 0, slaImpact: 100,
    details: 'Agent cost ceiling of $50/day reached at 10:30 AM. Fallback model Mistral-7B returned insufficient confidence (0.42 < 0.80 threshold). Request aborted. 500 records silently dropped.',
  },
  {
    id: 'FB-005', timestamp: '2026-04-05T09:10:44.800Z', agent: 'SupportBot',
    primaryModel: 'Claude-3-Opus', fallbackModel: 'GPT-4o-Mini',
    reason: 'context_overflow', reasonLabel: 'Context window exceeded',
    latencyMs: 678, preWaitMs: 120, fallbackMs: 558, status: 'success',
    tokensUsed: 2100, tokensPrimary: 0, slaImpact: 8,
    details: 'Input exceeded Claude-3-Opus 200K context window. Input truncated and routed to GPT-4o-Mini. Customer response delivered within acceptable latency.',
  },
  {
    id: 'FB-006', timestamp: '2026-04-05T08:45:20.000Z', agent: 'CreditRiskScorer',
    primaryModel: 'GPT-4o', fallbackModel: 'Claude-3-Sonnet',
    reason: 'rate_limit', reasonLabel: 'Rate limit exceeded',
    latencyMs: 2100, preWaitMs: 1800, fallbackMs: 300, status: 'success',
    tokensUsed: 534, tokensPrimary: 0, slaImpact: 42,
    details: 'GPT-4o rate limited during peak processing window. Routed to Claude-3-Sonnet. Credit scoring output quality verified within acceptable confidence bounds.',
    isHighRisk: true,
  },
  {
    id: 'FB-007', timestamp: '2026-04-05T07:20:10.000Z', agent: 'OpenAI-API-Connector',
    primaryModel: 'GPT-4-Turbo', fallbackModel: 'GPT-4o',
    reason: 'model_unavailable', reasonLabel: 'Model unavailable',
    latencyMs: 445, preWaitMs: 200, fallbackMs: 245, status: 'success',
    tokensUsed: 890, tokensPrimary: 0, slaImpact: 5,
    details: 'GPT-4-Turbo reported as unavailable by OpenAI API. Immediately fell back to GPT-4o. No user-facing impact.',
  },
  {
    id: 'FB-008', timestamp: '2026-04-04T22:55:30.000Z', agent: 'LoanAssistant',
    primaryModel: 'Claude-3-Opus', fallbackModel: 'Claude-3-Haiku',
    reason: 'api_error', reasonLabel: '429 Too Many Requests',
    latencyMs: 3400, preWaitMs: 3000, fallbackMs: 400, status: 'success',
    tokensUsed: 423, tokensPrimary: 0, slaImpact: 65,
    details: 'Anthropic Claude-3-Opus returned 429 after extended retry period. Fell back to Claude-3-Haiku. Loan decision support response delivered with lower confidence bounds.',
    isHighRisk: true,
  },
];

// Trend chart — 7 days, stacked by reason
const TREND_DATA = [
  { day: 'Mon', rate_limit: 2, timeout: 1, api_error: 0, cost_limit: 0, context_overflow: 1, model_unavailable: 0 },
  { day: 'Tue', rate_limit: 1, timeout: 0, api_error: 1, cost_limit: 0, context_overflow: 0, model_unavailable: 1 },
  { day: 'Wed', rate_limit: 3, timeout: 1, api_error: 2, cost_limit: 1, context_overflow: 0, model_unavailable: 0 },
  { day: 'Thu', rate_limit: 2, timeout: 2, api_error: 1, cost_limit: 0, context_overflow: 1, model_unavailable: 0 },
  { day: 'Fri', rate_limit: 4, timeout: 1, api_error: 0, cost_limit: 1, context_overflow: 2, model_unavailable: 1 },
  { day: 'Sat', rate_limit: 1, timeout: 0, api_error: 1, cost_limit: 0, context_overflow: 0, model_unavailable: 0 },
  { day: 'Sun', rate_limit: 3, timeout: 2, api_error: 1, cost_limit: 1, context_overflow: 1, model_unavailable: 1 },
];

const TREND_COLORS: Record<string, string> = {
  rate_limit: '#6366f1', timeout: '#f59e0b', api_error: '#ef4444',
  cost_limit: '#ec4899', context_overflow: '#14b8a6', model_unavailable: '#8b5cf6',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusBadge(status: FallbackEvent['status']) {
  return status === 'success'
    ? <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', borderRadius: 0, fontSize: 11 }}>Success</Badge>
    : <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 11 }}>Failed</Badge>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FallbackLog() {
  const { orgName } = useSettingsStore();
  const chart = useChartTheme();
  const [events] = useState<FallbackEvent[]>(FALLBACK_EVENTS);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewItem, setViewItem] = useState<FallbackEvent | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const agents = ['all', ...Array.from(new Set(events.map(e => e.agent)))];
  const reasons = ['all', ...Array.from(new Set(events.map(e => e.reason)))];

  const filtered = events.filter(e => {
    const matchSearch = e.agent.toLowerCase().includes(search.toLowerCase()) ||
      e.primaryModel.toLowerCase().includes(search.toLowerCase()) ||
      e.fallbackModel.toLowerCase().includes(search.toLowerCase()) ||
      e.reasonLabel.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    const matchAgent = agentFilter === 'all' || e.agent === agentFilter;
    const matchReason = reasonFilter === 'all' || e.reason === reasonFilter;
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchAgent && matchReason && matchStatus;
  });

  const successCount = events.filter(e => e.status === 'success').length;
  const failCount = events.filter(e => e.status === 'failed').length;
  const highRiskCount = events.filter(e => e.isHighRisk).length;

  const handleExport = () => {
    const csv = [
      ['ID', 'Timestamp', 'Agent', 'Primary Model', 'Fallback Model', 'Reason', 'Latency(ms)', 'Tokens', 'Status', 'SLA Impact', 'High Risk'].join(','),
      ...events.map(e => [e.id, e.timestamp, e.agent, e.primaryModel, e.fallbackModel, e.reasonLabel, e.latencyMs, e.tokensUsed, e.status, `${e.slaImpact}%`, e.isHighRisk ? 'YES' : 'NO'].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `fallback-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast('Fallback log exported');
  };

  const handleHITLReview = (e: FallbackEvent) => {
    toast(`HITL Review created for ${e.id} — ${e.agent} high-risk fallback`, 'info');
  };

  const tooltipStyle = {
    contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 0, color: chart.tooltipText, fontSize: 12 }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Toast layer */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
              background: t.type === 'success' ? 'hsl(142 71% 45%)' : t.type === 'error' ? 'hsl(0 72% 51%)' : 'hsl(220 90% 56%)',
              color: '#fff', borderRadius: 0, minWidth: 300
            }}>{t.text}</div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Fallback Log</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Model fallback chain events & SLA impact</p>
          </div>
          <Button variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>

        {/* FB-004 Critical Alert */}
        <div className="flex items-start gap-3 px-4 py-3" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.5)', borderRadius: 0 }}>
          <Warning size={16} className="mt-0.5 shrink-0" style={{ color: 'hsl(0 72% 51%)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(0 72% 51%)' }}>CRITICAL: FB-004 — DataLabeler-v2 Silent Data Loss</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
              500 records silently dropped when fallback to Mistral-7B failed — no downstream notification sent to data pipeline or model training team. Requires immediate incident creation.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Fallbacks', value: events.length, color: 'hsl(var(--text-1))' },
            { label: 'Successful', value: successCount, color: 'hsl(142 71% 45%)' },
            { label: 'Failed', value: failCount, color: 'hsl(0 72% 51%)' },
            { label: 'Success Rate', value: `${Math.round((successCount / events.length) * 100)}%`, color: 'hsl(var(--brand))' },
            { label: 'High-Risk Agent', value: highRiskCount, color: 'hsl(45 93% 47%)' },
          ].map(stat => (
            <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trend Chart */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Fallback Trend — Last 7 Days (by Trigger Reason)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={TREND_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: chart.axis }} />
                {Object.entries(TREND_COLORS).map(([key, color]) => (
                  <Bar key={key} dataKey={key} name={key.replace('_', ' ')} stackId="a" fill={color} radius={0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative min-w-52 max-w-xs">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search fallback events..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
          </div>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-44 h-9" style={{ borderRadius: 0 }}>
              <Funnel className="h-3 w-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {agents.map(a => <SelectItem key={a} value={a}>{a === 'all' ? 'All Agents' : a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-44 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {reasons.map(r => <SelectItem key={r} value={r}>{r === 'all' ? 'All Reasons' : r.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} events</span>
        </div>

        {/* Table */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                <GitFork size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No fallback events match your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['ID', 'Time', 'Agent', 'Model Chain', 'Reason', 'Latency', 'SLA Impact', 'Tokens', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.id}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{timeAgo(e.timestamp)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{e.agent}</span>
                            {e.isHighRisk && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0, fontSize: 9 }}>Model Downgrade</Badge>
                                </TooltipTrigger>
                                <TooltipContent style={{ borderRadius: 0, maxWidth: 260 }}>
                                  Decision made using fallback model with potentially lower quality. High-risk agent requires HITL review.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{e.primaryModel}</span>
                            <ArrowRight size={10} style={{ color: 'hsl(var(--text-4))' }} />
                            <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{e.fallbackModel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.reasonLabel}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: e.latencyMs > 5000 ? 'hsl(0 72% 51%)' : e.latencyMs > 1000 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' }}>
                          {e.latencyMs >= 1000 ? `${(e.latencyMs / 1000).toFixed(1)}s` : `${e.latencyMs}ms`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-16" style={{ background: 'hsl(var(--border))' }}>
                              <div className="h-1.5" style={{ width: `${e.slaImpact}%`, background: e.slaImpact >= 70 ? 'hsl(0 72% 51%)' : e.slaImpact >= 30 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' }} />
                            </div>
                            <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{e.slaImpact}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.tokensUsed}</td>
                        <td className="px-4 py-3">{statusBadge(e.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewItem(e)}>
                              <Eye size={14} />
                            </Button>
                            {e.isHighRisk && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" style={{ color: 'hsl(45 93% 47%)' }}
                                onClick={() => handleHITLReview(e)}>
                                <UserCircle size={12} className="mr-1" />HITL
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Sheet */}
        <Sheet open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <SheetContent style={{ borderRadius: 0, width: 540 }}>
            <SheetHeader><SheetTitle>Fallback Event — {viewItem?.id}</SheetTitle></SheetHeader>
            {viewItem && (
              <div className="mt-6 space-y-4 text-sm overflow-y-auto h-[calc(100vh-100px)]">
                <div className="flex gap-2 flex-wrap">
                  {statusBadge(viewItem.status)}
                  {viewItem.isHighRisk && (
                    <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(0 72% 51%)', borderRadius: 0 }}>Model Downgrade</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>ID</p><p className="font-mono">{viewItem.id}</p></div>
                  <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</p><p className="font-medium">{viewItem.agent}</p></div>
                  <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</p><p className="text-xs">{new Date(viewItem.timestamp).toLocaleString()}</p></div>
                  <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Trigger</p><p>{viewItem.reasonLabel}</p></div>
                </div>

                {/* Model Chain */}
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Model Chain</p>
                  <div className="flex items-center gap-2 p-2" style={{ background: 'hsl(var(--border) / 0.3)' }}>
                    <Badge style={{ background: 'hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0 }}>{viewItem.primaryModel}</Badge>
                    <ArrowRight size={14} style={{ color: 'hsl(var(--text-4))' }} />
                    <Badge style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{viewItem.fallbackModel}</Badge>
                  </div>
                </div>

                {/* Latency Breakdown */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Latency Breakdown</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Pre-fallback wait', ms: viewItem.preWaitMs, color: 'hsl(45 93% 47%)' },
                      { label: 'Fallback execution', ms: viewItem.fallbackMs, color: 'hsl(142 71% 45%)' },
                      { label: 'Total end-to-end', ms: viewItem.latencyMs, color: viewItem.latencyMs > 5000 ? 'hsl(0 72% 51%)' : 'hsl(var(--text-1))' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center text-xs">
                        <span style={{ color: 'hsl(var(--text-4))' }}>{item.label}</span>
                        <span className="font-mono font-bold" style={{ color: item.color }}>
                          {item.ms >= 1000 ? `${(item.ms / 1000).toFixed(2)}s` : `${item.ms}ms`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Token Comparison */}
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Token Usage</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2" style={{ background: 'hsl(var(--border) / 0.3)' }}>
                      <span style={{ color: 'hsl(var(--text-4))' }}>Primary consumed</span>
                      <p className="font-mono font-bold mt-1">{viewItem.tokensPrimary}</p>
                    </div>
                    <div className="p-2" style={{ background: 'hsl(var(--border) / 0.3)' }}>
                      <span style={{ color: 'hsl(var(--text-4))' }}>Fallback tokens</span>
                      <p className="font-mono font-bold mt-1">{viewItem.tokensUsed}</p>
                    </div>
                  </div>
                </div>

                {/* SLA Impact */}
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>SLA Impact Score</p>
                  <div className="flex items-center gap-2">
                    <div className="h-3 flex-1" style={{ background: 'hsl(var(--border))' }}>
                      <div className="h-3" style={{ width: `${viewItem.slaImpact}%`, background: viewItem.slaImpact >= 70 ? 'hsl(0 72% 51%)' : viewItem.slaImpact >= 30 ? 'hsl(45 93% 47%)' : 'hsl(142 71% 45%)' }} />
                    </div>
                    <span className="font-mono text-sm font-bold" style={{ color: viewItem.slaImpact >= 70 ? 'hsl(0 72% 51%)' : 'hsl(var(--text-1))' }}>{viewItem.slaImpact}%</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Details</p>
                  <p className="p-2 text-xs" style={{ background: 'hsl(var(--border) / 0.3)', lineHeight: 1.6 }}>{viewItem.details}</p>
                </div>

                <div className="flex gap-2 pt-2 flex-wrap">
                  {viewItem.isHighRisk && (
                    <Button size="sm" style={{ borderRadius: 0, background: 'hsl(45 93% 47%)', color: '#fff' }}
                      onClick={() => { handleHITLReview(viewItem); setViewItem(null); }}>
                      <UserCircle size={14} className="mr-1" />Create HITL Review
                    </Button>
                  )}
                  {viewItem.status === 'failed' && (
                    <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(0 72% 51%)' }}
                      onClick={() => { toast(`Incident created for ${viewItem.id}`, 'info'); setViewItem(null); }}>
                      <Lightning size={14} className="mr-1" />Escalate to Incident
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
