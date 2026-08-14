// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// KillSwitchEvents — audit log of agent suspension events, backed by the
// org-scoped kill_switch_events table. Kill-all suspends real agents in
// agent_gov_registry and records one auditable event; blast radius is derived
// from the live registry. Events interlink to /agents?open=<agent_id>
// and the page honors ?open=<event id> deep links.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { exportCsv } from '@/lib/exportUtils'
import { Power, MagnifyingGlass, X, Export, ShieldWarning, Siren, ClipboardText } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { agentRecordHooks } from '@/hooks/queries/useAgentGovCrud'
import { useAuthStore } from '@/store/authStore'
import {
  fetchKillSwitchEvents, insertKillSwitchEvent, updateKillSwitchEvent,
  type KillSwitchEvent, type KillSwitchEventInput,
} from '@/services/killSwitchService'

const EVENTS_KEY = ['kill_switch_events']
const KILL_ALL_PHRASE = 'KILL ALL AGENTS'

const pillCls = 'inline-flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-2 py-[2px] text-[11px] font-medium whitespace-nowrap'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  resumed: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  resolved: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  investigating: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  escalated: { bg: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' },
}
const FALLBACK_STYLE = { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }
const statusStyle = (s: string | null) => (s ? STATUS_STYLE[s.toLowerCase()] ?? FALLBACK_STYLE : FALLBACK_STYLE)

const fmt = (ts: string | null | undefined) => (ts ? new Date(ts).toLocaleString() : '—')

