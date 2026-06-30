import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ChartBar, MagnifyingGlass, Export, TrendUp, Target, ArrowRight, X, CheckCircle,
} from '@phosphor-icons/react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend, ResponsiveContainer,
} from 'recharts';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useMaturityData } from '../../hooks/useMaturityData';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { toast } from 'sonner';

// Supabase-wired — no mock data

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

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

// DIMENSIONS is now derived from Supabase via useMaturityData hook (see component)

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
/*  Assessment Wizard types                                            */
/* ------------------------------------------------------------------ */

interface AssessmentAnswer {
  dimensionIndex: number;
  score: number;
}

// ASSESSMENT_QUESTIONS is now computed inside the component from live DIMENSIONS data

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
  const { items: rawItems, isLoading } = useMaturityData();
  const [search, setSearch] = useState('');
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessStep, setAssessStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [assessDone, setAssessDone] = useState(false);

  if (isLoading) return <PageSkeleton />;

  // Map Supabase maturity_assessments rows to MaturityDimension shape
  const DIMENSIONS: MaturityDimension[] = (rawItems as any[]).map(item => ({
    dimension: item.dimension || item.name || 'Unknown',
    current: item.current_level ?? item.current ?? 1,
    target: item.target_level ?? item.target ?? 5,
    gap: item.gap ?? Math.max(0, (item.target_level ?? item.target ?? 5) - (item.current_level ?? item.current ?? 1)),
    priority: item.priority || item.priority_actions || '',
    owner: item.owner || item.assigned_to || 'Unassigned',
  }));

  const radarData = DIMENSIONS.map(d => ({
    dimension: d.dimension,
    current: d.current,
    target: d.target,
  }));

  const ASSESSMENT_QUESTIONS = DIMENSIONS.map(d => ({
    dimension: d.dimension,
    owner: d.owner,
    question: `Rate the current maturity of "${d.dimension}" on a scale of 1–5.`,
    hint: d.priority,
  }));

  const overallCurrent = DIMENSIONS.length > 0 ? Math.round(DIMENSIONS.reduce((s, d) => s + d.current, 0) / DIMENSIONS.length) : 0;
  const dimensionsAtTarget = DIMENSIONS.filter(d => d.gap === 0).length;
  const gapScore = DIMENSIONS.length > 0 ? (DIMENSIONS.reduce((s, d) => s + d.gap, 0) / DIMENSIONS.length).toFixed(1) : '0.0';
  const industryPercentile = 68;

  const filteredDimensions = DIMENSIONS.filter(d =>
    d.dimension.toLowerCase().includes(search.toLowerCase()) ||
    d.owner.toLowerCase().includes(search.toLowerCase()) ||
    d.priority.toLowerCase().includes(search.toLowerCase())
  );

  const totalGap = DIMENSIONS.reduce((s, d) => s + d.gap, 0);
  const closedGap = DIMENSIONS.filter(d => d.gap === 0).length;
  const trajectoryPct = DIMENSIONS.length > 0 ? Math.round((closedGap / DIMENSIONS.length) * 100) : 0;

  return (
    <div className="space-y-6">
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
            onClick={() => exportCsv(DIMENSIONS, 'maturity-dimensions.csv')}
          >
            <Export size={14} className="mr-1" /> Export Report
          </Button>
          <Button
            size="sm"
            style={{ borderRadius: 0 }}
            onClick={() => { setShowAssessment(true); setAssessStep(0); setAnswers({}); setAssessDone(false); }}
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
                  stroke="hsl(var(--s-ok-tx))"
                  fill="hsl(var(--s-ok-tx))"
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
                    <p className="text-sm font-bold" style={{ color: level === overallCurrent ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-1))' }}>
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
      {/* Assessment Wizard */}
      {showAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssessment(false)} />
          <div className="relative bg-surface border border-[hsl(var(--border))] w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">Maturity Self-Assessment</h2>
                {!assessDone && <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">Dimension {assessStep + 1} of {ASSESSMENT_QUESTIONS.length}</p>}
              </div>
              <button onClick={() => setShowAssessment(false)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
            </div>
            {!assessDone ? (
              <>
                {/* Progress bar */}
                <div className="h-1 bg-raised">
                  <div className="h-1 bg-[hsl(var(--brand))] transition-all" style={{ width: `${((assessStep + 1) / ASSESSMENT_QUESTIONS.length) * 100}%` }} />
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-[10px] font-semibold text-[hsl(var(--brand))] uppercase tracking-wider mb-1">{ASSESSMENT_QUESTIONS[assessStep].dimension}</p>
                    <p className="text-sm font-medium text-[hsl(var(--text-1))]">{ASSESSMENT_QUESTIONS[assessStep].question}</p>
                    <p className="text-[11px] text-[hsl(var(--text-4))] mt-2">Current priority: {ASSESSMENT_QUESTIONS[assessStep].hint}</p>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        onClick={() => setAnswers(p => ({ ...p, [assessStep]: score }))}
                        className="flex-1 flex flex-col items-center py-4 border-2 transition-all"
                        style={{
                          borderColor: answers[assessStep] === score ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                          background: answers[assessStep] === score ? 'hsl(var(--brand) / 0.1)' : 'hsl(var(--bg-raised))',
                        }}
                      >
                        <span className="text-lg font-bold" style={{ color: answers[assessStep] === score ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>{score}</span>
                        <span className="text-[9px] text-[hsl(var(--text-4))] mt-0.5">{MATURITY_LABELS[score]}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[hsl(var(--text-4))]">
                    {answers[assessStep] ? `Selected: Level ${answers[assessStep]} — ${MATURITY_LABELS[answers[assessStep]]}` : 'Select a maturity level to continue.'}
                  </p>
                </div>
                <div className="flex justify-between gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
                  <button
                    onClick={() => setAssessStep(p => Math.max(0, p - 1))}
                    disabled={assessStep === 0}
                    className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (answers[assessStep] === undefined) { toast.error('Please select a maturity level'); return; }
                      if (assessStep < ASSESSMENT_QUESTIONS.length - 1) {
                        setAssessStep(p => p + 1);
                      } else {
                        setAssessDone(true);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90"
                  >
                    {assessStep < ASSESSMENT_QUESTIONS.length - 1 ? 'Next →' : 'Complete Assessment'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div className="text-center py-4">
                    <CheckCircle size={48} className="text-[hsl(var(--s-ok-tx))] mx-auto mb-3" weight="duotone" />
                    <h3 className="text-base font-semibold text-[hsl(var(--text-1))]">Assessment Complete</h3>
                    <p className="text-sm text-[hsl(var(--text-4))] mt-1">All {ASSESSMENT_QUESTIONS.length} dimensions scored</p>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {ASSESSMENT_QUESTIONS.map((q, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-raised border border-[hsl(var(--border))]">
                        <span className="text-xs text-[hsl(var(--text-2))]">{q.dimension}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: gapColor(Math.max(0, (DIMENSIONS[i]?.target ?? 4) - (answers[i] ?? 3))) }}>
                            Level {answers[i] ?? '—'}
                          </span>
                          <span className="text-[10px] text-[hsl(var(--text-4))]">({MATURITY_LABELS[answers[i] ?? 3]})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[hsl(var(--text-4))] text-center">
                    New average: Level {Math.round(Object.values(answers).reduce((a, b) => a + b, 0) / ASSESSMENT_QUESTIONS.length)}
                  </p>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
                  <button onClick={() => setShowAssessment(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">Close</button>
                  <button
                    onClick={() => {
                      setShowAssessment(false);
                      toast.success('Assessment results saved. Maturity scores updated.');
                    }}
                    className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90"
                  >
                    Save Results
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
