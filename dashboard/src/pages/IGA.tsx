// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Identity Governance — Access Reviews on the real org-scoped `access_reviews`
// table via accessReviewService / useAccessReviews. Replaces the
// `iga_table (id, doc jsonb)` demo table and its ten-row hardcoded directory.
//
// What this rebuild deliberately drops:
//   * the invented "risk flags" ("Orphaned account — no login 102 days",
//     "Immediate revocation recommended") presented as measured findings;
//   * the "avgReviewCompletion 78%" KPI computed over the seeded array;
//   * the MOCK_CAMPAIGNS tab with fabricated progress bars;
//   * approve/revoke buttons that toasted success without writing anything.
//
// The page governs the access-REVIEW record (SOC 2 CC6.3 / ISO 27001 A.5.18
// certification): who reviewed whom, over which system, with what decision.
// Identity CRUD lives in Access Control; a review points at those records
// rather than duplicating them.
//
// Interlinks (both directions): reviewer_id / subject_user_id →
// user_profiles.id; linked_model_id → ai_models.id (a model's access reviews
// are reachable from its detail page via ?model=<id>); linked_asset_id →
// assets.id. `?open=<access_reviews.id>` opens a record.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { UserList, Plus, Export, ArrowSquareOut, X, Trash, CheckCircle } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow } from '@/components/ui/StatCardRow'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DetailDrawer } from '@/components/ui/DetailDrawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { exportCsv } from '@/lib/exportUtils'
import { useAccessReviews } from '@/hooks/useAccessReviews'
import { useAssetsData } from '@/hooks/useAssetsData'
import { useSupplyChainEntities } from '@/hooks/useSupplyChainEntities'
import { useUserOptions } from '@/hooks/useUserOptions'
import type { AccessReview, ReviewType, ReviewStatus, ReviewDecision } from '@/services/accessReviewService'

