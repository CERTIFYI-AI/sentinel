import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartBar, Brain, Lightning, Warning, CheckCircle, ArrowRight,
  ArrowUp, ArrowDown, Minus, Eye, MagnifyingGlass, ChartLine,
  Shield, Clock, Siren, Star, TrendUp,
} from '@phosphor-icons/react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { useChartTheme } from '../hooks/useChartTheme';
import { useSettingsStore } from '../stores/settingsStore';
import { toast } from 'sonner';

// ── Static intelligence data ─────────────────────────────────────────────────

const BENCHMARK_DATA = [
  { axis: 'Compliance', org: 85, median: 71, top: 91 },
  { axis: 'Risk Mgmt', org: 82, median: 68, top: 88 },
  { axis: 'Model Gov.', org: 79, median: 63, top: 87 },
  { axis: 'Data Quality', org: 88, median: 74, top: 93 },
  { axis: 'Transparency', org: 76, median: 60, top: 84 },
  { axis: 'Security', org: 91, median: 78, top: 95 },
];

const CONTROL_FAILURES = [
  { control: 'Bias Monitoring', correlation: 67, count: 214, color: '#ef4444' },
  { control: 'Training Data Quality', correlation: 54, count: 178, color: '#f97316' },
  { control: 'Human Oversight Docs', correlation: 48, count: 156, color: '#f97316' },
  { control: 'Post-Market Surveillance', correlation: 42, count: 134, color: '#eab308' },
  { control: 'Explainability Records', correlation: 39, count: 127, color: '#eab308' },
  { control: 'Incident Response Plan', correlation: 31, count: 98, color: '#84cc16' },
];

const BENCHMARK_TABLE = [
  { framework: 'EU AI Act', your: 85, median: 71, top: 91, rank: 'Top 18%', trend: 'up' as const },
  { framework: 'ISO 42001', your: 88, median: 74, top: 93, rank: 'Top 22%', trend: 'up' as const },
  { framework: 'NIST AI RMF', your: 90, median: 78, top: 95, rank: 'Top 15%', trend: 'stable' as const },
  { framework: 'GDPR', your: 83, median: 70, top: 90, rank: 'Top 20%', trend: 'up' as const },
  { framework: 'SOC 2 Type II', your: 92, median: 80, top: 96, rank: 'Top 12%', trend: 'up' as const },
];

const PREDICTIONS = [
  {
    id: 1, probability: 78, title: 'EU AI Act Article 10 — Data Quality Gap',
    basis: 'Models with fairness score <80% and no DPIA completed have 78% chance of Art.10 gap in next audit cycle',
    actions: [{ label: 'Run Data Quality Assessment', to: '/data-governance' }, { label: 'Complete DPIA', to: '/aiia' }],
    evidence: '47 similar organizations',
    severity: 'high' as const, category: 'EU AI Act',
  },
  {
    id: 2, probability: 65, title: 'ISO 42001 Clause 9.1 — Post-Market Non-Conformity',
    basis: 'Post-market surveillance not configured for 3 of 6 production models. ISO 42001 requires documented surveillance plans.',
    actions: [{ label: 'Set Up Surveillance Plans', to: '/models/lifecycle' }],
    evidence: '31 audited organizations',
    severity: 'medium' as const, category: 'ISO 42001',
  },
  {
    id: 3, probability: 91, title: 'HITL SLA Breach — Queue Growth Rate',
    basis: 'Current HITL queue growing at 4.2 items/day with 2 active reviewers. At this rate SLA will breach in 8 days.',
    actions: [{ label: 'Add Reviewer', to: '/hitl' }, { label: 'Delegate to Raj Gupta', to: '/access-control/users' }],
    evidence: 'Queue analytics',
    severity: 'critical' as const, category: 'Operations',
  },
];

const INCIDENT_PREDICTOR = {
  model: 'Credit Risk Scorer (MDL-001)',
  pattern: 'Drift patterns match the 3 months before a Bias/Fairness Incident in 83% of similar organizations',
  action: 'Schedule bias audit within 14 days',
  confidence: 83,
  daysToRisk: 14,
};

function ProbabilityBadge({ p }: { p: number }) {
  const color = p >= 80 ? '#ef4444' : p >= 60 ? '#f97316' : '#eab308';
  return (
    <div className="text-center px-3 py-2 flex-shrink-0" style={{ background: `${color}15`, border: `2px solid ${color}40`, minWidth: 72 }}>
      <p className="text-2xl font-black" style={{ color }}>{p}%</p>
      <p className="text-xs" style={{ color }}>prob.</p>
    </div>
  );
}

function TrendIcon({ t }: { t: 'up' | 'down' | 'stable' }) {
  if (t === 'up') return <ArrowUp size={14} style={{ color: '#10b981' }} />;
  if (t === 'down') return <ArrowDown size={14} style={{ color: '#ef4444' }} />;
  return <Minus size={14} style={{ color: '#6b7280' }} />;
}

