import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ChartBar, MagnifyingGlass, Export, TrendUp, Target, ArrowRight,
} from '@phosphor-icons/react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend, ResponsiveContainer,
} from 'recharts';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface MaturityDimension {
  dimension: string;
  current: number;
  target: number;
  gap: number;
  priority: string;
  owner: string;
}

const MATURITY_LABELS: Record<number, string> = {
  1: 'Initial',
  2: 'Developing',
  3: 'Defined',
  4: 'Managed',
  5: 'Optimized',
};

const DIMENSIONS: MaturityDimension[] = [
  { dimension: 'Strategy & Vision', current: 3, target: 4, gap: 1, priority: 'Formalize AI governance roadmap', owner: 'Sarah Chen' },
  { dimension: 'Risk Management', current: 4, target: 4, gap: 0, priority: 'Maintain risk framework', owner: 'Michael Torres' },
  { dimension: 'Data Governance', current: 3, target: 5, gap: 2, priority: 'Implement data lineage tracking', owner: 'David Kim' },
  { dimension: 'Model Lifecycle', current: 3, target: 4, gap: 1, priority: 'Automate model monitoring', owner: 'Priya Sharma' },
  { dimension: 'Ethics & Fairness', current: 2, target: 4, gap: 2, priority: 'Expand bias testing coverage', owner: 'Emily Rodriguez' },
  { dimension: 'Security', current: 4, target: 4, gap: 0, priority: 'Maintain adversarial testing', owner: 'James Wilson' },
  { dimension: 'Compliance', current: 3, target: 5, gap: 2, priority: 'Complete EU AI Act conformity', owner: 'Legal Team' },
  { dimension: 'Monitoring & Ops', current: 3, target: 4, gap: 1, priority: 'Deploy real-time drift detection', owner: 'Ops Team' },
];

const radarData = DIMENSIONS.map(d => ({
  dimension: d.dimension,
  current: d.current,
  target: d.target,
}));

/* ------------------------------------------------------------------ */
/*  Inline MetricTile                                                  */
/* ------------------------------------------------------------------ */

function MetricTile({ label, value, sub, icon: Icon, color }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{value}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>}
        </div>
        <Icon size={28} style={{ color }} />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline toast                                                       */
/* ------------------------------------------------------------------ */

function showToast(message: string) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: 'hsl(var(--bg-surface))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--text-1))',
    padding: '12px 20px',
    fontSize: '13px',
    fontFamily: 'Outfit, sans-serif',
    zIndex: '9999',
    borderRadius: '0',
    boxShadow: '0 4px 12px rgba(0,0,0,.25)',
  });
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

function gapColor(gap: number): string {
  if (gap === 0) return 'hsl(var(--s-ok-tx))';
  if (gap === 1) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--destructive))';
}

