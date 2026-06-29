import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { TooltipProvider } from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  Robot, Lightning, ShieldCheck, Warning, CheckCircle, Clock,
  Play, Pause, Gear, ChartBar, ArrowRight, Brain, Bell,
  FileText, Users, Database,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardRow, type StatCardRowItem } from '@/components/ui/StatCardRow';

const AUTOPILOT_AGENTS = [
  {
    id: 'AP-001', name: 'Control Monitor', description: 'Continuously scans all 847 controls for drift, failure, or expiry. Auto-remediates low-risk deviations.',
    icon: ShieldCheck, status: 'running', actionsToday: 12, hoursSaved: 4.2,
    lastAction: '2026-04-12 10:47 — Auto-remediated control C-204 (outdated policy reference)',
    triggers: ['Control score drops below threshold', 'Control owner unassigned', 'Evidence expiry within 14 days'],
    config: { threshold: 75, autoRemediate: true, notifyOnAction: true },
  },
  {
    id: 'AP-002', name: 'Bias Drift Detector', description: 'Monitors production model outputs for fairness drift. Triggers bias audit and notifies CISO when demographic parity degrades.',
    icon: Brain, status: 'running', actionsToday: 3, hoursSaved: 6.0,
    lastAction: '2026-04-12 09:15 — Fairness drift alert raised for MDL-004 (Δ -0.08 vs baseline)',
    triggers: ['Fairness score drops >5% vs baseline', 'Demographic parity violation', 'Statistical parity distance >0.1'],
    config: { threshold: 0.05, autoRemediate: false, notifyOnAction: true },
  },
  {
    id: 'AP-003', name: 'Regulatory Submission Bot', description: 'Auto-drafts and queues regulatory submissions, filing attestations, and evidence packages for upcoming deadlines.',
    icon: FileText, status: 'running', actionsToday: 2, hoursSaved: 3.5,
    lastAction: '2026-04-12 08:00 — EU AI Act conformity package prepared (152 documents, ready for CISO sign-off)',
    triggers: ['Regulation deadline within 30 days', 'New regulation published (impact >Medium)', 'Evidence package complete'],
    config: { threshold: 30, autoRemediate: false, notifyOnAction: true },
  },
  {
    id: 'AP-004', name: 'Vendor Risk Watchdog', description: 'Monitors third-party AI vendor risk scores, SLA breaches, and security advisories. Auto-escalates to TPRM team.',
    icon: Users, status: 'paused', actionsToday: 0, hoursSaved: 2.8,
    lastAction: '2026-04-10 16:30 — Vendor OpenAI SLA breach escalated to procurement',
    triggers: ['Vendor risk score exceeds High', 'SLA missed by >24h', 'Security advisory published for vendor'],
    config: { threshold: 70, autoRemediate: false, notifyOnAction: true },
  },
  {
    id: 'AP-005', name: 'Incident Triage AI', description: 'Auto-classifies incoming incidents by severity, assigns to playbooks, and escalates critical events to on-call CISO.',
    icon: Warning, status: 'running', actionsToday: 7, hoursSaved: 5.1,
    lastAction: '2026-04-12 11:02 — INC-058 auto-classified Critical, playbook PB-003 activated',
    triggers: ['New incident created', 'Severity auto-classification confidence >85%', 'P1 unacknowledged >15min'],
    config: { threshold: 85, autoRemediate: true, notifyOnAction: true },
  },
  {
    id: 'AP-006', name: 'Evidence Expiry Guardian', description: 'Tracks all evidence validity periods, sends renewal reminders, and auto-archives expired evidence with compliance notes.',
    icon: Database, status: 'running', actionsToday: 5, hoursSaved: 1.9,
    lastAction: '2026-04-12 07:00 — 3 evidence items renewed automatically; 2 flagged for manual review',
    triggers: ['Evidence expires within 21 days', 'Evidence owner inactive >7 days', 'Control links to expired evidence'],
    config: { threshold: 21, autoRemediate: true, notifyOnAction: false },
  },
];

