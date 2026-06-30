import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Warning, TrendUp, TrendDown, Minus, Shield, Brain,
  Fire, CheckCircle, Clock, User, CalendarBlank, Tag,
  ArrowsClockwise, PencilSimple, FloppyDisk, X,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  RISKS, INCIDENTS, CONTROLS, BIAS_AUDITS, MODELS, AUDIT_LOG,
  severityColor, statusColor, formatDate, Risk, RiskStatus,
} from '../../data/seed';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Per-risk extended metadata ────────────────────────────────────────────────

const RISK_FRAMEWORKS: Record<string, { framework: string; clause: string; requirement: string }[]> = {
  'RSK-001': [
    { framework: 'EU AI Act', clause: 'Art. 10', requirement: 'Training data must not include unlawful discriminatory proxies.' },
    { framework: 'NIST AI RMF', clause: 'MEASURE 2.6', requirement: 'Bias evaluation and mitigation for protected attributes.' },
    { framework: 'EEOC', clause: 'Disparate Impact', requirement: 'AI systems used in credit decisions must demonstrate no disparate impact.' },
  ],
  'RSK-002': [
    { framework: 'EU AI Act', clause: 'Art. 13', requirement: 'LLM outputs must be traceable and explainable.' },
    { framework: 'NIST AI RMF', clause: 'MANAGE 2.2', requirement: 'Hallucination risks must be documented and monitored.' },
  ],
  'RSK-003': [
    { framework: 'GDPR', clause: 'Art. 6', requirement: 'Lawful basis required for AI processing of personal data.' },
    { framework: 'GDPR', clause: 'Art. 13', requirement: 'Transparency obligations for automated data processing.' },
  ],
  'RSK-004': [
    { framework: 'GDPR', clause: 'Art. 28', requirement: 'Data Processing Agreements required for all processors.' },
    { framework: 'EU AI Act', clause: 'Art. 25', requirement: 'Obligations for deployers using third-party AI providers.' },
  ],
  'RSK-005': [
    { framework: 'NIST AI RMF', clause: 'MANAGE 4.1', requirement: 'AI system performance must meet defined SLA thresholds.' },
    { framework: 'SOC 2', clause: 'A1.1', requirement: 'Availability commitments must be monitored and met.' },
  ],
  'RSK-006': [
    { framework: 'ISO 27001', clause: 'A.9.1', requirement: 'Access control policy must cover all AI systems.' },
    { framework: 'NIST AI RMF', clause: 'GOVERN 1.7', requirement: 'Unauthorized AI deployments must be detected and managed.' },
  ],
  'RSK-007': [
    { framework: 'EU AI Act', clause: 'Art. 11', requirement: 'Technical documentation must be maintained for all high-risk AI systems.' },
    { framework: 'ISO 42001', clause: 'Clause 8.4', requirement: 'AI system documentation must be comprehensive and current.' },
  ],
};

const RISK_TREATMENT: Record<string, { approach: string; targetDate: string; assignee: string; progress: number }> = {
  'RSK-001': { approach: 'Modify', targetDate: '2026-06-01', assignee: 'Raj Gupta', progress: 35 },
  'RSK-002': { approach: 'Modify', targetDate: '2026-05-15', assignee: 'Raj Gupta', progress: 20 },
  'RSK-003': { approach: 'Mitigate', targetDate: '2026-04-30', assignee: 'James Patel', progress: 50 },
  'RSK-004': { approach: 'Transfer', targetDate: '2026-05-01', assignee: 'James Patel', progress: 15 },
  'RSK-005': { approach: 'Accept', targetDate: '2026-06-30', assignee: 'David Kim', progress: 90 },
  'RSK-006': { approach: 'Avoid', targetDate: '2026-04-20', assignee: 'Sarah Chen', progress: 60 },
  'RSK-007': { approach: 'Mitigate', targetDate: '2026-05-30', assignee: 'Emma Wilson', progress: 40 },
};

