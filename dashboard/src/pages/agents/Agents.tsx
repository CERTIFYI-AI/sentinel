// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Agents — the single agent inventory for the platform (route /agents).
// Consolidates the former Agent Registry (/agent-registry), Agent Discovery
// (/agents) and Shadow AI Detection (/agents/shadow-ai) pages into one view
// over the canonical agent_gov_registry store (agentRecordHooks):
//   · Registry tab — primary view: full lifecycle CRUD, kill switch, CSV export
//   · Shadow AI tab — detection & remediation for agents outside governance
//   · Observability tab — honest state: telemetry is not collected by this
//     module; links to the real runtime surfaces (Trust Engine traces).
// Interlinks: model (ai_models.id) → /models/inventory/:id, per-agent detail at
// /agents/:id, IAM (/agent-iam), kill switch (/kill-switch), workflows
// (/multi-agent) and runtime traces (/trust-engine/traces) carry ?agent=<id>.
// Deep links: ?open=<id> opens the detail panel, ?agent=<q> pre-fills search,
// ?tab=shadow|observability selects a tab.

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus, Eye, X, Export, Warning, Power, Pencil, Trash, Shield,
  IdentificationCard, Pulse, Cpu, TreeStructure, Robot, ShieldWarning,
  Prohibit, Siren, Detective, CheckCircle, MagnifyingGlass, WifiHigh,
} from '@phosphor-icons/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCardRow } from '../../components/ui/StatCardRow'
import { FilterBar } from '../../components/ui/FilterBar'
import { UserSelect } from '../../components/evals/UserSelect'
import { TableSkeleton, ErrorState } from '../../components/evals/states'
import { exportCsv } from '../../lib/exportUtils'
import { logAction } from '../../lib/auditLogger'
import { useModelOptions } from '../../hooks/useAiiaData'
import { useChartTheme } from '../../hooks/useChartTheme'
import { useAuthStore } from '../../stores/authStore'
import { agentRecordHooks } from '../../hooks/queries/useAgentGovCrud'
import { upsertIncident, type IncidentRecord } from '../../services/incidentService'
import { formatNumber, formatDate } from '../../data/seed'
import type { AgentRecord, AgentStatus, AgentType, AgentRiskTier as RiskTier } from '../../types/agentGov'

// ── Shared styling maps (registry vocabulary, honest fallback for sparse rows) ─

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  Suspended: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Quarantined: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  Decommissioned: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' },
  'Pending Approval': { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
}
const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  High: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Medium: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Low: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
}
const NEUTRAL_STYLE = { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' }

/** Shadow AI = registry record whose status marks it as outside governance. */
export const isShadowAgent = (a: AgentRecord) =>
  ['shadow', 'unregistered'].includes(String(a.status ?? '').toLowerCase())

const BLANK = {
  name: '', agentVersion: '1.0.0', type: 'Tool-Using' as AgentType, status: 'Pending Approval' as AgentStatus,
  riskTier: 'Medium' as RiskTier, owner: '', team: '', purpose: '', tools: [] as string[],
  permissions: [] as string[], modelId: '', model: '', maxBudget: 1000, dailyCallCount: 0,
  lastActivity: 'Never', registeredDate: '', approvedBy: 'Pending',
  trustScore: 0, escalationPolicy: '', killSwitchEnabled: true, totalCallsLifetime: 0, avgLatencyMs: 0,
}

const pillClass = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--brand)/0.08)] text-[hsl(var(--brand))] border border-[hsl(var(--brand)/0.25)] hover:bg-[hsl(var(--brand)/0.15)]'

type TabKey = 'registry' | 'shadow' | 'observability'

