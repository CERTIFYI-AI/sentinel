// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// BiasAuditForm — create/edit a bias audit: model, dataset, framework,
// protected attributes and auditor (from the central Users directory).

import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserSelect } from '@/components/evals/UserSelect'
import { biasAuditHooks } from '@/hooks/queries/useEvalsCrud'
import { PROTECTED_ATTRIBUTES } from '@/data/evalsSeed'
import { cn } from '@/lib/utils'
import type { BiasAudit, RiskTier } from '@/types/evals'

const EMPTY: BiasAudit = {
  id: '', auditId: '', modelId: '', modelName: '', datasetId: '', framework: 'EU AI Act Art.10 / ECOA',
  auditor: '', state: 'Draft', fairnessScore: 0, result: 'na', riskTier: 'medium',
  protectedAttributes: PROTECTED_ATTRIBUTES, intersections: [],
  counterfactual: { flipRate: 0, cases: [] }, snapshots: [], regMappings: [], auditTrail: [],
}

export function BiasAuditForm({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: BiasAudit | null
}) {
  const upsert = biasAuditHooks.useUpsert()
  const [form, setForm] = useState<BiasAudit>(initial ?? EMPTY)
  const isEdit = !!initial

  const [seededFor, setSeededFor] = useState<string | undefined>(initial?.id)
  if (open && (initial?.id ?? '') !== (seededFor ?? '')) { setForm(initial ?? EMPTY); setSeededFor(initial?.id) }

  const set = <K extends keyof BiasAudit>(k: K, v: BiasAudit[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggleAttr = (id: string) => set('protectedAttributes',
    form.protectedAttributes.some((p) => p.id === id)
      ? form.protectedAttributes.filter((p) => p.id !== id)
      : [...form.protectedAttributes, PROTECTED_ATTRIBUTES.find((p) => p.id === id)!])

  const valid = form.auditId.trim() && form.modelName.trim() && form.datasetId.trim() && form.auditor.trim()
    && form.protectedAttributes.length > 0

  function submit() {
    const rec: BiasAudit = {
      ...form,
      id: form.id || form.auditId.trim(),
      auditTrail: isEdit ? form.auditTrail : [{ id: `A${Date.now()}`, actor: form.auditor, action: 'opened bias audit', at: new Date().toISOString() }],
    }
    upsert.mutate(rec, {
      onSuccess: () => { toast.success(isEdit ? 'Audit updated' : 'Audit created'); onOpenChange(false) },
      onError: () => toast.error('Failed to save audit'),
    })
  }

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${form.auditId}` : 'New Bias Audit'}
      description="EU AI Act Art.10 requires examination for possible biases; select the dataset and protected attributes in scope."
      submitLabel={isEdit ? 'Save changes' : 'Create audit'}
      busy={upsert.isPending} disabled={!valid} onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Audit ID" required><Input value={form.auditId} disabled={isEdit} onChange={(e) => set('auditId', e.target.value)} placeholder="BIA-2026-015" /></Field>
        <Field label="Framework">
          <Select value={form.framework} onValueChange={(v) => set('framework', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['EU AI Act Art.10 / ECOA', 'ECOA / CFPB Fair Lending', 'NIST AI RMF MEASURE', 'ISO 42001'].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Model ID" required><Input value={form.modelId} onChange={(e) => set('modelId', e.target.value)} placeholder="MDL-003" /></Field>
        <Field label="Model name" required><Input value={form.modelName} onChange={(e) => set('modelName', e.target.value)} /></Field>
        <Field label="Dataset ID" required hint="Links to the Data Explorer catalog entry">
          <Input value={form.datasetId} onChange={(e) => set('datasetId', e.target.value)} placeholder="DS-credit-v4" />
        </Field>
        <Field label="Auditor" required hint="From the Users directory">
          <UserSelect value={form.auditor} onChange={(v) => set('auditor', v)} by="name" rolesFilter={['audit', 'risk', 'compliance']} />
        </Field>
        <Field label="Risk tier">
          <Select value={form.riskTier} onValueChange={(v) => set('riskTier', v as RiskTier)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(['low', 'medium', 'high', 'critical'] as RiskTier[]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Protected attributes in scope" required hint="At least one; intersections are derived from the selection">
        <div className="flex flex-wrap gap-1.5">
          {PROTECTED_ATTRIBUTES.map((p) => (
            <button key={p.id} type="button" onClick={() => toggleAttr(p.id)}
              className={cn('border px-2 py-1 text-[12px]', form.protectedAttributes.some((x) => x.id === p.id)
                ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
                : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]')}>
              {p.attribute}
            </button>
          ))}
        </div>
      </Field>
    </FormDialog>
  )
}

export default BiasAuditForm
