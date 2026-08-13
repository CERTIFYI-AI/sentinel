// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// AgentRegistry — central registry for all agentic AI systems.
// Provides lifecycle tracking, permissions, trust scoring, and kill-switch controls.
// Interlinks: model (ai_models.id) → /models/inventory/:id, IAM credentials,
// kill-switch history, multi-agent workflows, and runtime traces all carry ?agent=<id>.

import { useEffect, useRef, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Eye, X, Export, Warning, Power, Pencil, Trash, Shield, IdentificationCard, Pulse, Cpu, TreeStructure } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow } from '@/components/ui/StatCardRow'
import { FilterBar } from '@/components/ui/FilterBar'
import { UserSelect } from '@/components/evals/UserSelect'
import { TableSkeleton, ErrorState } from '@/components/evals/states'
import { exportCsv } from '@/lib/exportUtils'
import { logAction } from '@/lib/auditLogger'
import { useModelOptions } from '@/hooks/useAiiaData'
import { agentRecordHooks } from '@/hooks/queries/useAgentGovCrud'
import type { AgentRecord, AgentStatus, AgentType, AgentRiskTier as RiskTier } from '@/types/agentGov'

type AgentRegistryItem = AgentRecord


const STATUS_STYLE: Record<AgentStatus, { bg: string; color: string }> = {
  Active: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  Suspended: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Quarantined: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  Decommissioned: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' },
  'Pending Approval': { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
}
const TIER_STYLE: Record<RiskTier, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  High: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Medium: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Low: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
}

const BLANK = {
  name: '', agentVersion: '1.0.0', type: 'Tool-Using' as AgentType, status: 'Pending Approval' as AgentStatus,
  riskTier: 'Medium' as RiskTier, owner: '', team: '', purpose: '', tools: [] as string[],
  permissions: [] as string[], modelId: '', model: '', maxBudget: 1000, dailyCallCount: 0,
  lastActivity: 'Never', registeredDate: '', approvedBy: 'Pending',
  trustScore: 0, escalationPolicy: '', killSwitchEnabled: true, totalCallsLifetime: 0, avgLatencyMs: 0,
}

const pillClass = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--brand)/0.08)] text-[hsl(var(--brand))] border border-[hsl(var(--brand)/0.25)] hover:bg-[hsl(var(--brand)/0.15)]'

