import { useParams, useNavigate, Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft, Brain, ChartLine, Shield, Warning, Clock, CheckCircle,
  Export, DownloadSimple, Bell, X, GitBranch, ArrowRight,
  Scales, TestTube, Robot, Gauge, XCircle,
  Sparkle, FileText, ListBullets, CalendarCheck, Copy, Plus,
  ShieldCheck, CaretRight, Bank, Siren, UsersThree, CurrencyDollar, Crosshair,
  SealCheck, Vault, Pulse,
} from '@phosphor-icons/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';
import {
  formatDate, Model,
} from '../../data/seed';
import { useModelsData } from '@/hooks/useModelsData';
import { useModelDetailData } from '@/hooks/useModelDetailData';
import { useModelAnalytics } from '@/hooks/useModelAnalytics';
import { useModelGovernance } from '@/hooks/useAiiaData';
import { useModelRuntimeSummary } from '@/hooks/useModelRuntimeSummary';
import { useModelBacklinks, type BacklinkItem, type BacklinkSource } from '@/hooks/useModelBacklinks';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import type { AlertConfig } from '@/services/modelDetailService';
import { useAuthStore } from '../../store/authStore';
import { recordToModel } from '@/lib/modelMapping';
import { PageHeader } from '../../components/ui/PageHeader';
import { useChartTheme } from '../../hooks/useChartTheme';

/* ─── Export helpers (real file downloads, not toast stubs) ───────────── */
function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function buildModelCard(model: Model) {
  return {
    id: model.id, name: model.name, version: model.version, type: model.type,
    owner: model.owner, department: model.department, framework: model.framework,
    status: model.status, riskTier: model.riskTier, euAiActArticle: model.euAiActArticle,
    fairnessScore: model.fairnessScore, driftStatus: model.driftStatus,
    lastValidated: model.lastValidated, description: model.description,
    generatedAt: new Date().toISOString(), format: 'Model Card (Mitchell et al. 2019)',
  };
}
function buildAnnexIV(model: Model) {
  return {
    regulation: 'EU AI Act — Annex IV Technical Documentation',
    model: { id: model.id, name: model.name, version: model.version, type: model.type },
    riskClassification: model.riskTier, article: model.euAiActArticle,
    governance: { owner: model.owner, department: model.department, framework: model.framework },
    performance: { fairnessScore: model.fairnessScore, driftStatus: model.driftStatus, lastValidated: model.lastValidated },
    generatedAt: new Date().toISOString(),
  };
}

