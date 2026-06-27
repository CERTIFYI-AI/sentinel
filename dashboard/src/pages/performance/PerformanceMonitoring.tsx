import { useState, useEffect } from 'react';
import {
  Gauge, Warning, Siren, ArrowUp, ArrowDown, Minus, Plus,
  MagnifyingGlass, Export, Eye, ArrowsClockwise, Check,
  ChartLine, Database, Clock, Lightning, Cpu, ShieldCheck,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend, AreaChart, Area,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { MODELS } from '../../data/seed';


type AlertSeverity = 'critical' | 'warning' | 'info';

interface ModelEndpoint {
  modelId: string; modelName: string; endpoint: string; status: 'healthy' | 'degraded' | 'down';
  slo: number; sloActual: number;
  latencyP50: number; latencyP95: number; latencyP99: number;
  throughputRpm: number; throughputCapacity: number;
  errorRate: number; errorThreshold: number;
  costPerInference: number; dailyCost: number;
  dataQualityScore: number; schemaDrifts: number; nullRateAvg: number;
  latencyHistory: { time: string; p50: number; p99: number }[];
  throughputHistory: { time: string; rpm: number }[];
  alerts: { id: string; severity: AlertSeverity; message: string; time: string; correlated?: string }[];
}

const generateHistory = (base: number, noise: number, periods = 24) =>
  Array.from({ length: periods }, (_, i) => ({
    time: `${String(i).padStart(2,'0')}:00`,
    p50: Math.round(base + (Math.random() - 0.5) * noise),
    p99: Math.round(base * 2.5 + (Math.random() - 0.5) * noise * 2),
  }));

const generateThroughput = (base: number, periods = 24) =>
  Array.from({ length: periods }, (_, i) => ({
    time: `${String(i).padStart(2,'0')}:00`,
    rpm: Math.round(base + Math.sin(i / 4) * base * 0.3 + (Math.random() - 0.5) * base * 0.1),
  }));

const ENDPOINTS: ModelEndpoint[] = [
  {
    modelId: 'MDL-001', modelName: 'Credit Risk Scorer v3.2.1', endpoint: '/v1/credit/score',
    status: 'degraded', slo: 99.9, sloActual: 99.6,
    latencyP50: 45, latencyP95: 88, latencyP99: 142,
    throughputRpm: 15200, throughputCapacity: 20000,
    errorRate: 0.4, errorThreshold: 0.1,
    costPerInference: 0.0012, dailyCost: 524,
    dataQualityScore: 94, schemaDrifts: 0, nullRateAvg: 0.3,
    latencyHistory: generateHistory(45, 20),
    throughputHistory: generateThroughput(15000),
    alerts: [
      { id: 'ALT-001', severity: 'warning', message: 'p99 latency spike to 142ms (threshold: 120ms)', time: '09:14', correlated: 'Performance drop → Bias score at risk' },
      { id: 'ALT-002', severity: 'warning', message: 'Error rate 0.4% exceeds threshold of 0.1%', time: '09:08' },
    ],
  },
  {
    modelId: 'MDL-002', modelName: 'Fraud Detection Engine v2.1.0', endpoint: '/v1/fraud/detect',
    status: 'healthy', slo: 99.95, sloActual: 99.97,
    latencyP50: 18, latencyP95: 42, latencyP99: 78,
    throughputRpm: 42800, throughputCapacity: 60000,
    errorRate: 0.02, errorThreshold: 0.1,
    costPerInference: 0.0008, dailyCost: 981,
    dataQualityScore: 99, schemaDrifts: 0, nullRateAvg: 0.1,
    latencyHistory: generateHistory(18, 8),
    throughputHistory: generateThroughput(42000),
    alerts: [],
  },
  {
    modelId: 'MDL-004', modelName: 'AML Transaction Monitor v3.0', endpoint: '/v1/aml/screen',
    status: 'healthy', slo: 99.9, sloActual: 99.93,
    latencyP50: 92, latencyP95: 210, latencyP99: 380,
    throughputRpm: 8200, throughputCapacity: 15000,
    errorRate: 0.05, errorThreshold: 0.1,
    costPerInference: 0.0045, dailyCost: 1058,
    dataQualityScore: 97, schemaDrifts: 1, nullRateAvg: 0.8,
    latencyHistory: generateHistory(92, 40),
    throughputHistory: generateThroughput(8000),
    alerts: [
      { id: 'ALT-010', severity: 'info', message: 'Schema drift detected on "customer_country" field', time: 'Yesterday 22:00' },
    ],
  },
  {
    modelId: 'MDL-005', modelName: 'Customer Churn Predictor v2.3', endpoint: '/v1/churn/predict',
    status: 'down', slo: 99.5, sloActual: 97.8,
    latencyP50: 0, latencyP95: 0, latencyP99: 0,
    throughputRpm: 0, throughputCapacity: 5000,
    errorRate: 100, errorThreshold: 0.1,
    costPerInference: 0.0006, dailyCost: 0,
    dataQualityScore: 0, schemaDrifts: 3, nullRateAvg: 0,
    latencyHistory: generateHistory(0, 0),
    throughputHistory: generateThroughput(0),
    alerts: [
      { id: 'ALT-020', severity: 'critical', message: 'Endpoint unreachable — 100% error rate', time: '07:32' },
      { id: 'ALT-021', severity: 'critical', message: 'SLO breach: 97.8% vs 99.5% target', time: '07:32', correlated: 'SLO breach → Risk escalation required' },
    ],
  },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  healthy: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))', dot: '#10b981' },
  degraded: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))', dot: '#f59e0b' },
  down: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', dot: '#ef4444' },
};

