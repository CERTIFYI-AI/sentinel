// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MCP Servers — registry of backend Model Context Protocol servers that
// governed agents may connect to. Backed by the org-scoped `mcp_servers`
// table; each server carries an approval state, data-sensitivity ceiling and
// an optional link to the integration (connector) behind it.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, Plugs, Plus, Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { useMcpServers, useMcpTools } from '@/hooks/useMcpData'
import { useIntegrations } from '@/hooks/useIntegrations'
import { useRBAC } from '@/hooks/useRBAC'
import type {
  McpApproval, McpAuth, McpSensitivity, McpServerRecord, McpStatus, McpTransport,
} from '@/services/mcpService'

const STATUS_TONE: Record<McpStatus, string> = {
  healthy: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  degraded: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  offline: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  unknown: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
}

const APPROVAL_TONE: Record<McpApproval, string> = {
  approved: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  under_review: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  restricted: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  blocked: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
}

const TRANSPORTS: McpTransport[] = ['https', 'stdio', 'sse', 'websocket']
const AUTHS: [McpAuth, string][] = [
  ['bearer_token', 'Bearer token'], ['mtls', 'mTLS'], ['oauth2', 'OAuth 2.0'],
  ['basic', 'Basic auth'], ['none', 'None'],
]
const SENSITIVITIES: McpSensitivity[] = ['public', 'internal', 'confidential', 'restricted']
const STATUSES: McpStatus[] = ['healthy', 'degraded', 'offline', 'unknown']
const APPROVALS: [McpApproval, string][] = [
  ['approved', 'Approved'], ['under_review', 'Under review'],
  ['restricted', 'Restricted'], ['blocked', 'Blocked'],
]

const EMPTY: Partial<McpServerRecord> = {
  name: '', url: '', description: '', transport: 'https', authMethod: 'bearer_token',
  status: 'unknown', environment: 'production', ownerName: '', dataSensitivity: 'internal',
  integrationId: null, approvalState: 'under_review', config: {},
}

