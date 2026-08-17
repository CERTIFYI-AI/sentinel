// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// VendorUpload — the vendor compliance-document portal, backed by Supabase
// Storage and the org-scoped `vendor_documents` table.
//
// What this page used to be: a local SEED array and a toast. Files were never
// uploaded anywhere — dropping a file fired
// `toast.success('… queued for upload')` with the promise that it would be
// "reviewed by the security team within 5 business days", and that was the
// entire feature. Accept and reject both stamped `reviewedBy: 'Sarah Chen'`,
// a hardcoded name, with no audit entry. The "Expiring < 90 days" tile was the
// literal `2` sitting between three computed tiles, while real expiry dates
// were in the same array.
//
// Now: the file goes to Storage, a row lands in `vendor_documents` with a
// sha-256 digest, the reviewer is the authenticated user's uuid resolved
// server-side, every decision is audit-logged, and the expiry KPI is computed
// from the real `expires_at` column.

import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CloudArrowUp, FileText, CheckCircle, Clock, Warning, Buildings, Export,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow, type StatCardRowItem } from '@/components/ui/StatCardRow'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterBar } from '@/components/ui/FilterBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useVendorDocuments } from '@/hooks/useVendorDocuments'
import { useVendorOptions } from '@/hooks/useVendorsData'
import {
  DOCUMENT_TYPES, documentsExpiringWithin, getVendorDocumentUrl,
  type VendorDocumentRecord,
} from '@/services/vendorDocumentService'
import { Pill, LinkPill, FilterChip, Fact, docTone, fmtDate, daysUntil } from './vendors/vendorUi'

