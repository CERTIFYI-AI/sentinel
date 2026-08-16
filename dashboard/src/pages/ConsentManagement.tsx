// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Consent Management — GDPR Art. 7. The register that lets the controller
// *demonstrate* consent, and Art. 7(3) withdrawal that makes processing stop.
//
// Rebuilt on the platform primitives. The previous hand-rolled page counted
// 'granted' while the table stored 'active', so "Active Consents" read 0
// against six active consents; its status filter offered Title Case values
// that matched nothing; its edit dialog wrote 'Active' straight back into the
// column; it printed the raw uuid as the record id and "v{version}" as
// "vundefined"; and withdrawal wrote a hardcoded 2026-04-10 into local state
// while toasting that AI systems had been notified, which nothing did.
//
// Purposes, data categories and covered AI systems are editable here for the
// first time — without them a consent record cannot say what it actually
// permits, and the interlink could never be created from the UI at all.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckSquare, Plus, Warning, Export } from '@phosphor-icons/react'
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
import { useConsentRecordsData } from '@/hooks/useConsentRecordsData'
import { useRopaRecords } from '@/hooks/useComplianceRecords'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import {
  CONSENT_STATUSES, CONSENT_TYPES, CONSENT_LEGAL_BASES, CONSENT_CHANNELS,
  CONSENT_STATUS_LABEL, CONSENT_TYPE_LABEL, LEGAL_BASIS_LABEL,
  type ConsentRecord, type ConsentStatus, type ConsentType,
} from '@/services/consentRecordsService'

const STATUS_TONE: Record<ConsentStatus, string> = {
  granted: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  pending: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  withdrawn: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  expired: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
}

