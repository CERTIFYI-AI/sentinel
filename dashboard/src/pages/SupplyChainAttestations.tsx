// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Supply Chain Attestations — the evidence register behind bias audits, DPIAs,
// security reviews and AIBOM verification, moved off the cross-tenant
// `supplychainattestations_table` demo table onto the real org-scoped
// `supply_chain_attestations` (read through the
// `supply_chain_attestation_status` view for DB-derived validity).
//
// What this rebuild deliberately does NOT do any more:
//   * it does not claim "Cryptographically signed" for unsigned data, and it
//     does not render a "Signature Valid: PASS" verdict computed from
//     `sigHash !== 'PENDING'` on a free-text field. A producer-declared digest
//     is shown as exactly that, and verification status is reported as stored;
//   * it does not derive "Within Validity Period" from `status === 'Valid'` —
//     validity is `derived_validity`, computed in the database from
//     valid_until / revoked_at against today;
//   * it does not ship fabricated findings ('Equalized odds: 91.2%',
//     'verified via Sigstore') as seed data written into a shared table;
//   * its Renew button creates a real successor record and links the
//     predecessor to it, instead of firing a toast and closing a drawer;
//   * evidence is `evidence_ids uuid[]` pointing at Evidence Vault rows, not
//     unlinked filename strings;
//   * the subject is `subject_type` + `subject_id` on the one id-space,
//     resolved to a name at render.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Certificate, Plus, Export, X, ArrowClockwise, ArrowSquareOut, FileText, Prohibit,
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
import { useAttestations, useEvidenceOptions, useControlOptions } from '@/hooks/useAttestationsData'
import { useSupplyChainEntities, type EntityKind } from '@/hooks/useSupplyChainEntities'
import {
  VALIDITY_LABEL, VALIDITY_TONE,
  type Attestation, type DerivedValidity,
} from '@/services/attestationService'

const ATTESTATION_TYPES = [
  'Data Provenance', 'Model Integrity', 'Security Review', 'Bias Audit',
  'Privacy Assessment', 'SBOM/AIBOM Verification',
]
const SUBJECT_TYPES: { value: string; label: string; entity: EntityKind | null }[] = [
  { value: 'model', label: 'Model', entity: 'model' },
  { value: 'dataset', label: 'Dataset', entity: 'dataset' },
  { value: 'vendor', label: 'Vendor', entity: 'vendor' },
  { value: 'pipeline', label: 'Pipeline', entity: null },
]
const WORKFLOW_STATUSES = ['draft', 'pending', 'accepted', 'rejected']
const VALIDITIES: DerivedValidity[] = ['valid', 'expiring_soon', 'expired', 'revoked', 'unknown']

const text = (v: string | null | undefined) => (v && v.trim() ? v : '—')
const date = (v: string | null | undefined) => (v ? v.slice(0, 10) : '—')

const SUBJECT_COLOR: Record<string, string> = {
  model: 'hsl(var(--brand))',
  dataset: 'hsl(var(--s-ok-tx))',
  vendor: 'hsl(var(--tag-purple))',
  pipeline: 'hsl(var(--s-in-tx))',
}

function ValidityPill({ validity }: { validity: DerivedValidity }) {
  const tone = VALIDITY_TONE[validity]
  return (
    <span
      className="px-2 py-0.5 text-[11px] font-medium"
      style={{ background: tone.bg, color: tone.color }}
      title="Computed in the database from valid_until and revoked_at against today"
    >
      {VALIDITY_LABEL[validity]}
    </span>
  )
}

const BLANK = {
  attestationRef: '',
  attestationType: 'Bias Audit',
  status: 'draft',
  subjectType: 'model',
  subjectId: '',
  scope: '',
  findings: '',
  attestedBy: '',
  attestorOrg: '',
  attestorIsIndependent: false,
  attestorAccreditation: '',
  issuedAt: '',
  validUntil: '',
  declaredDigest: '',
  reviewNotes: '',
  evidenceIds: [] as string[],
  frameworkControlIds: [] as string[],
}

