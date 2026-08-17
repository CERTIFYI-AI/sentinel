// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// AIBOM Registry — AI Bill of Materials on the real org-scoped tables
// `aibom_records` / `aibom_components` / `aibom_vulnerabilities`.
//
// What this rebuild deliberately does NOT do any more:
//   * it does not invent a SHA-256 from Math.random() and feed it to an
//     "integrity PASS" — the digest is producer-declared, stored in
//     `declared_digest`, and rendered as self-declared and unverified;
//   * it does not count a dropdown value as "Known CVEs" beside the claim
//     "Scanner: Sentinel CVE Scanner + OSV.dev" — CVEs are rows written by a
//     scanner, and a record that has never been scanned renders an em-dash
//     with an honest "no scan has been run" state, not 0;
//   * it does not sign anything as 'James Liu';
//   * it does not fake a spinner, a success toast or a hardcoded PASS check;
//   * it does not emit a CycloneDX-shaped document for an SPDX record.
//
// Interlinks: every record carries model_id (uuid) and vendor_id (uuid),
// resolved to names at render; ?model=<uuid> filters with a dismissible chip
// and ?open=<id> opens a record. Outbound links reach the model registry,
// vendor register, provenance graph and attestation register.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Package, Plus, Export, DownloadSimple, ArrowSquareOut, X, ShieldWarning, Trash,
} from '@phosphor-icons/react'
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
import { useAibomRecords, useAibomComponents, useAibomVulnerabilities } from '@/hooks/useAibomData'
import { useSupplyChainEntities } from '@/hooks/useSupplyChainEntities'
import { buildAibomExport, type AibomRecord } from '@/services/aibomService'

const FORMATS = ['CycloneDX', 'SPDX']
const COMPONENT_TYPES = ['library', 'model', 'dataset', 'framework', 'service']
const LICENSE_RISKS = ['permissive', 'weak_copyleft', 'strong_copyleft', 'commercial', 'unknown']
const STATUSES = ['draft', 'published', 'superseded']

const STATUS_TONE: Record<string, { background: string; color: string }> = {
  draft: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  published: { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  superseded: { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))' },
}

/** null renders an em-dash — never 0, never an invented figure. */
const num = (v: number | null | undefined) => (typeof v === 'number' ? v.toLocaleString() : '—')
const text = (v: string | null | undefined) => (v && v.trim() ? v : '—')
const date = (v: string | null | undefined) => (v ? v.slice(0, 10) : '—')

function Pill({ label, tone }: { label: string; tone: { background: string; color: string } }) {
  return <span className="px-2 py-0.5 text-[11px] font-medium" style={tone}>{label}</span>
}

/**
 * The integrity panel. It reports two separate facts and never conflates them:
 * what the producer declared, and what a verifier has confirmed (nothing, so
 * far). There is no PASS/FAIL verdict here because no verification is performed.
 */
