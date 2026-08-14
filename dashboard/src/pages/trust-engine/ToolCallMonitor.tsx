// SPDX-License-Identifier: Apache-2.0
// Tool Monitor — real `tool_call_logs` (agent tool invocations), interlinked to
// the model registry by uuid and to live traces by trace_id. The old hardcoded
// authorization matrix is replaced by an honest read-only "observed usage" view
// derived from the logs; escalation creates a REAL incident via incidentService.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Eye, Export, Wrench, Lightning, Warning, X, Copy,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import { FilterBar } from '@/components/ui/FilterBar';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { useToolCalls } from '../../hooks/useToolCalls';
import { useModelOptions } from '@/hooks/useAiiaData';
import { upsertIncident, type IncidentRecord } from '../../services/incidentService';
import type { ToolCallRecord } from '@/services/toolCallService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    success: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', label: 'Success' },
    error: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', label: 'Error' },
    blocked: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', label: 'Blocked' },
  };
  const s = map[status] ?? { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', label: status };
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 11 }}>{s.label}</Badge>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const fmtLatency = (ms: number | null) =>
  ms == null ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

const prettyJson = (v: unknown) => {
  if (v == null) return '—';
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
};

const argsPreview = (v: unknown) => {
  if (v == null) return '—';
  try { return JSON.stringify(v).slice(0, 60); } catch { return String(v).slice(0, 60); }
};

const DATE_WINDOWS: Record<string, number> = { '24h': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000 };

// ── Main component ────────────────────────────────────────────────────────────

