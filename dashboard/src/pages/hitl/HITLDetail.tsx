import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, Brain, Clock, Warning, CheckCircle, User, CalendarBlank,
  Pulse, Shield, ListChecks, ChatText, X, ArrowUp, Robot, Flag,
  ClipboardText, Eye, TrendUp, FileText,
} from '@phosphor-icons/react';
import {
  HITL_REVIEWS, MODELS, RISKS, USERS, severityColor, statusColor, formatDate,
} from '../../data/seed';
import { useChartTheme } from '../../hooks/useChartTheme';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Cell,
  PolarAngleAxis,
} from 'recharts';

// ── helpers ────────────────────────────────────────────────────────────────

function riskBarColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  return '#10b981';
}

function slaColor(sla: string): string {
  const l = sla.toLowerCase();
  if (l === 'overdue') return '#ef4444';
  if (l === 'completed') return '#10b981';
  const h = parseInt((sla.match(/(\d+)h/) || [])[1] || '99');
  if (h <= 4) return '#ef4444';
  if (h <= 12) return '#f97316';
  return 'hsl(var(--text-2))';
}

// ── mock data ──────────────────────────────────────────────────────────────

const DECISION_ENTRIES = [
  {
    id: 'DH-001',
    date: '2026-03-31T09:15:00Z',
    action: 'Review Opened',
    actor: 'System',
    outcome: 'Automated trigger — bias threshold exceeded',
    type: 'auto',
    actorRole: 'Automated Pipeline',
  },
  {
    id: 'DH-002',
    date: '2026-03-31T10:30:00Z',
    action: 'Assigned to Reviewer',
    actor: 'Sarah Chen',
    outcome: 'Review assigned based on model risk tier and availability',
    type: 'auto',
    actorRole: 'CISO',
  },
  {
    id: 'DH-003',
    date: '2026-03-31T14:00:00Z',
    action: 'Evidence Package Reviewed',
    actor: 'Reviewer',
    outcome: 'Bias metrics, fairness reports, and incident history reviewed. Awaiting final decision.',
    type: 'manual',
    actorRole: 'Human Reviewer',
  },
];

// ── component ──────────────────────────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
  const ct = useChartTheme();
  const color = riskBarColor(score);
  const data = [{ value: score }];
  return (
    <div style={{ position: 'relative', width: 160, height: 100, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="100%"
          innerRadius="60%"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
          data={data}
          barSize={16}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" cornerRadius={0} background={{ fill: 'hsl(var(--bg-muted))' }}>
            <Cell fill={color} />
          </RadialBar>
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        lineHeight: 1,
      }}>
        <div style={{ fontSize: 26, fontWeight: 700, color }}>{score}</div>
        <div style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 2 }}>/ 100</div>
      </div>
    </div>
  );
}

