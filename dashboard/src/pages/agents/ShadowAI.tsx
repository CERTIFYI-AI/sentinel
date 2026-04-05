import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, MagnifyingGlass, Lock, CheckCircle, ShieldSlash, Warning, Robot, Plus
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { AGENTS, severityColor, formatDate, formatNumber } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

const SHADOW_IDS = ['AGT-010', 'AGT-011', 'AGT-012'];
const shadowAgents = AGENTS.filter(a => SHADOW_IDS.includes(a.id));

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="mt-0.5 text-[hsl(var(--brand))]">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{value}</div>
        <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

export default function ShadowAI() {
  const orgName = useSettingsStore(s => s.orgName);
  const chart = useChartTheme();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<typeof AGENTS[0] | null>(null);
  const [agents, setAgents] = useState(shadowAgents);

  const criticalCount = agents.filter(a => a.risk === 'critical').length;
  const totalApiCalls = agents.reduce((s, a) => s + a.apiCalls7d, 0);

  const chartData = agents.map(a => ({
    name: a.name.replace(/-/g, ' '),
    apiCalls: a.apiCalls7d,
    fill: a.risk === 'critical' ? '#ef4444' : '#f97316',
  }));

  const handleQuarantine = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'quarantined' as const } : a));
  };

  const handleWhitelist = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Shadow AI Detection</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — Unauthorized AI agents detected on network</p>
        </div>
        <Button className="gap-2">
          <Plus size={16} /> Register / Whitelist
        </Button>
      </div>

      {/* Alert Banner */}
      <div className="border border-red-700 bg-red-950/30 p-4 flex items-center gap-3">
        <ShieldSlash size={20} className="text-red-400 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-red-300">Shadow AI Detected</div>
          <div className="text-xs text-red-400 mt-0.5">
            {agents.length} unauthorized agents found on your network. Immediate investigation recommended for critical-risk agents.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Robot size={20} />} value={AGENTS.length} label="Total Agents" />
        <StatCard icon={<ShieldSlash size={20} />} value={agents.length} label="Shadow Detected" />
        <StatCard icon={<Warning size={20} />} value={criticalCount} label="Critical Risk" />
        <StatCard icon={<Eye size={20} />} value={`${(totalApiCalls / 1000).toFixed(1)}K`} label="API Calls 7d" />
      </div>

      {/* Bar Chart */}
      <Card className="p-4">
        <div className="text-sm font-medium text-[hsl(var(--text-1))] mb-4">Shadow Agent API Activity (7 Days)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis dataKey="name" stroke={chart.axis} tick={{ fontSize: 11 }} />
            <YAxis stroke={chart.axis} tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(1)}K`} label={{ value: 'API Calls', angle: -90, position: 'insideLeft', style: { fill: chart.axis, fontSize: 11 } }} />
            <Tooltip
              contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText }}
              formatter={(v: number) => [formatNumber(v), 'API Calls']}
            />
            <Bar dataKey="apiCalls" radius={0} fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Shadow Agent Cards */}
      <div className="space-y-3">
        {agents.map(agent => {
          const rc = severityColor(agent.risk);
          return (
            <Card key={agent.id} className="border-red-800 bg-red-950/10">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 bg-red-900/30 border border-red-700">
                      <ShieldSlash size={16} className="text-red-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[hsl(var(--text-1))]">{agent.name}</span>
                        <span className="font-mono text-xs text-[hsl(var(--text-4))]">{agent.id}</span>
                        <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{agent.risk}</span>
                      </div>
                      <div className="text-sm text-[hsl(var(--text-3))] mt-1">{agent.description}</div>
                      <div className="flex gap-4 mt-2 text-xs text-[hsl(var(--text-4))]">
                        <span>Model: <strong className="text-[hsl(var(--text-3))]">{agent.model}</strong></span>
                        <span>Dept: <strong className="text-[hsl(var(--text-3))]">{agent.department}</strong></span>
                        <span>API Calls 7d: <strong className="text-[hsl(var(--text-3))]">{formatNumber(agent.apiCalls7d)}</strong></span>
                        <span>First Seen: <strong className="text-[hsl(var(--text-3))]">{formatDate(agent.firstSeen)}</strong></span>
                        <span>Last Active: <strong className="text-[hsl(var(--text-3))]">{formatDate(agent.lastActive)}</strong></span>
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {agent.dataAccess.map(d => (
                          <span key={d} className="px-1.5 py-0.5 text-xs bg-red-900/20 border border-red-800 text-red-400">{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelected(agent)}>
                      <Eye size={14} /> View
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/agents/${agent.id}`)}>
                      <MagnifyingGlass size={14} /> Investigate
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-orange-700 text-orange-400 hover:bg-orange-950/20" onClick={() => handleQuarantine(agent.id)}>
                      <Lock size={14} /> Quarantine
                    </Button>
                    <Button size="sm" className="gap-1.5 bg-green-700 hover:bg-green-600 text-white" onClick={() => handleWhitelist(agent.id)}>
                      <CheckCircle size={14} /> Whitelist
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[580px] max-w-full overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2 text-red-300">
                  <ShieldSlash size={18} /> {selected.name}
                </SheetTitle>
                <p className="text-sm text-[hsl(var(--text-4))]">{selected.description}</p>
              </SheetHeader>
              <div className="space-y-4">
                <div className="border border-red-700 bg-red-950/30 p-3 text-sm text-red-300">
                  <Warning size={14} className="inline mr-1.5" />
                  This is an unauthorized shadow AI agent. No governance controls are in place.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Agent ID', selected.id], ['Model', selected.model],
                    ['Type', selected.type], ['Department', selected.department],
                    ['Owner', selected.owner], ['Risk Level', selected.risk],
                    ['API Calls 7d', formatNumber(selected.apiCalls7d)],
                    ['First Seen', formatDate(selected.firstSeen)],
                    ['Last Active', formatDate(selected.lastActive)],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-[hsl(var(--bg-surface))] p-3 border border-[hsl(var(--border))]">
                      <div className="text-xs text-[hsl(var(--text-4))]">{k}</div>
                      <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-medium text-[hsl(var(--text-4))] mb-2 uppercase tracking-wide">Data Access (Unauthorized)</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.dataAccess.map(d => (
                      <span key={d} className="px-2 py-0.5 text-xs bg-red-900/20 border border-red-800 text-red-400">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-orange-700 hover:bg-orange-600 text-white" onClick={() => { handleQuarantine(selected.id); setSelected(null); }}>
                    <Lock size={14} className="mr-1" /> Quarantine
                  </Button>
                  <Button size="sm" className="bg-green-700 hover:bg-green-600 text-white" onClick={() => handleWhitelist(selected.id)}>
                    <CheckCircle size={14} className="mr-1" /> Whitelist
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