function relativeTime(iso?: string | null): string {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`
}

export default function Servers() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const servers = useMcpServers()
  const tools = useMcpTools()
  const integrations = useIntegrations()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<McpServerRecord | null>(null)
  const [form, setForm] = useState<Partial<McpServerRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<McpServerRecord | null>(null)

  const set = <K extends keyof McpServerRecord>(k: K, v: McpServerRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(s: McpServerRecord) { setEditing(s); setForm({ ...s }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save server')
    if (editing) {
      servers.update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('Server updated'); setFormOpen(false) }, onError,
      })
    } else {
      servers.create.mutate(form, {
        onSuccess: () => { toast.success('Server registered'); setFormOpen(false) }, onError,
      })
    }
  }

  const toolCount = useMemo(() => {
    const m = new Map<string, number>()
    tools.data.forEach((t) => m.set(t.serverId, (m.get(t.serverId) ?? 0) + 1))
    return m
  }, [tools.data])

  const stats = useMemo(() => ({
    healthy: servers.data.filter((s) => s.status === 'healthy').length,
    attention: servers.data.filter((s) => s.status === 'degraded' || s.status === 'offline').length,
    restricted: servers.data.filter((s) => s.approvalState !== 'approved').length,
    tools: tools.data.length,
  }), [servers.data, tools.data])

  const integrationName = (id?: string | null) => integrations.data.find((i) => i.id === id)?.name

  const columns: Column<McpServerRecord>[] = [
    { key: 'name', header: 'Server', sortable: true, render: (s) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{s.name}</div>
        <div className="truncate font-mono text-[11px] text-[hsl(var(--text-4))]">{s.url}</div>
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (s) => (
      <div className="flex flex-col gap-1">
        <span className={`inline-flex w-fit px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TONE[s.status]}`}>{s.status}</span>
        {s.lastError && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--s-er-tx))]" title={s.lastError}>
            <Warning size={10} /> {s.lastError.slice(0, 34)}{s.lastError.length > 34 ? '…' : ''}
          </span>
        )}
      </div>
    ) },
    { key: 'approvalState', header: 'Approval', sortable: true, render: (s) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${APPROVAL_TONE[s.approvalState]}`}>
        {s.approvalState.replace('_', ' ')}
      </span>
    ) },
    { key: 'tools', header: 'Tools', render: (s) => {
      const n = toolCount.get(s.id) ?? 0
      return n ? (
        <button className="text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav(`/mcp-gateway/tools?server=${s.id}`) }}>{n} tool{n > 1 ? 's' : ''}</button>
      ) : <span className="text-xs text-[hsl(var(--text-4))]">none</span>
    } },
    { key: 'dataSensitivity', header: 'Data ceiling', render: (s) => (
      <span className="text-xs capitalize text-[hsl(var(--text-2))]">{s.dataSensitivity}</span>
    ) },
    { key: 'authMethod', header: 'Auth', render: (s) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{AUTHS.find(([v]) => v === s.authMethod)?.[1] ?? s.authMethod}</span>
    ) },
    { key: 'integration', header: 'Connector', render: (s) => {
      const name = integrationName(s.integrationId)
      return name ? (
        <button className="inline-flex items-center gap-1 text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav('/integrations') }}>{name} <ArrowSquareOut size={11} /></button>
      ) : <span className="text-xs text-[hsl(var(--text-4))]">{s.integrationId ? 'Unavailable' : '—'}</span>
    } },
    { key: 'lastPingAt', header: 'Last ping', sortable: true, render: (s) => (
      <span className="font-mono text-xs text-[hsl(var(--text-3))]">{relativeTime(s.lastPingAt)}</span>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="MCP Servers"
        subtitle="Backend Model Context Protocol servers your governed agents may connect to"
        icon={Plugs}
        actions={can('create') ? <Button size="sm" icon={<Plus />} onClick={openCreate}>Register Server</Button> : undefined}
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Healthy</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-ok-tx))]">{stats.healthy}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Need attention</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.attention}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Not fully approved</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.restricted}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Exposed tools</p><p className="font-mono text-xl font-bold">{stats.tools}</p></div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {servers.isLoading ? <TableSkeleton cols={8} />
          : servers.isError ? <ErrorState message={servers.error?.message} onRetry={() => servers.refetch()} />
          : servers.data.length === 0 ? (
            <EmptyState title="No MCP servers registered"
              message="Register the servers your agents connect to so their tools can be governed, approved and monitored."
              actionLabel={can('create') ? 'Register a server' : undefined}
              onAction={can('create') ? openCreate : undefined} />
          ) : (
            <DataTable
              data={servers.data} columns={columns} searchKey="name" searchPlaceholder="Search servers…"
              onRowClick={(s) => nav(`/mcp-gateway/tools?server=${s.id}`)}
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (s) => setToDelete(s) : undefined}
            />
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.name}` : 'Register MCP Server'}
        description="Servers expose tools to agents; the approval state and data ceiling govern what may be called."
        submitLabel={editing ? 'Save changes' : 'Register'}
        busy={servers.create.isPending || servers.update.isPending}
        disabled={!form.name?.trim() || !form.url?.trim()}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Owner"><Input value={form.ownerName ?? ''} onChange={(e) => set('ownerName', e.target.value)} /></Field>
        </div>
        <Field label="URL" required><Input value={form.url ?? ''} onChange={(e) => set('url', e.target.value)} placeholder="https://mcp.internal.example/service" /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Transport">
            <Select value={form.transport ?? 'https'} onValueChange={(v) => set('transport', v as McpTransport)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TRANSPORTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Auth method">
            <Select value={form.authMethod ?? 'bearer_token'} onValueChange={(v) => set('authMethod', v as McpAuth)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AUTHS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status ?? 'unknown'} onValueChange={(v) => set('status', v as McpStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Approval state">
            <Select value={form.approvalState ?? 'under_review'} onValueChange={(v) => set('approvalState', v as McpApproval)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{APPROVALS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Data ceiling" hint="Highest classification this server may receive">
            <Select value={form.dataSensitivity ?? 'internal'} onValueChange={(v) => set('dataSensitivity', v as McpSensitivity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SENSITIVITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Environment">
            <Select value={form.environment ?? 'production'} onValueChange={(v) => set('environment', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['production', 'staging', 'development'].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Backing connector" hint="The integration this server fronts, if any">
          <Select value={form.integrationId ?? '__none__'} onValueChange={(v) => set('integrationId', v === '__none__' ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {integrations.data.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove ${toDelete?.name ?? ''}?`}
        description="The server and its tool registrations are soft-deleted; agents can no longer be granted its tools."
        isDestructive confirmLabel="Remove"
        onConfirm={() => {
          if (!toDelete) return
          servers.remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('Server removed'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to remove'),
          })
        }}
      />
    </div>
  )
}
