// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Performance Monitoring — fleet-wide view over real telemetry in
// model_performance_metrics, keyed by ai_models.id (uuid). One card per
// registry model with its latest recorded metrics and real recorded_at trend
// series. No fabricated endpoints, histories, or SLO numbers: a model without
// telemetry renders an honest empty state.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Gauge, Warning, ArrowsClockwise, ArrowSquareOut, X, ChartLine,
} from '@phosphor-icons/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow } from '@/components/ui/StatCardRow';
import { FilterBar } from '@/components/ui/FilterBar';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useModelOptions } from '@/hooks/useAiiaData';
import {
  fetchAllPerformanceMetrics, type ModelPerfSeries, type PerfPoint,
} from '@/services/modelAnalyticsService';

const QUERY_KEY = ['model-performance-metrics'];

/* ── Honest formatting of recorded values ────────────────────────────────── */
const fmtMs = (v: number) => `${Math.round(v)}ms`;
// accuracy / error_rate are recorded as fractions (0..1); tolerate percent-scale rows.
const fmtRate = (v: number) => (v <= 1 ? `${(v * 100).toFixed(2)}%` : `${v.toFixed(2)}%`);
const fmtAcc = (v: number) => (v <= 1 ? `${(v * 100).toFixed(1)}%` : `${v.toFixed(1)}%`);
const fmtCost = (v: number) => `$${v.toFixed(5)}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString();

interface ModelRow {
  id: string;
  /** Registry display name; null when the id can't be resolved. */
  registryName: string | null;
  inRegistry: boolean;
  series: ModelPerfSeries | null;
}

export default function PerformanceMonitoring() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ct = useChartTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');
  const [search, setSearch] = useState('');

  const { models, loading: modelsLoading } = useModelOptions();
  const perfQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAllPerformanceMetrics,
    staleTime: 15_000,
  });
  const series = useMemo(() => perfQuery.data ?? [], [perfQuery.data]);

  // Resolve display names at render time from the registry — never a raw uuid.
  const displayName = (row: ModelRow) =>
    row.registryName ?? row.series?.modelName ?? 'Unavailable';

  // One row per registry model, plus any telemetry keyed to ids no longer in
  // the registry (shown honestly as "Unavailable", never dropped silently).
  const rows = useMemo<ModelRow[]>(() => {
    const byId = new Map(series.map(s => [s.modelId, s]));
    const out: ModelRow[] = models.map(m => ({
      id: m.id, registryName: m.name, inRegistry: true, series: byId.get(m.id) ?? null,
    }));
    for (const s of series) {
      if (!models.some(m => m.id === s.modelId)) {
        out.push({ id: s.modelId, registryName: null, inRegistry: false, series: s });
      }
    }
    return out;
  }, [models, series]);

  const filtered = useMemo(() => rows.filter(r => {
    if (modelParam && r.id !== modelParam) return false;
    if (!search) return true;
    return displayName(r).toLowerCase().includes(search.toLowerCase());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rows, modelParam, search]);

  const reporting = filtered.filter(r => r.series && r.series.points.length > 0);
  const silent = filtered.filter(r => !r.series || r.series.points.length === 0);

  const totalPoints = series.reduce((n, s) => n + s.points.length, 0);
  const ingestTimes = series.flatMap(s => s.points.map(p => p.recordedAt)).sort();
  const lastIngest = ingestTimes.length ? ingestTimes[ingestTimes.length - 1] : undefined;

  const chipName = modelParam
    ? (rows.find(r => r.id === modelParam) ? displayName(rows.find(r => r.id === modelParam)!) : 'Unavailable')
    : null;

  async function refresh() {
    const res = await perfQuery.refetch();
    if (res.error) toast.error(`Refresh failed: ${(res.error as Error).message}`);
    else toast.success('Telemetry refreshed');
    qc.invalidateQueries({ queryKey: ['model-options'] });
  }

  if (perfQuery.isLoading || modelsLoading) return <PageSkeleton title="Performance Monitoring" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Performance Monitoring"
        subtitle="Live model telemetry from model_performance_metrics — latency, throughput, accuracy, drift and cost per registry model"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Performance Monitoring' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={() => navigate('/trust-engine')}>
              <Gauge size={14} /> Runtime Trust
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={refresh}>
              <ArrowsClockwise size={14} /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={() => navigate('/trust-engine/config')}>
              <Warning size={14} /> Configure Alerts
            </Button>
          </div>
        }
      />

      <StatCardRow
        cards={[
          { label: 'Registry Models', value: models.length, description: `${models.length} models in the AI registry` },
          { label: 'Reporting Telemetry', value: series.filter(s => s.points.length > 0).length, description: `${series.filter(s => s.points.length > 0).length} models with recorded metrics` },
          { label: 'Telemetry Points', value: totalPoints, description: `${totalPoints} recorded metric rows` },
          { label: 'Last Ingest', value: lastIngest ? fmtDate(lastIngest) : '—', description: lastIngest ? `Last telemetry recorded ${fmtDateTime(lastIngest)}` : 'No telemetry recorded yet' },
        ]}
      />

      {perfQuery.isError && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load telemetry</p>
            <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(perfQuery.error as Error).message}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-none" onClick={refresh}>Retry</Button>
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search models…"
        activeFilterCount={modelParam ? 1 : 0}
        onClearAll={() => { setSearch(''); setSearchParams({}); }}
        trailing={
          <span className="text-xs text-[hsl(var(--text-4))]">
            {reporting.length} reporting · {silent.length} without telemetry
          </span>
        }
      />

      {/* Model-scoped filter chip (deep-link from a model's Governance card) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{chipName}</strong></span>
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

      {/* Reporting models — one card each, real recorded series */}
      {reporting.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          {reporting.map(row => (
            <ModelPerfCard key={row.id} row={row} name={displayName(row)} ct={ct}
              onOpen={row.inRegistry ? () => navigate(`/models/inventory/${row.id}`) : undefined} />
          ))}
        </div>
      )}

      {/* Honest empty states */}
      {reporting.length === 0 && !perfQuery.isError && (
        <Card style={{ borderRadius: 0 }}>
          <CardContent className="py-12 text-center">
            <ChartLine size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
            <p className="text-sm font-medium text-[hsl(var(--text-2))]">No telemetry recorded yet</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-1 max-w-md mx-auto">
              Metrics appear here once the inference proxy or an ingestion job writes rows to
              model_performance_metrics for {modelParam ? 'this model' : 'a registry model'} (latency, throughput, accuracy, error rate, drift, cost).
            </p>
          </CardContent>
        </Card>
      )}

      {silent.length > 0 && reporting.length > 0 && (
        <Card style={{ borderRadius: 0 }}>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">No telemetry recorded yet</p>
            <p className="text-xs text-[hsl(var(--text-4))] mb-3">
              These registry models have no rows in model_performance_metrics. Metrics appear once the
              inference proxy or an ingestion job records telemetry for them.
            </p>
            <div className="flex flex-wrap gap-2">
              {silent.map(row => (
                <button
                  key={row.id}
                  onClick={() => row.inRegistry && navigate(`/models/inventory/${row.id}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-none border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] cursor-pointer transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
                >
                  {displayName(row)} <ArrowSquareOut size={12} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Per-model card: latest recorded values + real trend series ──────────── */
