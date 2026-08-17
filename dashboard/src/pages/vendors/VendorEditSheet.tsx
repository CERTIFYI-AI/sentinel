// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// VendorEditSheet — the write path for the TPRM field model.
//
// The 2026-08 re-audit found 28 of the 36 TPRM columns had NO write path:
// `vendorService.toRow` mapped them but no form ever sent them, so
// reassessment dates, inherent/residual risk, DPA dates, cert expiries,
// sub-processor counts, exit plans and spend could only ever be set by the
// demo seed — on a real tenant the whole reassessment programme read '—'
// forever. This sheet is that write path, grouped the way the detail page
// reads the record back (Risk & Data / Assurance / Lifecycle / Commercial).
//
// It also carries the model picker for `vendors.linked_models`: concentration
// analysis reads that column and the registry empty-state told users to "link
// models to their supplier on the vendor record", but no such control existed.
//
// Writes go through vendorService.updateVendor (throws on failure); the
// success toast comes from the useVendorsData mutation only after the write
// resolves, and the dialog closes only on success. Empty inputs are written as
// NULL — never 0, never '' — so the read side keeps rendering an honest '—'.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Cube } from '@phosphor-icons/react'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useVendorsData } from '@/hooks/useVendorsData'
import type { VendorRecord, VendorCriticality, VendorDpaStatus } from '@/services/vendorService'
import { VENDOR_CRITICALITIES, DPA_STATUSES } from './vendorUi'

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const
const DATA_CLASSIFICATIONS = ['public', 'internal', 'confidential', 'restricted'] as const
const DATA_ACCESS_LEVELS = [
  'no_data_access', 'metadata_only', 'internal_data', 'processes_customer_data', 'hosts_infrastructure',
] as const
const TRANSFER_MECHANISMS = ['SCC', 'BCR', 'adequacy', 'none'] as const
const EXIT_PLAN_STATUSES = ['none', 'in_progress', 'documented', 'tested'] as const
const FOURTH_PARTY_EXPOSURES = ['low', 'moderate', 'high'] as const

/** Everything is edited as a string and coerced on submit; '' means "unset"
 *  and is written as NULL so the read side renders '—', never 0. */
type EditForm = {
  inherentRisk: string
  residualRisk: string
  dataClassification: string
  dataAccessLevel: string
  dataRegions: string
  transferMechanism: string
  dpaStatus: string
  dpaSignedAt: string
  dpaExpiresAt: string
  soc2ExpiresAt: string
  isoExpiresAt: string
  lastPentestAt: string
  reassessmentCadenceMonths: string
  reassessmentDueAt: string
  exitPlanStatus: string
  exitPlanNotes: string
  criticality: string
  contractStart: string
  renewalNoticeDays: string
  annualSpend: string
  spendCurrency: string
  insuranceCoverage: string
  subprocessorCount: string
  fourthPartyExposure: string
  linkedModels: string[]
}

/** Date columns arrive as ISO timestamps or plain dates; <input type=date> needs yyyy-mm-dd. */
const toDateInput = (v?: string | null): string => (v ? v.slice(0, 10) : '')
const toNumInput = (v?: number | null): string => (v === null || v === undefined ? '' : String(v))

function toEditForm(v: VendorRecord): EditForm {
  return {
    inherentRisk: v.inherentRisk ?? '',
    residualRisk: v.residualRisk ?? '',
    dataClassification: v.dataClassification ?? '',
    dataAccessLevel: v.dataAccessLevel ?? '',
    dataRegions: v.dataRegions.join(', '),
    transferMechanism: v.transferMechanism ?? '',
    dpaStatus: v.dpaStatus ?? '',
    dpaSignedAt: toDateInput(v.dpaSignedAt),
    dpaExpiresAt: toDateInput(v.dpaExpiresAt),
    soc2ExpiresAt: toDateInput(v.soc2ExpiresAt),
    isoExpiresAt: toDateInput(v.isoExpiresAt),
    lastPentestAt: toDateInput(v.lastPentestAt),
    reassessmentCadenceMonths: toNumInput(v.reassessmentCadenceMonths),
    reassessmentDueAt: toDateInput(v.reassessmentDueAt),
    exitPlanStatus: v.exitPlanStatus ?? '',
    exitPlanNotes: v.exitPlanNotes ?? '',
    criticality: v.criticality ?? '',
    contractStart: toDateInput(v.contractStart),
    renewalNoticeDays: toNumInput(v.renewalNoticeDays),
    annualSpend: toNumInput(v.annualSpend),
    spendCurrency: v.spendCurrency ?? '',
    insuranceCoverage: v.insuranceCoverage ?? '',
    subprocessorCount: toNumInput(v.subprocessorCount),
    fourthPartyExposure: v.fourthPartyExposure ?? '',
    linkedModels: [...v.linkedModels],
  }
}

const strOrNull = (s: string): string | null => (s.trim() ? s.trim() : null)
const numOrNull = (s: string): number | null => {
  if (!s.trim()) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p
      className="pt-1 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: 'hsl(var(--text-4))', borderTop: '1px solid hsl(var(--border))', paddingTop: 10 }}
    >
      {children}
    </p>
  )
}

