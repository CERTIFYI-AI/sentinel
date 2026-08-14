// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// AgentDetail — canonical detail view for one agent_gov_registry record.
// Everything rendered comes from real governed entities: the registry record,
// the agent's IAM credentials (agent_gov_credentials), its kill switch history
// (kill_switch_events), and the model inventory (ai_models via modelId).
// The kill switch persists: registry status → Suspended + a kill_switch_events
// row, with a success toast only after both writes resolve.

import { useState, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, Robot, Warning, Skull, X, Key, Power, CheckCircle, TreeStructure,
} from '@phosphor-icons/react'
import { Card } from '../../components/ui/card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Skeleton } from '../../components/ui/skeleton'
import { agentRecordHooks, agentCredentialHooks } from '../../hooks/queries/useAgentGovCrud'
import { fetchKillSwitchEvents, insertKillSwitchEvent, type KillSwitchEvent } from '../../services/killSwitchService'
import { useModelOptions } from '../../hooks/useAiiaData'
import { useAuthStore } from '../../stores/authStore'
import { formatNumber, formatDate } from '../../data/seed'
import type { AgentRecord } from '../../types/agentGov'

const pillCls = 'inline-flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-2 py-[2px] text-[11px] font-medium whitespace-nowrap'
const linkPillCls = `${pillCls} text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))] hover:underline`

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

const CRED_STATUS_COLOR: Record<string, string> = {
  Active: 'hsl(var(--s-ok-tx))',
  Revoked: 'hsl(var(--destructive))',
  Expired: 'hsl(var(--destructive))',
  'Pending Rotation': 'hsl(var(--s-wn-tx))',
}

// ── 2-step Kill Switch Dialog ──────────────────────────────────────────────────