function fmtSize(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type UploadState = {
  vendorId: string
  docType: string
  title: string
  validFrom: string
  expiresAt: string
  confidentiality: string
  renewalLeadDays: string
}

const BLANK_UPLOAD: UploadState = {
  vendorId: '', docType: 'SOC2', title: '', validFrom: '', expiresAt: '',
  confidentiality: 'confidential', renewalLeadDays: '',
}

export default function VendorUpload() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const vendorParam = params.get('vendor')
  const openParam = params.get('open')

  const { documents, isLoading, isError, error, refetch, upload, review, remove } =
    useVendorDocuments(vendorParam ?? undefined)
  const { options: vendorOptions, resolveName } = useVendorOptions()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [form, setForm] = useState<UploadState>(BLANK_UPLOAD)
  const [rejectTarget, setRejectTarget] = useState<VendorDocumentRecord | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<VendorDocumentRecord | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof UploadState>(k: K, v: UploadState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const selected = openParam ? documents.find((d) => d.id === openParam) ?? null : null

  const expiring90 = documentsExpiringWithin(documents, 90)
  const accepted = documents.filter((d) => d.status === 'accepted').length
  const pendingReview = documents.filter((d) => d.status === 'pending_review').length
  const withExpiry = documents.filter((d) => !!d.expiresAt)

  const kpis: StatCardRowItem[] = [
    { label: 'Documents', value: documents.length, icon: <FileText size={18} /> },
    {
      label: 'Accepted', value: documents.length ? accepted : '—', icon: <CheckCircle size={18} />,
      description: `${accepted} reviewed and accepted`,
    },
    {
      label: 'Pending review', value: documents.length ? pendingReview : '—', icon: <Clock size={18} />,
      description: `${pendingReview} awaiting a reviewer`,
    },
    {
      label: 'Expiring < 90 days',
      value: withExpiry.length ? expiring90.length : '—',
      icon: <Warning size={18} />,
      isPositiveUp: false,
      description: withExpiry.length
        ? `Computed from expiry dates on ${withExpiry.length} of ${documents.length} documents`
        : 'No document carries an expiry date',
    },
  ]

  const filtered = useMemo(() => documents.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false
    if (typeFilter && d.docType !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${resolveName(d.vendorId)} ${d.fileName ?? ''} ${d.title ?? ''} ${d.docType ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [documents, statusFilter, typeFilter, search, resolveName])

  function clearVendorFilter() {
    const next = new URLSearchParams(params); next.delete('vendor'); setParams(next, { replace: true })
  }
  function openRecord(d: VendorDocumentRecord) {
    const next = new URLSearchParams(params); next.set('open', d.id); setParams(next, { replace: true })
  }
  function closeRecord() {
    const next = new URLSearchParams(params); next.delete('open'); setParams(next, { replace: true })
  }

  function takeFile(file: File) {
    setPendingFile(file)
    setForm({ ...BLANK_UPLOAD, vendorId: vendorParam ?? '', title: file.name })
  }

  function submitUpload() {
    if (!pendingFile) return
    upload.mutate({
      file: pendingFile,
      vendorId: form.vendorId,
      docType: form.docType,
      title: form.title || pendingFile.name,
      validFrom: form.validFrom || undefined,
      expiresAt: form.expiresAt || undefined,
      confidentiality: form.confidentiality || undefined,
      renewalLeadDays: form.renewalLeadDays ? Number(form.renewalLeadDays) : undefined,
    }, {
      // The dialog closes only once the object and the row both exist.
      onSuccess: () => { setPendingFile(null); setForm(BLANK_UPLOAD) },
    })
  }

  async function download(d: VendorDocumentRecord) {
    try {
      const url = await getVendorDocumentUrl(d.storagePath)
      if (!url) { toast.error('No stored file for this record.'); return }
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open the document')
    }
  }

  function handleExport() {
    const header = ['id', 'vendor', 'doc_type', 'file_name', 'status', 'version', 'expires_at', 'file_digest']
    const csv = [
      header.join(','),
      ...filtered.map((d) => [
        d.id, JSON.stringify(resolveName(d.vendorId)), d.docType ?? '', JSON.stringify(d.fileName ?? ''),
        d.status, d.version, d.expiresAt ?? '', d.fileDigest ?? '',
      ].join(',')),
    ].join('\n')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    el.download = `vendor-documents-${new Date().toISOString().slice(0, 10)}.csv`
    el.click()
  }

  const columns: Column<VendorDocumentRecord>[] = [
    {
      key: 'vendor', header: 'Vendor', sortable: true,
      render: (d) => {
        const name = d.vendorId ? resolveName(d.vendorId) : 'Unavailable'
        return d.vendorId && name !== 'Unavailable'
          ? <LinkPill to={`/vendors/${d.vendorId}`}>{name}</LinkPill>
          : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
      },
    },
    { key: 'docType', header: 'Type', sortable: true, render: (d) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{d.docType || '—'}</span>
    ) },
    { key: 'fileName', header: 'File', sortable: true, render: (d) => (
      <div className="max-w-xs">
        <div className="truncate text-sm" style={{ color: 'hsl(var(--text-1))' }}>{d.title || d.fileName || '—'}</div>
        <div className="truncate text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          {d.fileName ?? '—'} · {fmtSize(d.fileSizeBytes)} · v{d.version}
        </div>
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (d) => (
      <Pill tone={docTone(d.status)}>{d.status.replace(/_/g, ' ')}</Pill>
    ) },
    {
      key: 'expiresAt', header: 'Expires', sortable: true,
      render: (d) => {
        const days = daysUntil(d.expiresAt)
        return (
          <span
            className="text-xs"
            style={{ color: days !== null && days < 90 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }}
          >
            {fmtDate(d.expiresAt)}
            {days !== null && (days < 0 ? ' · expired' : days < 90 ? ` · ${days}d` : '')}
          </span>
        )
      },
    },
    { key: 'reviewedAt', header: 'Reviewed', sortable: true, render: (d) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{fmtDate(d.reviewedAt)}</span>
    ) },
  ]

  if (isLoading) return <PageSkeleton title="Vendor documents" rows={8} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Document Portal"
        subtitle="SOC 2 reports, ISO certificates, DPAs, pentest reports and AIBOMs — stored, hashed and reviewed"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Vendors', href: '/vendors' },
          { label: 'Documents' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
              <Buildings size={14} /> Registry
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/tprm')}>TPRM Workspace</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Export size={14} /> Export CSV</Button>
          </div>
        }
      />

      {isError ? (
        <ErrorState title="Could not load documents" error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <StatCardRow cards={kpis} />

          {vendorParam && (
            <FilterChip label="Vendor" value={resolveName(vendorParam)} onClear={clearVendorFilter} />
          )}

          {/* Drop zone. Selecting a file opens the metadata dialog; nothing is
              claimed to be uploaded until the write resolves. */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Select a compliance document to upload"
            className="cursor-pointer border-2 border-dashed p-10 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              borderColor: dragOver ? 'hsl(var(--brand))' : 'hsl(var(--border))',
              background: dragOver ? 'hsl(var(--s-in-bg))' : 'transparent',
              outlineColor: 'hsl(var(--brand))',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false)
              const f = e.dataTransfer.files?.[0]
              if (f) takeFile(f)
            }}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) takeFile(f); e.target.value = '' }}
            />
            <CloudArrowUp size={36} className="mx-auto mb-3" style={{ color: dragOver ? 'hsl(var(--brand))' : 'hsl(var(--text-4))' }} />
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Drop a compliance document here, or click to browse
            </p>
            <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              The file is stored against a vendor with a sha-256 digest. It stays in "pending review" until a
              signed-in reviewer accepts or rejects it.
            </p>
          </div>

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by vendor, file, type…"
            filters={[
              {
                key: 'status', label: 'Status', value: statusFilter, onChange: setStatusFilter,
                options: ['pending_review', 'accepted', 'rejected', 'expired']
                  .map((s) => ({ label: s.replace(/_/g, ' '), value: s })),
              },
              {
                key: 'type', label: 'Type', value: typeFilter, onChange: setTypeFilter,
                options: DOCUMENT_TYPES.map((t) => ({ label: t, value: t })),
              },
            ]}
            activeFilterCount={[statusFilter, typeFilter].filter(Boolean).length}
            onClearAll={() => { setSearch(''); setStatusFilter(''); setTypeFilter('') }}
            trailing={
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {filtered.length} of {documents.length}
              </span>
            }
          />

          {documents.length === 0 ? (
            <EmptyState
              icon={<FileText size={32} weight="duotone" />}
              title="No documents on file"
              description="Nothing has been uploaded yet. Certificates and reports uploaded here appear on the vendor record and can be attached to an assessment as evidence."
              action={<Button size="sm" onClick={() => fileRef.current?.click()}>Upload a document</Button>}
            />
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              searchKey="fileName"
              onRowClick={openRecord}
              onView={openRecord}
              onDelete={setDeleteTarget}
              emptyMessage="No documents match the current filters."
            />
          )}
        </>
      )}

      {/* ── Detail sheet ──────────────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) closeRecord() }}>
        <SheetContent style={{ borderRadius: 0, width: 600, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle>{selected?.title || selected?.fileName || 'Document'}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 h-[calc(100vh-140px)] space-y-5 overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={docTone(selected.status)}>{selected.status.replace(/_/g, ' ')}</Pill>
                {selected.vendorId && resolveName(selected.vendorId) !== 'Unavailable' && (
                  <LinkPill to={`/vendors/${selected.vendorId}`}>{resolveName(selected.vendorId)}</LinkPill>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Fact label="Document type" value={selected.docType} />
                <Fact label="Version" value={selected.version} />
                <Fact label="File" value={selected.fileName} hint={fmtSize(selected.fileSizeBytes)} />
                <Fact label="Confidentiality" value={selected.confidentiality} />
                <Fact label="Valid from" value={fmtDate(selected.validFrom)} />
                <Fact label="Expires" value={fmtDate(selected.expiresAt)} />
                <Fact label="Renewal lead" value={selected.renewalLeadDays ? `${selected.renewalLeadDays} days` : null} />
                <Fact label="Retention until" value={fmtDate(selected.retentionUntil)} />
                <Fact label="Uploaded" value={fmtDate(selected.createdAt)} />
                <Fact label="Reviewed" value={fmtDate(selected.reviewedAt)} />
                <Fact label="Virus scan" value={selected.virusScanStatus} hint="unset until a scanner reports" />
                <Fact label="Supersedes" value={selected.supersedesId ? `version ${selected.version - 1}` : null} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>
                  Integrity digest (SHA-256)
                </p>
                <p className="mt-1 break-all font-mono text-[11px]" style={{ color: 'hsl(var(--text-2))' }}>
                  {selected.fileDigest ?? '—'}
                </p>
              </div>

              {selected.reviewNotes && <Fact label="Review notes" value={selected.reviewNotes} />}

              {selected.assessmentId && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>
                    Attached to assessment
                  </p>
                  <div className="mt-1">
                    <LinkPill to={`/vendors/assessments?open=${selected.assessmentId}`}>Open assessment</LinkPill>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => download(selected)} disabled={!selected.storagePath}>
                  Open file
                </Button>
                {selected.status === 'pending_review' && (
                  <>
                    <Button
                      size="sm"
                      loading={review.isPending}
                      onClick={() => review.mutate({ id: selected.id, decision: 'accepted' })}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setRejectNotes(''); setRejectTarget(selected) }}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
              <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                The reviewer recorded against a decision is the signed-in user — it cannot be entered by hand.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Upload metadata ───────────────────────────────────────────────── */}
      <FormDialog
        open={!!pendingFile}
        onOpenChange={(o) => { if (!o) { setPendingFile(null); setForm(BLANK_UPLOAD) } }}
        title="Upload compliance document"
        description={pendingFile ? `${pendingFile.name} · ${fmtSize(pendingFile.size)}` : undefined}
        submitLabel="Upload"
        busy={upload.isPending}
        disabled={!form.vendorId || vendorOptions.length === 0}
        onSubmit={submitUpload}
      >
        {vendorOptions.length === 0 && (
          <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>
            No vendors are registered. A document must belong to a vendor record.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor" required hint="Stored as the vendor's id.">
            <Select value={form.vendorId} onValueChange={(v) => set('vendorId', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a vendor" /></SelectTrigger>
              <SelectContent>
                {vendorOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name || 'Unnamed vendor'}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Document type">
            <Select value={form.docType} onValueChange={(v) => set('docType', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Confidentiality">
            <Select value={form.confidentiality} onValueChange={(v) => set('confidentiality', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['public', 'internal', 'confidential', 'restricted'].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valid from">
            <Input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
          </Field>
          <Field label="Expires" hint="Drives the expiry KPI and the renewal reminder.">
            <Input type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
          </Field>
          <Field label="Renewal lead (days)">
            <Input inputMode="numeric" value={form.renewalLeadDays} onChange={(e) => set('renewalLeadDays', e.target.value)} />
          </Field>
        </div>
      </FormDialog>

      {/* ── Reject ────────────────────────────────────────────────────────── */}
      <FormDialog
        open={!!rejectTarget}
        onOpenChange={(o) => { if (!o) setRejectTarget(null) }}
        title="Reject this document"
        description="Rejection is recorded against your signed-in identity and written to the audit log."
        submitLabel="Reject document"
        busy={review.isPending}
        disabled={!rejectNotes.trim()}
        onSubmit={() => {
          if (!rejectTarget) return
          review.mutate({ id: rejectTarget.id, decision: 'rejected', notes: rejectNotes }, {
            onSuccess: () => { setRejectTarget(null); setRejectNotes('') },
          })
        }}
      >
        <Field label="Reason" required hint="The vendor needs to know what to fix.">
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="h-24 w-full resize-none p-2 text-xs"
            style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
          />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Delete this document?"
        description="The record and the stored file are removed. If the document is cited as evidence on an assessment, that link is broken. This cannot be undone."
        confirmLabel="Delete document"
        type="danger"
        onConfirm={async () => {
          if (!deleteTarget) return false
          await remove.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
