// SPDX-License-Identifier: Apache-2.0
// Fallback Failovers — real `fallback_logs` events (primary → fallback model
// failovers), interlinked to the model registry by uuid and to live traces by
// trace_id. All KPIs and the elevated-activity callout are computed from data.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowsClockwise, Eye, Warning, Export, X, Copy, UserCircleGear, ArrowRight,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import { FilterBar } from '@/components/ui/FilterBar';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { TrustEngineTabs } from '../../components/trust-engine/TrustEngineTabs';
import { useFallbackLogs } from '../../hooks/useFallbackLogs';
import { useModelOptions } from '@/hooks/useAiiaData';
import type { FallbackLogRecord } from '@/services/fallbackService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRIGGER_META: Record<string, { bg: string; color: string; label: string }> = {
  timeout: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', label: 'Timeout' },
  rate_limit: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', label: 'Rate Limit' },
  error: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', label: 'Error' },
  quality: { bg: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))', label: 'Quality' },
};

function triggerBadge(reason: string) {
  const s = TRIGGER_META[reason] ?? { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', label: reason };
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10, fontWeight: 600 }}>{s.label}</Badge>;
}

function outcomeBadge(succeeded: boolean) {
  return (
    <Badge style={{
      background: succeeded ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
      color: succeeded ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
      borderRadius: 0, fontSize: 10, fontWeight: 600,
    }}>
      {succeeded ? 'Succeeded' : 'Failed'}
    </Badge>
  );
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Main component ────────────────────────────────────────────────────────────

export default function FallbackLog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');
  const { data: entries, isLoading, error } = useFallbackLogs();
  const { models } = useModelOptions();

  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [selected, setSelected] = useState<FallbackLogRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Resolve registry name at render time; stored snapshot is the fallback.
  const resolveName = (modelId: string | null, snapshot: string | null) =>
    (modelId ? models.find(m => m.id === modelId)?.name : undefined) ?? snapshot ?? 'Unavailable';

  const modelPill = (modelId: string | null, snapshot: string | null, tone: 'primary' | 'fallback') => {
    const name = resolveName(modelId, snapshot);
    const color = tone === 'primary' ? 'hsl(var(--destructive))' : 'hsl(var(--brand))';
    if (!modelId) {
      return <span className="text-xs px-2 py-0.5" style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))', borderRadius: 9999 }}>{name}</span>;
    }
    return (
      <button onClick={() => navigate(`/models/inventory/${modelId}`)}
        className="text-xs px-2 py-0.5 hover:underline"
        style={{ background: 'hsl(var(--bg-raised))', color, borderRadius: 9999 }}>
        {name}
      </button>
    );
  };

  const filtered = useMemo(() => entries.filter(e => {
    if (modelParam && e.primaryModelId !== modelParam && e.fallbackModelId !== modelParam) return false;
    if (triggerFilter && e.triggerReason !== triggerFilter) return false;
    if (outcomeFilter === 'succeeded' && !e.succeeded) return false;
    if (outcomeFilter === 'failed' && e.succeeded) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [
        e.requestId ?? '', e.traceRef ?? '',
        resolveName(e.primaryModelId, e.primaryModel),
        resolveName(e.fallbackModelId, e.fallbackModel),
        e.triggerReason,
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [entries, modelParam, triggerFilter, outcomeFilter, search, models]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── KPIs (with empty guards) ───────────────────────────────────────────────
  const total = entries.length;
  const succeededCount = entries.filter(e => e.succeeded).length;
  const failedCount = total - succeededCount;
  const successRate = total > 0 ? Math.round((succeededCount / total) * 100) : null;
  const latencies = entries.map(e => e.latencyMs).filter((l): l is number => l != null);
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

  // ── Elevated-activity callout — real computation, honest wording ───────────
  // Compare last-24h count against the daily average across the observed window;
  // only shown when genuinely elevated (≥2× average and at least 3 events).
  const spike = useMemo(() => {
    if (entries.length === 0) return null;
    const now = Date.now();
    const last24h = entries.filter(e => now - new Date(e.occurredAt).getTime() <= 86_400_000).length;
    const days = new Set(entries.map(e => e.occurredAt.slice(0, 10))).size;
    const dailyAvg = entries.length / Math.max(days, 1);
    if (last24h >= 3 && last24h >= 2 * dailyAvg) return { last24h, dailyAvg, days };
    return null;
  }, [entries]);

  const handleExport = () => {
    if (entries.length === 0) { toast.error('No fallback events to export'); return; }
    const csv = ['Occurred At,Primary Model,Fallback Model,Trigger,Latency (ms),Outcome,Request ID,Trace Ref,Error']
      .concat(filtered.map(e => [
        e.occurredAt,
        `"${resolveName(e.primaryModelId, e.primaryModel)}"`,
        `"${resolveName(e.fallbackModelId, e.fallbackModel)}"`,
        e.triggerReason, e.latencyMs ?? '', e.succeeded ? 'succeeded' : 'failed',
        e.requestId ?? '', e.traceRef ?? '', `"${(e.errorMessage ?? '').replace(/"/g, '""')}"`,
      ].join(',')))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'fallback-failovers.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported fallback failovers to CSV');
  };

  const copyTraceRef = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      toast.success(`Copied ${ref}`);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const activeFilterCount = (triggerFilter ? 1 : 0) + (outcomeFilter ? 1 : 0) + (modelParam ? 1 : 0);

  if (isLoading) return <PageSkeleton title="Fallback Failovers" />;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <TrustEngineTabs />

        <PageHeader
          title="Fallback Failovers"
          subtitle="Model failover chain events — primary → fallback routing with outcome and latency"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Trust Engine', href: '/trust-engine' }, { label: 'Fallback Failovers' }]}
          actions={
            <Button variant="outline" size="sm" onClick={handleExport} style={{ borderRadius: 0 }}>
              <Export size={14} />Export CSV
            </Button>
          }
        />

        {error && (
          <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
            <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load fallback events</p>
            <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{error.message}</p>
          </div>
        )}

        {/* Model-scoped filter chip (?model=<uuid>, matches primary or fallback) */}
        {modelParam && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
              <span>Filtered to <strong>{models.find(m => m.id === modelParam)?.name ?? 'Unavailable'}</strong> (as primary or fallback)</span>
              <button aria-label="Clear model filter" onClick={() => setSearchParams({})}
                className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
                <X size={14} />
              </button>
            </span>
          </div>
        )}

        {/* Elevated-activity callout — only when actually elevated */}
        {spike && (
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))', borderRadius: 0 }}>
            <Warning size={14} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />
            <p className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>
              <strong>Elevated fallback activity:</strong> {spike.last24h} failovers in the last 24h vs a daily
              average of {spike.dailyAvg.toFixed(1)} over the past {spike.days} observed day{spike.days !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

        <StatCardRow cards={[
          { label: 'Total Failovers', value: total, description: `Total failover events: ${total}` },
          { label: 'Success Rate', value: successRate != null ? `${successRate}%` : '—', description: successRate != null ? `Failovers where the fallback model succeeded: ${successRate}%` : 'No events yet' },
          { label: 'Failed Failovers', value: failedCount, description: `Failovers where the fallback also failed: ${failedCount}` },
          { label: 'Avg Failover Latency', value: avgLatency != null ? `${(avgLatency / 1000).toFixed(1)}s` : '—', description: avgLatency != null ? `Average failover latency ${Math.round(avgLatency)}ms` : 'No latency data' },
        ]} />

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by model, request ID, trace ref…"
          filters={[
            {
              key: 'trigger', label: 'Trigger', value: triggerFilter, onChange: setTriggerFilter,
              options: [
                { label: 'Timeout', value: 'timeout' },
                { label: 'Rate Limit', value: 'rate_limit' },
                { label: 'Error', value: 'error' },
                { label: 'Quality', value: 'quality' },
              ],
            },
            {
              key: 'outcome', label: 'Outcome', value: outcomeFilter, onChange: setOutcomeFilter,
              options: [
                { label: 'Succeeded', value: 'succeeded' },
                { label: 'Failed', value: 'failed' },
              ],
            },
          ]}
          activeFilterCount={activeFilterCount}
          onClearAll={() => { setSearch(''); setTriggerFilter(''); setOutcomeFilter(''); if (modelParam) setSearchParams({}); }}
          trailing={<span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>}
        />

        {/* Table */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                <ArrowsClockwise size={32} className="mb-2 opacity-40" />
                <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>
                  {entries.length === 0 ? 'No fallback events recorded yet' : 'No events match your filters'}
                </p>
                {entries.length === 0 && (
                  <p className="text-xs mt-1">Failover events appear here when a primary model call is rerouted to its fallback.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Occurred', 'Primary Model', '', 'Fallback Model', 'Trigger', 'Latency', 'Outcome', 'Trace', 'Request', ''].map((h, i) => (
                        <th key={i} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{fmtWhen(e.occurredAt)}</td>
                        <td className="px-3 py-3">{modelPill(e.primaryModelId, e.primaryModel, 'primary')}</td>
                        <td className="px-1 py-3"><ArrowRight size={12} style={{ color: 'hsl(var(--text-4))' }} /></td>
                        <td className="px-3 py-3">{modelPill(e.fallbackModelId, e.fallbackModel, 'fallback')}</td>
                        <td className="px-3 py-3">{triggerBadge(e.triggerReason)}</td>
                        <td className="px-3 py-3 text-xs font-mono" style={{ color: (e.latencyMs ?? 0) > 10000 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>
                          {e.latencyMs != null ? `${(e.latencyMs / 1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="px-3 py-3">{outcomeBadge(e.succeeded)}</td>
                        <td className="px-3 py-3">
                          {e.traceRef ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-xs font-mono" style={{ color: 'hsl(var(--s-in-tx))' }}>{e.traceRef}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button aria-label="Copy trace ref" onClick={() => copyTraceRef(e.traceRef!)}
                                    className="p-0.5 hover:opacity-70">
                                    <Copy size={12} style={{ color: 'hsl(var(--text-4))' }} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent style={{ borderRadius: 0 }}>Copy trace ref — find it on the Live Traces page</TooltipContent>
                              </Tooltip>
                            </span>
                          ) : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                        </td>
                        <td className="px-3 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{e.requestId ?? '—'}</td>
                        <td className="px-3 py-3">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelected(e); setSheetOpen(true); }}>
                            <Eye size={13} style={{ color: 'hsl(var(--brand))' }} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto" style={{ borderRadius: 0 }}>
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                    <ArrowsClockwise size={18} style={{ color: 'hsl(var(--brand))' }} />
                    Failover — {fmtWhen(selected.occurredAt)}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Primary Model (failed)</span>
                      <div className="mt-1">{modelPill(selected.primaryModelId, selected.primaryModel, 'primary')}</div>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Fallback Model</span>
                      <div className="mt-1">{modelPill(selected.fallbackModelId, selected.fallbackModel, 'fallback')}</div>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Trigger</span>
                      <div className="mt-1">{triggerBadge(selected.triggerReason)}</div>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Outcome</span>
                      <div className="mt-1">{outcomeBadge(selected.succeeded)}</div>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Failover Latency</span>
                      <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                        {selected.latencyMs != null ? `${selected.latencyMs.toLocaleString()}ms` : '—'}
                      </p>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Request ID</span>
                      <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.requestId ?? '—'}</p>
                    </div>
                  </div>

                  <div className="p-3" style={{ border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Linked Trace</span>
                    {selected.traceRef ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-mono" style={{ color: 'hsl(var(--s-in-tx))' }}>{selected.traceRef}</span>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" style={{ borderRadius: 0 }}
                          onClick={() => copyTraceRef(selected.traceRef!)}>
                          <Copy size={12} />Copy ref
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-4))' }}>No trace linked to this event</p>
                    )}
                    {selected.traceRef && (
                      <p className="text-xs mt-1.5" style={{ color: 'hsl(var(--text-4))' }}>
                        Look this ref up on the Live Traces page (Trust Engine → Traces).
                      </p>
                    )}
                  </div>

                  {selected.errorMessage && (
                    <div className="p-3" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0 }}>
                      <p className="text-xs font-semibold text-[hsl(var(--destructive))]">Error</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>{selected.errorMessage}</p>
                    </div>
                  )}

                  {!selected.succeeded && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <Button size="sm" variant="outline" disabled style={{ borderRadius: 0 }}>
                            <UserCircleGear size={14} />Create HITL Review
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent style={{ borderRadius: 0, maxWidth: 260 }}>
                        HITL review escalation is not connected to a backend yet, so this action is disabled rather than simulated.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