const TABS = [
  'Model Card',
  'Risk & Security',
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

/* ─── Backlink card (Risk & Security tab) ─────────────────────────────
   One card per governance module that references this model. Counts and
   rows come straight from the tenant-scoped tables via useModelBacklinks;
   a failed source shows an honest "unavailable" note, an empty source an
   honest "No linked records" — nothing is invented. */

function severityBadgeStyle(severity: string | null): React.CSSProperties {
  const s = (severity || '').toLowerCase();
  if (s === 'critical' || s === 'high') {
    return { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))' };
  }
  if (s === 'medium') {
    return { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', border: '1px solid hsl(var(--s-wn-br))' };
  }
  if (s === 'low') {
    return { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))' };
  }
  return { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' };
}

function BacklinkCard({ title, icon, source, loading, viewAllTo, itemTo }: {
  title: string;
  icon: React.ReactNode;
  source: BacklinkSource | undefined;
  loading: boolean;
  /** Module list link, filtered to this model where the module supports it. */
  viewAllTo: string;
  /** Optional per-record deep link (e.g. /hitl/<uuid>). */
  itemTo?: (item: BacklinkItem) => string;
}) {
  const count = source?.count ?? null;
  const items = source?.items ?? [];
  return (
    <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column' }}>
      <CardHeader className="pb-2">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
            {icon}
            {title}
          </CardTitle>
          {loading ? (
            <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>…</span>
          ) : count === null ? (
            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 9, fontWeight: 700 }}>
              UNAVAILABLE
            </Badge>
          ) : (
            <Badge style={{
              background: count > 0 ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-muted))',
              color: count > 0 ? 'hsl(var(--brand))' : 'hsl(var(--text-4))',
              border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10, fontWeight: 700,
            }}>
              {count}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {loading ? (
          /* Loading skeleton — real pending state, not a fake zero. */
          <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 30, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', opacity: 0.6 - i * 0.15 }} />
            ))}
          </div>
        ) : count === null ? (
          <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', margin: 0 }}>
            Records unavailable — this source could not be queried.
          </p>
        ) : count === 0 ? (
          <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', margin: 0 }}>No linked records.</p>
        ) : (
          items.map(item => {
            const row = (
              <>
                {item.ref && (
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-4))', flexShrink: 0 }}>{item.ref}</span>
                )}
                <span style={{ fontSize: 12, color: 'hsl(var(--text-1))', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
                {item.note && (
                  <span style={{ fontSize: 10, color: 'hsl(var(--text-4))', flexShrink: 0 }}>{item.note}</span>
                )}
                {item.severity && (
                  <Badge style={{ ...severityBadgeStyle(item.severity), borderRadius: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
                    {item.severity}
                  </Badge>
                )}
                {item.status && (
                  <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 9, textTransform: 'uppercase', flexShrink: 0 }}>
                    {item.status}
                  </Badge>
                )}
              </>
            );
            const rowStyle: React.CSSProperties = {
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
              background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))',
            };
            return itemTo ? (
              <Link key={item.id} to={itemTo(item)} style={{ ...rowStyle, textDecoration: 'none' }}>
                {row}
                <CaretRight size={12} style={{ color: 'hsl(var(--text-4))', flexShrink: 0 }} />
              </Link>
            ) : (
              <div key={item.id} style={rowStyle}>{row}</div>
            );
          })
        )}
        <div style={{ marginTop: 'auto', paddingTop: 4 }}>
          <InterlinkChip label={count && count > 3 ? `View all (${count})` : 'View all'} to={viewAllTo} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Drift Alert Config Modal ──────────────────────────────────────── */
function DriftAlertModal({ model, initial, onClose, onSave, onTest }: {
  model: Model; initial: AlertConfig | null; onClose: () => void;
  onSave: (cfg: AlertConfig) => void; onTest: (channel: string) => void;
}) {
  const [fairness, setFairness] = useState(initial?.fairnessThreshold ?? (model.fairnessScore || 80));
  const [drift, setDrift] = useState(initial?.driftThreshold ?? 5);
  const [channels, setChannels] = useState(initial?.channels ?? { email: true, slack: false, pagerduty: false });
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
                <button onClick={() => onTest(ch)} style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 8px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
                  Test
                </button>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid hsl(var(--border))' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '8px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}>Cancel</button>
            <button onClick={() => onSave({ modelId: model.id, fairnessThreshold: fairness, driftThreshold: drift, channels })} style={{ flex: 1, padding: '8px', background: 'hsl(var(--brand))', border: 'none', cursor: 'pointer', color: 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 600 }}>
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */
// Data wrapper: resolve the real model by id (from ai_models) and gate on
// loading / not-found so the view below always gets a concrete model.
export default function ModelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { models: records, isLoading } = useModelsData();
  const model = useMemo(
    () => records.map(recordToModel).find(m => m.id === id) ?? null,
    [records, id],
  );

  if (isLoading) {
    return <div className="p-6 text-sm" style={{ color: 'hsl(var(--text-4))' }}>Loading model…</div>;
  }
  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" style={{ color: 'hsl(var(--text-4))' }}>
        <p className="text-base font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Model not found</p>
        <p className="text-sm mt-1">No model exists for id “{id}”. It may have been removed.</p>
        <Button className="mt-4" style={{ borderRadius: 0 }} onClick={() => navigate('/models/inventory')}>
          Back to Model Registry
        </Button>
      </div>
    );
  }
  return <ModelDetailView model={model} />;
}

