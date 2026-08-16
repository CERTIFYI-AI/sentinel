// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Transfer Impact Assessments — GDPR Chapter V assessments for personal data
// leaving the EEA, recording the transfer mechanism, the destination-country
// risk and the supplementary measures relied upon.
//
// Backed by the canonical org-scoped `transfer_impact_assessments` table. The
// page previously read the generic `tia_table (id, doc jsonb)` demo table
// seeded from a hardcoded array, with local-only writes.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowsLeftRight, Plus, Warning } from '@phosphor-icons/react'
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
import { LinkChip, LinkChips, ChipMultiSelect } from '@/components/ui/LinkChips'
import { useTiaRecords, useRopaRecords } from '@/hooks/useComplianceRecords'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useVendorOptions } from '@/hooks/useGovernAddons'
import { useRBAC } from '@/hooks/useRBAC'
import type { TiaRecord } from '@/services/privacyRecordsService'

// Values are fixed by the transfer_impact_assessments_transfer_mechanism_check
// constraint. There is no 'none' member: a transfer with no mechanism is
// represented by leaving the field unset, which the list flags as unlawful.
const MECHANISMS = [
  'adequacy_decision', 'standard_contractual_clauses', 'binding_corporate_rules',
  'derogation', 'other',
] as const

const MECHANISM_LABEL: Record<string, string> = {
  adequacy_decision: 'Adequacy decision',
  standard_contractual_clauses: 'Standard contractual clauses',
  binding_corporate_rules: 'Binding corporate rules',
  derogation: 'Art. 49 derogation',
  other: 'Other (documented)',
}

const RISK_TONE: Record<string, string> = {
  critical: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  high: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  medium: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  low: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
}

const EMPTY: Partial<TiaRecord> = {
  transferName: '', sourceCountry: '', destinationCountry: '',
  transferMechanism: 'standard_contractual_clauses', dataTypes: '', dataVolume: '',
  riskLevel: 'medium', supplementaryMeasures: '', status: 'draft', validUntil: null,
  linkedRopaId: null, linkedModelIds: [],
}

/** Days until expiry; negative means expired. Null when no validity date set. */
function daysUntil(due?: string | null): number | null {
  if (!due) return null
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000)
}

