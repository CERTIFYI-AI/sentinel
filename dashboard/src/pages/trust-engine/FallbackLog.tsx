import { useState, useCallback } from 'react';
import {
  ArrowsClockwise, Eye, Warning, CheckCircle, Fire, Clock,
  Lightning, Export, MagnifyingGlass, Funnel, Info, Link, UserCircleGear,
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
import { FALLBACK_LOG, FallbackEntry, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Cause Colors ──────────────────────────────────────────────────────────────

function causeBadge(trigger: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    'Rate limit exceeded': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))', label: 'Rate-Limit' },
    '30s timeout': { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))', label: 'Timeout' },
    '503 API error': { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', label: 'Model-Error' },
    'Cost limit exceeded': { bg: 'hsl(25 95% 53% / 0.15)', color: 'hsl(var(--s-wn-tx))', label: 'Content-Policy' },
    'Context window exceeded': { bg: 'hsl(280 67% 56% / 0.15)', color: 'hsl(280 67% 56%)', label: 'Context-Length' },
  };
  const s = map[trigger] || { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', label: trigger };
  return <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10, fontWeight: 600 }}>{s.label}</Badge>;
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

// ── Extended Entries ───────────────────────────────────────────────────────────

interface ExtFallback extends FallbackEntry {
  primaryModel: string;
  fallbackModel: string;
  recoveryTimeMs: number;
}

const EXTENDED_ENTRIES: ExtFallback[] = FALLBACK_LOG.map(fb => {
  const parts = fb.modelChain.split(' → ');
  return {
    ...fb,
    primaryModel: parts[0] || '',
    fallbackModel: parts[1] || '',
    recoveryTimeMs: fb.latencyMs,
  };
});

// ── Main Component ────────────────────────────────────────────────────────────

