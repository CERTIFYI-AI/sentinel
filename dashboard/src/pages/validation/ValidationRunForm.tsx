// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ValidationRunForm — create/edit a validation run. Model is chosen from the
// platform model inventory (ai_models uuid), validator from the central Users
// directory (UserSelect). Persists via the evals CRUD hook.

import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserSelect } from '@/components/evals/UserSelect'
import { validationRunHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import type { ValidationRun, RiskTier } from '@/types/evals'

const EMPTY: ValidationRun = {
  id: '', runId: '', modelId: '', modelName: '', modelVersion: '', validatorId: '',
  framework: 'SR 11-7 / OCC 2011-12', state: 'Draft', overallScore: 0,
  recommendation: 'Pending', riskRating: 'medium',
  scope: { intendedUse: '', population: '', dataPeriod: '', keyLimitations: [], assumptions: [] },
  adversarial: [], residualRisk: { rating: 'medium', rationale: '' }, signoffs: [
    { role: 'business', status: 'pending' }, { role: 'risk', status: 'pending' }, { role: 'compliance', status: 'pending' },
  ], regMappings: [], suites: [], evidence: [], workflowSteps: [], auditTrail: [],
}

/** Normalize a (possibly partial) stored doc so the controlled form never crashes. */
function seed(i?: ValidationRun | null): ValidationRun {
  if (!i) return EMPTY
  return {
    ...EMPTY,
    ...i,
    runId: i.runId ?? '',
    modelId: i.modelId ?? '',
    modelVersion: i.modelVersion ?? '',
    validatorId: i.validatorId ?? '',
    scope: {
      intendedUse: i.scope?.intendedUse ?? '',
      population: i.scope?.population ?? '',
      dataPeriod: i.scope?.dataPeriod ?? '',
      keyLimitations: i.scope?.keyLimitations ?? [],
      assumptions: i.scope?.assumptions ?? [],
    },
    signoffs: i.signoffs ?? EMPTY.signoffs,
    adversarial: i.adversarial ?? [],
    regMappings: i.regMappings ?? [],
    suites: i.suites ?? [],
    evidence: i.evidence ?? [],
    workflowSteps: i.workflowSteps ?? [],
    auditTrail: i.auditTrail ?? [],
  }
}

export function ValidationRunForm({ open, onOpenChange, initial, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: ValidationRun | null
  onSaved?: (run: ValidationRun) => void
}) {
  const upsert = validationRunHooks.useUpsert()
  const { models, loading: modelsLoading } = useModelOptions()
  const [form, setForm] = useState<ValidationRun>(seed(initial))
  const isEdit = !!initial

  // Re-seed local state whenever a different record is opened.
  const [seededFor, setSeededFor] = useState<string | undefined>(initial?.id)
  if (open && (initial?.id ?? '') !== (seededFor ?? '')) {
    setForm(seed(initial)); setSeededFor(initial?.id)
  }

  const set = <K extends keyof ValidationRun>(k: K, v: ValidationRun[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setScope = (k: keyof ValidationRun['scope'], v: any) => setForm((f) => ({ ...f, scope: { ...f.scope, [k]: v } }))

  function setModel(id: string) {
    const m = models.find((x) => x.id === id)
    setForm((f) => ({ ...f, modelId: id, modelName: m?.name ?? '' }))
  }

  const valid = !!(form.runId.trim() && form.modelId && form.modelVersion.trim() && form.validatorId.trim())

  function submit() {
    const rec: ValidationRun = {
      ...form,
      // PK is a generated uuid — the human-readable runId stays a display field.
      id: form.id || crypto.randomUUID(),
      auditTrail: isEdit ? form.auditTrail : [
        { id: `A${Date.now()}`, actor: form.validatorId, action: 'created validation run', at: new Date().toISOString() },
      ],
    }
    upsert.mutate(rec, {
      onSuccess: (saved) => { toast.success(isEdit ? 'Validation run updated' : 'Validation run created'); onSaved?.(saved); onOpenChange(false) },
      onError: (err: any) => toast.error(err?.message ?? 'Failed to save validation run'),
    })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${form.runId}` : 'New Validation Run'}
      description="Define the model, scope and validator. SR 11-7 requires intended use, population and data period."
      submitLabel={isEdit ? 'Save changes' : 'Create run'}
      busy={upsert.isPending}
      disabled={!valid}
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Run ID" htmlFor="runId" required>
          <Input id="runId" value={form.runId} disabled={isEdit} onChange={(e) => set('runId', e.target.value)} placeholder="VAL-2026-009" />
        </Field>
        <Field label="Framework" required>
          <Select value={form.framework} onValueChange={(v) => set('framework', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['SR 11-7 / OCC 2011-12', 'EU AI Act', 'NIST AI RMF', 'ISO 42001'].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Model" required hint="From the model inventory">
          <Select value={form.modelId || undefined} onValueChange={setModel}>
            <SelectTrigger><SelectValue placeholder={modelsLoading ? 'Loading models…' : 'Select a model'} /></SelectTrigger>
            <SelectContent>
              {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}{m.riskTier ? ` · ${m.riskTier}` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Version" required>
          <Input value={form.modelVersion} onChange={(e) => set('modelVersion', e.target.value)} placeholder="v4.0.0" />
        </Field>
        <Field label="Validator" required hint="Populated from the Users directory">
          <UserSelect value={form.validatorId} onChange={(v) => set('validatorId', v)} by="name" rolesFilter={['risk', 'model', 'ml', 'engineer']} />
        </Field>
        <Field label="Risk rating">
          <Select value={form.riskRating} onValueChange={(v) => set('riskRating', v as RiskTier)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['low', 'medium', 'high', 'critical'] as RiskTier[]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Intended use (SR 11-7 §III)">
        <Textarea value={form.scope.intendedUse} onChange={(e) => setScope('intendedUse', e.target.value)} rows={2} placeholder="Consumer unsecured credit decisioning…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Population">
          <Input value={form.scope.population} onChange={(e) => setScope('population', e.target.value)} placeholder="US retail applicants 18+" />
        </Field>
        <Field label="Data period">
          <Input value={form.scope.dataPeriod} onChange={(e) => setScope('dataPeriod', e.target.value)} placeholder="2023-01 → 2025-12" />
        </Field>
      </div>
      <Field label="Key limitations" hint="One per line">
        <Textarea value={form.scope.keyLimitations.join('\n')} onChange={(e) => setScope('keyLimitations', e.target.value.split('\n').filter(Boolean))} rows={2} />
      </Field>
      <Field label="Assumptions" hint="One per line">
        <Textarea value={form.scope.assumptions.join('\n')} onChange={(e) => setScope('assumptions', e.target.value.split('\n').filter(Boolean))} rows={2} />
      </Field>
    </FormDialog>
  )
}

export default ValidationRunForm