const ACTION_LOG = [
  { ts: '2026-04-12 11:02', agent: 'Incident Triage AI', action: 'Auto-classified INC-058 as Critical; activated playbook PB-003', outcome: 'Escalated', severity: 'critical' },
  { ts: '2026-04-12 10:47', agent: 'Control Monitor', action: 'Remediated control C-204 — updated policy reference to current version', outcome: 'Resolved', severity: 'low' },
  { ts: '2026-04-12 10:23', agent: 'Incident Triage AI', action: 'Auto-classified INC-057 as Medium; assigned to remediation queue', outcome: 'Assigned', severity: 'medium' },
  { ts: '2026-04-12 09:15', agent: 'Bias Drift Detector', action: 'Fairness drift alert: MDL-004 demographic parity Δ -0.08; CISO notified', outcome: 'Alert Sent', severity: 'high' },
  { ts: '2026-04-12 08:00', agent: 'Reg. Submission Bot', action: 'EU AI Act conformity package prepared (152 docs) — queued for CISO sign-off', outcome: 'Queued', severity: 'info' },
  { ts: '2026-04-12 07:00', agent: 'Evidence Guardian', action: 'Auto-renewed 3 evidence items; flagged EVD-091 and EVD-104 for manual review', outcome: 'Partial', severity: 'medium' },
  { ts: '2026-04-11 16:30', agent: 'Vendor Risk Watchdog', action: 'OpenAI vendor SLA breach detected; escalated to procurement (TPRM-018)', outcome: 'Escalated', severity: 'high' },
  { ts: '2026-04-11 14:00', agent: 'Control Monitor', action: 'Control C-187 score below 75 — owner re-assigned to Dr. Nina Okafor', outcome: 'Resolved', severity: 'medium' },
];

const EFFICIENCY_TREND = [
  { date: 'Oct', hours: 12, actions: 28 },
  { date: 'Nov', hours: 18, actions: 41 },
  { date: 'Dec', hours: 22, actions: 53 },
  { date: 'Jan', hours: 26, actions: 67 },
  { date: 'Feb', hours: 31, actions: 82 },
  { date: 'Mar', hours: 34, actions: 94 },
  { date: 'Apr', hours: 23, actions: 29 },
];

const sevColor = (s: string) => {
  if (s === 'critical') return { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))' };
  if (s === 'high') return { bg: 'hsl(var(--r-hi-bg))', tx: 'hsl(var(--r-hi-tx))' };
  if (s === 'medium') return { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))' };
  if (s === 'low') return { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))' };
  return { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--s-nt-tx))' };
};

