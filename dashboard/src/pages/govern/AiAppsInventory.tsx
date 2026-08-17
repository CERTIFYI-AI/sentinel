// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// AI Apps — inventory of third-party AI tools staff use (shadow-AI
// governance): approval state, trust grade, allowed data ceiling, vendor and
// policy links. Real org-scoped backend; honest empty/error states.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppWindow, ArrowSquareOut, Plus } from '@phosphor-icons/react'
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
import { useAiApps, usePolicyOptions, useVendorOptions } from '@/hooks/useGovernAddons'
import { useRBAC } from '@/hooks/useRBAC'
import type { AiAppRecord, AppApprovalStatus, AppTrustGrade } from '@/services/aiAppsService'

const CATEGORIES = [
  ['assistant', 'Assistant'], ['code', 'Code'], ['content', 'Content'],
  ['transcription', 'Transcription'], ['analytics', 'Analytics'], ['other', 'Other'],
] as const
const APPROVALS: [AppApprovalStatus, string][] = [
  ['approved', 'Approved'], ['under_review', 'Under review'],
  ['restricted', 'Restricted'], ['blocked', 'Blocked'],
]
const DATA_LEVELS = [
  ['public', 'Public only'], ['internal', 'Internal'],
  ['confidential', 'Confidential'], ['restricted', 'Restricted'],
] as const
const DISCOVERY = [
  ['declared', 'Declared by team'], ['sso_audit', 'SSO audit'],
  ['network_scan', 'Network scan'], ['expense_report', 'Expense report'],
] as const
const GRADES: AppTrustGrade[] = ['A', 'B', 'C', 'D', 'F']

const approvalTone: Record<AppApprovalStatus, string> = {
  approved: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  under_review: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  restricted: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  blocked: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
}

const gradeTone: Record<AppTrustGrade, string> = {
  A: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]',
  B: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]',
  C: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]',
  D: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]',
  F: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] border-[hsl(var(--s-er-br))]',
}

const EMPTY_FORM: Partial<AiAppRecord> = {
  name: '', category: 'assistant', vendorId: null, approvalStatus: 'under_review',
  trustGrade: null, allowedData: 'public', businessUnits: [], discoveredVia: 'declared',
  ownerName: '', linkedPolicyId: null, notes: '',
}