export default function ToolCallMonitor() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');
  const { data: calls, isLoading, error } = useToolCalls();
  const { models } = useModelOptions();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toolFilter, setToolFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewItem, setViewItem] = useState<ToolCallRecord | null>(null);
  const [activeTab, setActiveTab] = useState('calls');
  const [escalating, setEscalating] = useState<string | null>(null);
  const [escalated, setEscalated] = useState<Record<string, string>>({}); // call id → incident id

  const resolveModelName = (modelId: string | null) =>
    modelId ? (models.find(m => m.id === modelId)?.name ?? 'Unavailable') : null;

  const toolOptions = useMemo(() => [...new Set(calls.map(c => c.toolName))].sort(), [calls]);

  const filtered = useMemo(() => calls.filter(c => {
    if (modelParam && c.modelId !== modelParam) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (toolFilter && c.toolName !== toolFilter) return false;
    if (dateFilter && DATE_WINDOWS[dateFilter] != null &&
      Date.now() - new Date(c.invokedAt).getTime() > DATE_WINDOWS[dateFilter]) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [c.agentName ?? '', c.toolName, c.invocationId ?? '', c.status, c.traceRef ?? ''].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [calls, modelParam, statusFilter, toolFilter, dateFilter, search]);

  // ── KPIs (with empty guards) ───────────────────────────────────────────────
  const total = calls.length;
  const successCount = calls.filter(c => c.status === 'success').length;
  const errorCount = calls.filter(c => c.status === 'error').length;
  const blockedCount = calls.filter(c => c.status === 'blocked').length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : null;

  // ── Computed callout: blocked calls in the last 7 days (else nothing) ──────
  const blockedRecent = useMemo(() =>
    calls.filter(c => c.status === 'blocked' && Date.now() - new Date(c.invokedAt).getTime() <= DATE_WINDOWS['7d']).length,
  [calls]);

  // ── Observed usage: distinct agent × tool with status mix, from real logs ──
  const observedUsage = useMemo(() => {
    const map = new Map<string, { agent: string; tool: string; total: number; success: number; error: number; blocked: number; lastUsed: string }>();
    for (const c of calls) {
      const agent = c.agentName ?? 'Unknown agent';
      const key = `${agent}::${c.toolName}`;
      const row = map.get(key) ?? { agent, tool: c.toolName, total: 0, success: 0, error: 0, blocked: 0, lastUsed: c.invokedAt };
      row.total += 1;
      if (c.status === 'success') row.success += 1;
      else if (c.status === 'error') row.error += 1;
      else if (c.status === 'blocked') row.blocked += 1;
      if (c.invokedAt > row.lastUsed) row.lastUsed = c.invokedAt;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.agent.localeCompare(b.agent) || a.tool.localeCompare(b.tool));
  }, [calls]);

  const handleEscalate = async (c: ToolCallRecord) => {
    if (escalated[c.id] || escalating) return;
    setEscalating(c.id);
    try {
      const modelName = resolveModelName(c.modelId);
      const rec = await upsertIncident({
        incident_type: 'ai_tool_call',
        severity: c.status === 'blocked' ? 'high' : 'medium',
        status: 'open',
        occurred_date: c.invokedAt,
        detected_date: new Date().toISOString(),
        reporter: 'Trust Engine — Tool Monitor',
        description: `Tool call ${c.invocationId ?? c.id} (${c.toolName}) by ${c.agentName ?? 'unknown agent'}` +
          `${modelName ? ` on model ${modelName}` : ''} ended in ${c.status.toUpperCase()}` +
          `${c.errorMessage ? `: ${c.errorMessage}` : '.'}`,
      } as unknown as Partial<IncidentRecord>);
      if (!rec) throw new Error('The incident write did not persist');
      setEscalated(prev => ({ ...prev, [c.id]: rec.id }));
      toast.success('Incident created — view it in the Incident Log', {
        action: { label: 'Open Incident Log', onClick: () => navigate('/risk/incidents') },
      });
    } catch (e) {
      toast.error(`Failed to create incident: ${(e as Error).message}`);
    } finally {
      setEscalating(null);
    }
  };

  const handleExport = () => {
    if (calls.length === 0) { toast.error('No tool calls to export'); return; }
    const csv = ['Invoked At,Agent,Tool,Status,Latency (ms),Invocation ID,Model,Trace Ref,Error']
      .concat(filtered.map(c => [
        c.invokedAt, `"${c.agentName ?? ''}"`, c.toolName, c.status, c.latencyMs ?? '',
        c.invocationId ?? '', `"${resolveModelName(c.modelId) ?? ''}"`, c.traceRef ?? '',
        `"${(c.errorMessage ?? '').replace(/"/g, '""')}"`,
      ].join(',')))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `tool-calls-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported tool call log to CSV');
  };

  const copyTraceRef = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      toast.success(`Copied ${ref}`);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const modelPill = (modelId: string | null) => {
    const name = resolveModelName(modelId);
    if (!modelId || !name) return <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>;
    return (
      <button onClick={() => navigate(`/models/inventory/${modelId}`)}
        className="text-xs px-2 py-0.5 hover:underline"
        style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--brand))', borderRadius: 9999 }}>
        {name}
      </button>
    );
  };

  const activeFilterCount = (statusFilter ? 1 : 0) + (toolFilter ? 1 : 0) + (dateFilter ? 1 : 0) + (modelParam ? 1 : 0);

  if (isLoading) return <PageSkeleton title="Tool Monitor" />;

  return (
    <div className="space-y-6">

      <PageHeader
        title="Tool Monitor"
        subtitle="Agent tool invocations from the trust-engine call log"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Trust Engine', href: '/trust-engine' }, { label: 'Tool Monitor' }]}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export size={14} />Export CSV
          </Button>
        }
      />

      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load tool calls</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{error.message}</p>
        </div>
      )}

      {/* Model-scoped filter chip (?model=<uuid>) */}
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

      {/* Computed callout — only when real data supports it */}
      {blockedRecent > 0 && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))', borderRadius: 0 }}>
          <Warning size={14} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />
          <p className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>
            <strong>{blockedRecent} tool call{blockedRecent !== 1 ? 's were' : ' was'} blocked in the last 7 days.</strong>{' '}
            Review the affected agents' authorizations in{' '}
            <button onClick={() => navigate('/agent-iam')} className="underline font-semibold">Agent Permissions (IAM)</button>.
          </p>
        </div>
      )}

      <StatCardRow cards={[
        { label: 'Total Calls', value: total, description: `Total tool calls recorded: ${total}` },
        { label: 'Success Rate', value: successRate != null ? `${successRate}%` : '—', description: successRate != null ? `Successful calls: ${successRate}%` : 'No calls recorded' },
        { label: 'Errors', value: errorCount, description: `Calls that ended in an error: ${errorCount}` },
        { label: 'Blocked', value: blockedCount, description: `Calls denied by authorization or guardrails: ${blockedCount}` },
      ]} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <TabsTrigger value="calls" style={{ borderRadius: 0 }}>Tool Calls ({total})</TabsTrigger>
          <TabsTrigger value="usage" style={{ borderRadius: 0 }}>Observed Usage</TabsTrigger>
        </TabsList>

        {/* ── Tool calls tab ── */}
        <TabsContent value="calls" className="mt-4 space-y-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by agent, tool, invocation ID…"
            filters={[
              {
                key: 'tool', label: 'Tool', value: toolFilter, onChange: setToolFilter,
                options: toolOptions.map(t => ({ label: t, value: t })),
              },
              {
                key: 'status', label: 'Status', value: statusFilter, onChange: setStatusFilter,
                options: [
                  { label: 'Success', value: 'success' },
                  { label: 'Error', value: 'error' },
                  { label: 'Blocked', value: 'blocked' },
                ],
              },
              {
                key: 'date', label: 'Period', value: dateFilter, onChange: setDateFilter,
                options: [
                  { label: 'Last 24h', value: '24h' },
                  { label: 'Last 7 days', value: '7d' },
                  { label: 'Last 30 days', value: '30d' },
                ],
              },
            ]}
            activeFilterCount={activeFilterCount}
            onClearAll={() => { setSearch(''); setStatusFilter(''); setToolFilter(''); setDateFilter(''); if (modelParam) setSearchParams({}); }}
            trailing={<span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} call{filtered.length !== 1 ? 's' : ''}</span>}
          />

          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <Wrench size={32} className="mb-2 opacity-40" />
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>
                    {calls.length === 0 ? 'No tool calls recorded yet' : 'No tool calls match your filters'}
                  </p>
                  {calls.length === 0 && (
                    <p className="text-xs mt-1">Agent tool invocations appear here as they are logged by the trust engine.</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Invoked', 'Agent', 'Tool', 'Args', 'Status', 'Latency', 'Model', 'Trace', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }} title={new Date(c.invokedAt).toLocaleString()}>
                            {timeAgo(c.invokedAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{c.agentName ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs px-2 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0 }}>
                              {c.toolName}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-48">
                            <span className="text-xs font-mono line-clamp-1" style={{ color: 'hsl(var(--text-4))' }}>{argsPreview(c.arguments)}</span>
                          </td>
                          <td className="px-4 py-3">{statusBadge(c.status)}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: (c.latencyMs ?? 0) > 1000 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
                            {fmtLatency(c.latencyMs)}
                          </td>
                          <td className="px-4 py-3">{modelPill(c.modelId)}</td>
                          <td className="px-4 py-3">
                            {c.traceRef ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="font-mono text-xs" style={{ color: 'hsl(var(--s-in-tx))' }}>{c.traceRef}</span>
                                <button aria-label="Copy trace ref" onClick={() => copyTraceRef(c.traceRef!)} className="p-0.5 hover:opacity-70">
                                  <Copy size={12} style={{ color: 'hsl(var(--text-4))' }} />
                                </button>
                              </span>
                            ) : <span style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewItem(c)}>
                                <Eye size={14} />
                              </Button>
                              {(c.status === 'blocked' || c.status === 'error') && (
                                escalated[c.id] ? (
                                  <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>Escalated</Badge>
                                ) : (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive"
                                    disabled={escalating === c.id} onClick={() => handleEscalate(c)}>
                                    <Lightning size={12} />{escalating === c.id ? 'Escalating…' : 'Escalate'}
                                  </Button>
                                )
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
        </TabsContent>

        {/* ── Observed usage tab — derived from logs, read-only ── */}
        <TabsContent value="usage" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                Observed usage (derived from logs)
              </CardTitle>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                Which agents have invoked which tools, with the outcome mix — computed from the call log above.
                This is an observation, not a policy. Permission management lives in{' '}
                <button onClick={() => navigate('/agent-iam')} className="underline" style={{ color: 'hsl(var(--brand))' }}>
                  Agent Permissions (IAM)
                </button>.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {observedUsage.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <Wrench size={32} className="mb-2 opacity-40" />
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>No usage observed yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Agent', 'Tool', 'Calls', 'Success', 'Error', 'Blocked', 'Last Used'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {observedUsage.map(row => (
                        <tr key={`${row.agent}::${row.tool}`} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{row.agent}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs px-2 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0 }}>
                              {row.tool}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{row.total}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: row.success > 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}>{row.success}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: row.error > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>{row.error}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: row.blocked > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }}>{row.blocked}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{timeAgo(row.lastUsed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail sheet */}
      <Sheet open={!!viewItem} onOpenChange={open => { if (!open) setViewItem(null); }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader>
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
                  Tool Call — {viewItem.invocationId ?? 'detail'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex gap-2 flex-wrap">{statusBadge(viewItem.status)}</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Agent</p>
                    <p className="font-medium text-xs mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.agentName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Invoked</p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{new Date(viewItem.invokedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Latency</p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: (viewItem.latencyMs ?? 0) > 1000 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
                      {fmtLatency(viewItem.latencyMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Model</p>
                    <div className="mt-0.5">{modelPill(viewItem.modelId)}</div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Tool</p>
                  <span className="font-mono text-xs px-2 py-1 inline-block" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0 }}>
                    {viewItem.toolName}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Arguments</p>
                  <pre className="p-2 text-xs font-mono overflow-auto" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0, maxHeight: 160, whiteSpace: 'pre-wrap' }}>
                    {prettyJson(viewItem.arguments)}
                  </pre>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Result</p>
                  <pre className="p-2 text-xs font-mono overflow-auto" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0, maxHeight: 160, whiteSpace: 'pre-wrap' }}>
                    {prettyJson(viewItem.result)}
                  </pre>
                </div>

                {viewItem.errorMessage && (
                  <div>
                    <p className="text-xs font-semibold mb-1 text-destructive">Error</p>
                    <p className="p-2 text-xs" style={{ background: 'hsl(var(--s-er-bg))', borderRadius: 0, color: 'hsl(var(--destructive))', lineHeight: 1.5 }}>
                      {viewItem.errorMessage}
                    </p>
                  </div>
                )}

                {viewItem.traceRef && (
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Linked Trace</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs" style={{ color: 'hsl(var(--s-in-tx))' }}>{viewItem.traceRef}</span>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-xs" style={{ borderRadius: 0 }}
                        onClick={() => copyTraceRef(viewItem.traceRef!)}>
                        <Copy size={12} />Copy ref
                      </Button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                      Look this ref up on the Live Traces page (Trust Engine → Traces).
                    </p>
                  </div>
                )}

                {(viewItem.status === 'blocked' || viewItem.status === 'error') && (
                  <div className="pt-2">
                    {escalated[viewItem.id] ? (
                      <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 11 }}>
                        Escalated to incident
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}
                        disabled={escalating === viewItem.id} onClick={() => handleEscalate(viewItem)}>
                        <Lightning size={14} />{escalating === viewItem.id ? 'Creating incident…' : 'Escalate to Incident'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
