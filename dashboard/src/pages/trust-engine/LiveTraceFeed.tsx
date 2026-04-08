import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Eye, Play, Pause, Warning, Lightning, Clock,
  CheckCircle, ShieldCheck, MagnifyingGlass, Funnel,
  ArrowsClockwise, Export, Archive,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TRACES, Trace, TRUST_POLICIES, severityColor, formatNumber } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Simulated new traces for polling ──────────────────────────────────────────

const SIMULATED_AGENTS = ['ComplianceBot', 'LoanAssistant', 'SupportBot', 'RiskAnalyzer', 'DataLabeler-v2', 'AnalyticsAI', 'FraudAlert-Watcher'];
const SIMULATED_MODELS = ['GPT-4o', 'Claude-3', 'Internal', 'N/A', 'GPT-4o-Mini'];
const SIMULATED_ACTIONS = ['PII Redaction', 'Toxicity Filter', 'Cost Check', 'Hallucination Guard', 'Data Boundary', 'Rate Limiter', 'Policy Check'];
const SIMULATED_POLICIES = ['TP-001', 'TP-002', 'TP-003', 'TP-004', 'TP-005'];
const SIMULATED_STATUSES: Trace['status'][] = ['success', 'blocked', 'fallback'];

function generateTrace(idx: number): Trace {
  const status = SIMULATED_STATUSES[Math.floor(Math.random() * 10) < 6 ? 0 : Math.floor(Math.random() * 10) < 8 ? 1 : 2];
  const model = SIMULATED_MODELS[Math.floor(Math.random() * SIMULATED_MODELS.length)];
  return {
    id: `TR-${String(100 + idx).padStart(3, '0')}`,
    timestamp: new Date().toISOString(),
    agent: SIMULATED_AGENTS[Math.floor(Math.random() * SIMULATED_AGENTS.length)],
    model,
    status,
    action: SIMULATED_ACTIONS[Math.floor(Math.random() * SIMULATED_ACTIONS.length)],
    latencyMs: status === 'blocked' ? Math.floor(Math.random() * 20) + 3 : Math.floor(Math.random() * 1400) + 100,
    tokens: status === 'blocked' || model === 'N/A' ? 0 : Math.floor(Math.random() * 5000) + 200,
    policyEvaluated: SIMULATED_POLICIES[Math.floor(Math.random() * SIMULATED_POLICIES.length)],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
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

function statusBadge(status: Trace['status']) {
  const map = {
    success: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))', label: 'Success' },
    blocked: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', label: 'Blocked' },
    fallback: { bg: 'hsl(25 95% 53% / 0.15)', color: 'hsl(var(--s-wn-tx))', label: 'Fallback' },
  };
  const s = map[status];
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10 }}>{s.label}</Badge>;
}

