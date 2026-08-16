// SPDX-License-Identifier: Apache-2.0
// HITL review detail — one review from the shared hitl_reviews queue, loaded
// by uuid via useHitlReview(). Decisions persist through decide() (audited);
// the timeline is derived from the record — nothing invented.
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft, Brain, Clock, Warning, CheckCircle, X, Info,
  ClipboardText, ListChecks, Robot, ShieldWarning,
} from '@phosphor-icons/react';
import { severityColor, statusColor, formatDate, timeAgo } from '../../data/seed';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import { useHitlReview, useHitlReviews } from '../../hooks/useRiskIncidents';
import { useModelsData } from '@/hooks/useModelsData';
import { useRisksData } from '@/hooks/useRisksData';
import { useAuthStore } from '../../stores/authStore';

export default function HITLDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: review, isLoading, error } = useHitlReview(id);
  const { decide, isDeciding } = useHitlReviews();
  const { models } = useModelsData();
  const { risks } = useRisksData();
  const user = useAuthStore(s => s.user);
  const currentUser = user?.fullName || user?.email || 'Reviewer';

  const [remarks, setRemarks] = useState('');

  if (isLoading) return <PageSkeleton title="HITL Review" rows={4} />;

  if (error) {
    return (
      <div className="space-y-6">
        <Link to="/hitl">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
            <ArrowLeft size={14} /> Back to HITL Reviews
          </Button>
        </Link>
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load the review</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="p-6">
        <Link to="/hitl">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
            <ArrowLeft size={14} /> Back to HITL Reviews
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

  const modelId = review.modelId || (review.entityType === 'model' ? review.entityId : null);
  const model = modelId ? models.find(m => m.id === modelId) : undefined;
  const modelLabel = model?.name ?? (modelId ? 'Unavailable' : null);

  const sc = severityColor(review.priority);
  const statc = statusColor(review.status);
  const isOpenStatus = review.status === 'pending' || review.status === 'info_requested';
  const isOverdue = isOpenStatus && !!review.slaDeadline && new Date(review.slaDeadline) < new Date();

  const slaText = (() => {
    if (!isOpenStatus) return 'Completed';
    if (!review.slaDeadline) return 'No SLA set';
    const diffH = Math.round((new Date(review.slaDeadline).getTime() - Date.now()) / 3600000);
    return diffH < 0 ? `${-diffH}h overdue` : `${diffH}h remaining`;
  })();

  const runDecision = async (decision: 'approved' | 'rejected' | 'info_requested') => {
    if (!review.id) return;
    try {
      await decide({ id: review.id, decision, decidedBy: currentUser, remarks: remarks.trim() || undefined });
      setRemarks('');
      // The detail query shares the ['ri-hitl'] key prefix, so the record
      // refreshes in place with the persisted decision.
    } catch { /* hook toasts the error */ }
  };

  // Timeline derived strictly from the record.
  const timeline = [
    review.createdAt && {
      action: 'Review opened',
      detail: review.triggerReason || review.description || null,
      by: review.assignedTo ? `Assigned to ${review.assignedTo}` : 'Unassigned',
      date: review.createdAt,
    },
    review.decidedAt && {
      action: `Decision: ${(review.decision ?? review.status).replace(/_/g, ' ')}`,
      detail: review.remarks || null,
      by: review.decidedBy ?? 'Unknown',
      date: review.decidedAt,
    },
  ].filter(Boolean) as { action: string; detail: string | null; by: string; date: string }[];

  const entityChip = (() => {
    if ((review.entityType === 'model' || review.entityType === 'deployment') && modelId) {
      return <InterlinkChip label={modelLabel ?? 'Unavailable'} to={`/models/inventory/${modelId}`} />;
    }
    if (review.entityType === 'incident' && review.entityId) {
      return <InterlinkChip label={review.entityName || 'Incident'} to={`/risk/incidents?open=${review.entityId}`} />;
    }
    if (review.entityType === 'risk' && review.entityId) {
      const risk = risks.find(rk => rk.id === review.entityId);
      const label = risk ? (risk.risk_id || risk.title) : (review.entityName || 'Unavailable');
      return <InterlinkChip label={label} to={`/risks?open=${review.entityId}`} />;
    }
    return <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{review.entityName || '—'}</span>;
  })();

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/hitl">
        <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} /> Back to HITL Reviews
        </Button>
      </Link>

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
              {review.priority.toUpperCase()} PRIORITY
            </Badge>
            <Badge style={{ background: statc.bg, color: statc.text, border: `1px solid ${statc.border}`, borderRadius: 0, fontSize: 10 }}>
              {review.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            {isOverdue && (
              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', borderRadius: 0, fontSize: 10 }}>
                <Warning size={10} className="mr-0.5" /> OVERDUE
              </Badge>
            )}
            {review.blocksDeployment && (
              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                <ShieldWarning size={10} className="mr-0.5" /> BLOCKS DEPLOYMENT
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            {review.title}
          </h1>
          {review.description && (
            <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>{review.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {entityChip}
            {review.linkedRiskId && <InterlinkChip label="Linked risk" to={`/risks?open=${review.linkedRiskId}`} />}
          </div>
        </div>
      </div>

      {/* SLA banner */}
      <div className="p-3 flex items-center gap-3 flex-wrap" style={{
        background: isOverdue ? 'hsl(var(--s-er-bg))' : 'hsl(var(--bg-muted))',
        border: `1px solid ${isOverdue ? 'hsl(var(--s-er-br))' : 'hsl(var(--border))'}`,
      }}>
        <Clock size={16} style={{ color: isOverdue ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-2))', flexShrink: 0 }} />
        <span className="text-sm font-semibold" style={{ color: isOverdue ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-1))' }}>
          SLA: {slaText}
        </span>
        {review.createdAt && (
          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>· Created {formatDate(review.createdAt)}</span>
        )}
        {review.triggerReason && (
          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>· Trigger: {review.triggerReason}</span>
        )}
        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>· Assignee: {review.assignedTo || 'Unassigned'}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Review details */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
              <ListChecks size={14} style={{ color: 'hsl(var(--brand))' }} />
              Review Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {[
              { label: 'Review Type', value: (review.reviewType ?? '—').replace(/_/g, ' ') },
              { label: 'Entity Type', value: review.entityType ?? '—' },
              { label: 'Entity', value: review.entityName ?? '—' },
              { label: 'Priority', value: review.priority },
              { label: 'Risk Level', value: review.riskLevel ?? '—' },
              { label: 'Status', value: review.status.replace(/_/g, ' ') },
              { label: 'SLA Hours', value: review.slaHours != null ? `${review.slaHours}h` : '—' },
              { label: 'Assignee', value: review.assignedTo || 'Unassigned' },
              { label: 'Created', value: review.createdAt ? formatDate(review.createdAt) : '—' },
            ].map((r, i, arr) => (
              <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Linked model — resolved from ai_models by uuid */}
        {modelId ? (
          model ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Brain size={14} style={{ color: 'hsl(var(--brand))' }} />
                  Linked Model
                  <span className="ml-auto"><InterlinkChip label={model.name} to={`/models/inventory/${model.id}`} /></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {[
                  { label: 'Model Name', value: model.name },
                  { label: 'Version', value: model.version ?? '—' },
                  { label: 'Provider', value: model.provider ?? '—' },
                  { label: 'Lifecycle Stage', value: model.lifecycle_stage ?? '—' },
                  { label: 'Risk Tier', value: model.risk_tier ?? '—' },
                  { label: 'Drift Status', value: model.drift_status ?? '—' },
                  { label: 'Business Owner', value: model.business_owner ?? '—' },
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
                <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>Linked model unavailable</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>The referenced model is not in the current inventory.</p>
              </CardContent>
            </Card>
          )
        ) : (
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="flex items-center justify-center h-48 flex-col gap-2">
              <Robot size={32} style={{ color: 'hsl(var(--text-4))' }} />
              <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No linked model</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Decision — persists via decide(), audited server-side */}
      {isOpenStatus ? (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Record Decision (as {currentUser})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Remarks (min 10 characters) *</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="mt-1 w-full h-24 text-xs p-3 resize-none"
                style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
                placeholder="Document the basis for your decision — this is written to the audit trail..."
              />
              <p className="text-xs mt-1" style={{ color: remarks.length >= 10 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}>
                {remarks.length}/10 characters minimum
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                disabled={remarks.trim().length < 10 || isDeciding}
                onClick={() => runDecision('approved')}
                style={{ borderRadius: 0, color: 'hsl(var(--s-ok-tx))', borderColor: 'hsl(var(--s-ok-br))', gap: 6 }}
                variant="outline"
              >
                <CheckCircle size={14} /> {isDeciding ? 'Saving…' : 'Approve'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={remarks.trim().length < 10 || isDeciding}
                onClick={() => runDecision('rejected')}
                style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))', borderColor: 'hsl(var(--s-er-br))', gap: 6 }}
              >
                <X size={14} /> Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={remarks.trim().length < 10 || isDeciding}
                onClick={() => runDecision('info_requested')}
                style={{ borderRadius: 0, gap: 6 }}
              >
                <Info size={14} /> Request Info
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="p-3" style={{
          border: `1px solid ${review.status === 'approved' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))'}`,
          background: review.status === 'approved' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
        }}>
          <p className="text-xs font-semibold" style={{ color: review.status === 'approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }}>
            Decision: {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
            {review.decidedBy ? ` — ${review.decidedBy}` : ''}
            {review.decidedAt ? ` · ${formatDate(review.decidedAt)}` : ''}
          </p>
          {review.remarks && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-1))' }}>{review.remarks}</p>}
        </div>
      )}

      {/* Decision timeline — derived from the record */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <ClipboardText size={14} style={{ color: 'hsl(var(--brand))' }} />
            Decision Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-xs py-4" style={{ color: 'hsl(var(--text-4))' }}>No recorded events for this review yet.</p>
          ) : (
            <div className="space-y-0">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-4 py-4" style={{ borderBottom: i < timeline.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                  <div className="flex flex-col items-center mt-1">
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: i === timeline.length - 1 && review.decidedAt ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                      flexShrink: 0,
                    }} />
                    {i < timeline.length - 1 && (
                      <div style={{ width: 1, flexGrow: 1, minHeight: 24, background: 'hsl(var(--border))', marginTop: 4 }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{t.action}</p>
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>
                        {formatDate(t.date)} · {timeAgo(t.date)}
                      </span>
                    </div>
                    {t.detail && <p className="text-xs mb-1" style={{ color: 'hsl(var(--text-3))' }}>{t.detail}</p>}
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{t.by}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
