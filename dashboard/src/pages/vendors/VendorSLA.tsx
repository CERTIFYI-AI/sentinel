// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// VendorSLA — contractual service levels against `vendor_slas`, read through
// the `vendor_sla_status` view.
//
// What changed, and why it mattered:
//   * The page used to sit on `vendorsla_table (id, doc jsonb)` — an
//     anon-and-authenticated `USING(true)` demo table with no org_id, i.e.
//     cross-tenant read/write of every customer's SLA data.
//   * "Current performance: 99.7%" and "status: healthy" were seed LITERALS
//     rendered under column headings that claimed they were measurements, and
//     thresholds were free text ('P1: 1h / P2: 4h / P3: 24h') — so automated
//     evaluation was impossible by construction and a breaching SLA could
//     display as healthy. Thresholds are now numeric with a unit and a
//     direction, and status is DERIVED by the view from the measured value.
//   * A newly created SLA used to be stamped `status: 'healthy'` with
//     `lastMeasuredAt: today`, so it counted toward the Healthy KPI before
//     anyone had measured anything. An unmeasured SLA now renders '—' and is
//     counted separately.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Gauge, Plus, Export, CheckCircle, Warning, XCircle } from '@phosphor-icons/react'
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
import { useVendorSlas } from '@/hooks/useVendorSlas'
import { useVendorOptions } from '@/hooks/useVendorsData'
import { SLA_METRICS, SLA_UNITS, SLA_WINDOWS, type VendorSlaRecord } from '@/services/vendorSlaService'
import { Pill, LinkPill, FilterChip, Fact, slaTone, dash, fmtDate } from './vendorUi'

type FormState = {
  vendorId: string
  slaRef: string
  metric: string
  unit: string
  targetValue: string
  warningValue: string
  breachValue: string
  higherIsBetter: boolean
  measurementWindow: string
  serviceCredits: string
  contractClauseRef: string
  escalationPath: string
  owner: string
  notes: string
}

const BLANK: FormState = {
  vendorId: '', slaRef: '', metric: 'uptime', unit: 'percent',
  targetValue: '', warningValue: '', breachValue: '', higherIsBetter: true,
  measurementWindow: 'monthly', serviceCredits: '', contractClauseRef: '',
  escalationPath: '', owner: '', notes: '',
}

