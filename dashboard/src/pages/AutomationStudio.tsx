// SPDX-License-Identifier: Apache-2.0
// Automation Studio — governance automation rules on the real backend
// (automation_rules + automation_runs via useAutomationRules/useAutomationRuns).
// No simulated engine: "Validate" performs a real configuration check and
// records an honest 'validated'/'failed' run — nothing is executed and no
// synthetic outcome is invented. Toasts come from the hooks (sonner) only.
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Lightning, Plus, X, Play, Pause, Copy, MagnifyingGlass,
  CheckCircle, Warning, Trash, ArrowDown, ArrowRight, Robot, ListChecks,
} from '@phosphor-icons/react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { StatCardRow, type StatCardRowItem } from '../components/ui/StatCardRow'
import { useAutomationRules, useAutomationRuns, useValidateAutomationRule } from '../hooks/useRiskIncidents'
import { useAuthStore } from '../stores/authStore'
import type { AutomationRuleRecord } from '../services/oversightService'
import { formatDate, timeAgo } from '../data/seed'

// ── Vocabulary (matches the seeded automation_rules records) ─────────────────

const TRIGGER_TYPES = [
  { value: 'incident_created', label: 'Incident Created' },
  { value: 'model_drift', label: 'Model Drift' },
  { value: 'approval_required', label: 'Approval Required' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'manual', label: 'Manual' },
]

const ACTION_TYPES = [
  { value: 'create_hitl_review', label: 'Create HITL Review' },
  { value: 'create_approval', label: 'Create Approval Request' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'hold_deployments', label: 'Hold Deployments' },
  { value: 'notify', label: 'Notify Channel' },
]