export default function AgentRegistry() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: agents = [], isLoading, isError, error, refetch } = agentRecordHooks.useList()
  const { models: modelOptions, loading: modelsLoading } = useModelOptions()
  const upsert = agentRecordHooks.useUpsert()
  const remove = agentRecordHooks.useDelete()
  const [search, setSearch] = useState(params.get('agent') ?? '')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tierFilter, setTierFilter] = useState('All')
  const [selected, setSelected] = useState<AgentRegistryItem | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const createRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const openedRef = useRef<string | null>(null)

  // Deep link: ?open=<id> opens that agent's detail panel (once per id).
  useEffect(() => {
    const openId = params.get('open')
    if (!openId || openedRef.current === openId || !agents.length) return
    const match = agents.find(a => a.id === openId || a.displayId === openId)
    if (match) { openedRef.current = openId; setSelected(match); setEditMode(false) }
  }, [params, agents])

  // Escape closes the top-most custom overlay (delete confirm → create modal → detail panel).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (deleteTarget) setDeleteTarget(null)
      else if (showCreate) setShowCreate(false)
      else if (selected) { setSelected(null); setEditMode(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteTarget, showCreate, selected])

  // Basic focus handling: move focus into the overlay when it opens.
  useEffect(() => { if (selected) panelRef.current?.focus() }, [selected])
  useEffect(() => { if (showCreate) createRef.current?.focus() }, [showCreate])
  useEffect(() => { if (deleteTarget) confirmRef.current?.focus() }, [deleteTarget])

  const modelName = (id?: string) => (id ? modelOptions.find(m => m.id === id)?.name : undefined)

  const filtered = agents.filter(a => {
    const q = search.toLowerCase()
    const ms = a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || (a.displayId ?? '').toLowerCase().includes(q) || a.team.toLowerCase().includes(q)
    return ms && (statusFilter === 'All' || a.status === statusFilter) && (tierFilter === 'All' || a.riskTier === tierFilter)
  })

  const stats = {
    active: agents.filter(a => a.status === 'Active').length,
    critical: agents.filter(a => a.riskTier === 'Critical').length,
    pending: agents.filter(a => a.status === 'Pending Approval').length,
    avgTrust: (() => {
      const scored = agents.filter(a => a.trustScore > 0)
      return scored.length ? Math.round(scored.reduce((s, a) => s + a.trustScore, 0) / scored.length) : 0
    })(),
  }

  const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (tierFilter !== 'All' ? 1 : 0)

  const handleCreate = () => {
    if (!form.name) { toast.error('Agent name is required'); return }
    if (!form.owner) { toast.error('Owner is required'); return }
    const id = crypto.randomUUID()
    const displayId = `AGT-${id.slice(0, 8).toUpperCase()}`
    const rec: AgentRegistryItem = {
      ...form, id, displayId,
      modelId: form.modelId || undefined,
      registeredDate: new Date().toISOString().slice(0, 10),
    }
    upsert.mutate(rec, {
      onSuccess: () => {
        toast.success(`${rec.name} registered as ${displayId}`)
        void logAction({ module: 'agent-registry', entityType: 'agent_gov_registry', entityId: id, entityName: rec.name, action: 'register', newValues: rec })
        setShowCreate(false)
        setForm(BLANK)
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to register agent'),
    })
  }

  const handleEdit = () => {
    if (!selected) return
    const rec: AgentRegistryItem = { ...selected, ...form, modelId: form.modelId || undefined }
    upsert.mutate(rec, {
      onSuccess: (saved) => {
        toast.success('Agent record updated')
        void logAction({ module: 'agent-registry', entityType: 'agent_gov_registry', entityId: rec.id, entityName: rec.name, action: 'update', oldValues: selected, newValues: saved })
        setSelected(saved)
        setEditMode(false)
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update agent'),
    })
  }

  const handleDelete = (id: string) => {
    const target = agents.find(a => a.id === id)
    remove.mutate(id, {
      onSuccess: () => {
        toast.success('Agent deregistered')
        void logAction({ module: 'agent-registry', entityType: 'agent_gov_registry', entityId: id, entityName: target?.name, action: 'delete' })
        setDeleteTarget(null)
        setSelected(prev => (prev?.id === id ? null : prev))
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to deregister agent'),
    })
  }

  // Persist the status flip, then let query invalidation refresh the list —
  // the detail panel is only synced from the confirmed write, never optimistically.
  const toggleKillSwitch = (a: AgentRegistryItem) => {
    const next: AgentStatus = a.status === 'Active' ? 'Suspended' : 'Active'
    upsert.mutate({ ...a, status: next }, {
      onSuccess: (saved) => {
        toast.success(next === 'Suspended' ? `${a.name} suspended via kill switch` : `${a.name} resumed`)
        void logAction({ module: 'agent-registry', entityType: 'agent_gov_registry', entityId: a.id, entityName: a.name, action: next === 'Suspended' ? 'kill-switch-suspend' : 'kill-switch-resume' })
        setSelected(prev => (prev && prev.id === a.id ? saved : prev))
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Kill switch action failed'),
    })
  }

  const handleExport = () => {
    if (!filtered.length) { toast.info('No agents to export'); return }
    exportCsv(filtered.map(a => ({
      id: a.id,
      display_id: a.displayId ?? '',
      name: a.name,
      version: a.agentVersion,
      type: a.type,
      status: a.status,
      risk_tier: a.riskTier,
      owner: a.owner,
      team: a.team,
      model_id: a.modelId ?? '',
      model: a.modelId ? (modelName(a.modelId) ?? a.model) : a.model,
      trust_score_declared: a.trustScore,
      daily_calls: a.dailyCallCount,
      lifetime_calls: a.totalCallsLifetime,
      avg_latency_ms: a.avgLatencyMs,
      max_budget_usd: a.maxBudget,
      kill_switch_enabled: a.killSwitchEnabled,
      registered: a.registeredDate,
      last_activity: a.lastActivity,
    })), 'agent-registry.csv')
  }

  /** Model cell: pill link to /models/inventory/<modelId> when the canonical id
   *  exists; "Unavailable" when it can't be resolved; plain text for legacy
   *  free-text records that predate modelId. */
  const modelCell = (a: AgentRegistryItem) => {
    if (a.modelId) {
      const name = modelName(a.modelId) ?? (modelsLoading ? a.model || '…' : 'Unavailable')
      return (
        <button
          onClick={e => { e.stopPropagation(); navigate(`/models/inventory/${a.modelId}`) }}
          className={pillClass}
          aria-label={`Open model ${name} in Model Inventory`}
        >{name}</button>
      )
    }
    return a.model
      ? <span className="text-xs text-[hsl(var(--text-3))]">{a.model}</span>
      : <span className="text-xs text-[hsl(var(--text-4))]">—</span>
  }

  // RegisterAgentButton rendered inline as an actions node
  const RegisterAgentButton = (
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised"
      >
        <Export size={14} /> Export
      </button>
      <button
        onClick={() => { setForm(BLANK); setShowCreate(true) }}
        className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm hover:opacity-90"
      >
        <Plus size={14} weight="bold" /> Register Agent
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agent Registry"
        subtitle="Register and govern autonomous AI agents — lifecycle tracking, permissions, trust scoring, and kill-switch controls"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Agents' }]}
        actions={RegisterAgentButton}
      />

      <StatCardRow
        cards={[
          {
            label: 'Total Agents',
            value: agents.length,
            description: `Total Agents: ${agents.length}`,
          },
          {
            label: 'Active',
            value: stats.active,
            description: `Active Agents: ${stats.active}`,
          },
          {
            label: 'Critical Risk Tier',
            value: stats.critical,
            description: `Critical Risk Tier Agents: ${stats.critical} — require enhanced oversight`,
          },
          {
            label: 'Avg Trust Score (declared)',
            value: `${stats.avgTrust}%`,
            description: `Average declared trust score: ${stats.avgTrust}% — self-reported at registration, not computed by the platform`,
          },
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agents, teams…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter === 'All' ? '' : statusFilter,
            onChange: v => setStatusFilter(v || 'All'),
            options: ['Active', 'Suspended', 'Quarantined', 'Pending Approval', 'Decommissioned'].map(s => ({ label: s, value: s })),
          },
          {
            key: 'tier',
            label: 'Risk Tier',
            value: tierFilter === 'All' ? '' : tierFilter,
            onChange: v => setTierFilter(v || 'All'),
            options: ['Critical', 'High', 'Medium', 'Low'].map(t => ({ label: t, value: t })),
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearAll={() => { setSearch(''); setStatusFilter('All'); setTierFilter('All') }}
        trailing={
          <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} agent{filtered.length !== 1 ? 's' : ''}</span>
        }
      />

      {isLoading ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface p-4"><TableSkeleton rows={6} cols={8} /></div>
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
      <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-raised">
              {['Agent', 'Type', 'Model', 'Risk Tier', 'Status', 'Trust (declared)', 'Daily Calls', 'Kill Switch', 'Actions'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-[hsl(var(--border))] hover:bg-raised">
                <td className="px-3 py-2.5">
                  <p className="font-medium text-[hsl(var(--text-1))]">{a.name}</p>
                  <p className="text-xs text-[hsl(var(--text-4))]">{a.displayId ?? a.id} · v{a.agentVersion} · {a.team}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{a.type}</td>
                <td className="px-3 py-2.5 max-w-[160px] truncate">{modelCell(a)}</td>
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium" style={TIER_STYLE[a.riskTier] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{a.riskTier}</span></td>
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={STATUS_STYLE[a.status] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{a.status}</span></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-14 bg-raised rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.trustScore}%`, background: a.trustScore >= 80 ? 'hsl(var(--s-ok-tx))' : a.trustScore >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }} />
                    </div>
                    <span className="text-xs font-medium text-[hsl(var(--text-2))]">{a.trustScore}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))] font-medium">{a.dailyCallCount.toLocaleString()}</td>
                <td className="px-3 py-2.5">
                  {a.killSwitchEnabled ? (
                    <button
                      onClick={() => toggleKillSwitch(a)}
                      aria-label={a.status === 'Active' ? `Suspend ${a.name}` : `Resume ${a.name}`}
                      className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${a.status === 'Active' ? 'border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]' : 'border-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-bg))]'}`}>
                      <Power size={10} />{a.status === 'Active' ? 'Suspend' : 'Resume'}
                    </button>
                  ) : <span className="text-xs text-[hsl(var(--text-4))]">N/A</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelected(a); setEditMode(false) }} aria-label={`View ${a.name}`} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Eye size={13} /></button>
                    <button onClick={() => { setSelected(a); setForm({ ...BLANK, ...a, modelId: a.modelId ?? '' }); setEditMode(true) }} aria-label={`Edit ${a.name}`} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(a.id)} aria-label={`Deregister ${a.name}`} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-[hsl(var(--text-4))]">{agents.length === 0 ? 'No agents registered yet — register the first one to start governing agentic systems' : 'No agents match the current filters'}</div>}
      </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setSelected(null); setEditMode(false) }} />
          <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Agent details: ${selected.name}`}
            className="w-[540px] bg-surface border-l border-[hsl(var(--border))] h-full overflow-y-auto flex flex-col outline-none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] sticky top-0 bg-surface">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))] font-semibold">{selected.displayId ?? selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.name} <span className="text-xs font-normal text-[hsl(var(--text-4))]">v{selected.agentVersion}</span></h2>
              </div>
              <div className="flex gap-1">
                {!editMode && <button onClick={() => { setForm({ ...BLANK, ...selected, modelId: selected.modelId ?? '' }); setEditMode(true) }} aria-label="Edit agent" className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={15} /></button>}
                <button onClick={() => { setSelected(null); setEditMode(false) }} aria-label="Close panel" className="p-1.5 text-[hsl(var(--text-4))]"><X size={15} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4 flex-1">
              {!editMode ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={TIER_STYLE[selected.riskTier] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{selected.riskTier} Risk</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={STATUS_STYLE[selected.status] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{selected.status}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-raised text-[hsl(var(--text-3))]">{selected.type}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Owner', value: selected.owner },
                      { label: 'Team', value: selected.team },
                      { label: 'Approved By', value: selected.approvedBy },
                      { label: 'Registered', value: selected.registeredDate },
                      { label: 'Daily Calls', value: selected.dailyCallCount.toLocaleString() },
                      { label: 'Lifetime Calls', value: selected.totalCallsLifetime.toLocaleString() },
                      { label: 'Avg Latency', value: selected.avgLatencyMs + ' ms' },
                      { label: 'Max Budget', value: '$' + selected.maxBudget.toLocaleString() + '/mo' },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-[hsl(var(--text-4))]">{f.label}</p>
                        <p className="text-sm text-[hsl(var(--text-1))] mt-0.5 font-medium">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">Underlying Model</p>
                    {modelCell(selected)}
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">Trust Score (declared by owning team — not computed)</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-raised rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${selected.trustScore}%`, background: selected.trustScore >= 80 ? 'hsl(var(--s-ok-tx))' : selected.trustScore >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }} />
                      </div>
                      <span className="text-lg font-bold text-[hsl(var(--text-1))]">{selected.trustScore}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">Purpose</p>
                    <p className="text-sm text-[hsl(var(--text-2))] bg-raised p-3 rounded">{selected.purpose}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-2">Tools ({selected.tools.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tools.map(t => <span key={t} className="px-2 py-0.5 text-xs bg-raised text-[hsl(var(--text-3))] rounded">{t}</span>)}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-2">Permissions ({selected.permissions.length})</p>
                    <div className="space-y-1">
                      {selected.permissions.map(p => (
                        <div key={p} className="flex items-center gap-2 text-xs text-[hsl(var(--text-2))]">
                          <Shield size={10} className="text-[hsl(var(--brand))]" />
                          <code className="font-mono">{p}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">Escalation Policy</p>
                    <p className="text-sm text-[hsl(var(--text-2))] bg-raised p-3 rounded">{selected.escalationPolicy}</p>
                  </div>

                  {/* Cross-module interlinks: everything this agent touches on the platform */}
                  <div className="pt-2 border-t border-[hsl(var(--border))]">
                    <p className="text-xs text-[hsl(var(--text-4))] mb-2">Connected on the platform</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => navigate(`/agent-iam?agent=${selected.id}`)} className={pillClass} aria-label="Open IAM credentials for this agent">
                        <IdentificationCard size={12} /> IAM Credentials
                      </button>
                      <button onClick={() => navigate(`/kill-switch?agent=${selected.id}`)} className={pillClass} aria-label="Open kill-switch history for this agent">
                        <Power size={12} /> Kill-Switch History
                      </button>
                      <button onClick={() => navigate(`/multi-agent?agent=${selected.id}`)} className={pillClass} aria-label="Open workflows involving this agent">
                        <TreeStructure size={12} /> Workflows
                      </button>
                      <button onClick={() => navigate(`/trust-engine/traces?agent=${selected.id}`)} className={pillClass} aria-label="Open runtime traces for this agent">
                        <Pulse size={12} /> Runtime Traces
                      </button>
                      {selected.modelId && (
                        <button onClick={() => navigate(`/models/inventory/${selected.modelId}`)} className={pillClass} aria-label="Open underlying model in Model Inventory">
                          <Cpu size={12} /> {modelName(selected.modelId) ?? 'Unavailable'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    {selected.killSwitchEnabled && (
                      <button onClick={() => toggleKillSwitch(selected)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--destructive))]">
                        <Power size={13} /> {selected.status === 'Active' ? 'Suspend' : 'Resume'}
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--destructive))]"><Trash size={13} /> Deregister</button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Edit Agent</h3>
                  <div>
                    <label className="text-xs text-[hsl(var(--text-4))]">Owner</label>
                    <UserSelect value={form.owner} onChange={v => setForm(p => ({ ...p, owner: v }))} by="name" className="mt-0.5" />
                  </div>
                  {[
                    { label: 'Agent Name', key: 'name' },
                    { label: 'Version', key: 'agentVersion' },
                    { label: 'Team', key: 'team' },
                    { label: 'Escalation Policy', key: 'escalationPolicy' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-[hsl(var(--text-4))]">{f.label}</label>
                      <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} // any: dynamic key access
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-[hsl(var(--text-4))]">Underlying Model (from Model Inventory)</label>
                    <Select value={form.modelId} onValueChange={v => setForm(p => ({ ...p, modelId: v, model: modelOptions.find(m => m.id === v)?.name ?? p.model }))}>
                      <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a governed model…" /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        {modelOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.name}{m.riskTier ? ` — ${m.riskTier} risk` : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!form.modelId && form.model && (
                      <p className="text-[11px] text-[hsl(var(--text-4))] mt-1">Legacy free-text model: "{form.model}" — pick an inventory model to interlink.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[hsl(var(--text-4))]">Status</label>
                      <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as AgentStatus }))}>
                        <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {['Active', 'Suspended', 'Quarantined', 'Decommissioned', 'Pending Approval'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-[hsl(var(--text-4))]">Risk Tier</label>
                      <Select value={form.riskTier} onValueChange={v => setForm(p => ({ ...p, riskTier: v as RiskTier }))}>
                        <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {['Critical', 'High', 'Medium', 'Low'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--text-4))]">Trust Score — declared, 0–100 (not computed by the platform)</label>
                    <input type="number" min="0" max="100" value={form.trustScore} onChange={e => setForm(p => ({ ...p, trustScore: Number(e.target.value) }))}
                      className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEdit} disabled={upsert.isPending} className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm disabled:opacity-60">{upsert.isPending ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div ref={createRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Register new agent"
            className="relative bg-surface border border-[hsl(var(--border))] rounded w-full max-w-lg shadow-xl outline-none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="font-semibold text-[hsl(var(--text-1))]">Register New Agent</h2>
              <button onClick={() => setShowCreate(false)} aria-label="Close dialog"><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Agent Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="MyComplianceAgent"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Version</label>
                  <input value={form.agentVersion} onChange={e => setForm(p => ({ ...p, agentVersion: e.target.value }))} placeholder="1.0.0"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Type</label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as AgentType }))}>
                    <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['Autonomous', 'Semi-Autonomous', 'Tool-Using', 'Multi-Modal', 'Orchestrator', 'Worker'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Risk Tier</label>
                  <Select value={form.riskTier} onValueChange={v => setForm(p => ({ ...p, riskTier: v as RiskTier }))}>
                    <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['Critical', 'High', 'Medium', 'Low'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Owner *</label>
                  <UserSelect value={form.owner} onChange={v => setForm(p => ({ ...p, owner: v }))} by="name" className="mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Team</label>
                  <input value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))} placeholder="AI Platform"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Underlying Model (from Model Inventory)</label>
                <Select value={form.modelId} onValueChange={v => setForm(p => ({ ...p, modelId: v, model: modelOptions.find(m => m.id === v)?.name ?? '' }))}>
                  <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue placeholder={modelsLoading ? 'Loading models…' : 'Select a governed model…'} /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {modelOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.name}{m.riskTier ? ` — ${m.riskTier} risk` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[hsl(var(--text-4))] mt-1">Links this agent to its governed model record (Model Inventory).</p>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Purpose</label>
                <textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} rows={3} placeholder="Describe what this agent does…"
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Max Monthly Budget (USD)</label>
                <input type="number" value={form.maxBudget} onChange={e => setForm(p => ({ ...p, maxBudget: Number(e.target.value) }))}
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={handleCreate} disabled={upsert.isPending} className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium disabled:opacity-60">{upsert.isPending ? 'Registering…' : 'Register Agent'}</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ConfirmDialog for destructive delete action */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div ref={confirmRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-label="Confirm agent deregistration"
            className="relative bg-surface border border-[hsl(var(--border))] rounded w-full max-w-sm p-6 text-center shadow-xl outline-none">
            <Warning size={32} className="mx-auto text-[hsl(var(--destructive))] mb-3" />
            <h3 className="font-semibold text-[hsl(var(--text-1))] mb-1">Deregister Agent?</h3>
            <p className="text-sm text-[hsl(var(--text-3))] mb-4">This will permanently remove the agent from the registry. This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteTarget)} disabled={remove.isPending} className="flex-1 py-2 bg-[hsl(var(--destructive))] text-[hsl(var(--bg-surface))] text-sm disabled:opacity-60">{remove.isPending ? 'Removing…' : 'Deregister'}</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
