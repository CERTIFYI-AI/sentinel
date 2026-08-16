// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Control Drift — compliance control drift over the REAL
// `control_evaluation_history` table. Distinct from model data drift: this
// tracks when a control's own evaluation trends adversely. Nothing here is
// simulated: rows come straight from the table, trends are the recorded
// metric_value series, and an empty table shows an honest empty state.
// Acknowledge / Mark reviewed append a real history row (checked insert);
// Raise NC writes a real audit finding via complianceOpsService.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Pulse, MagnifyingGlass, CaretRight, ShieldCheck, Warning, TrendDown } from '@phosphor-icons/react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { saveFinding } from '@/services/complianceOpsService';
import { useControlDriftAlerts } from '@/hooks/useControlDriftAlerts';
import { useAuthStore } from '@/stores/authStore';

// ── Real evaluation history access ─────────────────────────────────────────

interface EvalEvent {
  id: string;
  control_id: string | null;
  control_code: string;
  status: string;
  metric_value: number | null;
  drift_severity: string | null;
  drift_delta_pct: number | null;
  reason: string | null;
  evaluated_at: string;
}

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — evaluation history is unavailable');
  }
  return supabase;
}

async function fetchEvaluationHistory(): Promise<EvalEvent[]> {
  const { data, error } = await client()
    .from('control_evaluation_history')
    .select('id, control_id, control_code, status, metric_value, drift_severity, drift_delta_pct, reason, evaluated_at')
    .order('evaluated_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not load control evaluation history: ${error.message}`);
  return (data ?? []) as EvalEvent[];
}

// Checked insert — throws on failure so callers never report a false success.
async function insertEvaluationEvent(row: {
  control_id: string | null;
  control_code: string;
  status: string;
  reason: string;
}): Promise<void> {
  const { error } = await client()
    .from('control_evaluation_history')
    .insert({ ...row, evaluated_at: new Date().toISOString() });
  if (error) throw new Error(`The review did not persist: ${error.message}`);
}

// ── Derived per-control rows ────────────────────────────────────────────────

interface DriftRow {
  controlCode: string;
  controlId: string | null;
  latest: EvalEvent;
  trend: number[];          // recorded metric_value series, oldest → newest
  drift: string;            // latest recorded drift_severity (or NONE)
  deltaPct: number | null;  // latest recorded drift_delta_pct
  events: EvalEvent[];      // newest first
}

const DRIFT_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, WATCH: 2, NONE: 3 };
const DRIFT_STYLE: Record<string, { bg: string; tx: string; label: string }> = {
  CRITICAL: { bg: 'hsl(var(--r-cr-bg))', tx: 'hsl(var(--r-cr-tx))', label: 'Critical' },
  WARNING: { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))', label: 'Warning' },
  WATCH: { bg: 'hsl(var(--s-in-bg))', tx: 'hsl(var(--s-in-tx))', label: 'Watch' },
  NONE: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))', label: 'Stable' },
};

const normDrift = (s?: string | null) => {
  const v = (s ?? '').toUpperCase();
  return v in DRIFT_STYLE ? v : 'NONE';
};

// Finding severity from the recorded drift severity — no invented mapping to numbers.
const findingSeverity = (drift: string) =>
  drift === 'CRITICAL' ? 'critical' : drift === 'WARNING' ? 'major' : 'moderate';

function groupByControl(events: EvalEvent[]): DriftRow[] {
  const byCode = new Map<string, EvalEvent[]>();
  for (const e of events) {
    const list = byCode.get(e.control_code) ?? [];
    list.push(e); // events arrive newest-first
    byCode.set(e.control_code, list);
  }
  const rows: DriftRow[] = [];
  for (const [code, list] of byCode) {
    const latest = list[0];
    const trend = [...list]
      .reverse()
      .map((e) => (e.metric_value != null ? Number(e.metric_value) : null))
      .filter((v): v is number => v != null);
    rows.push({
      controlCode: code,
      controlId: latest.control_id,
      latest,
      trend,
      drift: normDrift(latest.drift_severity),
      deltaPct: latest.drift_delta_pct != null ? Number(latest.drift_delta_pct) : null,
      events: list,
    });
  }
  return rows.sort((a, b) => (DRIFT_ORDER[a.drift] ?? 3) - (DRIFT_ORDER[b.drift] ?? 3));
}