const triggerLabel = (v?: string) => TRIGGER_TYPES.find(t => t.value === v)?.label ?? (v ? v.replace(/_/g, ' ') : 'Not configured')
const actionLabel = (v?: string) => ACTION_TYPES.find(a => a.value === v)?.label ?? (v ? v.replace(/_/g, ' ') : 'Unknown action')

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  active: { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  paused: { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  draft: { background: 'hsl(220 13% 50% / 0.12)', color: 'hsl(var(--text-4))' },
}

const RUN_STATUS_COLOR: Record<string, string> = {
  completed: 'hsl(var(--s-ok-tx))',
  validated: 'hsl(var(--s-in-tx))',
  failed: 'hsl(var(--destructive))',
}

// Config values round-trip as JSON where possible so arrays/numbers survive edits.
const configToRows = (cfg: Record<string, unknown> | undefined): [string, string][] =>
  Object.entries(cfg ?? {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])

const rowsToConfig = (rows: [string, string][]): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  rows.forEach(([k, v]) => {
    if (!k.trim()) return
    try { out[k.trim()] = JSON.parse(v) } catch { out[k.trim()] = v }
  })
  return out
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function AutomationStudio() {
  const { items: rules, isLoading, error, save, remove, isSaving } = useAutomationRules()
  const validate = useValidateAutomationRule()
  const user = useAuthStore(s => s.user)
  const currentUser = user?.fullName || user?.email || 'Reviewer'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'builder' | 'runs'>('overview')
  const [newOpen, setNewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AutomationRuleRecord | null>(null)

  const selected = useMemo(() => rules.find(r => r.id === selectedId) ?? null, [rules, selectedId])
  const runsQuery = useAutomationRuns(selected?.id)

  const filtered = useMemo(() => rules.filter(r => {
    const q = search.toLowerCase()
    const m = !q || r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q) || (r.ruleRef ?? '').toLowerCase().includes(q)
    const s = statusFilter === 'all' || r.status === statusFilter
    return m && s
  }), [search, statusFilter, rules])

  // KPIs — derived from real rule records only.
  const activeCount = rules.filter(r => r.status === 'active').length
  const draftCount = rules.filter(r => r.status === 'draft').length
  const totalRuns = rules.reduce((s, r) => s + (r.runCount ?? 0), 0)
  const lastActivity = rules
    .map(r => r.lastRunAt)
    .filter((d): d is string => !!d)
    .sort()
    .pop()

  const kpis: StatCardRowItem[] = [
    { label: 'Active Rules', value: String(activeCount), icon: <Lightning size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} /> },
    { label: 'Drafts', value: String(draftCount), icon: <ListChecks size={18} style={{ color: 'hsl(var(--text-3))' }} /> },
    { label: 'Recorded Runs', value: totalRuns.toLocaleString(), icon: <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} /> },
    { label: 'Last Activity', value: lastActivity ? timeAgo(lastActivity) : '—', icon: <Play size={18} style={{ color: 'hsl(var(--s-in-tx))' }} /> },
  ]

  const toggleStatus = async (rule: AutomationRuleRecord) => {
    const next = rule.status === 'active' ? 'paused' : 'active'
    try { await save({ ...rule, status: next }) } catch { /* hook toasts */ }
  }

  const cloneRule = async (rule: AutomationRuleRecord) => {
    try {
      await save({ ...rule, id: undefined, ruleRef: undefined, name: `${rule.name} (copy)`, status: 'draft', createdBy: currentUser })
    } catch { /* hook toasts */ }
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await remove(deleteTarget.id)
      if (selectedId === deleteTarget.id) setSelectedId(null)
      setDeleteTarget(null)
    } catch { /* hook toasts */ }
  }

  const runValidation = (rule: AutomationRuleRecord) => {
    // Records an honest 'validated'/'failed' run — nothing is executed.
    validate.mutate(rule)
  }

  if (isLoading) return <PageSkeleton title="Automation Studio" showStats rows={5} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Governance Automation Studio"
        subtitle="Rules that route governance events to human oversight — validated honestly, never simulated"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Oversight' }, { label: 'Automation Studio' }]}
        actions={
          <button onClick={() => setNewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium hover:opacity-90"
            style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <Plus size={14} /> New Rule
          </button>
        }
      />

      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load automation rules</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      <StatCardRow cards={kpis} />

      {/* Cross-link to the agent orchestration domain */}
      <div className="flex items-center gap-3 p-3 border"
        style={{ borderColor: 'hsl(var(--s-in-bg))', background: 'hsl(var(--s-in-bg))' }}>
        <Robot size={16} style={{ color: 'hsl(var(--s-in-tx))' }} className="flex-shrink-0" />
        <p className="text-xs flex-1" style={{ color: 'hsl(var(--text-2))' }}>
          <span className="font-semibold" style={{ color: 'hsl(var(--s-in-tx))' }}>Looking for multi-agent orchestration?</span>{' '}
          These rules route governance events to human review. Agent-to-agent choreography lives in its own module.
        </p>
        <Link to="/multi-agent" className="flex items-center gap-1 text-xs font-medium hover:underline flex-shrink-0" style={{ color: 'hsl(var(--s-in-tx))' }}>
          Open Choreography <ArrowRight size={12} />
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules…"
            className="w-full pl-9 pr-3 py-2 text-sm border bg-surface text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All statuses</SelectItem>
            {['active', 'paused', 'draft'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="flex items-center text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>
          {filtered.length} of {rules.length}
        </span>
      </div>

      {/* Rule list */}
      <div className="space-y-2.5">
        {filtered.map(rule => (
          <div key={rule.id} className="border transition-colors hover:border-[hsl(var(--brand)/0.3)]"
            style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', borderLeft: `3px solid ${rule.status === 'active' ? 'hsl(var(--s-ok-tx))' : 'transparent'}` }}>
            <div className="flex items-start gap-4 p-4">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedId(rule.id ?? null); setDrawerTab('overview') }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {rule.ruleRef && <span className="font-mono text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{rule.ruleRef}</span>}
                  <span className="text-[11px] px-2 py-0.5 font-medium capitalize" style={STATUS_STYLE[rule.status] ?? STATUS_STYLE.draft}>{rule.status}</span>
                  <span className="text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{triggerLabel(rule.triggerType)}</span>
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{rule.name}</h3>
                {rule.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'hsl(var(--text-4))' }}>{rule.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                  <span>{rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}</span>
                  <span>{rule.runCount > 0 ? `${rule.runCount.toLocaleString()} recorded run${rule.runCount !== 1 ? 's' : ''}` : 'Not run yet'}</span>
                  {rule.lastRunAt && <span>Last run {timeAgo(rule.lastRunAt)}</span>}
                  {rule.lastRunStatus && (
                    <span className="font-medium capitalize" style={{ color: RUN_STATUS_COLOR[rule.lastRunStatus] ?? 'hsl(var(--text-3))' }}>
                      {rule.lastRunStatus}
                    </span>
                  )}
                  {rule.createdBy && <span>By {rule.createdBy}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => runValidation(rule)} disabled={validate.isPending}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border transition-colors hover:bg-raised disabled:opacity-50"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}
                  title="Check the configuration and record an honest validation run — nothing is executed">
                  <CheckCircle size={11} /> {validate.isPending ? 'Validating…' : 'Validate'}
                </button>
                <button onClick={() => cloneRule(rule)} disabled={isSaving} title="Clone as draft" className="p-2 border hover:bg-raised disabled:opacity-50"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>
                  <Copy size={13} />
                </button>
                <button onClick={() => toggleStatus(rule)} disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border transition-colors disabled:opacity-50"
                  style={rule.status === 'active'
                    ? { borderColor: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
                    : { borderColor: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>
                  {rule.status === 'active' ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Activate</>}
                </button>
                <button onClick={() => setDeleteTarget(rule)} className="p-2 border hover:bg-[hsl(var(--s-er-bg))]"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--s-er-tx))' }} title="Delete">
                  <Trash size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
            {rules.length === 0
              ? 'No automation rules configured yet — create one to route governance events to human oversight.'
              : 'No rules match your search.'}
          </div>
        )}
      </div>

      {/* ── Detail drawer ─────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedId(null)} />
          <div className="w-[560px] flex flex-col h-full border-l"
            style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>

            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  {selected.ruleRef && <p className="font-mono text-[10px]" style={{ color: 'hsl(var(--brand))' }}>{selected.ruleRef}</p>}
                  <span className="text-[11px] px-2 py-0.5 font-medium capitalize" style={STATUS_STYLE[selected.status] ?? STATUS_STYLE.draft}>{selected.status}</span>
                </div>
                <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selected.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                  Trigger: {triggerLabel(selected.triggerType)}{selected.createdAt ? ` · Created ${formatDate(selected.createdAt)}` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-1 flex-shrink-0" aria-label="Close">
                <X size={18} style={{ color: 'hsl(var(--text-4))' }} />
              </button>
            </div>

            {/* Drawer tabs */}
            <div className="flex border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              {([['overview', 'Overview'], ['builder', 'Rule Builder'], ['runs', 'Run History']] as const).map(([t, l]) => (
                <button key={t} onClick={() => setDrawerTab(t)} className="flex-1 py-2.5 text-[11px] font-medium transition-colors"
                  style={drawerTab === t ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
                  {l}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === 'overview' && (
                <>
                  {selected.description && <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Trigger', value: triggerLabel(selected.triggerType) },
                      { label: 'Status', value: selected.status },
                      { label: 'Recorded Runs', value: selected.runCount.toLocaleString() },
                      { label: 'Last Run', value: selected.lastRunAt ? timeAgo(selected.lastRunAt) : 'Never' },
                      { label: 'Last Run Status', value: selected.lastRunStatus ?? '—' },
                      { label: 'Actions', value: `${selected.actions.length} configured` },
                      { label: 'Created By', value: selected.createdBy ?? '—' },
                      { label: 'Created', value: selected.createdAt ? formatDate(selected.createdAt) : '—' },
                    ].map(f => (
                      <div key={f.label} className="p-3 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                        <p className="text-[10px] uppercase" style={{ color: 'hsl(var(--text-4))' }}>{f.label}</p>
                        <p className="text-xs font-medium mt-0.5 capitalize" style={{ color: 'hsl(var(--text-1))' }}>{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: 'hsl(var(--text-3))' }}>Actions</p>
                    {selected.actions.length === 0 ? (
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No actions configured — add them in the Rule Builder.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selected.actions.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                            <span className="text-[10px] w-4" style={{ color: 'hsl(var(--text-4))' }}>{i + 1}.</span>
                            <Lightning size={11} style={{ color: 'hsl(var(--brand))' }} />
                            <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{actionLabel(a.type)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {drawerTab === 'builder' && (
                <RuleBuilder
                  key={selected.id}
                  rule={selected}
                  isSaving={isSaving}
                  onSave={async (draft) => {
                    try { await save(draft) } catch { /* hook toasts */ }
                  }}
                />
              )}

              {drawerTab === 'runs' && (
                <>
                  <p className="text-[11px] font-semibold uppercase" style={{ color: 'hsl(var(--text-3))' }}>
                    Run History {runsQuery.data && runsQuery.data.length > 0 ? `(${runsQuery.data.length})` : ''}
                  </p>
                  {runsQuery.isLoading && (
                    <p className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>Loading run history…</p>
                  )}
                  {runsQuery.error != null && (
                    <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-3">
                      <p className="text-xs text-[hsl(var(--destructive))]">{(runsQuery.error as Error).message}</p>
                    </div>
                  )}
                  {!runsQuery.isLoading && !runsQuery.error && (runsQuery.data ?? []).length === 0 && (
                    <div className="text-center py-10 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      No runs recorded for this rule yet.<br />
                      <span className="text-xs">Use <strong>Validate</strong> to record an honest configuration check — nothing is executed.</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {(runsQuery.data ?? []).map(run => (
                      <div key={run.id} className="p-3 border"
                        style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                            style={{ background: RUN_STATUS_COLOR[run.status] ?? 'hsl(var(--text-4))' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold capitalize" style={{ color: 'hsl(var(--text-1))' }}>{run.status}</p>
                              <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                                {run.actionsRun != null ? `${run.actionsRun} action${run.actionsRun !== 1 ? 's' : ''} · ` : ''}
                                {run.startedAt ? timeAgo(run.startedAt) : ''}
                              </span>
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                              {run.startedAt ? new Date(run.startedAt).toLocaleString() : ''}{run.triggerSource ? ` · ${run.triggerSource.replace(/_/g, ' ')}` : ''}
                            </p>
                            {run.log.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {run.log.map((l, i) => (
                                  <p key={i} className="text-[10px]" style={{ color: 'hsl(var(--text-3))' }}>· {l.message}</p>
                                ))}
                              </div>
                            )}
                            {run.error && (
                              <p className="text-[10px] mt-1 italic" style={{ color: 'hsl(var(--s-er-tx))' }}>{run.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t flex gap-2" style={{ borderColor: 'hsl(var(--border))' }}>
              <button onClick={() => runValidation(selected)} disabled={validate.isPending}
                className="flex-1 py-2 border text-sm transition-colors hover:bg-raised flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                <CheckCircle size={13} />
                {validate.isPending ? 'Validating…' : 'Validate'}
              </button>
              <button onClick={() => toggleStatus(selected)} disabled={isSaving}
                className="flex-1 py-2 border text-sm transition-colors hover:bg-raised disabled:opacity-50"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                {selected.status === 'active' ? 'Pause' : 'Activate'}
              </button>
              <button onClick={() => cloneRule(selected)} disabled={isSaving}
                className="flex-1 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
                Clone as Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New rule dialog ───────────────────────────────────────────────── */}
      <NewRuleDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        isSaving={isSaving}
        currentUser={currentUser}
        onCreate={async (draft) => {
          try {
            const created = await save(draft)
            setNewOpen(false)
            if (created?.id) { setSelectedId(created.id); setDrawerTab('builder') }
          } catch { /* hook toasts; keep dialog open */ }
        }}
      />

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        type="danger"
        title="Delete Rule"
        description={`Delete "${deleteTarget?.name}"? The rule stops firing immediately. This cannot be undone.`}
        confirmLabel="Delete Rule"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ── Rule Builder — edits trigger + actions, persists via save() ──────────────

function RuleBuilder({ rule, isSaving, onSave }: {
  rule: AutomationRuleRecord
  isSaving: boolean
  onSave: (r: AutomationRuleRecord) => Promise<void>
}) {
  const [triggerType, setTriggerType] = useState(rule.triggerType ?? 'manual')
  const [triggerRows, setTriggerRows] = useState<[string, string][]>(configToRows(rule.triggerConfig))
  const [actions, setActions] = useState<{ type: string; rows: [string, string][] }[]>(
    rule.actions.map(a => ({ type: a.type, rows: configToRows(a.config) }))
  )
  const [dirty, setDirty] = useState(false)

  const touch = () => setDirty(true)

  const addAction = (type: string) => { setActions(prev => [...prev, { type, rows: [] }]); touch() }
  const removeAction = (i: number) => { setActions(prev => prev.filter((_, idx) => idx !== i)); touch() }

  const submit = async () => {
    if (!actions.length) { toast.error('A rule needs at least one action.'); return }
    await onSave({
      ...rule,
      triggerType,
      triggerConfig: rowsToConfig(triggerRows),
      actions: actions.map(a => ({ type: a.type, config: rowsToConfig(a.rows) })),
    })
    setDirty(false)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-5 top-4 bottom-4 w-px" style={{ background: 'hsl(var(--border))' }} />

        {/* Trigger node */}
        <div className="relative pl-12">
          <div className="absolute left-[17px] top-4 w-3.5 h-3.5 rounded-full border-2 z-10"
            style={{ borderColor: 'hsl(var(--s-in-tx))', background: 'hsl(var(--bg-surface))' }} />
          <div className="border p-3 space-y-2" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 font-semibold uppercase"
                style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}>Trigger</span>
              <Select value={triggerType} onValueChange={v => { setTriggerType(v); touch() }}>
                <SelectTrigger className="h-8 text-xs flex-1" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ConfigRows rows={triggerRows} onChange={rows => { setTriggerRows(rows); touch() }} />
          </div>
          <div className="flex justify-start pl-5 py-1">
            <ArrowDown size={10} style={{ color: 'hsl(var(--text-4))' }} />
          </div>
        </div>

        {/* Action nodes */}
        {actions.map((a, i) => (
          <div key={i} className="relative pl-12">
            <div className="absolute left-[17px] top-4 w-3.5 h-3.5 rounded-full border-2 z-10"
              style={{ borderColor: 'hsl(var(--s-ok-tx))', background: 'hsl(var(--bg-surface))' }} />
            <div className="border p-3 space-y-2" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 font-semibold uppercase"
                    style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>Action</span>
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{actionLabel(a.type)}</span>
                </div>
                <button onClick={() => removeAction(i)} className="p-1 hover:bg-surface" title="Remove action" aria-label={`Remove action ${i + 1}`}>
                  <Trash size={11} style={{ color: 'hsl(var(--s-er-tx))' }} />
                </button>
              </div>
              <ConfigRows rows={a.rows} onChange={rows => { setActions(prev => prev.map((x, idx) => idx === i ? { ...x, rows } : x)); touch() }} />
            </div>
            {i < actions.length - 1 && (
              <div className="flex justify-start pl-5 py-1">
                <ArrowDown size={10} style={{ color: 'hsl(var(--text-4))' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add action */}
      <div className="border border-dashed p-3" style={{ borderColor: 'hsl(var(--border))' }}>
        <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'hsl(var(--text-4))' }}>Add Action</p>
        <div className="flex flex-wrap gap-1.5">
          {ACTION_TYPES.map(a => (
            <button key={a.value} onClick={() => addAction(a.value)}
              className="text-[10px] px-2 py-1 border transition-colors hover:border-[hsl(var(--brand)/0.4)] hover:text-[hsl(var(--brand))]"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
              + {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {dirty
          ? <p className="text-[10px]" style={{ color: 'hsl(var(--s-wn-tx))' }}>Unsaved changes</p>
          : <span />}
        <Button
          onClick={submit}
          disabled={!dirty || isSaving}
          style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
        >
          {isSaving ? 'Saving…' : 'Save Rule'}
        </Button>
      </div>
    </div>
  )
}

// Editable key/value config rows (values round-trip through JSON when possible).
function ConfigRows({ rows, onChange }: {
  rows: [string, string][]
  onChange: (rows: [string, string][]) => void
}) {
  return (
    <div className="space-y-1.5">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={k} onChange={e => onChange(rows.map((r, idx) => idx === i ? [e.target.value, r[1]] : r))}
            className="w-32 px-2 py-1 text-[10px] font-mono border bg-surface text-[hsl(var(--text-2))] focus:outline-none focus:border-[hsl(var(--brand))]"
            style={{ borderColor: 'hsl(var(--border))' }} placeholder="key" aria-label={`Config key ${i + 1}`} />
          <input value={v} onChange={e => onChange(rows.map((r, idx) => idx === i ? [r[0], e.target.value] : r))}
            className="flex-1 px-2 py-1 text-[10px] font-mono border bg-surface text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]"
            style={{ borderColor: 'hsl(var(--border))' }} placeholder="value" aria-label={`Config value ${i + 1}`} />
          <button onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="p-1" title="Remove" aria-label={`Remove config row ${i + 1}`}>
            <X size={10} style={{ color: 'hsl(var(--text-4))' }} />
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...rows, ['', '']])}
        className="text-[10px] px-2 py-0.5 border transition-colors hover:text-[hsl(var(--brand))]"
        style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>
        + config entry
      </button>
    </div>
  )
}

// ── New rule dialog ───────────────────────────────────────────────────────────

function NewRuleDialog({ open, onOpenChange, isSaving, currentUser, onCreate }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSaving: boolean
  currentUser: string
  onCreate: (r: AutomationRuleRecord) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('')
  const [selectedActions, setSelectedActions] = useState<string[]>([])

  const toggleAction = (a: string) =>
    setSelectedActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const canCreate = name.trim().length > 0 && !!triggerType && selectedActions.length > 0

  const submit = () => {
    if (!canCreate) {
      toast.error('Name, trigger type and at least one action are required.')
      return
    }
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      status: 'draft',
      triggerType,
      triggerConfig: {},
      actions: selectedActions.map(type => ({ type, config: {} })),
      runCount: 0,
      createdBy: currentUser,
    }).then(() => {
      setName(''); setDescription(''); setTriggerType(''); setSelectedActions([])
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
        <DialogHeader>
          <DialogTitle>Create Automation Rule</DialogTitle>
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            The rule is created as a draft. Configure trigger and action details in the Rule Builder, then activate it.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Rule Name <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
            <Input placeholder="e.g. Critical incident → HITL escalation" value={name}
              onChange={e => setName(e.target.value)} style={{ borderRadius: 0 }} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea placeholder="Describe what this rule automates and when it fires…" rows={2}
              value={description} onChange={e => setDescription(e.target.value)} style={{ borderRadius: 0 }} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Trigger Type <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger style={{ borderRadius: 0 }}>
                <SelectValue placeholder="Select trigger…" />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Actions <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
            <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>Select one or more actions to perform when the trigger fires:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ACTION_TYPES.map(a => {
                const isSelected = selectedActions.includes(a.value)
                return (
                  <button key={a.value} type="button" onClick={() => toggleAction(a.value)}
                    className="flex items-center gap-2 p-2.5 border text-left text-xs transition-colors"
                    style={{
                      background: isSelected ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-raised))',
                      borderColor: isSelected ? 'hsl(var(--brand)/0.3)' : 'hsl(var(--border))',
                      color: isSelected ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                    }}>
                    <Lightning size={12} />
                    <span className="flex-1">{a.label}</span>
                    {isSelected && <CheckCircle size={11} />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 border" style={{ background: 'hsl(var(--s-in-bg))', borderColor: 'hsl(var(--s-in-bg))' }}>
            <Warning size={13} style={{ color: 'hsl(var(--s-in-tx))', flexShrink: 0, marginTop: 1 }} />
            <p className="text-[11px]" style={{ color: 'hsl(var(--text-2))' }}>
              Rules never execute from this screen. <strong>Validate</strong> records an honest configuration check in the run history — no synthetic runs are ever created.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
            onClick={submit}
            disabled={!canCreate || isSaving}
          >
            {isSaving ? 'Creating…' : 'Create Draft Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
