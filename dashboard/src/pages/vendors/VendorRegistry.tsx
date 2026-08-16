// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// VendorRegistry — the third-party register, backed by the real org-scoped
// `vendors` table.
//
// Removed in the 2026-08 TPRM rebuild, and deliberately not replaced with a
// prettier version of the same thing:
//   * CONCENTRATION_DATA — a hardcoded OpenAI 45% / Anthropic 30% chart with a
//     "exceeds 40% dependency threshold" warning, shown to every customer
//     regardless of their estate. Concentration is now computed from the real
//     vendor→model attribution, and shows an empty state when no model has
//     been attributed to a vendor yet.
//   * VSQ_DATA — six rows keyed on 'V-001'-style codes that could never match
//     a uuid, so the column was permanently dead. The column now reads the
//     real `vendor_questionnaires` table.
//   * The DPA warning banner, which read `dpaStatus ?? 'not_signed'` against a
//     column that did not exist and therefore accused EVERY vendor of a GDPR
//     Art. 28 violation. It now derives from the real `dpa_status` column and
//     appears only when a vendor is genuinely recorded as unsigned.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Buildings, Plus, Export, ShieldWarning, CheckCircle, ChartPie,
  ClipboardText, Siren, Gauge, FileArrowUp,
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
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useVendorsData, useVendorConcentration } from '@/hooks/useVendorsData'
import { useVendorQuestionnaires } from '@/hooks/useVendorQuestionnaires'
import { useModelsData } from '@/hooks/useModelsData'
import { useAiApps } from '@/hooks/useGovernAddons'
import type { VendorRecord, VendorRiskTier, VendorCriticality, VendorDpaStatus } from '@/services/vendorService'
import {
  Pill, LinkPill, FilterChip, tierTone, tierLabel, dpaTone, fmtDate,
  VENDOR_TIERS, VENDOR_CRITICALITIES, DPA_STATUSES,
} from './vendorUi'

const CATEGORIES = [
  'Foundation Model', 'Infrastructure', 'Data Provider', 'Tool Provider',
  'Analytics Platform', 'AI Platform', 'Consulting', 'Other',
]
const STATUSES = ['approved', 'in_review', 'high_risk', 'blocked']

type FormState = {
  name: string
  category: string
  website: string
  contactEmail: string
  businessOwner: string
  vendorManager: string
  services: string
  aiUse: string
  riskTierLabel: VendorRiskTier
  criticality: VendorCriticality
  dpaStatus: VendorDpaStatus
  status: string
  description: string
}

const BLANK: FormState = {
  name: '', category: '', website: '', contactEmail: '', businessOwner: '',
  vendorManager: '', services: '', aiUse: '', riskTierLabel: 'medium',
  criticality: 'moderate', dpaStatus: 'pending', status: 'in_review', description: '',
}

function toForm(v: VendorRecord): FormState {
  return {
    name: v.name ?? '',
    category: v.category ?? '',
    website: v.website ?? '',
    contactEmail: v.contactEmail ?? '',
    businessOwner: v.businessOwner ?? '',
    vendorManager: v.vendorManager ?? '',
    services: v.services ?? '',
    aiUse: v.aiUse ?? '',
    riskTierLabel: (v.riskTierLabel ?? 'medium') as VendorRiskTier,
    criticality: (v.criticality ?? 'moderate') as VendorCriticality,
    dpaStatus: (v.dpaStatus ?? 'pending') as VendorDpaStatus,
    status: v.status ?? 'in_review',
    description: v.description ?? '',
  }
}