const RISK_ACTIVITY: Record<string, { date: string; actor: string; action: string; type: 'info' | 'warning' | 'error' | 'success' }[]> = {
  'RSK-001': [
    { date: '2026-03-20', actor: 'Raj Gupta', action: 'Mitigation task "Retrain with debiased data" marked In Progress.', type: 'info' },
    { date: '2026-03-15', actor: 'Sarah Chen', action: 'Risk reviewed in quarterly GRC board meeting. Severity maintained at Critical.', type: 'warning' },
    { date: '2026-02-10', actor: 'James Patel', action: 'Owner reassigned from Emma Wilson to Raj Gupta.', type: 'info' },
    { date: '2026-01-22', actor: 'Maria Santos', action: 'Bias audit BA-001 initiated. Risk trending updated to Stable.', type: 'success' },
    { date: '2025-11-15', actor: 'System', action: 'Risk RSK-001 created from bias screening during model onboarding.', type: 'info' },
  ],
  'RSK-002': [
    { date: '2026-03-15', actor: 'Raj Gupta', action: 'RAG pipeline implementation started. Progress updated to 20%.', type: 'info' },
    { date: '2026-02-20', actor: 'Sarah Chen', action: 'Risk trending changed from STABLE to UP after production incident INC-004.', type: 'error' },
    { date: '2026-01-15', actor: 'Emma Wilson', action: 'Hallucination guardrail vendor evaluation completed.', type: 'info' },
    { date: '2026-01-05', actor: 'System', action: 'Risk RSK-002 created from HITL review escalation.', type: 'info' },
  ],
  'RSK-006': [
    { date: '2026-03-31', actor: 'System', action: 'Active API traffic detected from shadow agent — 560 calls in last 24h.', type: 'error' },
    { date: '2026-03-25', actor: 'Sarah Chen', action: 'Unauthorized data transfer detected. Risk score updated to 16.', type: 'error' },
    { date: '2026-03-20', actor: 'Sarah Chen', action: 'Network segmentation controls implemented. Progress updated to 60%.', type: 'success' },
    { date: '2026-03-05', actor: 'System', action: 'Risk RSK-006 created from agent discovery network scan.', type: 'warning' },
  ],
};