function gapLabel(gap: number): string {
  if (gap === 0) return 'On Target';
  if (gap === 1) return 'Minor Gap';
  return 'Critical Gap';
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function BenchmarkingMaturity() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [search, setSearch] = useState('');

  const overallCurrent = Math.round(DIMENSIONS.reduce((s, d) => s + d.current, 0) / DIMENSIONS.length);
  const dimensionsAtTarget = DIMENSIONS.filter(d => d.gap === 0).length;
  const gapScore = (DIMENSIONS.reduce((s, d) => s + d.gap, 0) / DIMENSIONS.length).toFixed(1);
  const industryPercentile = 68;

  const filteredDimensions = DIMENSIONS.filter(d =>
    d.dimension.toLowerCase().includes(search.toLowerCase()) ||
    d.owner.toLowerCase().includes(search.toLowerCase()) ||
    d.priority.toLowerCase().includes(search.toLowerCase())
  );

  const totalGap = DIMENSIONS.reduce((s, d) => s + d.gap, 0);
  const closedGap = DIMENSIONS.filter(d => d.gap === 0).length;
  const trajectoryPct = Math.round((closedGap / DIMENSIONS.length) * 100);

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            Benchmarking & Maturity
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            Acme Financial Corp · AI governance maturity assessment across 8 dimensions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            style={{ borderRadius: 0 }}
            onClick={() => showToast('Maturity report exported')}
          >
            <Export size={14} className="mr-1" /> Export Report
          </Button>
          <Button
            size="sm"
            style={{ borderRadius: 0 }}
            onClick={() => showToast('Re-assessment initiated')}
          >
            <ChartBar size={14} className="mr-1" /> Run Assessment
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile
          label="Overall Maturity Level"
          value={`Level ${overallCurrent}`}
          sub={MATURITY_LABELS[overallCurrent]}
          icon={ChartBar}
          color="hsl(var(--brand))"
        />
        <MetricTile
          label="Dimensions at Target"
          value={`${dimensionsAtTarget}/${DIMENSIONS.length}`}
          sub={dimensionsAtTarget === DIMENSIONS.length ? 'All targets met' : `${DIMENSIONS.length - dimensionsAtTarget} dimensions need improvement`}
          icon={Target}
          color="hsl(var(--s-ok-tx))"
        />
        <MetricTile
          label="Gap Score"
          value={gapScore}
          sub="Average gap across dimensions"
          icon={TrendUp}
          color="hsl(var(--s-wn-tx))"
        />
        <MetricTile
          label="Industry Percentile"
          value={`${industryPercentile}th`}
          sub="Financial Services sector"
          icon={ArrowRight}
          color="hsl(var(--s-in-tx))"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Radar / Spider Chart */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Maturity Radar — Current vs Target
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={340}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke={ct.grid} />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 11, fill: ct.axis }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tickCount={6}
                  tick={{ fontSize: 9, fill: ct.axis }}
                />
                <Radar
                  name="Current Level"
                  dataKey="current"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Radar
                  name="Target Level"
                  dataKey="target"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: ct.axis }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Progress Summary / Trajectory */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Progress Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trajectory bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Overall Trajectory</span>
                <span className="text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{trajectoryPct}% on target</span>
              </div>
              <div style={{ height: 8, background: 'hsl(var(--bg-muted))', borderRadius: 0, width: '100%' }}>
                <div style={{ height: '100%', width: `${trajectoryPct}%`, background: 'hsl(var(--brand))', borderRadius: 0, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Maturity scale */}
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: 'hsl(var(--text-3))' }}>Maturity Scale</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <div
                    key={level}
                    className="flex-1 text-center p-2"
                    style={{
                      background: level === overallCurrent ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 0,
                    }}
                  >
                    <p className="text-sm font-bold" style={{ color: level === overallCurrent ? '#fff' : 'hsl(var(--text-1))' }}>
                      {level}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: level === overallCurrent ? 'rgba(255,255,255,0.8)' : 'hsl(var(--text-4))' }}>
                      {MATURITY_LABELS[level]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dimension breakdown bars */}
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: 'hsl(var(--text-3))' }}>Dimension Breakdown</p>
              <div className="space-y-2">
                {DIMENSIONS.map(d => (
                  <div key={d.dimension}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{d.dimension}</span>
                      <span className="text-xs font-mono" style={{ color: gapColor(d.gap) }}>
                        {d.current}/{d.target}
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'hsl(var(--bg-muted))', borderRadius: 0, position: 'relative' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(d.current / 5) * 100}%`,
                          background: gapColor(d.gap),
                          borderRadius: 0,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: -2,
                          left: `${(d.target / 5) * 100}%`,
                          width: 2,
                          height: 10,
                          background: '#3b82f6',
                        }}
                        title={`Target: ${d.target}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 pt-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>{closedGap}</p>
                <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>On Target</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                  {DIMENSIONS.filter(d => d.gap === 1).length}
                </p>
                <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Minor Gaps</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'hsl(var(--destructive))' }}>
                  {DIMENSIONS.filter(d => d.gap >= 2).length}
                </p>
                <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Critical Gaps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dimension Detail Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Maturity Dimensions — Detail
            </CardTitle>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 px-2"
                style={{
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--bg-muted))',
                  borderRadius: 0,
                  height: 32,
                }}
              >
                <MagnifyingGlass size={14} style={{ color: 'hsl(var(--text-4))' }} />
                <input
                  type="text"
                  placeholder="Search dimensions..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    color: 'hsl(var(--text-1))',
                    width: 160,
                    fontFamily: 'Outfit, sans-serif',
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['Dimension', 'Current Level', 'Target Level', 'Gap', 'Priority Actions', 'Owner'].map(h => (
                  <th
                    key={h}
                    className="text-left p-3 text-xs font-semibold"
                    style={{ color: 'hsl(var(--text-3))', borderRadius: 0 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDimensions.map((d, idx) => (
                <tr
                  key={d.dimension}
                  style={{ borderTop: '1px solid hsl(var(--border))' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td className="p-3">
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                      {d.dimension}
                    </p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        style={{
                          background: 'hsl(var(--bg-muted))',
                          color: 'hsl(var(--text-1))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 0,
                          fontWeight: 700,
                          fontSize: 12,
                          minWidth: 28,
                          justifyContent: 'center',
                        }}
                      >
                        {d.current}
                      </Badge>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        {MATURITY_LABELS[d.current]}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        style={{
                          background: 'rgba(59,130,246,0.1)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.3)',
                          borderRadius: 0,
                          fontWeight: 700,
                          fontSize: 12,
                          minWidth: 28,
                          justifyContent: 'center',
                        }}
                      >
                        {d.target}
                      </Badge>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        {MATURITY_LABELS[d.target]}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      style={{
                        background: d.gap === 0 ? 'rgba(16,185,129,0.1)' : d.gap === 1 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: gapColor(d.gap),
                        border: `1px solid ${gapColor(d.gap)}`,
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {d.gap === 0 ? 'No Gap' : `-${d.gap}`} · {gapLabel(d.gap)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>
                      {d.priority}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-3))' }}>
                      {d.owner}
                    </p>
                  </td>
                </tr>
              ))}
              {filteredDimensions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      No dimensions match your search.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
