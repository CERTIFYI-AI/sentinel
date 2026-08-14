// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MultiAgentChoreography — multi-agent workflows persisted to the org-scoped
// agent_workflows table. Orchestrator/worker agents are canonical
// agent_gov_registry ids (names resolved at render time) with pill links to
// /agents?open=<id>. Honors ?agent=<id> filters (dismissible chip)
// and ?open=<workflow id> deep links.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { exportCsv } from '@/lib/exportUtils'
import { Plus, X, Export, ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { agentRecordHooks } from '@/hooks/queries/useAgentGovCrud'
import { useAuthStore } from '@/store/authStore'
import {
  fetchWorkflows, createWorkflow, updateWorkflow,
  type AgentWorkflow, type AgentWorkflowInput,
} from '@/services/agentWorkflowService'

const WORKFLOWS_KEY = ['agent_workflows']

const pillCls = 'inline-flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-2 py-[2px] text-[11px] font-medium whitespace-nowrap'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  running: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  completed: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  failed: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  terminated: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  paused: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  awaiting_approval: { bg: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' },
}
const FALLBACK_STYLE = { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }
const statusStyle = (s: string | null) => (s ? STATUS_STYLE[s.toLowerCase()] ?? FALLBACK_STYLE : FALLBACK_STYLE)
const prettyStatus = (s: string | null) => (s ? s.replace(/_/g, ' ') : 'unknown')

const fmt = (ts: string | null | undefined) => (ts ? new Date(ts).toLocaleString() : '—')

const TRIGGER_TYPES = ['Manual', 'Scheduled', 'Event-driven', 'API', 'Webhook']

export default function MultiAgentChoreography() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const user = useAuthStore(s => s.user)
  const operator = user?.name || user?.email || 'Unknown operator'
  const agentFilter = params.get('agent')

  const { data: workflows = [], isLoading, isError, refetch } = useQuery({
    queryKey: WORKFLOWS_KEY,
    queryFn: fetchWorkflows,
    staleTime: 30_000,
  })
  const { data: agents = [] } = agentRecordHooks.useList()

  const create = useMutation({
    mutationFn: (input: AgentWorkflowInput & { name: string }) => createWorkflow(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AgentWorkflowInput }) => updateWorkflow(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  })

  const [selected, setSelected] = useState<AgentWorkflow | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'agents' | 'runs'>('overview')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [terminateTarget, setTerminateTarget] = useState<AgentWorkflow | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newWfName, setNewWfName] = useState('')
  const [newWfDescription, setNewWfDescription] = useState('')
  const [newWfTrigger, setNewWfTrigger] = useState('Manual')
  const [newWfOrch, setNewWfOrch] = useState('')
  const [newWfWorkers, setNewWfWorkers] = useState<string[]>([])
  const [newWfSteps, setNewWfSteps] = useState('')

  // Honor ?open=<workflow id> once the list has loaded.
  const openedRef = useRef(false)
  useEffect(() => {
    const openId = params.get('open')
    if (!openId || openedRef.current || workflows.length === 0) return
    const wf = workflows.find(w => w.id === openId)
    if (wf) {
      openedRef.current = true
      setSelected(wf)
      setDrawerTab('overview')
      const next = new URLSearchParams(params)
      next.delete('open')
      setParams(next, { replace: true })
    }
  }, [params, workflows, setParams])

  const agentName = (id: string | null, storedName?: string) => {
    if (!id) return storedName ?? null
    return agents.find(a => a.id === id)?.name ?? storedName ?? null
  }

  const clearAgentFilter = () => {
    const next = new URLSearchParams(params)
    next.delete('agent')
    setParams(next, { replace: true })
  }

  const statusOptions = useMemo(() => {
    const s = new Set<string>()
    workflows.forEach(w => { if (w.status) s.add(w.status) })
    return ['All', ...Array.from(s).sort()]
  }, [workflows])

  const filtered = workflows.filter(w => {
    const q = search.toLowerCase()
    const orchName = agentName(w.agents.orchestratorId, w.agents.orchestratorName) ?? ''
    const ms = w.name.toLowerCase().includes(q) || orchName.toLowerCase().includes(q) || (w.owner ?? '').toLowerCase().includes(q)
    const byAgent = !agentFilter || w.agents.orchestratorId === agentFilter || w.agents.workerIds.includes(agentFilter)
    return ms && byAgent && (statusFilter === 'All' || w.status === statusFilter)
  })

  const stats = {
    total: workflows.length,
    running: workflows.filter(w => w.status === 'running').length,
    failed: workflows.filter(w => w.status === 'failed' || w.status === 'terminated').length,
    totalRuns: workflows.reduce((s, w) => s + w.runCount, 0),
  }

  const handleExport = () => {
    if (filtered.length === 0) { toast.info('No workflows to export.'); return }
    exportCsv(
      filtered.map(w => ({
        id: w.id,
        name: w.name,
        status: w.status ?? '',
        orchestrator_id: w.agents.orchestratorId ?? '',
        orchestrator: agentName(w.agents.orchestratorId, w.agents.orchestratorName) ?? '',
        worker_ids: w.agents.workerIds.join('; '),
        workers: w.agents.workerIds.map(id => agentName(id) ?? 'Unavailable').join('; '),
        steps: w.steps.map(s => s.name).join('; '),
        trigger: w.triggers?.type ?? '',
        owner: w.owner ?? '',
        run_count: w.runCount,
        last_run_at: w.lastRunAt ?? '',
        last_run_status: w.lastRunStatus ?? '',
        created_at: w.createdAt,
      })),
      'agent-workflows.csv',
    )
  }

  const persist = (wf: AgentWorkflow, patch: AgentWorkflowInput, onDone: (updated: AgentWorkflow) => string) => {
    update.mutate({ id: wf.id, patch }, {
      onSuccess: updated => { setSelected(prev => (prev?.id === updated.id ? updated : prev)); toast.success(onDone(updated)) },
      onError: err => toast.error(err instanceof Error ? err.message : 'Failed to update workflow'),
    })
  }

  const handleApprove = (wf: AgentWorkflow) =>
    persist(wf, { status: 'running', lastRunAt: new Date().toISOString(), lastRunStatus: 'running' }, () => 'Workflow approved — resuming execution')

  const handleRetry = (wf: AgentWorkflow) =>
    persist(wf, { status: 'running', runCount: wf.runCount + 1, lastRunAt: new Date().toISOString(), lastRunStatus: 'running' }, u => `Retry started — run #${u.runCount}`)

  const handleTerminate = (wf: AgentWorkflow) =>
    persist(wf, { status: 'terminated', lastRunStatus: 'terminated' }, () => `Workflow "${wf.name}" terminated`)

  const handleCreate = () => {
    if (!newWfName.trim()) { toast.error('Workflow name is required'); return }
    if (!newWfOrch) { toast.error('Select an orchestrator agent from the registry'); return }
    const workerIds = newWfWorkers.filter(id => id !== newWfOrch)
    const steps = newWfSteps.split('\n').map(s => s.trim()).filter(Boolean).map(name => ({ name }))
    create.mutate({
      name: newWfName.trim(),
      description: newWfDescription.trim() || null,
      status: 'awaiting_approval',
      agents: {
        orchestratorId: newWfOrch,
        workerIds,
        orchestratorName: agentName(newWfOrch) ?? undefined,
        workerNames: workerIds.map(id => agentName(id) ?? 'Unavailable'),
      },
      steps,
      triggers: { type: newWfTrigger },
      owner: operator,
      runCount: 0,
    }, {
      onSuccess: wf => { toast.success(`Workflow "${wf.name}" created`); setShowCreate(false) },
      onError: err => toast.error(err instanceof Error ? err.message : 'Failed to create workflow'),
    })
  }

  const openCreate = () => {
    setNewWfName(''); setNewWfDescription(''); setNewWfTrigger('Manual')
    setNewWfOrch(''); setNewWfWorkers([]); setNewWfSteps('')
    setShowCreate(true)
  }

  /** Registry pill: link when the agent id resolves, honest "Unavailable" otherwise. */
  const agentPillById = (id: string | null, storedName?: string) => {
    const name = agentName(id, storedName)
    return id ? (
      <Link
        key={id}
        to={`/agents?open=${id}`}
        onClick={e => e.stopPropagation()}
        className={`${pillCls} text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))] hover:underline`}
        aria-label={`Open ${name ?? 'agent'} in Agent Registry`}
      >
        {name ?? 'Unavailable'}
      </Link>
    ) : (
      <span className={`${pillCls} text-[hsl(var(--text-4))]`}>{name ?? 'Unavailable'}</span>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Multi-Agent Choreography"
        subtitle="Multi-agent workflows — orchestration state, agent chains, and approval gates"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Agents' }, { label: 'Choreography' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
              <Export size={14} /> Export CSV
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm hover:opacity-90">
              <Plus size={14} /> New Workflow
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Running', value: stats.running, color: 'hsl(var(--s-in-tx))' },
          { label: 'Failed / Terminated', value: stats.failed, color: 'hsl(var(--destructive))' },
          { label: 'Total Runs', value: stats.totalRuns, color: 'hsl(var(--brand))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {agentFilter && (
        <div className="flex items-center gap-2">
          <span className={`${pillCls} gap-1 text-[hsl(var(--brand))]`}>
            Filtered to {agentName(agentFilter) ?? 'Unavailable'}
            <button type="button" aria-label="Clear agent filter" onClick={clearAgentFilter} className="ml-1 hover:text-[hsl(var(--text-1))]">
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 border border-[hsl(var(--border))] bg-surface px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows…" aria-label="Search workflows" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ borderRadius: 0 }} aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All' : prettyStatus(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : isError ? (
        <ErrorState message="Failed to load workflows." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        agentFilter ? (
          <EmptyState
            title="No workflows involve this agent"
            message="No workflows reference this agent as orchestrator or worker. Clear the filter to see all workflows."
            actionLabel="Clear filter"
            onAction={clearAgentFilter}
          />
        ) : workflows.length === 0 ? (
          <EmptyState
            title="No workflows yet"
            message="Create a workflow to choreograph orchestrator and worker agents from the registry."
            actionLabel="New Workflow"
            onAction={openCreate}
          />
        ) : (
          <EmptyState title="No workflows match the current filters" message="Adjust the search or status filter to see more workflows." />
        )
      ) : (
        <div className="space-y-3">
          {filtered.map(w => (
            <div
              key={w.id}
              role="button"
              tabIndex={0}
              aria-label={`Open workflow ${w.name}`}
              className="rounded border border-[hsl(var(--border))] bg-surface p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors focus:outline-none focus:border-[hsl(var(--brand))]"
              onClick={() => { setSelected(w); setDrawerTab('overview') }}
              onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSelected(w); setDrawerTab('overview') } }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] px-2 py-0.5 font-medium capitalize" style={statusStyle(w.status)}>{prettyStatus(w.status)}</span>
                    {w.triggers?.type && <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{w.triggers.type}</span>}
                  </div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] truncate">{w.name}</h3>
                  {w.description && <p className="text-xs text-[hsl(var(--text-4))] mt-0.5 truncate">{w.description}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-[hsl(var(--text-4))]">Last run: {fmt(w.lastRunAt)}</p>
                  {w.lastRunStatus && <p className="text-xs font-medium text-[hsl(var(--text-3))] capitalize">{prettyStatus(w.lastRunStatus)}</p>}
                </div>
              </div>

              {/* Agent chain — pill links into the registry */}
              <div className="flex items-center gap-1 flex-wrap">
                {agentPillById(w.agents.orchestratorId, w.agents.orchestratorName)}
                {w.agents.workerIds.map((id, i) => (
                  <div key={id} className="flex items-center gap-1">
                    <ArrowRight size={10} className="text-[hsl(var(--text-4))]" />
                    {agentPillById(id, w.agents.workerNames?.[i])}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                <span className="text-[11px] text-[hsl(var(--text-4))]">{w.steps.length} step{w.steps.length !== 1 ? 's' : ''}</span>
                <span className="text-[11px] text-[hsl(var(--text-4))]">Runs: {w.runCount}</span>
                <span className="ml-auto text-[11px] text-[hsl(var(--text-4))]">Owner: {w.owner ?? '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full" role="dialog" aria-modal="true" aria-label="Workflow detail">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.name}</h2>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">Created {fmt(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close workflow detail"><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>

            <div className="flex border-b border-[hsl(var(--border))] flex-shrink-0">
              {([['overview', 'Overview'], ['agents', 'Agents'], ['runs', 'Runs']] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setDrawerTab(tab)} className="flex-1 py-2.5 text-[11px] font-medium transition-colors" style={drawerTab === tab ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === 'overview' && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 font-medium capitalize" style={statusStyle(selected.status)}>{prettyStatus(selected.status)}</span>
                    {selected.triggers?.type && <span className="text-[11px] px-2 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.triggers.type}</span>}
                  </div>
                  {selected.description && <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">{selected.description}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Owner', value: selected.owner ?? '—' },
                      { label: 'Trigger', value: selected.triggers?.type ?? '—' },
                      { label: 'Created', value: fmt(selected.createdAt) },
                      { label: 'Updated', value: fmt(selected.updatedAt) },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                        <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Steps ({selected.steps.length})</p>
                    {selected.steps.length ? (
                      <div className="space-y-1">
                        {selected.steps.map((s, i) => (
                          <div key={`${i}-${s.name}`} className="flex items-center gap-3 p-2.5 bg-raised border border-[hsl(var(--border))]">
                            <span className="text-[10px] font-mono text-[hsl(var(--text-4))] w-4">#{i + 1}</span>
                            <p className="text-xs font-medium text-[hsl(var(--text-2))]">{s.name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[hsl(var(--text-4))]">No steps defined.</p>
                    )}
                  </div>
                </>
              )}

              {drawerTab === 'agents' && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Orchestrator</p>
                    <div className="flex items-center gap-2 p-3 bg-[hsl(var(--brand)/0.08)] border border-[hsl(var(--brand)/0.25)]">
                      <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand))]" />
                      {agentPillById(selected.agents.orchestratorId, selected.agents.orchestratorName)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Worker Agents ({selected.agents.workerIds.length})</p>
                    {selected.agents.workerIds.length ? (
                      <div className="space-y-2">
                        {selected.agents.workerIds.map((id, i) => (
                          <div key={id} className="flex items-center gap-3 p-2.5 bg-raised border border-[hsl(var(--border))]">
                            <span className="text-[10px] font-mono text-[hsl(var(--text-4))] w-4">#{i + 1}</span>
                            <ArrowRight size={10} className="text-[hsl(var(--text-4))]" />
                            {agentPillById(id, selected.agents.workerNames?.[i])}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[hsl(var(--text-4))]">No worker agents assigned.</p>
                    )}
                  </div>
                </>
              )}

              {drawerTab === 'runs' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Run Count', value: String(selected.runCount) },
                      { label: 'Last Run Status', value: selected.lastRunStatus ? prettyStatus(selected.lastRunStatus) : '—' },
                      { label: 'Last Run At', value: fmt(selected.lastRunAt) },
                      { label: 'Current Status', value: prettyStatus(selected.status) },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                        <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5 capitalize">{value}</p>
                      </div>
                    ))}
                  </div>
                  {selected.runCount === 0 && (
                    <p className="text-xs text-[hsl(var(--text-4))]">This workflow has not run yet.</p>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2 flex-shrink-0">
              {(selected.status === 'awaiting_approval' || selected.status === 'paused') && (
                <button onClick={() => handleApprove(selected)} disabled={update.isPending} className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90 disabled:opacity-40">Approve & Resume</button>
              )}
              {(selected.status === 'running' || selected.status === 'awaiting_approval' || selected.status === 'paused') && (
                <button onClick={() => setTerminateTarget(selected)} disabled={update.isPending} className="px-4 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm hover:bg-[hsl(var(--s-er-bg))] disabled:opacity-40">Terminate</button>
              )}
              {(selected.status === 'failed' || selected.status === 'terminated') && (
                <button onClick={() => handleRetry(selected)} disabled={update.isPending} className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90 disabled:opacity-40">Retry Workflow</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-surface border border-[hsl(var(--border))] w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label="New workflow">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="font-semibold text-[hsl(var(--text-1))]">New Workflow</h2>
              <button onClick={() => setShowCreate(false)} aria-label="Close new workflow dialog"><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Workflow Name *</label>
                <input value={newWfName} onChange={e => setNewWfName(e.target.value)} placeholder="e.g. Monthly Bias Audit — Loan Model"
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Description</label>
                <textarea value={newWfDescription} onChange={e => setNewWfDescription(e.target.value)} rows={2} placeholder="What does this workflow do?"
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Orchestrator Agent *</label>
                {agents.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-4))] mt-1">No agents in the registry yet — register agents in the <Link to="/agents" className="text-[hsl(var(--brand))] hover:underline">Agent Registry</Link> first.</p>
                ) : (
                  <Select value={newWfOrch} onValueChange={setNewWfOrch}>
                    <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }} aria-label="Orchestrator agent"><SelectValue placeholder="Select from Agent Registry" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.status})</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {agents.length > 0 && (
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Worker Agents</label>
                  <div className="mt-1 max-h-36 overflow-y-auto border border-[hsl(var(--border))] p-2 space-y-1">
                    {agents.filter(a => a.id !== newWfOrch).map(a => (
                      <label key={a.id} className="flex items-center gap-2 text-xs text-[hsl(var(--text-2))] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWfWorkers.includes(a.id)}
                          onChange={e => setNewWfWorkers(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id))}
                        />
                        {a.name} <span className="text-[hsl(var(--text-4))]">({a.status})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Trigger</label>
                <Select value={newWfTrigger} onValueChange={setNewWfTrigger}>
                  <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }} aria-label="Trigger type"><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {TRIGGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Steps (one per line)</label>
                <textarea value={newWfSteps} onChange={e => setNewWfSteps(e.target.value)} rows={3} placeholder={'Ingest documents\nVerify identity\nGenerate report'}
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={handleCreate} disabled={create.isPending} className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90 disabled:opacity-40">
                {create.isPending ? 'Creating…' : 'Create Workflow'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!terminateTarget}
        title="Terminate Workflow"
        description={`Terminate "${terminateTarget?.name}"? All in-progress agent steps will be stopped. This action cannot be undone.`}
        confirmLabel="Terminate"
        type="danger"
        onConfirm={() => {
          if (!terminateTarget) return
          handleTerminate(terminateTarget)
          setTerminateTarget(null)
        }}
        onClose={() => setTerminateTarget(null)}
      />
    </div>
  )
}