export default function ComplianceAutopilot() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [agents, setAgents] = useState(AUTOPILOT_AGENTS);
  const [tab, setTab] = useState('agents');

  const running = agents.filter(a => a.status === 'running').length;
  const totalActions = agents.reduce((s, a) => s + a.actionsToday, 0);
  const totalHours = agents.reduce((s, a) => s + a.hoursSaved, 0);

  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== id) return a;
      const next = a.status === 'running' ? 'paused' : 'running';
      toast.success(`${a.name} ${next === 'running' ? 'activated' : 'paused'}`);
      return { ...a, status: next };
    }));
  };

  const statCards: StatCardRowItem[] = [
    { label: 'Active Agents', value: `${running}/6`, icon: <Robot size={14} weight="fill" />, variant: running >= 5 ? 'success' : 'warning' },
    { label: 'Actions Today', value: totalActions, icon: <CheckCircle size={14} weight="fill" /> },
    { label: 'Hours Saved (Apr)', value: `${totalHours.toFixed(1)}h`, icon: <Clock size={14} weight="fill" />, variant: 'success' },
    { label: 'Tasks Automated', value: '94%', icon: <ChartBar size={14} weight="fill" /> },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <PageHeader
          title="Compliance Autopilot"
          subtitle={`${orgName} · Autonomous AI agents monitoring, remediating, and filing 24/7`}
          icon={Robot}
          badge={
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderColor: 'hsl(var(--brand) / 0.25)' }}>Agentic</span>
              <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border" style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', borderColor: 'hsl(var(--s-ok-br))' }}>{running}/6 Active</span>
            </div>
          }
          actions={
            <button onClick={() => { toast.success('All agents synchronized'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--brand))] text-white text-xs font-medium hover:bg-[hsl(var(--brand-hover))]">
              <Lightning size={13} />Sync All
            </button>
          }
        />

        <StatCardRow cards={statCards} />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="agents" style={{ borderRadius: 0 }}>Agent Dashboard</TabsTrigger>
            <TabsTrigger value="log" style={{ borderRadius: 0 }}>Action Log</TabsTrigger>
            <TabsTrigger value="efficiency" style={{ borderRadius: 0 }}>Efficiency Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              {agents.map(agent => (
                <Card key={agent.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${agent.status === 'running' ? 'hsl(var(--brand) / 0.2)' : 'hsl(var(--border))'}` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 mt-0.5" style={{ background: 'hsl(var(--brand) / 0.08)' }}>
                          <agent.icon size={16} style={{ color: 'hsl(var(--brand))' }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{agent.name}</p>
                            <span className="text-[9px] font-mono px-1" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' }}>{agent.id}</span>
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'hsl(var(--text-4))' }}>{agent.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-[10px]" style={{ color: agent.status === 'running' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}>
                          {agent.status === 'running' ? 'Active' : 'Paused'}
                        </span>
                        <Switch checked={agent.status === 'running'} onCheckedChange={() => toggleAgent(agent.id)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 text-center" style={{ background: 'hsl(var(--bg-raised))' }}>
                        <p className="text-lg font-bold" style={{ color: 'hsl(var(--brand))' }}>{agent.actionsToday}</p>
                        <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>Actions today</p>
                      </div>
                      <div className="p-2 text-center" style={{ background: 'hsl(var(--bg-raised))' }}>
                        <p className="text-lg font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>{agent.hoursSaved}h</p>
                        <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>Hours saved/day</p>
                      </div>
                    </div>
                    <div className="mb-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--text-4))' }}>Last Action</p>
                      <p className="text-[10px]" style={{ color: 'hsl(var(--text-3))' }}>{agent.lastAction}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--text-4))' }}>Trigger Conditions</p>
                      <div className="space-y-0.5">
                        {agent.triggers.map((t, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <ArrowRight size={9} style={{ color: 'hsl(var(--brand))', marginTop: 2, flexShrink: 0 }} />
                            <span className="text-[10px]" style={{ color: 'hsl(var(--text-3))' }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="log" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Timestamp', 'Agent', 'Autonomous Action', 'Outcome'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ACTION_LOG.map((entry, i) => {
                      const sc = sevColor(entry.severity);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-4))' }}>{entry.ts}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: 'hsl(var(--brand) / 0.08)', color: 'hsl(var(--brand))' }}>{entry.agent}</span>
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'hsl(var(--text-2))' }}>{entry.action}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: sc.bg, color: sc.tx }}>{entry.outcome}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency" className="mt-4 space-y-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Engineering Hours Saved & Autonomous Actions — 7 Months</p>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={EFFICIENCY_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="date" tick={{ fill: ct.axis, fontSize: 11 }} />
                    <YAxis tick={{ fill: ct.axis, fontSize: 11 }} />
                    <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                    <Area type="monotone" dataKey="hours" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.15)" strokeWidth={2} name="Hours Saved" />
                    <Area type="monotone" dataKey="actions" stroke="hsl(var(--s-ok-tx))" fill="hsl(var(--s-ok-tx) / 0.1)" strokeWidth={1.5} name="Autonomous Actions" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'FTE Equivalent Automated', value: '2.4 FTE', note: 'Based on 34h/week autopilot throughput' },
                { label: 'Annual Cost Avoidance', value: '$387K', note: 'Estimated compliance labor cost offset' },
                { label: 'Audit Findings Prevented', value: '23', note: 'Auto-remediated before audit window' },
              ].map((kpi, i) => (
                <div key={i} className="p-4" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--brand))' }}>{kpi.value}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{kpi.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{kpi.note}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