function severityStyle(s: string) {
  if (s === 'critical') return { bg: '#ef444415', color: '#ef4444', border: '#ef444430' };
  if (s === 'high') return { bg: '#f9731615', color: '#f97316', border: '#f9731630' };
  if (s === 'medium') return { bg: '#eab30815', color: '#eab308', border: '#eab30830' };
  return { bg: '#10b98115', color: '#10b981', border: '#10b98130' };
}

const CustomRadarDot = () => null;

export default function RiskIntelligence() {
  const { orgName } = useSettingsStore();
  const navigate = useNavigate();
  const ct = useChartTheme();
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  const radarData = BENCHMARK_DATA.map(d => ({
    subject: d.axis,
    'Your Score': d.org,
    'Industry Median': d.median,
    'Top Quartile': d.top,
  }));

  const overallScore = Math.round(BENCHMARK_DATA.reduce((s, d) => s + d.org, 0) / BENCHMARK_DATA.length);

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ChartLine size={22} style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Sentinel Risk Intelligence</h1>
            <span className="px-2 py-0.5 text-xs font-bold" style={{ background: '#6366f120', color: '#6366f1', border: '1px solid #6366f130' }}>ENTERPRISE</span>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Anonymized signals from across the AI governance ecosystem — your data is never shared
          </p>
        </div>
        <button onClick={() => toast.info('Custom benchmark request submitted — you will be contacted within 2 business days')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border"
          style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', background: 'hsl(var(--bg-surface))' }}>
          <Star size={14} /> Request Custom Benchmark
        </button>
      </div>

      {/* ── Top stats ── */}
      {[
        { label: 'Overall Governance Score', value: `${overallScore}%`, sub: 'Top 18% of Financial Services', color: '#10b981', icon: Shield },
        { label: 'Predictive Gaps Detected', value: '3', sub: 'Require attention in next 30 days', color: '#f97316', icon: Warning },
        { label: 'Incident Prediction', value: '83%', sub: 'Bias incident probability — MDL-001', color: '#ef4444', icon: Siren },
        { label: 'Benchmark Sample', value: '47', sub: 'similar organizations analyzed', color: '#3b82f6', icon: Brain },
      ].reduce<JSX.Element[]>((acc, s, i, arr) => {
        if (i % 4 === 0) {
          acc.push(
            <div key={i} className="grid grid-cols-4 gap-4">
              {arr.slice(i, i + 4).map(s2 => (
                <div key={s2.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '16px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s2.label}</p>
                    <s2.icon size={16} style={{ color: s2.color }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: s2.color }}>{s2.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{s2.sub}</p>
                </div>
              ))}
            </div>
          );
        }
        return acc;
      }, [])}

      {/* ── Benchmark Radar + Score ── */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '20px' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                AI Governance Score vs Financial Services Industry
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                You are in the <strong style={{ color: '#10b981' }}>top 18%</strong> of financial services AI governance
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={ct.grid} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: ct.text, fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: ct.text, fontSize: 9 }} />
              <Radar name="Top Quartile" dataKey="Top Quartile" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeDasharray="4 2" dot={false} />
              <Radar name="Industry Median" dataKey="Industry Median" stroke="#6b7280" fill="#6b7280" fillOpacity={0.08} strokeDasharray="3 3" dot={false} />
              <Radar name="Your Score" dataKey="Your Score" stroke="hsl(var(--brand))" fill="hsl(var(--brand))" fillOpacity={0.2} dot={false} />
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {BENCHMARK_DATA.map(d => (
            <div key={d.axis} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '12px' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{d.axis}</span>
                <span className="text-sm font-bold" style={{ color: d.org >= 85 ? '#10b981' : d.org >= 70 ? '#f97316' : '#ef4444' }}>{d.org}%</span>
              </div>
              <div className="h-1.5 relative" style={{ background: 'hsl(var(--bg-muted))' }}>
                <div className="absolute h-full" style={{ width: `${d.top}%`, background: '#10b98120' }} />
                <div className="absolute h-full" style={{ width: `${d.org}%`, background: 'hsl(var(--brand))' }} />
                <div className="absolute top-0 h-full w-0.5" style={{ left: `${d.median}%`, background: '#6b7280' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Median: {d.median}%</span>
                <span className="text-xs" style={{ color: '#10b981' }}>Top: {d.top}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Predictive Gap Detection ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Brain size={18} style={{ color: 'hsl(var(--brand))' }} />
          <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Predictive Gap Detection</h2>
          <span className="text-xs px-2 py-0.5" style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444430' }}>
            3 gaps identified
          </span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'hsl(var(--text-3))' }}>
          Sentinel has identified 3 likely gaps in your next compliance review — based on patterns from {PREDICTIONS[0].evidence}
        </p>
        <div className="space-y-3">
          {PREDICTIONS.map(p => {
            const sev = severityStyle(p.severity);
            return (
              <div key={p.id} className="flex gap-4 p-4" style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${sev.border}` }}>
                <ProbabilityBadge p={p.probability} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{p.title}</p>
                    <span className="text-xs px-1.5 py-0.5" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>{p.category}</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>{p.basis}</p>
                  <p className="text-xs mb-3 italic" style={{ color: 'hsl(var(--text-4))' }}>Based on patterns from {p.evidence}</p>
                  <div className="flex gap-2">
                    {p.actions.map(a => (
                      <button key={a.label} onClick={() => navigate(a.to)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs hover:opacity-80"
                        style={{ background: 'hsl(var(--brand))', color: 'white' }}>
                        {a.label} <ArrowRight size={10} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Control Failure Correlation ── */}
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '20px' }}>
        <div className="flex items-center gap-2 mb-1">
          <ChartBar size={18} style={{ color: 'hsl(var(--brand))' }} />
          <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Control Failure Correlation with Regulatory Findings</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: 'hsl(var(--text-3))' }}>
          Most common control failures that precede regulatory findings — click any bar for remediation steps
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CONTROL_FAILURES} layout="vertical" margin={{ left: 140 }}>
            <CartesianGrid horizontal={false} stroke={ct.grid} strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: ct.text, fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="control" tick={{ fill: ct.text, fontSize: 11 }} width={140} />
            <Tooltip
              contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, fontSize: 12 }}
              formatter={(v: number, name: string) => [`${v}% correlation`, name]}
            />
            <Bar dataKey="correlation" name="Correlation with Findings" radius={0} cursor="pointer"
              onClick={(d) => { setSelectedBar(d.control); toast.info(`Viewing remediation for: ${d.control}`); }}>
              {CONTROL_FAILURES.map((entry) => (
                <Cell key={entry.control} fill={selectedBar === entry.control ? '#6366f1' : entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {selectedBar && (
          <div className="mt-3 p-3 flex items-center justify-between" style={{ background: '#6366f110', border: '1px solid #6366f130' }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: '#a5b4fc' }}>{selectedBar}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>View controls and remediation steps for this failure pattern</p>
            </div>
            <button onClick={() => navigate('/compliance/controls')} className="flex items-center gap-1 px-3 py-1.5 text-xs" style={{ background: '#6366f1', color: 'white' }}>
              View Controls <ArrowRight size={10} />
            </button>
          </div>
        )}
      </div>

      {/* ── Incident Predictor ── */}
      <div style={{ background: '#ef444408', border: '1px solid #ef444425', padding: '20px' }}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-center px-4 py-3" style={{ background: '#ef444415', border: '1px solid #ef444430' }}>
            <p className="text-3xl font-black" style={{ color: '#ef4444' }}>{INCIDENT_PREDICTOR.confidence}%</p>
            <p className="text-xs" style={{ color: '#ef4444' }}>confidence</p>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Siren size={16} style={{ color: '#ef4444' }} />
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Incident Predictor — {INCIDENT_PREDICTOR.model}</p>
            </div>
            <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-2))' }}>{INCIDENT_PREDICTOR.pattern}</p>
            <p className="text-xs mb-3" style={{ color: '#ef4444' }}>⚠ Action required within {INCIDENT_PREDICTOR.daysToRisk} days: {INCIDENT_PREDICTOR.action}</p>
            <button onClick={() => navigate('/bias-audits')} className="flex items-center gap-1.5 px-3 py-2 text-xs" style={{ background: '#ef4444', color: 'white' }}>
              Schedule Bias Audit <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Benchmark Table ── */}
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Framework Benchmark Comparison</h2>
          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Financial Services · Q1 2026</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(4, 1fr)', padding: '8px 16px', background: 'hsl(var(--bg-muted))', fontSize: 11, color: 'hsl(var(--text-3))', fontWeight: 600, borderBottom: '1px solid hsl(var(--border))' }}>
          <span>Framework</span>
          <span>Your Score</span>
          <span>Industry Median</span>
          <span>Top Quartile</span>
          <span>Your Rank</span>
        </div>
        {BENCHMARK_TABLE.map((row, idx) => (
          <div key={row.framework} style={{ display: 'grid', gridTemplateColumns: '200px repeat(4, 1fr)', padding: '12px 16px', borderBottom: idx < BENCHMARK_TABLE.length - 1 ? '1px solid hsl(var(--border))' : 'none', background: idx % 2 === 0 ? 'hsl(var(--bg-surface))' : 'hsl(var(--bg-raised))' }}>
            <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{row.framework}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold" style={{ color: '#10b981' }}>{row.your}%</span>
              <TrendIcon t={row.trend} />
            </div>
            <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{row.median}%</span>
            <span className="text-sm" style={{ color: '#10b981' }}>{row.top}%</span>
            <span className="text-xs px-2 py-0.5 font-medium self-center" style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98130', width: 'fit-content' }}>{row.rank}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