export default function Agents() {
  const [params, setParams] = useSearchParams()
  const { data: agents = [] } = agentRecordHooks.useList()
  const shadowCount = agents.filter(isShadowAgent).length

  const rawTab = params.get('tab')
  const tab: TabKey = rawTab === 'shadow' ? 'shadow' : rawTab === 'observability' ? 'observability' : 'registry'
  const setTab = (next: string) => {
    setParams(prev => {
      const p = new URLSearchParams(prev)
      if (next === 'registry') p.delete('tab')
      else p.set('tab', next)
      return p
    }, { replace: true })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agents"
        subtitle="One inventory for autonomous AI agents — registry & lifecycle governance, shadow-AI detection, and links to runtime observability"
        icon={Robot}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Agents' }]}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ borderRadius: 0 }}>
          <TabsTrigger value="registry" style={{ borderRadius: 0 }}>Registry ({agents.length})</TabsTrigger>
          <TabsTrigger value="shadow" style={{ borderRadius: 0 }}>
            Shadow AI
            {shadowCount > 0 && (
              <Badge className="ml-1.5" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10, padding: '0 4px' }}>
                {shadowCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="observability" style={{ borderRadius: 0 }}>Observability</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="mt-4">
          <RegistrySection />
        </TabsContent>
        <TabsContent value="shadow" className="mt-4">
          <ShadowSection onOpenRegistry={() => setTab('registry')} />
        </TabsContent>
        <TabsContent value="observability" className="mt-4">
          <ObservabilitySection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Registry (primary view — former Agent Registry page, full CRUD) ───────────

function RegistrySection() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: agents = [], isLoading, isError, error, refetch } = agentRecordHooks.useList()
  const { models: modelOptions, loading: modelsLoading } = useModelOptions()
  const upsert = agentRecordHooks.useUpsert()
  const remove = agentRecordHooks.useDelete()
  const [search, setSearch] = useState(params.get('agent') ?? '')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tierFilter, setTierFilter] = useState('All')
  const [selected, setSelected] = useState<AgentRecord | null>(null)
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
    const ms = (a.name ?? '').toLowerCase().includes(q) || (a.id ?? '').toLowerCase().includes(q) || (a.displayId ?? '').toLowerCase().includes(q) || (a.team ?? '').toLowerCase().includes(q)
    return ms && (statusFilter === 'All' || a.status === statusFilter) && (tierFilter === 'All' || a.riskTier === tierFilter)
  })

  const stats = {
    active: agents.filter(a => a.status === 'Active').length,
    critical: agents.filter(a => a.riskTier === 'Critical').length,
    shadow: agents.filter(isShadowAgent).length,
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
    const rec: AgentRecord = {
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
    const rec: AgentRecord = { ...selected, ...form, modelId: form.modelId || undefined }
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
  const toggleKillSwitch = (a: AgentRecord) => {
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
  const modelCell = (a: AgentRecord) => {
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

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-2">
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
                  <button
                    onClick={() => navigate(`/agents/${a.id}`)}
                    className="font-medium text-[hsl(var(--text-1))] hover:text-[hsl(var(--brand))] hover:underline text-left"
                    aria-label={`Open full detail for ${a.name}`}
                  >{a.name}</button>
                  <p className="text-xs text-[hsl(var(--text-4))]">{a.displayId ?? a.id} · v{a.agentVersion} · {a.team}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{a.type}</td>
                <td className="px-3 py-2.5 max-w-[160px] truncate">{modelCell(a)}</td>
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium" style={TIER_STYLE[a.riskTier] || NEUTRAL_STYLE}>{a.riskTier}</span></td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={isShadowAgent(a) ? { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' } : (STATUS_STYLE[a.status] || NEUTRAL_STYLE)}>
                    {isShadowAgent(a) ? `${a.status} (shadow)` : a.status}
                  </span>
                </td>
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
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={TIER_STYLE[selected.riskTier] || NEUTRAL_STYLE}>{selected.riskTier} Risk</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={STATUS_STYLE[selected.status] || NEUTRAL_STYLE}>{selected.status}</span>
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
                      <button onClick={() => navigate(`/agents/${selected.id}`)} className={pillClass} aria-label="Open full agent detail page">
                        <Robot size={12} /> Full Detail
                      </button>
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

// ── Shadow AI (former /agents/shadow-ai — detection & remediation) ────────────

function ShadowSection({ onOpenRegistry }: { onOpenRegistry: () => void }) {
  const navigate = useNavigate()
  const ct = useChartTheme()
  const user = useAuthStore(s => s.user)
  const { data: agents = [], isLoading, error, refetch } = agentRecordHooks.useList()
  const upsert = agentRecordHooks.useUpsert()

  const [search, setSearch] = useState('')
  const [investigateAgent, setInvestigateAgent] = useState<AgentRecord | null>(null)
  const [quarantineTarget, setQuarantineTarget] = useState<AgentRecord | null>(null)
  const [creatingIncidentFor, setCreatingIncidentFor] = useState<string | null>(null)

  const shadowAgents = agents.filter(isShadowAgent)

  // Metrics — from real registry fields only.
  const shadowDetected = shadowAgents.length
  const criticalRisk = shadowAgents.filter(a => a.riskTier === 'Critical').length
  const dailyCalls = shadowAgents.reduce((sum, a) => sum + (typeof a.dailyCallCount === 'number' ? a.dailyCallCount : 0), 0)

  const q = search.toLowerCase()
  const filtered = shadowAgents.filter(a =>
    (a.name ?? '').toLowerCase().includes(q) ||
    (a.team ?? '').toLowerCase().includes(q) ||
    (a.id ?? '').toLowerCase().includes(q)
  )

  const chartData = shadowAgents
    .filter(a => typeof a.dailyCallCount === 'number')
    .map(a => ({
      name: (a.name ?? a.id).length > 18 ? (a.name ?? a.id).slice(0, 18) + '...' : (a.name ?? a.id),
      calls: a.dailyCallCount,
      fullName: a.name ?? a.id,
    }))

  const setStatus = async (agent: AgentRecord, status: AgentStatus, successMsg: string) => {
    try {
      await upsert.mutateAsync({ ...agent, status })
      toast.success(successMsg)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update agent status')
    }
  }

  const handleQuarantine = async () => {
    const target = quarantineTarget
    setQuarantineTarget(null)
    if (!target) return
    await setStatus(target, 'Quarantined', `${target.name} quarantined — blocked pending investigation`)
  }

  const handleWhitelist = (agent: AgentRecord) =>
    setStatus(agent, 'Active', `${agent.name} whitelisted — status set to Active`)

  // Writes a real row to the incidents table; toasts success only when the
  // insert resolves with a record, error otherwise. No fabricated ids.
  const handleRaiseIncident = async (agent: AgentRecord) => {
    setCreatingIncidentFor(agent.id)
    try {
      const rec = await upsertIncident({
        incident_type: 'shadow_ai',
        severity: agent.riskTier === 'Critical' ? 'critical' : 'high',
        status: 'open',
        description: `Shadow AI detected: agent "${agent.name ?? agent.id}" (${agent.id}) is operating outside governance controls. Model: ${agent.model || 'unknown'}. Owner: ${agent.owner || 'unknown'}. Team: ${agent.team || 'unknown'}.`,
        detected_date: new Date().toISOString(),
        reporter: user?.fullName ?? user?.email ?? undefined,
      } as Partial<IncidentRecord>)
      if (!rec) {
        toast.error('Failed to create incident')
      } else {
        toast.success(`Incident created for ${agent.name ?? agent.id}`, {
          action: { label: 'View incidents', onClick: () => navigate('/risk/incidents') },
        })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create incident')
    } finally {
      setCreatingIncidentFor(null)
    }
  }

  if (isLoading) {
    return <div className="rounded border border-[hsl(var(--border))] bg-surface p-4"><TableSkeleton rows={5} cols={6} /></div>
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--s-er-br))' }}>
          <CardContent className="py-10 flex flex-col items-center gap-2">
            <Warning size={28} style={{ color: 'hsl(var(--destructive))' }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Could not load the agent registry</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{error instanceof Error ? error.message : 'Unknown error'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} style={{ borderRadius: 0 }}>Retry</Button>
          </CardContent>
        </Card>
      ) : shadowDetected === 0 ? (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="py-14 flex flex-col items-center gap-2 text-center px-6">
            <CheckCircle size={32} style={{ color: 'hsl(var(--s-ok-tx))' }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>No shadow AI detected</p>
            <p className="text-xs max-w-md" style={{ color: 'hsl(var(--text-4))' }}>
              No agent in the registry currently carries a Shadow or Unregistered status.
              When discovery flags an ungoverned agent, it appears here for quarantine or whitelisting.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onOpenRegistry} style={{ borderRadius: 0 }}>
              <Robot size={14} className="mr-1" />Open Agent Registry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Shadow Detected', value: shadowDetected, color: 'hsl(var(--destructive))', icon: ShieldWarning },
              { label: 'Critical Risk Tier', value: criticalRisk, color: 'hsl(var(--destructive))', icon: Warning },
              { label: 'Daily API Calls', value: formatNumber(dailyCalls), color: 'hsl(var(--s-wn-tx))', icon: WifiHigh },
              { label: 'Pending Remediation', value: shadowDetected, color: 'hsl(var(--s-wn-tx))', icon: Detective },
            ].map(stat => (
              <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon size={20} style={{ color: stat.color }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bar Chart — real dailyCallCount per shadow agent */}
          {chartData.length > 0 && (
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Shadow Agent API Activity (daily call count)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} />
                    <YAxis
                      tick={{ fill: ct.axis, fontSize: 11 }}
                      label={{ value: 'Daily API Calls', angle: -90, position: 'insideLeft', style: { fill: ct.axis, fontSize: 10 } }}
                    />
                    <RechartsTooltip
                      contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }}
                      formatter={(v: number, _: string, p: any) => [formatNumber(v), p.payload.fullName]}
                    />
                    <Bar dataKey="calls" name="API Calls" fill="hsl(var(--s-er-tx))" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative min-w-52">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
              <Input placeholder="Search shadow agents..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
            </div>
            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} agents</span>
          </div>

          {/* Table */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <Detective size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No shadow agents match the current search</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Agent', 'Type', 'Team', 'Model', 'Daily Calls', 'Risk Tier', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(a => {
                        const tierStyle = TIER_STYLE[a.riskTier ?? ''] ?? NEUTRAL_STYLE
                        return (
                          <tr key={a.id} className="hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => navigate(`/agents/${a.id}`)}
                            style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.name ?? 'Unavailable'}</p>
                                <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{a.id}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.type ?? '—'}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.team ?? '—'}</td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>{a.model ?? '—'}</td>
                            <td className="px-4 py-3 text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>
                              {typeof a.dailyCallCount === 'number' ? formatNumber(a.dailyCallCount) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge style={{ background: tierStyle.bg, color: tierStyle.color, borderRadius: 0, fontSize: 10 }}>
                                {a.riskTier ?? 'Unassessed'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive"
                                  disabled={upsert.isPending}
                                  onClick={() => setQuarantineTarget(a)}>
                                  <Prohibit size={12} />Quarantine
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                  onClick={() => setInvestigateAgent(a)}>
                                  <Eye size={12} />Investigate
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[hsl(var(--s-ok-tx))]"
                                  disabled={upsert.isPending}
                                  onClick={() => handleWhitelist(a)}>
                                  <CheckCircle size={12} />Whitelist
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                  style={{ color: 'hsl(var(--s-wn-tx))' }}
                                  disabled={creatingIncidentFor === a.id}
                                  onClick={() => handleRaiseIncident(a)}>
                                  <Siren size={12} />{creatingIncidentFor === a.id ? 'Creating…' : 'Incident'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Quarantine Confirm */}
      <ConfirmDialog
        open={!!quarantineTarget}
        onOpenChange={() => setQuarantineTarget(null)}
        title={`Quarantine ${quarantineTarget?.name ?? quarantineTarget?.id}?`}
        description={`Set ${quarantineTarget?.name ?? 'this agent'} to Quarantined in the registry? This flags it as blocked pending investigation and is visible across the platform.`}
        confirmLabel="Quarantine Agent"
        variant="destructive"
        onConfirm={handleQuarantine}
      />

      {/* Investigate Drawer — real registry record fields only */}
      <Sheet open={!!investigateAgent} onOpenChange={() => setInvestigateAgent(null)}>
        <SheetContent style={{ borderRadius: 0, width: 560, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
              Investigation: {investigateAgent?.name ?? investigateAgent?.id}
            </SheetTitle>
          </SheetHeader>
          {investigateAgent && (
            <div className="mt-4 space-y-5 overflow-y-auto h-[calc(100vh-120px)]">
              <div className="flex gap-2 flex-wrap">
                <Badge style={{ background: (TIER_STYLE[investigateAgent.riskTier ?? ''] ?? NEUTRAL_STYLE).bg, color: (TIER_STYLE[investigateAgent.riskTier ?? ''] ?? NEUTRAL_STYLE).color, borderRadius: 0, fontSize: 10 }}>
                  {investigateAgent.riskTier ?? 'Unassessed'} risk tier
                </Badge>
                <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                  {investigateAgent.status ?? 'Unknown status'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Agent ID</p><p className="font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.id}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Team</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.team || '—'}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Model</p><p className="font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.model || '—'}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Owner</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.owner || '—'}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Daily API Calls</p><p className="font-bold mt-1 text-destructive">{typeof investigateAgent.dailyCallCount === 'number' ? formatNumber(investigateAgent.dailyCallCount) : '—'}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Last Activity</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.lastActivity || '—'}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Registered</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.registeredDate ? formatDate(investigateAgent.registeredDate) : '—'}</p></div>
                <div><p style={{ color: 'hsl(var(--text-4))' }}>Trust Score</p><p className="mt-1" style={{ color: 'hsl(var(--text-1))' }}>{typeof investigateAgent.trustScore === 'number' && investigateAgent.trustScore > 0 ? investigateAgent.trustScore : 'Not scored'}</p></div>
              </div>

              {investigateAgent.purpose && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-4))' }}>Recorded Purpose</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{investigateAgent.purpose}</p>
                </div>
              )}

              {(investigateAgent.tools?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Tools In Use</p>
                  <div className="flex gap-2 flex-wrap">
                    {investigateAgent.tools.map(t => (
                      <Badge key={t} style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {(investigateAgent.permissions?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Recorded Permission Grants</p>
                  <div className="flex gap-2 flex-wrap">
                    {investigateAgent.permissions.map(p => (
                      <Badge key={p} style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons — every action persists or navigates */}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--destructive))' }}
                  onClick={() => { const a = investigateAgent; setInvestigateAgent(null); setQuarantineTarget(a) }}>
                  <Prohibit size={14} />Quarantine Now
                </Button>
                <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--s-wn-tx))' }}
                  disabled={creatingIncidentFor === investigateAgent.id}
                  onClick={() => handleRaiseIncident(investigateAgent)}>
                  <Siren size={14} />{creatingIncidentFor === investigateAgent.id ? 'Creating…' : 'Create Incident'}
                </Button>
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }}
                  onClick={() => navigate(`/agents/${investigateAgent.id}`)}>
                  <Eye size={14} />Full Detail
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Observability (former /agents/observability — honest state) ───────────────
//
// The old page displayed fabricated telemetry (hardcoded agent counts, seeded
// log lines). This module does not collect agent telemetry, so it shows an
// honest state and routes to the real runtime surfaces instead.

function ObservabilitySection() {
  const navigate = useNavigate()
  const { data: agents = [] } = agentRecordHooks.useList()

  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="py-14 flex flex-col items-center gap-3 text-center px-6">
        <Pulse size={32} style={{ color: 'hsl(var(--text-4))' }} />
        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>No agent telemetry is collected here</p>
        <p className="text-xs max-w-lg" style={{ color: 'hsl(var(--text-4))' }}>
          Live execution telemetry for agents is captured by the Trust Engine, not by the agent inventory.
          Open Runtime Traces for per-call traces (filter by agent with ?agent=&lt;id&gt;), Guardrail Activity for
          policy enforcement events, or an agent's detail page for its kill-switch history and credentials.
          {agents.length > 0 ? ` ${agents.length} registered agent${agents.length !== 1 ? 's are' : ' is'} available in the Registry tab.` : ''}
        </p>
        <div className="flex gap-2 flex-wrap justify-center mt-2">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/trust-engine/traces')}>
            <Pulse size={14} className="mr-1" />Runtime Traces
          </Button>
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/trust-engine/guardrails')}>
            <Shield size={14} className="mr-1" />Guardrail Activity
          </Button>
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/kill-switch')}>
            <Power size={14} className="mr-1" />Kill Switch Events
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
