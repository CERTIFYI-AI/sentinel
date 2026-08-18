// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MCP Tool Catalog — every tool exposed by a registered MCP server, with its
// risk tier, approval state, human-review requirement and the governed agents
// allowed to call it. Backed by the org-scoped `mcp_tools` table.
// Honors ?server=<uuid> (dismissible filter chip) from the Servers page.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, Scan, Plus, X, Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { useMcpServers, useMcpTools } from '@/hooks/useMcpData'
import { usePolicyDecisions } from '@/hooks/useMcpEnforcement'
import { agentRecordsCrud } from '@/hooks/queries/useAgentGovCrud'
import { useQuery } from '@tanstack/react-query'
import { useRBAC } from '@/hooks/useRBAC'
import type { McpApproval, McpRiskTier, McpToolCategory, McpToolRecord } from '@/services/mcpService'

const RISK_TONE: Record<McpRiskTier, string> = {
  low: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
  medium: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  high: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  critical: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
}

const APPROVAL_TONE: Record<McpApproval, string> = {
  approved: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  under_review: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  restricted: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  blocked: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
}

const CATEGORIES: McpToolCategory[] = ['read', 'write', 'execute', 'admin']
const RISKS: McpRiskTier[] = ['low', 'medium', 'high', 'critical']
const APPROVALS: [McpApproval, string][] = [
  ['approved', 'Approved'], ['under_review', 'Under review'],
  ['restricted', 'Restricted'], ['blocked', 'Blocked'],
]

const EMPTY: Partial<McpToolRecord> = {
  serverId: '', name: '', description: '', category: 'read', riskTier: 'low',
  approvalState: 'under_review', requiresHitl: false, sideEffects: false,
  scopes: [], allowedAgentIds: [], inputSchema: {},
}

