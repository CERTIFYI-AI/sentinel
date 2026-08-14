// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// LiveTraceFeed — Live Inference Traces (/trust-engine/traces).
// Reads the real org-scoped live_traces table; "live" is a Supabase Realtime
// INSERT subscription (push, not poll) and the indicator reflects the real
// channel state. No simulated traces, no fabricated spans or I/O payloads —
// span-level instrumentation is honestly reported as not yet ingested.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Lightning, Export, ShieldCheck, X } from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import { FilterBar } from '@/components/ui/FilterBar';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import { useLiveTraces } from '@/hooks/useLiveTraces';
import { useModelOptions } from '@/hooks/useAiiaData';
import type { LiveTrace } from '@/services/liveTraceService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const secs = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (secs < 60) return secs < 5 ? 'just now' : `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fullTimestamp(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/** Human trace reference — never a raw uuid. */
function displayRef(t: Pick<LiveTrace, 'id' | 'traceRef'>): string {
  return t.traceRef ?? t.id.slice(0, 8).toUpperCase();
}

function statusBadge(status: string | null) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    success: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', label: 'Success' },
    blocked: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', label: 'Blocked' },
    error: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', label: 'Error' },
  };
  const s = (status && map[status]) || { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', label: status ?? 'Unknown' };
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>{s.label}</Badge>;
}

