// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Identity Governance — who (and what) can reach the AI estate, on the real
// org-scoped tables: `identities`, `sod_rules`, `sod_violations`,
// `access_reviews`.
//
// The previous page read `iga_table` (doc-jsonb demo table), seeded ten
// fictional identities, and saved through a setTimeout so every toast was
// fake success. Its "AI systems access" column listed model names as free
// strings that resolved to nothing. Access is now a list of ai_models ids
// derived from privilege level by the database (admin -> all registered
// models, operator -> production models, viewer -> none) — a stated demo
// seeding rule, labelled as such, not an entitlement scan — and every chip
// resolves to a real registry record.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserList, Plus, Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { LinkChips } from '@/components/ui/LinkChips'
import { useIdentityGovernanceData } from '@/hooks/useAdminData'
import { useModelOptions } from '@/hooks/useAiiaData'
import {
  IDENTITY_TYPES, PRIVILEGE_LEVELS, REVIEW_STATUSES, type Identity,
} from '@/services/resilienceService'

const PRIV_TONE: Record<string, string> = {
  admin: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  operator: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  viewer: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]',
}

const REVIEW_TONE: Record<string, string> = {
  current: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  due: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  overdue: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  revoked: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
}

const EMPTY: Partial<Identity> = {
  displayName: '', email: '', identityType: 'human', role: '', department: '',
  privilegeLevel: 'viewer', reviewStatus: 'current',
}

