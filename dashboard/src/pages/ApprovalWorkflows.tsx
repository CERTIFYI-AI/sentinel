// SPDX-License-Identifier: Apache-2.0
// Approval Workflows — workflow definitions (approval_workflows) plus live,
// entity-linked approval requests (approvals). Decisions persist via
// decide() and are audited server-side; all KPIs are derived from records.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from './../stores/authStore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FlowArrow, Plus, X, Trash, PencilSimple, CheckCircle, XCircle, Clock,
  MagnifyingGlass, Pause, Play, ShieldCheck, BellRinging,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { StatCardRow, type StatCardRowItem } from '../components/ui/StatCardRow'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { useApprovalWorkflows, useApprovals } from '../hooks/useRiskIncidents'
import { useModelsData } from '@/hooks/useModelsData'
import { usePolicies } from '../hooks/queries/usePolicies'
import type { ApprovalWorkflowRecord, ApprovalRecord } from '../services/oversightService'
import { formatDate } from '../data/seed'

type StepDraft = { name: string; approver_role: string; required: boolean; sla_hours: number }

const APPLIES_TO = [
  { value: 'model_release', label: 'Model Release' },
  { value: 'exception', label: 'Exception' },
  { value: 'incident_report', label: 'Incident Report' },
  { value: 'policy_change', label: 'Policy Change' },
]

const ENTITY_TYPES = [
  { value: 'model', label: 'Model' },
  { value: 'exception', label: 'Exception' },
  { value: 'incident', label: 'Incident' },
  { value: 'policy', label: 'Policy' },
]

const INPUT_CLS = 'w-full px-3 py-2 border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] text-sm focus:outline-none focus:border-[hsl(var(--brand))]'

const appliesToLabel = (v?: string) => APPLIES_TO.find(a => a.value === v)?.label ?? (v ? v.replace(/_/g, ' ') : 'Any')