export default function FallbackLog() {
  const { orgName } = useSettingsStore();
  const [entries] = useState<ExtFallback[]>(EXTENDED_ENTRIES);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<ExtFallback | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [escalatedEntries, setEscalatedEntries] = useState<Record<string, string>>({});

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const filtered = entries.filter(e => {
    if (search && !e.agent.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    return true;
  });

  const criticalCount = entries.filter(e => e.status === 'failed').length;
  const autoRecoveredCount = entries.filter(e => e.status === 'success').length;
  const avgRecovery = (entries.reduce((a, e) => a + e.latencyMs, 0) / entries.length / 1000).toFixed(1);

  // Spike detection: simple heuristic — 5 fallbacks in one session is above baseline
  const showSpikeAlert = entries.length >= 5;

  const handleExport = () => {
    const csv = ['ID,Agent,Primary,Fallback,Trigger,Latency(ms),Tokens,Status,Timestamp']
      .concat(entries.map(e => `${e.id},${e.agent},${e.primaryModel},${e.fallbackModel},${e.trigger},${e.latencyMs},${e.tokens},${e.status},${e.timestamp}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fallback-log.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Exported fallback log to CSV', 'success');
  };

  const handleCreateHITL = (entryId: string) => {
    const hitlId = `HITL-${String(Math.floor(Math.random() * 900) + 100)}`;
    setEscalatedEntries(prev => ({ ...prev, [entryId]: hitlId }));
    toast(`HITL review ${hitlId} created for fallback event ${entryId}`, 'info');
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
              <ArrowsClockwise size={22} style={{ color: 'hsl(var(--brand))' }} />
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Fallback Log</h1>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} — Model failover chain events and recovery tracking</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export size={14} className="mr-2" />Export
          </Button>
        </div>

        {/* Spike Alert Banner */}
        {showSpikeAlert && (
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'hsl(45 93% 47% / 0.08)', border: '1px solid hsl(45 93% 47% / 0.3)', borderRadius: 0 }}>
            <Warning size={14} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />
            <p className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>
              <strong>Fallback Spike Detected:</strong> {entries.length} fallbacks in current session exceeds baseline (rate &gt; baseline + 2σ). Investigate GPT-4o reliability.
            </p>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricTile label="Total Fallbacks" value={String(entries.length)} variant="info" icon={<ArrowsClockwise size={16} className="text-blue-600 dark:text-blue-400" />} />
          <MetricTile label="Critical (Failed)" value={String(criticalCount)} variant="error" icon={<Fire size={16} weight="fill" className="text-destructive" />} sub="Requires incident" />
          <MetricTile label="Auto-Recovered" value={String(autoRecoveredCount)} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />} />
          <MetricTile label="Avg Recovery Time" value={`${avgRecovery}s`} variant="info" icon={<Clock size={16} className="text-blue-600 dark:text-blue-400" />} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search fallbacks..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs" style={{ borderRadius: 0 }} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-32 text-xs" style={{ borderRadius: 0 }}><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Agent', 'Primary Model (Failed)', 'Fallback Model', 'Cause', 'Recovery Time', 'Status', 'HITL', 'Timestamp', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-3 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{entry.id}</td>
                      <td className="px-3 py-3 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.agent}</td>
                      <td className="px-3 py-3 text-xs font-mono text-destructive">{entry.primaryModel}</td>
                      <td className="px-3 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{entry.fallbackModel}</td>
                      <td className="px-3 py-3">{causeBadge(entry.trigger)}</td>
                      <td className="px-3 py-3 text-xs font-mono" style={{ color: entry.latencyMs > 10000 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>
                        {(entry.latencyMs / 1000).toFixed(1)}s
                      </td>
                      <td className="px-3 py-3">
                        <Badge style={{
                          background: entry.status === 'success' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(0 72% 51% / 0.12)',
                          color: entry.status === 'success' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
                          borderRadius: 0, fontSize: 10,
                        }}>
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        {escalatedEntries[entry.id] ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge style={{ background: 'hsl(280 67% 56% / 0.12)', color: 'hsl(280 67% 56%)', borderRadius: 0, fontSize: 10, fontWeight: 600 }}>
                                <UserCircleGear size={10} weight="fill" className="mr-1 inline" />
                                {escalatedEntries[entry.id]}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent style={{ borderRadius: 0 }}>Escalated to HITL review {escalatedEntries[entry.id]}</TooltipContent>
                          </Tooltip>
                        ) : entry.status === 'failed' ? (
                          <Button variant="outline" size="sm" className="h-6 text-xs px-2" style={{ borderRadius: 0, fontSize: 10 }}
                            onClick={() => handleCreateHITL(entry.id)}>
                            <UserCircleGear size={12} className="mr-1" />Create HITL Review
                          </Button>
                        ) : (
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>--</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                              {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent style={{ borderRadius: 0 }}>
                            {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-3">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedEntry(entry); setSheetOpen(true); }}>
                          <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Fallback Detail Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
            {selectedEntry && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                    <ArrowsClockwise size={18} style={{ color: 'hsl(var(--brand))' }} />
                    {selectedEntry.id} — {selectedEntry.agent}
                  </SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="overview" className="mt-4">
                  <TabsList style={{ borderRadius: 0 }}>
                    <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                    <TabsTrigger value="trace" style={{ borderRadius: 0 }}>Trace Link</TabsTrigger>
                    <TabsTrigger value="recovery" style={{ borderRadius: 0 }}>Recovery Steps</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Primary Model (Failed)</span>
                        <p className="text-sm font-mono font-bold mt-1 text-destructive">{selectedEntry.primaryModel}</p>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Fallback Model</span>
                        <p className="text-sm font-mono font-bold mt-1" style={{ color: 'hsl(var(--brand))' }}>{selectedEntry.fallbackModel}</p>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Trigger</span>
                        <div className="mt-1">{causeBadge(selectedEntry.trigger)}</div>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Status</span>
                        <div className="mt-1">
                          <Badge style={{
                            background: selectedEntry.status === 'success' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(0 72% 51% / 0.12)',
                            color: selectedEntry.status === 'success' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
                            borderRadius: 0, fontSize: 11,
                          }}>
                            {selectedEntry.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Recovery Time</span>
                        <p className="text-sm font-mono mt-1" style={{ color: selectedEntry.latencyMs > 10000 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>
                          {(selectedEntry.latencyMs / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Tokens Processed</span>
                        <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedEntry.tokens}</p>
                      </div>
                    </div>
                    {selectedEntry.status === 'failed' && (
                      <div className="space-y-3">
                        <div className="p-3" style={{ background: 'hsl(0 72% 51% / 0.06)', border: '1px solid hsl(0 72% 51% / 0.3)', borderRadius: 0 }}>
                          <p className="text-xs font-semibold text-destructive">
                            <Warning size={12} className="inline mr-1" weight="fill" />
                            FAILED — Fallback model also failed. Zero tokens processed. Data may have been silently dropped.
                            Auto-incident creation recommended.
                          </p>
                        </div>
                        {escalatedEntries[selectedEntry.id] ? (
                          <div className="p-3 flex items-center gap-2" style={{ background: 'hsl(280 67% 56% / 0.08)', border: '1px solid hsl(280 67% 56% / 0.3)', borderRadius: 0 }}>
                            <UserCircleGear size={14} weight="fill" style={{ color: 'hsl(280 67% 56%)' }} />
                            <p className="text-xs font-semibold" style={{ color: 'hsl(280 67% 56%)' }}>
                              Escalated to HITL review {escalatedEntries[selectedEntry.id]}
                            </p>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" style={{ borderRadius: 0 }}
                            onClick={() => handleCreateHITL(selectedEntry.id)}>
                            <UserCircleGear size={14} className="mr-1" />Create HITL Review
                          </Button>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="trace" className="space-y-4 mt-4">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Linked Trace</span>
                      <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--brand))' }}>
                        <Link size={12} className="inline mr-1" />
                        TR-{String(parseInt(selectedEntry.id.replace('FB-', '')) + 3).padStart(3, '0')}
                      </p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Timestamp</span>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                        {new Date(selectedEntry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(220 90% 56% / 0.06)', border: '1px solid hsl(220 90% 56% / 0.2)', borderRadius: 0 }}>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        <Info size={12} className="inline mr-1" />
                        Model quality impact: Fallback from {selectedEntry.primaryModel} to {selectedEntry.fallbackModel} may affect output quality, hallucination rate, and bias characteristics (ISO 42001 Cl. 8.4).
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="recovery" className="space-y-3 mt-4">
                    {selectedEntry.status === 'success' ? (
                      <>
                        <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <div className="flex items-center justify-center w-5 h-5 text-xs font-bold" style={{ background: 'hsl(var(--brand))', color: '#fff', borderRadius: 0, minWidth: 20 }}>1</div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Primary model failure detected</p>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Trigger: {selectedEntry.trigger}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <div className="flex items-center justify-center w-5 h-5 text-xs font-bold" style={{ background: 'hsl(var(--brand))', color: '#fff', borderRadius: 0, minWidth: 20 }}>2</div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Automatic failover initiated</p>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selectedEntry.primaryModel} → {selectedEntry.fallbackModel}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <div className="flex items-center justify-center w-5 h-5 text-xs font-bold" style={{ background: 'hsl(var(--s-ok-tx))', color: '#fff', borderRadius: 0, minWidth: 20 }}>3</div>
                          <div>
                            <p className="text-xs font-medium text-green-600 dark:text-green-400">Recovery successful</p>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selectedEntry.tokens} tokens processed in {(selectedEntry.latencyMs / 1000).toFixed(1)}s</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(0 72% 51% / 0.06)', border: '1px solid hsl(0 72% 51% / 0.3)', borderRadius: 0 }}>
                          <Warning size={14} weight="fill" className="text-destructive mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-destructive">Recovery FAILED</p>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                              Fallback to {selectedEntry.fallbackModel} also failed. 0 tokens processed. Batch operation silently dropped.
                            </p>
                          </div>
                        </div>
                        <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Recommended Action</p>
                          <ul className="text-xs mt-1 space-y-1" style={{ color: 'hsl(var(--text-4))' }}>
                            <li>• Create incident for data integrity review</li>
                            <li>• Check for partial writes in label store</li>
                            <li>• Review cost limit configuration</li>
                            <li>• Add HITL review for affected batch</li>
                          </ul>
                        </div>
                      </>
                    )}
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