const EMPTY: Partial<ConsentRecord> = {
  subjectName: '', subjectEmail: '', subjectRef: '', type: 'explicit',
  legalBasis: 'consent', status: 'granted', purposes: [], dataCategories: [],
  linkedModelIds: [], linkedRopaId: null, channel: 'Web Portal', version: '',
  consentDate: new Date().toISOString().slice(0, 10), expiryDate: null,
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function ConsentManagement() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [params, setParams] = useSearchParams()
  const modelFilter = params.get('model')

  const {
    items, isLoading, error, saveConsentRecords, withdrawConsentRecord,
    removeConsentRecords, isSaving,
  } = useConsentRecordsData(modelFilter ? { modelId: modelFilter } : {})
  const ropa = useRopaRecords()
  const { models } = useModelOptions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ConsentRecord | null>(null)
  const [form, setForm] = useState<Partial<ConsentRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<ConsentRecord | null>(null)
  const [toWithdraw, setToWithdraw] = useState<ConsentRecord | null>(null)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const set = <K extends keyof ConsentRecord>(k: K, v: ConsentRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  const modelName = (id: string) => models.find((m) => m.id === id)?.name
  const ropaName = (id?: string | null) =>
    id ? ropa.data.find((r) => r.id === id)?.processingActivity : undefined

  const rows = useMemo(
    () => items.filter((c) => statusFilter === 'all' || c.status === statusFilter),
    [items, statusFilter],
  )

  const stats = useMemo(() => ({
    granted: items.filter((c) => c.status === 'granted').length,
    withdrawn: items.filter((c) => c.status === 'withdrawn').length,
    expired: items.filter((c) => c.status === 'expired').length,
    // Still recorded as granted but past its own expiry date — the gap between
    // what the register says and what is actually lawful.
    lapsed: items.filter((c) => c.isLapsed).length,
  }), [items])

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(c: ConsentRecord) { setEditing(c); setForm({ ...c }); setFormOpen(true) }

  async function submit() {
    try {
      await saveConsentRecords(editing ? { ...form, id: editing.id } : form)
      setFormOpen(false)
    } catch { /* the hook surfaces the error; the dialog stays open */ }
  }

  function exportCsv() {
    if (!rows.length) { toast.error('Nothing to export with the current filters'); return }
    const headers = [
      'reference', 'subject', 'email', 'type', 'legal_basis', 'status', 'purposes',
      'data_categories', 'ai_systems', 'processing_activity', 'consent_date',
      'expiry_date', 'withdrawal_date', 'channel', 'version',
    ]
    const lines = rows.map((c) => [
      c.consentRef, c.subjectName, c.subjectEmail, CONSENT_TYPE_LABEL[c.type],
      c.legalBasis ? (LEGAL_BASIS_LABEL[c.legalBasis] ?? c.legalBasis) : '',
      CONSENT_STATUS_LABEL[c.status], c.purposes.join('; '), c.dataCategories.join('; '),
      c.linkedModelIds.map((id) => modelName(id) ?? 'Unavailable').join('; '),
      ropaName(c.linkedRopaId) ?? '', c.consentDate, c.expiryDate, c.withdrawalDate,
      c.channel, c.version,
    ].map(csvEscape).join(','))
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `consent-register-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success(`Exported ${rows.length} record${rows.length === 1 ? '' : 's'}`)
  }

  const columns: Column<ConsentRecord>[] = [
    { key: 'consentRef', header: 'Reference', sortable: true, render: (c) => (
      <span className="font-mono text-xs font-medium text-[hsl(var(--brand))]">{c.consentRef ?? '—'}</span>
    ) },
    { key: 'subjectName', header: 'Subject', sortable: true, render: (c) => (
      <div>
        <div className="text-sm text-[hsl(var(--text-1))]">
          {c.subjectName || c.subjectRef || '—'}
        </div>
        <div className="font-mono text-[11px] text-[hsl(var(--text-4))]">{c.subjectEmail || '—'}</div>
      </div>
    ) },
    { key: 'legalBasis', header: 'Legal basis', sortable: true, render: (c) => (
      <div>
        <div className="text-xs text-[hsl(var(--text-2))]">
          {c.legalBasis ? (LEGAL_BASIS_LABEL[c.legalBasis] ?? c.legalBasis) : '—'}
        </div>
        <div className="text-[10px] text-[hsl(var(--text-4))]">{CONSENT_TYPE_LABEL[c.type]}</div>
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (c) => (
      <div className="flex flex-col gap-0.5">
        <span className={`inline-flex w-fit px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[c.status]}`}>
          {CONSENT_STATUS_LABEL[c.status]}
        </span>
        {c.isLapsed && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--s-wn-tx))]">
            <Warning size={10} /> past expiry
          </span>
        )}
      </div>
    ) },
    { key: 'purposes', header: 'Purposes', render: (c) => c.purposes.length ? (
      <div className="flex flex-wrap gap-1">
        {c.purposes.slice(0, 2).map((p) => (
          <span key={p} className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--text-3))]">
            {p}
          </span>
        ))}
        {c.purposes.length > 2 && (
          <span className="text-[10px] text-[hsl(var(--text-4))]">+{c.purposes.length - 2}</span>
        )}
      </div>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">none recorded</span> },
    { key: 'linkedModelIds', header: 'AI systems covered', render: (c) => c.linkedModelIds.length ? (
      <div className="flex flex-wrap gap-1">
        {c.linkedModelIds.slice(0, 2).map((id) => {
          const name = modelName(id)
          return name ? (
            <button key={id}
              className="border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--brand))] hover:underline"
              onClick={(e) => { e.stopPropagation(); nav(`/models/inventory/${id}`) }}>{name}</button>
          ) : (
            <span key={id} className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--text-4))]">
              Unavailable
            </span>
          )
        })}
        {c.linkedModelIds.length > 2 && (
          <span className="text-[10px] text-[hsl(var(--text-4))]">+{c.linkedModelIds.length - 2}</span>
        )}
      </div>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">—</span> },
    { key: 'linkedRopaId', header: 'Processing activity', render: (c) => {
      const name = ropaName(c.linkedRopaId)
      if (name) return (
        <button className="text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav(`/ropa?open=${c.linkedRopaId}`) }}>{name}</button>
      )
      return <span className="text-xs text-[hsl(var(--text-4))]">{c.linkedRopaId ? 'Unavailable' : '—'}</span>
    } },
    { key: 'expiryDate', header: 'Consent window', sortable: true, render: (c) => (
      <div className="font-mono text-[11px] text-[hsl(var(--text-3))]">
        <div>{c.consentDate ? c.consentDate.slice(0, 10) : '—'}</div>
        <div className="text-[hsl(var(--text-4))]">
          {c.withdrawalDate ? `withdrawn ${c.withdrawalDate.slice(0, 10)}`
            : c.expiryDate ? `to ${c.expiryDate.slice(0, 10)}` : 'no expiry'}
        </div>
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Consent Management"
        subtitle="GDPR Art. 7 — the evidence that consent was given and not withdrawn, mapped to the AI systems it covers"
        icon={CheckSquare}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/ropa')}>RoPA</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/dsr')}>Rights requests</Button>
            <Button variant="secondary" size="sm" icon={<Export />} onClick={exportCsv}>Export CSV</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openCreate}>New record</Button>}
          </div>
        }
      />

      {modelFilter && (
        <div className="mb-3 inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2.5 py-1 text-xs text-[hsl(var(--brand))]">
          Filtered to {modelName(modelFilter) ?? 'Unavailable'}
          <button className="hover:underline" onClick={() => { params.delete('model'); setParams(params) }}>clear</button>
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Granted</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-ok-tx))]">{stats.granted}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Withdrawn</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.withdrawn}</p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">processing must have ceased</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Expired</p>
            <p className="font-mono text-xl font-bold">{stats.expired}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Past expiry</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.lapsed}</p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">still recorded as granted</p>
          </div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={8} />
          : error ? <ErrorState message={(error as Error)?.message} />
          : items.length === 0 ? (
            <EmptyState
              title="No consent records"
              message="Article 7(1) requires the controller to be able to demonstrate that the data subject consented — which means a record per subject, per purpose, with the systems it covers."
              actionLabel={can('create') ? 'Record a consent' : undefined}
              onAction={can('create') ? openCreate : undefined}
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {CONSENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{CONSENT_STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="font-mono text-[11px] text-[hsl(var(--text-4))]">
                  {rows.length} of {items.length}
                </span>
              </div>
              <DataTable
                data={rows} columns={columns}
                searchKey="subjectName" searchPlaceholder="Search by subject…"
                onEdit={can('update') ? openEdit : undefined}
                onDelete={can('delete') ? (c) => setToDelete(c) : undefined}
                actions={(c) => c.status === 'granted' && can('update') ? (
                  <button
                    className="text-[11px] text-[hsl(var(--s-er-tx))] hover:underline"
                    onClick={(e) => { e.stopPropagation(); setWithdrawReason(''); setToWithdraw(c) }}
                  >
                    Withdraw
                  </button>
                ) : null}
              />
            </>
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.consentRef ?? 'consent record'}` : 'Record a consent'}
        description="What the subject agreed to, on what basis, and which AI systems that agreement covers."
        submitLabel={editing ? 'Save changes' : 'Record consent'}
        busy={isSaving}
        disabled={!form.subjectName?.trim() && !form.subjectRef?.trim()}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject name" required>
            <Input value={form.subjectName ?? ''} onChange={(e) => set('subjectName', e.target.value)} />
          </Field>
          <Field label="Subject email">
            <Input type="email" value={form.subjectEmail ?? ''} onChange={(e) => set('subjectEmail', e.target.value)} />
          </Field>
          <Field label="Pseudonymous reference" hint="Used where the subject's identity is not retained">
            <Input value={form.subjectRef ?? ''} onChange={(e) => set('subjectRef', e.target.value)} />
          </Field>
          <Field label="Consent type">
            <Select value={form.type ?? 'explicit'} onValueChange={(v) => set('type', v as ConsentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONSENT_TYPES.map((t) => <SelectItem key={t} value={t}>{CONSENT_TYPE_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Legal basis" hint="The same six Art. 6 bases the RoPA register uses">
            <Select value={form.legalBasis ?? 'consent'} onValueChange={(v) => set('legalBasis', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONSENT_LEGAL_BASES.map((b) => <SelectItem key={b} value={b}>{LEGAL_BASIS_LABEL[b]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status ?? 'granted'} onValueChange={(v) => set('status', v as ConsentStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONSENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{CONSENT_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Consent given">
            <Input type="date" value={form.consentDate ?? ''} onChange={(e) => set('consentDate', e.target.value)} />
          </Field>
          <Field label="Expires">
            <Input type="date" value={form.expiryDate ?? ''} onChange={(e) => set('expiryDate', e.target.value)} />
          </Field>
          <Field label="Capture channel">
            <Select value={form.channel ?? 'Web Portal'} onValueChange={(v) => set('channel', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONSENT_CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notice version" hint="Which version of the privacy notice was shown">
            <Input value={form.version ?? ''} onChange={(e) => set('version', e.target.value)} placeholder="2.1" />
          </Field>
        </div>

        <Field label="Purposes consented to" hint="Comma-separated. Consent is purpose-specific under Art. 6(1)(a).">
          <Input value={(form.purposes ?? []).join(', ')}
            onChange={(e) => set('purposes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        </Field>

        <Field label="Data categories" hint="Comma-separated">
          <Input value={(form.dataCategories ?? []).join(', ')}
            onChange={(e) => set('dataCategories', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        </Field>

        <Field label="Processing activity" hint="The Art. 30 record this consent makes lawful">
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

        <Field label="AI systems this consent covers"
               hint="On withdrawal these are the systems that must stop processing">
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => {
              const on = (form.linkedModelIds ?? []).includes(m.id)
              return (
                <button key={m.id} type="button"
                  onClick={() => set('linkedModelIds', on
                    ? (form.linkedModelIds ?? []).filter((x) => x !== m.id)
                    : [...(form.linkedModelIds ?? []), m.id])}
                  className={`border px-2 py-1 text-[12px] ${on
                    ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]'}`}>
                  {m.name}
                </button>
              )
            })}
            {models.length === 0 && <span className="text-xs text-[hsl(var(--text-4))]">No models registered yet.</span>}
          </div>
        </Field>
      </FormDialog>

      {/* Withdrawal is its own dialog: it is the one transition with a
          statutory consequence, and the reason belongs in the record. */}
      <FormDialog
        open={!!toWithdraw} onOpenChange={(o) => !o && setToWithdraw(null)}
        title={`Withdraw ${toWithdraw?.consentRef ?? 'consent'}?`}
        description="Recorded under Art. 7(3). Withdrawal is stamped with today's date by the database and does not by itself stop any system — the linked systems below are what must now cease processing."
        submitLabel="Record withdrawal"
        onSubmit={async () => {
          if (!toWithdraw) return
          try {
            await withdrawConsentRecord({ id: toWithdraw.id, reason: withdrawReason || undefined })
            setToWithdraw(null)
          } catch { /* hook toasts */ }
        }}
      >
        <Field label="Reason given">
          <Textarea rows={2} value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} />
        </Field>
        {!!toWithdraw?.linkedModelIds.length && (
          <div className="border border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))] p-3">
            <p className="text-xs font-semibold text-[hsl(var(--s-er-tx))]">Processing must cease in</p>
            <ul className="mt-1 space-y-0.5">
              {toWithdraw.linkedModelIds.map((id) => (
                <li key={id} className="text-xs text-[hsl(var(--text-2))]">
                  {modelName(id) ?? 'Unavailable'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.consentRef ?? 'this record'}?`}
        description="This permanently removes the evidence that consent was obtained. Withdrawing instead preserves the record and the reason."
        isDestructive confirmLabel="Delete"
        onConfirm={async () => {
          if (!toDelete) return
          try { await removeConsentRecords(toDelete.id); setToDelete(null) } catch { /* hook toasts */ }
        }}
      />
    </div>
  )
}
