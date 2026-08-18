// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Integrations — the platform's connectivity surface: inbound/outbound
// connectors (credit bureau, regulator reporting, core banking, payments,
// SIEM, SSO, ticketing, messaging) and outbound webhook endpoints.
//
// Backed by the canonical org-scoped `integrations` and `webhook_endpoints`
// tables. Webhook signing secrets are shown exactly once at creation; only a
// sha256 digest is persisted.

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowsClockwise, Broadcast, Copy, Plugs, Plus, Warning,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { useIntegrations, useWebhooks } from '@/hooks/useIntegrations'
import { IntegrationCatalog } from '@/components/integrations/IntegrationCatalog'
import { useRBAC } from '@/hooks/useRBAC'
import {
  INTEGRATION_CATEGORIES,
  type IntegrationCategory, type IntegrationHealth,
  type IntegrationRecord, type IntegrationStatus,
} from '@/services/integrationsService'

const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  credit_bureau: 'Credit bureau', regulator: 'Regulator', core_banking: 'Core banking',
  payments: 'Payments', monitoring: 'Monitoring', identity: 'Identity',
  ticketing: 'Ticketing', communication: 'Communication', mlops: 'MLOps',
  storage: 'Storage', other: 'Other',
}

const STATUSES: [IntegrationStatus, string][] = [
  ['connected', 'Connected'], ['degraded', 'Degraded'], ['error', 'Error'],
  ['disconnected', 'Disconnected'], ['configuring', 'Configuring'],
]

const statusTone: Record<IntegrationStatus, string> = {
  connected: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  degraded: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  error: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  disconnected: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
  configuring: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
}

const healthTone: Record<IntegrationHealth, string> = {
  passing: 'text-[hsl(var(--s-ok-tx))]',
  degraded: 'text-[hsl(var(--s-wn-tx))]',
  failing: 'text-[hsl(var(--s-er-tx))]',
  unknown: 'text-[hsl(var(--text-4))]',
}

const AUTH_METHODS = ['API Key', 'OAuth 2.0', 'Service Account Token', 'mTLS Certificate', 'IAM Role', 'SAML 2.0', 'Integration Key']

const EMPTY: Partial<IntegrationRecord> = {
  name: '', provider: '', category: 'other', status: 'configuring',
  authMethod: 'API Key', description: '', dataFlows: [], health: 'unknown',
  direction: 'inbound', ownerName: '', config: {},
}

