import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, Brain, Clock, Warning, CheckCircle, User, CalendarBlank,
  Pulse, Shield, ListChecks, ChatText,
} from '@phosphor-icons/react';
import { HITL_REVIEWS, MODELS, severityColor, statusColor, formatDate } from '../../data/seed';

function riskBarColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  return '#10b981';
}

function slaColor(sla: string): string {
  if (sla.toLowerCase() === 'overdue') return '#ef4444';
  if (sla.toLowerCase() === 'completed') return '#10b981';
  const match = sla.match(/(\d+)h/);
  if (match) {
    const h = parseInt(match[1]);
    if (h <= 4) return '#ef4444';
    if (h <= 12) return '#f97316';
  }
  return 'hsl(var(--text-2))';
}

const DECISION_HISTORY = [
  { date: '2026-03-30', action: 'Review opened', actor: 'System', outcome: 'auto' },
  { date: '2026-03-30', action: 'Assigned to reviewer', actor: 'System', outcome: 'auto' },
  { date: '2026-03-31', action: 'Evidence reviewed', actor: 'Reviewer', outcome: 'manual' },
];

const ACTIVITY_LOG = [
  { timestamp: '2026-03-31T09:15:00Z', action: 'Risk assessment updated', actor: 'System' },
  { timestamp: '2026-03-31T10:30:00Z', action: 'SLA reminder sent', actor: 'System' },
  { timestamp: '2026-03-31T14:00:00Z', action: 'Reviewer opened detail page', actor: 'Reviewer' },
];

export default function HITLDetail() {
  const { id } = useParams<{ id: string }>();
  const review = HITL_REVIEWS.find(r => r.id === id);
  const model = review ? MODELS.find(m => m.id === review.modelId) : null;

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

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Back button */}
      <Link to="/hitl">
        <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} className="mr-1" /> Back to HITL Reviews
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{review.id}</span>
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
              {review.priority} priority
            </Badge>
            <Badge style={{ background: statc.bg, color: statc.text, border: `1px solid ${statc.border}`, borderRadius: 0 }}>
              {review.status.replace('_', ' ')}
            </Badge>
            {isOverdue && (
              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 0 }}>
                ⚠ Overdue
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            {review.type} — {review.modelName}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>{review.description}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" style={{ borderRadius: 0, color: '#10b981', borderColor: '#10b98144' }}>
            <CheckCircle size={14} className="mr-1" /> Approve
          </Button>
          <Button size="sm" style={{ background: '#ef4444', color: '#fff', borderRadius: 0 }}>
            Escalate
          </Button>
        </div>
      </div>

      {/* SLA Banner */}
      <div className="p-3 flex items-center gap-3" style={{
        background: isOverdue ? 'hsl(var(--s-er-bg))' : 'hsl(var(--bg-muted))',
        border: `1px solid ${isOverdue ? '#ef444444' : 'hsl(var(--border))'}`,
      }}>
        <Clock size={16} style={{ color: slaColor(review.sla) }} />
        <span className="text-sm font-semibold" style={{ color: slaColor(review.sla) }}>
          SLA: {review.sla}
        </span>
        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          · Created {formatDate(review.createdDate)} · Trigger: {review.trigger}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Risk Score', value: review.riskScore, color: riskBarColor(review.riskScore), icon: Warning },
          { label: 'Model ID', value: review.modelId, color: 'hsl(var(--brand))', icon: Brain },
          { label: 'Assignee', value: review.assignee, color: '#6366f1', icon: User },
          { label: 'Review Type', value: review.type, color: '#06b6d4', icon: ListChecks },
        ].map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <p className="text-base font-bold" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="risk" style={{ borderRadius: 0 }}>Risk Assessment</TabsTrigger>
          <TabsTrigger value="decisions" style={{ borderRadius: 0 }}>Decision History</TabsTrigger>
          <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Review Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Review ID', value: review.id },
                  { label: 'Model', value: review.modelName },
                  { label: 'Model ID', value: review.modelId },
                  { label: 'Type', value: review.type },
                  { label: 'Trigger Reason', value: review.trigger },
                  { label: 'Priority', value: review.priority },
                  { label: 'Status', value: review.status.replace('_', ' ') },
                  { label: 'SLA', value: review.sla },
                  { label: 'Assignee', value: review.assignee },
                  { label: 'Created', value: formatDate(review.createdDate) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {model && (
              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Name', value: model.name },
                    { label: 'Version', value: model.version },
                    { label: 'Status', value: model.status },
                    { label: 'Risk Tier', value: model.riskTier },
                    { label: 'Fairness Score', value: model.fairnessScore + '%' },
                    { label: 'Drift Status', value: model.driftStatus },
                    { label: 'Owner', value: model.owner },
                    { label: 'Last Validated', value: formatDate(model.lastValidated) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Risk Assessment Tab */}
        <TabsContent value="risk" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Risk score gauge */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span style={{ color: 'hsl(var(--text-3))' }}>Overall Risk Score</span>
                  <span className="font-bold" style={{ color: riskBarColor(review.riskScore) }}>{review.riskScore}/100</span>
                </div>
                <div style={{ background: 'hsl(var(--bg-muted))', height: 16 }}>
                  <div style={{ width: review.riskScore + '%', height: '100%', background: riskBarColor(review.riskScore), transition: 'width 0.3s' }} />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                  <span>Low (&lt;60)</span>
                  <span>Medium (60–79)</span>
                  <span>High (≥80)</span>
                </div>
              </div>
              {/* Risk factors */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Risk Factors</p>
                {[
                  { factor: 'Bias / Fairness', score: review.priority === 'critical' ? 90 : 60 },
                  { factor: 'Model Performance', score: review.riskScore - 10 > 0 ? review.riskScore - 10 : 0 },
                  { factor: 'Regulatory Compliance', score: review.priority === 'critical' || review.priority === 'high' ? 75 : 45 },
                  { factor: 'Data Quality', score: Math.round(review.riskScore * 0.7) },
                ].map(f => (
                  <div key={f.factor} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'hsl(var(--text-2))' }}>{f.factor}</span>
                      <span style={{ color: riskBarColor(f.score) }}>{f.score}</span>
                    </div>
                    <div style={{ background: 'hsl(var(--bg-muted))', height: 6 }}>
                      <div style={{ width: f.score + '%', height: '100%', background: riskBarColor(f.score) }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decision History Tab */}
        <TabsContent value="decisions" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Decision History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DECISION_HISTORY.map((d, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: d.outcome === 'manual' ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }} />
                    <div className="flex-1 p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{d.action}</p>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(d.date)}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                        By: {d.actor} · {d.outcome === 'manual' ? 'Manual decision' : 'Automated'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ACTIVITY_LOG.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <Pulse size={14} style={{ color: 'hsl(var(--brand))', marginTop: 2, flexShrink: 0 }} />
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{a.action}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{a.actor} · {formatDate(a.timestamp.split('T')[0])}</p>
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