// ── Metric Tile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LiveTraceFeed() {
  const { orgName } = useSettingsStore();
  const [traces, setTraces] = useState<Trace[]>([...TRACES]);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [archivedTraces, setArchivedTraces] = useState<(Trace & { archivedAt: string })[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const pollCountRef = useRef(0);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Polling simulation: add 1 new trace every 5s when not paused
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      pollCountRef.current += 1;
      const newTrace = generateTrace(pollCountRef.current);
      setTraces(prev => [newTrace, ...prev].slice(0, 100));
    }, 5000);
    return () => clearInterval(interval);
  }, [paused]);

  const filtered = traces.filter(t => {
    if (search && !t.agent.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterAgent !== 'all' && t.agent !== filterAgent) return false;
    return true;
  });

  const blockedCount = traces.filter(t => t.status === 'blocked').length;
  const fallbackCount = traces.filter(t => t.status === 'fallback').length;
  const agents = Array.from(new Set(traces.map(t => t.agent)));

  const handleClear = () => {
    const now = new Date().toISOString();
    const newArchived = traces.map(t => ({ ...t, archivedAt: now }));
    setArchivedTraces(prev => [...newArchived, ...prev]);
    setTraces([]);
    toast(`${newArchived.length} traces archived to cold storage`, 'info');
    setClearConfirm(false);
  };

  const handleExport = () => {
    const csv = ['ID,Timestamp,Agent,Model,Status,Action,Latency(ms),Tokens,Policy']
      .concat(filtered.map(t => `${t.id},${t.timestamp},${t.agent},${t.model},${t.status},${t.action},${t.latencyMs},${t.tokens},${t.policyEvaluated}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'live-traces.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Exported trace data to CSV', 'success');
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Toast */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
              background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
              color: '#fff', borderRadius: 0, minWidth: 300,
            }}>{t.text}</div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Lightning size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Live Trace Feed</h1>
              <Badge style={{
                background: paused ? 'hsl(45 93% 47% / 0.15)' : 'hsl(142 71% 45% / 0.15)',
                color: paused ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                borderRadius: 0, fontSize: 10,
              }}>
                {paused ? 'PAUSED' : 'LIVE'}
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} — Real-time agent trace monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaused(!paused)}
              style={{ borderRadius: 0 }}
            >
              {paused ? <Play size={14} className="mr-2" weight="fill" /> : <Pause size={14} className="mr-2" weight="fill" />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} style={{ borderRadius: 0 }}>
              <Export size={14} className="mr-2" />Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setClearConfirm(true)} style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}>
              <Archive size={14} className="mr-2" />Archive All
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricTile label="Total Traces" value={String(traces.length)} variant="info" icon={<Lightning size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
          <MetricTile label="Blocked" value={String(blockedCount)} variant="error" icon={<Warning size={16} weight="fill" className="text-destructive" />} />
          <MetricTile label="Fallbacks" value={String(fallbackCount)} variant="warn" icon={<ArrowsClockwise size={16} style={{ color: 'hsl(var(--s-wn-tx))' }} />} />
          <MetricTile label="Status" value={paused ? 'Paused' : 'Live'} variant={paused ? 'warn' : 'ok'} icon={paused ? <Pause size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} /> : <Play size={16} weight="fill" className="text-green-600 dark:text-green-400" />} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search traces..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs" style={{ borderRadius: 0 }} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-32 text-xs" style={{ borderRadius: 0 }}><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="fallback">Fallback</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="h-8 w-44 text-xs" style={{ borderRadius: 0 }}><SelectValue placeholder="Agent" /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle: Active / Archived */}
        <div className="flex items-center gap-1" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <button
            onClick={() => setViewMode('active')}
            className="px-4 py-2 text-xs font-medium transition-colors"
            style={{
              color: viewMode === 'active' ? 'hsl(var(--brand))' : 'hsl(var(--text-4))',
              borderBottom: viewMode === 'active' ? '2px solid hsl(var(--brand))' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Active Traces ({traces.length})
          </button>
          <button
            onClick={() => setViewMode('archived')}
            className="px-4 py-2 text-xs font-medium transition-colors"
            style={{
              color: viewMode === 'archived' ? 'hsl(var(--brand))' : 'hsl(var(--text-4))',
              borderBottom: viewMode === 'archived' ? '2px solid hsl(var(--brand))' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Archive size={13} />
              View Archived ({archivedTraces.length})
            </span>
          </button>
        </div>

        {/* Table */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {(viewMode === 'archived'
                      ? ['ID', 'Time', 'Agent', 'Model', 'Status', 'Action', 'Latency', 'Tokens', 'Policy', 'Archived At']
                      : ['ID', 'Time', 'Agent', 'Model', 'Status', 'Action', 'Latency', 'Tokens', 'Policy', 'Actions']
                    ).map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewMode === 'active' ? (
                    <>
                      {filtered.slice(0, 50).map(trace => (
                        <tr key={trace.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{trace.id}</td>
                          <td className="px-3 py-2.5">
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{timeAgo(trace.timestamp)}</span>
                              </TooltipTrigger>
                              <TooltipContent style={{ borderRadius: 0 }}>{fullTimestamp(trace.timestamp)}</TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{trace.agent}</td>
                          <td className="px-3 py-2.5">
                            {trace.model === 'N/A' ? (
                              <Badge style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderRadius: 0, fontSize: 10 }}>N/A</Badge>
                            ) : (
                              <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{trace.model}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">{statusBadge(trace.status)}</td>
                          <td className="px-3 py-2.5">
                            {trace.status === 'fallback' ? (
                              <Badge style={{ background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>{trace.action}</Badge>
                            ) : (
                              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{trace.action}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: trace.latencyMs > 1000 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>
                            {trace.latencyMs}ms
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                            {trace.tokens > 0 ? formatNumber(trace.tokens) : '0'}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{trace.policyEvaluated}</td>
                          <td className="px-3 py-2.5">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedTrace(trace); setSheetOpen(true); }}>
                              <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>No traces to display.</td></tr>
                      )}
                    </>
                  ) : (
                    <>
                      {archivedTraces.slice(0, 50).map(trace => (
                        <tr key={`${trace.id}-${trace.archivedAt}`} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{trace.id}</td>
                          <td className="px-3 py-2.5">
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{timeAgo(trace.timestamp)}</span>
                              </TooltipTrigger>
                              <TooltipContent style={{ borderRadius: 0 }}>{fullTimestamp(trace.timestamp)}</TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{trace.agent}</td>
                          <td className="px-3 py-2.5">
                            {trace.model === 'N/A' ? (
                              <Badge style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderRadius: 0, fontSize: 10 }}>N/A</Badge>
                            ) : (
                              <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{trace.model}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">{statusBadge(trace.status)}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{trace.action}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                            {trace.latencyMs}ms
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                            {trace.tokens > 0 ? formatNumber(trace.tokens) : '0'}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{trace.policyEvaluated}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                            {fullTimestamp(trace.archivedAt)}
                          </td>
                        </tr>
                      ))}
                      {archivedTraces.length === 0 && (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>No archived traces.</td></tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Clear ConfirmDialog */}
        <ConfirmDialog
          open={clearConfirm}
          onClose={() => setClearConfirm(false)}
          onConfirm={handleClear}
          type="danger"
          title="Archive All Traces"
          message={<p>Archive all <strong>{traces.length}</strong> traces? Traces will be moved to cold storage per retention policy (7 years).</p>}
          confirmLabel="Archive All"
        />

        {/* Trace Detail Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-[580px] sm:max-w-[580px] overflow-y-auto" style={{ borderRadius: 0 }}>
            {selectedTrace && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                    <Lightning size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                    {selectedTrace.id}
                  </SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="spans" className="mt-4">
                  <TabsList style={{ borderRadius: 0 }}>
                    <TabsTrigger value="spans" style={{ borderRadius: 0 }}>Span Details</TabsTrigger>
                    <TabsTrigger value="io" style={{ borderRadius: 0 }}>Input/Output</TabsTrigger>
                    <TabsTrigger value="guardrails" style={{ borderRadius: 0 }}>Guardrail Checks</TabsTrigger>
                  </TabsList>

                  <TabsContent value="spans" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Agent</span>
                        <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedTrace.agent}</p>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Model</span>
                        <p className="text-sm font-mono mt-1" style={{ color: selectedTrace.model === 'N/A' ? 'hsl(var(--text-4))' : 'hsl(var(--text-1))' }}>
                          {selectedTrace.model === 'N/A' ? 'N/A (non-LLM)' : selectedTrace.model}
                        </p>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                        <div className="mt-1">{statusBadge(selectedTrace.status)}</div>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Latency</span>
                        <p className="text-sm font-mono mt-1" style={{ color: selectedTrace.latencyMs > 1000 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>
                          {selectedTrace.latencyMs}ms
                        </p>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Tokens</span>
                        <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedTrace.tokens}</p>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</span>
                        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{fullTimestamp(selectedTrace.timestamp)}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="io" className="space-y-4 mt-4">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Input (redacted)</span>
                      <pre className="text-xs font-mono mt-1 p-2 overflow-x-auto" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
                        {selectedTrace.status === 'blocked'
                          ? '[CONTENT REDACTED — Security policy prevents display of blocked inputs]'
                          : `Agent: ${selectedTrace.agent}\nModel: ${selectedTrace.model}\nAction: ${selectedTrace.action}\nPolicy: ${selectedTrace.policyEvaluated}`}
                      </pre>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Output</span>
                      <pre className="text-xs font-mono mt-1 p-2 overflow-x-auto" style={{ background: 'hsl(var(--border) / 0.3)', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
                        {selectedTrace.status === 'blocked'
                          ? `[BLOCKED by ${selectedTrace.action} — Policy ${selectedTrace.policyEvaluated}]`
                          : selectedTrace.status === 'fallback'
                          ? `[FALLBACK — ${selectedTrace.action} — routed to secondary model]`
                          : `[SUCCESS — ${selectedTrace.tokens} tokens processed in ${selectedTrace.latencyMs}ms]`}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="guardrails" className="space-y-3 mt-4">
                    {(() => {
                      const policy = TRUST_POLICIES.find(p => p.id === selectedTrace.policyEvaluated);
                      return (
                        <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{policy?.name || selectedTrace.policyEvaluated}</span>
                            {statusBadge(selectedTrace.status)}
                          </div>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{policy?.description || 'Policy evaluation details'}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 9 }}>
                              Score: {policy?.trustScore || '—'}%
                            </Badge>
                            <Badge style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderRadius: 0, fontSize: 9 }}>
                              {formatNumber(policy?.evaluations || 0)} evaluations
                            </Badge>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Decision</span>
                      <p className="text-sm font-medium mt-1" style={{
                        color: selectedTrace.status === 'blocked' ? 'hsl(var(--destructive))' : selectedTrace.status === 'fallback' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                      }}>
                        {selectedTrace.status === 'blocked' ? 'BLOCKED — Policy violation detected' : selectedTrace.status === 'fallback' ? 'FALLBACK — Rerouted to secondary model' : 'PASSED — All guardrail checks passed'}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
