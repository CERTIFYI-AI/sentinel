// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// AgentDiscovery — inventory view over the canonical agent_gov_registry
// (same id-space as Agent Registry / IAM / Kill Switch / Choreography).
// Rows deep-link to /agents/<id>; status actions persist via the registry
// upsert and toast only after the write resolves.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Eye, Trash, Plus, Robot, MagnifyingGlass, Warning, CheckCircle,
  ShieldWarning, Prohibit, ArrowsClockwise,
} from '@phosphor-icons/react'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { PageHeader } from '../../components/ui/PageHeader'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { formatNumber, formatDate } from '../../data/seed'
import { agentRecordHooks } from '../../hooks/queries/useAgentGovCrud'
import type { AgentRecord, AgentStatus, AgentType, AgentRiskTier } from '../../types/agentGov'

// ── Styling maps (registry vocabulary, with honest fallback) ─────────────────

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
const FALLBACK_STYLE = { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }
const NEUTRAL_STYLE = { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' }

/** Shadow AI = registry record whose status marks it as outside governance. */
export const isShadowAgent = (a: AgentRecord) =>
  ['shadow', 'unregistered'].includes(String(a.status ?? '').toLowerCase())

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentDiscovery() {
  const navigate = useNavigate()
  const { data: agents = [], isLoading, error, refetch, isFetching } = agentRecordHooks.useList()
  const upsert = agentRecordHooks.useUpsert()
  const remove = agentRecordHooks.useDelete()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<AgentRecord | null>(null)
  const [quarantineTarget, setQuarantineTarget] = useState<AgentRecord | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)

  if (isLoading) return <PageSkeleton />

  // Metrics — computed from real registry records only.
  const totalAgents = agents.length
  const activeAgents = agents.filter(a => a.status === 'Active').length
  const shadowAgents = agents.filter(isShadowAgent).length
  const highRiskAgents = agents.filter(a => a.riskTier === 'High' || a.riskTier === 'Critical').length

  // Filters — every field guarded, records may be sparse.
  const q = search.toLowerCase()
  const filtered = agents.filter(a => {
    const matchSearch =
      (a.id ?? '').toLowerCase().includes(q) ||
      (a.name ?? '').toLowerCase().includes(q) ||
      (a.owner ?? '').toLowerCase().includes(q) ||
      (a.team ?? '').toLowerCase().includes(q)
    const matchTab = activeTab === 'all' ||
      (activeTab === 'active' && a.status === 'Active') ||
      (activeTab === 'shadow' && isShadowAgent(a))
    return matchSearch && matchTab
  })

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
    await setStatus(target, 'Quarantined', `${target.name} quarantined`)
  }

  const handleWhitelist = (agent: AgentRecord) =>
    setStatus(agent, 'Active', `${agent.name} whitelisted — status set to Active`)

  const handleDelete = async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return
    try {
      await remove.mutateAsync(target.id)
      toast.success(`${target.name ?? target.id} removed from the registry`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove agent')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Discovery"
        subtitle="AI agent inventory & shadow AI detection — backed by the central agent registry"
        icon={Robot}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Agents' }, { label: 'Discovery' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} style={{ borderRadius: 0 }}>
              <ArrowsClockwise className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button onClick={() => setRegisterOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <Plus className="h-4 w-4" />Register Agent
            </Button>
          </div>
        }
      />

      {error ? (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--s-er-br))' }}>
          <CardContent className="py-10 flex flex-col items-center gap-2">
            <Warning size={28} style={{ color: 'hsl(var(--destructive))' }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Could not load the agent registry</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{error instanceof Error ? error.message : 'Unknown error'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} style={{ borderRadius: 0 }}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Agents', value: totalAgents, color: 'hsl(var(--text-1))', icon: Robot },
              { label: 'Active', value: activeAgents, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
              { label: 'Shadow AI', value: shadowAgents, color: 'hsl(var(--destructive))', icon: ShieldWarning },
              { label: 'High / Critical Risk', value: highRiskAgents, color: 'hsl(var(--s-wn-tx))', icon: Warning },
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

          {/* Tabs + Search */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <TabsList style={{ borderRadius: 0 }}>
                <TabsTrigger value="all" style={{ borderRadius: 0 }}>All Agents ({totalAgents})</TabsTrigger>
                <TabsTrigger value="active" style={{ borderRadius: 0 }}>Active ({activeAgents})</TabsTrigger>
                <TabsTrigger value="shadow" style={{ borderRadius: 0 }}>
                  Shadow AI
                  <Badge className="ml-1.5" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10, padding: '0 4px' }}>
                    {shadowAgents}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <div className="relative min-w-52">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
                <Input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
              </div>
            </div>

            <TabsContent value={activeTab} className="mt-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-0">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6" style={{ color: 'hsl(var(--text-4))' }}>
                      <Robot size={32} className="mb-2 opacity-40" />
                      {totalAgents === 0 ? (
                        <>
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No agents in the registry yet</p>
                          <p className="text-xs mt-1">Register your first agent to bring it under governance.</p>
                        </>
                      ) : (
                        <p className="text-sm">No agents match the current filter</p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            {['ID', 'Name', 'Type', 'Model', 'Risk Tier', 'Status', 'Daily Calls', 'Registered', 'Owner', 'Actions'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(a => {
                            const shadow = isShadowAgent(a)
                            const tierStyle = TIER_STYLE[a.riskTier ?? ''] ?? NEUTRAL_STYLE
                            const statusStyle = shadow ? FALLBACK_STYLE : (STATUS_STYLE[a.status ?? ''] ?? NEUTRAL_STYLE)
                            return (
                              <tr
                                key={a.id}
                                className="hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => navigate(`/agents/${a.id}`)}
                                style={{
                                  borderBottom: '1px solid hsl(var(--border))',
                                  borderLeft: shadow ? '4px solid hsl(var(--s-er-tx))' : '4px solid transparent',
                                }}
                              >
                                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.id}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.name ?? 'Unavailable'}</span>
                                    {shadow && (
                                      <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9, fontWeight: 700 }}>
                                        SHADOW
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.type ?? '—'}</td>
                                <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>{a.model ?? '—'}</td>
                                <td className="px-4 py-3">
                                  <Badge style={{ background: tierStyle.bg, color: tierStyle.color, borderRadius: 0, fontSize: 10 }}>
                                    {a.riskTier ?? 'Unassessed'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: 0, fontSize: 10 }}>
                                    {a.status ?? 'Unknown'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                                  {typeof a.dailyCallCount === 'number' ? formatNumber(a.dailyCallCount) : '—'}
                                </td>
                                <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.registeredDate ? formatDate(a.registeredDate) : '—'}</td>
                                <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.owner ?? '—'}</td>
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {shadow ? (
                                      <>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive"
                                          disabled={upsert.isPending}
                                          onClick={() => setQuarantineTarget(a)}>
                                          <Prohibit size={12} />Quarantine
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[hsl(var(--s-ok-tx))]"
                                          disabled={upsert.isPending}
                                          onClick={() => handleWhitelist(a)}>
                                          <CheckCircle size={12} />Whitelist
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Open ${a.name ?? a.id}`}
                                          onClick={() => navigate(`/agents/${a.id}`)}>
                                          <Eye size={14} />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Delete ${a.name ?? a.id}`}
                                          onClick={() => setDeleteTarget(a)}>
                                          <Trash size={14} />
                                        </Button>
                                      </>
                                    )}
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
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? deleteTarget?.id}?`}
        description={`This will remove ${deleteTarget?.id} from the agent registry.`}
        confirmLabel="Delete Agent"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Quarantine Confirm */}
      <ConfirmDialog
        open={!!quarantineTarget}
        onOpenChange={() => setQuarantineTarget(null)}
        title={`Quarantine ${quarantineTarget?.name ?? quarantineTarget?.id}?`}
        description={`Set ${quarantineTarget?.name ?? 'this agent'} to Quarantined in the registry? This flags it as blocked pending investigation.`}
        confirmLabel="Quarantine Agent"
        variant="destructive"
        onConfirm={handleQuarantine}
      />

      {/* Register Agent Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Register Agent</DialogTitle>
          </DialogHeader>
          <RegisterAgentForm
            nextId={`AGT-${String(agents.length + 1).padStart(3, '0')}`}
            isSaving={upsert.isPending}
            onSubmit={async (newAgent) => {
              try {
                await upsert.mutateAsync(newAgent)
                toast.success(`${newAgent.name} registered as ${newAgent.id}`)
                setRegisterOpen(false)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to register agent')
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Register Agent Form ───────────────────────────────────────────────────────

const AGENT_TYPES: AgentType[] = ['Autonomous', 'Semi-Autonomous', 'Tool-Using', 'Multi-Modal', 'Orchestrator', 'Worker']

function RegisterAgentForm({ onSubmit, nextId, isSaving }: {
  onSubmit: (a: AgentRecord) => void | Promise<void>
  nextId: string
  isSaving: boolean
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AgentType>('Tool-Using')
  const [model, setModel] = useState('')
  const [owner, setOwner] = useState('')
  const [team, setTeam] = useState('')
  const [purpose, setPurpose] = useState('')

  const canSubmit = !!name && !!owner && !isSaving

  const handleSubmit = () => {
    if (!canSubmit) return
    const now = new Date().toISOString().slice(0, 10)
    onSubmit({
      id: nextId,
      name,
      agentVersion: '1.0.0',
      type,
      status: 'Pending Approval',
      riskTier: 'Medium' as AgentRiskTier,
      owner,
      team,
      purpose: purpose || name,
      tools: [],
      permissions: [],
      model,
      maxBudget: 0,
      dailyCallCount: 0,
      lastActivity: 'Never',
      registeredDate: now,
      approvedBy: 'Pending',
      trustScore: 0,
      escalationPolicy: '',
      killSwitchEnabled: true,
      totalCallsLifetime: 0,
      avgLatencyMs: 0,
    })
  }

  return (
    <div className="space-y-3 py-2">
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Name *</label>
        <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Agent name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Type</label>
          <Select value={type} onValueChange={v => setType(v as AgentType)}>
            <SelectTrigger className="mt-1 h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              {AGENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Model</label>
          <Input value={model} onChange={e => setModel(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. GPT-4o via OpenAI" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Owner *</label>
          <Input value={owner} onChange={e => setOwner(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Owner name" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Team</label>
          <Input value={team} onChange={e => setTeam(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="Team" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Purpose</label>
        <textarea value={purpose} onChange={e => setPurpose(e.target.value)}
          className="mt-1 w-full h-16 text-xs p-2 resize-none"
          style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
          placeholder="Describe what this agent does..." />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit}
          style={{ borderRadius: 0, background: canSubmit ? 'hsl(var(--brand))' : undefined, color: canSubmit ? 'hsl(var(--bg-surface))' : undefined }}>
          <Plus size={14} />{isSaving ? 'Registering…' : 'Register Agent'}
        </Button>
      </div>
    </div>
  )
}