export default function ToolCatalog() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [searchParams, setSearchParams] = useSearchParams()
  const serverParam = searchParams.get('server')

  const tools = useMcpTools()
  // What the gateway has actually decided for each tool. Derived from the
  // decision rows at render, never from a stored counter — `invocations_30d`
  // already exists as a number nothing maintains, and a second one would
  // repeat that mistake.
  const enforcement = usePolicyDecisions()
  const servers = useMcpServers()
  const agents = useQuery({ queryKey: ['agent_gov_registry'], queryFn: () => agentRecordsCrud.list(), staleTime: 60_000 })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<McpToolRecord | null>(null)
  const [form, setForm] = useState<Partial<McpToolRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<McpToolRecord | null>(null)

  const set = <K extends keyof McpToolRecord>(k: K, v: McpToolRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY, serverId: serverParam ?? servers.data[0]?.id ?? '' })
    setFormOpen(true)
  }
  function openEdit(t: McpToolRecord) { setEditing(t); setForm({ ...t }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save tool')
    if (editing) {
      tools.update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('Tool updated'); setFormOpen(false) }, onError,
      })
    } else {
      tools.create.mutate(form, {
        onSuccess: () => { toast.success('Tool registered'); setFormOpen(false) }, onError,
      })
    }
  }

  const rows = useMemo(
    () => (serverParam ? tools.data.filter((t) => t.serverId === serverParam) : tools.data),
    [tools.data, serverParam],
  )

  const stats = useMemo(() => ({
    total: rows.length,
    writeOrExec: rows.filter((t) => t.category !== 'read').length,
    hitl: rows.filter((t) => t.requiresHitl).length,
    pending: rows.filter((t) => t.approvalState !== 'approved').length,
  }), [rows])

  const serverName = (id: string) => servers.data.find((s) => s.id === id)?.name
  const agentName = (id: string) => (agents.data ?? []).find((a: any) => a.id === id)?.name

  function clearServerFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('server')
    setSearchParams(next, { replace: true })
  }

  const columns: Column<McpToolRecord>[] = [
    { key: 'name', header: 'Tool', sortable: true, render: (t) => (
      <div>
        <div className="font-mono text-sm font-medium text-[hsl(var(--text-1))]">{t.name}</div>
        {t.description && <div className="max-w-md truncate text-xs text-[hsl(var(--text-4))]">{t.description}</div>}
      </div>
    ) },
    { key: 'server', header: 'Server', render: (t) => {
      const name = serverName(t.serverId)
      return name ? (
        <button className="inline-flex items-center gap-1 text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav('/mcp-gateway/servers') }}>{name} <ArrowSquareOut size={11} /></button>
      ) : <span className="text-xs text-[hsl(var(--text-4))]">Unavailable</span>
    } },
    { key: 'category', header: 'Type', sortable: true, render: (t) => (
      <span className="text-xs capitalize text-[hsl(var(--text-2))]">{t.category}{t.sideEffects ? ' · side effects' : ''}</span>
    ) },
    { key: 'riskTier', header: 'Risk', sortable: true, render: (t) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${RISK_TONE[t.riskTier]}`}>{t.riskTier}</span>
    ) },
    { key: 'enforcement', header: 'Enforcement', render: (t) => {
      const c = enforcement.byTool.get(t.id)
      if (!c) {
        // No decision recorded is genuinely different from zero refusals: the
        // gateway has never been asked about this tool. Say so.
        return <span className="text-[11px] text-[hsl(var(--text-4))]">No calls yet</span>
      }
      return (
        <button
          className="flex flex-col gap-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          onClick={(e) => { e.stopPropagation(); nav('/mcp-gateway/decisions') }}
        >
          <span className="font-mono text-[12px] text-[hsl(var(--text-2))]">
            {c.allowed} allowed
          </span>
          {c.open > 0 && (
            <span className="text-[10px] text-[hsl(var(--s-er-tx))]">
              {c.denied > 0 ? `${c.denied} refused` : ''}
              {c.denied > 0 && c.pending > 0 ? ' · ' : ''}
              {c.pending > 0 ? `${c.pending} awaiting approval` : ''}
            </span>
          )}
        </button>
      )
    } },
    { key: 'approvalState', header: 'Approval', sortable: true, render: (t) => (
      <div className="flex flex-col gap-1">
        <span className={`inline-flex w-fit px-2 py-0.5 text-[11px] font-medium capitalize ${APPROVAL_TONE[t.approvalState]}`}>
          {t.approvalState.replace('_', ' ')}
        </span>
        {t.requiresHitl && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--s-wn-tx))]">
            <Warning size={10} /> human review
          </span>
        )}
      </div>
    ) },
    { key: 'allowedAgentIds', header: 'Allowed agents', render: (t) => t.allowedAgentIds.length ? (
      <div className="flex flex-wrap gap-1">
        {t.allowedAgentIds.slice(0, 2).map((id) => {
          const name = agentName(id)
          return name ? (
            <button key={id} className="border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--brand))] hover:underline"
              onClick={(e) => { e.stopPropagation(); nav(`/agents?open=${id}`) }}>{name}</button>
          ) : <span key={id} className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--text-4))]">Unavailable</span>
        })}
        {t.allowedAgentIds.length > 2 && <span className="text-[10px] text-[hsl(var(--text-4))]">+{t.allowedAgentIds.length - 2}</span>}
      </div>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">none</span> },
    { key: 'invocations30d', header: 'Calls (30d)', sortable: true, render: (t) => (
      <span className="font-mono text-xs">{typeof t.invocations30d === 'number' ? t.invocations30d.toLocaleString() : '—'}</span>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Tool Catalog"
        subtitle="Tools exposed by registered MCP servers — risk tier, approval state and which agents may call them"
        icon={Scan}
        actions={can('create') && servers.data.length > 0
          ? <Button size="sm" icon={<Plus />} onClick={openCreate}>Register Tool</Button>
          : undefined}
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Tools</p><p className="font-mono text-xl font-bold">{stats.total}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Write / execute</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.writeOrExec}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Need human review</p><p className="font-mono text-xl font-bold">{stats.hitl}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Not approved</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.pending}</p></div>
        </CardContent>
      </Card>

      {serverParam && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Filtered to <strong>{serverName(serverParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear server filter" onClick={clearServerFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <Card className="p-4">
        {tools.isLoading ? <TableSkeleton cols={7} />
          : tools.isError ? <ErrorState message={tools.error?.message} onRetry={() => tools.refetch()} />
          : rows.length === 0 ? (
            <EmptyState
              title={serverParam ? 'No tools on this server' : 'No tools registered'}
              message={servers.data.length === 0
                ? 'Register an MCP server first — tools belong to a server.'
                : 'Register the tools your servers expose so each one carries a risk tier, approval state and agent allow-list.'}
              actionLabel={servers.data.length === 0 ? 'Go to Servers' : (can('create') ? 'Register a tool' : undefined)}
              onAction={servers.data.length === 0 ? () => nav('/mcp-gateway/servers') : (can('create') ? openCreate : undefined)}
            />
          ) : (
            <DataTable
              data={rows} columns={columns} searchKey="name" searchPlaceholder="Search tools…"
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (t) => setToDelete(t) : undefined}
            />
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.name}` : 'Register Tool'}
        description="Tools inherit their server's data ceiling; the agent allow-list controls who may call them."
        submitLabel={editing ? 'Save changes' : 'Register'}
        busy={tools.create.isPending || tools.update.isPending}
        disabled={!form.name?.trim() || !form.serverId}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tool name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="get_account_summary" /></Field>
          <Field label="Server" required>
            <Select value={form.serverId || undefined} onValueChange={(v) => set('serverId', v)}>
              <SelectTrigger><SelectValue placeholder="Select a server" /></SelectTrigger>
              <SelectContent>{servers.data.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select value={form.category ?? 'read'} onValueChange={(v) => set('category', v as McpToolCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Risk tier">
            <Select value={form.riskTier ?? 'low'} onValueChange={(v) => set('riskTier', v as McpRiskTier)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Approval state">
            <Select value={form.approvalState ?? 'under_review'} onValueChange={(v) => set('approvalState', v as McpApproval)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{APPROVALS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Scopes" hint="Comma-separated">
            <Input value={(form.scopes ?? []).join(', ')}
              onChange={(e) => set('scopes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2 text-sm">
            <span>Requires human review</span>
            <Switch checked={!!form.requiresHitl} onCheckedChange={(v) => set('requiresHitl', v)} />
          </label>
          <label className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2 text-sm">
            <span>Has side effects</span>
            <Switch checked={!!form.sideEffects} onCheckedChange={(v) => set('sideEffects', v)} />
          </label>
        </div>
        <Field label="Allowed agents" hint="Governed agents permitted to call this tool">
          <div className="flex flex-wrap gap-1.5">
            {(agents.data ?? []).map((a: any) => {
              const selected = (form.allowedAgentIds ?? []).includes(a.id)
              return (
                <button key={a.id} type="button"
                  onClick={() => set('allowedAgentIds', selected
                    ? (form.allowedAgentIds ?? []).filter((x) => x !== a.id)
                    : [...(form.allowedAgentIds ?? []), a.id])}
                  className={`border px-2 py-1 text-[12px] ${selected
                    ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]'}`}>
                  {a.name}
                </button>
              )
            })}
            {(agents.data ?? []).length === 0 && (
              <span className="text-xs text-[hsl(var(--text-4))]">No governed agents registered yet.</span>
            )}
          </div>
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove ${toDelete?.name ?? ''}?`}
        description="The tool is soft-deleted and agents can no longer be granted it."
        isDestructive confirmLabel="Remove"
        onConfirm={() => {
          if (!toDelete) return
          tools.remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('Tool removed'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to remove'),
          })
        }}
      />
    </div>
  )
}