export default function KillSwitchEvents() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const user = useAuthStore(s => s.user)
  const operator = user ? `${user.name || user.email}${user.email && user.name ? ` (${user.email})` : ''}` : 'Unknown operator'

  const { data: events = [], isLoading, isError, refetch } = useQuery({
    queryKey: EVENTS_KEY,
    queryFn: fetchKillSwitchEvents,
    staleTime: 30_000,
  })
  const { data: agents = [] } = agentRecordHooks.useList()
  const upsertAgent = agentRecordHooks.useUpsert()

  const insertEvent = useMutation({
    mutationFn: (input: KillSwitchEventInput) => insertKillSwitchEvent(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  })
  const updateEvent = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: KillSwitchEventInput }) => updateKillSwitchEvent(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  })

  const [selected, setSelected] = useState<KillSwitchEvent | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [killAllOpen, setKillAllOpen] = useState(false)
  const [postMortemOpen, setPostMortemOpen] = useState<KillSwitchEvent | null>(null)
  const [resumeTarget, setResumeTarget] = useState<KillSwitchEvent | null>(null)

  // Honor ?open=<event id> once the list has loaded.
  const openedRef = useRef(false)
  useEffect(() => {
    const openId = params.get('open')
    if (!openId || openedRef.current || events.length === 0) return
    const ev = events.find(e => e.id === openId)
    if (ev) {
      openedRef.current = true
      setSelected(ev)
      const next = new URLSearchParams(params)
      next.delete('open')
      setParams(next, { replace: true })
    }
  }, [params, events, setParams])

  const activeAgents = useMemo(() => agents.filter(a => a.status === 'Active'), [agents])

  const statusOptions = useMemo(() => {
    const s = new Set<string>()
    events.forEach(e => { if (e.status) s.add(e.status) })
    return ['All', ...Array.from(s).sort()]
  }, [events])

  const filtered = events.filter(e =>
    (statusFilter === 'All' || e.status === statusFilter) &&
    (!search ||
      (e.agentName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      (e.reason ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    total: events.length,
    active: events.filter(e => e.status === 'active').length,
    resumed: events.filter(e => e.status === 'resumed').length,
    escalated: events.filter(e => e.status === 'escalated').length,
  }

  const resolvedEvents = events.filter(e => e.status === 'resumed')

  const handleExport = () => {
    if (filtered.length === 0) { toast.info('No events to export.'); return }
    exportCsv(
      filtered.map(e => ({
        id: e.id,
        agent_id: e.agentId ?? '',
        agent_name: e.agentName ?? '',
        trigger_type: e.triggerType ?? '',
        severity: e.severity ?? '',
        status: e.status ?? '',
        triggered_at: e.triggeredAt ?? '',
        triggered_by: e.triggeredBy ?? '',
        reason: e.reason ?? '',
        affected_systems: e.affectedSystems.join('; '),
        resolved_by: e.resolvedBy ?? '',
        resolved_at: e.resolvedAt ?? '',
        resolution_notes: e.resolutionNotes ?? '',
      })),
      'kill-switch-events.csv',
    )
  }

  const handleKillAll = async () => {
    if (activeAgents.length === 0) { toast.info('No active agents in the registry — nothing to suspend.'); return }
    try {
      for (const a of activeAgents) {
        await upsertAgent.mutateAsync({ ...a, status: 'Suspended', killSwitchEnabled: true })
      }
      await insertEvent.mutateAsync({
        agentId: null,
        agentName: 'ALL AGENTS',
        triggeredBy: operator,
        triggerType: 'kill_all',
        reason: `Emergency kill-all triggered from the Kill Switch console. ${activeAgents.length} active agent(s) suspended in the agent registry.`,
        severity: 'critical',
        status: 'active',
        affectedSystems: activeAgents.map(a => a.name),
        triggeredAt: new Date().toISOString(),
      })
      toast.error(`KILL ALL executed — ${activeAgents.length} agent(s) suspended and event recorded`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kill all failed — no changes were confirmed')
    }
  }

  const handleResume = async (ev: KillSwitchEvent) => {
    try {
      const updated = await updateEvent.mutateAsync({
        id: ev.id,
        patch: { status: 'resumed', resolvedBy: operator, resolvedAt: new Date().toISOString() },
      })
      if (ev.agentId) {
        const agent = agents.find(a => a.id === ev.agentId)
        if (agent && agent.status !== 'Active') {
          await upsertAgent.mutateAsync({ ...agent, status: 'Active' })
        }
      }
      toast.success(`${ev.agentName ?? 'Agent'} resumption approved`)
      setSelected(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve resumption')
    }
  }

  const handleEscalate = async (ev: KillSwitchEvent) => {
    try {
      await insertEvent.mutateAsync({
        agentId: ev.agentId,
        agentName: ev.agentName,
        triggeredBy: operator,
        triggerType: 'escalate',
        reason: `Escalation of event ${ev.id}${ev.reason ? ` — original reason: ${ev.reason}` : ''}`,
        severity: ev.severity ?? 'high',
        status: 'escalated',
        affectedSystems: ev.affectedSystems,
        triggeredAt: new Date().toISOString(),
        metadata: { escalatedFromEventId: ev.id },
      })
      toast.success('Escalation event recorded')
      setSelected(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record escalation')
    }
  }

  /** Agent pill: link to the registry when the canonical agent id is present. */
  const agentPill = (ev: KillSwitchEvent) => {
    if (ev.agentId) {
      const registered = agents.find(a => a.id === ev.agentId)
      return (
        <Link
          to={`/agents?open=${ev.agentId}`}
          onClick={e => e.stopPropagation()}
          className={`${pillCls} text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))] hover:underline`}
          aria-label={`Open ${registered?.name ?? ev.agentName ?? 'agent'} in Agent Registry`}
        >
          {registered?.name ?? ev.agentName ?? 'Unavailable'}
        </Link>
      )
    }
    return <span className="text-sm font-semibold text-[hsl(var(--text-1))]">{ev.agentName ?? 'Unavailable'}</span>
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kill Switch Events"
        subtitle="Audit log of all agent suspension events — manual, automated, and regulatory"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Agents' }, { label: 'Kill Switch' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
              <Export size={14} /> Export CSV
            </button>
            <button
              onClick={() => setKillAllOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[hsl(var(--bg-surface))] hover:opacity-90"
              style={{ background: 'hsl(var(--s-er-tx))' }}
              aria-label="Kill all active agents">
              <Siren size={14} /> KILL ALL AGENTS
            </button>
          </div>
        }
      />

      {/* Blast Radius — derived from the live agent registry */}
      <div className="rounded border border-[hsl(var(--border))] bg-surface p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-3">
          <ShieldWarning size={15} className="text-[hsl(var(--s-wn-tx))]" weight="duotone" />
          Blast Radius — If All Active Agents Are Suspended
        </h3>
        {activeAgents.length === 0 ? (
          <p className="text-xs text-[hsl(var(--text-4))]">No active agents in the registry — a kill-all would suspend nothing.</p>
        ) : (
          <>
            <p className="text-xs text-[hsl(var(--text-3))] mb-3">
              <span className="text-lg font-bold text-[hsl(var(--destructive))]">{activeAgents.length}</span>
              <span className="ml-1.5">active agent{activeAgents.length !== 1 ? 's' : ''} would be suspended (live from Agent Registry)</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {activeAgents.map(a => (
                <div key={a.id} className="p-2 border border-[hsl(var(--border))]">
                  <Link
                    to={`/agents?open=${a.id}`}
                    className={`${pillCls} text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))] hover:underline`}
                  >
                    {a.name}
                  </Link>
                  <p className="text-[hsl(var(--text-3))] mt-1">{a.purpose || 'No purpose recorded'}</p>
                  <p className="text-[hsl(var(--text-4))] mt-0.5">{a.team ? `Team: ${a.team} · ` : ''}Risk tier: {a.riskTier}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Active Suspensions', value: stats.active, color: 'hsl(var(--destructive))' },
          { label: 'Resumed', value: stats.resumed, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Escalated', value: stats.escalated, color: 'hsl(var(--tag-purple))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {stats.active > 0 && (
        <div className="flex items-center gap-3 p-3 border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--s-er-bg))]">
          <Power size={16} className="text-[hsl(var(--destructive))] flex-shrink-0" weight="fill" />
          <p className="text-sm text-[hsl(var(--text-2))]"><span className="font-semibold text-[hsl(var(--destructive))]">{stats.active} suspension event(s) currently active.</span> Review suspension reasons and coordinate remediation before resuming.</p>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs border border-[hsl(var(--border))] bg-surface px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" aria-label="Search kill switch events" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ borderRadius: 0 }} aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : isError ? (
        <ErrorState message="Failed to load kill switch events." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={events.length === 0 ? 'No kill switch events recorded' : 'No events match the current filters'}
          message={events.length === 0
            ? 'Suspension events will appear here when an agent kill switch is triggered — manually, automatically, or by regulatory order.'
            : 'Adjust the search or status filter to see more events.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(e => (
            <div
              key={e.id}
              role="button"
              tabIndex={0}
              aria-label={`Open kill switch event for ${e.agentName ?? 'unknown agent'}`}
              className="rounded border border-[hsl(var(--border))] bg-surface p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] focus:outline-none focus:border-[hsl(var(--brand))]"
              onClick={() => setSelected(e)}
              onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSelected(e) } }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(e.status)}>{e.status ?? 'unknown'}</span>
                    {e.triggerType && <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{e.triggerType}</span>}
                    {e.severity && <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">severity: {e.severity}</span>}
                  </div>
                  <div className="flex items-center gap-2">{agentPill(e)}</div>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-1">{fmt(e.triggeredAt)}{e.triggeredBy ? ` · By: ${e.triggeredBy}` : ''}</p>
                  {e.reason && <p className="text-xs text-[hsl(var(--text-3))] mt-2 line-clamp-2">{e.reason}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {e.affectedSystems.length > 0 && <p className="text-xs text-[hsl(var(--text-4))]">{e.affectedSystems.length} affected system{e.affectedSystems.length !== 1 ? 's' : ''}</p>}
                  {e.resolvedAt && <p className="text-xs text-[hsl(var(--s-ok-tx))] mt-1">Resolved: {fmt(e.resolvedAt)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post-mortems for resolved events, rendered from real event fields */}
      {resolvedEvents.length > 0 && (
        <div className="rounded border border-[hsl(var(--border))] bg-surface p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-3">
            <ClipboardText size={15} className="text-[hsl(var(--brand))]" />
            Post-mortems
          </h3>
          <p className="text-xs text-[hsl(var(--text-4))] mb-3">Structured summary of each resolved incident, built from the recorded event data.</p>
          <div className="space-y-2">
            {resolvedEvents.map(e => (
              <div key={e.id} className="p-3 border border-[hsl(var(--border))] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs text-[hsl(var(--text-2))]">{e.agentName ?? 'Unavailable'}</span>
                  <span className="text-[10px] text-[hsl(var(--text-4))] ml-2">· {fmt(e.triggeredAt)}</span>
                </div>
                <button
                  onClick={() => setPostMortemOpen(e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised flex-shrink-0">
                  <ClipboardText size={12} /> View Post-mortem
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post-mortem detail — real fields only */}
      {postMortemOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPostMortemOpen(null)} />
          <div className="relative w-[640px] max-h-[80vh] overflow-y-auto bg-surface border border-[hsl(var(--border))]" role="dialog" aria-modal="true" aria-label="Post-mortem report">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">Post-mortem — {postMortemOpen.agentName ?? 'Unavailable'}</h2>
              <button onClick={() => setPostMortemOpen(null)} aria-label="Close post-mortem"><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              {[
                { title: 'Incident Summary', content: `${postMortemOpen.agentName ?? 'Agent'} was suspended on ${fmt(postMortemOpen.triggeredAt)}${postMortemOpen.triggerType ? ` via ${postMortemOpen.triggerType} trigger` : ''}.${postMortemOpen.reason ? `\nReason: ${postMortemOpen.reason}` : ''}` },
                { title: 'Timeline', content: `${fmt(postMortemOpen.triggeredAt)} — Kill switch triggered${postMortemOpen.triggeredBy ? ` by ${postMortemOpen.triggeredBy}` : ''}\n${postMortemOpen.resolvedAt ? `${fmt(postMortemOpen.resolvedAt)} — Resumption approved${postMortemOpen.resolvedBy ? ` by ${postMortemOpen.resolvedBy}` : ''}` : 'Pending resolution.'}` },
                { title: 'Affected Systems', content: postMortemOpen.affectedSystems.length ? postMortemOpen.affectedSystems.join('\n') : 'No affected systems recorded.' },
                { title: 'Resolution Notes', content: postMortemOpen.resolutionNotes || 'No resolution notes recorded.' },
              ].map(s => (
                <div key={s.title} className="p-3 border border-[hsl(var(--border))]">
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-1))] mb-1.5">{s.title}</p>
                  <pre className="text-[hsl(var(--text-3))] whitespace-pre-wrap font-sans leading-relaxed">{s.content}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto" role="dialog" aria-modal="true" aria-label="Kill switch event detail">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">Kill Switch —</h2>
                {agentPill(selected)}
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close event detail"><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(selected.status)}>{selected.status ?? 'unknown'}</span>
                {selected.triggerType && <span className="text-[11px] px-2 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.triggerType}</span>}
                {selected.severity && <span className="text-[11px] px-2 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">severity: {selected.severity}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Triggered At', value: fmt(selected.triggeredAt) },
                  { label: 'Triggered By', value: selected.triggeredBy ?? '—' },
                  { label: 'Resolved By', value: selected.resolvedBy ?? '—' },
                  { label: 'Resolved At', value: fmt(selected.resolvedAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[hsl(var(--destructive))] uppercase tracking-wide mb-1">Suspension Reason</p>
                <p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--s-er-bg))] border border-[hsl(var(--destructive)/0.3)] leading-relaxed">{selected.reason || 'No reason recorded.'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Affected Systems</p>
                {selected.affectedSystems.length ? (
                  <div className="space-y-1">{selected.affectedSystems.map(s => <div key={s} className="text-xs text-[hsl(var(--text-2))] p-2 bg-raised border border-[hsl(var(--border))]">{s}</div>)}</div>
                ) : (
                  <p className="text-xs text-[hsl(var(--text-4))]">No affected systems recorded.</p>
                )}
              </div>
              {selected.resolutionNotes && (
                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--s-ok-tx))] uppercase tracking-wide mb-1">Resolution Notes</p>
                  <p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--s-ok-bg))] border border-[hsl(var(--s-ok-tx)/0.3)] leading-relaxed">{selected.resolutionNotes}</p>
                </div>
              )}
            </div>
            {selected.status === 'active' && (
              <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
                <button
                  onClick={() => setResumeTarget(selected)}
                  disabled={updateEvent.isPending}
                  className="flex-1 py-2 bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90 disabled:opacity-40">
                  Approve Resumption
                </button>
                <button
                  onClick={() => handleEscalate(selected)}
                  disabled={insertEvent.isPending}
                  className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised disabled:opacity-40">
                  Escalate
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kill All — typed-phrase confirmation against the live registry */}
      <ConfirmDialog
        open={killAllOpen}
        title="Emergency: Kill All Agents"
        description={activeAgents.length === 0
          ? 'There are no active agents in the registry — a kill-all would suspend nothing.'
          : `This immediately suspends all ${activeAgents.length} active agent(s) in the registry and records an auditable kill switch event.`}
        confirmLabel="EXECUTE KILL ALL"
        type="danger"
        requiresTyping={KILL_ALL_PHRASE}
        impactList={activeAgents.map(a => a.name)}
        onConfirm={() => { void handleKillAll() }}
        onClose={() => setKillAllOpen(false)}
      />

      <ConfirmDialog
        open={!!resumeTarget}
        title="Approve Agent Resumption"
        description={`Resume ${resumeTarget?.agentName ?? 'this agent'}? The suspension event will be marked resumed and the agent set back to Active in the registry. Ensure the root cause has been remediated before approving.`}
        confirmLabel="Approve Resumption"
        type="info"
        onConfirm={() => {
          if (!resumeTarget) return
          void handleResume(resumeTarget)
          setResumeTarget(null)
        }}
        onClose={() => setResumeTarget(null)}
      />
    </div>
  )
}