export default function SupplyChainAttestations() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const { attestations, isLoading, error, refetch, create, update, remove, revoke, renew } = useAttestations()
  const entities = useSupplyChainEntities()
  const evidence = useEvidenceOptions()
  const controls = useControlOptions()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [validityFilter, setValidityFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Attestation | null>(null)
  const [form, setForm] = useState({ ...BLANK })
  const [toDelete, setToDelete] = useState<Attestation | null>(null)
  const [renewTarget, setRenewTarget] = useState<Attestation | null>(null)
  const [renewUntil, setRenewUntil] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<Attestation | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const selected = attestations.find(a => a.id === selectedId) ?? null

  useEffect(() => {
    if (openParam && attestations.some(a => a.id === openParam)) setSelectedId(openParam)
  }, [openParam, attestations])

  /** Subject resolution — subject_type + subject_id on the one id-space. */
  const subjectEntityKind = (a: Attestation): EntityKind | null =>
    SUBJECT_TYPES.find(s => s.value === a.subjectType)?.entity ?? null

  const subjectName = useCallback((a: Attestation): string | null => {
    const kind = SUBJECT_TYPES.find(s => s.value === a.subjectType)?.entity ?? null
    // A 'pipeline' subject has no register to resolve against yet.
    if (!kind) return null
    return entities.resolve(kind, a.subjectId)
  }, [entities])

  const filtered = useMemo(() => attestations.filter(a => {
    if (modelParam && a.modelId !== modelParam && !(a.subjectType === 'model' && a.subjectId === modelParam)) return false
    if (validityFilter !== 'All' && a.derivedValidity !== validityFilter) return false
    if (typeFilter !== 'All' && a.attestationType !== typeFilter) return false
    return true
  }), [attestations, modelParam, validityFilter, typeFilter])

  const rows = useMemo(() => filtered.map(a => ({
    ...a,
    name: a.attestationRef ?? a.attestationType ?? a.id,
    subjectLabel: subjectName(a) ?? (a.subjectId ? 'Unavailable' : '—'),
  })), [filtered, subjectName])

  type Row = (typeof rows)[number]

  const counts = {
    total: filtered.length,
    valid: filtered.filter(a => a.derivedValidity === 'valid').length,
    expiring: filtered.filter(a => a.derivedValidity === 'expiring_soon').length,
    lapsed: filtered.filter(a => a.derivedValidity === 'expired' || a.derivedValidity === 'revoked').length,
  }

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  function openCreate() {
    setEditing(null)
    setForm({
      ...BLANK,
      attestationRef: `ATT-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      subjectType: modelParam ? 'model' : 'model',
      subjectId: modelParam ?? '',
    })
    setFormOpen(true)
  }

  function openEdit(a: Attestation) {
    setEditing(a)
    setForm({
      attestationRef: a.attestationRef ?? '',
      attestationType: a.attestationType ?? 'Bias Audit',
      status: a.status,
      subjectType: a.subjectType ?? 'model',
      subjectId: a.subjectId ?? '',
      scope: a.scope ?? '',
      findings: a.findings ?? '',
      attestedBy: a.attestedBy ?? '',
      attestorOrg: a.attestorOrg ?? '',
      attestorIsIndependent: a.attestorIsIndependent ?? false,
      attestorAccreditation: a.attestorAccreditation ?? '',
      issuedAt: a.issuedAt ?? '',
      validUntil: a.validUntil ?? '',
      declaredDigest: a.declaredDigest ?? '',
      reviewNotes: a.reviewNotes ?? '',
      evidenceIds: [...a.evidenceIds],
      frameworkControlIds: [...a.frameworkControlIds],
    })
    setFormOpen(true)
  }

  async function submitForm() {
    if (!form.subjectId) { toast.error('Select the record this attestation describes'); return }
    const kind = SUBJECT_TYPES.find(s => s.value === form.subjectType)?.entity ?? null
    const patch: Partial<Attestation> = {
      attestationRef: form.attestationRef.trim() || null,
      attestationType: form.attestationType,
      status: form.status,
      subjectType: form.subjectType,
      subjectId: form.subjectId,
      // Denormalised links so a model or vendor can find its attestations.
      modelId: kind === 'model' ? form.subjectId : null,
      vendorId: kind === 'vendor' ? form.subjectId : null,
      scope: form.scope.trim() || null,
      findings: form.findings.trim() || null,
      attestedBy: form.attestedBy.trim() || null,
      attestorOrg: form.attestorOrg.trim() || null,
      attestorIsIndependent: form.attestorIsIndependent,
      attestorAccreditation: form.attestorAccreditation.trim() || null,
      issuedAt: form.issuedAt || null,
      validUntil: form.validUntil || null,
      declaredDigest: form.declaredDigest.trim() || null,
      reviewNotes: form.reviewNotes.trim() || null,
      evidenceIds: form.evidenceIds,
      frameworkControlIds: form.frameworkControlIds,
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch, previous: editing })
        toast.success(`${patch.attestationRef ?? 'Attestation'} updated`)
      } else {
        const saved = await create.mutateAsync(patch)
        toast.success(`${saved.attestationRef ?? 'Attestation'} created`)
      }
      setFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save the attestation')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      if (selectedId === toDelete.id) setSelectedId(null)
      toast.success(`${toDelete.attestationRef ?? 'Attestation'} deleted`)
      setToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete the attestation')
      // Rethrown so ConfirmDialog stays open on failure.
      throw e
    }
  }

  async function submitRenewal() {
    if (!renewTarget) return
    if (!renewUntil) { toast.error('Set the new expiry date'); return }
    try {
      const successor = await renew.mutateAsync({ previous: renewTarget, validUntil: renewUntil })
      toast.success(`Renewal ${successor.attestationRef ?? successor.id.slice(0, 8)} created — pending assessment`)
      setRenewTarget(null)
      setRenewUntil('')
      setSelectedId(successor.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create the renewal')
    }
  }

  async function submitRevocation() {
    if (!revokeTarget) return
    if (!revokeReason.trim()) { toast.error('A revocation reason is required'); return }
    try {
      await revoke.mutateAsync({ attestation: revokeTarget, reason: revokeReason })
      toast.success(`${revokeTarget.attestationRef ?? 'Attestation'} revoked`)
      setRevokeTarget(null)
      setRevokeReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke the attestation')
    }
  }

  function handleExport() {
    if (!filtered.length) { toast.info('No attestations to export'); return }
    exportCsv(filtered.map(a => ({
      attestation_ref: a.attestationRef ?? '',
      type: a.attestationType ?? '',
      subject_type: a.subjectType ?? '',
      subject_id: a.subjectId ?? '',
      subject: subjectName(a) ?? '',
      workflow_status: a.status,
      derived_validity: a.derivedValidity,
      issued_at: a.issuedAt ?? '',
      valid_until: a.validUntil ?? '',
      revoked_at: a.revokedAt ?? '',
      attested_by: a.attestedBy ?? '',
      attestor_org: a.attestorOrg ?? '',
      attestor_independent: a.attestorIsIndependent === null ? '' : String(a.attestorIsIndependent),
      evidence_records: a.evidenceIds.length,
      declared_digest: a.declaredDigest ?? '',
      digest_provenance: a.declaredDigest ? 'self-declared, unverified' : '',
      verification_status: a.verificationStatus,
    })), 'supply-chain-attestations.csv')
  }

  const columns: Column<Row>[] = [
    { key: 'attestationRef', header: 'Reference', sortable: true, render: a => <span className="font-mono text-xs text-[hsl(var(--brand))]">{text(a.attestationRef)}</span> },
    {
      key: 'subjectLabel', header: 'Subject', sortable: true,
      render: a => {
        const kind = subjectEntityKind(a)
        const route = kind ? entities.routeFor(kind, a.subjectId) : null
        const name = subjectName(a)
        return (
          <div>
            {route && name ? (
              <button onClick={e => { e.stopPropagation(); nav(route) }}
                className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]">
                {name} <ArrowSquareOut size={11} />
              </button>
            ) : (
              <span className="text-xs text-[hsl(var(--text-4))]">{a.subjectId ? (name ?? 'Unavailable') : '—'}</span>
            )}
            <p className="mt-0.5 text-[10px] font-medium" style={{ color: SUBJECT_COLOR[a.subjectType ?? ''] ?? 'hsl(var(--text-4))' }}>
              {text(a.subjectType)}
            </p>
          </div>
        )
      },
    },
    { key: 'attestationType', header: 'Type', sortable: true, render: a => <span className="text-xs text-[hsl(var(--text-3))]">{text(a.attestationType)}</span> },
    {
      key: 'attestedBy', header: 'Attestor',
      render: a => (
        <div>
          <p className="text-xs text-[hsl(var(--text-2))]">{text(a.attestedBy)}</p>
          <p className="text-[10px] text-[hsl(var(--text-4))]">
            {a.attestorOrg ?? '—'}{a.attestorIsIndependent === true ? ' · independent' : a.attestorIsIndependent === false ? ' · internal' : ''}
          </p>
        </div>
      ),
    },
    { key: 'issuedAt', header: 'Issued', sortable: true, render: a => <span className="text-xs text-[hsl(var(--text-4))]">{date(a.issuedAt)}</span> },
    { key: 'validUntil', header: 'Valid until', sortable: true, render: a => <span className="text-xs text-[hsl(var(--text-4))]">{date(a.validUntil)}</span> },
    { key: 'derivedValidity', header: 'Validity', sortable: true, render: a => <ValidityPill validity={a.derivedValidity} /> },
    { key: 'status', header: 'Workflow', sortable: true, render: a => <span className="text-xs text-[hsl(var(--text-3))]">{a.status}</span> },
    { key: 'evidenceIds', header: 'Evidence', render: a => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{a.evidenceIds.length}</span> },
  ]

  const subjectOptions = (() => {
    const kind = SUBJECT_TYPES.find(s => s.value === form.subjectType)?.entity
    if (kind === 'model') return entities.models
    if (kind === 'dataset') return entities.datasets
    if (kind === 'vendor') return entities.vendors
    return []
  })()

  return (
    <div>
      <PageHeader
        title="Supply Chain Attestations"
        subtitle="Third-party and internal attestations covering models, datasets, vendors and pipelines — validity is computed from the recorded expiry, not from a status label"
        icon={Certificate}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={handleExport}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={openCreate}>New attestation</Button>
          </div>
        }
      />

      {modelParam && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Filtered to <strong>{entities.resolve('model', modelParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <StatCardRow
        className="mb-4"
        loading={isLoading}
        cards={[
          { label: 'Attestations', value: counts.total },
          { label: 'Valid today', value: counts.valid, variant: 'success' },
          { label: 'Expiring within 30 days', value: counts.expiring, variant: 'warning' },
          { label: 'Expired or revoked', value: counts.lapsed, variant: counts.lapsed ? 'danger' : 'default' },
        ]}
      />

      <div className="mb-3 flex flex-wrap gap-3">
        <Select value={validityFilter} onValueChange={setValidityFilter}>
          <SelectTrigger className="w-[200px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="All">All validity states</SelectItem>
            {VALIDITIES.map(v => <SelectItem key={v} value={v}>{VALIDITY_LABEL[v]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[220px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="All">All types</SelectItem>
            {ATTESTATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TableSkeleton cols={9} />
        : error ? <ErrorState message={error.message} onRetry={() => refetch()} />
        : rows.length === 0 ? (
          <EmptyState
            title={modelParam ? 'No attestations for this model' : 'No attestations recorded'}
            message={modelParam
              ? 'Clear the model filter to see every attestation, or record one for this model.'
              : 'Record the bias audits, DPIAs, security reviews and AIBOM verifications that back your supply-chain claims, with links to the evidence behind them.'}
            actionLabel="New attestation"
            onAction={openCreate}
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search by reference…"
            onRowClick={a => setSelectedId(a.id)}
            onView={a => setSelectedId(a.id)}
            onEdit={a => openEdit(a)}
            onDelete={a => setToDelete(a)}
          />
        )}

      {/* ── Detail drawer ── */}
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? (selected.attestationRef ?? selected.attestationType ?? 'Attestation') : ''}
        subtitle={selected ? (
          <span className="flex items-center gap-2">
            <ValidityPill validity={selected.derivedValidity} />
            <span className="text-xs text-[hsl(var(--text-3))]">{text(selected.attestationType)}</span>
          </span>
        ) : undefined}
        size="lg"
        actions={selected ? (
          <div className="flex items-center gap-2">
            <Button size="xs" variant="secondary" icon={<ArrowClockwise />} onClick={() => { setRenewTarget(selected); setRenewUntil('') }}>Renew</Button>
            {!selected.revokedAt && (
              <Button size="xs" variant="danger" icon={<Prohibit />} onClick={() => { setRevokeTarget(selected); setRevokeReason('') }}>Revoke</Button>
            )}
          </div>
        ) : undefined}
        tabs={selected ? [
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Subject', value: subjectName(selected) ?? (selected.subjectId ? 'Unavailable' : '—'), to: subjectEntityKind(selected) ? entities.routeFor(subjectEntityKind(selected)!, selected.subjectId) : null },
                    { label: 'Subject type', value: text(selected.subjectType) },
                    { label: 'Attested by', value: text(selected.attestedBy) },
                    { label: 'Attestor organisation', value: text(selected.attestorOrg) },
                    { label: 'Independence', value: selected.attestorIsIndependent === null ? '—' : selected.attestorIsIndependent ? 'Independent' : 'Internal' },
                    { label: 'Accreditation', value: text(selected.attestorAccreditation) },
                    { label: 'Issued', value: date(selected.issuedAt) },
                    { label: 'Valid until', value: date(selected.validUntil) },
                    { label: 'Workflow status', value: selected.status },
                    { label: 'Revoked', value: selected.revokedAt ? `${date(selected.revokedAt)} — ${text(selected.revocationReason)}` : '—' },
                  ].map(f => (
                    <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-3">
                      <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
                      {f.to ? (
                        <button onClick={() => nav(f.to!)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--brand))] hover:underline">
                          {f.value} <ArrowSquareOut size={11} />
                        </button>
                      ) : (
                        <p className="mt-0.5 text-xs font-medium text-[hsl(var(--text-1))]">{f.value}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Scope</p>
                  <p className="border border-[hsl(var(--border))] bg-raised p-3 text-sm leading-relaxed text-[hsl(var(--text-2))]">
                    {selected.scope ?? 'No scope recorded.'}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Findings</p>
                  <p className="border border-[hsl(var(--border))] bg-raised p-3 text-sm leading-relaxed text-[hsl(var(--text-2))]">
                    {selected.findings ?? 'No findings recorded — this attestation has not reported a result yet.'}
                  </p>
                </div>
                {selected.reviewNotes && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Review notes</p>
                    <p className="border border-[hsl(var(--border))] bg-raised p-3 text-sm leading-relaxed text-[hsl(var(--text-2))]">{selected.reviewNotes}</p>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Related records</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.modelId && (
                      <>
                        <Button size="xs" variant="secondary" onClick={() => nav(`/aibom?model=${selected.modelId}`)}>AIBOM records</Button>
                        <Button size="xs" variant="secondary" onClick={() => nav(`/provenance?model=${selected.modelId}`)}>Provenance</Button>
                        <Button size="xs" variant="secondary" onClick={() => nav(`/supply-chain/graph?model=${selected.modelId}`)}>Supply chain graph</Button>
                      </>
                    )}
                    {selected.vendorId && entities.routeFor('vendor', selected.vendorId) && (
                      <Button size="xs" variant="secondary" onClick={() => nav(entities.routeFor('vendor', selected.vendorId)!)}>Vendor record</Button>
                    )}
                    {selected.supersededBy && (
                      <Button size="xs" variant="secondary" onClick={() => setSelectedId(selected.supersededBy!)}>Superseded by successor</Button>
                    )}
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'evidence',
            label: `Evidence (${selected.evidenceIds.length})`,
            content: (
              <div className="space-y-3">
                {selected.evidenceIds.length === 0 ? (
                  <EmptyState
                    title="No evidence linked"
                    message="Link the Evidence Vault records that support this attestation. An attestation with no evidence behind it is a claim, not a record."
                  />
                ) : selected.evidenceIds.map(id => {
                  const title = evidence.resolve(id)
                  return (
                    <button
                      key={id}
                      onClick={() => title && nav(`/evidence-vault?open=${id}`)}
                      disabled={!title}
                      className="flex w-full items-center gap-2 border border-[hsl(var(--border))] bg-raised p-2.5 text-left disabled:cursor-not-allowed"
                    >
                      <FileText size={14} className="flex-shrink-0 text-[hsl(var(--brand))]" />
                      <span className="flex-1 truncate text-xs text-[hsl(var(--text-2))]">
                        {title ?? (evidence.loading ? '…' : 'Unavailable')}
                      </span>
                      {title && <ArrowSquareOut size={12} className="text-[hsl(var(--text-4))]" />}
                    </button>
                  )
                })}

                <div>
                  <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">
                    Framework controls ({selected.frameworkControlIds.length})
                  </p>
                  {selected.frameworkControlIds.length === 0 ? (
                    <p className="text-xs text-[hsl(var(--text-4))]">No control cited.</p>
                  ) : selected.frameworkControlIds.map(id => {
                    const label = controls.resolve(id)
                    return (
                      <button
                        key={id}
                        onClick={() => label && nav(`/compliance/controls?open=${id}`)}
                        disabled={!label}
                        className="mb-2 flex w-full items-center gap-2 border border-[hsl(var(--border))] bg-raised p-2.5 text-left disabled:cursor-not-allowed"
                      >
                        <span className="flex-1 truncate text-xs text-[hsl(var(--text-2))]">
                          {label ?? (controls.loading ? '…' : 'Unavailable')}
                        </span>
                        {label && <ArrowSquareOut size={12} className="text-[hsl(var(--text-4))]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ),
          },
          {
            id: 'integrity',
            label: 'Integrity',
            content: (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Producer-declared digest</p>
                  <div className="border border-[hsl(var(--border))] bg-raised p-3">
                    <p className="break-all font-mono text-[11px] text-[hsl(var(--text-1))]">{text(selected.declaredDigest)}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-[hsl(var(--text-3))]">
                      Self-declared by whoever supplied this attestation. Sentinel has not recomputed or checked it, so it proves nothing on its own.
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Verification</p>
                  <div className="border border-[hsl(var(--border))] p-3"
                    style={{ background: selected.verificationStatus === 'verified' ? 'hsl(var(--s-ok-bg))' : selected.verificationStatus === 'failed' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--bg-raised))' }}>
                    <p className="text-sm font-semibold"
                      style={{ color: selected.verificationStatus === 'verified' ? 'hsl(var(--s-ok-tx))' : selected.verificationStatus === 'failed' ? 'hsl(var(--destructive))' : 'hsl(var(--text-2))' }}>
                      {selected.verificationStatus === 'verified' ? 'Verified' : selected.verificationStatus === 'failed' ? 'Verification failed' : 'Unverified'}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[hsl(var(--text-3))]">
                      {selected.verificationStatus === 'unverified'
                        ? 'No verifier has checked this attestation. DSSE / Sigstore verification is not implemented, so nothing here is signed or cryptographically verified.'
                        : `Method: ${text(selected.verificationMethod)} · Checked ${date(selected.verifiedAt)}`}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Signature', value: selected.signature ? 'Present' : '—' },
                    { label: 'Signer identity', value: text(selected.signerIdentity) },
                    { label: 'Rekor log index', value: text(selected.rekorLogIndex) },
                    { label: 'Derived validity', value: VALIDITY_LABEL[selected.derivedValidity] },
                  ].map(f => (
                    <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-3">
                      <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-[hsl(var(--text-1))]">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
        ] : []}
      />

      {/* ── Create / edit ── */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit attestation' : 'New attestation'}
        description="The subject is stored as a record id, so the attestation is reachable from the model, dataset or vendor it describes. Any digest recorded here is producer-declared and is not verified by Sentinel."
        submitLabel={editing ? 'Save changes' : 'Create attestation'}
        busy={create.isPending || update.isPending}
        onSubmit={submitForm}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reference">
            <input value={form.attestationRef} onChange={e => setForm(p => ({ ...p, attestationRef: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Type" required>
            <Select value={form.attestationType} onValueChange={v => setForm(p => ({ ...p, attestationType: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {ATTESTATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject type" required>
            <Select value={form.subjectType} onValueChange={v => setForm(p => ({ ...p, subjectType: v, subjectId: '' }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {SUBJECT_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subject" required hint="Stored as the record's uuid; the name is resolved at render">
            {subjectOptions.length ? (
              <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select a record" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {subjectOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="border border-dashed border-[hsl(var(--border))] p-2 text-[11px] text-[hsl(var(--text-4))]">
                Pipelines are not a registered entity yet — pick a model, dataset or vendor instead.
              </p>
            )}
          </Field>
        </div>

        <Field label="Scope">
          <textarea value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} rows={3}
            placeholder="What this attestation covers"
            className="w-full resize-none border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
        <Field label="Findings" hint="Leave blank until an assessment has actually reported — an empty findings field is honest, an invented one is not">
          <textarea value={form.findings} onChange={e => setForm(p => ({ ...p, findings: e.target.value }))} rows={3}
            className="w-full resize-none border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Attested by">
            <input value={form.attestedBy} onChange={e => setForm(p => ({ ...p, attestedBy: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Attestor organisation">
            <input value={form.attestorOrg} onChange={e => setForm(p => ({ ...p, attestorOrg: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Accreditation">
            <input value={form.attestorAccreditation} onChange={e => setForm(p => ({ ...p, attestorAccreditation: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Workflow status">
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {WORKFLOW_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[hsl(var(--text-2))]">
          <input type="checkbox" checked={form.attestorIsIndependent}
            onChange={e => setForm(p => ({ ...p, attestorIsIndependent: e.target.checked }))} />
          The attestor is independent of the team that built the subject
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Issued at">
            <input type="date" value={form.issuedAt} onChange={e => setForm(p => ({ ...p, issuedAt: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Valid until" hint="Validity is computed from this date — nothing expires without it">
            <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
              className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>

        <Field label="Producer-declared digest" hint="Rendered as self-declared and unverified — it is never presented as a signature">
          <input value={form.declaredDigest} onChange={e => setForm(p => ({ ...p, declaredDigest: e.target.value }))}
            className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 font-mono text-xs text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>

        <Field label="Evidence records" hint="Linked to real Evidence Vault rows, not filenames">
          <div className="max-h-40 space-y-1 overflow-y-auto border border-[hsl(var(--border))] bg-raised p-2">
            {evidence.options.length === 0 ? (
              <p className="text-[11px] text-[hsl(var(--text-4))]">
                {evidence.loading ? 'Loading evidence…' : 'No evidence records exist yet — add them in the Evidence Vault first.'}
              </p>
            ) : evidence.options.map(o => (
              <label key={o.id} className="flex items-center gap-2 text-[12px] text-[hsl(var(--text-2))]">
                <input
                  type="checkbox"
                  checked={form.evidenceIds.includes(o.id)}
                  onChange={e => setForm(p => ({
                    ...p,
                    evidenceIds: e.target.checked ? [...p.evidenceIds, o.id] : p.evidenceIds.filter(x => x !== o.id),
                  }))}
                />
                <span className="truncate">{o.title}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Framework controls" hint="controls.id — the attestation cites the control it evidences">
          <div className="max-h-40 space-y-1 overflow-y-auto border border-[hsl(var(--border))] bg-raised p-2">
            {controls.options.length === 0 ? (
              <p className="text-[11px] text-[hsl(var(--text-4))]">
                {controls.loading ? 'Loading controls…' : 'No controls are defined yet.'}
              </p>
            ) : controls.options.map(o => (
              <label key={o.id} className="flex items-center gap-2 text-[12px] text-[hsl(var(--text-2))]">
                <input
                  type="checkbox"
                  checked={form.frameworkControlIds.includes(o.id)}
                  onChange={e => setForm(p => ({
                    ...p,
                    frameworkControlIds: e.target.checked ? [...p.frameworkControlIds, o.id] : p.frameworkControlIds.filter(x => x !== o.id),
                  }))}
                />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Review notes">
          <textarea value={form.reviewNotes} onChange={e => setForm(p => ({ ...p, reviewNotes: e.target.value }))} rows={2}
            className="w-full resize-none border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
      </FormDialog>

      {/* ── Renew: creates a real successor record ── */}
      <FormDialog
        open={!!renewTarget}
        onOpenChange={o => { if (!o) { setRenewTarget(null); setRenewUntil('') } }}
        title="Renew attestation"
        description="Creates a successor attestation for the same subject and scope, at status “pending” with no findings carried over, and points this record at it via superseded_by."
        submitLabel="Create renewal"
        busy={renew.isPending}
        onSubmit={submitRenewal}
      >
        <Field label="New expiry date" required>
          <input type="date" value={renewUntil} onChange={e => setRenewUntil(e.target.value)}
            className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
        <p className="text-[11px] text-[hsl(var(--text-3))]">
          The renewal starts empty: findings and the attestor are recorded when the assessment is actually performed.
        </p>
      </FormDialog>

      {/* ── Revoke ── */}
      <FormDialog
        open={!!revokeTarget}
        onOpenChange={o => { if (!o) { setRevokeTarget(null); setRevokeReason('') } }}
        title="Revoke attestation"
        description="Revocation is dated and permanent in the record. The validity state changes to “Revoked” immediately."
        submitLabel="Revoke"
        busy={revoke.isPending}
        onSubmit={submitRevocation}
      >
        <Field label="Reason" required>
          <textarea value={revokeReason} onChange={e => setRevokeReason(e.target.value)} rows={3}
            className="w-full resize-none border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete attestation?"
        description={`Permanently delete ${toDelete?.attestationRef ?? 'this attestation'}. Consider revoking instead — revocation keeps the record and its history.`}
        isDestructive
        confirmLabel="Delete attestation"
      />
    </div>
  )
}