export default function VendorRegistry() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const modelParam = params.get('model')

  const { vendors, isLoading, isError, error, refetch, create, update, remove } = useVendorsData()
  const concentration = useVendorConcentration()
  const { questionnaires } = useVendorQuestionnaires()
  const { models } = useModelsData()
  const { data: aiApps, isLoading: aiAppsLoading } = useAiApps()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VendorRecord | null>(null)
  const [form, setForm] = useState<FormState>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<VendorRecord | null>(null)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const modelNames = useMemo(
    () => new Map(models.map((m) => [m.id, m.name])),
    [models],
  )
  const modelFilterName = modelParam ? (modelNames.get(modelParam) ?? 'Unavailable') : null

  /** Latest questionnaire per vendor, from the real table. */
  const latestVsq = useMemo(() => {
    const byVendor = new Map<string, (typeof questionnaires)[number]>()
    for (const q of questionnaires) {
      if (!q.vendorUuid) continue
      const cur = byVendor.get(q.vendorUuid)
      if (!cur || (q.createdAt ?? '') > (cur.createdAt ?? '')) byVendor.set(q.vendorUuid, q)
    }
    return byVendor
  }, [questionnaires])

  const vendorLinkedApps = aiAppsLoading ? null : (aiApps ?? []).filter((a) => !!a.vendorId).length

  // ── KPIs. A metric with no underlying data renders '—', never 0. ──────────
  const scored = vendors.filter((v) => v.score !== null && v.score !== undefined)
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, v) => s + (v.score ?? 0), 0) / scored.length)
    : null

  const tieredVendors = vendors.filter((v) => !!v.riskTierLabel)
  const criticalVendors = vendors.filter((v) => v.riskTierLabel === 'critical' || v.riskTierLabel === 'high')

  const dpaKnown = vendors.filter((v) => !!v.dpaStatus)
  const dpaSigned = dpaKnown.filter((v) => v.dpaStatus === 'signed')
  const dpaPct = dpaKnown.length ? Math.round((dpaSigned.length / dpaKnown.length) * 100) : null
  /** Only vendors POSITIVELY recorded as unsigned — an unset column is unknown,
   *  not a violation. */
  const dpaUnsigned = vendors.filter((v) => v.dpaStatus === 'not_signed')

  const kpis: StatCardRowItem[] = [
    {
      label: 'Vendors', value: vendors.length, icon: <Buildings size={18} />,
      description: `${vendors.length} third-party vendors registered`,
    },
    {
      label: 'High / Critical Tier',
      value: tieredVendors.length ? criticalVendors.length : '—',
      icon: <ShieldWarning size={18} />,
      description: tieredVendors.length
        ? `${criticalVendors.length} of ${tieredVendors.length} tiered vendors are high or critical`
        : 'No vendor has been tiered yet',
    },
    {
      label: 'DPA Signed',
      value: dpaPct === null ? '—' : `${dpaPct}%`,
      icon: <CheckCircle size={18} />,
      delta: dpaKnown.length ? `${dpaSigned.length}/${dpaKnown.length}` : undefined,
      isPositiveUp: true,
      description: dpaPct === null
        ? 'No vendor has a recorded DPA status'
        : `${dpaSigned.length} of ${dpaKnown.length} vendors with a recorded DPA status are signed`,
    },
    {
      label: 'Avg Score',
      value: avgScore === null ? '—' : avgScore,
      icon: <ChartPie size={18} />,
      delta: scored.length ? `${scored.length} scored` : undefined,
      isPositiveUp: true,
      description: avgScore === null
        ? 'No vendor has been scored yet'
        : `Mean of ${scored.length} scored vendors`,
    },
  ]

  // ── filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => vendors.filter((v) => {
    if (modelParam && !v.linkedModels.includes(modelParam)) return false
    if (statusFilter && v.status !== statusFilter) return false
    if (tierFilter && v.riskTierLabel !== tierFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${v.name} ${v.category ?? ''} ${v.services ?? ''} ${v.businessOwner ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [vendors, modelParam, statusFilter, tierFilter, search])

  function clearModelFilter() {
    const next = new URLSearchParams(params)
    next.delete('model')
    setParams(next, { replace: true })
  }

  function openCreate() { setEditing(null); setForm(BLANK); setFormOpen(true) }
  function openEdit(v: VendorRecord) { setEditing(v); setForm(toForm(v)); setFormOpen(true) }

  function submit() {
    const patch: Partial<VendorRecord> = {
      name: form.name.trim(),
      category: form.category || null,
      website: form.website || null,
      contactEmail: form.contactEmail || null,
      businessOwner: form.businessOwner || null,
      vendorManager: form.vendorManager || null,
      services: form.services || null,
      aiUse: form.aiUse || null,
      riskTierLabel: form.riskTierLabel,
      criticality: form.criticality,
      dpaStatus: form.dpaStatus,
      status: form.status,
      description: form.description || null,
    }
    // The dialog closes only after the write resolves.
    if (editing) {
      update.mutate({ id: editing.id, patch }, { onSuccess: () => setFormOpen(false) })
    } else {
      create.mutate(patch, { onSuccess: () => setFormOpen(false) })
    }
  }

  function handleExport() {
    const header = [
      'id', 'name', 'category', 'risk_tier_label', 'criticality', 'score',
      'dpa_status', 'status', 'business_owner', 'reassessment_due_at',
    ]
    const csv = [
      header.join(','),
      ...filtered.map((v) => [
        v.id, JSON.stringify(v.name ?? ''), v.category ?? '', v.riskTierLabel ?? '',
        v.criticality ?? '', v.score ?? '', v.dpaStatus ?? '', v.status ?? '',
        JSON.stringify(v.businessOwner ?? ''), v.reassessmentDueAt ?? '',
      ].join(',')),
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `vendor-registry-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const columns: Column<VendorRecord>[] = [
    {
      key: 'name', header: 'Vendor', sortable: true,
      render: (v) => (
        <div>
          <div className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v.name || 'Unnamed vendor'}</div>
          {/* The uuid is the key, not a label — we show what the vendor does. */}
          <div className="max-w-xs truncate text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            {v.services || v.description || '—'}
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', sortable: true, render: (v) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{v.category || '—'}</span>
    ) },
    {
      key: 'riskTierLabel', header: 'Risk Tier', sortable: true,
      render: (v) => <Pill tone={tierTone(v.riskTierLabel)}>{tierLabel(v.riskTierLabel)}</Pill>,
    },
    {
      key: 'score', header: 'Score', sortable: true,
      render: (v) => (
        v.score === null || v.score === undefined
          ? <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>
          : (
            <div className="flex min-w-[110px] items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))', minWidth: 26 }}>{v.score}</span>
              <div className="h-1.5 flex-1" style={{ background: 'hsl(var(--border))' }}>
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, v.score))}%`,
                    background: v.score >= 80 ? 'hsl(var(--s-ok-tx))' : v.score >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                  }}
                />
              </div>
            </div>
          )
      ),
    },
    {
      key: 'dpaStatus', header: 'DPA', sortable: true,
      render: (v) => v.dpaStatus
        ? <Pill tone={dpaTone(v.dpaStatus)}>{v.dpaStatus.replace(/_/g, ' ')}</Pill>
        : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>,
    },
    {
      key: 'vsq', header: 'Questionnaire',
      render: (v) => {
        const q = latestVsq.get(v.id)
        if (!q) {
          return (
            <button
              type="button"
              className="text-xs underline-offset-2 hover:underline"
              style={{ color: 'hsl(var(--brand))' }}
              onClick={(e) => { e.stopPropagation(); navigate(`/vendors/${v.id}/questionnaire`) }}
            >
              Send VSQ
            </button>
          )
        }
        const pct = q.score != null && q.maxScore ? Math.round((q.score / q.maxScore) * 100) : null
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs capitalize" style={{ color: 'hsl(var(--text-2))' }}>
              {q.reviewDecision ? q.reviewDecision.replace(/_/g, ' ') : q.status}
            </span>
            <span className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
              {pct === null ? '—' : `${pct}%`} · {fmtDate(q.responseDate ?? q.createdAt)}
            </span>
          </div>
        )
      },
    },
    { key: 'businessOwner', header: 'Business Owner', sortable: true, render: (v) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{v.businessOwner || '—'}</span>
    ) },
    { key: 'reassessmentDueAt', header: 'Reassessment Due', sortable: true, render: (v) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{fmtDate(v.reassessmentDueAt)}</span>
    ) },
  ]

  if (isLoading) return <PageSkeleton title="Vendor Registry" rows={8} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Registry"
        subtitle="Third-party AI vendor governance and risk"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Vendors' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/tprm')}>TPRM Workspace</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/assessments')}>
              <ClipboardText size={14} /> Assessments
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/sla')}>
              <Gauge size={14} /> SLAs
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendor-upload')}>
              <FileArrowUp size={14} /> Documents
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/ai-apps')}>
              AI Apps{vendorLinkedApps !== null ? ` (${vendorLinkedApps})` : ''}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Export size={14} /> Export CSV
            </Button>
            <Button size="sm" onClick={openCreate}><Plus size={14} /> Add Vendor</Button>
          </div>
        }
      />

      {isError && (
        <ErrorState
          title="Could not load vendors"
          error={error}
          onRetry={() => refetch()}
        />
      )}

      {!isError && (
        <>
          <StatCardRow cards={kpis} />

          {modelParam && (
            <div className="flex items-center gap-2">
              <FilterChip label="Model" value={modelFilterName ?? 'Unavailable'} onClear={clearModelFilter} />
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                Showing vendors that supply this model.
              </span>
            </div>
          )}

          {/* DPA gap — derived from the real dpa_status column, and shown only
              when at least one vendor is actually recorded as unsigned. */}
          {dpaUnsigned.length > 0 && (
            <div
              className="flex items-start gap-3 p-4"
              style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}
            >
              <Siren size={20} style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>
                  {dpaUnsigned.length} vendor{dpaUnsigned.length > 1 ? 's are' : ' is'} recorded as having no signed DPA
                </p>
                <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                  Where the vendor processes personal data on your behalf, GDPR Art. 28 requires a
                  data processing agreement before processing begins.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dpaUnsigned.slice(0, 8).map((v) => (
                    <LinkPill key={v.id} to={`/vendors/${v.id}`}>{v.name || 'Unnamed vendor'}</LinkPill>
                  ))}
                  {dpaUnsigned.length > 8 && (
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      +{dpaUnsigned.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Concentration — computed from the real vendor→model attribution. */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <ChartPie size={16} style={{ color: 'hsl(var(--brand))' }} />
                <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Vendor Concentration
                </span>
                <span className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                  share of the attributed model estate
                </span>
              </div>

              {concentration.isError ? (
                <ErrorState title="Could not compute concentration" error={concentration.error} />
              ) : concentration.isLoading ? (
                <div className="h-16" aria-label="Loading concentration" role="status" />
              ) : concentration.slices.length === 0 ? (
                <EmptyState
                  icon={<ChartPie size={28} weight="duotone" />}
                  title="No model is attributed to a vendor yet"
                  description="Concentration is measured over AI models linked to a vendor. Link models to their supplier on the vendor record to see the real distribution."
                />
              ) : (
                <>
                  <div className="space-y-2">
                    {concentration.slices.map((s) => (
                      <div key={s.vendorId} className="flex items-center gap-3">
                        <LinkPill to={`/vendors/${s.vendorId}`}>{s.vendorName || 'Unnamed vendor'}</LinkPill>
                        <div className="h-2 flex-1" style={{ background: 'hsl(var(--border))' }}>
                          <div
                            className="h-full"
                            style={{
                              width: `${s.pct}%`,
                              background: s.pct > 40 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--brand))',
                            }}
                          />
                        </div>
                        <span className="w-24 text-right text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                          {Math.round(s.pct)}% · {s.modelCount}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                    Based on {concentration.attributedModels} of {concentration.totalModels} registered models that
                    are attributed to a vendor. Unattributed models are excluded rather than assumed.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search vendors, services, owners…"
            filters={[
              {
                key: 'status', label: 'Status', value: statusFilter, onChange: setStatusFilter,
                options: STATUSES.map((s) => ({ label: s.replace(/_/g, ' '), value: s })),
              },
              {
                key: 'tier', label: 'Risk Tier', value: tierFilter, onChange: setTierFilter,
                options: VENDOR_TIERS.map((t) => ({ label: t, value: t })),
              },
            ]}
            activeFilterCount={[statusFilter, tierFilter].filter(Boolean).length}
            onClearAll={() => { setSearch(''); setStatusFilter(''); setTierFilter('') }}
            trailing={
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {filtered.length} of {vendors.length}
              </span>
            }
          />

          {vendors.length === 0 ? (
            <EmptyState
              icon={<Buildings size={32} weight="duotone" />}
              title="No vendors registered"
              description="Register the third parties that supply or host your AI capability. Every assessment, SLA and document in this cluster hangs off a vendor record."
              action={<Button size="sm" onClick={openCreate}><Plus size={14} /> Add Vendor</Button>}
            />
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              searchKey="name"
              onRowClick={(v) => navigate(`/vendors/${v.id}`)}
              onView={(v) => navigate(`/vendors/${v.id}`)}
              onEdit={openEdit}
              onDelete={(v) => setDeleteTarget(v)}
              emptyMessage="No vendors match the current filters."
            />
          )}
        </>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.name}` : 'Register vendor'}
        description="Vendors are the anchor record for assessments, SLAs, questionnaires and evidence."
        submitLabel={editing ? 'Save changes' : 'Register vendor'}
        busy={create.isPending || update.isPending}
        disabled={!form.name.trim()}
        onSubmit={submit}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Vendor name" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://vendor.com" />
          </Field>
          <Field label="Contact email">
            <Input value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="security@vendor.com" />
          </Field>
          <Field label="Business owner">
            <Input value={form.businessOwner} onChange={(e) => set('businessOwner', e.target.value)} />
          </Field>
          <Field label="Vendor manager">
            <Input value={form.vendorManager} onChange={(e) => set('vendorManager', e.target.value)} />
          </Field>
          <Field label="Risk tier">
            <Select value={form.riskTierLabel} onValueChange={(v) => set('riskTierLabel', v as VendorRiskTier)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{VENDOR_TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Business criticality">
            <Select value={form.criticality} onValueChange={(v) => set('criticality', v as VendorCriticality)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{VENDOR_CRITICALITIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="DPA status" hint="Leave as pending until the agreement is genuinely executed.">
            <Select value={form.dpaStatus} onValueChange={(v) => set('dpaStatus', v as VendorDpaStatus)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{DPA_STATUSES.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Review status">
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Services provided">
          <Input value={form.services} onChange={(e) => set('services', e.target.value)} placeholder="What does this vendor supply?" />
        </Field>
        <Field label="AI use" hint="How this vendor's product touches AI in your estate.">
          <Input value={form.aiUse} onChange={(e) => set('aiUse', e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="h-20 w-full resize-none p-2 text-xs"
            style={{
              background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--text-1))',
            }}
          />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title={`Delete ${deleteTarget?.name ?? 'vendor'}?`}
        description="Assessments, SLAs and documents that reference this vendor are removed with it. This cannot be undone."
        confirmLabel="Delete vendor"
        type="danger"
        onConfirm={async () => {
          if (!deleteTarget) return false
          // Returning the promise keeps the dialog open until the write
          // resolves; a rejection leaves it open and the hook toasts the error.
          await remove.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