export default function TIA() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const tia = useTiaRecords()
  const ropa = useRopaRecords()
  const { models } = useModelOptions()

  const modelName = (id: string) => models.find((m) => m.id === id)?.name
  const ropaName = (id: string) => ropa.data.find((r) => r.id === id)?.processingActivity
  // The supplier on the receiving end of the transfer — a TIA without a
  // named recipient cannot be assessed.
  const { vendors } = useVendorOptions()
  const vendorName = (id?: string | null) => vendors.find((v: any) => v.id === id)?.name

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TiaRecord | null>(null)
  const [form, setForm] = useState<Partial<TiaRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<TiaRecord | null>(null)

  const set = <K extends keyof TiaRecord>(k: K, v: TiaRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(t: TiaRecord) { setEditing(t); setForm({ ...t }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save assessment')
    if (editing) {
      tia.update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('Assessment updated'); setFormOpen(false) }, onError,
      })
    } else {
      tia.create.mutate(form, {
        onSuccess: () => { toast.success('Assessment added'); setFormOpen(false) }, onError,
      })
    }
  }

  const stats = useMemo(() => {
    const rows = tia.data
    return {
      total: rows.length,
      highRisk: rows.filter((t) => t.riskLevel === 'high' || t.riskLevel === 'critical').length,
      // A transfer relying on no identified mechanism is an unlawful transfer.
      noMechanism: rows.filter((t) => !t.transferMechanism).length,
      expired: rows.filter((t) => {
        const d = daysUntil(t.validUntil)
        return d != null && d < 0
      }).length,
    }
  }, [tia.data])

  const columns: Column<TiaRecord>[] = [
    { key: 'reference', header: 'Ref', sortable: true, render: (t) => (
      <span className="font-mono text-xs font-medium text-[hsl(var(--brand))]">{t.reference ?? '—'}</span>
    ) },
    { key: 'transferName', header: 'Transfer', sortable: true, render: (t) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{t.transferName}</div>
        <div className="text-xs text-[hsl(var(--text-4))]">
          {t.sourceCountry || '—'} → {t.destinationCountry || '—'}
        </div>
      </div>
    ) },
    { key: 'transferMechanism', header: 'Mechanism', sortable: true, render: (t) => {
      const none = !t.transferMechanism
      return (
        <span
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: none ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-2))' }}
        >
          {none && <Warning size={11} />}
          {t.transferMechanism ? (MECHANISM_LABEL[t.transferMechanism] ?? t.transferMechanism) : 'None identified'}
        </span>
      )
    } },
    { key: 'riskLevel', header: 'Risk', sortable: true, render: (t) => t.riskLevel ? (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${RISK_TONE[t.riskLevel] ?? RISK_TONE.medium}`}>
        {t.riskLevel}
      </span>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">—</span> },
    { key: 'dataTypes', header: 'Data types', render: (t) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{t.dataTypes || '—'}</span>
    ) },
    { key: 'vendorId', header: 'Recipient', render: (t) => {
      const name = vendorName(t.vendorId)
      if (name) return (
        <button className="text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav('/vendors') }}>{name}</button>
      )
      return <span className="text-xs text-[hsl(var(--text-4))]">{t.vendorId ? 'Unavailable' : '—'}</span>
    } },
    { key: 'linkedRopaId', header: 'Processing activity', render: (t) => (
      <LinkChip id={t.linkedRopaId} resolve={ropaName}
        href={(id) => `/ropa?open=${id}`} onNavigate={nav} />
    ) },
    { key: 'linkedModelIds', header: 'AI systems', render: (t) => (
      <LinkChips ids={t.linkedModelIds} resolve={modelName}
        hrefFor={(id) => `/models/inventory/${id}`} onNavigate={nav} />
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (t) => (
      <span className="text-xs capitalize text-[hsl(var(--text-2))]">{t.status || 'draft'}</span>
    ) },
    { key: 'validUntil', header: 'Valid until', sortable: true, render: (t) => {
      const d = daysUntil(t.validUntil)
      if (d == null) return <span className="text-xs text-[hsl(var(--text-4))]">no expiry set</span>
      const expired = d < 0
      return (
        <span
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: expired ? 'hsl(var(--s-er-tx))' : d <= 30 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}
        >
          {expired && <Warning size={11} />}
          {expired ? `expired ${Math.abs(d)}d ago` : `${d}d`}
        </span>
      )
    } },
  ]

  return (
    <div>
      <PageHeader
        title="Transfer Impact Assessments"
        subtitle="GDPR Chapter V — the mechanism and supplementary measures relied on for each cross-border transfer"
        icon={ArrowsLeftRight}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/ropa')}>RoPA</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/vendors')}>Vendors</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openCreate}>Add Assessment</Button>}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Transfers</p><p className="font-mono text-xl font-bold">{stats.total}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">High risk</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.highRisk}</p></div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">No mechanism</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.noMechanism}</p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">unlawful if transferring</p>
          </div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Expired</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.expired}</p></div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {tia.isLoading ? <TableSkeleton cols={6} />
          : tia.isError ? <ErrorState message={tia.error?.message} onRetry={() => tia.refetch()} />
          : tia.data.length === 0 ? (
            <EmptyState
              title="No transfer assessments recorded"
              message="Every transfer of personal data outside the EEA needs a documented mechanism and, where the destination lacks adequacy, supplementary measures."
              actionLabel={can('create') ? 'Add an assessment' : undefined}
              onAction={can('create') ? openCreate : undefined}
            />
          ) : (
            <DataTable
              data={tia.data} columns={columns} searchKey="transferName" searchPlaceholder="Search transfers…"
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (t) => setToDelete(t) : undefined}
            />
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.transferName}` : 'Add Transfer Assessment'}
        description="Record the lawful mechanism for the transfer and any supplementary measures relied upon."
        submitLabel={editing ? 'Save changes' : 'Add'}
        busy={tia.create.isPending || tia.update.isPending}
        disabled={!form.transferName?.trim()}
        onSubmit={submit}
      >
        <Field label="Transfer name" required>
          <Input value={form.transferName ?? ''} onChange={(e) => set('transferName', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source country"><Input value={form.sourceCountry ?? ''} onChange={(e) => set('sourceCountry', e.target.value)} /></Field>
          <Field label="Destination country"><Input value={form.destinationCountry ?? ''} onChange={(e) => set('destinationCountry', e.target.value)} /></Field>
          <Field label="Transfer mechanism">
            <Select value={form.transferMechanism ?? 'standard_contractual_clauses'} onValueChange={(v) => set('transferMechanism', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MECHANISMS.map((m) => <SelectItem key={m} value={m}>{MECHANISM_LABEL[m]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Risk level">
            <Select value={form.riskLevel ?? 'medium'} onValueChange={(v) => set('riskLevel', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['critical', 'high', 'medium', 'low'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Data types"><Input value={form.dataTypes ?? ''} onChange={(e) => set('dataTypes', e.target.value)} /></Field>
          <Field label="Data volume"><Input value={form.dataVolume ?? ''} onChange={(e) => set('dataVolume', e.target.value)} /></Field>
          <Field label="Status">
            <Select value={form.status ?? 'draft'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['draft', 'in_progress', 'completed', 'approved'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Valid until"><Input type="date" value={form.validUntil ?? ''} onChange={(e) => set('validUntil', e.target.value)} /></Field>
          <Field label="Recipient vendor" hint="Who receives the data at the destination">
            <Select value={form.vendorId ?? '__none__'} onValueChange={(v) => set('vendorId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not linked</SelectItem>
                {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Processing activity" hint="The Art. 30 record whose data crosses the border">
          <Select value={form.linkedRopaId ?? '__none__'} onValueChange={(v) => set('linkedRopaId', v === '__none__' ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {ropa.data.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.reference ? `${r.reference} — ` : ''}{r.processingActivity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="AI systems performing the transfer">
          <ChipMultiSelect options={models} value={form.linkedModelIds ?? []}
            onChange={(v) => set('linkedModelIds', v)} emptyMessage="No models registered yet." />
        </Field>

        <Field label="Supplementary measures" hint="Required where the destination lacks an adequacy decision">
          <Textarea rows={3} value={form.supplementaryMeasures ?? ''} onChange={(e) => set('supplementaryMeasures', e.target.value)} />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.transferName ?? ''}"?`}
        description="This removes a Chapter V assessment. Confirm the transfer has genuinely ceased."
        isDestructive confirmLabel="Delete"
        onConfirm={() => {
          if (!toDelete) return
          tia.remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('Assessment deleted'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to delete'),
          })
        }}
      />
    </div>
  )
}