export default function AiAppsInventory() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, error, refetch, create, update, remove } = useAiApps()
  const { vendors, error: vendorsError } = useVendorOptions()
  const { policies } = usePolicyOptions()

  const [statusFilter, setStatusFilter] = useState<AppApprovalStatus | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AiAppRecord | null>(null)
  const [form, setForm] = useState<Partial<AiAppRecord>>(EMPTY_FORM)
  const [toDelete, setToDelete] = useState<AiAppRecord | null>(null)

  const set = <K extends keyof AiAppRecord>(k: K, v: AiAppRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true) }
  function openEdit(a: AiAppRecord) { setEditing(a); setForm({ ...a }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save app')
    if (editing) {
      update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('App updated'); setFormOpen(false) }, onError,
      })
    } else {
      create.mutate(form, {
        onSuccess: () => { toast.success('App registered'); setFormOpen(false) }, onError,
      })
    }
  }

  const rows = useMemo(
    () => (statusFilter === 'all' ? data : data.filter((a) => a.approvalStatus === statusFilter)),
    [data, statusFilter],
  )

  const stats = useMemo(() => ({
    approved: data.filter((a) => a.approvalStatus === 'approved').length,
    review: data.filter((a) => a.approvalStatus === 'under_review').length,
    blocked: data.filter((a) => a.approvalStatus === 'blocked').length,
    shadow: data.filter((a) => a.discoveredVia !== 'declared').length,
  }), [data])

  const vendorName = (id?: string | null) => vendors.find((v) => v.id === id)?.name

  const columns: Column<AiAppRecord>[] = [
    { key: 'name', header: 'App', sortable: true, render: (a) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{a.name}</div>
        <div className="text-xs capitalize text-[hsl(var(--text-4))]">{a.category}{a.seats ? ` · ${a.seats} seats` : ''}</div>
      </div>
    ) },
    { key: 'trustGrade', header: 'Grade', sortable: true, render: (a) => a.trustGrade ? (
      <span className={`inline-flex h-6 w-6 items-center justify-center border text-xs font-bold ${gradeTone[a.trustGrade]}`}>{a.trustGrade}</span>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">—</span> },
    { key: 'approvalStatus', header: 'Approval', sortable: true, render: (a) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${approvalTone[a.approvalStatus]}`}>{a.approvalStatus.replace('_', ' ')}</span>
    ) },
    { key: 'allowedData', header: 'Data ceiling', render: (a) => (
      <span className="text-xs capitalize text-[hsl(var(--text-2))]">{a.allowedData}</span>
    ) },
    { key: 'vendor', header: 'Vendor', render: (a) => {
      const name = vendorName(a.vendorId)
      return name ? (
        <button className="inline-flex items-center gap-1 text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav(`/vendors/${a.vendorId}`) }}>{name} <ArrowSquareOut size={11} /></button>
      ) : <span className="text-xs text-[hsl(var(--text-4))]">{a.vendorId ? 'Unavailable' : '—'}</span>
    } },
    { key: 'discoveredVia', header: 'Discovered', render: (a) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{DISCOVERY.find(([v]) => v === a.discoveredVia)?.[1] ?? a.discoveredVia}</span>
    ) },
    { key: 'ownerName', header: 'Owner', sortable: true },
  ]

  return (
    <div>
      <PageHeader
        title="AI Apps"
        subtitle="Third-party AI tools in use across the organization — approval states, trust grades and data ceilings"
        icon={AppWindow}
        actions={can('create') ? <Button size="sm" icon={<Plus />} onClick={openCreate}>Register App</Button> : undefined}
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          {([
            ['Approved', stats.approved, 'approved', 'text-[hsl(var(--s-ok-tx))]'],
            ['Under review', stats.review, 'under_review', 'text-[hsl(var(--s-wn-tx))]'],
            ['Blocked', stats.blocked, 'blocked', 'text-[hsl(var(--s-er-tx))]'],
            ['Shadow-discovered', stats.shadow, 'all', 'text-[hsl(var(--text-1))]'],
          ] as const).map(([label, value, filter, tone]) => (
            <button key={label} className="text-left" onClick={() => setStatusFilter(filter as AppApprovalStatus | 'all')}>
              <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">{label}</p>
              <p className={`font-mono text-xl font-bold ${tone}`}>{value}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {statusFilter !== 'all' && (
        <div className="mb-3">
          <button className="border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1 text-xs text-[hsl(var(--brand))]"
            onClick={() => setStatusFilter('all')}>
            Filtered: {statusFilter.replace('_', ' ')} — clear
          </button>
        </div>
      )}

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState message={error?.message} onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title={statusFilter === 'all' ? 'No AI apps registered' : 'No apps in this state'}
              message="Register the external AI tools your teams use — declared or discovered — and govern them with approval states and data ceilings."
              actionLabel={can('create') && statusFilter === 'all' ? 'Register an app' : undefined}
              onAction={can('create') && statusFilter === 'all' ? openCreate : undefined} />
          ) : (
            <DataTable
              data={rows} columns={columns} searchKey="name" searchPlaceholder="Search apps…"
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (a) => setToDelete(a) : undefined}
            />
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.name}` : 'Register AI App'}
        description="External AI tools require registration and an approval state under the acceptable-use policy."
        submitLabel={editing ? 'Save changes' : 'Register'}
        busy={create.isPending || update.isPending}
        disabled={!form.name?.trim()}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Category">
            <Select value={form.category ?? 'assistant'} onValueChange={(v) => set('category', v as AiAppRecord['category'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Approval state">
            <Select value={form.approvalStatus ?? 'under_review'} onValueChange={(v) => set('approvalStatus', v as AppApprovalStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{APPROVALS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Trust grade">
            <Select value={form.trustGrade ?? '__none__'} onValueChange={(v) => set('trustGrade', v === '__none__' ? null : v as AppTrustGrade)}>
              <SelectTrigger><SelectValue placeholder="Ungraded" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ungraded</SelectItem>
                {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data ceiling" hint="Highest data classification allowed in this tool">
            <Select value={form.allowedData ?? 'public'} onValueChange={(v) => set('allowedData', v as AiAppRecord['allowedData'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DATA_LEVELS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Discovered via">
            <Select value={form.discoveredVia ?? 'declared'} onValueChange={(v) => set('discoveredVia', v as AiAppRecord['discoveredVia'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DISCOVERY.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Vendor" hint="From the vendor registry">
            <Select value={form.vendorId ?? '__none__'} onValueChange={(v) => set('vendorId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not linked</SelectItem>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {vendorsError && (
              <p role="alert" className="mt-1 text-[11px] text-[hsl(var(--destructive))]">
                Vendor options failed to load: {vendorsError.message}
              </p>
            )}
          </Field>
          <Field label="Governing policy">
            <Select value={form.linkedPolicyId ?? '__none__'} onValueChange={(v) => set('linkedPolicyId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not linked</SelectItem>
                {policies.map((p) => <SelectItem key={p.id} value={p.id}>{p.ref} · {p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Owner"><Input value={form.ownerName ?? ''} onChange={(e) => set('ownerName', e.target.value)} /></Field>
          <Field label="Seats"><Input type="number" value={form.seats ?? ''} onChange={(e) => set('seats', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        </div>
        <Field label="Business units" hint="Comma-separated">
          <Input value={(form.businessUnits ?? []).join(', ')}
            onChange={(e) => set('businessUnits', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        </Field>
        <Field label="Notes"><Textarea rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? ''}?`}
        description="The app record is soft-deleted and disappears from the inventory."
        isDestructive
        confirmLabel="Delete"
        onConfirm={() => {
          if (!toDelete) return
          remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('App deleted'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to delete'),
          })
        }}
      />
    </div>
  )
}