/** Latency-style metrics are lower-is-better; uptime and accuracy are not. */
function defaultDirection(metric: string): boolean {
  return !['response_time', 'resolution_time'].includes(metric)
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export default function VendorSLA() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const vendorParam = params.get('vendor')
  const openParam = params.get('open')

  const { slas, isLoading, isError, error, refetch, create, update, measure, remove } =
    useVendorSlas(vendorParam ?? undefined)
  const { options: vendorOptions, resolveName } = useVendorOptions()

  const [search, setSearch] = useState('')
  // Seeded from ?status= so the TPRM workspace's "SLAs breached" tile lands on
  // the filtered list rather than an unfiltered one.
  const [statusFilter, setStatusFilter] = useState(params.get('status') ?? '')
  const [metricFilter, setMetricFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VendorSlaRecord | null>(null)
  const [form, setForm] = useState<FormState>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<VendorSlaRecord | null>(null)
  const [measureFor, setMeasureFor] = useState<VendorSlaRecord | null>(null)
  const [measureValue, setMeasureValue] = useState('')

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const selected = openParam ? slas.find((s) => s.id === openParam) ?? null : null

  const measured = slas.filter((s) => s.derivedStatus !== 'unmeasured')
  const healthy = slas.filter((s) => s.derivedStatus === 'healthy').length
  const atRisk = slas.filter((s) => s.derivedStatus === 'at_risk').length
  const breached = slas.filter((s) => s.derivedStatus === 'breached').length
  const unmeasured = slas.length - measured.length

  const kpis: StatCardRowItem[] = [
    {
      label: 'Tracked SLAs', value: slas.length, icon: <Gauge size={18} />,
      description: `${slas.length} SLAs recorded, ${unmeasured} never measured`,
    },
    {
      label: 'Healthy', value: measured.length ? healthy : '—', icon: <CheckCircle size={18} />,
      description: measured.length ? `${healthy} of ${measured.length} measured SLAs` : 'Nothing has been measured yet',
    },
    {
      label: 'At risk', value: measured.length ? atRisk : '—', icon: <Warning size={18} />,
      isPositiveUp: false,
      description: 'Below target but above the breach threshold',
    },
    {
      label: 'Breached', value: measured.length ? breached : '—', icon: <XCircle size={18} />,
      isPositiveUp: false,
      description: 'Latest measurement crossed the contractual breach threshold',
    },
  ]

  const filtered = useMemo(() => slas.filter((s) => {
    if (statusFilter && s.derivedStatus !== statusFilter) return false
    if (metricFilter && s.metric !== metricFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${resolveName(s.vendorId)} ${s.metric} ${s.slaRef ?? ''} ${s.owner ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [slas, statusFilter, metricFilter, search, resolveName])

  function clearVendorFilter() {
    const next = new URLSearchParams(params); next.delete('vendor'); setParams(next, { replace: true })
  }
  function openRecord(s: VendorSlaRecord) {
    const next = new URLSearchParams(params); next.set('open', s.id); setParams(next, { replace: true })
  }
  function closeRecord() {
    const next = new URLSearchParams(params); next.delete('open'); setParams(next, { replace: true })
  }

  function openCreate() { setEditing(null); setForm({ ...BLANK, vendorId: vendorParam ?? '' }); setFormOpen(true) }
  function openEdit(s: VendorSlaRecord) {
    setEditing(s)
    setForm({
      vendorId: s.vendorId ?? '',
      slaRef: s.slaRef ?? '',
      metric: s.metric,
      unit: s.unit,
      targetValue: s.targetValue?.toString() ?? '',
      warningValue: s.warningValue?.toString() ?? '',
      breachValue: s.breachValue?.toString() ?? '',
      higherIsBetter: s.higherIsBetter,
      measurementWindow: s.measurementWindow ?? 'monthly',
      serviceCredits: s.serviceCredits ?? '',
      contractClauseRef: s.contractClauseRef ?? '',
      escalationPath: s.escalationPath ?? '',
      owner: s.owner ?? '',
      notes: s.notes ?? '',
    })
    setFormOpen(true)
  }

  function submit() {
    const patch: Partial<VendorSlaRecord> = {
      vendorId: form.vendorId,
      slaRef: form.slaRef || null,
      metric: form.metric,
      unit: form.unit,
      targetValue: numOrNull(form.targetValue),
      warningValue: numOrNull(form.warningValue),
      breachValue: numOrNull(form.breachValue),
      higherIsBetter: form.higherIsBetter,
      measurementWindow: form.measurementWindow,
      serviceCredits: form.serviceCredits || null,
      contractClauseRef: form.contractClauseRef || null,
      escalationPath: form.escalationPath || null,
      owner: form.owner || null,
      notes: form.notes || null,
      // No status, and no current_value: a new SLA is 'unmeasured' until a
      // measurement is genuinely recorded.
    }
    if (editing) {
      update.mutate({ id: editing.id, patch }, { onSuccess: () => setFormOpen(false) })
    } else {
      create.mutate(patch, { onSuccess: () => setFormOpen(false) })
    }
  }

  function submitMeasurement() {
    if (!measureFor) return
    const v = Number(measureValue)
    if (!Number.isFinite(v)) return
    measure.mutate({ id: measureFor.id, value: v }, {
      onSuccess: () => { setMeasureFor(null); setMeasureValue('') },
    })
  }

  function handleExport() {
    const header = ['id', 'vendor', 'metric', 'unit', 'target', 'breach', 'current', 'derived_status', 'last_measured_at']
    const csv = [
      header.join(','),
      ...filtered.map((s) => [
        s.id, JSON.stringify(resolveName(s.vendorId)), s.metric, s.unit,
        s.targetValue ?? '', s.breachValue ?? '', s.currentValue ?? '',
        s.derivedStatus, s.lastMeasuredAt ?? '',
      ].join(',')),
    ].join('\n')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    el.download = `vendor-slas-${new Date().toISOString().slice(0, 10)}.csv`
    el.click()
  }

  const columns: Column<VendorSlaRecord>[] = [
    {
      key: 'vendor', header: 'Vendor', sortable: true,
      render: (s) => {
        const name = s.vendorId ? resolveName(s.vendorId) : 'Unavailable'
        return s.vendorId && name !== 'Unavailable'
          ? <LinkPill to={`/vendors/${s.vendorId}`}>{name}</LinkPill>
          : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
      },
    },
    { key: 'metric', header: 'Metric', sortable: true, render: (s) => (
      <div>
        <div className="text-sm capitalize" style={{ color: 'hsl(var(--text-1))' }}>{s.metric.replace(/_/g, ' ')}</div>
        {s.slaRef && <div className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{s.slaRef}</div>}
      </div>
    ) },
    { key: 'target', header: 'Target', render: (s) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
        {s.targetValue === null || s.targetValue === undefined
          ? '—'
          : `${s.higherIsBetter ? '≥' : '≤'} ${s.targetValue} ${s.unit}`}
      </span>
    ) },
    { key: 'breach', header: 'Breach at', render: (s) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
        {s.breachValue === null || s.breachValue === undefined ? '—' : `${s.breachValue} ${s.unit}`}
      </span>
    ) },
    {
      key: 'current', header: 'Measured', sortable: true,
      render: (s) => (
        <div>
          <div className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            {s.currentValue === null || s.currentValue === undefined ? '—' : `${s.currentValue} ${s.unit}`}
          </div>
          <div className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{fmtDate(s.lastMeasuredAt)}</div>
        </div>
      ),
    },
    {
      key: 'derivedStatus', header: 'Status', sortable: true,
      render: (s) => (
        <Pill
          tone={slaTone(s.derivedStatus)}
          title={s.derivedStatus === 'unmeasured'
            ? 'No measurement recorded — status cannot be derived'
            : 'Derived from the measured value against the contractual thresholds'}
        >
          {s.derivedStatus.replace(/_/g, ' ')}
        </Pill>
      ),
    },
    { key: 'consecutiveBreaches', header: 'Consec. breaches', render: (s) => (
      <span className="text-xs" style={{ color: s.consecutiveBreaches > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-4))' }}>
        {s.consecutiveBreaches > 0 ? s.consecutiveBreaches : '—'}
      </span>
    ) },
    { key: 'owner', header: 'Owner', sortable: true, render: (s) => (
      <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.owner || '—'}</span>
    ) },
  ]

  if (isLoading) return <PageSkeleton title="Vendor SLAs" rows={8} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor SLAs"
        subtitle="Contractual service levels, measured against numeric thresholds"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Vendors', href: '/vendors' },
          { label: 'SLAs' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>Registry</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/tprm')}>TPRM Workspace</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Export size={14} /> Export CSV</Button>
            <Button size="sm" onClick={openCreate} disabled={vendorOptions.length === 0}>
              <Plus size={14} /> New SLA
            </Button>
          </div>
        }
      />

      {isError ? (
        <ErrorState title="Could not load SLAs" error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <StatCardRow cards={kpis} />

          {unmeasured > 0 && slas.length > 0 && (
            <div
              className="flex items-start gap-3 p-3"
              style={{ background: 'hsl(var(--s-nt-bg))', border: '1px solid hsl(var(--border))' }}
            >
              <Gauge size={16} style={{ color: 'hsl(var(--text-3))', flexShrink: 0, marginTop: 2 }} />
              <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                {unmeasured} SLA{unmeasured > 1 ? 's have' : ' has'} never been measured, so no status can be derived
                for {unmeasured > 1 ? 'them' : 'it'}. They are excluded from the health counts above rather than
                assumed healthy.
              </p>
            </div>
          )}

          {breached > 0 && (
            <div
              className="flex items-start gap-3 p-3"
              style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}
            >
              <XCircle size={16} style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>
                  {breached} SLA{breached > 1 ? 's are' : ' is'} in breach on the latest recorded measurement
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {slas.filter((s) => s.derivedStatus === 'breached').slice(0, 8).map((s) => (
                    <LinkPill key={s.id} to={`/vendors/sla?open=${s.id}`}>
                      {resolveName(s.vendorId)} · {s.metric.replace(/_/g, ' ')}
                    </LinkPill>
                  ))}
                </div>
              </div>
            </div>
          )}

          {vendorParam && (
            <FilterChip label="Vendor" value={resolveName(vendorParam)} onClear={clearVendorFilter} />
          )}

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by vendor, metric, owner…"
            filters={[
              {
                key: 'status', label: 'Status', value: statusFilter, onChange: setStatusFilter,
                options: ['healthy', 'at_risk', 'breached', 'unmeasured'].map((s) => ({ label: s.replace(/_/g, ' '), value: s })),
              },
              {
                key: 'metric', label: 'Metric', value: metricFilter, onChange: setMetricFilter,
                options: SLA_METRICS.map((m) => ({ label: m.replace(/_/g, ' '), value: m })),
              },
            ]}
            activeFilterCount={[statusFilter, metricFilter].filter(Boolean).length}
            onClearAll={() => { setSearch(''); setStatusFilter(''); setMetricFilter('') }}
            trailing={
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {filtered.length} of {slas.length}
              </span>
            }
          />

          {vendorOptions.length === 0 ? (
            <EmptyState
              icon={<Gauge size={32} weight="duotone" />}
              title="Register a vendor first"
              description="An SLA belongs to a vendor. Add the vendor to the registry, then record its contractual thresholds here."
              action={<Button size="sm" onClick={() => navigate('/vendors')}>Open the vendor registry</Button>}
            />
          ) : slas.length === 0 ? (
            <EmptyState
              icon={<Gauge size={32} weight="duotone" />}
              title="No SLAs recorded"
              description="Record each contractual threshold as a number with a unit and a direction, so a breach can be evaluated rather than asserted."
              action={<Button size="sm" onClick={openCreate}><Plus size={14} /> New SLA</Button>}
            />
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              searchKey="metric"
              onRowClick={openRecord}
              onView={openRecord}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              emptyMessage="No SLAs match the current filters."
            />
          )}
        </>
      )}

      {/* ── Detail sheet ──────────────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) closeRecord() }}>
        <SheetContent style={{ borderRadius: 0, width: 600, maxWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle className="capitalize">
              {selected ? selected.metric.replace(/_/g, ' ') : 'SLA'}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 h-[calc(100vh-140px)] space-y-5 overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={slaTone(selected.derivedStatus)}>{selected.derivedStatus.replace(/_/g, ' ')}</Pill>
                {selected.vendorId && resolveName(selected.vendorId) !== 'Unavailable' && (
                  <LinkPill to={`/vendors/${selected.vendorId}`}>{resolveName(selected.vendorId)}</LinkPill>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Fact
                  label="Target"
                  value={selected.targetValue === null || selected.targetValue === undefined
                    ? null : `${selected.higherIsBetter ? '≥' : '≤'} ${selected.targetValue} ${selected.unit}`}
                />
                <Fact label="Warning at" value={dash(selected.warningValue, ` ${selected.unit}`)} />
                <Fact label="Breach at" value={dash(selected.breachValue, ` ${selected.unit}`)} />
                <Fact label="Measurement window" value={selected.measurementWindow} />
                <Fact
                  label="Latest measurement"
                  value={selected.currentValue === null || selected.currentValue === undefined
                    ? null : `${selected.currentValue} ${selected.unit}`}
                  hint={selected.lastMeasuredAt ? `recorded ${fmtDate(selected.lastMeasuredAt)}` : 'never measured'}
                />
                <Fact label="Consecutive breaches" value={selected.consecutiveBreaches || null} />
                <Fact label="Last breach" value={fmtDate(selected.lastBreachAt)} />
                <Fact label="Owner" value={selected.owner} />
                <Fact label="Contract clause" value={selected.contractClauseRef} />
                <Fact label="Service credits" value={selected.serviceCredits} />
                <Fact label="Credit claim" value={selected.creditClaimStatus} />
                <Fact label="Escalation path" value={selected.escalationPath} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>
                  Linked incidents
                </p>
                {selected.linkedIncidentIds.length === 0 ? (
                  <p className="mt-1 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                    No incident is linked to this SLA.
                  </p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selected.linkedIncidentIds.map((iid) => (
                      <LinkPill key={iid} to={`/incidents?open=${iid}`}>Incident</LinkPill>
                    ))}
                  </div>
                )}
              </div>

              {selected.notes && <Fact label="Notes" value={selected.notes} />}

              <div className="pt-2">
                <Button size="sm" onClick={() => { setMeasureValue(''); setMeasureFor(selected) }}>
                  Record a measurement
                </Button>
                <p className="mt-1 text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                  Status is derived from the measurement — it cannot be set directly.
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Create / edit ─────────────────────────────────────────────────── */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit SLA' : 'New vendor SLA'}
        description="Thresholds are numeric so breach can be evaluated. There is no status field — it is derived from measurements."
        submitLabel={editing ? 'Save changes' : 'Create SLA'}
        busy={create.isPending || update.isPending}
        disabled={!form.vendorId || !form.metric}
        onSubmit={submit}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor" required hint="Stored as the vendor's id.">
            <Select value={form.vendorId} onValueChange={(v) => set('vendorId', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a vendor" /></SelectTrigger>
              <SelectContent>
                {vendorOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name || 'Unnamed vendor'}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference" hint="Your internal SLA reference, if any.">
            <Input value={form.slaRef} onChange={(e) => set('slaRef', e.target.value)} />
          </Field>
          <Field label="Metric" required>
            <Select
              value={form.metric}
              onValueChange={(v) => setForm((f) => ({ ...f, metric: v, higherIsBetter: defaultDirection(v) }))}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SLA_METRICS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Unit">
            <Select value={form.unit} onValueChange={(v) => set('unit', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{SLA_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Direction">
            <Select
              value={form.higherIsBetter ? 'higher' : 'lower'}
              onValueChange={(v) => set('higherIsBetter', v === 'higher')}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="higher">Higher is better (uptime, accuracy)</SelectItem>
                <SelectItem value="lower">Lower is better (response, resolution time)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Measurement window">
            <Select value={form.measurementWindow} onValueChange={(v) => set('measurementWindow', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{SLA_WINDOWS.map((w) => <SelectItem key={w} value={w}>{w.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Target" hint="Numeric, in the unit above.">
            <Input inputMode="decimal" value={form.targetValue} onChange={(e) => set('targetValue', e.target.value)} placeholder="99.9" />
          </Field>
          <Field label="Warning threshold">
            <Input inputMode="decimal" value={form.warningValue} onChange={(e) => set('warningValue', e.target.value)} />
          </Field>
          <Field label="Breach threshold" hint="Crossing this is a contractual breach.">
            <Input inputMode="decimal" value={form.breachValue} onChange={(e) => set('breachValue', e.target.value)} />
          </Field>
          <Field label="Owner">
            <Input value={form.owner} onChange={(e) => set('owner', e.target.value)} />
          </Field>
          <Field label="Contract clause">
            <Input value={form.contractClauseRef} onChange={(e) => set('contractClauseRef', e.target.value)} placeholder="MSA §7.2" />
          </Field>
          <Field label="Service credits / remedy">
            <Input value={form.serviceCredits} onChange={(e) => set('serviceCredits', e.target.value)} />
          </Field>
        </div>
        <Field label="Escalation path">
          <Input value={form.escalationPath} onChange={(e) => set('escalationPath', e.target.value)} />
        </Field>
        <Field label="Notes">
          <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </FormDialog>

      {/* ── Measurement ───────────────────────────────────────────────────── */}
      <FormDialog
        open={!!measureFor}
        onOpenChange={(o) => { if (!o) setMeasureFor(null) }}
        title="Record SLA measurement"
        description="The status shown on this SLA is recomputed from the value you enter — it is never set by hand."
        submitLabel="Record measurement"
        busy={measure.isPending}
        disabled={!Number.isFinite(Number(measureValue)) || measureValue.trim() === ''}
        onSubmit={submitMeasurement}
      >
        <Field
          label={`Measured value${measureFor ? ` (${measureFor.unit})` : ''}`}
          required
          hint={measureFor
            ? `Target ${measureFor.higherIsBetter ? '≥' : '≤'} ${dash(measureFor.targetValue)}, breach at ${dash(measureFor.breachValue)}.`
            : undefined}
        >
          <Input inputMode="decimal" value={measureValue} onChange={(e) => setMeasureValue(e.target.value)} autoFocus />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Delete this SLA?"
        description="The SLA and its measurement history are removed. This cannot be undone."
        confirmLabel="Delete SLA"
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
