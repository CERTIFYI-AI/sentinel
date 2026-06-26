import { useState, useCallback } from 'react';
import {
  ShieldWarning, Warning, Prohibit, Siren, Detective, Eye,
  Lightning, CheckCircle, MagnifyingGlass, WifiHigh,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  AGENTS, Agent, severityColor, statusColor, formatDate, formatNumber,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';


// ── Helpers ───────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Main Component ────────────────────────────────────────────────────────────

export default function ShadowAI() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const shadowAgentsInit = AGENTS.filter(a => a.status === 'shadow');

  const [agents, setAgents] = useState<Agent[]>(shadowAgentsInit);
  const [search, setSearch] = useState('');
  const [investigateAgent, setInvestigateAgent] = useState<Agent | null>(null);
  const [quarantineTarget, setQuarantineTarget] = useState<Agent | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Metrics
  const shadowDetected = agents.length;
  const criticalRisk = agents.filter(a => a.risk === 'critical').length;
  const unauthorizedCalls = agents.reduce((sum, a) => sum + a.apiCalls7d, 0);
  const pendingRemediation = agents.filter(a => a.status === 'shadow').length;

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.department.toLowerCase().includes(search.toLowerCase())
  );

  const chartData = agents.map(a => ({
    name: a.name.length > 18 ? a.name.slice(0, 18) + '...' : a.name,
    calls: a.apiCalls7d,
    fullName: a.name,
  }));

  const handleQuarantine = () => {
    if (!quarantineTarget) return;
    setAgents(prev => prev.map(a => a.id === quarantineTarget.id ? { ...a, status: 'quarantined' as Agent['status'] } : a));
    toast(`${quarantineTarget.name} quarantined — all API calls blocked`, 'error');
    setQuarantineTarget(null);
  };

  const handleRaiseIncident = (agent: Agent) => {
    toast(`INC-006 created from ${agent.name} — Shadow AI incident`, 'info');
  };

  const handleWhitelist = (agent: Agent) => {
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'confirmed' as Agent['status'] } : a));
    toast(`${agent.name} whitelisted — moved to confirmed agents`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Shadow AI Detection</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Unauthorized AI tool detection & remediation</p>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Shadow Detected', value: shadowDetected, color: 'hsl(var(--destructive))', icon: ShieldWarning },
          { label: 'Critical Risk', value: criticalRisk, color: 'hsl(var(--destructive))', icon: Warning },
          { label: 'Unauthorized API Calls (7d)', value: `${(unauthorizedCalls / 1000).toFixed(1)}K`, color: 'hsl(var(--s-wn-tx))', icon: WifiHigh },
          { label: 'Pending Remediation', value: pendingRemediation, color: 'hsl(var(--s-wn-tx))', icon: Detective },
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

      {/* Alert Banner */}
      <div className="p-4 flex items-start gap-3" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.3)' }}>
        <Siren size={20} style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-sm font-semibold text-destructive">
            {shadowDetected} unauthorized AI tools detected. Potential GDPR Art.5 violation — personal data may be processed without lawful basis.
          </p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>
            Immediate investigation required. Shadow agents are accessing customer data, source code, and internal APIs without governance controls.
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Shadow Agent API Activity (7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} />
              <YAxis
                tick={{ fill: ct.axis, fontSize: 11 }}
                label={{ value: 'Unauthorized API Calls', angle: -90, position: 'insideLeft', style: { fill: ct.axis, fontSize: 10 } }}
              />
              <RechartsTooltip
                contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                formatter={(v: number, _: string, p: any) => [formatNumber(v), p.payload.fullName]}
              />
              <Bar dataKey="calls" name="API Calls" fill="hsl(0 72% 51%)" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative min-w-52">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search shadow agents..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
        </div>
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} agents</span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Agent', 'Type', 'Department', 'First Detected', 'API Calls (7d)', 'Risk', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const sc = severityColor(a.risk);
                  const stc = statusColor(a.status);
                  return (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors"
                      style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.name}</p>
                          <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{a.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.type}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.department}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(a.firstSeen)}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{formatNumber(a.apiCalls7d)}</td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: sc.bg, color: sc.text, borderRadius: 0, fontSize: 10 }}>
                          {a.risk}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive"
                            onClick={() => setQuarantineTarget(a)}>
                            <Prohibit size={12} className="mr-1" />Quarantine
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                            onClick={() => setInvestigateAgent(a)}>
                            <Eye size={12} className="mr-1" />Investigate
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 dark:text-green-400"
                            onClick={() => handleWhitelist(a)}>
                            <CheckCircle size={12} className="mr-1" />Whitelist
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                            style={{ color: 'hsl(var(--s-wn-tx))' }}
                            onClick={() => handleRaiseIncident(a)}>
                            <Siren size={12} className="mr-1" />Incident
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quarantine Confirm */}
      <ConfirmDialog
        open={!!quarantineTarget}
        onOpenChange={() => setQuarantineTarget(null)}
        title={`Quarantine ${quarantineTarget?.name}?`}
        description={`Block all API calls from ${quarantineTarget?.name}? This will immediately halt all agent activity and prevent data access.`}
        confirmLabel="Quarantine Agent"
        variant="destructive"
        onConfirm={handleQuarantine}
      />

      {/* Investigate Drawer */}
      <Sheet open={!!investigateAgent} onOpenChange={() => setInvestigateAgent(null)}>
        <SheetContent style={{ borderRadius: 0, width: 560, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              Investigation: {investigateAgent?.name}
            </SheetTitle>
          </SheetHeader>
          {investigateAgent && (
            <div className="mt-4 space-y-5 overflow-y-auto h-[calc(100vh-120px)]">
              {/* Status banner */}
              <div className="flex gap-2 flex-wrap">
                <Badge style={{ ...severityColor(investigateAgent.risk), borderRadius: 0, fontSize: 10 }}>{investigateAgent.risk} risk</Badge>
                <Badge style={{ ...statusColor(investigateAgent.status), borderRadius: 0, fontSize: 10 }}>{investigateAgent.status}</Badge>
                <Badge style={{ background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                  UNAUTHORIZED
                </Badge>
              </div>

              {/* Agent details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Agent ID</p><p className="font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.id}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Department</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.department}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Model</p><p className="font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.model}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>First Detected</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(investigateAgent.firstSeen)}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>API Calls (7d)</p><p className="font-bold mt-1 text-destructive">{formatNumber(investigateAgent.apiCalls7d)}</p></div>
              </div>

              {/* Evidence Collected */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Evidence Collected</p>
                <div className="space-y-2">
                  {[
                    { label: 'Network traffic analysis', detail: `${formatNumber(investigateAgent.apiCalls7d)} unauthorized API calls in 7 days` },
                    { label: 'Data access log', detail: `Accessed: ${investigateAgent.dataAccess.join(', ')}` },
                    { label: 'Model usage', detail: `Using ${investigateAgent.model} without governance registration` },
                    { label: 'Department origin', detail: `Originating from ${investigateAgent.department} department infrastructure` },
                  ].map((ev, idx) => (
                    <div key={idx} className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{ev.label}</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{ev.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Accessed */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Data Categories Accessed</p>
                <div className="flex gap-2 flex-wrap">
                  {investigateAgent.dataAccess.map(d => (
                    <Badge key={d} style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                      {d.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Recommended Actions</p>
                <div className="space-y-2">
                  {[
                    'Quarantine agent immediately to prevent further data access',
                    'Raise incident for GDPR Art. 5 compliance investigation',
                    `Contact ${investigateAgent.department} department head for ownership clarification`,
                    'Review accessed data categories for PII exposure',
                    'Assess whether data subject notification (Art. 34) is required',
                  ].map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <span className="w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{
                        background: 'hsl(var(--border))', color: 'hsl(var(--text-1))',
                      }}>{idx + 1}</span>
                      <p style={{ color: 'hsl(var(--text-1))' }}>{action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                  onClick={() => { toast('Remediation plan created', 'info'); setInvestigateAgent(null); }}>
                  <Lightning size={14} className="mr-1" />Create Remediation Plan
                </Button>
                <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}
                  onClick={() => { setInvestigateAgent(null); setQuarantineTarget(investigateAgent); }}>
                  <Prohibit size={14} className="mr-1" />Quarantine Now
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
