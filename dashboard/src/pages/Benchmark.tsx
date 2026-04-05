import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  ChartBar, Plus, Trophy, ArrowsDownUp, Lightning, Download,
  Star, TrendUp,
} from '@phosphor-icons/react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { MODELS } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

interface BenchmarkDimension {
  name: string;
  key: keyof BenchmarkEntry['scores'];
}

interface BenchmarkEntry {
  id: string;
  name: string;
  scores: {
    accuracy: number;
    speed: number;
    fairness: number;
    robustness: number;
    cost: number;
  };
  overall: number;
  rank: number;
}

const DIMENSIONS: BenchmarkDimension[] = [
  { name: 'Accuracy', key: 'accuracy' },
  { name: 'Speed', key: 'speed' },
  { name: 'Fairness', key: 'fairness' },
  { name: 'Robustness', key: 'robustness' },
  { name: 'Cost', key: 'cost' },
];

// Speed score = inverted latency (lower ms = higher score)
const BENCHMARKS: BenchmarkEntry[] = MODELS.map((m, i) => {
  const speedScore = Math.round(Math.max(10, 100 - (m.latencyMs / 4)));
  const fairness = m.fairnessScore;
  const accuracy = Math.round(m.accuracy);
  const robustness = Math.round(70 + (m.fairnessScore - 60) * 0.5 + (m.accuracy - 80) * 0.3);
  const cost = Math.round(95 - (m.latencyMs / 10) - (i * 3));
  const overall = Math.round((accuracy + speedScore + fairness + robustness + Math.max(0, cost)) / 5);
  return {
    id: m.id,
    name: m.name,
    scores: { accuracy, speed: speedScore, fairness, robustness, cost: Math.max(20, cost) },
    overall,
    rank: 0,
  };
}).sort((a, b) => b.overall - a.overall).map((b, i) => ({ ...b, rank: i + 1 }));

const ACCENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

export default function Benchmark() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [sortBy, setSortBy] = useState<keyof BenchmarkEntry['scores']>('accuracy');
  const [benchmarks, setBenchmarks] = useState<BenchmarkEntry[]>(BENCHMARKS);
  const [createOpen, setCreateOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>(['MDL-002', 'MDL-001', 'MDL-006']);

  const sorted = [...benchmarks].sort((a, b) => b.scores[sortBy] - a.scores[sortBy]);
  const topPerformer = benchmarks[0];
  const avgScore = Math.round(benchmarks.reduce((s, b) => s + b.overall, 0) / benchmarks.length);

  const compareModels = benchmarks.filter(b => compareIds.includes(b.id)).slice(0, 3);

  const radarData = DIMENSIONS.map(d => {
    const entry: Record<string, number | string> = { dimension: d.name };
    compareModels.forEach(m => {
      entry[m.id] = m.scores[d.key];
    });
    return entry;
  });

  const barData = sorted.map(b => ({
    name: b.id.replace('MDL-', 'M-'),
    fullName: b.name,
    accuracy: b.scores.accuracy,
    speed: b.scores.speed,
    fairness: b.scores.fairness,
    robustness: b.scores.robustness,
    cost: b.scores.cost,
  }));

  function scoreColor(score: number) {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f97316';
    return '#ef4444';
  }

  const stats = [
    { label: 'Benchmarks Run', value: 12, icon: ChartBar },
    { label: 'Models Compared', value: MODELS.length, icon: ArrowsDownUp },
    { label: 'Top Performer', value: topPerformer?.id || 'MDL-002', icon: Trophy },
    { label: 'Avg Score', value: `${avgScore}%`, icon: Star },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Model Benchmarking</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Compare model performance across standardized dimensions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1" /> Run Benchmark
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: 'hsl(var(--brand))' }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Radar Chart */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                Top 3 Models — Radar Comparison
              </CardTitle>
              <div className="flex gap-2">
                {compareModels.map((m, i) => (
                  <span key={m.id} className="text-xs flex items-center gap-1">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT_COLORS[i], display: 'inline-block' }} />
                    <span style={{ color: 'hsl(var(--text-3))' }}>{m.id}</span>
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center">
            <RadarChart cx={170} cy={120} outerRadius={90} width={340} height={240} data={radarData}>
              <PolarGrid stroke={ct.grid} />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: ct.axis }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: ct.axis }} />
              {compareModels.map((m, i) => (
                <Radar
                  key={m.id}
                  name={m.name}
                  dataKey={m.id}
                  stroke={ACCENT_COLORS[i]}
                  fill={ACCENT_COLORS[i]}
                  fillOpacity={0.15}
                />
              ))}
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
            </RadarChart>
          </CardContent>
        </Card>

        {/* Bar Chart by Dimension */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                Scores by Dimension
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Sort by</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '4px 8px', fontSize: 12, borderRadius: 0 }}
                >
                  {DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: ct.axis }}
                  label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
                />
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
                <Bar dataKey={sortBy} name={sortBy} radius={0}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={scoreColor((entry as any)[sortBy])} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Benchmark Comparison Table</CardTitle>
            <div className="flex items-center gap-2">
              <ArrowsDownUp size={14} style={{ color: 'hsl(var(--text-3))' }} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '4px 8px', fontSize: 12, borderRadius: 0 }}
              >
                {DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['Rank', 'Model', 'Accuracy', 'Speed', 'Fairness', 'Robustness', 'Cost', 'Overall'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((b, idx) => (
                <tr
                  key={b.id}
                  style={{ borderTop: '1px solid hsl(var(--border))' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {idx === 0 && <Trophy size={14} style={{ color: '#f59e0b' }} />}
                      <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>#{b.rank}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{b.name}</p>
                      <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{b.id}</p>
                    </div>
                  </td>
                  {(['accuracy', 'speed', 'fairness', 'robustness', 'cost'] as const).map(dim => (
                    <td key={dim} className="p-3">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 40, height: 4, background: 'hsl(var(--bg-muted))' }}>
                          <div style={{ width: `${b.scores[dim]}%`, height: '100%', background: scoreColor(b.scores[dim]) }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: scoreColor(b.scores[dim]) }}>{b.scores[dim]}</span>
                      </div>
                    </td>
                  ))}
                  <td className="p-3">
                    <Badge style={{
                      background: `${scoreColor(b.overall)}20`,
                      color: scoreColor(b.overall),
                      border: `1px solid ${scoreColor(b.overall)}`,
                      borderRadius: 0,
                      fontWeight: 700,
                      fontSize: 12,
                    }}>
                      {b.overall}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Run Benchmark Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Run New Benchmark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>
              Select models and dimensions to include in the benchmark run. The system will evaluate all selected models against the configured test suites.
            </p>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'hsl(var(--text-2))' }}>Models to Benchmark</label>
              <div className="space-y-2">
                {MODELS.map(m => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      style={{ accentColor: 'hsl(var(--brand))' }}
                    />
                    <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</span>
                    <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{m.id}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'hsl(var(--text-2))' }}>Dimensions</label>
              <div className="flex flex-wrap gap-2">
                {DIMENSIONS.map(d => (
                  <Badge key={d.key} variant="outline" style={{ borderRadius: 0, cursor: 'pointer' }}>{d.name}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>
              <Lightning size={14} className="mr-1" /> Start Benchmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
