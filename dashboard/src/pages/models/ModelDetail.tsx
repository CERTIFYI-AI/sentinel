import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Brain, ChartLine, Shield, Warning, Clock, CheckCircle,
  Export, DownloadSimple, Bell, X, GitBranch, ArrowRight,
  Scales, TestTube, Robot, Gauge, XCircle,
  Sparkle, FileText, ListBullets, CalendarCheck, Copy,
} from '@phosphor-icons/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';
import {
  MODELS, BIAS_AUDITS, INCIDENTS,
  formatDate, Model,
} from '../../data/seed';
import { PageHeader } from '../../components/ui/PageHeader';
import { useChartTheme } from '../../hooks/useChartTheme';

const TABS = [
  'Model Card',
  'Performance',
  'Bias History',
  'Explainability',
  'Data Lineage',
  'Technical Docs',
  'Activity',
] as const;
type Tab = typeof TABS[number];

/* ─── Reusable micro-components ───────────────────────────────────────── */

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${active ? 'hsl(var(--brand))' : 'transparent'}`,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </button>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid hsl(var(--border))' }}>
      <span style={{ fontSize: 12, color: 'hsl(var(--text-4))' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))', textAlign: 'right', maxWidth: 200 }}>{value}</span>
        {badge}
      </div>
    </div>
  );
}

function KpiTile({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: color || 'hsl(var(--brand))' }}>{icon}</span>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: 22, fontWeight: 700, color: color || 'hsl(var(--text-1))', margin: 0 }}>{value}</p>
    </div>
  );
}

/* ─── Data Lineage SVG ─────────────────────────────────────────────── */
function DataLineage({ model }: { model: typeof MODELS[0] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const nodes = [
    { id: 'ds', label: 'Datasets', sub: 'DS-001, DS-004', x: 70, y: 130, color: 'hsl(var(--s-in-tx))' },
    { id: 'pre', label: 'Preprocessing', sub: 'StandardScaler · SMOTE', x: 230, y: 130, color: 'hsl(var(--s-wn-tx))' },
    { id: 'train', label: 'Training', sub: model.framework, x: 390, y: 130, color: 'hsl(var(--brand))' },
    { id: 'mdl', label: (model.name ?? '').split(' ').slice(0, 2).join(' '), sub: `v${model.version}`, x: 550, y: 130, color: 'hsl(var(--s-ok-tx))' },
    { id: 'inf', label: 'Inference', sub: `${model.monthlyInferences}/mo`, x: 710, y: 130, color: 'hsl(var(--brand))' },
  ];
  const edges = [
    [140, 230 - 14],
    [300, 390 - 14],
    [460, 550 - 14],
    [620, 710 - 14],
  ];
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={820} height={210} style={{ display: 'block', minWidth: 820 }}>
        <defs>
          {edges.map((_, i) => (
            <marker key={i} id={`arrowmd${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--brand))" fillOpacity="0.5" />
            </marker>
          ))}
        </defs>
        {edges.map(([x1, x2], i) => (
          <line key={i} x1={x1} y1={130} x2={x2} y2={130}
            stroke="hsl(var(--brand))" strokeWidth={1.5} strokeDasharray="5 4"
            strokeOpacity={0.5} markerEnd={`url(#arrowmd${i})`} />
        ))}
        {nodes.map(n => (
          <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
            <rect
              x={n.x - 66} y={n.y - 42} width={132} height={84} rx={0}
              fill={hovered === n.id ? 'hsl(var(--bg-raised))' : 'hsl(var(--bg-surface))'}
              stroke={hovered === n.id ? n.color : 'hsl(var(--border))'}
              strokeWidth={hovered === n.id ? 2 : 1}
            />
            <circle cx={n.x} cy={n.y - 20} r={8} fill={n.color} fillOpacity={0.15} stroke={n.color} strokeWidth={1.5} />
            <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize={12} fontWeight={600} fill={n.color}>{n.label}</text>
            <text x={n.x} y={n.y + 16} textAnchor="middle" fontSize={10} fill="hsl(var(--text-4))">{n.sub}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─── Drift Alert Config Modal ──────────────────────────────────────── */
function DriftAlertModal({ model, onClose }: { model: typeof MODELS[0]; onClose: () => void }) {
  const [fairness, setFairness] = useState(model.fairnessScore);
  const [drift, setDrift] = useState(5);
  const [channels, setChannels] = useState({ email: true, slack: false, pagerduty: false });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--bg-raised))' }}>
          <span style={{ fontWeight: 700, color: 'hsl(var(--text-1))', fontSize: 14 }}>Configure Drift Alerts — {model.id}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 8 }}>
              <span>Fairness Threshold</span>
              <span style={{ color: fairness < 80 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' }}>{fairness}%</span>
            </label>
            <input type="range" min={50} max={100} value={fairness} onChange={e => setFairness(+e.target.value)} style={{ width: '100%', accentColor: 'hsl(var(--brand))' }} />
          </div>
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 8 }}>
              <span>Drift Threshold</span>
              <span style={{ color: drift > 10 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))' }}>{drift}%</span>
            </label>
            <input type="range" min={1} max={20} value={drift} onChange={e => setDrift(+e.target.value)} style={{ width: '100%', accentColor: 'hsl(var(--brand))' }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 10 }}>Alert Channels</p>
            {(['email', 'slack', 'pagerduty'] as const).map(ch => (
              <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={channels[ch]} onChange={e => setChannels(c => ({ ...c, [ch]: e.target.checked }))} style={{ width: 14, height: 14, accentColor: 'hsl(var(--brand))' }} />
                <span style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
                <button onClick={() => toast.success(`Test alert sent via ${ch}`)} style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 8px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
                  Test
                </button>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid hsl(var(--border))' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '8px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}>Cancel</button>
            <button onClick={() => { toast.success('Alert configuration saved'); onClose(); }} style={{ flex: 1, padding: '8px', background: 'hsl(var(--brand))', border: 'none', cursor: 'pointer', color: 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 600 }}>
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */
export default function ModelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ct = useChartTheme();
  const [tab, setTab] = useState<Tab>('Model Card');
  const [showDriftModal, setShowDriftModal] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const model = MODELS.find(m => m.id === id) || MODELS[0];

  // FIXED: was `a.model === model.name` (wrong field), now correctly matches by modelId
  const modelBiasAudits = useMemo(() =>
    BIAS_AUDITS?.filter?.(a => a.modelId === model.id || a.modelName === model.name) ?? [],
    [model]
  );

  const modelIncidents = model.incidents ?? [];

  const riskTierColors: Record<string, string> = {
    high: 'hsl(var(--s-er-tx))',
    limited: 'hsl(var(--s-wn-tx))',
    minimal: 'hsl(var(--s-ok-tx))',
    unacceptable: 'hsl(var(--s-er-tx))',
  };
  const riskBg: Record<string, string> = {
    high: 'hsl(var(--s-er-bg))',
    limited: 'hsl(var(--s-wn-bg))',
    minimal: 'hsl(var(--s-ok-bg))',
    unacceptable: 'hsl(var(--s-er-bg))',
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    production: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    staging: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    development: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
    retired: { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' },
  };
  const sc = statusColors[model.status] || statusColors.development;

  // Bias audit score trend for chart
  const biasTrendData = useMemo(() => {
    return [...modelBiasAudits]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(a => ({
        date: formatDate(a.date),
        score: Math.round(a.overallScore * 100),
        result: a.result,
      }));
  }, [modelBiasAudits]);

  // SHAP features derived from model type
  const shapFeatures = useMemo(() => {
    if (model.type?.includes('Credit') || model.type?.includes('Loan') || model.type?.includes('Risk')) {
      return [
        { feature: 'credit_score', importance: 0.38 },
        { feature: 'income_ratio', importance: 0.24 },
        { feature: 'employment_years', importance: 0.17 },
        { feature: 'debt_to_income', importance: 0.12 },
        { feature: 'payment_history', importance: 0.09 },
      ];
    }
    if (model.type?.includes('NLP') || model.type?.includes('Sentiment') || model.type?.includes('Text')) {
      return [
        { feature: 'sentiment_polarity', importance: 0.34 },
        { feature: 'token_count', importance: 0.22 },
        { feature: 'named_entities', importance: 0.19 },
        { feature: 'negation_presence', importance: 0.14 },
        { feature: 'sentence_complexity', importance: 0.11 },
      ];
    }
    return [
      { feature: `${model.type?.toLowerCase().replace(/\s/g, '_')}_score`, importance: 0.36 },
      { feature: 'feature_confidence', importance: 0.26 },
      { feature: 'input_variance', importance: 0.18 },
      { feature: 'contextual_weight', importance: 0.12 },
      { feature: 'residual_factor', importance: 0.08 },
    ];
  }, [model]);

  // Pre-compute stable LIME impacts — deterministic seed from model.id so they don't flicker
  const limeFeatures = useMemo(() => {
    const seed = model.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return shapFeatures.map((f, i) => {
      // Deterministic sign: alternate with an offset from seed
      const sign = ((seed + i * 3) % 5 < 2) ? -1 : 1;
      const pImpact = parseFloat((f.importance * sign * 0.65).toFixed(3));
      return { ...f, pImpact };
    });
  }, [model, shapFeatures]);

  return (
    <div>
      <PageHeader
        title={model.name}
        description={model.description}
        icon={Brain}
        actions={
          <div className="flex items-center gap-2">
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>
              {model.status.toUpperCase()}
            </Badge>
            <Badge style={{ background: riskBg[model.riskTier], color: riskTierColors[model.riskTier], borderRadius: 0, fontSize: 10, fontWeight: 700 }}>
              {model.riskTier.toUpperCase()} RISK
            </Badge>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{model.id} · {model.version}</span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 8 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDriftModal(true)}
                style={{ borderRadius: 0 }}
              >
                <Bell size={14} style={{ marginRight: 6 }} /> Alerts
              </Button>
              <Button
                size="sm"
                onClick={() => toast.success('Model Card PDF generated')}
                style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
              >
                <Export size={14} style={{ marginRight: 6 }} /> Export
              </Button>
            </div>
          </div>
        }
      />

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', marginBottom: 20, overflowX: 'auto', background: 'hsl(var(--bg-raised))' }}>
        {TABS.map(t => <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>)}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODEL CARD TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Model Card' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} style={{ color: 'hsl(var(--brand))' }} />
                  EU AI Act Model Passport
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Model ID" value={<span style={{ fontFamily: 'monospace' }}>{model.id}</span>} />
                <InfoRow label="Name" value={model.name} />
                <InfoRow label="Version" value={<span style={{ fontFamily: 'monospace' }}>{model.version}</span>} />
                <InfoRow label="Type" value={model.type} />
                <InfoRow label="Owner" value={model.owner} />
                <InfoRow label="Department" value={model.department} />
                <InfoRow label="Framework" value={<span style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>{model.framework}</span>} />
                <InfoRow label="Last Validated" value={formatDate(model.lastValidated)} />
                <InfoRow label="Risk Tier" value={
                  <span style={{ fontWeight: 700, color: riskTierColors[model.riskTier] }}>{model.riskTier.toUpperCase()}</span>
                } />
                <InfoRow label="EU AI Act Article" value={model.euAiActArticle} />
                <InfoRow label="Monthly Inferences" value={model.monthlyInferences} />
                <InfoRow label="Fairness Score" value={`${model.fairnessScore}%`} badge={
                  model.fairnessScore < 80
                    ? <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0, fontSize: 9 }}>BELOW THRESHOLD</Badge>
                    : <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0, fontSize: 9 }}>COMPLIANT</Badge>
                } />
                <InfoRow label="Drift Status" value={
                  <span style={{ fontWeight: 700, color: model.driftStatus === 'stable' ? 'hsl(var(--s-ok-tx))' : model.driftStatus === 'warning' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))' }}>
                    {model.driftStatus.toUpperCase()}
                  </span>
                } />
              </CardContent>
            </Card>

            {/* Bias & Fairness Metrics */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Scales size={14} style={{ color: 'hsl(var(--brand))' }} />
                  Bias & Fairness Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {model.biasMetrics.map(m => (
                  <div key={m.metric} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>{m.metric}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{m.value}</span>
                        <Badge style={{
                          background: m.status === 'Pass' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
                          color: m.status === 'Pass' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                          border: `1px solid ${m.status === 'Pass' ? 'hsl(var(--s-ok-br))' : 'hsl(var(--s-er-br))'}`,
                          borderRadius: 0, fontSize: 9, padding: '1px 5px',
                        }}>
                          {m.status === 'Pass' ? '✓' : '✗'} {m.status}
                        </Badge>
                      </div>
                    </div>
                    <div style={{ height: 5, background: 'hsl(var(--bg-muted))' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(Math.abs(m.value) * 100, 100)}%`,
                        background: m.status === 'Pass' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 3 }}>Threshold: {m.threshold}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <KpiTile label="Accuracy" value={`${model.accuracy}%`} color={model.accuracy > 90 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))'} icon={<ChartLine size={16} />} />
              <KpiTile label="Latency p99" value={`${model.latencyMs}ms`} color={model.latencyMs < 200 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))'} icon={<Gauge size={16} />} />
              <KpiTile label="Fairness Score" value={`${model.fairnessScore}%`} color={model.fairnessScore > 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))'} icon={<Scales size={16} />} />
              <KpiTile label="Monthly Inferences" value={model.monthlyInferences} color="hsl(var(--brand))" icon={<Robot size={16} />} />
            </div>

            {/* Framework compliance */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} style={{ color: 'hsl(var(--brand))' }} />
                  Framework Compliance
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 12px' }}>
                {model.complianceMapping.map(cm => (
                  <div key={cm.framework} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: cm.status === 'compliant' ? 'hsl(var(--s-ok-tx))' : cm.status === 'partial' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))', flex: 1 }}>{cm.framework}</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{cm.clause}</span>
                    <Badge style={{
                      background: cm.status === 'compliant' ? 'hsl(var(--s-ok-bg))' : cm.status === 'partial' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-er-bg))',
                      color: cm.status === 'compliant' ? 'hsl(var(--s-ok-tx))' : cm.status === 'partial' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))',
                      borderRadius: 0, fontSize: 9,
                    }}>
                      {cm.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Guardrails */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} style={{ color: 'hsl(var(--brand))' }} />
                  Active Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 12px' }}>
                {model.guardrails.map(g => (
                  <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.enabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-1))', flex: 1 }}>{g.name}</span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{g.threshold}</span>
                    <Badge style={{
                      background: g.enabled ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))',
                      color: g.enabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                      borderRadius: 0, fontSize: 9,
                    }}>
                      {g.enabled ? 'ACTIVE' : 'DISABLED'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Export buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => toast.success('Model Card PDF downloaded')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, fontWeight: 500 }}
              >
                <DownloadSimple size={14} /> Model Card PDF
              </button>
              <button
                onClick={() => toast.success('EU AI Act Annex IV JSON downloaded')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, fontWeight: 500 }}
              >
                <Export size={14} /> EU AI Act Annex IV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PERFORMANCE TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KpiTile label="Accuracy" value={`${model.accuracy}%`} color={model.accuracy > 90 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))'} icon={<ChartLine size={16} />} />
            <KpiTile label="Latency p99" value={`${model.latencyMs}ms`} color={model.latencyMs < 200 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))'} icon={<Gauge size={16} />} />
            <KpiTile label="Fairness Score" value={`${model.fairnessScore}%`} color={model.fairnessScore > 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))'} icon={<Scales size={16} />} />
            <KpiTile label="Monthly Volume" value={model.monthlyInferences} color="hsl(var(--brand))" icon={<Robot size={16} />} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Accuracy Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={model.performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: ct.axis }} />
                    <YAxis domain={[80, 100]} tick={{ fill: ct.axis, fontSize: 10 }} />
                    <ReTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, fontSize: 12 }} />
                    <ReferenceLine y={90} stroke="hsl(var(--s-wn-tx))" strokeDasharray="4 3" label={{ value: 'Target', position: 'right', fontSize: 10, fill: 'hsl(var(--s-wn-tx))' }} />
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--brand))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--brand))' }} name="Accuracy %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Latency (ms) Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={model.performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: ct.axis }} />
                    <YAxis tick={{ fill: ct.axis, fontSize: 10 }} />
                    <ReTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, fontSize: 12 }} />
                    <ReferenceLine y={200} stroke="hsl(var(--s-er-tx))" strokeDasharray="4 3" label={{ value: 'SLO', position: 'right', fontSize: 10, fill: 'hsl(var(--s-er-tx))' }} />
                    <Line type="monotone" dataKey="latency" stroke="hsl(var(--s-wn-tx))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--s-wn-tx))' }} name="Latency ms" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Drift history (simulated from performanceHistory delta) */}
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Feature Drift Score Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={model.performanceHistory.map((p, i) => ({ month: p.month, drift: [3.2, 4.1, 5.8, 6.2, 4.9, 3.7][i] || 4.0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: ct.axis }} />
                  <YAxis tick={{ fill: ct.axis, fontSize: 10 }} />
                  <ReTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, 'Drift Score']} />
                  <ReferenceLine y={5} stroke="hsl(var(--s-er-tx))" strokeDasharray="4 3" label={{ value: 'Alert Threshold', position: 'right', fontSize: 10, fill: 'hsl(var(--s-er-tx))' }} />
                  <Line type="monotone" dataKey="drift" stroke="hsl(var(--s-er-tx))" strokeWidth={2} dot={{ r: 3 }} name="Drift %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BIAS HISTORY TAB — FULLY REBUILT
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Bias History' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {modelBiasAudits.length === 0 ? (
            /* ── Empty state ── */
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'hsl(var(--bg-muted))', border: '2px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Scales size={28} style={{ color: 'hsl(var(--text-4))' }} />
                </div>
                <p style={{ color: 'hsl(var(--text-2))', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No Bias Audits on Record</p>
                <p style={{ color: 'hsl(var(--text-4))', fontSize: 13, marginBottom: 20 }}>
                  Schedule a bias audit to evaluate fairness across protected attributes including gender, age, race, and disability status. Required for EU AI Act Article 10 compliance.
                </p>
                <button
                  onClick={() => toast.success('Bias audit scheduled — you will be notified when complete')}
                  style={{ padding: '9px 20px', background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  <CalendarCheck size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Schedule Bias Audit
                </button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ── Summary KPIs ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <KpiTile
                  label="Total Audits"
                  value={modelBiasAudits.length}
                  color="hsl(var(--brand))"
                  icon={<TestTube size={16} />}
                />
                <KpiTile
                  label="Passed"
                  value={modelBiasAudits.filter(a => a.result === 'passed').length}
                  color="hsl(var(--s-ok-tx))"
                  icon={<CheckCircle size={16} weight="fill" />}
                />
                <KpiTile
                  label="Failed"
                  value={modelBiasAudits.filter(a => a.result === 'failed').length}
                  color="hsl(var(--s-er-tx))"
                  icon={<XCircle size={16} />}
                />
                <KpiTile
                  label="Latest Score"
                  value={`${Math.round([...modelBiasAudits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].overallScore * 100)}%`}
                  color={[...modelBiasAudits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].result === 'passed' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))'}
                  icon={<Scales size={16} />}
                />
              </div>

              {/* ── Score trend chart ── */}
              {biasTrendData.length > 1 && (
                <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardHeader className="pb-2">
                    <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Bias Score Trend Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={biasTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: ct.axis }} />
                        <YAxis domain={[0, 100]} tick={{ fill: ct.axis, fontSize: 10 }} />
                        <ReTooltip
                          contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, fontSize: 12 }}
                          formatter={(v: number) => [`${v}%`, 'Overall Score']}
                        />
                        <ReferenceLine y={70} stroke="hsl(var(--s-er-tx))" strokeDasharray="4 3" label={{ value: 'Min Threshold', position: 'right', fontSize: 10, fill: 'hsl(var(--s-er-tx))' }} />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--brand))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--brand))' }} name="Bias Score %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* ── Per-audit detail cards ── */}
              {[...modelBiasAudits]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(audit => {
                  const resultColor = audit.result === 'passed'
                    ? { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' }
                    : audit.result === 'failed'
                      ? { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' }
                      : { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
                  return (
                    <Card key={audit.id} style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${resultColor.border}` }}>
                      <CardContent style={{ padding: 0 }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))', background: resultColor.bg }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: resultColor.text, fontWeight: 700 }}>{audit.id}</span>
                          <Badge style={{ background: resultColor.bg, color: resultColor.text, border: `1px solid ${resultColor.border}`, borderRadius: 0, fontSize: 10, fontWeight: 700 }}>
                            {audit.result === 'passed' ? '✓' : audit.result === 'failed' ? '✗' : '⚠'} {audit.result.toUpperCase()}
                          </Badge>
                          <span style={{ fontSize: 12, color: resultColor.text, fontWeight: 600, marginLeft: 4 }}>
                            {Math.round(audit.overallScore * 100)}% Overall Score
                          </span>
                          <span style={{ fontSize: 12, color: resultColor.text, marginLeft: 'auto' }}>{formatDate(audit.date)}</span>
                          <span style={{ fontSize: 11, color: resultColor.text }}>Auditor: {audit.auditor}</span>
                        </div>

                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {/* Meta row */}
                          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <InfoRow label="Dataset" value={<span style={{ fontFamily: 'monospace' }}>{audit.dataset}</span>} />
                            <InfoRow label="Framework" value={audit.framework} />
                            {audit.technique && <InfoRow label="Technique" value={audit.technique} />}
                          </div>

                          {/* Protected attributes */}
                          {audit.protectedAttributes?.length > 0 && (
                            <div>
                              <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                                Protected Attributes Tested
                              </p>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {audit.protectedAttributes.map(attr => (
                                  <span key={attr.name} style={{ fontSize: 11, padding: '3px 8px', background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand-subtle))' }}>
                                    {attr.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dimension scores table */}
                          {audit.dimensions?.length > 0 && (
                            <div>
                              <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                Per-Attribute Dimension Scores
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                                {audit.dimensions.map(dim => (
                                  <div key={dim.attribute} style={{ padding: '10px 12px', background: 'hsl(var(--bg-raised))', border: `1px solid ${dim.pass ? 'hsl(var(--s-ok-br))' : 'hsl(var(--s-er-br))'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                      <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-2))' }}>{dim.attribute}</span>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: dim.pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                                        {(dim.score * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div style={{ height: 4, background: 'hsl(var(--bg-muted))' }}>
                                      <div style={{
                                        height: '100%',
                                        width: `${dim.score * 100}%`,
                                        background: dim.pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                                        transition: 'width 0.5s ease',
                                      }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                      <span style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>Threshold: {(dim.threshold * 100).toFixed(0)}%</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: dim.pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                                        {dim.pass ? '✓ PASS' : '✗ FAIL'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dimension radar chart */}
                          {audit.dimensions?.length >= 3 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
                              <ResponsiveContainer width="100%" height={180}>
                                <RadarChart data={audit.dimensions.map(d => ({ subject: d.attribute, score: Math.round(d.score * 100), threshold: Math.round(d.threshold * 100) }))}>
                                  <PolarGrid stroke="hsl(var(--border))" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--text-3))' }} />
                                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: 'hsl(var(--text-4))' }} />
                                  <Radar name="Score" dataKey="score" stroke="hsl(var(--brand))" fill="hsl(var(--brand))" fillOpacity={0.15} strokeWidth={2} />
                                  <Radar name="Threshold" dataKey="threshold" stroke="hsl(var(--s-er-tx))" fill="hsl(var(--s-er-tx))" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 3" />
                                  <ReTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, fontSize: 11 }} />
                                </RadarChart>
                              </ResponsiveContainer>
                              {/* Recommendations */}
                              {audit.recommendations?.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                                    Recommendations
                                  </p>
                                  {audit.recommendations.map((rec, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                                      <span style={{ color: 'hsl(var(--brand))', flexShrink: 0, marginTop: 1 }}>
                                        <Sparkle size={12} weight="fill" />
                                      </span>
                                      <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', lineHeight: 1.5, margin: 0 }}>{rec}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {/* Schedule next audit CTA */}
              <div style={{ padding: '16px 20px', background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--brand))' }}>Stay Ahead of Compliance</p>
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginTop: 2 }}>EU AI Act requires bias audits every 6 months for high-risk models.</p>
                </div>
                <button
                  onClick={() => toast.success('Next bias audit scheduled')}
                  style={{ padding: '8px 16px', background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Schedule Next Audit
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EXPLAINABILITY TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Explainability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ChartLine size={14} style={{ color: 'hsl(var(--brand))' }} />
                  SHAP Feature Importance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 14 }}>
                  SHAP (SHapley Additive exPlanations) — mean |SHAP| values across 1,000 random samples
                </p>
                {shapFeatures.map(f => (
                  <div key={f.feature} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-2))' }}>{f.feature}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--brand))' }}>{(f.importance * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 8, background: 'hsl(var(--bg-muted))' }}>
                      <div style={{ height: '100%', width: `${f.importance * 100}%`, background: `hsl(var(--brand))`, opacity: 0.6 + f.importance * 0.4, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TestTube size={14} style={{ color: 'hsl(var(--brand))' }} />
                  LIME Local Explanations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 14 }}>
                  Sample prediction explanation for a representative inference — perturbation-based local interpretability
                </p>
                {limeFeatures.map(f => (
                  <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-2))', flex: 1 }}>{f.feature}</span>
                    {/* Waterfall bar: centre baseline, positive goes right (green), negative goes left (red) */}
                    <div style={{ width: 100, height: 8, background: 'hsl(var(--bg-muted))', position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        height: '100%',
                        left: f.pImpact >= 0 ? '50%' : `calc(50% - ${Math.abs(f.pImpact) * 80}px)`,
                        width: `${Math.abs(f.pImpact) * 80}px`,
                        background: f.pImpact >= 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                        opacity: 0.85,
                      }} />
                      {/* Centre baseline */}
                      <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'hsl(var(--border))' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: f.pImpact >= 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))', width: 52, textAlign: 'right', flexShrink: 0 }}>
                      {f.pImpact >= 0 ? '+' : ''}{(f.pImpact * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Explainability method badge */}
          <div style={{ padding: '12px 16px', background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sparkle size={16} style={{ color: 'hsl(var(--brand))' }} weight="fill" />
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--brand))' }}>Explainability Method: SHAP + LIME</span>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>
                EU AI Act Article 13 requires meaningful explanations for high-risk model decisions. This model meets the transparency obligation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DATA LINEAGE TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Data Lineage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                <GitBranch size={14} style={{ color: 'hsl(var(--brand))' }} />
                Data Lineage Flow — {model.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginBottom: 16 }}>
                End-to-end data provenance from source datasets through preprocessing, training, and inference. Hover over nodes for details.
              </p>
              <DataLineage model={model} />
            </CardContent>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Source Datasets', value: 'DS-001, DS-004' },
              { label: 'Training Split', value: '80% / 20%' },
              { label: 'Feature Count', value: '47 features' },
              { label: 'Training Duration', value: '4h 32m' },
              { label: 'Compute Used', value: '8× A100 GPUs' },
              { label: 'Last Retrained', value: formatDate(model.lastValidated) },
              { label: 'Data Retention', value: '36 months' },
              { label: 'Preprocessing Pipeline', value: 'v2.1.3' },
              { label: 'Augmentation', value: 'SMOTE + Random Flip' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 14px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TECHNICAL DOCS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Technical Docs' && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} style={{ color: 'hsl(var(--brand))' }} />
              Technical Documentation
            </CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {[
              { title: 'Architecture Overview', type: 'PDF', date: '2026-03-01', size: '2.4 MB', desc: 'Neural architecture diagrams, layer specifications, and hyperparameters.' },
              { title: 'API Reference', type: 'HTML', date: '2026-03-15', size: '1.1 MB', desc: 'Full REST API reference with request/response schemas and auth patterns.' },
              { title: 'Training Runbook', type: 'MD', date: '2026-02-28', size: '240 KB', desc: 'Step-by-step training procedure, dataset preparation, and evaluation criteria.' },
              { title: 'FMEA Risk Assessment', type: 'XLSX', date: '2026-03-10', size: '560 KB', desc: 'Failure Mode and Effects Analysis aligned to ISO 26262 methodology.' },
              { title: 'EU AI Act Annex IV Package', type: 'ZIP', date: '2026-04-01', size: '8.7 MB', desc: 'Complete Annex IV technical documentation bundle for regulatory submission.' },
              { title: 'Model Card', type: 'JSON', date: formatDate(model.lastValidated), size: '24 KB', desc: 'Standardised model card following Mitchell et al. (2019) format.' },
            ].map(doc => (
              <div key={doc.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ width: 40, height: 40, background: 'hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'hsl(var(--brand))', flexShrink: 0, letterSpacing: '0.05em' }}>
                  {doc.type}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', marginBottom: 2 }}>{doc.title}</p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{doc.desc}</p>
                  <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 2 }}>{doc.size} · Updated {doc.date}</p>
                </div>
                <button
                  onClick={() => toast.success(`Downloading ${doc.title}…`)}
                  style={{ padding: '6px 12px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                >
                  <DownloadSimple size={13} /> Download
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          ACTIVITY TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Activity' && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ListBullets size={14} style={{ color: 'hsl(var(--brand))' }} />
                Activity Log
              </CardTitle>
              <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>
                {6 + modelIncidents.length} events
              </span>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {[
              { date: '2026-04-05', event: 'Bias audit completed — result: WARNING', type: 'warning', actor: 'Maria Santos' },
              { date: '2026-04-01', event: 'Model registered for EU AI Act compliance review', type: 'info', actor: 'Raj Gupta' },
              { date: '2026-03-28', event: 'Drift threshold breached — 6.2% feature drift detected', type: 'error', actor: 'System' },
              { date: '2026-03-25', event: 'Performance validation passed (Accuracy 94.2%)', type: 'success', actor: 'System' },
              { date: '2026-03-20', event: 'Guardrail configuration updated', type: 'info', actor: 'Sarah Chen' },
              { date: '2026-03-15', event: `Model retrained on updated dataset DS-004 using ${model.framework}`, type: 'info', actor: 'Maria Santos' },
              ...modelIncidents.map(i => ({
                date: i.date,
                event: `${i.type} incident (${i.severity})${i.resolved ? ' — Resolved' : ' — Open'}`,
                type: i.resolved ? 'success' : 'error',
                actor: 'System',
              })),
            ]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((item, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingTop: 4 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: item.type === 'success' ? 'hsl(var(--s-ok-tx))' : item.type === 'error' ? 'hsl(var(--s-er-tx))' : item.type === 'warning' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--brand))',
                    }} />
                    {i < arr.length - 1 && <div style={{ width: 1, flexGrow: 1, background: 'hsl(var(--border))', minHeight: 24, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <p style={{ fontSize: 13, color: 'hsl(var(--text-1))', lineHeight: 1.4 }}>{item.event}</p>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 3 }}>
                      <span style={{ fontWeight: 500 }}>{item.actor}</span> · {formatDate(item.date)}
                    </p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {showDriftModal && <DriftAlertModal model={model} onClose={() => setShowDriftModal(false)} />}
    </div>
  );
}