function ModelPerfCard({ row, name, ct, onOpen }: {
  row: ModelRow;
  name: string;
  ct: ReturnType<typeof useChartTheme>;
  onOpen?: () => void;
}) {
  const points = row.series!.points; // recorded_at ascending
  const latest: PerfPoint = points[points.length - 1];
  const chartData = points.map(p => ({
    t: fmtDate(p.recordedAt),
    p50: p.latencyP50, p99: p.latencyP99, throughput: p.throughput,
  }));

  const tiles = [
    { label: 'Latency p50', value: fmtMs(latest.latencyP50) },
    { label: 'Latency p99', value: fmtMs(latest.latencyP99) },
    { label: 'Throughput', value: `${Math.round(latest.throughput).toLocaleString()}/s` },
    { label: 'Accuracy', value: fmtAcc(latest.accuracy) },
    { label: 'Error Rate', value: fmtRate(latest.errorRate) },
    { label: 'Drift Score', value: latest.driftScore.toFixed(2) },
  ];

  return (
    <Card style={{ borderRadius: 0 }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            {onOpen ? (
              <button
                onClick={onOpen}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-none border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] cursor-pointer transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
              >
                {name} <ArrowSquareOut size={13} />
              </button>
            ) : (
              <p className="font-medium text-sm text-[hsl(var(--text-1))]">{name}</p>
            )}
            <p className="text-[11px] text-[hsl(var(--text-4))] mt-1">
              {points.length} recorded point{points.length !== 1 ? 's' : ''} · latest {fmtDateTime(latest.recordedAt)}
            </p>
          </div>
          <div className="text-right text-xs shrink-0">
            <p className="text-[hsl(var(--text-4))]">Cost / Inference</p>
            <p className="font-semibold text-[hsl(var(--text-1))]">{fmtCost(latest.costPerInference)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {tiles.map(m => (
            <div key={m.label} className="bg-surface border border-[hsl(var(--border))] p-2">
              <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wide">{m.label}</p>
              <p className="text-sm font-semibold mt-0.5 text-[hsl(var(--text-1))]">{m.value}</p>
            </div>
          ))}
        </div>

        {chartData.length > 1 ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-[hsl(var(--text-4))] mb-1">Latency trend (recorded)</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="t" tick={{ fill: ct.text, fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: ct.text, fontSize: 9 }} unit="ms" width={52} />
                  <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="p50" stroke={ct.brand} strokeWidth={2} dot={false} name="p50" />
                  <Line type="monotone" dataKey="p99" stroke={ct.colors[3]} strokeWidth={2} dot={false} name="p99" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-[11px] text-[hsl(var(--text-4))] mb-1">Throughput trend (req/s, recorded)</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="t" tick={{ fill: ct.text, fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: ct.text, fontSize: 9 }} width={52} />
                  <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0, fontSize: 11 }} />
                  <Line type="monotone" dataKey="throughput" stroke={ct.colors[1]} strokeWidth={2} dot={false} name="Throughput" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-[hsl(var(--text-4))]">
            Only one telemetry point recorded — trend lines appear once more points are ingested.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