const ALERT_COLORS: Record<AlertSeverity, { bg: string; color: string }> = {
  critical: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  warning: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
  info: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
};

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

export default function PerformanceMonitoring() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ModelEndpoint | null>(null);
  const [tab, setTab] = useState('overview');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const ct = useChartTheme();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const addToast = (text: string, type: ToastMsg['type'] = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, text, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = ENDPOINTS.filter(e =>
    e.modelName.toLowerCase().includes(search.toLowerCase()) ||
    e.endpoint.toLowerCase().includes(search.toLowerCase())
  );

  const healthy = ENDPOINTS.filter(e => e.status === 'healthy').length;
  const degraded = ENDPOINTS.filter(e => e.status === 'degraded').length;
  const down = ENDPOINTS.filter(e => e.status === 'down').length;
  const totalAlerts = ENDPOINTS.flatMap(e => e.alerts).length;
  const criticalAlerts = ENDPOINTS.flatMap(e => e.alerts).filter(a => a.severity === 'critical').length;

  return (
    <div className="space-y-5">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 rounded text-sm text-white shadow-lg"
            style={{ background: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#3b82f6' }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Gauge size={20} weight="duotone" className="text-[hsl(var(--brand))]" />
            Performance Monitoring & Observability
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">
            Real-time model endpoints · SLO tracking · data quality · alert correlation
            <span className="ml-2 text-[hsl(var(--text-4))]">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={() => { setLastUpdated(new Date()); addToast('Metrics refreshed'); }}>
            <ArrowsClockwise size={14} /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={() => addToast('Alert configuration opened', 'info')}>
            <Warning size={14} /> Configure Alerts
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Healthy', value: healthy, color: '#10b981' },
          { label: 'Degraded', value: degraded, color: '#f59e0b' },
          { label: 'Down', value: down, color: '#ef4444' },
          { label: 'Active Alerts', value: totalAlerts, color: totalAlerts > 0 ? '#f59e0b' : '#10b981' },
          { label: 'Critical', value: criticalAlerts, color: criticalAlerts > 0 ? '#ef4444' : '#10b981' },
        ].map(s => (
          <Card key={s.label} style={{ borderRadius: 0 }}>
            <CardContent className="px-4 py-3">
              <p className="text-xs text-[hsl(var(--text-4))] mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Alerts Ribbon */}
      {criticalAlerts > 0 && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Siren size={14} className="text-[hsl(var(--destructive))]" />
            <p className="text-sm font-semibold text-[hsl(var(--destructive))]">{criticalAlerts} Critical Alert{criticalAlerts > 1 ? 's' : ''} — Immediate Attention Required</p>
          </div>
          {ENDPOINTS.flatMap(e => e.alerts.filter(a => a.severity === 'critical').map(a => ({ ...a, endpoint: e.endpoint }))).map(a => (
            <div key={a.id} className="flex items-start gap-2 text-xs text-[hsl(var(--destructive))] py-0.5">
              <span className="font-mono">{a.endpoint}</span>
              <span>{a.message}</span>
              {a.correlated && <span className="text-[hsl(var(--s-wn-tx))] italic">→ {a.correlated}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-[hsl(var(--text-4))]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search endpoints..." className="pl-8 rounded-none h-8 text-sm" />
      </div>

      {/* Endpoint Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(ep => {
          const sloOk = ep.sloActual >= ep.slo;
          const sloColor = sloOk ? '#10b981' : '#ef4444';
          return (
            <Card key={ep.modelId} style={{ borderRadius: 0, cursor: 'pointer', borderLeft: `3px solid ${STATUS_COLORS[ep.status].dot}` }}
              onClick={() => { setSelected(ep); setTab('overview'); }}
              className="hover:border-[hsl(var(--brand))] transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-[hsl(var(--text-1))]">{ep.modelName}</p>
                    <p className="text-xs font-mono text-[hsl(var(--text-4))] mt-0.5">{ep.endpoint}</p>
                  </div>
                  <Badge style={{ ...STATUS_COLORS[ep.status], borderRadius: 0, fontSize: 10, textTransform: 'capitalize' }}>{ep.status}</Badge>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'p50', value: ep.status === 'down' ? '—' : `${ep.latencyP50}ms`, ok: ep.latencyP50 < 100 },
                    { label: 'p99', value: ep.status === 'down' ? '—' : `${ep.latencyP99}ms`, ok: ep.latencyP99 < 200 },
                    { label: 'RPM', value: ep.status === 'down' ? '—' : `${(ep.throughputRpm / 1000).toFixed(1)}K`, ok: ep.throughputRpm < ep.throughputCapacity * 0.85 },
                    { label: 'Error %', value: ep.status === 'down' ? '100%' : `${ep.errorRate}%`, ok: ep.errorRate <= ep.errorThreshold },
                  ].map(m => (
                    <div key={m.label} className="bg-surface p-2">
                      <p className="text-xs text-[hsl(var(--text-4))]">{m.label}</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: m.ok ? 'hsl(var(--text-1))' : '#ef4444' }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[hsl(var(--text-4))]">SLO: {ep.sloActual}% / {ep.slo}%</span>
                      <span className="text-xs font-semibold" style={{ color: sloColor }}>{sloOk ? '✓ On Target' : '✗ Breached'}</span>
                    </div>
                    <Progress value={ep.sloActual} className="h-1.5 rounded-none" />
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-[hsl(var(--text-4))]">Daily Cost</p>
                    <p className="font-semibold text-[hsl(var(--text-1))]">${ep.dailyCost.toLocaleString()}</p>
                  </div>
                </div>

                {ep.alerts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Warning size={12} className="text-[hsl(var(--destructive))]" />
                    <p className="text-xs text-[hsl(var(--destructive))]">{ep.alerts.length} active alert{ep.alerts.length > 1 ? 's' : ''}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cost Summary */}
      <Card style={{ borderRadius: 0 }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cost-per-Inference Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  {['Model', 'Endpoint', 'Cost/Inference', 'Daily Cost', 'Monthly Est.', 'RPM', 'Utilization'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[hsl(var(--text-4))] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((ep, i) => (
                  <tr key={ep.modelId} className={`border-b border-[hsl(var(--border))] ${i % 2 === 0 ? '' : 'bg-surface'}`}>
                    <td className="px-3 py-2 font-medium text-[hsl(var(--text-1))]">{ep.modelName.split(' ')[0]} {ep.modelName.split(' ')[1]}</td>
                    <td className="px-3 py-2 font-mono text-[hsl(var(--text-3))]">{ep.endpoint}</td>
                    <td className="px-3 py-2 text-[hsl(var(--text-2))]">${ep.costPerInference.toFixed(4)}</td>
                    <td className="px-3 py-2 font-semibold text-[hsl(var(--text-1))]">${ep.dailyCost.toLocaleString()}</td>
                    <td className="px-3 py-2 text-[hsl(var(--text-2))]">${(ep.dailyCost * 30).toLocaleString()}</td>
                    <td className="px-3 py-2 text-[hsl(var(--text-2))]">{ep.throughputRpm.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Progress value={(ep.throughputRpm / ep.throughputCapacity) * 100} className="h-1.5 w-16 rounded-none" />
                        <span>{Math.round((ep.throughputRpm / ep.throughputCapacity) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-base">{selected.modelName}</SheetTitle>
                    <p className="text-xs font-mono text-[hsl(var(--text-3))] mt-1">{selected.endpoint}</p>
                  </div>
                  <Badge style={{ ...STATUS_COLORS[selected.status], borderRadius: 0, textTransform: 'capitalize', fontSize: 10 }}>{selected.status}</Badge>
                </div>
              </SheetHeader>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="rounded-none w-full">
                  <TabsTrigger value="overview" className="rounded-none flex-1 text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="latency" className="rounded-none flex-1 text-xs">Latency</TabsTrigger>
                  <TabsTrigger value="throughput" className="rounded-none flex-1 text-xs">Throughput</TabsTrigger>
                  <TabsTrigger value="quality" className="rounded-none flex-1 text-xs">Data Quality</TabsTrigger>
                  <TabsTrigger value="alerts" className="rounded-none flex-1 text-xs">
                    Alerts {selected.alerts.length > 0 && `(${selected.alerts.length})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'SLO Target', value: `${selected.slo}%` },
                      { label: 'SLO Actual', value: `${selected.sloActual}%`, ok: selected.sloActual >= selected.slo },
                      { label: 'Error Rate', value: `${selected.errorRate}%`, ok: selected.errorRate <= selected.errorThreshold },
                      { label: 'Daily Cost', value: `$${selected.dailyCost.toLocaleString()}` },
                    ].map(m => (
                      <div key={m.label} className="p-3 border border-[hsl(var(--border))]">
                        <p className="text-xs text-[hsl(var(--text-4))]">{m.label}</p>
                        <p className="text-xl font-bold mt-1" style={{ color: m.ok === false ? '#ef4444' : m.ok === true ? '#10b981' : 'hsl(var(--text-1))' }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'p50 Latency', value: `${selected.latencyP50}ms` },
                      { label: 'p95 Latency', value: `${selected.latencyP95}ms` },
                      { label: 'p99 Latency', value: `${selected.latencyP99}ms` },
                    ].map(m => (
                      <div key={m.label} className="p-3 border border-[hsl(var(--border))] text-center">
                        <p className="text-xs text-[hsl(var(--text-4))]">{m.label}</p>
                        <p className="text-lg font-bold text-[hsl(var(--text-1))] mt-1">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="latency" className="mt-4">
                  <p className="text-xs text-[hsl(var(--text-3))] mb-3">24-hour latency trend (p50 and p99)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={selected.latencyHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="time" tick={{ fill: ct.text, fontSize: 9 }} interval={3} />
                      <YAxis tick={{ fill: ct.text, fontSize: 10 }} unit="ms" />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.text, borderRadius: 0 }} />
                      <Legend />
                      <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'SLA', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="p50" stroke="#6366f1" strokeWidth={2} dot={false} name="p50" />
                      <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} name="p99" />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="throughput" className="mt-4">
                  <p className="text-xs text-[hsl(var(--text-3))] mb-3">24-hour throughput trend (requests per minute)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={selected.throughputHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="time" tick={{ fill: ct.text, fontSize: 9 }} interval={3} />
                      <YAxis tick={{ fill: ct.text, fontSize: 10 }} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.text, borderRadius: 0 }} />
                      <ReferenceLine y={selected.throughputCapacity} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Cap', fill: '#f59e0b', fontSize: 10 }} />
                      <Area type="monotone" dataKey="rpm" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="RPM" />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="quality" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Data Quality Score', value: `${selected.dataQualityScore}%`, ok: selected.dataQualityScore >= 95 },
                      { label: 'Schema Drifts', value: selected.schemaDrifts, ok: selected.schemaDrifts === 0 },
                      { label: 'Avg Null Rate', value: `${selected.nullRateAvg}%`, ok: selected.nullRateAvg < 1 },
                    ].map(m => (
                      <div key={m.label} className="p-3 border border-[hsl(var(--border))] text-center">
                        <p className="text-xs text-[hsl(var(--text-4))]">{m.label}</p>
                        <p className="text-xl font-bold mt-1" style={{ color: m.ok ? '#10b981' : '#ef4444' }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border border-[hsl(var(--border))] space-y-2">
                    <p className="text-xs font-medium text-[hsl(var(--text-3))]">DATA QUALITY INDICATORS</p>
                    {[
                      { name: 'Schema conformance', value: 100 - selected.schemaDrifts * 15, threshold: 95 },
                      { name: 'Feature completeness', value: 100 - selected.nullRateAvg * 10, threshold: 99 },
                      { name: 'Distribution stability (PSI)', value: selected.dataQualityScore, threshold: 90 },
                    ].map(q => (
                      <div key={q.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[hsl(var(--text-2))]">{q.name}</span>
                          <span className="text-xs font-medium" style={{ color: q.value >= q.threshold ? '#10b981' : '#ef4444' }}>{q.value}%</span>
                        </div>
                        <Progress value={q.value} className="h-1.5 rounded-none" />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="alerts" className="mt-4 space-y-3">
                  {selected.alerts.length === 0 && (
                    <div className="text-center py-8">
                      <Check size={24} className="mx-auto text-[hsl(var(--s-ok-tx))] mb-2" />
                      <p className="text-sm text-[hsl(var(--text-3))]">No active alerts — all systems nominal</p>
                    </div>
                  )}
                  {selected.alerts.map(a => (
                    <div key={a.id} className="border border-[hsl(var(--border))] p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge style={{ ...ALERT_COLORS[a.severity], borderRadius: 0, fontSize: 10, textTransform: 'capitalize' }}>{a.severity}</Badge>
                        <span className="text-xs text-[hsl(var(--text-4))]">{a.time}</span>
                      </div>
                      <p className="text-sm text-[hsl(var(--text-1))]">{a.message}</p>
                      {a.correlated && (
                        <p className="text-xs text-[hsl(var(--s-wn-tx))] italic">Alert correlation: {a.correlated}</p>
                      )}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
