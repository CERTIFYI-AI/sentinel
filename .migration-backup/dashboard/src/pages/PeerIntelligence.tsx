import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  Users, ShieldCheck, TrendUp, Warning, Brain, Lock,
  Globe, ChartBar, Info, Trophy, ArrowUp, ArrowDown, Minus,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

const SECTOR_PERCENTILES = [
  { dimension: 'Risk Score', you: 72, peer: 61, top10: 88 },
  { dimension: 'Compliance', you: 75, peer: 68, top10: 92 },
  { dimension: 'Bias Controls', you: 63, peer: 71, top10: 89 },
  { dimension: 'Explainability', you: 58, peer: 55, top10: 84 },
  { dimension: 'Incident Response', you: 80, peer: 64, top10: 91 },
  { dimension: 'Data Governance', you: 69, peer: 62, top10: 87 },
];

const RADAR_DATA = SECTOR_PERCENTILES.map(d => ({
  subject: d.dimension,
  You: d.you,
  'Sector Avg': d.peer,
  'Top 10%': d.top10,
}));

const TREND_DATA = [
  { month: 'Oct', you: 62, sector: 58 },
  { month: 'Nov', you: 65, sector: 59 },
  { month: 'Dec', you: 67, sector: 60 },
  { month: 'Jan', you: 68, sector: 61 },
  { month: 'Feb', you: 71, sector: 62 },
  { month: 'Mar', you: 72, sector: 63 },
  { month: 'Apr', you: 74, sector: 63 },
];

const ANONYMIZED_PEERS = [
  { rank: 1, label: 'FS-ALPHA-7', overall: 91, risk: 88, compliance: 94, bias: 89, incident: 93, delta: '+3', trend: 'up' },
  { rank: 2, label: 'FS-BRAVO-2', overall: 88, risk: 85, compliance: 91, bias: 87, incident: 88, delta: '+1', trend: 'up' },
  { rank: 3, label: 'FS-CHARLIE-9', overall: 85, risk: 82, compliance: 88, bias: 84, incident: 86, delta: '0', trend: 'flat' },
  { rank: 7, label: 'YOU', overall: 72, risk: 72, compliance: 75, bias: 63, incident: 80, delta: '+4', trend: 'up', isYou: true },
  { rank: 8, label: 'FS-DELTA-4', overall: 71, risk: 69, compliance: 73, bias: 70, incident: 72, delta: '-1', trend: 'down' },
  { rank: 11, label: 'FS-ECHO-6', overall: 68, risk: 66, compliance: 70, bias: 65, incident: 71, delta: '+2', trend: 'up' },
  { rank: 14, label: 'FS-FOXTROT-1', overall: 61, risk: 58, compliance: 63, bias: 60, incident: 62, delta: '-2', trend: 'down' },
];

const IMPROVEMENT_OPP = [
  { area: 'Explainability Documentation', gap: 26, peers: 55, you: 58, impact: 'High', effort: 'Medium', roi: '$240K risk reduction' },
  { area: 'Automated Bias Testing', gap: 8, peers: 71, you: 63, impact: 'Critical', effort: 'Low', roi: 'EU AI Act compliance' },
  { area: 'Model Lineage Tracking', gap: 14, peers: 69, you: 58, impact: 'High', effort: 'Medium', roi: '$180K audit cost savings' },
  { area: 'Incident SLA Adherence', gap: 4, peers: 64, you: 80, impact: 'Low', effort: 'Low', roi: 'Already above peer avg' },
];

const NET_STATS = [
  { label: 'Anonymized Peers (Financial Services)', value: '47', icon: Users },
  { label: 'Cross-Sector Benchmarks', value: '12', icon: Globe },
  { label: 'Data Points Contributed (anonymized)', value: '8,400+', icon: ChartBar },
  { label: 'Your Industry Percentile', value: '67th', icon: Trophy },
];