export default function HITLDetail() {
  const { id } = useParams<{ id: string }>();
  const review = HITL_REVIEWS.find(r => r.id === id);
  const model = review ? MODELS.find(m => m.id === review.modelId) : null;
  const linkedRisks = review
    ? RISKS.filter(r => r.linkedModel === review.modelId)
    : [];
  const [actionState, setActionState] = useState<'idle' | 'approved' | 'rejected' | 'escalated'>('idle');

  if (!review) {
    return (
      <div className="p-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <Link to="/hitl">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
            <ArrowLeft size={14} className="mr-1" /> Back to HITL Reviews
          </Button>
        </Link>
        <div className="flex flex-col items-center justify-center py-24">
          <Warning size={48} style={{ color: 'hsl(var(--text-3))' }} />
          <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Review Not Found</p>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>No HITL review with ID: {id}</p>
        </div>
      </div>
    );
  }

  const sc = severityColor(review.priority);
  const statc = statusColor(review.status);
  const isOverdue = review.sla.toLowerCase() === 'overdue';
  const isCompleted = review.status === 'approved' || actionState !== 'idle';

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Back */}
      <Link to="/hitl">
        <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} className="mr-1" /> Back to HITL Reviews
        </Button>
      </Link>

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{review.id}</span>
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
              {review.priority.toUpperCase()} PRIORITY
            </Badge>
            <Badge style={{ background: statc.bg, color: statc.text, border: `1px solid ${statc.border}`, borderRadius: 0, fontSize: 10 }}>
              {review.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            {isOverdue && (
              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 0, fontSize: 10 }}>
                <Warning size={10} className="mr-0.5" /> OVERDUE
              </Badge>
            )}
            {actionState !== 'idle' && (
              <Badge style={{
                background: actionState === 'approved' ? 'hsl(var(--s-ok-bg))' : actionState === 'rejected' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))',
                color: actionState === 'approved' ? 'hsl(var(--s-ok-tx))' : actionState === 'rejected' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))',
                border: '1px solid transparent',
                borderRadius: 0,
                fontSize: 10,
              }}>
                ACTION: {actionState.toUpperCase()}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            {review.type} — {review.modelName}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>{review.description}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            disabled={actionState !== 'idle'}
            onClick={() => setActionState('approved')}
            style={{ borderRadius: 0, color: '#10b981', borderColor: '#10b98140', gap: 6 }}
          >
            <CheckCircle size={14} /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={actionState !== 'idle'}
            onClick={() => setActionState('rejected')}
            style={{ borderRadius: 0, color: '#ef4444', borderColor: '#ef444440', gap: 6 }}
          >
            <X size={14} /> Reject
          </Button>
          <Button
            size="sm"
            disabled={actionState !== 'idle'}
            onClick={() => setActionState('escalated')}
            style={{ borderRadius: 0, background: '#f97316', color: '#fff', gap: 6 }}
          >
            <ArrowUp size={14} /> Escalate
          </Button>
        </div>
      </div>

      {/* SLA Banner */}
      <div className="p-3 flex items-center gap-3" style={{
        background: isOverdue ? 'hsl(var(--s-er-bg))' : 'hsl(var(--bg-muted))',
        border: `1px solid ${isOverdue ? '#ef444440' : 'hsl(var(--border))'}`,
      }}>
        <Clock size={16} style={{ color: slaColor(review.sla), flexShrink: 0 }} />
        <span className="text-sm font-semibold" style={{ color: slaColor(review.sla) }}>
          SLA: {review.sla}
        </span>
        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          · Created {formatDate(review.createdDate)}
        </span>
        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          · Trigger: {review.trigger}
        </span>
        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          · Assignee: {review.assignee}
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Risk Score', value: review.riskScore, color: riskBarColor(review.riskScore), icon: Warning, suffix: '/100' },
          { label: 'Model ID', value: review.modelId, color: 'hsl(var(--brand))', icon: Brain, suffix: '' },
          { label: 'Assignee', value: review.assignee.split(' ')[0], color: '#6366f1', icon: User, suffix: '' },
          { label: 'Review Type', value: review.type.split(' ').map(w => w[0]).join(''), color: '#06b6d4', icon: ListChecks, suffix: '' },
        ].map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}<span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{s.suffix}</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>
            <Eye size={13} className="mr-1.5" />Overview
          </TabsTrigger>
          <TabsTrigger value="decisions" style={{ borderRadius: 0 }}>
            <ClipboardText size={13} className="mr-1.5" />Decision History
          </TabsTrigger>
          <TabsTrigger value="risk" style={{ borderRadius: 0 }}>
            <Shield size={13} className="mr-1.5" />Risk Assessment
          </TabsTrigger>
          <TabsTrigger value="activity" style={{ borderRadius: 0 }}>
            <Pulse size={13} className="mr-1.5" />Activity
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Review details card */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <ListChecks size={14} style={{ color: 'hsl(var(--brand))' }} />
                  Review Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {[
                  { label: 'Review ID', value: review.id },
                  { label: 'Review Type', value: review.type },
                  { label: 'Trigger', value: review.trigger },
                  { label: 'Priority', value: review.priority },
                  { label: 'Status', value: review.status.replace(/_/g, ' ') },
                  { label: 'SLA', value: review.sla },
                  { label: 'Assignee', value: review.assignee },
                  { label: 'Created', value: formatDate(review.createdDate) },
                ].map((r, i, arr) => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Linked model card */}
            {model ? (
              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                    <Brain size={14} style={{ color: '#6366f1' }} />
                    Linked Model — {model.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {[
                    { label: 'Model Name', value: model.name },
                    { label: 'Version', value: model.version },
                    { label: 'Status', value: model.status },
                    { label: 'Risk Tier', value: model.riskTier },
                    { label: 'Fairness Score', value: model.fairnessScore + '%' },
                    { label: 'Drift Status', value: model.driftStatus },
                    { label: 'Department', value: model.department },
                    { label: 'Last Validated', value: formatDate(model.lastValidated) },
                  ].map((r, i, arr) => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="flex items-center justify-center h-48 flex-col gap-2">
                  <Robot size={32} style={{ color: 'hsl(var(--text-4))' }} />
                  <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No linked model</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Model bias metrics */}
          {model && model.biasMetrics.length > 0 && (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <TrendUp size={14} style={{ color: '#f97316' }} />
                  Bias Metrics — {model.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {model.biasMetrics.map(bm => (
                    <div key={bm.metric}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'hsl(var(--text-2))' }}>{bm.metric}</span>
                        <span style={{ color: bm.status === 'Pass' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {bm.value} {bm.status === 'Pass' ? '✓' : '✗'}
                        </span>
                      </div>
                      <div style={{ background: 'hsl(var(--bg-muted))', height: 6, position: 'relative' }}>
                        <div style={{
                          width: `${bm.value * 100}%`,
                          height: '100%',
                          background: bm.status === 'Pass' ? '#10b981' : '#ef4444',
                          transition: 'width 0.3s',
                        }} />
                        {/* threshold line */}
                        <div style={{
                          position: 'absolute',
                          left: `${bm.threshold * 100}%`,
                          top: -3,
                          bottom: -3,
                          width: 2,
                          background: 'hsl(var(--text-3))',
                        }} />
                      </div>
                      <div className="flex justify-between text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                        <span>0</span>
                        <span>threshold: {bm.threshold}</span>
                        <span>1.0</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Decision History ──────────────────────────────────────────── */}
        <TabsContent value="decisions" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                <ClipboardText size={14} style={{ color: 'hsl(var(--brand))' }} />
                Decision History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {DECISION_ENTRIES.map((d, i) => (
                  <div key={d.id} className="flex items-start gap-4 py-4" style={{ borderBottom: i < DECISION_ENTRIES.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center mt-1">
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: d.type === 'manual' ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                        flexShrink: 0,
                      }} />
                      {i < DECISION_ENTRIES.length - 1 && (
                        <div style={{ width: 1, flexGrow: 1, minHeight: 24, background: 'hsl(var(--border))', marginTop: 4 }} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{d.action}</p>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>
                          {new Date(d.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>{d.outcome}</p>
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'hsl(var(--bg-muted))',
                          border: '1px solid hsl(var(--border))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: 'hsl(var(--text-2))',
                        }}>
                          {d.actor === 'System' ? 'SY' : d.actor === 'Reviewer' ? 'RV' : d.actor.split(' ').map(x => x[0]).join('')}
                        </div>
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{d.actor}</span>
                          <span className="text-xs ml-2" style={{ color: 'hsl(var(--text-4))' }}>{d.actorRole}</span>
                        </div>
                        <Badge style={{
                          fontSize: 9,
                          borderRadius: 0,
                          background: d.type === 'manual' ? 'hsl(var(--bg-muted))' : 'hsl(var(--bg-sunken))',
                          color: d.type === 'manual' ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                          border: '1px solid hsl(var(--border))',
                          marginLeft: 'auto',
                        }}>
                          {d.type === 'manual' ? 'Human Decision' : 'Automated'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Current action result if any */}
                {actionState !== 'idle' && (
                  <div className="flex items-start gap-4 py-4">
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                      background: actionState === 'approved' ? '#10b981' : actionState === 'rejected' ? '#ef4444' : '#f97316',
                    }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                          Review {actionState.charAt(0).toUpperCase() + actionState.slice(1)}
                        </p>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>Just now</span>
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                        Decision recorded. Audit log updated.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Risk Assessment ───────────────────────────────────────────── */}
        <TabsContent value="risk" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Gauge card */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Shield size={14} style={{ color: riskBarColor(review.riskScore) }} />
                  Risk Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskGauge score={review.riskScore} />
                <div className="flex justify-between text-xs mt-4" style={{ color: 'hsl(var(--text-4))' }}>
                  <span style={{ color: '#10b981' }}>Low (0–59)</span>
                  <span style={{ color: '#f97316' }}>Medium (60–79)</span>
                  <span style={{ color: '#ef4444' }}>High (80+)</span>
                </div>

                {/* Risk factors */}
                <div className="mt-4 space-y-3">
                  {[
                    { factor: 'Bias / Fairness Violation', score: review.priority === 'critical' ? 92 : review.priority === 'high' ? 74 : 48 },
                    { factor: 'Model Performance Risk', score: Math.max(0, review.riskScore - 8) },
                    { factor: 'Regulatory Compliance Gap', score: review.priority === 'critical' || review.priority === 'high' ? 78 : 42 },
                    { factor: 'Data Quality Issues', score: Math.round(review.riskScore * 0.68) },
                  ].map(f => (
                    <div key={f.factor}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'hsl(var(--text-2))' }}>{f.factor}</span>
                        <span style={{ color: riskBarColor(f.score), fontWeight: 600 }}>{f.score}</span>
                      </div>
                      <div style={{ background: 'hsl(var(--bg-muted))', height: 5 }}>
                        <div style={{ width: `${f.score}%`, height: '100%', background: riskBarColor(f.score), transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Linked risks */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Flag size={14} style={{ color: '#f97316' }} />
                  Linked Risks
                  <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-2))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10, marginLeft: 'auto' }}>
                    {linkedRisks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkedRisks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Shield size={28} style={{ color: 'hsl(var(--text-4))' }} />
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No linked risks for this model</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedRisks.map(risk => {
                      const rc = severityColor(risk.severity);
                      return (
                        <div key={risk.id} className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{risk.id}</span>
                            <Badge style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, borderRadius: 0, fontSize: 9 }}>
                              {risk.severity}
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold mb-0.5" style={{ color: 'hsl(var(--text-1))' }}>{risk.title}</p>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{risk.description.slice(0, 80)}…</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Score: {risk.score}</span>
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Owner: {risk.owner.split(' ')[0]}</span>
                            <Badge style={{ background: statusColor(risk.status).bg, color: statusColor(risk.status).text, border: 'none', borderRadius: 0, fontSize: 9 }}>
                              {risk.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Activity ──────────────────────────────────────────────────── */}
        <TabsContent value="activity" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                <Pulse size={14} style={{ color: 'hsl(var(--brand))' }} />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {[
                  { ts: '2026-03-31T07:00:00Z', action: 'Bias threshold exceeded on gender dimension', actor: 'Automated Monitor', icon: Warning, color: '#ef4444' },
                  { ts: '2026-03-31T07:01:00Z', action: `HITL review ${review.id} automatically created`, actor: 'Pipeline Orchestrator', icon: Robot, color: 'hsl(var(--text-3))' },
                  { ts: '2026-03-31T07:05:00Z', action: `SLA set to ${review.sla} based on ${review.priority} priority`, actor: 'SLA Engine', icon: Clock, color: '#f97316' },
                  { ts: '2026-03-31T07:06:00Z', action: `Review assigned to ${review.assignee}`, actor: 'Assignment Engine', icon: User, color: '#6366f1' },
                  { ts: '2026-03-31T09:15:00Z', action: 'Bias evidence package attached (2.4 MB)', actor: 'Evidence Collector', icon: FileText, color: '#06b6d4' },
                  { ts: '2026-03-31T10:30:00Z', action: 'Email notification sent to reviewer', actor: 'Notification Service', icon: ChatText, color: 'hsl(var(--text-3))' },
                  { ts: '2026-03-31T14:00:00Z', action: 'Reviewer opened evidence package', actor: review.assignee, icon: Eye, color: 'hsl(var(--brand))' },
                  { ts: '2026-03-31T14:45:00Z', action: 'Risk score recalculated: 91 → ' + review.riskScore, actor: 'Risk Engine', icon: TrendUp, color: riskBarColor(review.riskScore) },
                  ...(actionState !== 'idle' ? [{
                    ts: new Date().toISOString(),
                    action: `Review ${actionState} by current user`,
                    actor: 'You',
                    icon: actionState === 'approved' ? CheckCircle : actionState === 'rejected' ? X : ArrowUp,
                    color: actionState === 'approved' ? '#10b981' : actionState === 'rejected' ? '#ef4444' : '#f97316',
                  }] : []),
                ].map((a, i, arr) => (
                  <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'hsl(var(--bg-muted))',
                      border: '1px solid hsl(var(--border))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <a.icon size={13} style={{ color: a.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.action}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{a.actor}</span>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>·</span>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                          {new Date(a.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
