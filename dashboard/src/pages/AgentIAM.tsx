// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// AgentIAM — identity & access management for AI agents, backed by the
// org-scoped agent_gov_credentials table. Credentials interlink to the Agent
// Registry (canonical agent_gov_registry id) and runtime traces. The
// least-privilege view is derived from real credential metadata; capabilities
// that are not instrumented yet say so honestly instead of showing fake rows.

import { useEffect, useMemo, useRef, useState } from 'react'
import { exportCsv } from '@/lib/exportUtils'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IdentificationCard, MagnifyingGlass, Plus, Eye, X, Export, Key, ShieldCheck, Warning, Lock, UserCheck, Siren, Pulse, Cpu } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserSelect } from '@/components/evals/UserSelect'
import { TableSkeleton, ErrorState, EmptyState } from '@/components/evals/states'
import { logAction } from '@/lib/auditLogger'
import { agentCredentialHooks, agentRecordHooks } from '@/hooks/queries/useAgentGovCrud'
import type { AgentCredential, PrincipalType } from '@/types/agentGov'


type AgentIdentity = AgentCredential


const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  Revoked: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  Expired: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  'Pending Rotation': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
}

const STALE_DAYS = 30

function daysSince(dateStr: string): number | null {
  const t = Date.parse(dateStr)
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86400000)
}