function ModelDetailView({ model }: { model: Model }) {
  const navigate = useNavigate();
  const ct = useChartTheme();
  const [tab, setTab] = useState<Tab>('Model Card');
  const [showDriftModal, setShowDriftModal] = useState(false);

  // All per-model detail data is now backend-driven (model_documents /
  // model_activity / model_alert_configs) instead of hardcoded seed content.
  const actor = useAuthStore(s => s.user?.name || s.user?.email || 'You');
  const {
    documents, activity, alertConfig,
    addDocument, removeDocument, logActivity, saveAlertConfig,
  } = useModelDetailData(model.id);

  // Reverse interlink — this model's footprint across the Impact & Risk modules.
  const gov = useModelGovernance(model.id);

  // Reverse interlink — risks, incidents, HITL reviews, financial-risk
  // quantifications, security threats, red-team findings and arena runs
  // that reference this model (Risk & Security tab).
  const { data: backlinks, isLoading: backlinksLoading } = useModelBacklinks(model.id);

  // Reverse interlink — this model's runtime footprint across the Trust Engine
  // modules (fallbacks, tool calls, cost/tokens) and the prompt registry.
  const {
    summary: runtime,
    isLoading: runtimeLoading,
    error: runtimeError,
  } = useModelRuntimeSummary(model.id);

  /** "—" for not-measured; a real number is never invented from a missing row. */
  const num = (v: number | null | undefined) =>
    typeof v === 'number' ? v.toLocaleString() : '—';

  const runtimeRows = useMemo(() => [
    {
      label: 'Lifecycle Stage',
      to: `/models/lifecycle?model=${model.id}`,
      value: model.lifecyclePhase && model.lifecyclePhase !== '—' ? model.lifecyclePhase : '—',
    },
    {
      label: 'Prompts',
      to: `/prompt-registry?model=${model.id}`,
      value: num(runtime?.prompts),
    },
    {
      label: 'Cost & Tokens (30d)',
      to: `/trust-engine/costs?model=${model.id}`,
      value: runtime?.cost30d != null ? `$${runtime.cost30d.toFixed(2)}` : '—',
      note: runtime?.tokens30d != null ? `${runtime.tokens30d.toLocaleString()} tokens` : undefined,
    },
    {
      label: 'Fallback Failovers',
      to: `/trust-engine/fallback?model=${model.id}`,
      value: num(runtime?.fallbackEvents),
      note: runtime?.fallbackFailures ? `${runtime.fallbackFailures} failed` : undefined,
      tone: runtime?.fallbackFailures ? 'hsl(var(--s-er-tx))' : undefined,
    },
    {
      label: 'Tool Calls',
      to: `/trust-engine/tools?model=${model.id}`,
      value: num(runtime?.toolCalls),
      note: runtime?.toolCallErrors ? `${runtime.toolCallErrors} errored` : undefined,
      tone: runtime?.toolCallErrors ? 'hsl(var(--s-wn-tx))' : undefined,
    },
    {
      label: 'Test in Playground',
      to: `/ai-gateway/playground?model=${model.id}`,
      value: 'Open',
    },
  ] as { label: string; to: string; value: string; note?: string; tone?: string }[],
  [model.id, model.lifecyclePhase, runtime]);

  const [linkOpen, setLinkOpen] = useState(false);
  const [dForm, setDForm] = useState({ title: '', type: 'PDF', url: '', desc: '' });
  const linkDoc = () => {
    if (!dForm.title.trim() || !dForm.url.trim()) { toast.error('Title and document URL are required'); return; }
    const title = dForm.title.trim();
    addDocument({ modelId: model.id, title, docType: dForm.type, url: dForm.url.trim(), description: dForm.desc.trim() || undefined, createdBy: actor })
      .then(() => {
        logActivity({ modelId: model.id, event: `Linked document “${title}”`, actor, kind: 'info' }).catch(() => {});
        toast.success(`Linked “${title}” to ${model.id}`);
        setDForm({ title: '', type: 'PDF', url: '', desc: '' });
        setLinkOpen(false);
      })
      .catch(() => toast.error('Failed to link document'));
  };
  const removeDoc = (id: string, title: string) => {
    removeDocument(id)
      .then(() => { logActivity({ modelId: model.id, event: `Removed document “${title}”`, actor, kind: 'info' }).catch(() => {}); toast.success('Document removed'); })
      .catch(() => toast.error('Failed to remove document'));
  };

  const saveAlerts = (cfg: AlertConfig) => {
    saveAlertConfig(cfg)
      .then(() => {
        logActivity({ modelId: model.id, event: `Alert config updated (fairness ≥ ${cfg.fairnessThreshold}%, drift ≤ ${cfg.driftThreshold}%)`, actor, kind: 'info' }).catch(() => {});
        toast.success('Alert configuration saved');
        setShowDriftModal(false);
      })
      .catch(() => toast.error('Failed to save alert configuration'));
  };
  const testAlert = (channel: string) => {
    logActivity({ modelId: model.id, event: `Test alert dispatched via ${channel}`, actor, kind: 'info' }).catch(() => {});
    toast.success(`Test alert sent via ${channel}`);
  };

  const exportModelCard = () => {
    downloadJson(`model-card-${model.id}.json`, buildModelCard(model));
    logActivity({ modelId: model.id, event: 'Model Card exported (JSON)', actor, kind: 'info' }).catch(() => {});
    toast.success('Model Card exported');
  };
  const exportAnnexIV = () => {
    downloadJson(`annex-iv-${model.id}.json`, buildAnnexIV(model));
    logActivity({ modelId: model.id, event: 'EU AI Act Annex IV package exported (JSON)', actor, kind: 'info' }).catch(() => {});
    toast.success('Annex IV package exported');
  };
  const scheduleAudit = () => {
    logActivity({ modelId: model.id, event: 'Bias audit scheduled', actor, kind: 'info' })
      .then(() => toast.success('Bias audit scheduled — recorded in the activity log'))
      .catch(() => toast.error('Failed to schedule audit'));
  };

  // Real analytics — Performance / Bias / Explainability / Lineage are read live
  // from Supabase (model_performance_metrics, bias_audits, model_explanations,
  // model_dna), keyed by this model's registry id. Performance is push-updated
  // via a Realtime channel as the proxy writes telemetry.
  const { performance, bias: modelBiasAudits, explanation, lineage } = useModelAnalytics(model.id, model.name);
  const latestPerf = performance.length ? performance[performance.length - 1] : null;
  const perfChart = useMemo(() => performance.map(p => ({
    month: new Date(p.recordedAt).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    accuracy: Math.round(p.accuracy * 1000) / 10,
    latency: Math.round(p.latencyP99),
    drift: Math.round(p.driftScore * 10) / 10,
  })), [performance]);
  // Live latest values (fall back to the registry record when no telemetry yet).
  const accVal = latestPerf ? Math.round(latestPerf.accuracy * 1000) / 10 : model.accuracy;
  const latVal = latestPerf ? Math.round(latestPerf.latencyP99) : model.latencyMs;
  const volVal = latestPerf ? latestPerf.requestCount.toLocaleString() : model.monthlyInferences;

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

  // SHAP / LIME come from the computed explanation record (model_explanations).
  const shapFeatures = explanation?.shap ?? [];
  const limeFeatures = explanation?.lime ?? [];

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
                onClick={exportModelCard}
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

            {/* Governance — cross-links into the Impact & Risk (AIIA) modules */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} style={{ color: 'hsl(var(--brand))' }} />
                  Governance
                </CardTitle>
              </CardHeader>
              <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* EU AI Act risk classification */}
                <button
                  onClick={() => navigate(`/ai-risk-tiering?model=${model.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Scales size={14} style={{ color: 'hsl(var(--text-3))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>EU AI Act Risk Class</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {gov.riskClassification
                      ? <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--text-1))' }}>{gov.riskClassification.riskTier}</span>
                      : <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>Not classified</span>}
                    <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                  </span>
                </button>
                {/* Impact assessments */}
                <button
                  onClick={() => navigate(`/aiia?model=${model.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} style={{ color: 'hsl(var(--text-3))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>Impact Assessments</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: gov.impactAssessments.length ? 'hsl(var(--text-1))' : 'hsl(var(--text-4))' }}>{gov.impactAssessments.length}</span>
                    <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                  </span>
                </button>
                {/* MRC reviews */}
                <button
                  onClick={() => navigate(`/mrc?model=${model.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bank size={14} style={{ color: 'hsl(var(--text-3))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>Model Risk Committee</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: gov.mrcReviews.length ? 'hsl(var(--text-1))' : 'hsl(var(--text-4))' }}>{gov.mrcReviews.length} review{gov.mrcReviews.length === 1 ? '' : 's'}</span>
                    <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                  </span>
                </button>
                {/* Performance telemetry */}
                <button
                  onClick={() => navigate(`/performance-monitoring?model=${model.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Gauge size={14} style={{ color: 'hsl(var(--text-3))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>Performance Monitoring</span>
                  </span>
                  <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                </button>
                {/* Efficiency benchmarks */}
                <button
                  onClick={() => navigate(`/model-efficiency?model=${model.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChartLine size={14} style={{ color: 'hsl(var(--text-3))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>Efficiency Benchmarks</span>
                  </span>
                  <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                </button>
                {/* GenAI risk profiles */}
                <button
                  onClick={() => navigate(`/genai-risks?model=${model.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkle size={14} style={{ color: 'hsl(var(--text-3))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>GenAI Risk Profiles</span>
                  </span>
                  <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                </button>
                {/* Runtime trust policies & trace outcomes for this model */}
                <button
                  onClick={() => navigate(`/trust-engine?model=${model.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={14} style={{ color: 'hsl(var(--text-3))' }} />
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>Runtime Trust</span>
                  </span>
                  <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                </button>
              </CardContent>
            </Card>

            {/* Runtime & operations — each row carries this model's actual figure
                from the module behind it, so the record reports real state rather
                than just pointing at another page. Null renders as "—" (not
                measured); it is never shown as a zero. */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Gauge size={14} style={{ color: 'hsl(var(--brand))' }} />
                  Runtime &amp; Operations
                </CardTitle>
              </CardHeader>
              <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {runtimeError ? (
                  <p style={{ fontSize: 11, color: 'hsl(var(--s-er-tx))' }}>
                    Runtime figures unavailable: {runtimeError.message}
                  </p>
                ) : null}
                {runtimeRows.map(row => (
                  <button
                    key={row.to}
                    onClick={() => navigate(row.to)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>{row.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: row.tone ?? 'hsl(var(--text-1))' }}>
                        {runtimeLoading ? '…' : row.value}
                      </span>
                      {row.note && !runtimeLoading && (
                        <span style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>{row.note}</span>
                      )}
                      <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                    </span>
                  </button>
                ))}
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
                onClick={exportModelCard}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, fontWeight: 500 }}
              >
                <DownloadSimple size={14} /> Model Card (JSON)
              </button>
              <button
                onClick={exportAnnexIV}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, fontWeight: 500 }}
              >
                <Export size={14} /> EU AI Act Annex IV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          RISK & SECURITY TAB — reverse interlinks: every governance
          record across the platform that references this model.
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Risk & Security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', margin: 0 }}>
            Governance records across Sentinel that reference this model. Counts and items are read live
            from the risk, incident and security modules — follow a card to work in the source module.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <BacklinkCard
              title="Risk Register"
              icon={<Warning size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.risks}
              loading={backlinksLoading}
              viewAllTo={`/risks?model=${model.id}`}
            />
            <BacklinkCard
              title="Incidents"
              icon={<Siren size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.incidents}
              loading={backlinksLoading}
              viewAllTo={`/risk/incidents?model=${model.id}`}
            />
            <BacklinkCard
              title="HITL Reviews"
              icon={<UsersThree size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.hitlReviews}
              loading={backlinksLoading}
              viewAllTo="/hitl"
              itemTo={item => `/hitl/${item.id}`}
            />
            <BacklinkCard
              title="Financial Risk Quantification"
              icon={<CurrencyDollar size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.financialRisks}
              loading={backlinksLoading}
              viewAllTo="/financial-risk"
            />
            <BacklinkCard
              title="Security Threats"
              icon={<Shield size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.securityThreats}
              loading={backlinksLoading}
              viewAllTo={`/security/threats?model=${model.id}`}
            />
            <BacklinkCard
              title="Red Team Findings"
              icon={<Crosshair size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.redTeamFindings}
              loading={backlinksLoading}
              viewAllTo={`/red-team-findings?model=${model.id}`}
            />
            <BacklinkCard
              title="Model Arena"
              icon={<TestTube size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.arenaRuns}
              loading={backlinksLoading}
              viewAllTo={`/security/model-arena?model=${model.id}`}
            />
            <BacklinkCard
              title="Conformity Assessments"
              icon={<SealCheck size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.conformityAssessments}
              loading={backlinksLoading}
              viewAllTo="/conformity"
              itemTo={item => `/conformity?open=${item.id}`}
            />
            <BacklinkCard
              title="Evidence Vault"
              icon={<Vault size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.evidence}
              loading={backlinksLoading}
              viewAllTo={`/evidence-vault?model=${model.id}`}
            />
            <BacklinkCard
              title="Post-Market Monitoring"
              icon={<Pulse size={14} style={{ color: 'hsl(var(--brand))' }} />}
              source={backlinks?.postMarketPlans}
              loading={backlinksLoading}
              viewAllTo={`/post-market?model=${model.id}`}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PERFORMANCE TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {perfChart.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent style={{ padding: 48, textAlign: 'center' }}>
                <Gauge size={28} style={{ color: 'hsl(var(--text-4))', margin: '0 auto 12px' }} />
                <p style={{ color: 'hsl(var(--text-2))', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No telemetry yet</p>
                <p style={{ color: 'hsl(var(--text-4))', fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
                  Performance, latency and drift populate from live inference telemetry. Route this model through the Sentinel proxy (or POST rollups to the metrics ingestion endpoint) and this view updates in real time.
                </p>
              </CardContent>
            </Card>
          ) : (
          <>
          {/* KPI row — latest telemetry point */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KpiTile label="Accuracy" value={`${accVal}%`} color={accVal > 90 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))'} icon={<ChartLine size={16} />} />
            <KpiTile label="Latency p99" value={`${latVal}ms`} color={latVal < 200 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))'} icon={<Gauge size={16} />} />
            <KpiTile label="Drift Score" value={`${latestPerf ? latestPerf.driftScore.toFixed(1) : '0'}%`} color={(latestPerf?.driftScore ?? 0) > 5 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))'} icon={<Scales size={16} />} />
            <KpiTile label="Requests (latest)" value={volVal} color="hsl(var(--brand))" icon={<Robot size={16} />} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Accuracy Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={perfChart}>
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
                <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Latency p99 (ms) Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={perfChart}>
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

          {/* Feature drift over time — real drift_score telemetry */}
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>Feature Drift Score Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={perfChart}>
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
          </>
          )}
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
                  onClick={scheduleAudit}
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
                  onClick={scheduleAudit}
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
          {!explanation ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent style={{ padding: 48, textAlign: 'center' }}>
                <Sparkle size={28} style={{ color: 'hsl(var(--text-4))', margin: '0 auto 12px' }} />
                <p style={{ color: 'hsl(var(--text-2))', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No explanations computed</p>
                <p style={{ color: 'hsl(var(--text-4))', fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
                  SHAP/LIME attributions are produced by an offline explainability job per model version and stored for audit. Once computed for this model, they appear here — evidencing EU AI Act Article 13 transparency.
                </p>
              </CardContent>
            </Card>
          ) : (
          <>
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
                  SHAP (SHapley Additive exPlanations) — mean |SHAP| over {explanation.sampleSize?.toLocaleString() ?? '—'} samples · {explanation.method}
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
                  Perturbation-based local interpretability for a representative inference · {explanation.method}
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
                        left: f.impact >= 0 ? '50%' : `calc(50% - ${Math.abs(f.impact) * 80}px)`,
                        width: `${Math.abs(f.impact) * 80}px`,
                        background: f.impact >= 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                        opacity: 0.85,
                      }} />
                      {/* Centre baseline */}
                      <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'hsl(var(--border))' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: f.impact >= 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))', width: 52, textAlign: 'right', flexShrink: 0 }}>
                      {f.impact >= 0 ? '+' : ''}{(f.impact * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Explainability method badge — computed record */}
          <div style={{ padding: '12px 16px', background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sparkle size={16} style={{ color: 'hsl(var(--brand))' }} weight="fill" />
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--brand))' }}>Explainability: {explanation.method}{explanation.modelVersion ? ` · ${explanation.modelVersion}` : ''}</span>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>
                Computed {formatDate(explanation.computedAt)}{explanation.sampleSize ? ` over ${explanation.sampleSize.toLocaleString()} samples` : ''}. Evidences EU AI Act Article 13 transparency for high-risk model decisions.
              </p>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DATA LINEAGE TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Data Lineage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!lineage ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent style={{ padding: 48, textAlign: 'center' }}>
                <GitBranch size={28} style={{ color: 'hsl(var(--text-4))', margin: '0 auto 12px' }} />
                <p style={{ color: 'hsl(var(--text-2))', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No lineage recorded</p>
                <p style={{ color: 'hsl(var(--text-4))', fontSize: 13, maxWidth: 520, margin: '0 auto 16px' }}>
                  Lineage is sourced from this model's DNA & Provenance record. Register a DNA record to capture the source datasets, training method and the cryptographically-linked provenance chain.
                </p>
                <Button size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/models/dna')}>Open Model DNA</Button>
              </CardContent>
            </Card>
          ) : (
          <>
          {/* Provenance chain from the DNA record */}
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                <GitBranch size={14} style={{ color: 'hsl(var(--brand))' }} />
                Provenance Chain — {lineage.modelName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginBottom: 16 }}>
                Cryptographically-linked stages from source data through training to deployment, sourced from the model's DNA record.
              </p>
              <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
                {lineage.provenance.length === 0 && (
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-4))' }}>No provenance stages recorded on the DNA record.</p>
                )}
                {lineage.provenance.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ width: 150, padding: '10px 12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 3 }}>{p.stage}</p>
                      <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginBottom: 2 }}>{p.dataset}</p>
                      <p style={{ fontSize: 9, color: 'hsl(var(--text-4))' }}>{p.date} · {p.by}</p>
                      <p style={{ fontSize: 9, fontFamily: 'monospace', color: 'hsl(var(--brand))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.hash}</p>
                    </div>
                    {i < lineage.provenance.length - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                        <ArrowRight size={12} style={{ color: 'hsl(var(--brand))', opacity: 0.5 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lineage attributes from the DNA record + registry */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Framework', value: model.framework || 'Not recorded' },
              { label: 'Version', value: model.version || 'Not recorded' },
              { label: 'Base Model', value: lineage.baseModel || 'Not recorded' },
              { label: 'Training Dataset', value: lineage.trainingDataset || 'Not recorded' },
              { label: 'Training Method', value: lineage.trainingMethod || 'Not recorded' },
              { label: 'Fine-tuning', value: lineage.fineTuningMethod || 'Not recorded' },
              { label: 'Parameters', value: lineage.parametersCount ? lineage.parametersCount.toLocaleString() : 'Not recorded' },
              { label: 'Feature Count', value: lineage.featureCount != null ? String(lineage.featureCount) : 'Not recorded' },
              { label: 'Last Validated', value: model.lastValidated ? formatDate(model.lastValidated) : 'Not recorded' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 14px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{item.value}</p>
              </div>
            ))}
          </div>
          </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TECHNICAL DOCS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'Technical Docs' && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <CardTitle style={{ fontSize: 13, color: 'hsl(var(--text-1))', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} style={{ color: 'hsl(var(--brand))' }} />
                Technical Documentation <span style={{ fontSize: 11, color: 'hsl(var(--text-4))', fontWeight: 400 }}>· {documents.length} linked</span>
              </CardTitle>
              <Button size="sm" variant="outline" leftIcon={<Plus size={13} />} onClick={() => setLinkOpen(v => !v)}>Link Document</Button>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {linkOpen && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 8 }}>Link a document from your DMS / evidence store (SharePoint, S3, Confluence…). The registry references it — the file is not copied.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
                  <Input value={dForm.title} onChange={e => setDForm({ ...dForm, title: e.target.value })} placeholder="Document title *" style={{ borderRadius: 0 }} />
                  <Select value={dForm.type} onValueChange={v => setDForm({ ...dForm, type: v })}>
                    <SelectTrigger style={{ height: 36, borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['PDF', 'HTML', 'MD', 'DOCX', 'XLSX', 'JSON', 'ZIP', 'LINK'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input value={dForm.url} onChange={e => setDForm({ ...dForm, url: e.target.value })} placeholder="Document URL / reference *" style={{ borderRadius: 0, marginBottom: 8 }} />
                <Input value={dForm.desc} onChange={e => setDForm({ ...dForm, desc: e.target.value })} placeholder="Short description (optional)" style={{ borderRadius: 0, marginBottom: 8 }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button size="sm" variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={linkDoc}>Link Document</Button>
                </div>
              </div>
            )}
            {documents.length === 0 && !linkOpen && (
              <div style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--text-4))' }}>
                <FileText size={26} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13 }}>No documents linked yet. Use “Link Document” to reference an artifact from your DMS / evidence store.</p>
              </div>
            )}
            {documents.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ width: 40, height: 40, background: 'hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'hsl(var(--brand))', flexShrink: 0, letterSpacing: '0.05em' }}>
                  {doc.docType}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', marginBottom: 2 }}>{doc.title}</p>
                  {doc.description && <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{doc.description}</p>}
                  <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 2 }}>Linked {formatDate(doc.createdAt)}{doc.createdBy ? ` · ${doc.createdBy}` : ''}</p>
                </div>
                <button
                  onClick={() => window.open(doc.url, '_blank', 'noopener')}
                  style={{ padding: '6px 12px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                >
                  <DownloadSimple size={13} /> Open
                </button>
                <button
                  onClick={() => removeDoc(doc.id, doc.title)}
                  title="Remove document"
                  aria-label={`Remove ${doc.title}`}
                  style={{ padding: '6px 8px', background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-4))', display: 'flex', alignItems: 'center' }}
                >
                  <X size={13} />
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
                {activity.length} event{activity.length === 1 ? '' : 's'}
              </span>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {activity.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--text-4))' }}>
                <ListBullets size={26} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13 }}>No activity recorded yet. Governance actions — alert changes, document links, scheduled audits and exports — are logged here.</p>
              </div>
            ) : (
              activity.map((item, i, arr) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingTop: 4 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: item.kind === 'success' ? 'hsl(var(--s-ok-tx))' : item.kind === 'error' ? 'hsl(var(--s-er-tx))' : item.kind === 'warning' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--brand))',
                    }} />
                    {i < arr.length - 1 && <div style={{ width: 1, flexGrow: 1, background: 'hsl(var(--border))', minHeight: 24, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <p style={{ fontSize: 13, color: 'hsl(var(--text-1))', lineHeight: 1.4 }}>{item.event}</p>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 3 }}>
                      <span style={{ fontWeight: 500 }}>{item.actor ?? 'System'}</span> · {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {showDriftModal && <DriftAlertModal model={model} initial={alertConfig} onClose={() => setShowDriftModal(false)} onSave={saveAlerts} onTest={testAlert} />}
    </div>
  );
}
