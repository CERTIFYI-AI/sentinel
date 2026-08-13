// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ShadowAI — detection & remediation view over the canonical
// agent_gov_registry: agents whose status marks them as operating outside
// governance ('Shadow' / 'Unregistered'). Quarantine / whitelist persist via
// the registry upsert; incidents are written to the real incidents table.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ShieldWarning, Warning, Prohibit, Siren, Detective, Eye,
  CheckCircle, MagnifyingGlass, WifiHigh, Robot,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import { formatNumber, formatDate } from '../../data/seed'
import { useChartTheme } from '../../hooks/useChartTheme'
import { useAuthStore } from '../../stores/authStore'
import { agentRecordHooks } from '../../hooks/queries/useAgentGovCrud'
import { upsertIncident, type IncidentRecord } from '../../services/incidentService'
import { isShadowAgent } from './AgentDiscovery'
import type { AgentRecord, AgentStatus } from '../../types/agentGov'

const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  High: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Medium: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Low: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
}
const NEUTRAL_STYLE = { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' }

export default function ShadowAI() {
  const navigate = useNavigate()
  const ct = useChartTheme()
  const user = useAuthStore(s => s.user)
  const { data: agents = [], isLoading, error, refetch } = agentRecordHooks.useList()
  const upsert = agentRecordHooks.useUpsert()

  const [search, setSearch] = useState('')
  const [investigateAgent, setInvestigateAgent] = useState<AgentRecord | null>(null)
  const [quarantineTarget, setQuarantineTarget] = useState<AgentRecord | null>(null)
  const [creatingIncidentFor, setCreatingIncidentFor] = useState<string | null>(null)

  if (isLoading) return <PageSkeleton />

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
    await setStatus(target, 'Suspended', `${target.name} quarantined — status set to Suspended`)
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shadow AI Detection"
        subtitle="Unauthorized AI agent detection & remediation — backed by the central agent registry"
        icon={ShieldWarning}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Agents', href: '/agents' }, { label: 'Shadow AI' }]}
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
      ) : shadowDetected === 0 ? (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="py-14 flex flex-col items-center gap-2 text-center px-6">
            <CheckCircle size={32} style={{ color: 'hsl(var(--s-ok-tx))' }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>No shadow AI detected</p>
            <p className="text-xs max-w-md" style={{ color: 'hsl(var(--text-4))' }}>
              No agent in the registry currently carries a Shadow or Unregistered status.
              When discovery flags an ungoverned agent, it appears here for quarantine or whitelisting.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/agents')} style={{ borderRadius: 0 }}>
              <Robot size={14} className="mr-1" />Open Agent Discovery
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
        description={`Suspend ${quarantineTarget?.name ?? 'this agent'} in the registry? The status change is persisted and visible across the platform.`}
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