export default function ApprovalWorkflows() {
  const user = useAuthStore(s => s.user)
  const currentUser = user?.fullName || user?.email || 'Reviewer'
  const workflows = useApprovalWorkflows()
  const approvals = useApprovals()
  const { models } = useModelsData()
  const { data: policies = [] } = usePolicies()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [workflowFilter, setWorkflowFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalWorkflowRecord | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApprovalWorkflowRecord | null>(null)
  const [decideTarget, setDecideTarget] = useState<{ approval: ApprovalRecord; decision: 'approved' | 'rejected' } | null>(null)

  const modelName = (id?: string | null) =>
    (id && models.find(m => m.id === id)?.name) ?? 'Unavailable'
  const workflowName = (id?: string | null) =>
    (id && workflows.items.find(w => w.id === id)?.name) ?? null

  const isLoading = workflows.isLoading || approvals.isLoading
  if (isLoading) return <PageSkeleton title="Approval Workflows" showStats rows={5} />

  const pendingApprovals = approvals.items.filter(a => a.status === 'pending')
  const weekAgo = Date.now() - 7 * 24 * 3600000
  const decidedThisWeek = approvals.items.filter(a => a.decidedAt && new Date(a.decidedAt).getTime() >= weekAgo).length
  const activeWorkflows = workflows.items.filter(w => w.isActive).length

  const filteredWorkflows = workflows.items.filter(w => {
    const q = search.toLowerCase()
    return !q || w.name.toLowerCase().includes(q) || (w.description ?? '').toLowerCase().includes(q) || appliesToLabel(w.appliesTo).toLowerCase().includes(q)
  })

  const visiblePending = pendingApprovals.filter(a => workflowFilter === 'all' || a.workflowId === workflowFilter)

  const kpis: StatCardRowItem[] = [
    { label: 'Pending Requests', value: String(pendingApprovals.length), icon: <Clock size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} /> },
    { label: 'Decided This Week', value: String(decidedThisWeek), icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} /> },
    { label: 'Active Workflows', value: String(activeWorkflows), icon: <FlowArrow size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} /> },
    { label: 'Total Workflows', value: String(workflows.items.length), icon: <FlowArrow size={18} style={{ color: 'hsl(var(--text-3))' }} /> },
  ]

  const entityChip = (a: ApprovalRecord) => {
    if (!a.entityId) {
      return <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{a.entityName || '—'}</span>
    }
    if (a.entityType === 'model') {
      const resolved = models.find(m => m.id === a.entityId)?.name
      return <InterlinkChip label={resolved ?? a.entityName ?? 'Unavailable'} to={`/models/inventory/${a.entityId}`} />
    }
    if (a.entityType === 'exception') {
      return <InterlinkChip label={a.entityName || 'Exception'} to={`/exceptions?open=${a.entityId}`} />
    }
    if (a.entityType === 'incident') {
      return <InterlinkChip label={a.entityName || 'Incident'} to={`/risk/incidents?open=${a.entityId}`} />
    }
    if (a.entityType === 'policy') {
      const resolved = policies.find(p => p.id === a.entityId)
      return <InterlinkChip label={resolved?.title || resolved?.name || a.entityName || 'Unavailable'} to={`/policies?open=${a.entityId}`} />
    }
    return <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{a.entityName || '—'}</span>
  }

  const workflowSteps = (id?: string | null) =>
    (id && workflows.items.find(w => w.id === id)?.steps) || []

  /** Due-date badge — red once dueAt has passed; nothing when no due date. */
  const dueBadge = (a: ApprovalRecord) => {
    if (!a.dueAt) return null
    const overdue = new Date(a.dueAt).getTime() < Date.now()
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 font-medium"
        style={overdue
          ? { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }
          : { background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-3))' }}
      >
        {overdue ? `Overdue — due ${formatDate(a.dueAt)}` : `Due ${formatDate(a.dueAt)}`}
      </span>
    )
  }

  /** Multi-step progress: current step + the per-step decisions ledger. */
  const stepProgress = (a: ApprovalRecord) => {
    const steps = workflowSteps(a.workflowId)
    const decisions = a.decisions ?? []
    if (steps.length === 0 && decisions.length === 0) return null
    return (
      <div className="mt-1.5 space-y-0.5">
        {steps.length > 0 && a.status === 'pending' && (
          <p className="text-[11px] font-medium" style={{ color: 'hsl(var(--brand))' }}>
            Step {a.stepIndex + 1} of {steps.length}: {steps[a.stepIndex]?.name ?? '—'}
            <span className="font-normal" style={{ color: 'hsl(var(--text-4))' }}>
              {steps[a.stepIndex]?.approver_role ? ` · ${steps[a.stepIndex].approver_role}` : ''}
            </span>
          </p>
        )}
        {decisions.map((d, i) => (
          <p key={i} className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
            <span style={{ color: d.decision === 'rejected' ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))' }}>
              {d.decision === 'rejected' ? '✕' : '✓'}
            </span>
            {' '}Step {d.step + 1}{d.name ? ` (${d.name})` : ''} {d.decision} by {d.approver}{d.at ? ` · ${formatDate(d.at)}` : ''}
          </p>
        ))}
      </div>
    )
  }

  // Deep link (?open=<id>) — e.g. from the Audit Trail: surface that request
  // (pending or decided) in a dismissible panel above the queue.
  const openParam = searchParams.get('open')
  const openedApproval = openParam ? approvals.items.find(a => a.id === openParam) ?? null : null
  const dismissOpen = () => {
    searchParams.delete('open')
    setSearchParams(searchParams, { replace: true })
  }

  const toggleActive = async (w: ApprovalWorkflowRecord) => {
    try {
      await workflows.save({ ...w, isActive: !w.isActive })
    } catch { /* hook toasts the error */ }
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await workflows.remove(deleteTarget.id)
      setDeleteTarget(null)
    } catch { /* hook toasts the error */ }
  }

  const confirmDecision = async () => {
    if (!decideTarget?.approval.id) return
    try {
      await approvals.decide({ id: decideTarget.approval.id, decision: decideTarget.decision, approver: currentUser })
      setDecideTarget(null)
    } catch { /* hook toasts the error */ }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approval Workflows"
        subtitle="Multi-stage approval pipelines for governance actions — every decision is audited"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Oversight' }, { label: 'Approval Workflows' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setRequestOpen(true)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
              <Plus size={14} /> New Request
            </button>
            <button onClick={() => { setEditing(null); setFormOpen(true) }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] bg-[hsl(var(--brand))] hover:opacity-90">
              <Plus size={14} /> New Workflow
            </button>
          </div>
        }
      />

      {(workflows.error || approvals.error) && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load approval data</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">
            {((workflows.error ?? approvals.error) as Error).message}
          </p>
        </div>
      )}

      <StatCardRow cards={kpis} />

      {/* ── Deep-linked request (?open=<id>) ─────────────────────────────── */}
      {openParam && (
        <div className="rounded border bg-surface" style={{ borderColor: 'hsl(var(--brand) / 0.4)' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))]">
            <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand))' }}>Linked approval request</p>
            <button onClick={dismissOpen} aria-label="Dismiss linked request" className="p-1 hover:bg-raised text-[hsl(var(--text-4))]">
              <X size={12} />
            </button>
          </div>
          {openedApproval ? (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {entityChip(openedApproval)}
                <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{openedApproval.entityType}</span>
                <span className="text-[11px] px-2 py-0.5 font-medium" style={
                  openedApproval.status === 'approved' ? { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
                  : openedApproval.status === 'rejected' ? { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }
                  : { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
                }>{openedApproval.status}</span>
                {dueBadge(openedApproval)}
              </div>
              <p className="text-sm font-medium text-[hsl(var(--text-1))]">
                {(openedApproval.requestedAction ?? 'approval').replace(/_/g, ' ')}
                <span className="text-xs font-normal text-[hsl(var(--text-4))]"> · requested by {openedApproval.requestedBy || 'Unknown'}{openedApproval.createdAt ? ` · ${formatDate(openedApproval.createdAt)}` : ''}</span>
              </p>
              {openedApproval.reason && <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{openedApproval.reason}</p>}
              {stepProgress(openedApproval)}
            </div>
          ) : (
            <p className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              No approval request with this id is visible to your organisation.
            </p>
          )}
        </div>
      )}

      {/* ── Pending approvals — live, entity-linked requests ─────────────── */}
      <div className="rounded border border-[hsl(var(--border))] bg-surface">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <p className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Clock size={15} className="text-[hsl(var(--s-wn-tx))]" />
            Pending Approvals ({visiblePending.length})
          </p>
          <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
            <SelectTrigger className="w-64 h-8 text-xs" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All workflows</SelectItem>
              {workflows.items.filter(w => w.id).map(w => (
                <SelectItem key={w.id} value={w.id!}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {visiblePending.length === 0 ? (
          <div className="py-10 text-center text-sm text-[hsl(var(--text-4))]">
            {pendingApprovals.length === 0
              ? 'Nothing awaiting approval — the queue is clear.'
              : 'No pending requests for this workflow.'}
          </div>
        ) : (
          <div>
            {visiblePending.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[hsl(var(--border))] last:border-b-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {entityChip(a)}
                    <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{a.entityType}</span>
                    {workflowName(a.workflowId) && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{workflowName(a.workflowId)}</span>
                    )}
                    {dueBadge(a)}
                  </div>
                  <p className="text-sm font-medium text-[hsl(var(--text-1))]">
                    {(a.requestedAction ?? 'approval').replace(/_/g, ' ')}
                    <span className="text-xs font-normal text-[hsl(var(--text-4))]"> · requested by {a.requestedBy || 'Unknown'}{a.createdAt ? ` · ${formatDate(a.createdAt)}` : ''}</span>
                  </p>
                  {a.reason && <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{a.reason}</p>}
                  {stepProgress(a)}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setDecideTarget({ approval: a, decision: 'approved' })}
                    disabled={approvals.isDeciding}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--bg-surface))] bg-[hsl(var(--brand))] hover:opacity-90 disabled:opacity-50"
                  >
                    <CheckCircle size={11} /> Approve
                  </button>
                  <button
                    onClick={() => setDecideTarget({ approval: a, decision: 'rejected' })}
                    disabled={approvals.isDeciding}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--destructive))] hover:bg-raised disabled:opacity-50"
                  >
                    <XCircle size={11} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Workflow definitions ─────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 border border-[hsl(var(--border))] bg-surface px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows…" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
      </div>

      <div className="space-y-3">
        {filteredWorkflows.length === 0 && (
          <div className="py-10 text-center text-sm text-[hsl(var(--text-4))]">
            {workflows.items.length === 0
              ? 'No approval workflows defined yet — create one to route governance decisions.'
              : 'No workflows match your search.'}
          </div>
        )}
        {filteredWorkflows.map(w => {
          const pendingForWf = pendingApprovals.filter(a => a.workflowId === w.id).length
          return (
            <div key={w.id} className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: w.isActive ? 'hsl(var(--brand))' : 'hsl(var(--text-4))' }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{appliesToLabel(w.appliesTo)}</span>
                      <span className="text-[11px] px-2 py-0.5 font-medium" style={w.isActive
                        ? { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
                        : { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}>
                        {w.isActive ? 'Active' : 'Paused'}
                      </span>
                      {w.requiresMfa && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 flex items-center gap-1 font-medium"
                          style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}
                          title="MFA is stored on the workflow definition, but decisions are not yet re-challenged for a second factor — enforcement lands with the IGA integration."
                        >
                          <ShieldCheck size={10} /> MFA (configured — enforcement pending IGA)
                        </span>
                      )}
                      {w.escalationHours != null && (
                        <span className="text-[10px] px-1.5 py-0.5 flex items-center gap-1 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">
                          <BellRinging size={10} /> Escalate after {w.escalationHours}h{w.notifyOnEscalation ? ' · notify' : ''}
                        </span>
                      )}
                      {pendingForWf > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 font-semibold text-[hsl(var(--bg-surface))]" style={{ background: 'hsl(var(--s-wn-tx))' }}>{pendingForWf} pending</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[hsl(var(--text-1))] truncate">{w.name}</p>
                    {w.description && <p className="text-xs text-[hsl(var(--text-4))] truncate">{w.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(w)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">
                    {w.isActive ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Resume</>}
                  </button>
                  <button onClick={() => { setEditing(w); setFormOpen(true) }} className="p-1.5 hover:bg-raised text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]" aria-label={`Edit ${w.name}`}><PencilSimple size={14} /></button>
                  <button onClick={() => setDeleteTarget(w)} className="p-1.5 hover:bg-raised text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]" aria-label={`Delete ${w.name}`}><Trash size={14} /></button>
                </div>
              </div>
              {/* Steps */}
              <div className="border-t border-[hsl(var(--border))] px-4 py-3">
                {w.steps.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-4))]">No steps configured — edit the workflow to add approval steps.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {w.steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border border-[hsl(var(--border))] bg-raised">
                        <span className="w-4 h-4 rounded-full bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                        <div>
                          <p className="text-xs font-medium text-[hsl(var(--text-1))]">{s.name}</p>
                          <p className="text-[10px] text-[hsl(var(--text-4))]">
                            {s.approver_role}{s.sla_hours != null ? ` · SLA ${s.sla_hours}h` : ''}{s.required === false ? ' · optional' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / edit dialog with steps editor */}
      {formOpen && (
        <WorkflowFormDialog
          editing={editing}
          isSaving={workflows.isSaving}
          onClose={() => { setFormOpen(false); setEditing(null) }}
          onSave={async (record) => {
            try {
              await workflows.save(record)
              setFormOpen(false)
              setEditing(null)
            } catch { /* hook toasts the error; keep dialog open */ }
          }}
        />
      )}

      {/* New request dialog */}
      {requestOpen && (
        <NewRequestDialog
          models={models}
          workflows={workflows.items}
          currentUser={currentUser}
          onClose={() => setRequestOpen(false)}
          onSave={async (record) => {
            try {
              await approvals.save(record)
              setRequestOpen(false)
            } catch { /* hook toasts the error; keep dialog open */ }
          }}
        />
      )}

      {/* Decision confirm */}
      <ConfirmDialog
        open={!!decideTarget}
        type={decideTarget?.decision === 'rejected' ? 'danger' : 'info'}
        title={decideTarget?.decision === 'approved' ? 'Approve Request' : 'Reject Request'}
        description={(() => {
          if (!decideTarget) return ''
          const a = decideTarget.approval
          const steps = workflowSteps(a.workflowId)
          const base = `${decideTarget.decision === 'approved' ? 'Approve' : 'Reject'} "${a.entityName ?? 'this request'}" (${(a.requestedAction ?? '').replace(/_/g, ' ')}) as ${currentUser}?`
          const stepNote = decideTarget.decision === 'approved' && steps.length > 1
            ? a.stepIndex + 1 < steps.length
              ? ` This approves step ${a.stepIndex + 1} of ${steps.length} (${steps[a.stepIndex]?.name ?? '—'}) — the request advances to the next step.`
              : ` This is the final step (${a.stepIndex + 1} of ${steps.length}) — the request becomes fully approved.`
            : decideTarget.decision === 'rejected' && steps.length > 1
              ? ' A rejection at any step is terminal.'
              : ''
          return `${base}${stepNote} The decision is persisted and written to the audit log.`
        })()}
        confirmLabel={approvals.isDeciding ? 'Saving…' : (decideTarget?.decision === 'approved' ? 'Approve' : 'Reject')}
        onConfirm={confirmDecision}
        onClose={() => setDecideTarget(null)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Workflow"
        description={`Delete "${deleteTarget?.name}"? Existing approval requests keep their history, but this definition is removed. This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ── Workflow create/edit dialog with a real steps editor ─────────────────────

function WorkflowFormDialog({ editing, isSaving, onClose, onSave }: {
  editing: ApprovalWorkflowRecord | null
  isSaving: boolean
  onClose: () => void
  onSave: (r: ApprovalWorkflowRecord) => Promise<void>
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [appliesTo, setAppliesTo] = useState(editing?.appliesTo ?? 'model_release')
  const [requiresMfa, setRequiresMfa] = useState(editing?.requiresMfa ?? false)
  const [escalationHours, setEscalationHours] = useState<number>(editing?.escalationHours ?? 24)
  const [notifyOnEscalation, setNotifyOnEscalation] = useState(editing?.notifyOnEscalation ?? true)
  const [steps, setSteps] = useState<StepDraft[]>(
    (editing?.steps ?? []).map(s => ({
      name: s.name ?? '',
      approver_role: s.approver_role ?? '',
      required: s.required !== false,
      sla_hours: s.sla_hours ?? 24,
    }))
  )

  const addStep = () => setSteps(prev => [...prev, { name: '', approver_role: '', required: true, sla_hours: 24 }])
  const removeStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i))
  const patchStep = (i: number, patch: Partial<StepDraft>) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))

  const validSteps = steps.filter(s => s.name.trim() && s.approver_role.trim())
  const canSave = name.trim().length > 0 && steps.length > 0 && validSteps.length === steps.length

  const submit = () => {
    if (!name.trim()) { toast.error('Workflow name is required.'); return }
    if (steps.length === 0) { toast.error('Add at least one approval step.'); return }
    if (validSteps.length !== steps.length) { toast.error('Every step needs a name and an approver role.'); return }
    onSave({
      id: editing?.id,
      name: name.trim(),
      description: description.trim() || undefined,
      appliesTo,
      steps: steps.map(s => ({ name: s.name.trim(), approver_role: s.approver_role.trim(), required: s.required, sla_hours: s.sla_hours })),
      requiresMfa,
      escalationHours,
      notifyOnEscalation,
      isActive: editing?.isActive ?? true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[560px] max-h-[85vh] overflow-y-auto bg-surface border border-[hsl(var(--border))] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{editing ? 'Edit Workflow' : 'New Approval Workflow'}</h2>
          <button onClick={onClose} aria-label="Close"><X size={16} className="text-[hsl(var(--text-4))]" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Workflow Name *" colSpan>
              <input value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} placeholder="e.g. Model release to production" />
            </Field>
            <Field label="Applies To">
              <Select value={appliesTo} onValueChange={setAppliesTo}>
                <SelectTrigger className={INPUT_CLS}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {APPLIES_TO.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Escalation After (hours)">
              <input type="number" value={escalationHours} onChange={e => setEscalationHours(Math.max(1, +e.target.value || 1))} className={INPUT_CLS} min={1} />
            </Field>
          </div>
          <Field label="Description" colSpan>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={INPUT_CLS + ' resize-none'} placeholder="Describe the purpose of this approval workflow…" />
          </Field>

          {/* Steps editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[hsl(var(--text-3))]">Approval Steps *</p>
              <button onClick={addStep} className="flex items-center gap-1 px-2 py-1 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">
                <Plus size={11} /> Add Step
              </button>
            </div>
            {steps.length === 0 ? (
              <p className="text-xs text-[hsl(var(--text-4))] border border-dashed border-[hsl(var(--border))] p-3">
                No steps yet — every workflow needs at least one approval step.
              </p>
            ) : (
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border border-[hsl(var(--border))]">
                    <span className="w-5 h-5 rounded-full bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                    <input value={s.name} onChange={e => patchStep(i, { name: e.target.value })} className={INPUT_CLS + ' flex-1'} placeholder="Step name" aria-label={`Step ${i + 1} name`} />
                    <input value={s.approver_role} onChange={e => patchStep(i, { approver_role: e.target.value })} className={INPUT_CLS + ' flex-1'} placeholder="Approver role" aria-label={`Step ${i + 1} approver role`} />
                    <input type="number" min={1} value={s.sla_hours} onChange={e => patchStep(i, { sla_hours: Math.max(1, +e.target.value || 1) })} className={INPUT_CLS + ' w-20'} title="SLA hours" aria-label={`Step ${i + 1} SLA hours`} />
                    <label className="flex items-center gap-1 text-[10px] text-[hsl(var(--text-3))] flex-shrink-0">
                      <input type="checkbox" checked={s.required} onChange={e => patchStep(i, { required: e.target.checked })} className="w-3.5 h-3.5 accent-[hsl(var(--brand))]" />
                      Req.
                    </label>
                    <button onClick={() => removeStep(i)} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]" aria-label={`Remove step ${i + 1}`}><Trash size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-[hsl(var(--text-2))]">
              <input type="checkbox" checked={requiresMfa} onChange={e => setRequiresMfa(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--brand))]" />
              Require MFA for approvals
            </label>
            <label className="flex items-center gap-2 text-xs text-[hsl(var(--text-2))]">
              <input type="checkbox" checked={notifyOnEscalation} onChange={e => setNotifyOnEscalation(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--brand))]" />
              Notify on escalation
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">Cancel</button>
          <button onClick={submit} disabled={!canSave || isSaving} className="px-4 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] bg-[hsl(var(--brand))] hover:opacity-90 disabled:opacity-50">
            {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New approval request dialog ───────────────────────────────────────────────

function NewRequestDialog({ models, workflows, currentUser, onClose, onSave }: {
  models: { id: string; name: string }[]
  workflows: ApprovalWorkflowRecord[]
  currentUser: string
  onClose: () => void
  onSave: (r: ApprovalRecord) => Promise<void>
}) {
  const [entityType, setEntityType] = useState('model')
  const [modelId, setModelId] = useState('')
  const [entityId, setEntityId] = useState('')
  const [entityName, setEntityName] = useState('')
  const [workflowId, setWorkflowId] = useState('none')
  const [requestedAction, setRequestedAction] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const isModel = entityType === 'model'
  const canSubmit = requestedAction.trim().length > 0 && (isModel ? !!modelId : entityName.trim().length > 0)

  const submit = async () => {
    if (!canSubmit || saving) return
    const model = models.find(m => m.id === modelId)
    // First-step SLA → real due date: when the chosen workflow's first step
    // declares sla_hours, the request starts with a due_at so it can become
    // honestly overdue.
    const wf = workflowId === 'none' ? undefined : workflows.find(w => w.id === workflowId)
    const firstSla = wf?.steps?.[0]?.sla_hours
    setSaving(true)
    try {
      await onSave({
        entityType,
        entityId: isModel ? modelId : (entityId.trim() || null),
        entityName: isModel ? (model?.name ?? null) : entityName.trim(),
        workflowId: workflowId === 'none' ? null : workflowId,
        requestedBy: currentUser,
        requestedAction: requestedAction.trim(),
        status: 'pending',
        reason: reason.trim() || null,
        stepIndex: 0,
        dueAt: firstSla ? new Date(Date.now() + firstSla * 3600 * 1000).toISOString() : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[500px] max-h-[85vh] overflow-y-auto bg-surface border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">New Approval Request</h2>
          <button onClick={onClose} aria-label="Close"><X size={16} className="text-[hsl(var(--text-4))]" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Entity Type *">
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className={INPUT_CLS}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Workflow">
              <Select value={workflowId} onValueChange={setWorkflowId}>
                <SelectTrigger className={INPUT_CLS}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="none">No workflow</SelectItem>
                  {workflows.filter(w => w.id).map(w => <SelectItem key={w.id} value={w.id!}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {isModel ? (
            <Field label="Model *" colSpan>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger className={INPUT_CLS}>
                  <SelectValue placeholder={models.length ? 'Select a registered model' : 'No models registered'} />
                </SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Entity Name *">
                <input value={entityName} onChange={e => setEntityName(e.target.value)} className={INPUT_CLS} placeholder="e.g. EXC-2026-704 retention extension" />
              </Field>
              <Field label="Entity ID (optional)">
                <input value={entityId} onChange={e => setEntityId(e.target.value)} className={INPUT_CLS} placeholder="Record id for deep-linking" />
              </Field>
            </div>
          )}
          <Field label="Requested Action *" colSpan>
            <input value={requestedAction} onChange={e => setRequestedAction(e.target.value)} className={INPUT_CLS} placeholder="e.g. promote_to_production" />
          </Field>
          <Field label="Reason" colSpan>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={INPUT_CLS + ' resize-none'} placeholder="Business justification for this request…" />
          </Field>
          <p className="text-[11px] text-[hsl(var(--text-4))]">Requested by {currentUser}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">Cancel</button>
          <button onClick={submit} disabled={!canSubmit || saving} className="px-4 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] bg-[hsl(var(--brand))] hover:opacity-90 disabled:opacity-50">
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">{label}</label>
      {children}
    </div>
  )
}
