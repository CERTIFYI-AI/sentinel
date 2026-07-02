import { useState, useCallback, useEffect } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, Robot, MagnifyingGlass, Funnel,
  Warning, CheckCircle, ShieldWarning, Scan, Prohibit, Siren,
  Lightning, ListChecks, ArrowUp, ArrowDown, Minus, WifiHigh, CircleNotch,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Agent, USERS, VENDORS,
  severityColor, statusColor, formatDate, formatNumber, timeAgo,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAgentsData } from '../../hooks/useAgentsData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

function trendIndicator(calls: number) {
  // Simulate prior week as +/- 10-20%
  const priorWeek = Math.round(calls * (0.8 + Math.random() * 0.4));
  const diff = calls - priorWeek;
  const pct = priorWeek > 0 ? Math.round((diff / priorWeek) * 100) : 0;
  if (pct > 0) return <span className="text-xs flex items-center gap-0.5 text-destructive"><ArrowUp size={10} />+{pct}%</span>;
  if (pct < 0) return <span className="text-xs flex items-center gap-0.5 text-[hsl(var(--s-ok-tx))]"><ArrowDown size={10} />{pct}%</span>;
  return <span className="text-xs flex items-center gap-0.5" style={{ color: 'hsl(var(--text-4))' }}><Minus size={10} />0%</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentDiscovery() {
  const { orgName } = useSettingsStore();
  const { items: agentList, isLoading, saveAgents, removeAgents } = useAgentsData();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [quarantineTarget, setQuarantineTarget] = useState<Agent | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  if (isLoading) return <PageSkeleton />;

  // Metrics
  const totalAgents = agentList.length;
  const confirmedAgents = agentList.filter(a => a.status === 'confirmed').length;
  const shadowAgents = agentList.filter(a => a.status === 'shadow').length;
  const highRiskAgents = agentList.filter(a => a.risk === 'high' || a.risk === 'critical').length;

  // Filters
  const filtered = agentList.filter(a => {
    const matchSearch = a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.owner.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' ||
      (activeTab === 'confirmed' && a.status === 'confirmed') ||
      (activeTab === 'shadow' && a.status === 'shadow');
    return matchSearch && matchTab;
  });

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      toast('Scan complete — 3 new agents discovered', 'info');
    }, 2000);
  };

  const handleQuarantine = async () => {
    if (!quarantineTarget) return;
    await saveAgents({ ...quarantineTarget, status: 'quarantined' });
    toast(`${quarantineTarget.name} quarantined — all API calls blocked`, 'error');
    setQuarantineTarget(null);
  };

  const handleRaiseIncident = (agent: Agent) => {
    toast(`INC-006 created from ${agent.name} — Shadow AI incident`, 'info');
  };

  const handleRequestOwnership = (agent: Agent) => {
    toast(`Ownership request sent for ${agent.name}`, 'info');
  };

  const handleWhitelist = async (agent: Agent) => {
    await saveAgents({ ...agent, status: 'confirmed' });
    toast(`${agent.name} whitelisted — moved to confirmed`, 'success');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeAgents(deleteTarget.id);
    toast(`${deleteTarget.id} removed`, 'error');
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /></div>
          <div className="flex gap-2"><Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-36" /></div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Agent Discovery</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · AI agent inventory & shadow AI detection</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleScan} disabled={scanning}
            style={{ borderRadius: 0 }}>
            {scanning ? (
              <><CircleNotch className="h-4 w-4 animate-spin" />Scanning...</>
            ) : (
              <><Scan className="h-4 w-4" />Scan Network</>
            )}
          </Button>
          <Button onClick={() => setRegisterOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <Plus className="h-4 w-4" />Register Agent
          </Button>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: totalAgents, color: 'hsl(var(--text-1))', icon: Robot },
          { label: 'Confirmed', value: confirmedAgents, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
          { label: 'Shadow AI', value: shadowAgents, color: 'hsl(var(--destructive))', icon: ShieldWarning },
          { label: 'High Risk', value: highRiskAgents, color: 'hsl(var(--s-wn-tx))', icon: Warning },
        ].map(stat => (
          <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="all" style={{ borderRadius: 0 }}>All Agents ({totalAgents})</TabsTrigger>
            <TabsTrigger value="confirmed" style={{ borderRadius: 0 }}>Confirmed ({confirmedAgents})</TabsTrigger>
            <TabsTrigger value="shadow" style={{ borderRadius: 0 }}>
              Shadow AI
              <Badge className="ml-1.5" style={{ background: 'hsl(0 72% 51% / 0.2)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10, padding: '0 4px' }}>
                {shadowAgents}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <div className="relative min-w-52">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <Robot size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No agents found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['ID', 'Name', 'Type', 'Model', 'Risk', 'Status', 'API Calls (7d)', 'First Seen', 'Owner', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(a => {
                        const isShadow = a.status === 'shadow';
                        const sc = severityColor(a.risk);
                        const stc = statusColor(a.status);
                        return (
                          <tr
                            key={a.id}
                            className="hover:bg-muted/30 transition-colors"
                            style={{
                              borderBottom: '1px solid hsl(var(--border))',
                              borderLeft: isShadow ? '4px solid hsl(0 72% 51%)' : '4px solid transparent',
                            }}
                          >
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.id}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.name}</span>
                                {isShadow && (
                                  <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9, fontWeight: 700 }}>
                                    SHADOW
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.type}</td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>{a.model}</td>
                            <td className="px-4 py-3">
                              <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 10 }}>
                                {a.risk}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge style={{ background: stc.bg, color: stc.text, borderRadius: 0, fontSize: 10 }}>
                                {a.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{formatNumber(a.apiCalls7d)}</span>
                                {trendIndicator(a.apiCalls7d)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(a.firstSeen)}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.owner}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {isShadow ? (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive"
                                      onClick={() => setQuarantineTarget(a)}>
                                      <Prohibit size={12} />Quarantine
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                      style={{ color: 'hsl(var(--s-wn-tx))' }}
                                      onClick={() => handleRaiseIncident(a)}>
                                      <Siren size={12} />Incident
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                      onClick={() => handleRequestOwnership(a)}>
                                      <Lightning size={12} />Ownership
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[hsl(var(--s-ok-tx))]"
                                      onClick={() => handleWhitelist(a)}>
                                      <CheckCircle size={12} />Whitelist
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                      onClick={() => { setSelectedAgent(a); setDetailTab('overview'); }}>
                                      <Eye size={14} />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                      onClick={() => { setSelectedAgent(a); setDetailTab('overview'); }}>
                                      <PencilSimple size={14} />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                      onClick={() => setDeleteTarget(a)}>
                                      <Trash size={14} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description={`This will permanently remove ${deleteTarget?.id} from the agent registry.`}
        confirmLabel="Delete Agent"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Quarantine Confirm */}
      <ConfirmDialog
        open={!!quarantineTarget}
        onOpenChange={() => setQuarantineTarget(null)}
        title={`Quarantine ${quarantineTarget?.name}?`}
        description={`Block all API calls from ${quarantineTarget?.name}? This will immediately halt all agent activity.`}
        confirmLabel="Quarantine Agent"
        variant="destructive"
        onConfirm={handleQuarantine}
      />

      {/* Agent Detail Sheet */}
      <Sheet open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <SheetContent style={{ borderRadius: 0, width: 640, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              {selectedAgent?.name} <span className="text-xs font-mono font-normal" style={{ color: 'hsl(var(--text-4))' }}>{selectedAgent?.id}</span>
            </SheetTitle>
          </SheetHeader>
          {selectedAgent && (
            <div className="mt-4 overflow-y-auto h-[calc(100vh-120px)]">
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="dataflow" style={{ borderRadius: 0 }}>Data Flow</TabsTrigger>
                  <TabsTrigger value="risk" style={{ borderRadius: 0 }}>Risk Assessment</TabsTrigger>
                  <TabsTrigger value="compliance" style={{ borderRadius: 0 }}>Compliance</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <Badge style={{ ...severityColor(selectedAgent.risk), borderRadius: 0, fontSize: 10 }}>{selectedAgent.risk}</Badge>
                    <Badge style={{ ...statusColor(selectedAgent.status), borderRadius: 0, fontSize: 10 }}>{selectedAgent.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Type</p><p className="mt-1 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedAgent.type}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Model</p><p className="mt-1 font-mono" style={{ color: 'hsl(var(--text-1))' }}>{selectedAgent.model}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Owner</p><p className="mt-1 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedAgent.owner}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Department</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedAgent.department}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>First Seen</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedAgent.firstSeen)}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>Last Active</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selectedAgent.lastActive)}</p></div>
                    <div><p style={{ color: 'hsl(var(--text-4))' }}>API Calls (7d)</p><p className="mt-1 font-bold" style={{ color: 'hsl(var(--text-1))' }}>{formatNumber(selectedAgent.apiCalls7d)}</p></div>
                  </div>
                  <div><p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</p><p className="text-xs mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedAgent.description}</p></div>

                  {selectedAgent.status === 'shadow' && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-destructive">Forensic Timeline</p>
                      {[
                        { time: '2026-04-05T14:20:00Z', event: 'API call to customer_data endpoint detected' },
                        { time: '2026-04-05T12:15:00Z', event: 'Unauthorized model invocation via external gateway' },
                        { time: '2026-04-04T09:30:00Z', event: 'First detected in network scan — no registration found' },
                        { time: selectedAgent.firstSeen + 'T00:00:00Z', event: `Agent first seen — ${selectedAgent.department} department` },
                      ].map((entry, idx) => (
                        <div key={idx} className="flex gap-3 py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'hsl(var(--destructive))' }} />
                          <div>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{entry.event}</p>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{timeAgo(entry.time)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Data Flow Tab */}
                <TabsContent value="dataflow" className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Models Called</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge style={{ background: 'hsl(220 90% 56% / 0.15)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>
                        {selectedAgent.model}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Data Categories Transmitted</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedAgent.dataAccess.map(d => (
                        <Badge key={d} style={{ background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>
                          {d.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>DPA Status</p>
                    {selectedAgent.model.includes('GPT') ? (
                      <div className="flex items-center gap-2">
                        <Badge style={{ ...statusColor('signed'), borderRadius: 0, fontSize: 10 }}>DPA Signed — OpenAI</Badge>
                      </div>
                    ) : selectedAgent.model.includes('Claude') ? (
                      <Badge style={{ ...statusColor('signed'), borderRadius: 0, fontSize: 10 }}>DPA Signed — Anthropic</Badge>
                    ) : (
                      <Badge style={{ ...statusColor('pending'), borderRadius: 0, fontSize: 10 }}>Internal — No DPA required</Badge>
                    )}
                  </div>
                </TabsContent>

                {/* Risk Assessment Tab */}
                <TabsContent value="risk" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Risk Level</p>
                      <Badge style={{ ...severityColor(selectedAgent.risk), borderRadius: 0, fontSize: 11, marginTop: 4 }}>
                        {selectedAgent.risk.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Data Sensitivity</p>
                      <p className="text-sm font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                        {selectedAgent.dataAccess.some(d => d.includes('customer') || d.includes('credit') || d.includes('hr') || d.includes('loan'))
                          ? 'PII / Restricted'
                          : 'Internal'}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Compliance Tab */}
                <TabsContent value="compliance" className="mt-4 space-y-3">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Compliance Checklist</p>
                  {[
                    { label: 'Governing policy assigned', met: selectedAgent.status === 'confirmed' },
                    { label: 'Model registered in inventory', met: selectedAgent.model !== 'Unknown' },
                    { label: 'Owner assigned', met: selectedAgent.owner !== 'Unknown' },
                    { label: 'Risk assessed', met: true },
                    { label: 'DPA in place', met: selectedAgent.status === 'confirmed' },
                    { label: 'EU AI Act classification', met: selectedAgent.risk !== 'critical' || selectedAgent.status === 'confirmed' },
                  ].map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{check.label}</span>
                      {check.met ? (
                        <CheckCircle size={16} className="text-[hsl(var(--s-ok-tx))]" />
                      ) : (
                        <Warning size={16} className="text-destructive" />
                      )}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Register Agent Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Register Agent</DialogTitle>
          </DialogHeader>
          <RegisterAgentForm
            onSubmit={async (newAgent) => {
              await saveAgents(newAgent);
              toast(`${newAgent.name} registered`, 'success');
              setRegisterOpen(false);
            }}
            nextId={`AGT-${String(agentList.length + 1).padStart(3, '0')}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Register Agent Form ───────────────────────────────────────────────────────

function RegisterAgentForm({ onSubmit, nextId }: { onSubmit: (a: Agent) => void; nextId: string }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('workflow');
  const [model, setModel] = useState('Internal');
  const [owner, setOwner] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');

  const canSubmit = name && owner;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const now = new Date().toISOString().split('T')[0];
    onSubmit({
      id: nextId, name, type, model, risk: 'low', status: 'confirmed',
      apiCalls7d: 0, owner, department, description: description || name,
      firstSeen: now, lastActive: now, dataAccess: [],
    });
  };

  return (
    <div className="space-y-3 py-2">
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name *</label>
        <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Agent name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {['monitoring', 'workflow', 'processing', 'decision', 'external_api', 'orchestrator'].map(t =>
                <SelectItem key={t} value={t}>{t}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Model</label>
          <Input value={model} onChange={e => setModel(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. GPT-4o, Internal" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner *</label>
          <Input value={owner} onChange={e => setOwner(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Owner name" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Department</label>
          <Input value={department} onChange={e => setDepartment(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Department" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          className="mt-1 w-full h-16 text-xs p-2 resize-none"
          style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
          placeholder="Describe what this agent does..." />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit}
          style={{ borderRadius: 0, background: canSubmit ? 'hsl(var(--brand))' : undefined, color: canSubmit ? 'hsl(var(--bg-surface))' : undefined }}>
          <Plus size={14} />Register Agent
        </Button>
      </div>
    </div>
  );
}
