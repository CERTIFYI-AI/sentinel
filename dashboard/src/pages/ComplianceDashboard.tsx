import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  StackSimple, Warning, XCircle, ClipboardText, ShieldCheck,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { FRAMEWORKS, GAPS, CONTROLS, EVIDENCE, statusColor, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

const SCORE_TREND = [
  { month: 'Oct', score: 71 },
  { month: 'Nov', score: 72 },
  { month: 'Dec', score: 74 },
  { month: 'Jan', score: 75 },
  { month: 'Feb', score: 76 },
  { month: 'Mar', score: 78 },
];

const GAUGE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#06b6d4'];

function complianceBadge(score: number) {
  if (score >= 85) return { label: 'Compliant', bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
  if (score >= 65) return { label: 'Partial', bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
  return { label: 'Non-Compliant', bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
}

const overallScore = Math.round(
  FRAMEWORKS.reduce((s, f) => s + f.complianceScore, 0) / FRAMEWORKS.length
);

const criticalGaps = GAPS.filter(g => g.severity === 'critical').length;
const openGaps = GAPS.length;
const evidenceTotal = EVIDENCE.length;
const totalControls = CONTROLS.length;
const implementedControls = CONTROLS.filter(c => c.status === 'implemented').length;
const controlCoverage = Math.round((implementedControls / totalControls) * 100);

const gapsByFramework = FRAMEWORKS.map(f => ({
  name: f.name.replace('ISO/IEC ', '').replace('OWASP ', '').split(' ')[0],
  gaps: GAPS.filter(g => g.framework === f.name).length,
  fullName: f.name,
}));

export default function ComplianceDashboard() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const stats = [
    { label: 'Frameworks', value: FRAMEWORKS.length, icon: StackSimple, color: '#6366f1' },
    { label: 'Open Gaps', value: openGaps, icon: Warning, color: '#f97316' },
    { label: 'Critical Gaps', value: criticalGaps, icon: XCircle, color: '#ef4444' },
    { label: 'Evidence Items', value: evidenceTotal, icon: ClipboardText, color: '#3b82f6' },
    { label: 'Control Coverage', value: controlCoverage + '%', icon: ShieldCheck, color: '#10b981' },
  ];

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
          Compliance Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
          {orgName} · Overall compliance posture across {FRAMEWORKS.length} frameworks
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={26} style={{ color: s.color }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall Score + Score Trend */}
      <div className="grid grid-cols-3 gap-4">
        {/* Overall Compliance Score Gauge */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Overall Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-4">
              <div className="relative">
                <PieChart width={160} height={90}>
                  <Pie
                    data={[{ value: overallScore }, { value: 100 - overallScore }]}
                    cx={80} cy={80} startAngle={180} endAngle={0}
                    innerRadius={55} outerRadius={75} paddingAngle={0} dataKey="value"
                  >
                    <Cell fill="hsl(var(--brand))" />
                    <Cell fill="hsl(var(--bg-muted))" />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                  <span className="text-3xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{overallScore}%</span>
                </div>
              </div>
              <span className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                Based on {FRAMEWORKS.length} frameworks
              </span>
              <div className="mt-3 flex gap-2">
                {(() => {
                  const b = complianceBadge(overallScore);
                  return (
                    <Badge style={{ background: b.bg, color: b.text, border: `1px solid ${b.border}`, borderRadius: 0 }}>
                      {b.label}
                    </Badge>
                  );
                })()}
              </div>
              <div className="mt-4 w-full space-y-1">
                <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                  <span>Controls implemented</span>
                  <span style={{ color: 'hsl(var(--text-1))' }}>{implementedControls}/{totalControls}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                  <span>Coverage</span>
                  <span style={{ color: '#10b981' }}>{controlCoverage}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Trend */}
        <Card className="col-span-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Compliance Score Trend (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={SCORE_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis
                  domain={[60, 100]}
                  tick={{ fill: ct.axis, fontSize: 11 }}
                  label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
                />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                  formatter={(v: number) => [v + '%', 'Overall Score']} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--brand))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--brand))' }} name="Score" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Framework Table + Gaps by Framework */}
      <div className="grid grid-cols-2 gap-4">
        {/* Framework Compliance Table */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Framework Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['Framework', 'Score', 'Controls', 'Status', 'Next Audit'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FRAMEWORKS.map(f => {
                  const b = complianceBadge(f.complianceScore);
                  return (
                    <tr key={f.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                      <td className="p-3">
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{f.category}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1" style={{ background: 'hsl(var(--bg-muted))', height: 6 }}>
                            <div style={{ width: f.complianceScore + '%', background: f.complianceScore >= 85 ? '#10b981' : f.complianceScore >= 65 ? '#f97316' : '#ef4444', height: '100%' }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{f.complianceScore}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                        {f.controlsImplemented}/{f.controlsTotal}
                      </td>
                      <td className="p-3">
                        <Badge style={{ background: b.bg, color: b.text, border: `1px solid ${b.border}`, borderRadius: 0, fontSize: 10 }}>
                          {b.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                        {formatDate(f.nextAudit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Gaps by Framework */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Gaps by Framework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gapsByFramework} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis type="number" tick={{ fontSize: 11, fill: ct.axis }}
                  label={{ value: 'Gap Count', position: 'insideBottom', offset: -2, style: { fill: ct.axis, fontSize: 11 } }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10, fill: ct.axis }} />
                <Tooltip
                  contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                  formatter={(v: number, _: string, p: any) => [v + ' gaps', p.payload.fullName]}
                />
                <Bar dataKey="gaps" name="Gaps" fill="#f97316" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
