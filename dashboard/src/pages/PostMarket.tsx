// Post-Market Monitoring (EU AI Act Art. 72) — backed by the org-scoped
// post_market_plans / post_market_events tables via usePostMarketPlans and
// usePostMarketEvents (writes throw; success toasts fire only from the
// mutation's onSuccess). Metric thresholds are the plan's real configuration,
// events form the per-plan timeline, and 'Escalate to incident' declares a
// REAL incident through the incident pipeline — the chip links to it.
import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Binoculars, Plus, PencilSimple, Trash, Cube, X, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { PageHeader } from '../components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { usePostMarketPlans, usePostMarketEvents } from '@/hooks/useComplianceGroup'
import { useModelsData } from '@/hooks/useModelsData'
import type { PostMarketPlanRecord, PostMarketEventRecord, PostMarketMetric } from '@/services/regulatoryOpsService'

const EVENT_TYPES = ['metric_breach', 'complaint', 'drift', 'recall_check'] as const
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const FREQUENCIES = ['continuous', 'weekly', 'monthly', 'quarterly'] as const
const PLAN_STATUSES = ['active', 'paused', 'retired'] as const

const prettify = (s?: string | null) =>
  s ? s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '—'

const PLAN_STATUS_STYLE: Record<string, React.CSSProperties> = {
  active:  { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  paused:  { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  retired: { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' },
}
const SEV_STYLE: Record<string, React.CSSProperties> = {
  critical: { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  high:     { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  medium:   { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  low:      { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
}
const sevStyle = (s?: string | null): React.CSSProperties =>
  SEV_STYLE[(s ?? '').toLowerCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }

interface PlanForm {
  name: string; modelId: string; frequency: string; status: string
  owner: string; nextReview: string; metrics: PostMarketMetric[]
}
const EMPTY_PLAN: PlanForm = { name: '', modelId: '', frequency: 'monthly', status: 'active', owner: '', nextReview: '', metrics: [] }

interface EventForm { eventType: string; severity: string; description: string; escalate: boolean }
const EMPTY_EVENT: EventForm = { eventType: 'metric_breach', severity: 'medium', description: '', escalate: false }

export default function PostMarket() {
  const { items: plans, isLoading, error, save: savePlan, remove: removePlan, isSaving } = usePostMarketPlans()
  const { items: events, isLoading: eventsLoading, error: eventsError, save: saveEvent, isSaving: isSavingEvent } = usePostMarketEvents()
  const { models } = useModelsData()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable'

  const [expanded, setExpanded] = useState<string | null>(null)
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PostMarketPlanRecord | null>(null)
  const [planForm, setPlanForm] = useState<PlanForm>({ ...EMPTY_PLAN })
  const [eventDialogPlan, setEventDialogPlan] = useState<PostMarketPlanRecord | null>(null)
  const [eventForm, setEventForm] = useState<EventForm>({ ...EMPTY_EVENT })
  const [deleteTarget, setDeleteTarget] = useState<PostMarketPlanRecord | null>(null)
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null)

  // ?model=<uuid> deep link — dismissible filter chip.
  const modelParam = searchParams.get('model')
  const modelFilter = modelParam ? models.find(m => m.id === modelParam) : undefined
  const clearModelFilter = () =>
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('model'); return next }, { replace: true })

  // ?open=<planId> deep link → expand that plan once loaded.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || plans.length === 0) return
    if (plans.some(p => p.id === openId)) setExpanded(openId)
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('open'); return next }, { replace: true })
  }, [plans, searchParams, setSearchParams])

  const visiblePlans = useMemo(
    () => (modelParam ? plans.filter(p => p.modelId === modelParam) : plans),
    [plans, modelParam],
  )
  const eventsByPlan = useMemo(() => {
    const map = new Map<string, PostMarketEventRecord[]>()
    for (const e of events) {
      if (!e.planId) continue
      map.set(e.planId, [...(map.get(e.planId) ?? []), e])
    }
    return map
  }, [events])

  // KPIs — derived from loaded rows only.
  const activePlans = plans.filter(p => p.status === 'active').length
  const openEvents = events.filter(e => !e.resolved).length
  const escalated = events.filter(e => !!e.incidentId).length
  const reviewsDue = plans.filter(p => {
    if (!p.nextReview) return false
    const t = new Date(p.nextReview + 'T00:00:00Z').getTime()
    return !Number.isNaN(t) && t <= Date.now() + 7 * 86_400_000
  }).length

  const openCreatePlan = () => { setEditingPlan(null); setPlanForm({ ...EMPTY_PLAN, modelId: modelParam ?? '' }); setPlanDialogOpen(true) }
  const openEditPlan = (p: PostMarketPlanRecord) => {
    setEditingPlan(p)
    setPlanForm({
      name: p.name, modelId: p.modelId ?? '', frequency: p.frequency ?? 'monthly', status: p.status,
      owner: p.owner ?? '', nextReview: p.nextReview ?? '', metrics: p.metrics.map(m => ({ ...m })),
    })
    setPlanDialogOpen(true)
  }

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) { toast.error('Plan name is required'); return }
    const badMetric = planForm.metrics.find(m => !m.name.trim() || Number.isNaN(Number(m.threshold)))
    if (badMetric) { toast.error('Every metric needs a name and a numeric threshold'); return }
    try {
      await savePlan({
        ...(editingPlan ?? {}),
        name: planForm.name.trim(),
        modelId: planForm.modelId || null,
        frequency: planForm.frequency,
        status: planForm.status,
        owner: planForm.owner.trim() || null,
        nextReview: planForm.nextReview || null,
        metrics: planForm.metrics.map(m => ({ name: m.name.trim(), threshold: Number(m.threshold), direction: m.direction })),
      })
      // Success toast fires from the mutation only after the write resolved.
      setPlanDialogOpen(false)
      setEditingPlan(null)
      setPlanForm({ ...EMPTY_PLAN })
    } catch {
      // Error toast fires from the mutation; keep the dialog open.
    }
  }

  // Log event — with escalation the service declares a REAL incident first
  // and stamps the event with its uuid; the toast comes from the mutation.
  const handleLogEvent = async () => {
    if (!eventDialogPlan?.id) return
    if (!eventForm.description.trim()) { toast.error('A description of the event is required'); return }
    try {
      await saveEvent({
        event: {
          planId: eventDialogPlan.id,
          eventType: eventForm.eventType,
          severity: eventForm.severity,
          description: eventForm.description.trim(),
          occurredAt: new Date().toISOString(),
          resolved: false,
        },
        escalateToIncident: eventForm.escalate,
      })
      setEventDialogPlan(null)
      setEventForm({ ...EMPTY_EVENT })
    } catch {
      // Error toast fires from the mutation; keep the dialog open.
    }
  }

  const toggleResolved = async (e: PostMarketEventRecord) => {
    if (!e.id) return
    setTogglingEventId(e.id)
    try {
      await saveEvent({ event: { ...e, resolved: !e.resolved } })
    } catch {
      // Error toast fires from the mutation.
    } finally {
      setTogglingEventId(null)
    }
  }

  const handleDeletePlan = async () => {
    if (!deleteTarget?.id) { setDeleteTarget(null); return }
    try { await removePlan(deleteTarget.id) } catch { /* error toast from the mutation */ }
    setDeleteTarget(null)
  }

  if (isLoading) return <PageSkeleton title="Post-Market Monitoring" showStats rows={4} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Post-Market Monitoring"
        subtitle="Monitoring plans and field events for deployed AI systems per EU AI Act Article 72 — escalations create real incidents"
        icon={Binoculars}
        actions={
          <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={openCreatePlan}>
            <Plus size={14} /> New Plan
          </Button>
        }
      />

      {(error || eventsError) && (
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load post-market data</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{((error ?? eventsError) as Error).message}</p>
        </div>
      )}

      {/* KPIs — derived from loaded rows */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Plans', value: String(activePlans), sub: `Of ${plans.length} total`, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Open Events', value: String(openEvents), sub: 'Not yet resolved', color: openEvents > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' },
          { label: 'Escalated to Incidents', value: String(escalated), sub: 'Through the incident pipeline', color: escalated > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' },
          { label: 'Reviews Due (7d)', value: String(reviewsDue), sub: 'Computed from next-review dates', color: reviewsDue > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Model deep-link filter chip */}
      {modelParam && (
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--border))' }}>
          <Cube size={14} style={{ color: 'hsl(var(--brand))' }} />
          <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
            Showing plans for <strong style={{ color: 'hsl(var(--brand))' }}>{modelFilter ? modelFilter.name : 'Unavailable'}</strong>
          </span>
          <button onClick={clearModelFilter} aria-label="Clear model filter" className="ml-auto text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Plan cards */}
      {plans.length === 0 && !error ? (
        <EmptyState
          icon={<Binoculars size={32} />}
          title="No monitoring plans yet"
          description="Create a post-market monitoring plan for a deployed model — metric thresholds, review cadence, and an event log that can escalate to real incidents."
          action={<Button onClick={openCreatePlan} style={{ borderRadius: 0 }}><Plus size={14} /> New Plan</Button>}
        />
      ) : visiblePlans.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-10 text-center">
          <p className="text-sm text-[hsl(var(--text-4))]">No plans match the current model filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePlans.map(plan => {
            const planEvents = plan.id ? (eventsByPlan.get(plan.id) ?? []) : []
            const openCount = planEvents.filter(e => !e.resolved).length
            const isOpen = expanded === plan.id
            return (
              <div key={plan.id} className="rounded border border-[hsl(var(--border))] bg-surface">
                <div
                  className="p-4 cursor-pointer hover:bg-raised transition-colors"
                  onClick={() => setExpanded(isOpen ? null : plan.id ?? null)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {plan.planRef && <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{plan.planRef}</span>}
                        <span className="text-[11px] px-2 py-0.5 font-medium" style={PLAN_STATUS_STYLE[plan.status] ?? PLAN_STATUS_STYLE.retired}>{prettify(plan.status)}</span>
                        {plan.frequency && <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{prettify(plan.frequency)}</span>}
                      </div>
                      <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{plan.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {plan.modelId ? (
                          <InterlinkChip label={modelName(plan.modelId)} to={`/models/inventory/${plan.modelId}`} onClick={e => e.stopPropagation()} />
                        ) : (
                          <span className="text-[10px] italic text-[hsl(var(--text-4))]">No model linked</span>
                        )}
                        {plan.owner && <span className="text-[10px] text-[hsl(var(--text-4))]">Owner: {plan.owner}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      {plan.nextReview && <p className="text-xs text-[hsl(var(--text-4))]">Next review: {plan.nextReview}</p>}
                      <p className="text-xs text-[hsl(var(--text-3))]">
                        {planEvents.length} {planEvents.length === 1 ? 'event' : 'events'}
                        {openCount > 0 && <strong style={{ color: 'hsl(var(--s-wn-tx))' }}> · {openCount} open</strong>}
                      </p>
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} aria-label={`Edit ${plan.name}`} onClick={() => openEditPlan(plan)}>
                          <PencilSimple size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--destructive))' }} aria-label={`Delete ${plan.name}`} onClick={() => setDeleteTarget(plan)}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Metric configuration — the plan's real thresholds */}
                  {plan.metrics.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {plan.metrics.map((m, i) => (
                        <span key={`${m.name}-${i}`} className="text-[10px] px-1.5 py-0.5 font-mono" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
                          {m.name} {m.direction === 'above' ? '≤' : '≥'} {m.threshold}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] italic text-[hsl(var(--text-4))] mt-3">No metric thresholds configured yet.</p>
                  )}
                </div>

                {/* Events timeline */}
                {isOpen && (
                  <div className="border-t border-[hsl(var(--border))] p-4 space-y-3" style={{ background: 'hsl(var(--bg-raised))' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Event Timeline</p>
                      <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => { setEventForm({ ...EMPTY_EVENT }); setEventDialogPlan(plan) }}>
                        <Plus size={13} /> Log Event
                      </Button>
                    </div>
                    {eventsLoading ? (
                      <p className="text-xs text-[hsl(var(--text-4))]">Loading events…</p>
                    ) : planEvents.length === 0 ? (
                      <p className="text-xs italic text-[hsl(var(--text-4))]">No events recorded for this plan yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {planEvents.map(ev => (
                          <div key={ev.id} className="p-3 border border-[hsl(var(--border))] bg-surface">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.5 font-semibold uppercase" style={sevStyle(ev.severity)}>{ev.severity ?? 'unrated'}</span>
                              <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{prettify(ev.eventType)}</span>
                              {ev.occurredAt && <span className="text-[10px] text-[hsl(var(--text-4))]">{new Date(ev.occurredAt).toLocaleString()}</span>}
                              <label className="ml-auto inline-flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: ev.resolved ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))', opacity: togglingEventId === ev.id ? 0.6 : 1 }}>
                                <input
                                  type="checkbox"
                                  checked={ev.resolved}
                                  disabled={isSavingEvent}
                                  onChange={() => toggleResolved(ev)}
                                  style={{ accentColor: 'hsl(var(--s-ok-tx))' }}
                                />
                                {togglingEventId === ev.id ? 'Saving…' : 'Resolved'}
                              </label>
                            </div>
                            {ev.description && <p className="text-xs mt-1.5 text-[hsl(var(--text-2))]">{ev.description}</p>}
                            {ev.incidentId && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <InterlinkChip label="Escalated — open incident" to={`/risk/incidents?open=${ev.incidentId}`} />
                                {/* Art. 73 prompt: a critical/high field event that became an
                                    incident may be a reportable serious incident. The incident
                                    page owns the actual filing-draft flow — this only routes. */}
                                {['critical', 'high'].includes((ev.severity ?? '').toLowerCase()) && (
                                  <Link
                                    to={`/risk/incidents?open=${ev.incidentId}`}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 font-medium border transition-colors hover:opacity-80"
                                    style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', borderColor: 'hsl(var(--s-wn-br))' }}
                                  >
                                    <Warning size={12} /> Assess for Art. 73 reporting
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Plan editor dialog */}
      <Dialog open={planDialogOpen} onOpenChange={o => { setPlanDialogOpen(o); if (!o) setEditingPlan(null) }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 620 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editingPlan ? 'Edit Monitoring Plan' : 'New Monitoring Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Plan Name *</Label>
              <Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Credit model production monitoring" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Model</Label>
                <Select value={planForm.modelId || 'none'} onValueChange={v => setPlanForm(f => ({ ...f, modelId: v === 'none' ? '' : v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="No linked model" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value="none">No linked model</SelectItem>
                    {models.map(m => <SelectItem key={m.id} value={m.id!}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Frequency</Label>
                <Select value={planForm.frequency} onValueChange={v => setPlanForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FREQUENCIES.map(fr => <SelectItem key={fr} value={fr}>{prettify(fr)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={planForm.status} onValueChange={v => setPlanForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {PLAN_STATUSES.map(s => <SelectItem key={s} value={s}>{prettify(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Owner</Label>
                <Input value={planForm.owner} onChange={e => setPlanForm(f => ({ ...f, owner: e.target.value }))} placeholder="e.g. ML Ops lead" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Next Review</Label>
                <Input type="date" value={planForm.nextReview} onChange={e => setPlanForm(f => ({ ...f, nextReview: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>

            {/* Metrics add-row editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Metric Thresholds</Label>
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setPlanForm(f => ({ ...f, metrics: [...f.metrics, { name: '', threshold: 0, direction: 'below' }] }))}>
                  <Plus size={12} /> Add Metric
                </Button>
              </div>
              {planForm.metrics.length === 0 && (
                <p className="text-[11px] italic text-[hsl(var(--text-4))]">No metrics yet — add the thresholds this plan watches (e.g. accuracy ≥ 0.9).</p>
              )}
              {planForm.metrics.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_120px_110px_32px] gap-2 items-center">
                  <Input value={m.name} placeholder="Metric name (e.g. accuracy)" style={{ borderRadius: 0 }}
                    onChange={e => setPlanForm(f => ({ ...f, metrics: f.metrics.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))} />
                  <Input type="number" step="any" value={String(m.threshold)} placeholder="Threshold" style={{ borderRadius: 0 }}
                    onChange={e => setPlanForm(f => ({ ...f, metrics: f.metrics.map((x, i) => i === idx ? { ...x, threshold: e.target.value === '' ? NaN : Number(e.target.value) } : x) }))} />
                  <Select value={m.direction} onValueChange={v => setPlanForm(f => ({ ...f, metrics: f.metrics.map((x, i) => i === idx ? { ...x, direction: v } : x) }))}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      <SelectItem value="below">Alert below</SelectItem>
                      <SelectItem value="above">Alert above</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" aria-label="Remove metric" style={{ padding: '4px', color: 'hsl(var(--destructive))' }}
                    onClick={() => setPlanForm(f => ({ ...f, metrics: f.metrics.filter((_, i) => i !== idx) }))}>
                    <Trash size={13} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)} disabled={isSaving} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSavePlan} disabled={isSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {isSaving ? 'Saving…' : editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log event dialog */}
      <Dialog open={!!eventDialogPlan} onOpenChange={o => { if (!o) setEventDialogPlan(null) }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Log Event — {eventDialogPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Event Type</Label>
                <Select value={eventForm.eventType} onValueChange={v => setEventForm(f => ({ ...f, eventType: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{prettify(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Severity</Label>
                <Select value={eventForm.severity} onValueChange={v => setEventForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {SEVERITIES.map(s => <SelectItem key={s} value={s}>{prettify(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Description *</Label>
              <Textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What was observed in the field…" style={{ borderRadius: 0 }} />
            </div>
            <label className="flex items-start gap-2.5 p-3 cursor-pointer" style={{ border: '1px solid hsl(var(--border))' }}>
              <input
                type="checkbox"
                checked={eventForm.escalate}
                onChange={e => setEventForm(f => ({ ...f, escalate: e.target.checked }))}
                style={{ accentColor: 'hsl(var(--destructive))', marginTop: 2 }}
              />
              <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                <span className="font-semibold flex items-center gap-1" style={{ color: 'hsl(var(--destructive))' }}>
                  <Warning size={12} /> Escalate to incident
                </span>
                Declares a real incident through the incident pipeline (carrying this plan&apos;s model) and links it to the event.
              </span>
            </label>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEventDialogPlan(null)} disabled={isSavingEvent} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleLogEvent} disabled={isSavingEvent} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {isSavingEvent ? 'Saving…' : eventForm.escalate ? 'Log & Escalate' : 'Log Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? Its logged events remain in the ledger but lose their plan context. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} style={{ background: 'hsl(var(--destructive))', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