const DEFAULT_ACTIVITY = [
  { date: '2026-03-25', actor: 'System', action: 'Risk score recalculated after mitigation progress update.', type: 'info' as const },
  { date: '2026-03-15', actor: 'Sarah Chen', action: 'Risk reviewed in quarterly GRC board meeting.', type: 'info' as const },
  { date: '2026-02-10', actor: 'James Patel', action: 'Treatment plan reviewed and updated.', type: 'info' as const },
  { date: '2026-01-20', actor: 'System', action: 'Automated risk scan completed. No change in score.', type: 'info' as const },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function RiskHeatCell({ likelihood, impact }: { likelihood: number; impact: number }) {
  const score = likelihood * impact;
  const color = score >= 15 ? 'hsl(var(--s-er-tx))' : score >= 8 ? 'hsl(var(--r-hi-tx))' : score >= 4 ? '#eab308' : 'hsl(var(--s-ok-tx))';
  return (
    <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 28px)', gap: 3 }}>
        {Array.from({ length: 25 }, (_, i) => {
          const row = 4 - Math.floor(i / 5);
          const col = i % 5;
          const cellScore = (row + 1) * (col + 1);
          const cellColor = cellScore >= 15 ? 'hsl(var(--s-er-br))' : cellScore >= 8 ? 'hsl(var(--r-hi-br))' : cellScore >= 4 ? '#eab30840' : 'hsl(var(--s-ok-br))';
          const isActive = row < likelihood && col < impact;
          const isHighlight = row === likelihood - 1 && col === impact - 1;
          return (
            <div key={i} style={{
              width: 28, height: 28,
              background: isActive ? cellColor : 'hsl(var(--bg-muted))',
              border: isHighlight ? `2px solid ${color}` : '1px solid hsl(var(--border))',
            }} />
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 4 }}>
        Likelihood × Impact Heat Map
      </div>
    </div>
  );
}

function MitigationItem({ text, index, total }: { text: string; index: number; total: number }) {
  const done = index < Math.floor(total * 0.4);
  const inProg = !done && index < Math.floor(total * 0.65);
  const color = done ? 'hsl(var(--s-ok-tx))' : inProg ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--text-3))';
  const label = done ? 'Done' : inProg ? 'In Progress' : 'Pending';
  const Icon = done ? CheckCircle : inProg ? ArrowsClockwise : Clock;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
      <Icon size={15} style={{ color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'hsl(var(--text-1))', flex: 1 }}>{text}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color, border: `1px solid ${color}40`, padding: '2px 8px', background: `${color}15` }}>{label}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RiskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();

  const risk = RISKS.find(r => r.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Risk>>({});

  if (!risk) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, }}>
        <Warning size={48} style={{ color: 'hsl(var(--r-hi-tx))' }} />
        <p style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: 'hsl(var(--text-1))' }}>Risk not found</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', marginTop: 4 }}>Risk ID "{id}" does not exist in the register.</p>
        <Button style={{ marginTop: 16, borderRadius: 0 }} onClick={() => navigate('/risk')}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Risk Register
        </Button>
      </div>
    );
  }

  const sc = severityColor(risk.severity);
  const stc = statusColor(risk.status);
  const scoreColor = risk.score >= 15 ? 'hsl(var(--s-er-tx))' : risk.score >= 8 ? 'hsl(var(--r-hi-tx))' : risk.score >= 4 ? '#eab308' : 'hsl(var(--s-ok-tx))';
  const linkedModel = risk.linkedModel ? MODELS.find(m => m.id === risk.linkedModel) : null;

  const relatedIncidents = INCIDENTS.filter(i =>
    (risk.linkedModel && i.linkedModel === risk.linkedModel) ||
    i.category.toLowerCase().includes(risk.category.toLowerCase().split('/')[0])
  ).slice(0, 4);

  const relatedControls = CONTROLS.filter(c => {
    if (risk.category === 'AI/ML') return c.framework === 'NIST AI RMF' || c.framework === 'EU AI Act';
    if (risk.category === 'Compliance') return c.framework === 'GDPR' || c.framework === 'EU AI Act';
    if (risk.category === 'Security') return c.framework === 'ISO 27001' || c.framework === 'OWASP LLM';
    if (risk.category === 'Governance') return c.framework === 'ISO 42001' || c.framework === 'EU AI Act';
    return c.framework === 'EU AI Act';
  }).slice(0, 5);

  const relatedBiasAudits = BIAS_AUDITS.filter(b => risk.linkedModel && b.modelId === risk.linkedModel);
  const frameworks = RISK_FRAMEWORKS[risk.id] || RISK_FRAMEWORKS['RSK-007'] || [];
  const treatment = RISK_TREATMENT[risk.id] || { approach: 'Mitigate', targetDate: '2026-06-30', assignee: risk.owner, progress: 25 };
  const activity = RISK_ACTIVITY[risk.id] || DEFAULT_ACTIVITY;
  const auditEntries = AUDIT_LOG.filter(e =>
    e.action.toLowerCase().includes('risk') || e.action.toLowerCase().includes('model')
  ).slice(0, 5);

  const TrendIcon = risk.trending === 'up' ? TrendUp : risk.trending === 'down' ? TrendDown : Minus;
  const trendColor = risk.trending === 'up' ? 'hsl(var(--s-er-tx))' : risk.trending === 'down' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))';

  function openEdit() {
    setEditData({ ...risk });
    setEditOpen(true);
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader 
        title={risk.title}
        description={`${orgName} · Owner: ${risk.owner} · Last updated ${formatDate(risk.lastUpdated)}`}
        icon={Warning}
        actions={
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', fontFamily: 'monospace' }}>{risk.id}</span>
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{risk.severity.toUpperCase()}</Badge>
            <Badge style={{ background: stc.bg, color: stc.text, border: `1px solid ${stc.border}`, borderRadius: 0, fontSize: 10 }}>{risk.status.toUpperCase()}</Badge>
            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{risk.category}</Badge>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <TrendIcon size={13} style={{ color: trendColor }} />
              <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>{risk.trending.toUpperCase()}</span>
            </div>
            <Button style={{ borderRadius: 0 }} onClick={openEdit}>
              <PencilSimple size={14} style={{ marginRight: 6 }} /> Edit Risk
            </Button>
          </div>
        }
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Likelihood', value: `${risk.likelihood}/5`, sub: 'Probability of occurrence', color: scoreColor },
          { label: 'Impact', value: `${risk.impact}/5`, sub: 'Business impact severity', color: scoreColor },
          { label: 'Risk Score', value: risk.score, sub: 'Likelihood × Impact', color: scoreColor },
          { label: 'Treatment', value: treatment.approach, sub: `${treatment.progress}% progress`, color: 'hsl(var(--brand))' },
        ].map(kpi => (
          <Card key={kpi.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardContent style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 4 }}>{kpi.label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: kpi.color, margin: 0, lineHeight: 1 }}>{kpi.value}</p>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 4 }}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0, gap: 2 }}>
          {['overview', 'mitigation', 'incidents', 'controls', 'frameworks', 'activity'].map(t => (
            <TabsTrigger key={t} value={t} style={{ borderRadius: 0, textTransform: 'capitalize', fontSize: 13 }}>{t}</TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardHeader style={{ padding: '14px 16px 10px' }}>
                  <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Description</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0 16px 16px' }}>
                  <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.6 }}>{risk.description}</p>
                </CardContent>
              </Card>

              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardHeader style={{ padding: '14px 16px 10px' }}>
                  <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Risk Metadata</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0 16px 16px' }}>
                  {[
                    { label: 'Category', value: risk.category, icon: Tag },
                    { label: 'Owner', value: risk.owner, icon: User },
                    { label: 'Created', value: formatDate(risk.createdDate), icon: CalendarBlank },
                    { label: 'Last Updated', value: formatDate(risk.lastUpdated), icon: CalendarBlank },
                    { label: 'Treatment', value: treatment.approach, icon: Shield },
                    { label: 'Target Date', value: formatDate(treatment.targetDate), icon: Clock },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={13} style={{ color: 'hsl(var(--text-4))' }} />
                        <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 13, color: 'hsl(var(--text-1))', fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {linkedModel && (
                <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <CardHeader style={{ padding: '14px 16px 10px' }}>
                    <CardTitle style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Brain size={15} style={{ color: 'hsl(var(--brand))' }} /> Linked AI Model
                    </CardTitle>
                  </CardHeader>
                  <CardContent style={{ padding: '0 16px 16px' }}>
                    <div
                      onClick={() => navigate(`/models/${linkedModel.id}`)}
                      style={{ cursor: 'pointer', padding: '10px 12px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>{linkedModel.name}</p>
                        <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', margin: '2px 0 0 0' }}>{linkedModel.id} · {linkedModel.type} · {linkedModel.owner}</p>
                      </div>
                      <Badge style={{
                        background: linkedModel.status === 'production' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))',
                        color: linkedModel.status === 'production' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))',
                        border: `1px solid ${linkedModel.status === 'production' ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`,
                        borderRadius: 0, fontSize: 10,
                      }}>
                        {linkedModel.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardHeader style={{ padding: '14px 16px 10px' }}>
                  <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Risk Heat Map</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0 16px 20px', display: 'flex', justifyContent: 'center' }}>
                  <RiskHeatCell likelihood={risk.likelihood} impact={risk.impact} />
                </CardContent>
              </Card>

              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardHeader style={{ padding: '14px 16px 10px' }}>
                  <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Treatment Progress</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0 16px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'hsl(var(--text-2))' }}>{treatment.approach} — {treatment.assignee}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--brand))' }}>{treatment.progress}%</span>
                  </div>
                  <div style={{ height: 8, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                    <div style={{ width: `${treatment.progress}%`, height: '100%', background: treatment.progress >= 80 ? 'hsl(var(--s-ok-tx))' : treatment.progress >= 50 ? 'hsl(var(--brand))' : 'hsl(var(--r-hi-tx))' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>Target: {formatDate(treatment.targetDate)}</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>
                      {treatment.progress < 40 ? 'Behind schedule' : treatment.progress < 75 ? 'On track' : 'Near complete'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {relatedBiasAudits.length > 0 && (
                <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <CardHeader style={{ padding: '14px 16px 10px' }}>
                    <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Related Bias Audits</CardTitle>
                  </CardHeader>
                  <CardContent style={{ padding: '0 16px 16px' }}>
                    {relatedBiasAudits.map(ba => {
                      const bc = ba.result === 'passed' ? 'hsl(var(--s-ok-tx))' : ba.result === 'failed' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--r-hi-tx))';
                      return (
                        <div key={ba.id} style={{ padding: '8px 12px', border: `1px solid ${bc}30`, background: `${bc}08`, marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>{ba.id} — {ba.framework}</p>
                              <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', margin: '2px 0 0 0' }}>{formatDate(ba.date)} · {ba.auditor}</p>
                              <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', margin: '2px 0 0 0' }}>{ba.protectedAttributes.join(', ')}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: 22, fontWeight: 700, color: bc, margin: 0 }}>{Math.round(ba.overallScore * 100)}</p>
                              <p style={{ fontSize: 10, color: bc, fontWeight: 600, margin: 0 }}>{ba.result.toUpperCase()}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Mitigation ── */}
        <TabsContent value="mitigation" className="mt-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardHeader style={{ padding: '14px 16px 10px' }}>
                <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Mitigation Actions</CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {risk.mitigations.map((m, i) => (
                    <MitigationItem key={i} text={m} index={i} total={risk.mitigations.length} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardHeader style={{ padding: '14px 16px 10px' }}>
                  <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Treatment Plan</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0 16px 16px' }}>
                  {[
                    { label: 'Approach', value: treatment.approach },
                    { label: 'Responsible Owner', value: treatment.assignee },
                    { label: 'Target Completion', value: formatDate(treatment.targetDate) },
                    { label: 'Overall Progress', value: `${treatment.progress}%` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 6, background: 'hsl(var(--bg-muted))' }}>
                      <div style={{ width: `${treatment.progress}%`, height: '100%', background: treatment.progress >= 80 ? 'hsl(var(--s-ok-tx))' : treatment.progress >= 50 ? 'hsl(var(--brand))' : 'hsl(var(--r-hi-tx))' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardHeader style={{ padding: '14px 16px 10px' }}>
                  <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Mitigation Summary</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0 16px 16px' }}>
                  {(() => {
                    const done = Math.floor(risk.mitigations.length * 0.4);
                    const inProg = Math.floor(risk.mitigations.length * 0.25);
                    const pending = risk.mitigations.length - done - inProg;
                    return [
                      { label: 'Total Actions', value: risk.mitigations.length, color: 'hsl(var(--text-1))' },
                      { label: 'Completed', value: done, color: 'hsl(var(--s-ok-tx))' },
                      { label: 'In Progress', value: inProg, color: 'hsl(var(--r-hi-tx))' },
                      { label: 'Pending', value: pending, color: 'hsl(var(--text-3))' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                        <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{label}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Incidents ── */}
        <TabsContent value="incidents" className="mt-4">
          {relatedIncidents.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent style={{ padding: 40, textAlign: 'center' }}>
                <Fire size={40} style={{ color: 'hsl(var(--text-4))', opacity: 0.4, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'hsl(var(--text-3))' }}>No incidents linked to this risk.</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {relatedIncidents.map(inc => {
                const ic = severityColor(inc.severity);
                const isc = statusColor(inc.status);
                return (
                  <Card key={inc.id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <CardContent style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{inc.id}</span>
                            <Badge style={{ background: ic.bg, color: ic.text, border: `1px solid ${ic.border}`, borderRadius: 0, fontSize: 10 }}>{inc.severity}</Badge>
                            <Badge style={{ background: isc.bg, color: isc.text, border: `1px solid ${isc.border}`, borderRadius: 0, fontSize: 10 }}>{inc.status}</Badge>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>{inc.title}</p>
                          <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', marginTop: 4, lineHeight: 1.5 }}>{inc.description}</p>
                          <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 6 }}>
                            Reported {formatDate(inc.reportedDate)} by {inc.reporter} · Assigned to {inc.assignee}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Controls ── */}
        <TabsContent value="controls" className="mt-4">
          {relatedControls.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent style={{ padding: 40, textAlign: 'center' }}>
                <Shield size={40} style={{ color: 'hsl(var(--text-4))', opacity: 0.4, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'hsl(var(--text-3))' }}>No controls linked to this risk category.</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {relatedControls.map(ctrl => {
                const csc = statusColor(ctrl.status);
                const scoreC = ctrl.score >= 85 ? 'hsl(var(--s-ok-tx))' : ctrl.score >= 65 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))';
                return (
                  <Card
                    key={ctrl.id}
                    onClick={() => navigate(`/controls/${ctrl.id}`)}
                    style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, cursor: 'pointer' }}
                  >
                    <CardContent style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{ctrl.id}</span>
                            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{ctrl.framework} · {ctrl.clause}</Badge>
                            <Badge style={{ background: csc.bg, color: csc.text, border: `1px solid ${csc.border}`, borderRadius: 0, fontSize: 10 }}>{ctrl.status}</Badge>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>{ctrl.title}</p>
                          <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', marginTop: 3 }}>{ctrl.description}</p>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 16 }}>
                          <p style={{ fontSize: 24, fontWeight: 700, color: scoreC, margin: 0 }}>{ctrl.score}</p>
                          <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', margin: 0 }}>score</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Frameworks ── */}
        <TabsContent value="frameworks" className="mt-4">
          {frameworks.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent style={{ padding: 40, textAlign: 'center' }}>
                <Shield size={40} style={{ color: 'hsl(var(--text-4))', opacity: 0.4, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'hsl(var(--text-3))' }}>No framework mappings defined for this risk.</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {frameworks.map((fw, i) => (
                <Card key={i} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <CardContent style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: 'hsl(var(--brand-subtle, var(--bg-muted)))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Shield size={18} style={{ color: 'hsl(var(--brand))' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{fw.framework}</span>
                          <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-2))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{fw.clause}</Badge>
                        </div>
                        <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.5, margin: 0 }}>{fw.requirement}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Activity ── */}
        <TabsContent value="activity" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardHeader style={{ padding: '14px 16px 10px' }}>
              <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Risk Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 16px 16px' }}>
              {activity.map((evt, i) => {
                const evtColor = evt.type === 'error' ? 'hsl(var(--s-er-tx))' : evt.type === 'warning' ? 'hsl(var(--r-hi-tx))' : evt.type === 'success' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--brand))';
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 10, height: 10, marginTop: 4, flexShrink: 0, borderRadius: '50%', background: evtColor }} />
                      {i < activity.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 4, background: 'hsl(var(--border))' }} />}
                    </div>
                    <div style={{ paddingBottom: 4 }}>
                      <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', margin: 0 }}>{formatDate(evt.date)} · {evt.actor}</p>
                      <p style={{ fontSize: 13, color: 'hsl(var(--text-1))', lineHeight: 1.4, marginTop: 2 }}>{evt.action}</p>
                    </div>
                  </div>
                );
              })}

              {auditEntries.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid hsl(var(--border))' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 10 }}>System Audit Log</p>
                  {auditEntries.map(e => (
                    <div key={e.id} className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.action}</span>
                      <span className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>{e.actor}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15, fontWeight: 600 }}>Edit Risk — {risk.id}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
            {([
              { label: 'Title', key: 'title', type: 'text' },
              { label: 'Owner', key: 'owner', type: 'text' },
              { label: 'Likelihood (1–5)', key: 'likelihood', type: 'number' },
              { label: 'Impact (1–5)', key: 'impact', type: 'number' },
            ] as { label: string; key: keyof Risk; type: string }[]).map(({ label, key, type }) => (
              <div key={key as string}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  type={type}
                  value={(editData[key] ?? risk[key]) as string | number}
                  onChange={e => setEditData(prev => ({ ...prev, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>Status</label>
              <select
                value={(editData.status ?? risk.status) as string}
                onChange={e => setEditData(prev => ({ ...prev, status: e.target.value as RiskStatus }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, outline: 'none' }}
              >
                {(['open', 'mitigated', 'accepted', 'closed'] as RiskStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>Description</label>
              <textarea
                rows={3}
                value={(editData.description ?? risk.description) as string}
                onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setEditOpen(false)}>
              <X size={13} style={{ marginRight: 4 }} /> Cancel
            </Button>
            <Button style={{ borderRadius: 0 }} onClick={() => setEditOpen(false)}>
              <FloppyDisk size={13} style={{ marginRight: 4 }} /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