function KillSwitchModal({ agent, onConfirm, onClose, busy }: {
  agent: AgentRecord
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
  busy: boolean
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState('')
  const [reason, setReason] = useState('')
  const expected = `DISABLE ${agent.id}`
  const canKill = confirmText === expected && !busy

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'hsl(var(--bg-page)/70%)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ width: 480, background: 'hsl(var(--bg-surface))', border: '2px solid hsl(var(--s-er-br))', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(var(--s-er-br))', background: 'hsl(var(--s-er-bg))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skull size={18} style={{ color: 'hsl(var(--s-er-tx))' }} />
            <span style={{ fontWeight: 700, color: 'hsl(var(--s-er-tx))', fontSize: 14 }}>
              Emergency Kill Switch — Step {step} of 2
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--s-er-tx))' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>
          {step === 1 ? (
            <>
              <div style={{ marginBottom: 16, padding: 12, background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}>
                <p style={{ fontSize: 13, color: 'hsl(var(--s-er-tx))', lineHeight: 1.6 }}>
                  This will suspend <strong>{agent.name}</strong> ({agent.id}) in the agent registry and record a kill switch event. The action is logged and audited.
                </p>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 6 }}>Reason for termination (required)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Enter justification for kill switch activation..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 8, background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}>Cancel</button>
                <button onClick={() => setStep(2)} disabled={reason.trim().length < 10}
                  style={{ flex: 1, padding: 8, background: reason.trim().length < 10 ? 'hsl(var(--bg-muted))' : 'hsl(var(--s-er-tx))', border: 'none', cursor: reason.trim().length < 10 ? 'not-allowed' : 'pointer', color: reason.trim().length < 10 ? 'hsl(var(--text-4))' : 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 600 }}>
                  Continue → Step 2
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', marginBottom: 14, lineHeight: 1.6 }}>
                To confirm, type exactly: <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'hsl(var(--s-er-tx))' }}>{expected}</code>
              </p>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={expected}
                style={{ width: '100%', padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: `1px solid ${confirmText === expected ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`, color: 'hsl(var(--text-1))', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 14 }}
              />
              {confirmText === expected && (
                <p style={{ fontSize: 11, color: 'hsl(var(--s-ok-tx))', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> Confirmation matches
                </p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} disabled={busy} style={{ flex: 1, padding: 8, background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 13 }}>← Back</button>
                <button onClick={() => onConfirm(reason.trim())} disabled={!canKill}
                  style={{ flex: 1, padding: 8, background: !canKill ? 'hsl(var(--bg-muted))' : 'hsl(var(--s-er-tx))', border: 'none', cursor: !canKill ? 'not-allowed' : 'pointer', color: !canKill ? 'hsl(var(--text-4))' : 'hsl(var(--bg-surface))', fontSize: 13, fontWeight: 700 }}>
                  {busy ? 'SUSPENDING…' : 'KILL AGENT NOW'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  const { data: agent, isLoading, error } = agentRecordHooks.useGet(id)
  const upsert = agentRecordHooks.useUpsert()
  const { data: allCredentials = [], isLoading: credsLoading, error: credsError } = agentCredentialHooks.useList()
  const { models } = useModelOptions()

  const ksQuery = useQuery({
    queryKey: ['kill_switch_events', 'agent', id],
    enabled: !!id,
    queryFn: async (): Promise<KillSwitchEvent[]> =>
      (await fetchKillSwitchEvents()).filter(e => e.agentId === id),
    staleTime: 30_000,
  })

  const [showKillSwitch, setShowKillSwitch] = useState(false)
  const [killBusy, setKillBusy] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Button variant="outline" onClick={() => navigate('/agents')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to Agents
        </Button>
        <div className="flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
          <Warning size={18} />
          <span style={{ fontSize: 13 }}>Failed to load agent: {error instanceof Error ? error.message : 'Unknown error'}</span>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div style={{ padding: 24 }}>
        <Button variant="outline" onClick={() => navigate('/agents')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to Agents
        </Button>
        <div style={{ color: 'hsl(var(--text-4))' }}>Agent not found: {id}</div>
      </div>
    )
  }

  const credentials = allCredentials.filter(c => c.agentId === agent.id)
  const killEvents = ksQuery.data ?? []

  const statusStyle = STATUS_STYLE[agent.status ?? ''] ?? NEUTRAL_STYLE
  const tierStyle = TIER_STYLE[agent.riskTier ?? ''] ?? NEUTRAL_STYLE

  // Model pill — modelId is the canonical ai_models.id; resolve the display
  // name at render time and show "Unavailable" when the id no longer resolves.
  const modelId = (agent as AgentRecord & { modelId?: string }).modelId
  const linkedModel = modelId ? models.find(m => m.id === modelId) : undefined
  const modelPill = modelId ? (
    linkedModel ? (
      <Link to={`/models/inventory/${modelId}`} className={linkPillCls} aria-label={`Open ${linkedModel.name} in Model Inventory`}>
        {linkedModel.name}
      </Link>
    ) : (
      <span className={`${pillCls} text-[hsl(var(--text-4))]`}>Unavailable</span>
    )
  ) : (
    <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{agent.model || '—'}</span>
  )

  const handleKillConfirm = async (reason: string) => {
    setKillBusy(true)
    try {
      // Both writes must resolve before we claim success.
      await upsert.mutateAsync({ ...agent, status: 'Suspended' })
      await insertKillSwitchEvent({
        agentId: agent.id,
        agentName: agent.name,
        triggerType: 'kill',
        triggeredBy: user?.fullName ?? user?.email ?? 'Unknown user',
        reason,
      })
      qc.invalidateQueries({ queryKey: ['kill_switch_events'] })
      toast.success(`${agent.name} suspended — kill switch event recorded`)
      setShowKillSwitch(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kill switch failed — agent state unchanged')
    } finally {
      setKillBusy(false)
    }
  }

  const overviewFields: { label: string; value: ReactNode }[] = [
    { label: 'Type', value: agent.type ?? '—' },
    { label: 'Base Model', value: modelPill },
    { label: 'Owner', value: agent.owner || '—' },
    { label: 'Team', value: agent.team || '—' },
    { label: 'Version', value: agent.agentVersion || '—' },
    { label: 'Approved By', value: agent.approvedBy || '—' },
    { label: 'Registered', value: agent.registeredDate ? formatDate(agent.registeredDate) : '—' },
    { label: 'Last Activity', value: agent.lastActivity || '—' },
  ]

  return (
    <div>
      <PageHeader
        title={agent.name ?? agent.id}
        description={agent.purpose || undefined}
        icon={Robot}
        onBack={() => navigate('/agents')}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Agents', href: '/agents' }, { label: agent.name ?? agent.id }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'hsl(var(--text-4))' }}>{agent.id}</span>
            <span style={{ padding: '1px 7px', fontSize: 11, background: statusStyle.bg, color: statusStyle.color }}>{agent.status ?? 'Unknown'}</span>
            <span style={{ padding: '1px 7px', fontSize: 11, background: tierStyle.bg, color: tierStyle.color }}>{agent.riskTier ?? 'Unassessed'} risk</span>
            {agent.killSwitchEnabled && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowKillSwitch(true)}
                disabled={agent.status === 'Suspended'}
                style={{ marginLeft: 8, background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}
              >
                <Skull size={14} style={{ marginRight: 6 }} /> {agent.status === 'Suspended' ? 'Suspended' : 'Kill Switch'}
              </Button>
            )}
          </div>
        }
      />

      {/* Cross-module interlinks — same agent id everywhere */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>Related:</span>
        <Link to={`/agents?agent=${agent.id}`} className={linkPillCls} aria-label="Open in the Agents registry">
          <Robot size={12} className="mr-1" /> Registry
        </Link>
        <Link to={`/agent-iam?agent=${agent.id}`} className={linkPillCls} aria-label="Open IAM credentials for this agent">
          <Key size={12} className="mr-1" /> IAM Credentials ({credentials.length})
        </Link>
        <Link to={`/kill-switch?agent=${agent.id}`} className={linkPillCls} aria-label="Open kill switch history for this agent">
          <Power size={12} className="mr-1" /> Kill Switch History ({killEvents.length})
        </Link>
        <Link to={`/multi-agent?agent=${agent.id}`} className={linkPillCls} aria-label="Open workflows involving this agent">
          <TreeStructure size={12} className="mr-1" /> Workflows
        </Link>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credentials">Credentials ({credentials.length})</TabsTrigger>
          <TabsTrigger value="killswitch">Kill Switch History ({killEvents.length})</TabsTrigger>
        </TabsList>

        {/* ── Overview — registry record fields only ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {overviewFields.map(item => (
              <Card key={item.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <div style={{ padding: 12 }}>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{item.label}</p>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', marginTop: 2 }}>{item.value}</div>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Trust Score', value: typeof agent.trustScore === 'number' && agent.trustScore > 0 ? String(agent.trustScore) : 'Not scored' },
              { label: 'Daily API Calls', value: typeof agent.dailyCallCount === 'number' ? formatNumber(agent.dailyCallCount) : '—' },
              { label: 'Lifetime Calls', value: typeof agent.totalCallsLifetime === 'number' ? formatNumber(agent.totalCallsLifetime) : '—' },
              { label: 'Avg Latency', value: typeof agent.avgLatencyMs === 'number' && agent.avgLatencyMs > 0 ? `${formatNumber(agent.avgLatencyMs)} ms` : '—' },
              { label: 'Max Budget', value: typeof agent.maxBudget === 'number' && agent.maxBudget > 0 ? `$${formatNumber(agent.maxBudget)}` : '—' },
            ].map(item => (
              <Card key={item.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <div style={{ padding: 12 }}>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{item.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--brand))', marginTop: 2 }}>{item.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {agent.escalationPolicy && (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>Escalation Policy</p>
                <p style={{ fontSize: 13, color: 'hsl(var(--text-1))', marginTop: 2 }}>{agent.escalationPolicy}</p>
              </div>
            </Card>
          )}

          {(agent.tools?.length ?? 0) > 0 && (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 8 }}>Tools</p>
                <div className="flex gap-2 flex-wrap">
                  {agent.tools.map(t => <span key={t} className={pillCls} style={{ color: 'hsl(var(--text-2))' }}>{t}</span>)}
                </div>
              </div>
            </Card>
          )}

          {(agent.permissions?.length ?? 0) > 0 && (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 8 }}>Capability Grants</p>
                <div className="flex gap-2 flex-wrap">
                  {agent.permissions.map(p => <span key={p} className={`${pillCls} font-mono`} style={{ color: 'hsl(var(--text-2))' }}>{p}</span>)}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── Credentials — real agent_gov_credentials rows for this agent ── */}
        <TabsContent value="credentials" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Key size={16} style={{ color: 'hsl(var(--brand))' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>IAM Credentials — {agent.id}</p>
                </div>
                <Link to={`/agent-iam?agent=${agent.id}`} className={linkPillCls}>Manage in Agent IAM</Link>
              </div>
              {credsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : credsError ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--destructive))' }}>
                  Failed to load credentials: {credsError instanceof Error ? credsError.message : 'Unknown error'}
                </p>
              ) : credentials.length === 0 ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))' }}>
                  No credentials issued for this agent. Provision one from Agent IAM.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Principal', 'Type', 'Roles', 'Scopes', 'Status', 'Expires'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid hsl(var(--border))', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {credentials.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'hsl(var(--text-1))' }}>{c.principalId || '—'}</td>
                          <td style={{ padding: '8px 12px', color: 'hsl(var(--text-2))' }}>{c.principalType || '—'}</td>
                          <td style={{ padding: '8px 12px', color: 'hsl(var(--text-2))' }}>{(c.roles ?? []).join(', ') || '—'}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'hsl(var(--text-2))' }}>{(c.scopes ?? []).join(', ') || '—'}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: CRED_STATUS_COLOR[c.status ?? ''] ?? 'hsl(var(--text-4))' }}>{c.status ?? '—'}</td>
                          <td style={{ padding: '8px 12px', color: 'hsl(var(--text-4))' }}>{c.expires ? formatDate(c.expires) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ── Kill switch history — real kill_switch_events rows ── */}
        <TabsContent value="killswitch" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Power size={16} style={{ color: 'hsl(var(--destructive))' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>Kill Switch Events — {agent.id}</p>
                </div>
                <Link to={`/kill-switch?agent=${agent.id}`} className={linkPillCls}>Open full event log</Link>
              </div>
              {ksQuery.isLoading ? (
                <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : ksQuery.error ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--destructive))' }}>
                  Failed to load kill switch events: {ksQuery.error instanceof Error ? ksQuery.error.message : 'Unknown error'}
                </p>
              ) : killEvents.length === 0 ? (
                <p style={{ fontSize: 12, color: 'hsl(var(--text-4))' }}>
                  No kill switch events recorded for this agent.
                </p>
              ) : (
                <div className="space-y-2">
                  {killEvents.map(e => (
                    <div key={e.id} style={{ padding: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--destructive))', textTransform: 'uppercase' }}>{e.triggerType ?? 'unknown'}</span>
                        <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{e.triggeredAt ? formatDate(e.triggeredAt) : '—'}</span>
                        <span className={pillCls} style={{ color: 'hsl(var(--text-2))' }}>{e.status ?? '—'}</span>
                        {e.severity && <span className={pillCls} style={{ color: 'hsl(var(--s-wn-tx))' }}>{e.severity}</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-1))', marginTop: 6 }}>{e.reason || 'No reason recorded'}</p>
                      <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 4 }}>Triggered by {e.triggeredBy || 'unknown'}</p>
                      {e.resolutionNotes && (
                        <p style={{ fontSize: 11, color: 'hsl(var(--s-ok-tx))', marginTop: 4 }}>Resolution: {e.resolutionNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {showKillSwitch && (
        <KillSwitchModal
          agent={agent}
          busy={killBusy}
          onConfirm={handleKillConfirm}
          onClose={() => { if (!killBusy) setShowKillSwitch(false) }}
        />
      )}
    </div>
  )
}