const WINDOW_OPTIONS = [
  { label: 'Last 24 hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: 'Last 7 days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Last 14 days', value: '14d', ms: 14 * 24 * 60 * 60 * 1000 },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function LiveTraceFeed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');
  const { models } = useModelOptions();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterWindow, setFilterWindow] = useState('');
  const [selectedTrace, setSelectedTrace] = useState<LiveTrace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Server-side filters (status/model/date); ?model=<uuid> deep-link wins.
  const effectiveModelId = modelParam || filterModel || undefined;
  const filters = useMemo(() => {
    const win = WINDOW_OPTIONS.find(w => w.value === filterWindow);
    return {
      status: filterStatus || undefined,
      modelId: effectiveModelId,
      since: win ? new Date(Date.now() - win.ms).toISOString() : undefined,
      limit: 100,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, effectiveModelId, filterWindow]);

  const { traces, isLoading, error, stats, isLive } = useLiveTraces(filters);

  // Client-side search over the fetched page.
  const filtered = useMemo(() => traces.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return displayRef(t).toLowerCase().includes(q)
      || (t.action ?? '').toLowerCase().includes(q)
      || (t.modelName ?? '').toLowerCase().includes(q);
  }), [traces, search]);

  const activeFilterCount = (filterStatus ? 1 : 0) + (filterWindow ? 1 : 0)
    + (filterModel && !modelParam ? 1 : 0) + (modelParam ? 1 : 0);

  const handleExport = () => {
    const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['Trace,Timestamp,Model,Action,Status,Latency(ms),TokensIn,TokensOut,CostUSD,Policy']
      .concat(filtered.map(t => [
        esc(displayRef(t)), esc(t.createdAt), esc(t.modelName), esc(t.action), esc(t.status),
        esc(t.latencyMs), esc(t.tokensIn), esc(t.tokensOut), esc(t.costUsd), esc(t.policyRef ?? t.policyName),
      ].join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'live-traces.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} traces to CSV`);
  };

  if (isLoading) return <PageSkeleton title="Live Inference Traces" />;

  return (
    <div className="space-y-6">

      <PageHeader
        title="Live Inference Traces"
        subtitle="Runtime inference traces streamed from the trust proxy — org-scoped, updated in real time"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Trust Engine', href: '/trust-engine' }, { label: 'Inference Traces' }]}
        badge={
          // Real subscription state — never claims LIVE without an open channel.
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border"
            style={{
              borderRadius: 0,
              background: isLive ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-nt-bg))',
              borderColor: isLive ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))',
              color: isLive ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
            }}
          >
            <span
              className={isLive ? 'animate-pulse' : ''}
              style={{ width: 7, height: 7, borderRadius: '50%', background: isLive ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}
            />
            {isLive ? 'Live' : 'Not connected'}
          </span>
        }
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} style={{ borderRadius: 0 }} disabled={filtered.length === 0}>
            <Export size={14} /> Export CSV
          </Button>
        }
      />

      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load traces</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{error.message}</p>
        </div>
      )}

      {/* Model-scoped deep-link chip (?model=<uuid>) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{models.find(m => m.id === modelParam)?.name ?? 'Unavailable'}</strong></span>
            <button
              aria-label="Clear model filter"
              onClick={() => setSearchParams({})}
              className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* 24h KPIs computed from real rows — null-guarded, never NaN */}
      <StatCardRow
        cards={[
          {
            label: 'Traces (24h)',
            value: stats ? stats.total : '—',
            description: `Traces ingested in the last 24 hours: ${stats?.total ?? 'unknown'}`,
          },
          {
            label: 'Blocked (24h)',
            value: stats ? stats.blocked : '—',
            description: `Traces blocked by policy in the last 24 hours: ${stats?.blocked ?? 'unknown'}`,
          },
          {
            label: 'Error rate (24h)',
            value: stats?.errorRatePct != null ? `${stats.errorRatePct.toFixed(1)}%` : '—',
            description: 'Share of traces that ended in a runtime error over the last 24 hours',
          },
          {
            label: 'Avg latency (24h)',
            value: stats?.avgLatencyMs != null ? `${stats.avgLatencyMs.toLocaleString()}ms` : '—',
            description: 'Mean end-to-end latency across traces in the last 24 hours',
          },
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by trace ref, action, model…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: filterStatus,
            onChange: setFilterStatus,
            options: [
              { label: 'Success', value: 'success' },
              { label: 'Blocked', value: 'blocked' },
              { label: 'Error', value: 'error' },
            ],
          },
          ...(!modelParam ? [{
            key: 'model',
            label: 'Model',
            value: filterModel,
            onChange: setFilterModel,
            options: models.map(m => ({ label: m.name, value: m.id })),
          }] : []),
          {
            key: 'window',
            label: 'Period',
            value: filterWindow,
            onChange: setFilterWindow,
            options: WINDOW_OPTIONS.map(w => ({ label: w.label, value: w.value })),
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearAll={() => {
          setSearch(''); setFilterStatus(''); setFilterModel(''); setFilterWindow('');
          if (modelParam) setSearchParams({});
        }}
        trailing={
          <span className="text-xs text-[hsl(var(--text-4))]">
            {filtered.length} trace{filtered.length !== 1 ? 's' : ''} (most recent 100)
          </span>
        }
      />

      {/* Table */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  {['Trace', 'Time', 'Model', 'Action', 'Status', 'Latency', 'Tokens (in / out)', 'Cost', 'Policy'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(trace => (
                  <tr
                    key={trace.id}
                    className="border-b hover:bg-raised transition-colors cursor-pointer"
                    style={{ borderColor: 'hsl(var(--border))' }}
                    onClick={() => { setSelectedTrace(trace); setSheetOpen(true); }}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>
                        {displayRef(trace)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }} title={fullTimestamp(trace.createdAt)}>
                      {timeAgo(trace.createdAt)}
                    </td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      {trace.modelId ? (
                        <InterlinkChip label={trace.modelName ?? 'Unavailable'} to={`/models/inventory/${trace.modelId}`} />
                      ) : (
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{trace.action ?? '—'}</td>
                    <td className="px-3 py-2.5">{statusBadge(trace.status)}</td>
                    <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap" style={{ color: (trace.latencyMs ?? 0) > 5000 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>
                      {trace.latencyMs != null ? `${trace.latencyMs.toLocaleString()}ms` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap" style={{ color: 'hsl(var(--text-3))' }}>
                      {trace.tokensIn.toLocaleString()} / {trace.tokensOut.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap" style={{ color: 'hsl(var(--text-3))' }}>
                      {trace.costUsd != null ? `$${trace.costUsd.toFixed(4)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      {trace.policyId ? (
                        <InterlinkChip
                          label={trace.policyRef ?? trace.policyName ?? 'Unavailable'}
                          to={`/trust-engine/guardrails?policy=${trace.policyId}`}
                        />
                      ) : (
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !error && (
              traces.length === 0 && activeFilterCount === 0 && !search ? (
                <div className="py-12 text-center">
                  <Lightning size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
                  <p className="text-sm text-[hsl(var(--text-3))]">No inference traces ingested for your organization yet.</p>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-1">
                    Traces appear here in real time once the trust proxy starts reporting inference activity.
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-[hsl(var(--text-4))]">
                  No traces match the current filters.
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trace Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedTrace && (
            <>
              <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Lightning size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  <span className="font-mono text-sm px-1.5 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>
                    {displayRef(selectedTrace)}
                  </span>
                  {statusBadge(selectedTrace.status)}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                {/* Real fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Model</span>
                    <div className="mt-1">
                      {selectedTrace.modelId ? (
                        <InterlinkChip label={selectedTrace.modelName ?? 'Unavailable'} to={`/models/inventory/${selectedTrace.modelId}`} />
                      ) : (
                        <span className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Agent</span>
                    <p className="text-sm mt-1" style={{ color: selectedTrace.agentName ? 'hsl(var(--text-1))' : 'hsl(var(--text-4))' }}>
                      {selectedTrace.agentName ?? 'Not attributed'}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Action</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedTrace.action ?? '—'}</p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Latency</span>
                    <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedTrace.latencyMs != null ? `${selectedTrace.latencyMs.toLocaleString()}ms` : '—'}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Tokens in / out</span>
                    <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedTrace.tokensIn.toLocaleString()} / {selectedTrace.tokensOut.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Cost</span>
                    <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedTrace.costUsd != null ? `$${selectedTrace.costUsd.toFixed(4)}` : '—'}
                    </p>
                  </div>
                  <div className="p-3 col-span-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{fullTimestamp(selectedTrace.createdAt)}</p>
                  </div>
                </div>

                {/* Policy evaluated (real trust_policies row) */}
                {selectedTrace.policyId ? (
                  <div className="p-3 space-y-2" style={{ background: 'hsl(var(--brand-subtle))', borderLeft: '3px solid hsl(var(--brand))', borderRadius: 0 }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck size={14} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                        <span className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--brand))' }}>
                          {selectedTrace.policyName ?? 'Unavailable'}
                        </span>
                        {selectedTrace.policyRef && (
                          <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{selectedTrace.policyRef}</span>
                        )}
                      </div>
                    </div>
                    <InterlinkChip
                      label="View guardrail activity"
                      to={`/trust-engine/guardrails?policy=${selectedTrace.policyId}`}
                    />
                  </div>
                ) : (
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No trust policy was evaluated for this trace.</p>
                  </div>
                )}

                {/* Honest empty section — no fabricated spans or I/O */}
                <div className="p-6 text-center" style={{ border: '1px dashed hsl(var(--border))', borderRadius: 0 }}>
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>
                    Span-level instrumentation not yet ingested
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                    This trace carries aggregate metrics only. Per-span waterfalls and input/output
                    payloads will appear here once the runtime proxy ships span ingestion.
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