const TYPES: ReviewType[] = ['user_access', 'role_certification', 'entitlement', 'sod_check', 'privileged']
const STATUSES: ReviewStatus[] = ['pending', 'in_progress', 'completed', 'cancelled', 'overdue']
const TYPE_LABEL: Record<string, string> = {
  user_access: 'User access', role_certification: 'Role certification', entitlement: 'Entitlement',
  sod_check: 'SoD check', privileged: 'Privileged access',
}
const STATUS_TONE: Record<string, { background: string; color: string }> = {
  pending: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  in_progress: { background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' },
  completed: { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  cancelled: { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))' },
  overdue: { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
}
const DECISION_LABEL: Record<string, string> = { approved: 'Approved', revoked: 'Revoked', modified: 'Modified', deferred: 'Deferred' }
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—')
const text = (v: string | null | undefined) => (v && v.trim() ? v : '—')
const date = (v: string | null | undefined) => (v ? v.slice(0, 10) : '—')

function Pill({ label, tone }: { label: string; tone: { background: string; color: string } }) {
  return <span className="px-2 py-0.5 text-[11px] font-medium" style={tone}>{label}</span>
}

const BLANK: Partial<AccessReview> = {
  reviewRef: '', name: '', type: 'user_access', status: 'pending', reviewerId: null,
  subjectUserId: null, scope: '', riskLevel: 'medium', dueDate: null, frameworkRef: '',
  linkedModelId: null, linkedAssetId: null,
}

export default function IGA() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const { reviews, isLoading, error, refetch, create, update, decide, remove } = useAccessReviews()
  const { assets } = useAssetsData()
  const entities = useSupplyChainEntities()
  const { options: users } = useUserOptions()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AccessReview | null>(null)
  const [form, setForm] = useState<Partial<AccessReview>>({ ...BLANK })
  const [toDelete, setToDelete] = useState<AccessReview | null>(null)

  const selected = reviews.find(r => r.id === selectedId) ?? null
  const userName = (id: string | null | undefined) => (id ? (users.find(u => u.id === id)?.name ?? 'Unavailable') : null)
  const assetName = (id: string | null | undefined) => (id ? (assets.find(a => a.id === id)?.name ?? 'Unavailable') : null)

  const appliedOpen = useRef<string | null>(null)
  useEffect(() => {
    if (openParam && appliedOpen.current !== openParam && reviews.some(r => r.id === openParam)) {
      appliedOpen.current = openParam
      setSelectedId(openParam)
    }
  }, [openParam, reviews])

  const filtered = useMemo(
    () => (modelParam ? reviews.filter(r => r.linkedModelId === modelParam) : reviews),
    [reviews, modelParam],
  )
  const rows = useMemo(() => filtered.map(r => ({ ...r, _name: r.name })), [filtered])
  type Row = (typeof rows)[number]

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK, reviewRef: `AR-${Date.now().toString(36).toUpperCase().slice(-5)}`, linkedModelId: modelParam ?? null })
    setFormOpen(true)
  }
  function openEdit(r: AccessReview) { setEditing(r); setForm({ ...r }); setFormOpen(true) }

  async function submitForm() {
    if (!form.name?.trim()) { toast.error('A review name is required'); return }
    const patch: Partial<AccessReview> = {
      reviewRef: form.reviewRef?.trim() || null,
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      reviewerId: form.reviewerId || null,
      subjectUserId: form.subjectUserId || null,
      scope: form.scope?.trim() || null,
      riskLevel: form.riskLevel || null,
      dueDate: form.dueDate || null,
      frameworkRef: form.frameworkRef?.trim() || null,
      linkedModelId: form.linkedModelId || null,
      linkedAssetId: form.linkedAssetId || null,
    }
    try {
      if (editing) { await update.mutateAsync({ id: editing.id, patch }); toast.success(`${patch.name} updated`) }
      else { await create.mutateAsync(patch); toast.success(`${patch.name} created`) }
      setFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save the access review')
    }
  }

  async function recordDecision(r: AccessReview, decision: Exclude<ReviewDecision, null>) {
    try {
      await decide.mutateAsync({ id: r.id, decision })
      toast.success(`Review certified: ${DECISION_LABEL[decision]} — ${r.name}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record the decision')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      if (selectedId === toDelete.id) setSelectedId(null)
      toast.success(`${toDelete.name} deleted`)
      setToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete the access review')
      throw e
    }
  }

  function exportReviews() {
    if (!filtered.length) { toast.info('No access reviews to export'); return }
    exportCsv(filtered.map(r => ({
      review_ref: r.reviewRef ?? '', name: r.name, type: r.type, status: r.status,
      reviewer: userName(r.reviewerId) ?? '', subject: userName(r.subjectUserId) ?? '',
      model: entities.resolve('model', r.linkedModelId) ?? '', asset: assetName(r.linkedAssetId) ?? '',
      decision: r.decision ?? '', due_date: r.dueDate ?? '', framework_ref: r.frameworkRef ?? '',
    })), 'access-reviews.csv')
  }

  const pending = filtered.filter(r => r.status === 'pending' || r.status === 'in_progress').length
  const overdue = filtered.filter(r => r.status === 'overdue').length
  const privileged = filtered.filter(r => r.type === 'privileged').length

  const columns: Column<Row>[] = [
    { key: 'reviewRef', header: 'Ref', render: r => <span className="font-mono text-xs text-[hsl(var(--brand))]">{text(r.reviewRef)}</span> },
    { key: '_name', header: 'Review', sortable: true, render: r => <span className="text-xs font-medium text-[hsl(var(--text-1))]">{r.name}</span> },
    { key: 'type', header: 'Type', sortable: true, render: r => <span className="text-xs text-[hsl(var(--text-3))]">{TYPE_LABEL[r.type] ?? r.type}</span> },
    { key: 'subject', header: 'Subject', render: r => <span className="text-xs text-[hsl(var(--text-2))]">{userName(r.subjectUserId) ?? '—'}</span> },
    {
      key: 'system', header: 'System reviewed',
      render: r => {
        const name = entities.resolve('model', r.linkedModelId)
        const route = entities.routeFor('model', r.linkedModelId)
        if (name && route) return <button onClick={e => { e.stopPropagation(); nav(route) }} className="inline-flex items-center gap-1 text-xs text-[hsl(var(--brand))] hover:underline">{name} <ArrowSquareOut size={11} /></button>
        if (r.linkedAssetId) return <span className="text-xs text-[hsl(var(--text-2))]">{assetName(r.linkedAssetId)}</span>
        return <span className="text-xs text-[hsl(var(--text-4))]">—</span>
      },
    },
    { key: 'reviewer', header: 'Reviewer', render: r => <span className="text-xs text-[hsl(var(--text-3))]">{userName(r.reviewerId) ?? '—'}</span> },
    { key: 'status', header: 'Status', sortable: true, render: r => <Pill label={cap(r.status)} tone={STATUS_TONE[r.status] ?? STATUS_TONE.pending} /> },
    { key: 'decision', header: 'Decision', render: r => <span className="text-xs text-[hsl(var(--text-2))]">{r.decision ? DECISION_LABEL[r.decision] : '—'}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Access Reviews"
        subtitle="SOC 2 CC6.3 / ISO 27001 A.5.18 — periodic certification of who may act on which AI system, with a recorded decision"
        icon={UserList}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportReviews}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={openCreate}>New Review</Button>
          </div>
        }
      />

      {modelParam && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Access reviews for <strong>{entities.resolve('model', modelParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]"><X size={14} /></button>
          </span>
        </div>
      )}

      <StatCardRow
        className="mb-4"
        loading={isLoading}
        cards={[
          { label: 'Reviews', value: filtered.length },
          { label: 'Pending', value: pending, variant: pending ? 'warning' : 'default' },
          { label: 'Overdue', value: overdue, variant: overdue ? 'danger' : 'success' },
          { label: 'Privileged access', value: privileged },
        ]}
      />

      {isLoading ? <TableSkeleton cols={8} />
        : error ? <ErrorState message={error.message} onRetry={() => refetch()} />
        : rows.length === 0 ? (
          <EmptyState
            title={modelParam ? 'No access reviews for this model' : 'No access reviews yet'}
            message={modelParam ? 'Clear the filter to see every review, or schedule one for this model.' : 'Schedule an access certification against the AI systems and assets this organisation runs.'}
            actionLabel="New Review"
            onAction={openCreate}
          />
        ) : (
          <DataTable data={rows} columns={columns} searchKey="_name" searchPlaceholder="Search reviews…"
            onRowClick={r => setSelectedId(r.id)} onView={r => setSelectedId(r.id)} onEdit={r => openEdit(r)} onDelete={r => setToDelete(r)} />
        )}

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        subtitle={selected ? <Pill label={cap(selected.status)} tone={STATUS_TONE[selected.status] ?? STATUS_TONE.pending} /> : undefined}
        size="lg"
        actions={selected ? (
          <div className="flex gap-2">
            <Button size="xs" variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
            <Button size="xs" variant="danger" icon={<Trash />} onClick={() => setToDelete(selected)}>Delete</Button>
          </div>
        ) : undefined}
        tabs={selected ? [{
          id: 'overview', label: 'Overview',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Reference', value: text(selected.reviewRef) },
                  { label: 'Type', value: TYPE_LABEL[selected.type] ?? selected.type },
                  { label: 'Reviewer', value: userName(selected.reviewerId) ?? '—' },
                  { label: 'Subject', value: userName(selected.subjectUserId) ?? '—' },
                  { label: 'Risk level', value: cap(selected.riskLevel) },
                  { label: 'Due', value: date(selected.dueDate) },
                  { label: 'Decision', value: selected.decision ? DECISION_LABEL[selected.decision] : '—' },
                  { label: 'Completed', value: date(selected.completedAt) },
                  { label: 'Framework', value: text(selected.frameworkRef) },
                  { label: 'Scope', value: text(selected.scope) },
                ].map(f => (
                  <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-3">
                    <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-[hsl(var(--text-1))]">{f.value}</p>
                  </div>
                ))}
              </div>
              {selected.decisionNotes && (
                <div className="border border-[hsl(var(--border))] bg-raised p-3">
                  <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">Decision notes</p>
                  <p className="mt-1 text-xs text-[hsl(var(--text-2))]">{selected.decisionNotes}</p>
                </div>
              )}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">System reviewed</p>
                <div className="flex flex-wrap gap-2">
                  {entities.routeFor('model', selected.linkedModelId) && (
                    <Button size="xs" variant="secondary" icon={<ArrowSquareOut />} onClick={() => nav(entities.routeFor('model', selected.linkedModelId)!)}>Model: {entities.resolve('model', selected.linkedModelId)}</Button>
                  )}
                  {selected.linkedAssetId && (
                    <Button size="xs" variant="secondary" onClick={() => nav(`/assets?open=${selected.linkedAssetId}`)}>Asset: {assetName(selected.linkedAssetId)}</Button>
                  )}
                  {!selected.linkedModelId && !selected.linkedAssetId && (
                    <span className="text-xs text-[hsl(var(--text-4))]">This review names no system. An access certification that cannot say what it certified is not audit evidence — link the model or asset.</span>
                  )}
                </div>
              </div>
              {(selected.status !== 'completed') && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Record certification decision</p>
                  <div className="flex flex-wrap gap-2">
                    {(['approved', 'revoked', 'modified', 'deferred'] as const).map(d => (
                      <Button key={d} size="xs" variant="secondary" icon={d === 'approved' ? <CheckCircle /> : undefined} disabled={decide.isPending} onClick={() => recordDecision(selected, d)}>
                        {DECISION_LABEL[d]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        }] : []}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit access review' : 'New access review'}
        description="A review certifies access to a specific AI system or asset. Link the system it covers so the certification is auditable."
        submitLabel={editing ? 'Save changes' : 'Create'}
        busy={create.isPending || update.isPending}
        onSubmit={submitForm}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reference"><input value={form.reviewRef ?? ''} onChange={e => setForm(p => ({ ...p, reviewRef: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
          <Field label="Name" required><input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as ReviewType }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as ReviewStatus }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{STATUSES.map(s => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reviewer" hint="From the org directory — user_profiles.id">
            <Select value={form.reviewerId ?? '__none'} onValueChange={v => setForm(p => ({ ...p, reviewerId: v === '__none' ? null : v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="__none">Unassigned</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subject" hint="The identity whose access is certified">
            <Select value={form.subjectUserId ?? '__none'} onValueChange={v => setForm(p => ({ ...p, subjectUserId: v === '__none' ? null : v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Not user-specific" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="__none">Not user-specific</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model reviewed" hint="ai_models.id — resolved to the model name">
            <Select value={form.linkedModelId ?? '__none'} onValueChange={v => setForm(p => ({ ...p, linkedModelId: v === '__none' ? null : v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Not model-specific" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="__none">Not model-specific</SelectItem>
                {entities.models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Asset reviewed" hint="assets.id">
            <Select value={form.linkedAssetId ?? '__none'} onValueChange={v => setForm(p => ({ ...p, linkedAssetId: v === '__none' ? null : v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Not asset-specific" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="__none">Not asset-specific</SelectItem>
                {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><input type="date" value={form.dueDate ?? ''} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value || null }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
          <Field label="Framework reference"><input value={form.frameworkRef ?? ''} onChange={e => setForm(p => ({ ...p, frameworkRef: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
        </div>
        <Field label="Scope"><input value={form.scope ?? ''} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete access review"
        description={`Delete "${toDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
