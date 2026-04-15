import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Brain, ChartLine, Shield, Warning, Clock, CheckCircle,
  Export, DownloadSimple, CaretRight, Info, Lightning, Bell, Sliders,
  GitBranch, Activity, ArrowRight, X, Plus,
} from '@phosphor-icons/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { MODELS, BIAS_AUDITS, INCIDENTS, EVIDENCE, CONTROLS, severityColor, statusColor, formatDate } from '../../data/seed';
import { useChartTheme } from '../../hooks/useChartTheme';
import Breadcrumbs from '../../components/Breadcrumbs';

const TABS = ['Model Card', 'Performance', 'Bias History', 'Explainability', 'Data Lineage', 'Technical Docs', 'Activity'] as const;
type Tab = typeof TABS[number];

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${active ? 'hsl(var(--brand))' : 'transparent'}`,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
      <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{value}</span>
        {badge}
      </div>
    </div>
  );
}

// SVG Data Lineage
function DataLineage({ model }: { model: typeof MODELS[0] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const nodes = [
    { id: 'ds', label: 'Datasets', sub: 'DS-001, DS-004', x: 60, y: 120, color: 'hsl(var(--s-in-tx))' },
    { id: 'pre', label: 'Preprocessing', sub: 'StandardScaler, SMOTE', x: 220, y: 120, color: 'hsl(var(--s-wn-tx))' },
    { id: 'train', label: 'Training', sub: model.framework, x: 380, y: 120, color: 'hsl(var(--brand))' },
    { id: 'mdl', label: model.name, sub: `v${model.version}`, x: 540, y: 120, color: 'hsl(var(--s-ok-tx))' },
    { id: 'inf', label: 'Inference', sub: `${model.monthlyInferences}/mo`, x: 700, y: 120, color: '#8b5cf6' },
  ];
  const edges = [
    { from: { x: 60 + 70, y: 120 }, to: { x: 220 - 10, y: 120 } },
    { from: { x: 220 + 80, y: 120 }, to: { x: 380 - 10, y: 120 } },
    { from: { x: 380 + 50, y: 120 }, to: { x: 540 - 10, y: 120 } },
    { from: { x: 540 + 70, y: 120 }, to: { x: 700 - 10, y: 120 } },
  ];
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={820} height={200} style={{ display: 'block', minWidth: 760 }}>
        {/* Edges */}
        {edges.map((e, i) => (
          <g key={i}>
            <defs>
              <marker id={`arrow${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--brand))" />
              </marker>
            </defs>
            <line x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke="hsl(var(--brand))" strokeWidth={2} markerEnd={`url(#arrow${i})`} />
          </g>
        ))}
        {/* Nodes */}
        {nodes.map(n => (
          <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
            <rect
              x={n.x - 60} y={n.y - 36} width={120} height={72}
              fill={hovered === n.id ? 'hsl(var(--bg-raised))' : 'hsl(var(--bg-surface))'}
              stroke={hovered === n.id ? n.color : 'hsl(var(--border))'}
              strokeWidth={hovered === n.id ? 2 : 1}
            />
            <text x={n.x} y={n.y - 8} textAnchor="middle" fontSize={12} fontWeight={600} fill={n.color}>{n.label}</text>
            <text x={n.x} y={n.y + 12} textAnchor="middle" fontSize={10} fill="hsl(var(--text-3))">{n.sub}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Drift Alert Config Modal
function DriftAlertModal({ model, onClose }: { model: typeof MODELS[0]; onClose: () => void }) {
  const [fairness, setFairness] = useState(model.fairnessScore);
  const [drift, setDrift] = useState(5);
  const [channels, setChannels] = useState({ email: true, slack: false, pagerduty: false });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'hsl(var(--text-1))', fontSize: 14 }}>Configure Drift Alerts — {model.id}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 8 }}>
              <span>Fairness Threshold</span>
              <span style={{ color: fairness < 80 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' }}>{fairness}%</span>
            </label>
            <input type="range" min={50} max={100} value={fairness} onChange={e => setFairness(+e.target.value)}
              style={{ width: '100%', accentColor: 'hsl(var(--brand))' }} />
          </div>
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 8 }}>
              <span>Drift Threshold</span>
              <span>{drift}%</span>
            </label>
            <input type="range" min={1} max={20} value={drift} onChange={e => setDrift(+e.target.value)}
              style={{ width: '100%', accentColor: 'hsl(var(--brand))' }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 10 }}>Alert Channels</p>
            {(['email', 'slack', 'pagerduty'] as const).map(ch => (
              <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={channels[ch]} onChange={e => setChannels(c => ({ ...c, [ch]: e.target.checked }))}
                  style={{ width: 14, height: 14, accentColor: 'hsl(var(--brand))' }} />
                <span style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
                <button
                  onClick={() => toast.success(`Test alert sent via ${ch}`)}
                  style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 8px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-3))' }}
                >
                  Test
                </button>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '8px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}>Cancel</button>
            <button onClick={() => { toast.success('Alert configuration saved'); onClose(); }}
              style={{ flex: 1, padding: '8px', background: 'hsl(var(--brand))', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ct = useChartTheme();
  const [tab, setTab] = useState<Tab>('Model Card');
  const [showDriftModal, setShowDriftModal] = useState(false);

  const model = MODELS.find(m => m.id === id) || MODELS[0];
  const modelBiasAudits = BIAS_AUDITS?.filter?.(a => a.model === model.name) ?? [];
  const modelIncidents = model.incidents ?? [];
  const sc = statusColor(model.status);
  const riskTierColors: Record<string, string> = {
    high: 'hsl(var(--s-er-tx))', limited: 'hsl(var(--s-wn-tx))', minimal: 'hsl(var(--s-ok-tx))', unacceptable: 'hsl(var(--r-cr-tx))',
  };

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      <Breadcrumbs />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <button onClick={() => navigate('/models/inventory')} style={{ background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', padding: '6px 8px', color: 'hsl(var(--text-2))' }} aria-label="Back to inventory">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>{model.name}</h1>
              <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>{model.status}</Badge>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{model.id} · {model.version}</span>
            </div>
            <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', margin: 0 }}>{model.description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowDriftModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12 }}
          >
            <Bell size={14} /> Configure Alerts
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(t => <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>)}
      </div>

      {/* ── MODEL CARD TAB ── */}
      {tab === 'Model Card' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>EU AI Act Model Passport</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Model ID" value={model.id} />
                <InfoRow label="Name" value={model.name} />
                <InfoRow label="Version" value={model.version} />
                <InfoRow label="Type" value={model.type} />
                <InfoRow label="Owner" value={model.owner} />
                <InfoRow label="Department" value={model.department} />
                <InfoRow label="Framework" value={model.framework} />
                <InfoRow label="Last Validated" value={formatDate(model.lastValidated)} />
                <InfoRow label="Risk Tier" value={
                  <span style={{ fontWeight: 700, color: riskTierColors[model.riskTier] }}>{model.riskTier.toUpperCase()}</span>
                } />
                <InfoRow label="EU AI Act Article" value={model.euAiActArticle} />
                <InfoRow label="Monthly Inferences" value={model.monthlyInferences} />
                <InfoRow label="Fairness Score" value={`${model.fairnessScore}%`} badge={
                  model.fairnessScore < 80 ? <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0, fontSize: 10 }}>Below threshold</Badge> : null
                } />
              </CardContent>
            </Card>

            {/* Fairness / Bias Metrics */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Bias & Fairness Metrics</CardTitle></CardHeader>
              <CardContent>
                {model.biasMetrics.map(m => (
                  <div key={m.metric} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>{m.metric}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{m.value}</span>
                        <Badge style={{
                          background: m.status === 'Pass' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
                          color: m.status === 'Pass' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                          border: `1px solid ${m.status === 'Pass' ? 'hsl(var(--s-ok-br))' : 'hsl(var(--s-er-br))'}`,
                          borderRadius: 0, fontSize: 9,
                        }}>{m.status}</Badge>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                      <div style={{ height: '100%', width: `${Math.min(Math.abs(m.value) * 100, 100)}%`, background: m.status === 'Pass' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))', transition: 'width 0.5s' }} />
                    </div>
                    <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 2 }}>Threshold: {m.threshold}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Framework compliance */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Framework Compliance</CardTitle></CardHeader>
              <CardContent>
                {model.complianceMapping.map(cm => (
                  <div key={cm.framework} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))', flex: 1 }}>{cm.framework}</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{cm.clause}</span>
                    <Badge style={{
                      background: cm.status === 'compliant' ? 'hsl(var(--s-ok-bg))' : cm.status === 'partial' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-er-bg))',
                      color: cm.status === 'compliant' ? 'hsl(var(--s-ok-tx))' : cm.status === 'partial' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))',
                      borderRadius: 0, fontSize: 10,
                    }}>{cm.status === 'compliant' ? '✓' : cm.status === 'partial' ? '⚠' : '✗'} {cm.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Guardrails */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Active Guardrails</CardTitle></CardHeader>
              <CardContent>
                {model.guardrails.map(g => (
                  <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.enabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-1))', flex: 1 }}>{g.name}</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{g.threshold}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Export buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { toast.success('Model Card PDF downloaded'); }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, fontWeight: 500 }}
              >
                <DownloadSimple size={14} /> Model Card PDF
              </button>
              <button
                onClick={() => { toast.success('EU AI Act Annex IV JSON downloaded'); }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, fontWeight: 500 }}
              >
                <Export size={14} /> EU AI Act Annex IV JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PERFORMANCE TAB ── */}
      {tab === 'Performance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Accuracy Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={model.performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: ct.axis }} />
                  <YAxis domain={[80, 100]} tick={{ fill: ct.axis, fontSize: 10 }} />
                  <ReTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0 }} />
                  <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--brand))" strokeWidth={2} dot={false} name="Accuracy %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Latency (ms) Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={model.performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: ct.axis }} />
                  <YAxis tick={{ fill: ct.axis, fontSize: 10 }} />
                  <ReTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0 }} />
                  <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2} dot={false} name="Latency ms" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Current Metrics</CardTitle></CardHeader>
            <CardContent>
              {[
                { label: 'Accuracy', value: `${model.accuracy}%`, color: model.accuracy > 90 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' },
                { label: 'Latency (p99)', value: `${model.latencyMs}ms`, color: model.latencyMs < 200 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' },
                { label: 'Fairness Score', value: `${model.fairnessScore}%`, color: model.fairnessScore > 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' },
                { label: 'Monthly Inferences', value: model.monthlyInferences, color: 'hsl(var(--text-1))' },
                { label: 'Drift Status', value: model.driftStatus, color: model.driftStatus === 'stable' ? 'hsl(var(--s-ok-tx))' : model.driftStatus === 'warning' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))' },
              ].map(m => <InfoRow key={m.label} label={m.label} value={<span style={{ color: m.color, fontWeight: 600 }}>{m.value}</span>} />)}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── BIAS HISTORY TAB ── */}
      {tab === 'Bias History' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {modelBiasAudits.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent style={{ padding: 40, textAlign: 'center' }}>
                <Shield size={40} style={{ margin: '0 auto 12px', color: 'hsl(var(--text-4))' }} />
                <p style={{ color: 'hsl(var(--text-3))', fontSize: 14 }}>No bias audits found for this model</p>
                <button style={{ marginTop: 12, padding: '8px 18px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                  Schedule Bias Audit
                </button>
              </CardContent>
            </Card>
          ) : modelBiasAudits.map(audit => (
            <Card key={audit.id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'hsl(var(--text-3))' }}>{audit.id}</span>
                  <Badge style={{
                    background: audit.result === 'passed' ? 'hsl(var(--s-ok-bg))' : audit.result === 'failed' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))',
                    color: audit.result === 'passed' ? 'hsl(var(--s-ok-tx))' : audit.result === 'failed' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))',
                    borderRadius: 0, fontSize: 10,
                  }}>{audit.result}</Badge>
                  <span style={{ fontSize: 12, color: 'hsl(var(--text-4))', marginLeft: 'auto' }}>{formatDate(audit.date)}</span>
                </div>
                <p style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>Technique: {audit.technique}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── EXPLAINABILITY TAB ── */}
      {tab === 'Explainability' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>SHAP Feature Importance</CardTitle></CardHeader>
            <CardContent>
              {[
                { feature: 'credit_score', importance: 0.38 },
                { feature: 'income_ratio', importance: 0.24 },
                { feature: 'employment_years', importance: 0.17 },
                { feature: 'debt_to_income', importance: 0.12 },
                { feature: 'payment_history', importance: 0.09 },
              ].map(f => (
                <div key={f.feature} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-2))' }}>{f.feature}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--brand))' }}>{(f.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'hsl(var(--bg-muted))' }}>
                    <div style={{ height: '100%', width: `${f.importance * 100}%`, background: 'hsl(var(--brand))', transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>LIME Local Explanations</CardTitle></CardHeader>
            <CardContent>
              <div style={{ padding: '12px 0' }}>
                <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginBottom: 12 }}>Sample prediction explanation for application ID: LOAN-4892</p>
                {[
                  { feature: 'credit_score = 720', impact: +0.18, color: 'hsl(var(--s-ok-tx))' },
                  { feature: 'income_ratio = 0.34', impact: +0.12, color: 'hsl(var(--s-ok-tx))' },
                  { feature: 'debt_to_income = 0.52', impact: -0.09, color: 'hsl(var(--s-er-tx))' },
                  { feature: 'payment_history = 2 late', impact: -0.07, color: 'hsl(var(--s-er-tx))' },
                ].map(f => (
                  <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-2))', flex: 1 }}>{f.feature}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.impact > 0 ? '+' : ''}{(f.impact * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DATA LINEAGE TAB ── */}
      {tab === 'Data Lineage' && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Data Lineage Flow — {model.name}</CardTitle></CardHeader>
          <CardContent>
            <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginBottom: 16 }}>
              End-to-end data flow from source datasets through preprocessing, training, and inference. Hover over nodes for details.
            </p>
            <DataLineage model={model} />
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Source Datasets', value: 'DS-001, DS-004' },
                { label: 'Training Split', value: '80% / 20%' },
                { label: 'Feature Count', value: '47 features' },
                { label: 'Training Duration', value: '4h 32m' },
                { label: 'Compute Used', value: '8× A100 GPUs' },
                { label: 'Last Retrained', value: formatDate(model.lastValidated) },
              ].map(item => (
                <div key={item.label} style={{ padding: '10px 12px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                  <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginBottom: 3 }}>{item.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TECHNICAL DOCS TAB ── */}
      {tab === 'Technical Docs' && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Technical Documentation</CardTitle></CardHeader>
          <CardContent>
            {[
              { title: 'Architecture Overview', type: 'PDF', date: '2026-03-01', size: '2.4 MB' },
              { title: 'API Reference', type: 'HTML', date: '2026-03-15', size: '1.1 MB' },
              { title: 'Training Runbook', type: 'MD', date: '2026-02-28', size: '240 KB' },
              { title: 'FMEA Risk Assessment', type: 'XLSX', date: '2026-03-10', size: '560 KB' },
              { title: 'EU AI Act Annex IV Package', type: 'ZIP', date: '2026-04-01', size: '8.7 MB' },
            ].map(doc => (
              <div key={doc.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ width: 36, height: 36, background: 'hsl(var(--bg-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'hsl(var(--text-3))', flexShrink: 0 }}>
                  {doc.type}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{doc.title}</p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{doc.size} · Updated {formatDate(doc.date)}</p>
                </div>
                <button onClick={() => toast.success(`Downloading ${doc.title}…`)} style={{ padding: '5px 10px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <DownloadSimple size={13} /> Download
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'Activity' && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Activity Log</CardTitle></CardHeader>
          <CardContent style={{ padding: 0 }}>
            {[
              { date: '2026-04-05', event: 'Bias audit completed — result: WARNING', type: 'warning', actor: 'Maria Santos' },
              { date: '2026-04-01', event: 'Model registered for EU AI Act compliance review', type: 'info', actor: 'Raj Gupta' },
              { date: '2026-03-28', event: 'Drift threshold breached — 6.2% feature drift detected', type: 'error', actor: 'System' },
              { date: '2026-03-25', event: 'Performance validation passed (Accuracy 94.2%)', type: 'success', actor: 'System' },
              { date: '2026-03-20', event: 'Guardrail configuration updated', type: 'info', actor: 'Sarah Chen' },
              { date: '2026-03-15', event: 'Model retrained on updated dataset DS-004', type: 'info', actor: 'Maria Santos' },
              ...modelIncidents.map(i => ({ date: i.date, event: `${i.type} incident (${i.severity})${i.resolved ? ' — Resolved' : ' — Open'}`, type: i.resolved ? 'success' : 'error', actor: 'System' })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                  background: item.type === 'success' ? 'hsl(var(--s-ok-tx))' : item.type === 'error' ? 'hsl(var(--s-er-tx))' : item.type === 'warning' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--brand))',
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>{item.event}</p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 2 }}>{item.actor} · {formatDate(item.date)}</p>
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