function MetricTile({ label, value, icon: Icon, highlight }: { label: string; value: string; icon: React.ElementType; highlight?: boolean }) {
  return (
    <div className="p-4" style={{ border: '1px solid hsl(var(--border))', background: highlight ? 'hsl(var(--brand) / 0.06)' : 'hsl(var(--bg-surface))' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: 'hsl(var(--brand))' }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: highlight ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>{value}</p>
    </div>
  );
}

export default function PeerIntelligence() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [tab, setTab] = useState('overview');

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Peer Intelligence Benchmarking</h1>
              <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>
                NETWORK INTELLIGENCE
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · Anonymous cross-sector AI risk benchmarking powered by 47 financial services peers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs px-2 py-1" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-4))' }}>
              <Lock size={11} />
              <span>All peer data fully anonymized · Zero PII shared</span>
            </div>
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
              Export Benchmarks
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {NET_STATS.map(s => <MetricTile key={s.label} label={s.label} value={s.value} icon={s.icon} highlight={s.label.includes('Percentile')} />)}
        </div>

        <div className="p-3 flex items-start gap-3" style={{ border: '1px solid hsl(var(--brand) / 0.3)', background: 'hsl(var(--brand) / 0.04)' }}>
          <Info size={16} style={{ color: 'hsl(var(--brand))', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand))' }}>Network Intelligence Advantage</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
              Your participation contributes anonymized metadata to the Sentinel Intelligence Network. As more peers join, your benchmarks become more precise and industry-specific.
              This proprietary dataset — built exclusively from Sentinel clients — cannot be replicated by any alternative platform.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Performance Radar</TabsTrigger>
            <TabsTrigger value="leaderboard" style={{ borderRadius: 0 }}>Peer Leaderboard</TabsTrigger>
            <TabsTrigger value="trend" style={{ borderRadius: 0 }}>Trend vs. Sector</TabsTrigger>
            <TabsTrigger value="opportunities" style={{ borderRadius: 0 }}>Improvement Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Multi-Dimension Risk Radar</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={RADAR_DATA}>
                      <PolarGrid stroke={ct.grid} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: ct.axis, fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: ct.axis, fontSize: 9 }} />
                      <Radar name="You" dataKey="You" stroke="hsl(var(--brand))" fill="hsl(var(--brand))" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name="Sector Avg" dataKey="Sector Avg" stroke="#6b7280" fill="#6b7280" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
                      <Radar name="Top 10%" dataKey="Top 10%" stroke="hsl(var(--s-ok-tx))" fill="hsl(var(--s-ok-tx))" fillOpacity={0.08} strokeWidth={1} strokeDasharray="2 4" />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Dimension-by-Dimension vs. Peers</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={SECTOR_PERCENTILES} layout="vertical" barCategoryGap={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: ct.axis, fontSize: 9 }} />
                      <YAxis dataKey="dimension" type="category" tick={{ fill: ct.axis, fontSize: 10 }} width={100} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="you" name="You" fill="hsl(var(--brand))" radius={0} />
                      <Bar dataKey="peer" name="Sector Avg" fill={ct.grid} radius={0} />
                      <Bar dataKey="top10" name="Top 10%" fill="hsl(var(--s-ok-tx))" radius={0} fillOpacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Rank', 'Peer ID', 'Overall Score', 'Risk Mgmt', 'Compliance', 'Bias Controls', 'Incident Resp.', 'QoQ Change'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ANONYMIZED_PEERS.map((peer, i) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        background: peer.isYou ? 'hsl(var(--brand) / 0.06)' : undefined,
                      }}>
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-bold" style={{ color: peer.rank <= 3 ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>#{peer.rank}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs font-semibold" style={{ color: peer.isYou ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>
                            {peer.label}
                          </span>
                          {peer.isYou && <Badge className="ml-2 text-[9px] px-1 py-0" style={{ borderRadius: 0, background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}>YOU</Badge>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold" style={{ color: peer.overall >= 80 ? 'hsl(var(--s-ok-tx))' : peer.overall >= 65 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>{peer.overall}</span>
                            <div className="w-16 h-1.5 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                              <div style={{ width: `${peer.overall}%`, height: '100%', background: peer.overall >= 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--brand))' }} />
                            </div>
                          </div>
                        </td>
                        {[peer.risk, peer.compliance, peer.bias, peer.incident].map((v, j) => (
                          <td key={j} className="px-4 py-2.5 font-mono" style={{ color: v >= 80 ? 'hsl(var(--s-ok-tx))' : v >= 65 ? 'hsl(var(--text-1))' : 'hsl(var(--s-wn-tx))' }}>{v}</td>
                        ))}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            {peer.trend === 'up' ? <ArrowUp size={11} style={{ color: 'hsl(var(--s-ok-tx))' }} /> : peer.trend === 'down' ? <ArrowDown size={11} style={{ color: 'hsl(var(--destructive))' }} /> : <Minus size={11} style={{ color: 'hsl(var(--text-4))' }} />}
                            <span className="text-[10px]" style={{ color: peer.trend === 'up' ? 'hsl(var(--s-ok-tx))' : peer.trend === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>{peer.delta}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Your Overall Score vs. Financial Services Sector Average — 7 Months</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="month" tick={{ fill: ct.axis, fontSize: 11 }} />
                    <YAxis domain={[50, 100]} tick={{ fill: ct.axis, fontSize: 11 }} />
                    <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="you" stroke="hsl(var(--brand))" strokeWidth={2.5} name="Your Score" dot={{ fill: 'hsl(var(--brand))', r: 4 }} />
                    <Line type="monotone" dataKey="sector" stroke={ct.axis} strokeWidth={1.5} strokeDasharray="5 3" name="Sector Average" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--s-ok-tx))' }}>You are outpacing sector average by +11 points and gaining ground at 2× the sector improvement rate.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Improvement Area', 'Your Score', 'Peer Avg', 'Gap', 'Impact', 'Effort', 'Projected ROI'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {IMPROVEMENT_OPP.map((opp, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{opp.area}</td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: opp.you > opp.peers ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>{opp.you}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{opp.peers}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold" style={{ color: opp.gap > 10 ? 'hsl(var(--destructive))' : opp.gap > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
                            {opp.you > opp.peers ? `+${opp.you - opp.peers}` : `-${opp.gap}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] px-1.5 py-0.5 font-medium" style={{
                            background: opp.impact === 'Critical' ? 'hsl(var(--destructive) / 0.12)' : opp.impact === 'High' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-nt-bg))',
                            color: opp.impact === 'Critical' ? 'hsl(var(--destructive))' : opp.impact === 'High' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))',
                          }}>{opp.impact}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' }}>{opp.effort}</span>
                        </td>
                        <td className="px-4 py-3" style={{ color: 'hsl(var(--s-ok-tx))' }}>{opp.roi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