function IntegrityPanel({ record }: { record: AibomRecord }) {
  const verified = record.verificationStatus === 'verified'
  const failed = record.verificationStatus === 'failed'
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">
          Producer-declared digest
        </p>
        <div className="border border-[hsl(var(--border))] bg-raised p-3">
          <p className="break-all font-mono text-[11px] text-[hsl(var(--text-1))]">
            {record.declaredDigest ? `${record.digestAlg}:${record.declaredDigest}` : '—'}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-[hsl(var(--text-3))]">
            Self-declared by the producer of this bill of materials. Sentinel has
            not recomputed or checked it, so it is not evidence of integrity.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">
          Verification
        </p>
        <div
          className="border p-3"
          style={{
            background: verified ? 'hsl(var(--s-ok-bg))' : failed ? 'hsl(var(--s-er-bg))' : 'hsl(var(--bg-raised))',
            borderColor: 'hsl(var(--border))',
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{
              color: verified ? 'hsl(var(--s-ok-tx))' : failed ? 'hsl(var(--destructive))' : 'hsl(var(--text-2))',
            }}
          >
            {verified ? 'Verified' : failed ? 'Verification failed' : 'Unverified'}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[hsl(var(--text-3))]">
            {verified || failed
              ? `Method: ${text(record.verificationMethod)} · Checked ${date(record.verifiedAt)}`
              : 'No verifier has checked this record. DSSE / Sigstore verification is not implemented yet, so nothing here may be described as signed or cryptographically verified.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Signature', value: record.signature ? 'Present' : '—' },
          { label: 'Signer identity', value: text(record.signerIdentity) },
          { label: 'Rekor log index', value: text(record.rekorLogIndex) },
          { label: 'Signed at', value: date(record.signedAt) },
        ].map(f => (
          <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-3">
            <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-[hsl(var(--text-1))]">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const BLANK_FORM = {
  aibomRef: '',
  modelId: '',
  modelVersion: '',
  vendorId: '',
  format: 'CycloneDX',
  specVersion: '1.5',
  declaredDigest: '',
  weightsUri: '',
  countryOfOrigin: '',
  status: 'draft',
  notes: '',
}

const BLANK_COMPONENT = {
  name: '', version: '', componentType: 'library', purl: '', licenseSpdx: '',
  licenseRisk: 'unknown', supplier: '', isDirect: true,
}

export default function AibomRegistry() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  // Deep link from a vendor record: /aibom?vendor=<vendors.id>.
  const vendorParam = searchParams.get('vendor')
  const openParam = searchParams.get('open')

  const { records, isLoading, error, refetch, create, update, remove } = useAibomRecords()
  const { components, create: createComponent, remove: removeComponent } = useAibomComponents()
  const { vulnerabilities } = useAibomVulnerabilities()
  const entities = useSupplyChainEntities()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AibomRecord | null>(null)
  const [form, setForm] = useState({ ...BLANK_FORM })
  const [componentOpen, setComponentOpen] = useState(false)
  const [componentForm, setComponentForm] = useState({ ...BLANK_COMPONENT })
  const [toDelete, setToDelete] = useState<AibomRecord | null>(null)
  const [componentToDelete, setComponentToDelete] = useState<{ id: string; name: string } | null>(null)

  const selected = records.find(r => r.id === selectedId) ?? null

  // Deep link ?open=<id> — applied once, so a refetch does not reopen a
  // drawer the user has closed.
  const appliedOpen = useRef<string | null>(null)
  useEffect(() => {
    if (openParam && appliedOpen.current !== openParam && records.some(r => r.id === openParam)) {
      appliedOpen.current = openParam
      setSelectedId(openParam)
    }
  }, [openParam, records])

  const filtered = useMemo(
    () => records.filter(r =>
      (!modelParam || r.modelId === modelParam)
      && (!vendorParam || r.vendorId === vendorParam)),
    [records, modelParam, vendorParam],
  )

  const componentsFor = (id: string) => components.filter(c => c.aibomId === id)
  const vulnsFor = (id: string) => vulnerabilities.filter(v => v.aibomId === id)
  /** null == never scanned. A never-scanned record must not report 0 CVEs. */
  const openCves = (r: AibomRecord) => (r.lastScannedAt ? vulnsFor(r.id).filter(v => v.status === 'open').length : null)

  const scanned = filtered.filter(r => !!r.lastScannedAt)
  const totalOpenCves = scanned.length
    ? scanned.reduce((s, r) => s + (openCves(r) ?? 0), 0)
    : null

  const rows = useMemo(() => filtered.map(r => ({
    ...r,
    name: r.aibomRef ?? r.id,
    modelName: entities.resolve('model', r.modelId) ?? '—',
  })), [filtered, entities])

  type Row = (typeof rows)[number]

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  function clearVendorFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('vendor')
    setSearchParams(next, { replace: true })
  }

  function openCreate() {
    setEditing(null)
    setForm({
      ...BLANK_FORM,
      // The primary key is a DB uuid, so this human label can never collide the
      // way `AIBOM-${records.length + 1}` did; it is only a display reference.
      aibomRef: `AIBOM-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      modelId: modelParam ?? '',
    })
    setFormOpen(true)
  }

  function openEdit(r: AibomRecord) {
    setEditing(r)
    setForm({
      aibomRef: r.aibomRef ?? '',
      modelId: r.modelId ?? '',
      modelVersion: r.modelVersion ?? '',
      vendorId: r.vendorId ?? '',
      format: r.format,
      specVersion: r.specVersion ?? '',
      declaredDigest: r.declaredDigest ?? '',
      weightsUri: r.weightsUri ?? '',
      countryOfOrigin: r.countryOfOrigin ?? '',
      status: r.status,
      notes: r.notes ?? '',
    })
    setFormOpen(true)
  }

  // The dialog closes only after the write resolves; a failure keeps it open
  // with a real error toast.
  async function submitForm() {
    if (!form.modelId) { toast.error('Select the model this AIBOM describes'); return }
    const patch: Partial<AibomRecord> = {
      aibomRef: form.aibomRef.trim() || null,
      modelId: form.modelId,
      modelVersion: form.modelVersion.trim() || null,
      vendorId: form.vendorId || null,
      format: form.format,
      specVersion: form.specVersion.trim() || null,
      declaredDigest: form.declaredDigest.trim() || null,
      weightsUri: form.weightsUri.trim() || null,
      countryOfOrigin: form.countryOfOrigin.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch })
        toast.success(`${patch.aibomRef ?? 'AIBOM'} updated`)
      } else {
        const saved = await create.mutateAsync(patch)
        toast.success(`${saved.aibomRef ?? 'AIBOM'} created`)
      }
      setFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save the AIBOM record')
    }
  }

  async function submitComponent() {
    if (!selected) return
    if (!componentForm.name.trim()) { toast.error('A component name is required'); return }
    try {
      await createComponent.mutateAsync({
        aibomId: selected.id,
        name: componentForm.name.trim(),
        version: componentForm.version.trim() || null,
        componentType: componentForm.componentType,
        purl: componentForm.purl.trim() || null,
        licenseSpdx: componentForm.licenseSpdx.trim() || null,
        licenseRisk: componentForm.licenseRisk,
        supplier: componentForm.supplier.trim() || null,
        isDirect: componentForm.isDirect,
      })
      toast.success(`Component ${componentForm.name.trim()} added`)
      setComponentForm({ ...BLANK_COMPONENT })
      setComponentOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add the component')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      if (selectedId === toDelete.id) setSelectedId(null)
      toast.success(`${toDelete.aibomRef ?? 'AIBOM record'} deleted`)
      setToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete the AIBOM record')
      // Rethrown so ConfirmDialog keeps itself open — a failed delete must
      // never look like it succeeded.
      throw e
    }
  }

  async function confirmDeleteComponent() {
    if (!componentToDelete) return
    try {
      await removeComponent.mutateAsync(componentToDelete.id)
      toast.success(`${componentToDelete.name} removed`)
      setComponentToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove the component')
      throw e
    }
  }

  /** Emits a document that actually matches the record's declared format. */
  function downloadBom(r: AibomRecord) {
    const payload = buildAibomExport(r, componentsFor(r.id), vulnsFor(r.id), entities.resolve('model', r.modelId))
    // Written directly (not via exportJson) because a BOM is a single document,
    // not a row array.
    const blob = new Blob([JSON.stringify(payload.content, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = payload.filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(payload.schemaValid ? `Exported ${payload.filename}` : payload.note)
  }

  function exportRegistry() {
    if (!filtered.length) { toast.info('No AIBOM records to export'); return }
    exportCsv(filtered.map(r => ({
      aibom_ref: r.aibomRef ?? '',
      model: entities.resolve('model', r.modelId) ?? '',
      model_id: r.modelId ?? '',
      model_version: r.modelVersion ?? '',
      format: r.format,
      spec_version: r.specVersion ?? '',
      status: r.status,
      components: componentsFor(r.id).length,
      // Blank, not 0, when no scan has ever run.
      open_cves: openCves(r) ?? '',
      last_scanned_at: r.lastScannedAt ?? '',
      scanner: r.scannerName ?? '',
      declared_digest: r.declaredDigest ?? '',
      digest_provenance: r.declaredDigest ? 'self-declared, unverified' : '',
      verification_status: r.verificationStatus,
    })), 'aibom-registry.csv')
  }

  const columns: Column<Row>[] = [
    {
      key: 'aibomRef', header: 'AIBOM', sortable: true,
      render: r => <span className="font-mono text-xs text-[hsl(var(--brand))]">{text(r.aibomRef)}</span>,
    },
    {
      key: 'modelName', header: 'Model', sortable: true,
      render: r => {
        const route = entities.routeFor('model', r.modelId)
        const name = entities.resolve('model', r.modelId)
        if (!name) return <span className="text-xs text-[hsl(var(--text-4))]">—</span>
        if (!route) return <span className="text-xs text-[hsl(var(--text-4))]">{name}</span>
        return (
          <button
            onClick={e => { e.stopPropagation(); nav(route) }}
            className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
          >
            {name} <ArrowSquareOut size={12} />
          </button>
        )
      },
    },
    { key: 'modelVersion', header: 'Version', render: r => <span className="text-xs text-[hsl(var(--text-3))]">{text(r.modelVersion)}</span> },
    { key: 'format', header: 'Format', sortable: true, render: r => <span className="text-xs text-[hsl(var(--text-3))]">{r.format}{r.specVersion ? ` ${r.specVersion}` : ''}</span> },
    { key: 'components', header: 'Components', render: r => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{componentsFor(r.id).length}</span> },
    {
      key: 'openCves', header: 'Open CVEs',
      render: r => {
        const c = openCves(r)
        if (c === null) {
          return <span className="text-xs text-[hsl(var(--text-4))]" title="No scan has been run for this record">—</span>
        }
        return (
          <span className={`font-mono text-xs font-semibold ${c > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--s-ok-tx))]'}`}>{c}</span>
        )
      },
    },
    { key: 'lastScannedAt', header: 'Last scanned', sortable: true, render: r => <span className="text-xs text-[hsl(var(--text-4))]">{date(r.lastScannedAt)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: r => <Pill label={r.status} tone={STATUS_TONE[r.status] ?? STATUS_TONE.superseded} /> },
    {
      key: 'verificationStatus', header: 'Integrity',
      render: r => (
        <span
          className="text-[11px] font-medium"
          style={{ color: r.verificationStatus === 'verified' ? 'hsl(var(--s-ok-tx))' : r.verificationStatus === 'failed' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}
          title={r.verificationStatus === 'unverified' ? 'No verifier has checked this record' : undefined}
        >
          {r.verificationStatus === 'unverified' ? 'Unverified' : r.verificationStatus === 'verified' ? 'Verified' : 'Failed'}
        </span>
      ),
    },
  ]

  const selectedComponents = selected ? componentsFor(selected.id) : []
  const selectedVulns = selected ? vulnsFor(selected.id) : []

  return (
    <div>
      <PageHeader
        title="AIBOM Registry"
        subtitle="AI Bill of Materials — components, licences and recorded vulnerabilities for every registered model"
        icon={Package}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportRegistry}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={openCreate}>New AIBOM</Button>
          </div>
        }
      />

      {(modelParam || vendorParam) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {modelParam && (
            <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
              <span>Filtered to <strong>{entities.resolve('model', modelParam) ?? 'Unavailable'}</strong></span>
              <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]">
                <X size={14} />
              </button>
            </span>
          )}
          {vendorParam && (
            <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
              <span>Vendor <strong>{entities.resolve('vendor', vendorParam) ?? 'Unavailable'}</strong></span>
              <button aria-label="Clear vendor filter" onClick={clearVendorFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      <StatCardRow
        className="mb-4"
        loading={isLoading}
        cards={[
          { label: 'AIBOM records', value: num(filtered.length) },
          { label: 'Published', value: num(filtered.filter(r => r.status === 'published').length), variant: 'success' },
          { label: 'Never scanned', value: num(filtered.filter(r => !r.lastScannedAt).length), variant: 'warning', description: 'Records with no recorded vulnerability scan' },
          { label: 'Open CVEs (scanned records)', value: num(totalOpenCves), variant: totalOpenCves ? 'danger' : 'default', description: 'Em-dash when no record has been scanned' },
        ]}
      />

      {isLoading ? <TableSkeleton cols={9} />
        : error ? <ErrorState message={error.message} onRetry={() => refetch()} />
        : rows.length === 0 ? (
          <EmptyState
            title={modelParam ? 'No AIBOM records for this model'
              : vendorParam ? 'No AIBOM records for this vendor'
              : 'No AIBOM records yet'}
            message={modelParam
              ? 'Clear the model filter to see every record, or generate a bill of materials for this model.'
              : vendorParam
                ? 'Clear the vendor filter to see every record, or register a bill of materials naming this vendor as the supplier.'
                : 'Register a bill of materials to inventory the base models, datasets, frameworks and dependencies behind a model.'}
            actionLabel="New AIBOM"
            onAction={openCreate}
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search by AIBOM reference…"
            onRowClick={r => setSelectedId(r.id)}
            onView={r => setSelectedId(r.id)}
            onEdit={r => openEdit(r)}
            onDelete={r => setToDelete(r)}
          />
        )}

      {/* ── Detail drawer ── */}
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? (selected.aibomRef ?? 'AIBOM record') : ''}
        subtitle={selected ? (
          <span className="flex items-center gap-2">
            <Pill label={selected.status} tone={STATUS_TONE[selected.status] ?? STATUS_TONE.superseded} />
            <span className="text-xs text-[hsl(var(--text-3))]">{selected.format}{selected.specVersion ? ` ${selected.specVersion}` : ''}</span>
          </span>
        ) : undefined}
        size="lg"
        actions={selected ? (
          <Button size="xs" variant="secondary" icon={<DownloadSimple />} onClick={() => downloadBom(selected)}>Export BOM</Button>
        ) : undefined}
        tabs={selected ? [
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Model', value: entities.resolve('model', selected.modelId) ?? '—', to: entities.routeFor('model', selected.modelId) },
                    { label: 'Model version', value: text(selected.modelVersion) },
                    { label: 'Vendor', value: entities.resolve('vendor', selected.vendorId) ?? '—', to: entities.routeFor('vendor', selected.vendorId) },
                    { label: 'Generated', value: date(selected.generatedAt) },
                    { label: 'Country of origin', value: text(selected.countryOfOrigin) },
                    { label: 'Export control class', value: text(selected.exportControlClass) },
                    { label: 'Weights URI', value: text(selected.weightsUri) },
                    { label: 'End of life', value: date(selected.eolAt) },
                  ].map(f => (
                    <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-3">
                      <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
                      {f.to ? (
                        <button onClick={() => nav(f.to!)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--brand))] hover:underline">
                          {f.value} <ArrowSquareOut size={11} />
                        </button>
                      ) : (
                        <p className="mt-0.5 truncate text-xs font-medium text-[hsl(var(--text-1))]">{f.value}</p>
                      )}
                    </div>
                  ))}
                </div>
                {selected.notes && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Notes</p>
                    <p className="border border-[hsl(var(--border))] bg-raised p-3 text-sm leading-relaxed text-[hsl(var(--text-2))]">{selected.notes}</p>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Related records</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.modelId && (
                      <>
                        <Button size="xs" variant="secondary" onClick={() => nav(`/provenance?model=${selected.modelId}`)}>Provenance graph</Button>
                        <Button size="xs" variant="secondary" onClick={() => nav(`/supply-chain?model=${selected.modelId}`)}>Attestations</Button>
                        <Button size="xs" variant="secondary" onClick={() => nav(`/supply-chain/graph?model=${selected.modelId}`)}>Supply chain graph</Button>
                      </>
                    )}
                    {selected.vendorId && entities.routeFor('vendor', selected.vendorId) && (
                      <Button size="xs" variant="secondary" onClick={() => nav(entities.routeFor('vendor', selected.vendorId)!)}>Vendor record</Button>
                    )}
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'components',
            label: `Components (${selectedComponents.length})`,
            content: (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button size="xs" icon={<Plus />} onClick={() => setComponentOpen(true)}>Add component</Button>
                </div>
                {selectedComponents.length === 0 ? (
                  <EmptyState
                    title="No components recorded"
                    message="Add the libraries, base models, datasets and services this model depends on. A package URL (purl) is what makes CVE matching possible."
                  />
                ) : selectedComponents.map(c => (
                  <div key={c.id} className="flex items-start gap-2 border border-[hsl(var(--border))] bg-raised p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[hsl(var(--text-1))]">
                        {c.name}{c.version ? ` ${c.version}` : ''}
                        {!c.isDirect && <span className="ml-2 text-[10px] text-[hsl(var(--text-4))]">transitive</span>}
                      </p>
                      <p className="truncate font-mono text-[10px] text-[hsl(var(--text-4))]">{text(c.purl)}</p>
                      <p className="mt-0.5 text-[10px] text-[hsl(var(--text-3))]">
                        {c.componentType ?? '—'} · Licence {text(c.licenseSpdx)} · Risk {text(c.licenseRisk)}
                        {c.datasetId && entities.routeFor('dataset', c.datasetId) && (
                          <button onClick={() => nav(entities.routeFor('dataset', c.datasetId)!)} className="ml-2 text-[hsl(var(--brand))] hover:underline">
                            {entities.resolve('dataset', c.datasetId)}
                          </button>
                        )}
                      </p>
                    </div>
                    <button
                      aria-label={`Remove ${c.name}`}
                      onClick={() => setComponentToDelete({ id: c.id, name: c.name })}
                      className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ),
          },
          {
            id: 'vulnerabilities',
            label: 'Vulnerabilities',
            content: (
              <div className="space-y-3">
                {!selected.lastScannedAt ? (
                  <EmptyState
                    title="No scan has been run"
                    message="Vulnerability rows are written by a scanner against the recorded package URLs. Until a scan runs, this record's CVE count is unknown — it is not zero."
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2 border border-[hsl(var(--border))] bg-raised p-3">
                      <ShieldWarning size={14} className="text-[hsl(var(--text-3))]" />
                      <p className="text-[11px] text-[hsl(var(--text-3))]">
                        Last scanned {date(selected.lastScannedAt)}{selected.scannerName ? ` by ${selected.scannerName}` : ' (scanner not recorded)'}
                      </p>
                    </div>
                    {selectedVulns.length === 0 ? (
                      <EmptyState title="No vulnerabilities recorded" message="The last scan wrote no findings for this bill of materials." />
                    ) : selectedVulns.map(v => (
                      <div key={v.id} className="border border-[hsl(var(--border))] bg-raised p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[hsl(var(--text-1))]">{v.cveId}</span>
                          {v.severity && <Pill label={v.severity} tone={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }} />}
                          <span className="ml-auto font-mono text-[11px] text-[hsl(var(--text-3))]">CVSS {v.cvssScore ?? '—'}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-[hsl(var(--text-3))]">
                          Component {selectedComponents.find(c => c.id === v.componentId)?.name ?? '—'} ·
                          Affected {text(v.affectedVersionRange)} · Fixed in {text(v.fixedVersion)} ·
                          Source {text(v.source)} · Status {v.status}
                          {v.exploitKnown && <span className="ml-1 text-[hsl(var(--destructive))]">· known exploit</span>}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ),
          },
          { id: 'integrity', label: 'Integrity', content: <IntegrityPanel record={selected} /> },
        ] : []}
      />

      {/* ── Create / edit ── */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit AIBOM record' : 'New AIBOM record'}
        description="A bill of materials is keyed to a registered model. The digest recorded here is producer-declared and is not verified by Sentinel."
        submitLabel={editing ? 'Save changes' : 'Create record'}
        busy={create.isPending || update.isPending}
        onSubmit={submitForm}
      >
        <Field label="AIBOM reference">
          <input value={form.aibomRef} onChange={e => setForm(p => ({ ...p, aibomRef: e.target.value }))}
            className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model" required hint="Stored as ai_models.id — the display name is resolved at render">
            <Select value={form.modelId} onValueChange={v => setForm(p => ({ ...p, modelId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select a model" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {entities.models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Model version">
            <input value={form.modelVersion} onChange={e => setForm(p => ({ ...p, modelVersion: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Format">
            <Select value={form.format} onValueChange={v => setForm(p => ({ ...p, format: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Spec version">
            <input value={form.specVersion} onChange={e => setForm(p => ({ ...p, specVersion: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor">
            <Select value={form.vendorId} onValueChange={v => setForm(p => ({ ...p, vendorId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {entities.vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Producer-declared digest" hint="Whatever the producer asserted. Sentinel does not recompute or verify it, and it is rendered as self-declared.">
          <input value={form.declaredDigest} onChange={e => setForm(p => ({ ...p, declaredDigest: e.target.value }))}
            placeholder="e.g. 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
            className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 font-mono text-xs text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model weights URI">
            <input value={form.weightsUri} onChange={e => setForm(p => ({ ...p, weightsUri: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Country of origin">
            <input value={form.countryOfOrigin} onChange={e => setForm(p => ({ ...p, countryOfOrigin: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
            className="w-full resize-none border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
      </FormDialog>

      {/* ── Add component ── */}
      <FormDialog
        open={componentOpen}
        onOpenChange={setComponentOpen}
        title="Add component"
        description="Components are the inventory a CVE scan matches against — a package URL (purl) is what makes that matching possible."
        submitLabel="Add component"
        busy={createComponent.isPending}
        onSubmit={submitComponent}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required>
            <input value={componentForm.name} onChange={e => setComponentForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Version">
            <input value={componentForm.version} onChange={e => setComponentForm(p => ({ ...p, version: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={componentForm.componentType} onValueChange={v => setComponentForm(p => ({ ...p, componentType: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {COMPONENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Licence risk">
            <Select value={componentForm.licenseRisk} onValueChange={v => setComponentForm(p => ({ ...p, licenseRisk: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {LICENSE_RISKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Package URL (purl)" hint="e.g. pkg:pypi/torch@2.2.0">
          <input value={componentForm.purl} onChange={e => setComponentForm(p => ({ ...p, purl: e.target.value }))}
            className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 font-mono text-xs text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SPDX licence id" hint="e.g. Apache-2.0, MIT, BSD-3-Clause">
            <input value={componentForm.licenseSpdx} onChange={e => setComponentForm(p => ({ ...p, licenseSpdx: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Supplier">
            <input value={componentForm.supplier} onChange={e => setComponentForm(p => ({ ...p, supplier: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[hsl(var(--text-2))]">
          <input type="checkbox" checked={componentForm.isDirect} onChange={e => setComponentForm(p => ({ ...p, isDirect: e.target.checked }))} />
          Direct dependency
        </label>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete AIBOM record?"
        description={`Permanently delete ${toDelete?.aibomRef ?? 'this record'} and its components and vulnerability rows. This cannot be undone.`}
        isDestructive
        confirmLabel="Delete record"
      />

      <ConfirmDialog
        open={!!componentToDelete}
        onOpenChange={o => !o && setComponentToDelete(null)}
        onConfirm={confirmDeleteComponent}
        title="Remove component?"
        description={`Remove ${componentToDelete?.name ?? 'this component'} from the bill of materials.`}
        isDestructive
        confirmLabel="Remove component"
      />
    </div>
  )
}