export default function AgentIAM() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState<string | null>(params.get('agent'))
  const [selected, setSelected] = useState<AgentIdentity | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [revokeTarget, setRevokeTarget] = useState<AgentIdentity | null>(null)
  const [rotateTarget, setRotateTarget] = useState<AgentIdentity | null>(null)
  const [showProvision, setShowProvision] = useState(false)
  const [rotatingAll, setRotatingAll] = useState(false)
  const { data: identities = [], isLoading, isError, error, refetch } = agentCredentialHooks.useList()
  const { data: registryAgents = [] } = agentRecordHooks.useList()
  const upsert = agentCredentialHooks.useUpsert()
  const drawerRef = useRef<HTMLDivElement>(null)
  const openedRef = useRef<string | null>(null)

  // Deep link: ?open=<credential id> opens that credential's drawer (once per id).
  useEffect(() => {
    const openId = params.get('open')
    if (!openId || openedRef.current === openId || !identities.length) return
    const match = identities.find(i => i.id === openId || i.displayId === openId)
    if (match) { openedRef.current = openId; setSelected(match) }
  }, [params, identities])

  // Escape closes the drawer (Confirm/Form dialogs manage their own overlays).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected && !revokeTarget && !rotateTarget && !showProvision) setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, revokeTarget, rotateTarget, showProvision])

  useEffect(() => { if (selected) drawerRef.current?.focus() }, [selected])

  const filterAgent = agentFilter ? registryAgents.find(a => a.id === agentFilter) : undefined

  function rotated(target: AgentIdentity): AgentIdentity {
    const newExpiry = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
    return { ...target, status: 'Active', expires: newExpiry, rotationPolicy: `Every 90 days — next: ${newExpiry}` }
  }

  function confirmRevoke() {
    if (!revokeTarget) return
    const target = revokeTarget
    upsert.mutate({ ...target, status: 'Revoked' }, {
      onSuccess: () => {
        toast.success(`Credential ${target.displayId ?? target.id} revoked`)
        void logAction({ module: 'agent-iam', entityType: 'agent_gov_credentials', entityId: target.id, entityName: target.principalId, action: 'revoke' })
        setRevokeTarget(null)
        setSelected(null)
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Revoke failed'),
    })
  }

  function confirmRotate() {
    if (!rotateTarget) return
    const target = rotateTarget
    const next = rotated(target)
    upsert.mutate(next, {
      onSuccess: () => {
        toast.success(`Credential ${target.displayId ?? target.id} rotated — new expiry: ${next.expires}`)
        void logAction({ module: 'agent-iam', entityType: 'agent_gov_credentials', entityId: target.id, entityName: target.principalId, action: 'rotate' })
        setRotateTarget(null)
        setSelected(null)
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Rotation failed'),
    })
  }

  /** Batch rotation: persist every pending credential, one summary toast. */
  async function rotateAllPending() {
    const pending = identities.filter(i => i.status === 'Pending Rotation')
    if (!pending.length || rotatingAll) return
    setRotatingAll(true)
    try {
      await Promise.all(pending.map(c => upsert.mutateAsync(rotated(c))))
      toast.success(`${pending.length} credential(s) rotated`)
      pending.forEach(c => void logAction({ module: 'agent-iam', entityType: 'agent_gov_credentials', entityId: c.id, entityName: c.principalId, action: 'rotate' }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rotation failed — some credentials were not rotated')
    } finally {
      setRotatingAll(false)
    }
  }

  const filtered = identities.filter(i => {
    const q = search.toLowerCase()
    const ms = i.agentName.toLowerCase().includes(q) || i.agentId.toLowerCase().includes(q) || i.principalId.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || (i.displayId ?? '').toLowerCase().includes(q)
    return ms
      && (!agentFilter || i.agentId === agentFilter)
      && (statusFilter === 'All' || i.status === statusFilter)
  })

  const stats = {
    total: identities.length,
    active: identities.filter(i => i.status === 'Active').length,
    pendingRotation: identities.filter(i => i.status === 'Pending Rotation').length,
    auditRequired: identities.filter(i => i.auditRequired).length,
  }

  // Least-privilege view derived from real credential metadata: scopes granted
  // vs last observed use per credential. Per-scope usage is not instrumented.
  const leastPrivilege = useMemo(() =>
    identities
      .filter(i => i.status === 'Active' || i.status === 'Pending Rotation')
      .map(i => {
        const days = i.lastUsed === 'Never' ? null : daysSince(i.lastUsed)
        const signal = i.lastUsed === 'Never'
          ? 'Never used'
          : days !== null && days > STALE_DAYS ? `Stale — last used ${days}d ago` : 'In use'
        return { cred: i, signal, flagged: signal !== 'In use' }
      }),
  [identities])

  function handleExport() {
    if (!filtered.length) { toast.info('No identities to export'); return }
    exportCsv(filtered.map(i => ({
      id: i.id,
      display_id: i.displayId ?? '',
      agent_id: i.agentId,
      agent_name: i.agentName,
      principal_type: i.principalType,
      principal_id: i.principalId,
      roles: i.roles.join('; '),
      scopes: i.scopes.join('; '),
      created: i.created,
      expires: i.expires,
      last_used: i.lastUsed,
      status: i.status,
      mfa_required: i.mfaRequired,
      ip_allowlist: i.ipAllowlist.join('; '),
      rotation_policy: i.rotationPolicy,
      audit_required: i.auditRequired,
      approved_by: i.approvedBy ?? '',
    })), 'agent-iam.csv')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agent IAM"
        subtitle="Identity and access management for AI agents — credentials, roles, scopes, and rotation policies"
        icon={IdentificationCard}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/agents')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
              <Cpu size={14} /> Agent Registry
            </button>
            <button onClick={() => navigate('/trust-engine/traces')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
              <Pulse size={14} /> Runtime Traces
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
              <Export size={14} /> Export
            </button>
            <button onClick={() => setShowProvision(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm hover:opacity-90">
              <Plus size={14} /> Provision Identity
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Identities', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Active', value: stats.active, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Pending Rotation', value: stats.pendingRotation, color: 'hsl(var(--s-wn-tx))' },
          { label: 'Audit Required', value: stats.auditRequired, color: 'hsl(var(--brand))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {stats.pendingRotation > 0 && (
        <div className="flex items-center gap-3 p-3 border border-[hsl(var(--s-wn-bg))] bg-[hsl(var(--s-wn-bg))]">
          <Warning size={16} className="text-[hsl(var(--s-wn-tx))] flex-shrink-0" />
          <p className="text-sm text-[hsl(var(--text-2))]"><span className="font-semibold">{stats.pendingRotation} credential(s)</span> pending rotation. Rotate immediately to maintain security posture.</p>
          <button
            onClick={() => void rotateAllPending()}
            disabled={rotatingAll}
            className="ml-auto text-sm px-3 py-1 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] hover:opacity-90 flex-shrink-0 disabled:opacity-60">{rotatingAll ? 'Rotating…' : 'Rotate Now'}</button>
        </div>
      )}

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search identities…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ borderRadius: 0 }} aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['All', 'Active', 'Pending Rotation', 'Revoked', 'Expired'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {agentFilter && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(var(--brand)/0.08)] text-[hsl(var(--brand))] border border-[hsl(var(--brand)/0.25)]">
            Agent: {filterAgent?.name ?? 'Unavailable'}
            <button onClick={() => setAgentFilter(null)} aria-label="Clear agent filter" className="hover:opacity-70"><X size={12} /></button>
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface p-4"><TableSkeleton rows={6} cols={8} /></div>
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
      <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-raised">
              {['ID', 'Agent', 'Principal Type', 'Principal ID', 'Roles', 'Expires', 'MFA', 'Audit', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => setSelected(i)}>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{i.displayId ?? i.id}</td>
                <td className="px-4 py-3 text-xs font-medium">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/agents?open=${i.agentId}`) }}
                    className="text-[hsl(var(--brand))] hover:underline"
                    title={`Open ${i.agentName} in Agent Registry`}
                  >{i.agentName}</button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-3))]">
                    <Key size={11} />
                    {i.principalType}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-[hsl(var(--text-4))] max-w-[160px] truncate">{i.principalId}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{i.roles.slice(0, 2).join(', ')}{i.roles.length > 2 ? ` +${i.roles.length - 2}` : ''}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{i.expires}</td>
                <td className="px-4 py-3">
                  <ShieldCheck size={14} className={i.mfaRequired ? 'text-[hsl(var(--s-ok-tx))]' : 'text-[hsl(var(--text-4))]'} weight={i.mfaRequired ? 'fill' : 'regular'} />
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-1.5 py-0.5 ${i.auditRequired ? 'bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))]'}`}>{i.auditRequired ? 'Required' : 'Optional'}</span>
                </td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[i.status] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{i.status}</span></td>
                <td className="px-4 py-3"><Eye size={14} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]" aria-label={`View credential ${i.displayId ?? i.id}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">{identities.length === 0 ? 'No agent identities provisioned yet' : 'No identities match filters'}</div>}
      </div>
      )}

      {/* ── Least-Privilege Posture — derived from real credential metadata ──── */}
      <div className="rounded border border-[hsl(var(--border))] bg-surface p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-1">
          <Lock size={16} className="text-[hsl(var(--brand))]" weight="duotone" />
          Least-Privilege Posture
        </h3>
        <p className="text-xs text-[hsl(var(--text-4))] mb-3">Scopes granted vs last observed use, per credential. Per-scope usage telemetry is not instrumented yet — a flagged row means the whole credential looks unused or stale and should be reviewed.</p>
        {leastPrivilege.length === 0 ? (
          <EmptyState title="No active credentials to analyse" message="Provision an identity to see its least-privilege posture here." />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-raised">
                {['Agent', 'Credential', 'Scopes Granted', 'Last Used', 'Expires', 'Signal', 'Action'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-[hsl(var(--text-4))]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leastPrivilege.map(({ cred, signal, flagged }) => (
                <tr key={cred.id} className="border-b border-[hsl(var(--border))] hover:bg-raised">
                  <td className="px-3 py-2">
                    <button onClick={() => navigate(`/agents?open=${cred.agentId}`)} className="font-medium text-[hsl(var(--brand))] hover:underline">{cred.agentName}</button>
                  </td>
                  <td className="px-3 py-2 font-mono text-[hsl(var(--text-3))]">{cred.displayId ?? cred.id}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {cred.scopes.map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-3))] font-mono">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[hsl(var(--text-3))]">{cred.lastUsed}</td>
                  <td className="px-3 py-2 text-[hsl(var(--text-3))]">{cred.expires}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{
                      background: flagged ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-ok-bg))',
                      color: flagged ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                    }}>{signal}</span>
                  </td>
                  <td className="px-3 py-2">
                    {flagged ? (
                      <button onClick={() => setRevokeTarget(cred)} className="text-[10px] px-2 py-0.5 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]">Revoke</button>
                    ) : <span className="text-[10px] text-[hsl(var(--text-4))]">No action needed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Access reviews & anomaly detection — not instrumented yet ────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-surface p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-3">
            <UserCheck size={15} className="text-[hsl(var(--brand))]" weight="duotone" />
            Access Review Campaigns
          </h3>
          <EmptyState
            title="Not instrumented yet"
            message="Periodic access-review campaigns for agent credentials have not been set up. Until then, use the least-privilege posture above to review grants manually."
          />
        </div>

        <div className="rounded border border-[hsl(var(--border))] bg-surface p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-3">
            <Siren size={15} className="text-[hsl(var(--destructive))]" weight="duotone" />
            Anomalous Access Detection
          </h3>
          <EmptyState
            title="Not instrumented yet"
            message="No behavioural baseline is being collected for agent credentials, so no anomaly findings can be shown. Runtime traces in the Trust Engine are the current source for investigating access behaviour."
          />
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Credential details: ${selected.displayId ?? selected.id}`}
            className="w-[480px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto outline-none">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.displayId ?? selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.agentName} — {selected.principalType}</h2></div>
              <button onClick={() => setSelected(null)} aria-label="Close drawer"><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{selected.status}</span>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Principal ID</p><p className="font-mono text-xs text-[hsl(var(--text-2))] p-2 bg-raised border border-[hsl(var(--border))] break-all">{selected.principalId}</p></div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Created', value: selected.created },
                  { label: 'Expires', value: selected.expires },
                  { label: 'Last Used', value: selected.lastUsed },
                  { label: 'MFA Required', value: selected.mfaRequired ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Roles</p><div className="flex flex-wrap gap-1">{selected.roles.map(r => <span key={r} className="text-[10px] px-2 py-0.5 bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] border border-[hsl(var(--brand)/0.2)]">{r}</span>)}</div></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">OAuth Scopes</p><div className="space-y-0.5">{selected.scopes.map(s => <div key={s} className="font-mono text-[10px] text-[hsl(var(--text-2))] p-1.5 bg-raised border border-[hsl(var(--border))]">{s}</div>)}</div></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">IP Allowlist</p><div className="space-y-0.5">{selected.ipAllowlist.map(ip => <div key={ip} className="font-mono text-[10px] text-[hsl(var(--text-2))] p-1.5 bg-raised border border-[hsl(var(--border))]">{ip}</div>)}</div></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Rotation Policy</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-raised border border-[hsl(var(--border))]">{selected.rotationPolicy}</p></div>
            </div>
            {/* Cross-module: credential → agent record → runtime traces */}
            <div className="px-4 pt-3 flex gap-2">
              <button onClick={() => navigate(`/agents?open=${selected.agentId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[hsl(var(--border))] text-xs text-[hsl(var(--text-2))] hover:bg-raised">
                <Cpu size={12} /> View Agent
              </button>
              <button onClick={() => navigate(`/trust-engine/traces?agent=${selected.agentId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[hsl(var(--border))] text-xs text-[hsl(var(--text-2))] hover:bg-raised">
                <Pulse size={12} /> Runtime Traces
              </button>
            </div>
            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button
                onClick={() => setRotateTarget(selected)}
                className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90"
              >
                Rotate Credential
              </button>
              {selected.status === 'Active' && (
                <button
                  onClick={() => setRevokeTarget(selected)}
                  className="px-4 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm hover:bg-[hsl(var(--s-er-bg))]"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ProvisionDialog
        open={showProvision}
        onOpenChange={setShowProvision}
        agents={registryAgents.map(a => ({ id: a.id, name: a.name }))}
        busy={upsert.isPending}
        onSubmit={(rec) => upsert.mutate(rec, {
          onSuccess: () => {
            toast.success(`Identity ${rec.displayId ?? rec.id} provisioned for ${rec.agentName}`)
            void logAction({ module: 'agent-iam', entityType: 'agent_gov_credentials', entityId: rec.id, entityName: rec.principalId, action: 'provision', newValues: rec })
            setShowProvision(false)
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Provisioning failed'),
        })}
      />

      <ConfirmDialog
        open={!!rotateTarget}
        title="Rotate Credential"
        description={`Rotate credential ${rotateTarget?.displayId ?? rotateTarget?.id} for ${rotateTarget?.agentName}? A new credential will be issued and the existing one invalidated. Ensure dependent systems are updated.`}
        confirmLabel="Rotate"

        onConfirm={confirmRotate}
        onClose={() => setRotateTarget(null)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke Credential"
        description={`Permanently revoke ${revokeTarget?.displayId ?? revokeTarget?.id} for ${revokeTarget?.agentName}? The agent will immediately lose all access. This cannot be undone.`}
        confirmLabel="Revoke"
        type="danger"
        onConfirm={confirmRevoke}
        onClose={() => setRevokeTarget(null)}
      />
    </div>
  )
}

// ── Provision Identity dialog ─────────────────────────────────────────────────
// Issues a new credential bound to a registered agent; the issuance approver
// comes from the central Users directory. Ids are uuids (storage key) with a
// human-readable displayId derived for the UI.
function ProvisionDialog({ open, onOpenChange, agents, busy, onSubmit }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  agents: { id: string; name: string }[]
  busy?: boolean
  onSubmit: (rec: AgentCredential) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  const [agentId, setAgentId] = useState('')
  const [principalType, setPrincipalType] = useState<PrincipalType>('Service Account')
  const [principalId, setPrincipalId] = useState('')
  const [roles, setRoles] = useState('')
  const [scopes, setScopes] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)

  const agent = agents.find(a => a.id === agentId)
  const valid = !!agent && principalId.trim() && scopes.trim() && approvedBy.trim()

  function submit() {
    if (!agent) return
    const id = crypto.randomUUID()
    onSubmit({
      id,
      displayId: `IAM-${id.slice(0, 8).toUpperCase()}`,
      agentId: agent.id,
      agentName: agent.name,
      principalType,
      principalId: principalId.trim(),
      roles: roles.split(',').map(s => s.trim()).filter(Boolean),
      scopes: scopes.split(',').map(s => s.trim()).filter(Boolean),
      created: today,
      expires: in90,
      lastUsed: 'Never',
      status: 'Active',
      mfaRequired,
      ipAllowlist: [],
      rotationPolicy: `Every 90 days — next: ${in90}`,
      auditRequired: true,
      approvedBy,
    })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Provision Agent Identity"
      description="Issue a credential bound to a registered agent. Least-privilege: grant only the scopes the agent demonstrably needs."
      submitLabel="Provision"
      busy={busy}
      disabled={!valid}
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Agent" required hint="From the Agent Registry">
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger><SelectValue placeholder="Select agent…" /></SelectTrigger>
            <SelectContent>
              {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Principal type">
          <Select value={principalType} onValueChange={v => setPrincipalType(v as PrincipalType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['Service Account', 'API Key', 'OAuth Client', 'mTLS Certificate'] as PrincipalType[]).map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Principal ID" required>
        <Input value={principalId} onChange={e => setPrincipalId(e.target.value)} placeholder="svc-my-agent@acme-ai.iam.prod" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Roles" hint="Comma-separated">
          <Input value={roles} onChange={e => setRoles(e.target.value)} placeholder="DataReader, AlertWriter" />
        </Field>
        <Field label="Scopes" required hint="Comma-separated, least-privilege">
          <Input value={scopes} onChange={e => setScopes(e.target.value)} placeholder="pipelines:read, alerts:write" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issuance approver" required hint="From the Users directory">
          <UserSelect value={approvedBy} onChange={setApprovedBy} by="name" rolesFilter={['ciso', 'risk', 'compliance']} />
        </Field>
        <Field label="MFA">
          <label className="flex h-9 items-center gap-2 text-sm text-[hsl(var(--text-2))]">
            <input type="checkbox" checked={mfaRequired} onChange={e => setMfaRequired(e.target.checked)} />
            Require MFA for this principal
          </label>
        </Field>
      </div>
    </FormDialog>
  )
}