function cap(s?: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

export default function IGA() {
  const nav = useNavigate()
  const {
    identities, sodRules, sodViolations, accessReviews,
    isLoading, error, refetch, saveIdentity, removeIdentity, isSaving,
  } = useIdentityGovernanceData()
  const { models } = useModelOptions()

  const [typeFilter, setTypeFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [tab, setTab] = useState<'identities' | 'sod' | 'reviews'>('identities')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Identity | null>(null)
  const [form, setForm] = useState<Partial<Identity>>(EMPTY)
  const [toDelete, setToDelete] = useState<Identity | null>(null)

  const set = <K extends keyof Identity>(k: K, v: Identity[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  const modelName = (id: string) => models.find((m) => m.id === id)?.name

  const rows = useMemo(() => identities.filter((i) =>
    (typeFilter === 'all' || i.identityType === typeFilter) &&
    (reviewFilter === 'all' || i.reviewStatus === reviewFilter)), [identities, typeFilter, reviewFilter])

  const stats = useMemo(() => ({
    total: identities.length,
    admins: identities.filter((i) => i.privilegeLevel === 'admin').length,
    reviewDue: identities.filter((i) => i.reviewStatus === 'due' || i.reviewStatus === 'overdue').length,
    openViolations: sodViolations.filter((v) => v.status !== 'resolved').length,
  }), [identities, sodViolations])

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(i: Identity) { setEditing(i); setForm({ ...i }); setFormOpen(true) }

  async function submit() {
    try {
      await saveIdentity(editing ? { ...form, id: editing.id } : form)
      setFormOpen(false)
    } catch { /* hook surfaces the error; dialog stays open */ }
  }

  const columns: Column<Identity>[] = [
    { key: 'displayName', header: 'Identity', render: (i) => (
      <div>
        <p className="font-medium text-[hsl(var(--text-1))]">{i.displayName}</p>
        <p className="text-xs text-[hsl(var(--text-4))]">{i.email ?? '—'}</p>
      </div>
    ) },
    { key: 'identityType', header: 'Type', render: (i) => <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-2))]">{cap(i.identityType)}</span> },
    { key: 'role', header: 'Role', render: (i) => <span className="text-xs text-[hsl(var(--text-2))]">{i.role ?? '—'}</span> },
    { key: 'department', header: 'Department', render: (i) => <span className="text-xs text-[hsl(var(--text-2))]">{i.department ?? '—'}</span> },
    { key: 'privilegeLevel', header: 'Privilege', render: (i) => i.privilegeLevel ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIV_TONE[i.privilegeLevel] ?? ''}`}>{cap(i.privilegeLevel)}</span> : <span className="text-[hsl(var(--text-4))]">—</span> },
    {
      key: 'linkedModelIds', header: 'AI systems reach',
      render: (i) => (
        <LinkChips ids={i.linkedModelIds} resolve={modelName}
          hrefFor={(id) => `/models/inventory/${id}`} onNavigate={nav} />
      ),
    },
    { key: 'reviewStatus', header: 'Access review', render: (i) => i.reviewStatus ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${REVIEW_TONE[i.reviewStatus] ?? ''}`}>{cap(i.reviewStatus)}</span> : <span className="text-[hsl(var(--text-4))]">—</span> },
  ]

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <PageHeader
        icon={<UserList size={24} weight="duotone" />}
        title="Identity Governance"
        description="Who — human, service, or agent — can reach which registered AI system, under what privilege, and when that access was last reviewed. Access lists are derived from privilege level (demo seeding rule, not an entitlement scan)."
        actions={<Button onClick={openCreate} className="gap-2"><Plus weight="bold" size={16} />Add Identity</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Identities', value: stats.total },
          { label: 'Admin privilege', value: stats.admins },
          { label: 'Reviews due / overdue', value: stats.reviewDue },
          { label: 'Open SoD violations', value: stats.openViolations },
        ].map((k) => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-[hsl(var(--text-1))]">{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex border-b border-[hsl(var(--border))]">
        {([['identities', 'Identities'], ['sod', 'Segregation of Duties'], ['reviews', 'Access Reviews']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key
              ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand))]'
              : 'border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-2))]'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'identities' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {IDENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{cap(t)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={reviewFilter} onValueChange={setReviewFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All review states</SelectItem>
                {REVIEW_STATUSES.map((s) => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <TableSkeleton /> : error ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No identities"
              message={typeFilter !== 'all' || reviewFilter !== 'all'
                ? 'No identities match the current filters.'
                : 'Add the first identity to start the register.'}
              actionLabel="Add Identity"
              onAction={openCreate}
            />
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              searchKey="displayName"
              searchPlaceholder="Search identities…"
              onEdit={openEdit}
              onDelete={(i) => setToDelete(i)}
              emptyMessage="No identities match the current filters."
            />
          )}
        </>
      )}

      {tab === 'sod' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Active rules</h3>
            {sodRules.length === 0 ? (
              <p className="text-sm text-[hsl(var(--text-4))]">No segregation rules defined.</p>
            ) : (
              <div className="space-y-2">
                {sodRules.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 text-sm border-b border-[hsl(var(--border))] pb-2 last:border-0">
                    <span className="font-medium text-[hsl(var(--text-1))] flex-1">{r.name}</span>
                    <span className="text-xs text-[hsl(var(--text-3))]">{r.moduleA}:{r.actionA} × {r.moduleB}:{r.actionB}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${r.severity === 'critical' || r.severity === 'high' ? 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]' : 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]'}`}>{cap(r.severity)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3 flex items-center gap-2">
              <Warning size={16} className="text-[hsl(var(--s-wn-tx))]" /> Violations
            </h3>
            {sodViolations.length === 0 ? (
              <p className="text-sm text-[hsl(var(--text-4))]">No violations detected.</p>
            ) : (
              <div className="space-y-2">
                {sodViolations.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 text-sm border-b border-[hsl(var(--border))] pb-2 last:border-0">
                    <span className="flex-1 text-[hsl(var(--text-2))]">{v.conflictingRoles.join(' + ') || '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-3))]">{v.detectedAt ? new Date(v.detectedAt).toLocaleDateString() : '—'}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${v.status === 'resolved' ? 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]' : 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]'}`}>{cap(v.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </div>
      )}

      {tab === 'reviews' && (
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Access review campaigns</h3>
          {accessReviews.length === 0 ? (
            <p className="text-sm text-[hsl(var(--text-4))]">No review campaigns recorded.</p>
          ) : (
            <div className="space-y-2">
              {accessReviews.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-sm border-b border-[hsl(var(--border))] pb-2 last:border-0">
                  <span className="font-medium text-[hsl(var(--text-1))] flex-1">{r.reviewName}</span>
                  <span className="text-xs text-[hsl(var(--text-3))]">{r.scope ?? '—'}</span>
                  <span className="text-xs text-[hsl(var(--text-3))]">due {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</span>
                  <span className="text-xs text-[hsl(var(--text-2))]">
                    {r.totalEntitlements ?? '—'} entitlements · {r.approved ?? '—'} approved · {r.revoked ?? '—'} revoked
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${r.status === 'completed' ? 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]' : 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]'}`}>{cap(r.status)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.displayName}` : 'Add Identity'}
        onSubmit={submit}
        busy={isSaving}
        disabled={!form.displayName?.trim()}
      >
        <Field label="Display name" required>
          <Input value={form.displayName ?? ''} onChange={(e) => set('displayName', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={form.identityType} onValueChange={(v) => set('identityType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{IDENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{cap(t)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <Input value={form.role ?? ''} onChange={(e) => set('role', e.target.value)} />
          </Field>
          <Field label="Department">
            <Input value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Privilege level" hint="Determines derived AI-system reach">
            <Select value={form.privilegeLevel} onValueChange={(v) => set('privilegeLevel', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIVILEGE_LEVELS.map((p) => <SelectItem key={p} value={p}>{cap(p)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Review status">
            <Select value={form.reviewStatus} onValueChange={(v) => set('reviewStatus', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REVIEW_STATUSES.map((s) => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { try { await removeIdentity(toDelete.id) } finally { setToDelete(null) } } }}
        title="Delete identity"
        description={`Remove "${toDelete?.displayName}" from the register? This does not revoke any real system access.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