function relativeTime(iso?: string | null): string {
  if (!iso) return 'never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export default function IntegrationsPage() {
  const { can } = useRBAC()
  const integrations = useIntegrations()
  const webhooks = useWebhooks()

  // Tab state lives in the URL (?tab=), matching the repo's deep-link
  // convention — so a link can point straight at the catalogue, and a reload
  // or a shared link lands where the reader expects instead of resetting.
  const [searchParams, setSearchParams] = useSearchParams()
  const TABS = ['catalog', 'connectors', 'webhooks'] as const
  const paramTab = searchParams.get('tab')
  const tab = (TABS as readonly string[]).includes(paramTab ?? '') ? (paramTab as string) : 'catalog'
  const setTab = (next: string) => {
    setSearchParams(
      prev => {
        const p = new URLSearchParams(prev)
        // The default tab stays clean in the URL; only a non-default is pinned.
        if (next === 'catalog') p.delete('tab')
        else p.set('tab', next)
        return p
      },
      { replace: true },
    )
  }
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<IntegrationRecord | null>(null)
  const [form, setForm] = useState<Partial<IntegrationRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<IntegrationRecord | null>(null)

  const [hookFormOpen, setHookFormOpen] = useState(false)
  const [hookForm, setHookForm] = useState({ url: '', description: '', eventTypes: '' })
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [hookToDelete, setHookToDelete] = useState<string | null>(null)

  const set = <K extends keyof IntegrationRecord>(k: K, v: IntegrationRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(i: IntegrationRecord) { setEditing(i); setForm({ ...i }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save integration')
    if (editing) {
      integrations.update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('Integration updated'); setFormOpen(false) }, onError,
      })
    } else {
      integrations.create.mutate(form, {
        onSuccess: () => { toast.success('Integration added'); setFormOpen(false) }, onError,
      })
    }
  }

  /** Records a sync attempt against the real row — no simulated results. */
  function markSynced(i: IntegrationRecord) {
    integrations.update.mutate(
      { id: i.id, patch: { lastSyncAt: new Date().toISOString() } },
      {
        onSuccess: () => toast.success(`${i.name}: sync timestamp recorded`),
        onError: (e: any) => toast.error(e?.message ?? 'Failed to record sync'),
      },
    )
  }

  function submitWebhook() {
    const eventTypes = hookForm.eventTypes.split(',').map((s) => s.trim()).filter(Boolean)
    webhooks.create.mutate(
      { url: hookForm.url.trim(), description: hookForm.description.trim() || undefined, eventTypes },
      {
        onSuccess: (res) => {
          setHookFormOpen(false)
          setHookForm({ url: '', description: '', eventTypes: '' })
          setRevealedSecret(res.secret)
        },
        onError: (e: any) => toast.error(e?.message ?? 'Failed to create endpoint'),
      },
    )
  }

  const stats = useMemo(() => ({
    connected: integrations.data.filter((i) => i.status === 'connected').length,
    attention: integrations.data.filter((i) => i.status === 'error' || i.status === 'degraded').length,
    inbound: integrations.data.filter((i) => i.direction !== 'outbound').length,
    hooks: webhooks.data.filter((w) => w.isActive).length,
  }), [integrations.data, webhooks.data])

  const columns: Column<IntegrationRecord>[] = [
    { key: 'name', header: 'Integration', sortable: true, render: (i) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{i.name}</div>
        <div className="text-xs text-[hsl(var(--text-4))]">{i.provider ?? '—'} · {CATEGORY_LABEL[i.category]}</div>
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (i) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${statusTone[i.status]}`}>{i.status}</span>
    ) },
    { key: 'health', header: 'Health', render: (i) => (
      <span className={`text-xs font-medium capitalize ${healthTone[i.health]}`}>{i.health}</span>
    ) },
    { key: 'direction', header: 'Direction', render: (i) => (
      <span className="text-xs capitalize text-[hsl(var(--text-3))]">{i.direction}</span>
    ) },
    { key: 'dataFlows', header: 'Data flows', render: (i) => i.dataFlows.length ? (
      <div className="flex flex-wrap gap-1">
        {i.dataFlows.slice(0, 2).map((f) => (
          <span key={f} className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-1.5 py-0.5 text-[10px]">{f}</span>
        ))}
        {i.dataFlows.length > 2 && <span className="text-[10px] text-[hsl(var(--text-4))]">+{i.dataFlows.length - 2}</span>}
      </div>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">—</span> },
    { key: 'lastSyncAt', header: 'Last sync', sortable: true, render: (i) => (
      <span className="font-mono text-xs text-[hsl(var(--text-3))]">{relativeTime(i.lastSyncAt)}</span>
    ) },
    { key: 'ownerName', header: 'Owner', sortable: true },
  ]

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connectors and outbound webhooks that move governance data in and out of the platform"
        icon={Plugs}
        actions={can('create') ? (
          <Button size="sm" icon={<Plus />} onClick={tab === 'webhooks' ? () => setHookFormOpen(true) : openCreate}>
            {tab === 'webhooks' ? 'Add Endpoint' : 'Add Integration'}
          </Button>
        ) : undefined}
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Connected</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-ok-tx))]">{stats.connected}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Need attention</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.attention}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Ingesting data</p><p className="font-mono text-xl font-bold">{stats.inbound}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Active webhooks</p><p className="font-mono text-xl font-bold">{stats.hooks}</p></div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        {/* The published catalogue of evidence sources, and the enable/disable
            path for the ones that actually ship an adapter. Before this tab
            existed the catalogue was rows in a table nothing read. */}
        <TabsContent value="catalog" className="mt-4">
          <Card className="p-4">
            <IntegrationCatalog canManage={can('create')} />
          </Card>
        </TabsContent>

        <TabsContent value="connectors" className="mt-4">
          <Card className="p-4">
            {integrations.isLoading ? <TableSkeleton cols={7} />
              : integrations.isError ? <ErrorState message={integrations.error?.message} onRetry={() => integrations.refetch()} />
              : integrations.data.length === 0 ? (
                <EmptyState title="No integrations configured"
                  message="Connect the systems that feed governance data — credit bureau extracts, core banking events, regulator reporting, monitoring."
                  actionLabel={can('create') ? 'Add an integration' : undefined}
                  onAction={can('create') ? openCreate : undefined} />
              ) : (
                <DataTable
                  data={integrations.data} columns={columns} searchKey="name" searchPlaceholder="Search integrations…"
                  onEdit={can('update') ? openEdit : undefined}
                  onDelete={can('delete') ? (i) => setToDelete(i) : undefined}
                  actions={can('update') ? (i) => (
                    <Button variant="ghost" size="sm" icon={<ArrowsClockwise />} title="Record a sync"
                      onClick={(e) => { e.stopPropagation(); markSynced(i) }} />
                  ) : undefined}
                />
              )}
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <Card className="p-4">
            {webhooks.isLoading ? <TableSkeleton cols={5} />
              : webhooks.isError ? <ErrorState message={webhooks.error?.message} onRetry={() => webhooks.refetch()} />
              : webhooks.data.length === 0 ? (
                <EmptyState title="No webhook endpoints"
                  message="Push governance events — risk-tier changes, failed validations, guardrail blocks — to your own systems."
                  actionLabel={can('create') ? 'Add an endpoint' : undefined}
                  onAction={can('create') ? () => setHookFormOpen(true) : undefined} />
              ) : (
                <div className="divide-y divide-[hsl(var(--border))]">
                  {webhooks.data.map((w) => (
                    <div key={w.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Broadcast size={14} className="text-[hsl(var(--text-4))]" />
                          <span className="truncate font-mono text-sm text-[hsl(var(--text-1))]">{w.url}</span>
                          {w.failureCount > 0 && (
                            <span className="inline-flex items-center gap-1 bg-[hsl(var(--s-er-bg))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--s-er-tx))]">
                              <Warning size={10} /> {w.failureCount} failures
                            </span>
                          )}
                        </div>
                        {w.description && <p className="mt-0.5 text-xs text-[hsl(var(--text-3))]">{w.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {w.eventTypes.map((e) => (
                            <span key={e} className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-1.5 py-0.5 font-mono text-[10px]">{e}</span>
                          ))}
                        </div>
                        <p className="mt-1 text-[11px] text-[hsl(var(--text-4))]">
                          {w.secretPrefix ? `${w.secretPrefix}…` : 'no secret'} · last success {relativeTime(w.lastSuccessAt)} · {w.maxRetries} retries · {w.timeoutSec}s timeout
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={w.isActive} disabled={!can('update')}
                          onCheckedChange={(v) => webhooks.toggle.mutate({ id: w.id, isActive: v }, {
                            onError: (e: any) => toast.error(e?.message ?? 'Failed to update endpoint'),
                          })} />
                        {can('delete') && (
                          <Button variant="ghost" size="sm" onClick={() => setHookToDelete(w.id)}>Remove</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integration create / edit */}
      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.name}` : 'Add Integration'}
        description="Connectors move governance data between the platform and your systems of record."
        submitLabel={editing ? 'Save changes' : 'Add'}
        busy={integrations.create.isPending || integrations.update.isPending}
        disabled={!form.name?.trim()}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Credit bureau extract" /></Field>
          <Field label="Provider"><Input value={form.provider ?? ''} onChange={(e) => set('provider', e.target.value)} /></Field>
          <Field label="Category">
            <Select value={form.category ?? 'other'} onValueChange={(v) => set('category', v as IntegrationCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INTEGRATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status ?? 'configuring'} onValueChange={(v) => set('status', v as IntegrationStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Health">
            <Select value={form.health ?? 'unknown'} onValueChange={(v) => set('health', v as IntegrationHealth)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(['passing', 'degraded', 'failing', 'unknown'] as IntegrationHealth[]).map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Direction">
            <Select value={form.direction ?? 'inbound'} onValueChange={(v) => set('direction', v as IntegrationRecord['direction'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(['inbound', 'outbound', 'bidirectional'] as const).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Auth method">
            <Select value={form.authMethod ?? 'API Key'} onValueChange={(v) => set('authMethod', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AUTH_METHODS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Owner"><Input value={form.ownerName ?? ''} onChange={(e) => set('ownerName', e.target.value)} /></Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Data flows" hint="Comma-separated">
          <Input value={(form.dataFlows ?? []).join(', ')}
            onChange={(e) => set('dataFlows', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        </Field>
      </FormDialog>

      {/* Webhook create */}
      <FormDialog
        open={hookFormOpen} onOpenChange={setHookFormOpen}
        title="Add Webhook Endpoint"
        description="The signing secret is generated now and shown once — only its digest is stored."
        submitLabel="Create endpoint"
        busy={webhooks.create.isPending}
        disabled={!hookForm.url.trim() || !hookForm.eventTypes.trim()}
        onSubmit={submitWebhook}
      >
        <Field label="Endpoint URL" required>
          <Input value={hookForm.url} onChange={(e) => setHookForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://ops.example.com/hooks/governance" />
        </Field>
        <Field label="Description"><Input value={hookForm.description} onChange={(e) => setHookForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        <Field label="Event types" required hint="Comma-separated, e.g. model.risk_tier_changed, validation.completed">
          <Input value={hookForm.eventTypes} onChange={(e) => setHookForm((f) => ({ ...f, eventTypes: e.target.value }))} />
        </Field>
      </FormDialog>

      {/* One-time secret reveal */}
      <Dialog open={!!revealedSecret} onOpenChange={(o) => { if (!o) { setRevealedSecret(null); toast.success('Endpoint created') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signing secret</DialogTitle>
            <DialogDescription>
              Copy it now — only a sha256 digest is stored, so this value cannot be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] p-2 font-mono text-xs">{revealedSecret}</code>
            <Button size="sm" variant="secondary" icon={<Copy />} onClick={() => {
              if (revealedSecret) navigator.clipboard?.writeText(revealedSecret)
              toast.success('Copied')
            }}>Copy</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove ${toDelete?.name ?? ''}?`}
        description="The integration is soft-deleted; historical sync records are retained."
        isDestructive confirmLabel="Remove"
        onConfirm={() => {
          if (!toDelete) return
          integrations.remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('Integration removed'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to remove'),
          })
        }}
      />

      <ConfirmDialog
        open={!!hookToDelete}
        onOpenChange={(o) => !o && setHookToDelete(null)}
        title="Remove webhook endpoint?"
        description="Events will stop being delivered to this URL immediately."
        isDestructive confirmLabel="Remove"
        onConfirm={() => {
          if (!hookToDelete) return
          webhooks.remove.mutate(hookToDelete, {
            onSuccess: () => { toast.success('Endpoint removed'); setHookToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to remove'),
          })
        }}
      />
    </div>
  )
}