function EnumSelect({ value, onChange, options, placeholder = 'Not set' }: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ')}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

export function VendorEditSheet({ vendor, models, open, onOpenChange }: {
  vendor: VendorRecord
  /** Real ai_models rows (uuid + display name) for the linked_models picker. */
  models: { id: string; name: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { update } = useVendorsData()
  const [form, setForm] = useState<EditForm>(() => toEditForm(vendor))

  // Re-seed the form from the stored record each time the sheet opens, so a
  // cancelled edit never leaks into the next session.
  useEffect(() => {
    if (open) setForm(toEditForm(vendor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vendor.id, vendor.updatedAt])

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const sortedModels = useMemo(
    () => [...models].sort((a, b) => a.name.localeCompare(b.name)),
    [models],
  )
  // Ids attributed on the record but not resolvable to a live model — kept
  // visible (as "Unavailable") and preserved on save unless unticked.
  const unresolvedLinked = form.linkedModels.filter((id) => !models.some((m) => m.id === id))

  const toggleModel = (id: string) => setForm((f) => ({
    ...f,
    linkedModels: f.linkedModels.includes(id)
      ? f.linkedModels.filter((m) => m !== id)
      : [...f.linkedModels, id],
  }))

  function submit() {
    const patch: Partial<VendorRecord> = {
      inherentRisk: strOrNull(form.inherentRisk),
      residualRisk: strOrNull(form.residualRisk),
      dataClassification: strOrNull(form.dataClassification),
      dataAccessLevel: strOrNull(form.dataAccessLevel),
      dataRegions: form.dataRegions.split(',').map((s) => s.trim()).filter(Boolean),
      transferMechanism: strOrNull(form.transferMechanism),
      dpaStatus: strOrNull(form.dpaStatus) as VendorDpaStatus | null,
      dpaSignedAt: strOrNull(form.dpaSignedAt),
      dpaExpiresAt: strOrNull(form.dpaExpiresAt),
      soc2ExpiresAt: strOrNull(form.soc2ExpiresAt),
      isoExpiresAt: strOrNull(form.isoExpiresAt),
      lastPentestAt: strOrNull(form.lastPentestAt),
      reassessmentCadenceMonths: numOrNull(form.reassessmentCadenceMonths),
      reassessmentDueAt: strOrNull(form.reassessmentDueAt),
      exitPlanStatus: strOrNull(form.exitPlanStatus),
      exitPlanNotes: strOrNull(form.exitPlanNotes),
      criticality: strOrNull(form.criticality) as VendorCriticality | null,
      contractStart: strOrNull(form.contractStart),
      renewalNoticeDays: numOrNull(form.renewalNoticeDays),
      annualSpend: numOrNull(form.annualSpend),
      spendCurrency: strOrNull(form.spendCurrency),
      insuranceCoverage: strOrNull(form.insuranceCoverage),
      subprocessorCount: numOrNull(form.subprocessorCount),
      fourthPartyExposure: strOrNull(form.fourthPartyExposure),
      linkedModels: form.linkedModels,
    }
    // The dialog closes only after the write resolves; the mutation's onError
    // surfaces the real failure and the sheet stays open.
    update.mutate({ id: vendor.id, patch }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${vendor.name || 'vendor'} — risk profile`}
      description="Risk, data protection, assurance, lifecycle and commercial facts. Leave a field blank to record it as unknown — it renders as '—', never as 0."
      submitLabel="Save changes"
      busy={update.isPending}
      onSubmit={submit}
    >
      {/* ── Risk & data ─────────────────────────────────────────────────── */}
      <SectionHeading>Risk &amp; data</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inherent risk" hint="Before controls.">
          <EnumSelect value={form.inherentRisk} onChange={(v) => set('inherentRisk', v)} options={RISK_LEVELS} />
        </Field>
        <Field label="Residual risk" hint="After controls and remediation.">
          <EnumSelect value={form.residualRisk} onChange={(v) => set('residualRisk', v)} options={RISK_LEVELS} />
        </Field>
        <Field label="Data classification">
          <EnumSelect value={form.dataClassification} onChange={(v) => set('dataClassification', v)} options={DATA_CLASSIFICATIONS} />
        </Field>
        <Field label="Data access level">
          <EnumSelect value={form.dataAccessLevel} onChange={(v) => set('dataAccessLevel', v)} options={DATA_ACCESS_LEVELS} />
        </Field>
        <Field label="Data regions" hint="Comma-separated, e.g. US, EU.">
          <Input value={form.dataRegions} onChange={(e) => set('dataRegions', e.target.value)} placeholder="US, EU" />
        </Field>
        <Field label="Transfer mechanism" hint="Legal basis for cross-border transfers.">
          <EnumSelect value={form.transferMechanism} onChange={(v) => set('transferMechanism', v)} options={TRANSFER_MECHANISMS} />
        </Field>
      </div>

      {/* ── Assurance ───────────────────────────────────────────────────── */}
      <SectionHeading>Assurance</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <Field label="DPA status" hint="Leave as pending until genuinely executed.">
          <EnumSelect value={form.dpaStatus} onChange={(v) => set('dpaStatus', v)} options={DPA_STATUSES} />
        </Field>
        <Field label="DPA signed">
          <Input type="date" value={form.dpaSignedAt} onChange={(e) => set('dpaSignedAt', e.target.value)} />
        </Field>
        <Field label="DPA expires">
          <Input type="date" value={form.dpaExpiresAt} onChange={(e) => set('dpaExpiresAt', e.target.value)} />
        </Field>
        <Field label="SOC 2 expires">
          <Input type="date" value={form.soc2ExpiresAt} onChange={(e) => set('soc2ExpiresAt', e.target.value)} />
        </Field>
        <Field label="ISO cert expires">
          <Input type="date" value={form.isoExpiresAt} onChange={(e) => set('isoExpiresAt', e.target.value)} />
        </Field>
        <Field label="Last penetration test">
          <Input type="date" value={form.lastPentestAt} onChange={(e) => set('lastPentestAt', e.target.value)} />
        </Field>
      </div>

      {/* ── Lifecycle ───────────────────────────────────────────────────── */}
      <SectionHeading>Lifecycle</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Reassessment cadence (months)">
          <Input type="number" min={1} value={form.reassessmentCadenceMonths} onChange={(e) => set('reassessmentCadenceMonths', e.target.value)} />
        </Field>
        <Field label="Reassessment due">
          <Input type="date" value={form.reassessmentDueAt} onChange={(e) => set('reassessmentDueAt', e.target.value)} />
        </Field>
        <Field label="Exit plan status">
          <EnumSelect value={form.exitPlanStatus} onChange={(v) => set('exitPlanStatus', v)} options={EXIT_PLAN_STATUSES} />
        </Field>
        <Field label="Business criticality">
          <EnumSelect value={form.criticality} onChange={(v) => set('criticality', v)} options={VENDOR_CRITICALITIES} />
        </Field>
      </div>
      <Field label="Exit / offboarding plan notes">
        <textarea
          value={form.exitPlanNotes}
          onChange={(e) => set('exitPlanNotes', e.target.value)}
          className="h-16 w-full resize-none p-2 text-xs"
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))' }}
        />
      </Field>

      {/* ── Commercial ──────────────────────────────────────────────────── */}
      <SectionHeading>Commercial</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contract start">
          <Input type="date" value={form.contractStart} onChange={(e) => set('contractStart', e.target.value)} />
        </Field>
        <Field label="Renewal notice (days)">
          <Input type="number" min={0} value={form.renewalNoticeDays} onChange={(e) => set('renewalNoticeDays', e.target.value)} />
        </Field>
        <Field label="Annual spend">
          <Input type="number" min={0} value={form.annualSpend} onChange={(e) => set('annualSpend', e.target.value)} />
        </Field>
        <Field label="Spend currency" hint="ISO code, e.g. USD.">
          <Input value={form.spendCurrency} onChange={(e) => set('spendCurrency', e.target.value)} placeholder="USD" />
        </Field>
      </div>
      <Field label="Insurance coverage" hint="E.g. cyber liability limit named in the contract.">
        <Input value={form.insuranceCoverage} onChange={(e) => set('insuranceCoverage', e.target.value)} />
      </Field>

      {/* ── Supply chain ────────────────────────────────────────────────── */}
      <SectionHeading>Supply chain</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sub-processors declared" hint="Count declared by the vendor.">
          <Input type="number" min={0} value={form.subprocessorCount} onChange={(e) => set('subprocessorCount', e.target.value)} />
        </Field>
        <Field label="Fourth-party exposure">
          <EnumSelect value={form.fourthPartyExposure} onChange={(v) => set('fourthPartyExposure', v)} options={FOURTH_PARTY_EXPOSURES} />
        </Field>
      </div>

      {/* ── Linked models — writes vendors.linked_models (ai_models.id). ── */}
      <SectionHeading>AI models supplied by this vendor</SectionHeading>
      {sortedModels.length === 0 ? (
        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          No models are registered yet — register a model first, then attribute it to its supplier here.
        </p>
      ) : (
        <>
          <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
            Attribution feeds the vendor concentration analysis. Stored as model ids, resolved to names at render time.
          </p>
          <div
            className="max-h-40 space-y-1 overflow-y-auto p-2"
            style={{ border: '1px solid hsl(var(--border))' }}
          >
            {sortedModels.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>
                <input
                  type="checkbox"
                  checked={form.linkedModels.includes(m.id)}
                  onChange={() => toggleModel(m.id)}
                  style={{ accentColor: 'hsl(var(--brand))' }}
                />
                <Cube size={12} style={{ color: 'hsl(var(--text-4))' }} />
                {m.name || 'Unnamed model'}
              </label>
            ))}
            {unresolvedLinked.map((id) => (
              <label key={id} className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                <input type="checkbox" checked onChange={() => toggleModel(id)} style={{ accentColor: 'hsl(var(--brand))' }} />
                Unavailable
              </label>
            ))}
          </div>
        </>
      )}
    </FormDialog>
  )
}

export default VendorEditSheet