function Sparkline({ trend, color }: { trend: number[]; color: string }) {
  if (trend.length < 2) return <span style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>—</span>;
  const w = 68, h = 18, min = Math.min(...trend), max = Math.max(...trend), span = max - min || 1;
  const pts = trend.map((v, i) => `${(i / (trend.length - 1)) * w},${h - ((v - min) / span) * (h - 2) - 1}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ControlDrift() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [sev, setSev] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  useControlDriftAlerts(); // live drift/regulatory alerts via Supabase Realtime

  const historyQuery = useQuery({
    queryKey: ['control-eval-history'],
    queryFn: fetchEvaluationHistory,
    staleTime: 30_000,
  });

  const actor = user?.fullName || user?.email || 'Unknown user';

  // Acknowledge / Mark reviewed — a real history row, written and checked.
  const review = useMutation({
    mutationFn: (v: { row: DriftRow; status: 'acknowledged' | 'reviewed' }) =>
      insertEvaluationEvent({
        control_id: v.row.controlId,
        control_code: v.row.controlCode,
        status: v.status,
        reason: `${v.status === 'acknowledged' ? 'Acknowledged' : 'Marked reviewed'} by ${actor}`,
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['control-eval-history'] });
      toast.success(`${v.row.controlCode}: ${v.status === 'acknowledged' ? 'acknowledged' : 'marked reviewed'}`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to record the review'),
  });

  // Raise NC — a real audit finding (audit_findings.audit_id is nullable for
  // standalone non-conformities raised outside a scheduled audit).
  const raiseNc = useMutation({
    mutationFn: (row: DriftRow) =>
      saveFinding({
        auditId: undefined as unknown as string, // standalone NC — no parent audit
        title: `Non-conformity: control ${row.controlCode} drifting`,
        description: row.latest.reason
          ? `Raised from Control Drift by ${actor}. Latest evaluation: ${row.latest.reason}`
          : `Raised from Control Drift by ${actor}.`,
        severity: findingSeverity(row.drift),
        status: 'open',
        linkedControlId: row.controlId,
      }),
    onSuccess: (_d, row) => {
      qc.invalidateQueries({ queryKey: ['cg-audit-findings'] });
      toast.success(`Non-conformity raised for ${row.controlCode}`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to raise the non-conformity'),
  });

  const rows = useMemo(() => groupByControl(historyQuery.data ?? []), [historyQuery.data]);
  const filtered = rows.filter((r) => {
    if (sev !== 'all' && r.drift !== sev) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.controlCode.toLowerCase().includes(q) && !(r.latest.reason ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const stats = {
    total: rows.length,
    critical: rows.filter((r) => r.drift === 'CRITICAL').length,
    warning: rows.filter((r) => r.drift === 'WARNING').length,
    watch: rows.filter((r) => r.drift === 'WATCH').length,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Control Drift"
        subtitle={`${stats.total} control${stats.total !== 1 ? 's' : ''} with recorded evaluations · trends from control_evaluation_history`}
        icon={Pulse}
        actions={
          <Button size="sm" variant="outline" leftIcon={<ShieldCheck size={14} />} onClick={() => nav('/control-testing')}>
            Go to Control Testing
          </Button>
        }
      />

      {/* Summary strip — derived from real rows */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Controls Tracked', value: stats.total, tx: 'hsl(var(--text-1))' },
          { label: 'Critical Drift', value: stats.critical, tx: 'hsl(var(--r-cr-tx))' },
          { label: 'Warning', value: stats.warning, tx: 'hsl(var(--s-wn-tx))' },
          { label: 'Watch', value: stats.watch, tx: 'hsl(var(--s-in-tx))' },
        ].map((s) => (
          <div key={s.label} className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
            <p className="text-2xl font-bold font-mono mt-0.5" style={{ color: s.tx }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search controls…"
            className="w-full pl-8 pr-2 py-1.5 text-sm" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
        </div>
        <Select value={sev} onValueChange={setSev}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All drift levels</SelectItem>
            {(['CRITICAL', 'WARNING', 'WATCH', 'NONE'] as const).map((d) => (
              <SelectItem key={d} value={d}>{DRIFT_STYLE[d].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs font-mono ml-auto" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length}/{rows.length}</span>
      </div>

      {/* Real states */}
      {historyQuery.isLoading && (
        <div className="p-8 text-center" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Loading evaluation history…</p>
        </div>
      )}
      {historyQuery.isError && (
        <div className="p-4" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}>
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>Failed to load evaluation history</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{(historyQuery.error as Error).message}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => historyQuery.refetch()}>Retry</Button>
        </div>
      )}
      {!historyQuery.isLoading && !historyQuery.isError && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16" style={{ background: 'hsl(var(--bg-surface))', border: '1px dashed hsl(var(--border))' }}>
          <Pulse size={36} style={{ color: 'hsl(var(--text-4))' }} />
          <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
            No evaluation history yet — drift trends appear once control evaluations run.
          </p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => nav('/control-testing')}>Go to Control Testing</Button>
        </div>
      )}

      {/* Drift table */}
      {rows.length > 0 && (
        <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                  {['Control', 'Latest Status', 'Trend (recorded)', 'Drift', 'Δ%', 'Last Evaluated'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    No controls match the current filters.
                  </td></tr>
                )}
                {filtered.map((r) => {
                  const d = DRIFT_STYLE[r.drift];
                  const open = expanded === r.controlCode;
                  const status = r.latest.status.toUpperCase();
                  const statusTx = status === 'FAIL' ? 'hsl(var(--s-er-tx))' : status === 'PASS' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))';
                  return (
                    <React.Fragment key={r.controlCode}>
                      <tr onClick={() => setExpanded(open ? null : r.controlCode)}
                        style={{ borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer' }} className="hover:bg-[hsl(var(--bg-raised))]">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CaretRight size={11} style={{ color: 'hsl(var(--text-4))', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .12s' }} />
                            <span className="font-mono text-[11px]" style={{ color: 'hsl(var(--text-2))' }}>{r.controlCode}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2"><span className="text-xs font-semibold" style={{ color: statusTx }}>{status}</span></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Sparkline trend={r.trend} color={d.tx} />
                            {r.trend.length > 0 && (
                              <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                                {(r.trend[r.trend.length - 1] * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2"><span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5" style={{ background: d.bg, color: d.tx }}>{d.label}</span></td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono" style={{ color: r.deltaPct != null && r.deltaPct < 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))' }}>
                            {r.deltaPct == null ? '—' : `${r.deltaPct > 0 ? '+' : ''}${r.deltaPct.toFixed(1)}%`}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right"><span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{formatDateTime(r.latest.evaluated_at)}</span></td>
                      </tr>
                      {open && (
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-sunken))' }}>
                          <td colSpan={6} className="px-3 py-3">
                            <div className="flex items-start gap-2 mb-2">
                              {r.drift === 'CRITICAL' ? <Warning size={15} style={{ color: d.tx, marginTop: 1 }} /> : r.drift === 'WARNING' ? <TrendDown size={15} style={{ color: d.tx, marginTop: 1 }} /> : <ShieldCheck size={15} style={{ color: d.tx, marginTop: 1 }} />}
                              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                                {r.latest.reason || 'No reason recorded on the latest evaluation.'}
                              </p>
                            </div>
                            <div className="mb-2 space-y-1">
                              {r.events.slice(0, 6).map((e) => (
                                <p key={e.id} className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                                  {formatDateTime(e.evaluated_at)} · {e.status.toUpperCase()}
                                  {e.metric_value != null ? ` · ${Number(e.metric_value).toFixed(3)}` : ''}
                                  {e.reason ? ` · ${e.reason}` : ''}
                                </p>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button size="xs" variant="outline" disabled={review.isPending}
                                onClick={(e) => { e.stopPropagation(); review.mutate({ row: r, status: 'acknowledged' }) }}>
                                Acknowledge
                              </Button>
                              <Button size="xs" variant="outline" disabled={review.isPending}
                                onClick={(e) => { e.stopPropagation(); review.mutate({ row: r, status: 'reviewed' }) }}>
                                Mark Reviewed
                              </Button>
                              <Button size="xs" variant="outline" disabled={raiseNc.isPending}
                                onClick={(e) => { e.stopPropagation(); raiseNc.mutate(r) }}>
                                Raise NC
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
